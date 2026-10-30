import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { getMinhasFichas, type FichaCompleta } from "@/lib/central";
import { formatarDataHora } from "@/lib/projetos";
import { EstadoVazio } from "@/components/EstadoVazio";
import { ErrorText, PageButtonSm, PageCard, PageCardContent, PageCardHeader, PageCardTitle, PageLoadingBlock } from "@/styles/page.styled";
import { FichasLista, Historico, Nota } from "./Central.styled";
import { CardAcompanhamento } from "./FichaCard";
import { useCentral } from "./contexto";

/** O que a pessoa indicou e as fichas dos projetos dela que estão com os
 *  autores. Garantir que eles escrevam é do coordenador. */
export function MinhasIndicacoes() {
  const { token } = useAuth();
  const { versao, abrirIndicacao } = useCentral();
  const [fichas, setFichas] = useState<FichaCompleta[] | null>(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!token) return;
    let vivo = true;
    getMinhasFichas(token)
      .then((f) => vivo && setFichas(f))
      .catch((err) => vivo && setErro(err instanceof Error ? err.message : "Erro ao carregar"));
    return () => {
      vivo = false;
    };
  }, [token, versao]);

  if (erro && !fichas) return <ErrorText>{erro}</ErrorText>;
  if (!fichas) return <PageLoadingBlock />;

  return (
    <PageCard>
      <PageCardHeader>
        <PageCardTitle>Minhas indicações</PageCardTitle>
      </PageCardHeader>
      <PageCardContent>
        <Nota style={{ marginTop: 0, marginBottom: "0.75rem" }}>
          O que você indicou e as fichas em que você é autor ou responsável. Quem coordena garante que os autores
          escrevam; o prazo é de uma semana depois da aprovação do gerente.
        </Nota>
        {fichas.length === 0 ? (
          <EstadoVazio
            causa="vazio"
            titulo="Você ainda não indicou nada"
            motivo={
              <>
                Indique uma metodologia, ferramenta ou fonte que se destacou num projeto seu.{" "}
                <button type="button" onClick={abrirIndicacao} style={{ all: "unset", cursor: "pointer", textDecoration: "underline" }}>
                  Nova indicação
                </button>
              </>
            }
          />
        ) : (
          <FichasLista>
            {fichas.map((f) => (
              <CardAcompanhamento
                key={f.id}
                ficha={f}
                filhos={
                  f.historico && f.historico.length > 0 ? (
                    <details>
                      <summary style={{ cursor: "pointer", fontSize: "0.75rem" }}>Histórico ({f.historico.length})</summary>
                      <Historico style={{ marginTop: "0.5rem" }}>
                        {f.historico.map((h) => (
                          <li key={h.id}>
                            {formatarDataHora(h.em)} · <strong>{h.usuario_nome ?? "ATLAS"}</strong> {h.detalhe ?? h.acao}
                          </li>
                        ))}
                      </Historico>
                    </details>
                  ) : null
                }
                acoes={
                  <PageButtonSm as={Link} to={`/central/fichas/${f.id}`} state={{ de: "/central/minhas" }} $variant={f.permissoes.editar ? "primary" : "outline"}>
                    {f.permissoes.editar ? "Escrever a ficha" : "Abrir ficha"}
                  </PageButtonSm>
                }
              />
            ))}
          </FichasLista>
        )}
      </PageCardContent>
    </PageCard>
  );
}
