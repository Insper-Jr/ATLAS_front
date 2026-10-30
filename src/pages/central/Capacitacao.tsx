import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Download, ExternalLink, Pencil } from "lucide-react";
import {
  abrirUrlProtegida,
  blobUrlProtegida,
  getConteudo,
  urlArquivoConteudo,
  type ArquivoConteudo,
  type CapacitacaoDados,
  type MetodoDados,
} from "@/lib/central";
import { EstadoVazio } from "@/components/EstadoVazio";
import { ErrorText, PageBadge, PageButtonSm, PageCard, PageCardContent, PageCardHeader, PageCardTitle, PageLoadingBlock } from "@/styles/page.styled";
import { FieldSelect } from "@/pages/Bancas.styled";
import { Acoes, AulaCabecalho, AulaCard, AulaConteudo, AulaCorpo, AulaPrevias, AulaRodape, Nota, SecaoAjuda } from "./Central.styled";
import { EditorCapacitacao } from "./EditorCapacitacao";
import { useConteudo } from "./useConteudo";

function Previa({ arquivo, token }: { arquivo: ArquivoConteudo; token: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!arquivo.imagem) return;
    let vivo = true;
    let criado: string | null = null;
    blobUrlProtegida(urlArquivoConteudo(arquivo.id), token)
      .then((u) => {
        criado = u;
        if (vivo) setUrl(u);
      })
      .catch(() => {});
    return () => {
      vivo = false;
      if (criado) URL.revokeObjectURL(criado);
    };
  }, [arquivo, token]);
  return (
    <figure>
      <button type="button" className="abrir" onClick={() => abrirUrlProtegida(urlArquivoConteudo(arquivo.id), token).catch(() => {})}>
        {arquivo.imagem ? url ? <img src={url} alt={arquivo.legenda ?? arquivo.nome} /> : <span>…</span> : <span>{arquivo.nome.split(".").pop()?.toUpperCase()}</span>}
      </button>
      <figcaption>{arquivo.legenda || arquivo.nome}</figcaption>
    </figure>
  );
}

