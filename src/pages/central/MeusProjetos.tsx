import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  getMeusProjetosCentral,
  rotaArquivamento,
  type MeusProjetos as Dados,
} from "@/lib/central";
import { formatarData, formatarDataHora } from "@/lib/projetos";
import { EstadoVazio } from "@/components/EstadoVazio";
import {
  ErrorText,
  PageBadge,
  PageButtonSm,
  PageCard,
  PageCardContent,
  PageCardHeader,
  PageCardTitle,
  PageLoadingBlock,
} from "@/styles/page.styled";
import {
  Acoes,
  FichaCard,
  FichaCorpo,
  FichaRodape,
  FichaTituloNormal,
  FichaTopo,
  FichasLista,
  Meta,
  Nota,
  Tags,
} from "./Central.styled";
import { useCentral } from "./contexto";

/**
 * Os projetos que a pessoa coordena nesta gestão. Para cada um, ela faz o
 * arquivamento na Central: indica o que se destacou, garante o acervo e
 * diz o que usou. Não mexe no status do projeto.
 */
export function MeusProjetos() {
  const { token } = useAuth();
  const { versao } = useCentral();
  const [dados, setDados] = useState<Dados | null>(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!token) return;
    let vivo = true;
    getMeusProjetosCentral(token)
      .then((d) => vivo && setDados(d))
      .catch(
        (err) =>
          vivo &&
          setErro(err instanceof Error ? err.message : "Erro ao carregar"),
      );
    return () => {
      vivo = false;
    };
  }, [token, versao]);

  if (erro && !dados) return <ErrorText>{erro}</ErrorText>;
  if (!dados) return <PageLoadingBlock />;

  return (
    <PageCard>
      <PageCardHeader
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <PageCardTitle>Meus projetos</PageCardTitle>
        {dados.arquivamentos_pendentes > 0 && (
          <PageBadge $tone="warning">
            {dados.arquivamentos_pendentes} para arquivar
          </PageBadge>
        )}
      </PageCardHeader>
      <PageCardContent>
        <Nota style={{ marginTop: 0, marginBottom: "0.75rem" }}>
          Projetos que você coordena. O arquivamento na Central pode ser
          preenchido a qualquer hora, quantas vezes quiser
          {dados.exige_arquivamento
            ? ", e é obrigatório pelo menos uma vez antes de o projeto ir para Finalizado."
            : "."}
        </Nota>
        {dados.projetos.length === 0 ? (
          <EstadoVazio
            causa="vazio"
            titulo="Você não coordena nenhum projeto agora"
            motivo="Os projetos em que você é coordenador aparecem aqui."
          />
        ) : (
          <FichasLista>
            {dados.projetos.map((p) => (
              <FichaCard key={p.id}>
                <FichaTopo>
                  <FichaCorpo>
                    <FichaTituloNormal>{p.nome}</FichaTituloNormal>
                    <Meta>
                      {p.cliente && <span>{p.cliente}</span>}
                      <span>{p.frentes.join(" · ") || "Sem frente"}</span>
                      {p.entrega && (
                        <span>Entrega {formatarData(p.entrega)}</span>
                      )}
                    </Meta>
                    <Tags>
                      {p.escopos.map((e, i) => (
                        <PageBadge key={`${e.id}-${i}`} $tone="muted">
                          {e.nome}
                        </PageBadge>
                      ))}
                    </Tags>
                    <Meta>
                      <span>
                        Equipe:{" "}
                        {p.equipe.length > 0
                          ? p.equipe.join(", ")
                          : "sem consultores alocados"}
                      </span>
                    </Meta>
                  </FichaCorpo>
                  <PageBadge
                    $tone={p.status === "finalizado" ? "success" : "default"}
                  >
                    {p.status_rotulo}
                  </PageBadge>
                </FichaTopo>
                {(p.pre_indicacoes_banca.length > 0 || p.fichas.length > 0) && (
                  <Meta>
                    {p.pre_indicacoes_banca.length > 0 && (
                      <span>
                        Pré-indicação da banca:{" "}
                        {p.pre_indicacoes_banca.map((f, i) => (
                          <span key={f.id}>
                            {i > 0 && ", "}
                            <Link
                              to={`/central/fichas/${f.id}`}
                              state={{ de: "/central/projetos" }}
                            >
                              {f.titulo}
                            </Link>
                          </span>
                        ))}
                      </span>
                    )}
                    {p.fichas.length > 0 && (
                      <span>
                        Fichas do projeto:{" "}
                        {p.fichas.map((f, i) => (
                          <span key={f.id}>
                            {i > 0 && ", "}
                            <Link
                              to={`/central/fichas/${f.id}`}
                              state={{ de: "/central/projetos" }}
                            >
                              {f.titulo} ({f.status_rotulo.toLowerCase()})
                            </Link>
                          </span>
                        ))}
                      </span>
                    )}
                  </Meta>
                )}
                <FichaRodape>
                  <span>
                    {p.arquivamento
                      ? `Último arquivamento em ${formatarDataHora(p.arquivamento.enviado_em)}`
                      : p.arquivamento_urgente
                        ? "Falta o arquivamento: o projeto não vai para Finalizado sem ele."
                        : "Registre o que deve ficar para os próximos projetos."}
                  </span>
                  <Acoes>
                    {p.pode_arquivar && (
                      <PageButtonSm
                        as={Link}
                        to={rotaArquivamento(p.id)}
                        state={{ de: "/central/projetos" }}
                        $variant={
                          p.arquivamento_urgente ? "primary" : "outline"
                        }
                      >
                        {p.arquivamento
                          ? "Arquivar de novo"
                          : "Arquivar na Central"}
                      </PageButtonSm>
                    )}
                  </Acoes>
                </FichaRodape>
              </FichaCard>
            ))}
          </FichasLista>
        )}
      </PageCardContent>
    </PageCard>
  );
}
