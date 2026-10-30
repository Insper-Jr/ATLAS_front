import { useState } from "react";
import { Link } from "react-router-dom";
import { Pencil } from "lucide-react";
import { abrirUrlProtegida, urlArquivoConteudo, type MetodoDados } from "@/lib/central";
import { EstadoVazio } from "@/components/EstadoVazio";
import { ErrorText, PageBadge, PageButtonSm, PageCard, PageCardContent, PageCardHeader, PageCardTitle, PageLoadingBlock } from "@/styles/page.styled";
import { SegmentedButton, SegmentedGroup } from "@/styles/shared.styled";
import { Chip, ItemFundamento, ListaSimples, Nota, PassoItem, SecaoAjuda, SecaoTitulo } from "./Central.styled";
import { EditorMetodo } from "./EditorMetodo";
import { useConteudo } from "./useConteudo";

/** O Método (fase 3): o Playbook de Escopos, com os fundamentos e a
 *  sequência da análise de cada escopo. Tudo editável por quem gere a
 *  Central; a página do PDF aparece quando o Playbook foi enviado. */
export function Metodo() {
  const { token, conteudo, setConteudo, erro, editando, setEditando } = useConteudo<MetodoDados>("metodo");
  const [escopoAtivo, setEscopoAtivo] = useState<string | null>(null);

  if (erro && !conteudo) return <ErrorText>{erro}</ErrorText>;
  if (!conteudo) return <PageLoadingBlock />;
  const d = conteudo.dados;
  const escopo = d.escopos.find((e) => e.chave === escopoAtivo) ?? d.escopos[0];
  const temPdf = !!d.arquivo_id && conteudo.arquivos.some((a) => a.id === d.arquivo_id);

  function abrirPagina(pagina: number | null) {
    if (!token || !d.arquivo_id) return;
    abrirUrlProtegida(`${urlArquivoConteudo(d.arquivo_id)}${pagina ? `#page=${pagina}` : ""}`, token).catch(() => {});
  }

  return (
    <>
      <PageCard>
        <PageCardHeader style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
          <div>
            {d.origem && <PageBadge $tone="muted">{d.origem}</PageBadge>}
            <PageCardTitle style={{ marginTop: "0.375rem" }}>
              {d.titulo}
              {d.versao ? ` · ${d.versao}` : ""}
            </PageCardTitle>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {temPdf ? (
              <PageButtonSm type="button" onClick={() => abrirPagina(null)}>
                Abrir documento completo
              </PageButtonSm>
            ) : (
              <PageBadge $tone="muted">PDF ainda não enviado</PageBadge>
            )}
            {conteudo.permissoes.editar && (
              <PageButtonSm type="button" $variant="outline" onClick={() => setEditando(true)}>
                <Pencil size={14} /> Editar
              </PageButtonSm>
            )}
          </div>
        </PageCardHeader>
        <PageCardContent>
          <Nota style={{ margin: 0 }}>{d.descricao}</Nota>
        </PageCardContent>
      </PageCard>

      <PageCard>
        <PageCardHeader>
          <PageCardTitle>{d.fundamentos.titulo}</PageCardTitle>
        </PageCardHeader>
        <PageCardContent>
          <Nota style={{ marginTop: 0, marginBottom: "0.75rem" }}>{d.fundamentos.descricao}</Nota>
          <ListaSimples style={{ listStyle: "none", paddingLeft: 0, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(16rem, 1fr))", gap: "0.5rem" }}>
            {d.fundamentos.itens.map((f) => (
              <ItemFundamento key={f.titulo}>
                <strong>{f.titulo}</strong>
                <span>{f.texto}</span>
              </ItemFundamento>
            ))}
          </ListaSimples>
        </PageCardContent>
      </PageCard>

      <PageCard>
        <PageCardHeader>
          <SegmentedGroup role="tablist" aria-label="Escopo">
            {d.escopos.map((e) => (
              <SegmentedButton key={e.chave} type="button" role="tab" $ativo={escopo?.chave === e.chave} onClick={() => setEscopoAtivo(e.chave)}>
                {e.nome}
              </SegmentedButton>
            ))}
          </SegmentedGroup>
        </PageCardHeader>
        <PageCardContent>
          {!escopo || (!escopo.decisao && escopo.passos.length === 0) ? (
            <EstadoVazio causa="vazio" titulo={`${escopo?.nome ?? "Escopo"} ainda sem conteúdo`} motivo="Quem gere a Central preenche a sequência deste escopo em Editar." />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {(escopo.decisao || escopo.erro) && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(16rem, 1fr))", gap: "1rem" }}>
                  {escopo.decisao && (
                    <div>
                      <SecaoAjuda style={{ textTransform: "uppercase", letterSpacing: "0.04em" }}>A decisão que este escopo serve</SecaoAjuda>
                      <p style={{ margin: "0.25rem 0 0", fontSize: "0.875rem", lineHeight: 1.5 }}>{escopo.decisao}</p>
                    </div>
                  )}
                  {escopo.erro && (
                    <div>
                      <SecaoAjuda style={{ textTransform: "uppercase", letterSpacing: "0.04em" }}>O erro estrutural a evitar</SecaoAjuda>
                      <p style={{ margin: "0.25rem 0 0", fontSize: "0.875rem", lineHeight: 1.5 }}>{escopo.erro}</p>
                    </div>
                  )}
                </div>
              )}
              <div>
                <SecaoTitulo style={{ fontSize: "0.875rem" }}>Sequência da análise</SecaoTitulo>
                {Object.keys(d.niveis ?? {}).length > 0 && (
                  <SecaoAjuda style={{ marginTop: "0.25rem" }}>
                    {Object.entries(d.niveis)
                      .map(([nivel, texto]) => `${nivel}: ${texto}`)
                      .join(" ")}
                  </SecaoAjuda>
                )}
                <ol style={{ listStyle: "none", margin: "0.5rem 0 0", padding: 0 }}>
                  {escopo.passos.map((p, i) => (
                    <PassoItem key={`${p.nome}-${i}`}>
                      <strong>
                        {i + 1}. {p.nome}
                      </strong>
                      {p.nivel ? <Chip>{p.nivel}</Chip> : <span />}
                      {p.pagina && temPdf ? (
                        <button type="button" onClick={() => abrirPagina(p.pagina)} style={{ all: "unset", cursor: "pointer", fontSize: "0.75rem", color: "var(--atlas-primary)" }}>
                          p. {p.pagina}
                        </button>
                      ) : (
                        <span />
                      )}
                      <em>
                        {p.pergunta}
                        {p.ficha_id ? (
                          <>
                            {" "}
                            <Link to={`/central/fichas/${p.ficha_id}`} state={{ de: "/central/metodo" }}>
                              Ficha relacionada
                            </Link>
                          </>
                        ) : null}
                      </em>
                    </PassoItem>
                  ))}
                </ol>
              </div>
            </div>
          )}
        </PageCardContent>
      </PageCard>

      {editando && (
        <EditorMetodo
          conteudo={conteudo}
          onFechar={() => setEditando(false)}
          onSalvo={(novo) => {
            setConteudo(novo);
            setEditando(false);
          }}
        />
      )}
    </>
  );
}
