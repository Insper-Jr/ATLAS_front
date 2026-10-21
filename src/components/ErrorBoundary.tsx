import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  erro: Error | null;
}

const CHAVE_JA_RECARREGOU = "atlas:recarregou-por-chunk-antigo";

/** Depois de um deploy novo, os arquivos JS antigos (com hash no nome)
 *  somem do servidor. Quem estava com a aba aberta, ou navegou por um link
 *  ou cache velho, tenta buscar um chunk que não existe mais e cai aqui —
 *  não é um bug do app, um recarregamento simples resolve. */
function eErroDeChunkDesatualizado(erro: Error): boolean {
  return /fetch dynamically imported module|error loading dynamically imported module|importing a module script failed/i.test(
    erro.message,
  );
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { erro: null };

  static getDerivedStateFromError(erro: Error): State {
    return { erro };
  }

  componentDidMount() {
    // Chegou aqui sem erro: página carregou numa versão válida do site, e o
    // guard de "já tentei recarregar" pode valer de novo no próximo deploy.
    sessionStorage.removeItem(CHAVE_JA_RECARREGOU);
  }

  componentDidCatch(erro: Error, info: ErrorInfo) {
    console.error("Erro na aplicação:", erro, info.componentStack);

    if (eErroDeChunkDesatualizado(erro) && !sessionStorage.getItem(CHAVE_JA_RECARREGOU)) {
      // Uma vez só: se recarregar e o erro persistir, é outra coisa, e aí
      // sim mostra a tela de erro em vez de ficar recarregando em loop.
      sessionStorage.setItem(CHAVE_JA_RECARREGOU, "1");
      window.location.reload();
    }
  }

  render() {
    if (this.state.erro && eErroDeChunkDesatualizado(this.state.erro)) {
      return (
        <div style={{ padding: "2rem", fontFamily: "system-ui, sans-serif", maxWidth: "40rem" }}>
          <p style={{ color: "var(--atlas-muted-foreground)" }}>Atualizando o ATLAS para a versão mais recente...</p>
        </div>
      );
    }

    if (this.state.erro) {
      return (
        <div style={{ padding: "2rem", fontFamily: "system-ui, sans-serif", maxWidth: "40rem" }}>
          <h1 style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>Algo deu errado</h1>
          <p style={{ color: "var(--atlas-muted-foreground)", marginBottom: "1rem" }}>
            A aplicação encontrou um erro. Tente recarregar a página.
          </p>
          <pre
            style={{
              padding: "1rem",
              background: "var(--atlas-muted)",
              borderRadius: "8px",
              overflow: "auto",
              fontSize: "0.875rem",
            }}
          >
            {this.state.erro.message}
          </pre>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              marginTop: "1rem",
              padding: "0.5rem 1rem",
              cursor: "pointer",
            }}
          >
            Recarregar
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