/** Baixa um arquivo protegido pela API com o nome original. */
async function baixarArquivo(arquivo: ArquivoConteudo, token: string) {
  const resposta = await fetch(urlArquivoConteudo(arquivo.id), { headers: { Authorization: `Bearer ${token}` } });
  if (!resposta.ok) throw new Error("Erro ao baixar o arquivo");
  const url = URL.createObjectURL(await resposta.blob());
  const a = document.createElement("a");
  a.href = url;
  a.download = arquivo.nome;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** Capacitação (fase 3): as aulas internas por escopo, no desenho do
 *  mockup: prévia dos slides à esquerda, conteúdo à direita e o botão para
 *  baixar o arquivo da aula (ou abrir o link). */
export function Capacitacao() {
  const { token, conteudo, setConteudo, erro, editando, setEditando } = useConteudo<CapacitacaoDados>("capacitacao");
  const [escopo, setEscopo] = useState("");
  const [erroBaixar, setErroBaixar] = useState("");
  // Os escopos do Método, para o "Ver no Método" de cada aula.
  const [escoposDoMetodo, setEscoposDoMetodo] = useState<{ chave: string; nome: string }[]>([]);
  useEffect(() => {
    if (!token) return;
    let vivo = true;
    getConteudo<MetodoDados>("metodo", token)
      .then((m) => vivo && setEscoposDoMetodo(m.dados.escopos.map((e) => ({ chave: e.chave, nome: e.nome }))))
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, [token]);

  const escopos = useMemo(() => [...new Set((conteudo?.dados.aulas ?? []).map((a) => a.escopo).filter(Boolean))], [conteudo]);
  const arquivos = useMemo(() => new Map((conteudo?.arquivos ?? []).map((a) => [a.id, a])), [conteudo]);

  if (erro && !conteudo) return <ErrorText>{erro}</ErrorText>;
  if (!conteudo) return <PageLoadingBlock />;
  const aulas = conteudo.dados.aulas.filter((a) => !escopo || a.escopo === escopo);

  return (
    <>
      <PageCard>
        <PageCardHeader style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
          <div>
            <PageCardTitle>Aulas de capacitação interna</PageCardTitle>
            <Nota style={{ margin: "0.25rem 0 0" }}>{conteudo.dados.descricao}</Nota>
          </div>
          <PageBadge $tone="muted">{conteudo.dados.aulas.length}</PageBadge>
        </PageCardHeader>
        <PageCardContent>
          <Acoes style={{ justifyContent: "space-between" }}>
            <FieldSelect aria-label="Escopo" value={escopo} onChange={(e) => setEscopo(e.target.value)} style={{ width: "auto" }}>
              <option value="">Todos os escopos</option>
              {escopos.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </FieldSelect>
            {conteudo.permissoes.editar && (
              <PageButtonSm type="button" $variant="outline" onClick={() => setEditando(true)}>
                <Pencil size={14} /> Editar
              </PageButtonSm>
            )}
          </Acoes>
          {erroBaixar && <ErrorText style={{ marginTop: "0.75rem" }}>{erroBaixar}</ErrorText>}
        </PageCardContent>
      </PageCard>

      {aulas.length === 0 ? (
        <EstadoVazio causa={escopo ? "filtro" : "vazio"} titulo="Nenhuma aula aqui" motivo={escopo ? "Mude o escopo." : "Quem gere a Central cadastra as aulas."} />
      ) : (
        aulas.map((aula, i) => {
          const previas = aula.previas.map((id) => arquivos.get(id)).filter((a): a is ArquivoConteudo => !!a);
          const arquivo = aula.arquivo_id ? arquivos.get(aula.arquivo_id) : undefined;
          const eyebrow = [aula.escopo, aula.gestao].filter(Boolean).join(" · ");
          return (
            <AulaCard key={`${aula.titulo}-${i}`}>
              <AulaCabecalho>
                <div>
                  {eyebrow && <small>{eyebrow}</small>}
                  <h2>{aula.titulo}</h2>
                  {aula.descricao && <p>{aula.descricao}</p>}
                </div>
                {aula.formato && <PageBadge $tone="muted">{aula.formato}</PageBadge>}
              </AulaCabecalho>
              <AulaCorpo>
                {previas.length > 0 && token ? (
                  <AulaPrevias>
                    {previas.slice(0, 3).map((p) => (
                      <Previa key={p.id} arquivo={p} token={token} />
                    ))}
                  </AulaPrevias>
                ) : (
                  <SecaoAjuda>Sem prévia dos slides ainda.</SecaoAjuda>
                )}
                <div>
                  <SecaoAjuda style={{ textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>Conteúdo da aula</SecaoAjuda>
                  {aula.conteudo.length > 0 ? (
                    <AulaConteudo>
                      {aula.conteudo.map((c, j) => (
                        <li key={`${c}-${j}`}>{c}</li>
                      ))}
                    </AulaConteudo>
                  ) : (
                    <SecaoAjuda style={{ marginTop: "0.25rem" }}>Sem tópicos cadastrados.</SecaoAjuda>
                  )}
                </div>
              </AulaCorpo>
              <AulaRodape>
                <span>
                  {previas.length > 0 ? `Prévia de ${Math.min(previas.length, 3)} slide${previas.length === 1 ? "" : "s"}. ` : ""}
                  {arquivo ? "Baixe a aula completa ao lado." : aula.link ? "A aula completa abre no link ao lado." : "A aula completa ainda não foi disponibilizada."}
                </span>
                <Acoes>
                  {aula.ficha_ids.map((id) => (
                    <PageButtonSm key={id} as={Link} to={`/central/fichas/${id}`} state={{ de: "/central/capacitacao" }} $variant="ghost">
                      Ficha {String(id).padStart(3, "0")}
                    </PageButtonSm>
                  ))}
                  {aula.metodo && escoposDoMetodo.some((e) => e.chave === aula.metodo) && (
                    <PageButtonSm as={Link} to="/central/metodo" $variant="outline">
                      Ver no Método
                    </PageButtonSm>
                  )}
                  {aula.link && (
                    <PageButtonSm as="a" href={aula.link} target="_blank" rel="noopener noreferrer" $variant={arquivo ? "outline" : "primary"}>
                      <ExternalLink size={14} /> Abrir a aula
                    </PageButtonSm>
                  )}
                  {arquivo && token && (
                    <PageButtonSm type="button" onClick={() => baixarArquivo(arquivo, token).catch((e) => setErroBaixar(e instanceof Error ? e.message : "Erro ao baixar"))}>
                      <Download size={14} /> Baixar a aula
                    </PageButtonSm>
                  )}
                </Acoes>
              </AulaRodape>
            </AulaCard>
          );
        })
      )}
      {editando && (
        <EditorCapacitacao
          conteudo={conteudo}
          escoposDoMetodo={escoposDoMetodo}
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
