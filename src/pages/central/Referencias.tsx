import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  abrirUrlProtegida,
  blobUrlProtegida,
  getReferencias,
  marcarUsoReferencia,
  urlAnexoReferencia,
  type AnexoFicha,
  type ProjetoReferencia,
} from "@/lib/central";
import { EstadoVazio } from "@/components/EstadoVazio";
import { ConfirmarModal } from "@/components/ConfirmarModal";
import { FieldSelect } from "@/pages/Bancas.styled";
import { ErrorText, PageButtonSm, PageCard, PageCardContent, PageCardHeader, PageCardTitle, PageLoadingBlock } from "@/styles/page.styled";
import {
  Acoes,
  BotaoContorno,
  CardReferencia,
  CardReferenciaCorpo,
  Chip,
  FichaRodape,
  FichasLista,
  Meta,
  Mosaico,
  Nota,
  PerguntaResposta,
  Pilula,
  Pilulas,
  Tags,
} from "./Central.styled";
import { ModalReferencia } from "./ModalReferencia";
import { useCentral } from "./contexto";

function Previa({ anexo, token }: { anexo: AnexoFicha; token: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!anexo.imagem) return;
    let vivo = true;
    let criado: string | null = null;
    blobUrlProtegida(urlAnexoReferencia(anexo.id), token)
      .then((u) => {
        criado = u;
        if (vivo) setUrl(u);
      })
      .catch(() => {});
    return () => {
      vivo = false;
      if (criado) URL.revokeObjectURL(criado);
    };
  }, [anexo, token]);
  return (
    <figure>
      <button type="button" className="abrir" onClick={() => abrirUrlProtegida(urlAnexoReferencia(anexo.id), token).catch(() => {})}>
        {anexo.imagem ? url ? <img src={url} alt={anexo.legenda ?? anexo.nome} /> : <span>…</span> : <span>{anexo.nome.split(".").pop()?.toUpperCase()}</span>}
      </button>
      {anexo.legenda && <figcaption>{anexo.legenda}</figcaption>}
    </figure>
  );
}

/**
 * Projetos de referência (fase 2): os que se destacaram em cada escopo,
 * escolhidos por quem gere a Central. Filtro por frente e por escopo, e
 * "Usei como direcionamento" conta no painel.
 */
export function Referencias() {
  const { token } = useAuth();
  const { pendencias, versao } = useCentral();
  const gere = !!pendencias?.gere;
  const [lista, setLista] = useState<ProjetoReferencia[] | null>(null);
  const [erro, setErro] = useState("");
  const [frente, setFrente] = useState("");
  const [escopo, setEscopo] = useState("");
  const [gestao, setGestao] = useState("");
  const [ordem, setOrdem] = useState<"recentes" | "usos">("recentes");
  const [editando, setEditando] = useState<ProjetoReferencia | null | "nova">(null);
  // "Usei como direcionamento" pede confirmação: sem ela, o clique distraído conta como uso.
  const [confirmandoUso, setConfirmandoUso] = useState<ProjetoReferencia | null>(null);

  const carregar = useCallback(async () => {
    if (!token) return;
    try {
      setLista(await getReferencias(token, gere));
      setErro("");
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao carregar");
    }
  }, [token, gere]);

  useEffect(() => {
    async function aoAbrir() {
      await carregar();
    }
    aoAbrir();
  }, [carregar, versao]);

  const frentes = useMemo(() => [...new Set((lista ?? []).flatMap((r) => r.projeto.frentes))], [lista]);
  const escopos = useMemo(() => {
    const nomes = new Set<string>();
    for (const r of lista ?? []) {
      if (frente && !r.projeto.frentes.includes(frente)) continue;
      for (const e of r.projeto.escopos) nomes.add(e.nome);
    }
    return [...nomes];
  }, [lista, frente]);

  const gestoes = useMemo(
    () => [...new Set((lista ?? []).map((r) => r.numero_gestao).filter((n): n is number => n != null))].sort((a, b) => b - a),
    [lista],
  );

  const filtradas = useMemo(() => {
    const saida = (lista ?? []).filter((r) => {
      if (frente && !r.projeto.frentes.includes(frente)) return false;
      if (escopo && !r.projeto.escopos.some((e) => e.nome === escopo)) return false;
      if (gestao && String(r.numero_gestao ?? "") !== gestao) return false;
      return true;
    });
    if (ordem === "usos") saida.sort((a, b) => b.usos - a.usos || b.id - a.id);
    return saida;
  }, [lista, frente, escopo, gestao, ordem]);

  async function usar(r: ProjetoReferencia) {
    if (!token) return;
    const atualizada = await marcarUsoReferencia(r.id, null, token);
    setLista((atual) => (atual ?? []).map((x) => (x.id === atualizada.id ? atualizada : x)));
    setConfirmandoUso(null);
  }

  if (erro && !lista) return <ErrorText>{erro}</ErrorText>;
  if (!lista) return <PageLoadingBlock />;

  return (
    <PageCard>
      <PageCardHeader style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
        <PageCardTitle>Projetos de referência</PageCardTitle>
        {gere && (
          <BotaoContorno type="button" onClick={() => setEditando("nova")}>
            <Plus size={14} /> Adicionar projeto de referência
          </BotaoContorno>
        )}
      </PageCardHeader>
      <PageCardContent>
        <Nota style={{ marginTop: 0, marginBottom: "0.75rem" }}>
          Projetos que se destacaram em cada escopo, escolhidos pelo diretor de projetos para servir de direcionamento aos
          próximos. Cada escopo deve ter pelo menos um até o fim da gestão.
        </Nota>
        {erro && <ErrorText style={{ marginBottom: "0.75rem" }}>{erro}</ErrorText>}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center", marginBottom: "1rem" }}>
          <Pilulas role="group" aria-label="Frente">
            <Pilula type="button" $ativa={!frente} onClick={() => { setFrente(""); setEscopo(""); }}>
              Todas as frentes
            </Pilula>
            {frentes.map((f) => (
              <Pilula key={f} type="button" $ativa={frente === f} onClick={() => { setFrente(f); setEscopo(""); }}>
                {f}
              </Pilula>
            ))}
          </Pilulas>
          <span style={{ width: 1, height: "1.5rem", background: "var(--atlas-border)", margin: "0 0.25rem" }} />
          <Pilulas role="group" aria-label="Filtrar por escopo">
            <Pilula type="button" $ativa={!escopo} onClick={() => setEscopo("")}>
              Todos os escopos
            </Pilula>
            {escopos.map((e) => (
              <Pilula key={e} type="button" $ativa={escopo === e} onClick={() => setEscopo(e)}>
                {e}
              </Pilula>
            ))}
          </Pilulas>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginLeft: "auto" }}>
            {gestoes.length > 0 && (
              <FieldSelect aria-label="Gestão" value={gestao} onChange={(e) => setGestao(e.target.value)} style={{ width: "auto" }}>
                <option value="">Todas as gestões</option>
                {gestoes.map((n) => (
                  <option key={n} value={String(n)}>
                    {n}ª gestão
                  </option>
                ))}
              </FieldSelect>
            )}
            <FieldSelect aria-label="Ordenar" value={ordem} onChange={(e) => setOrdem(e.target.value as "recentes" | "usos")} style={{ width: "auto" }}>
              <option value="recentes">Mais recentes</option>
              <option value="usos">Mais usados</option>
            </FieldSelect>
          </div>
        </div>

        {lista.length === 0 ? (
          <EstadoVazio causa="vazio" titulo="Nenhum projeto de referência ainda" motivo="Quem gere a Central escolhe os projetos na revisão de meio e de fim de gestão." />
        ) : filtradas.length === 0 ? (
          <EstadoVazio causa="filtro" titulo="Nenhum projeto de referência neste escopo ainda" motivo="Afrouxe o filtro ou peça ao gerente que indique um na próxima revisão." />
        ) : (
          <FichasLista>
            {filtradas.map((r) => (
              <CardReferencia key={r.id} $inativa={!r.ativo}>
                <Mosaico>
                  {r.anexos.length > 0 && token ? (
                    <>
                      {r.anexos.slice(0, 3).map((a) => (
                        <Previa key={a.id} anexo={a} token={token} />
                      ))}
                      <small>Prévia · {r.anexos.length} {r.anexos.length === 1 ? "imagem" : "imagens"}</small>
                    </>
                  ) : (
                    <figure>
                      <button type="button" className="abrir" disabled>
                        {gere ? "Sem prévia. Envie a capa do deck em Editar." : "Sem prévia do deck"}
                      </button>
                    </figure>
                  )}
                </Mosaico>
                <CardReferenciaCorpo>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.75rem" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                      <h2>{r.projeto.nome}</h2>
                      <Meta>
                        <span>
                          {[r.projeto.cliente, r.projeto.frentes.join(" · "), r.numero_gestao ? `${r.numero_gestao}ª gestão` : null]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </Meta>
                    </div>
                    <Chip $tom={r.ativo ? "ok" : "neutro"}>{r.ativo ? "Referência" : "Inativa"}</Chip>
                  </div>
                  <Tags>
                    {r.projeto.escopos.map((e, i) => (
                      <Chip key={`${e.id}-${i}`}>{e.nome}</Chip>
                    ))}
                    {r.nota && <Chip $tom="primario">{r.nota}</Chip>}
                  </Tags>
                  <PerguntaResposta>
                    <div>
                      <dt>Pergunta do cliente</dt>
                      <dd>{r.pergunta_cliente}</dd>
                    </div>
                    <div>
                      <dt>Recomendação</dt>
                      <dd>{r.recomendacao}</dd>
                    </div>
                    <div className="larga">
                      <dt>Por que se destacou</dt>
                      <dd>
                        {r.por_que_se_destacou}
                        {r.escolhido_por_nome && <span style={{ color: "var(--atlas-muted-foreground)" }}> · {r.escolhido_por_nome}</span>}
                      </dd>
                    </div>
                  </PerguntaResposta>
                  <Meta style={{ alignItems: "center" }}>
                    <span style={{ fontWeight: 600, color: "var(--atlas-foreground)" }}>
                      {r.fichas.length > 0 ? `Gerou ${r.fichas.length} ficha${r.fichas.length === 1 ? "" : "s"}:` : "Nenhuma ficha da Tool Box indicada ainda."}
                    </span>
                    {r.fichas.map((f) => (
                      <Link key={f.id} to={`/central/fichas/${f.id}`} state={{ de: "/central/referencias" }} style={{ textDecoration: "none" }}>
                        <Chip $tom="primario">
                          {f.codigo} · {f.titulo}
                        </Chip>
                      </Link>
                    ))}
                  </Meta>
                  <FichaRodape style={{ marginTop: "auto" }}>
                    <span>
                      {r.projeto.coordenador ? `Coordenação ${r.projeto.coordenador}` : "Coordenação a confirmar"}
                      {r.projeto.equipe.length > 0 ? ` · ${r.projeto.equipe.join(", ")}` : ""}
                      {r.usos > 0 ? ` · ${r.usos} uso${r.usos === 1 ? "" : "s"}` : ""}
                    </span>
                    <Acoes>
                      {gere && (
                        <PageButtonSm type="button" $variant="ghost" onClick={() => setEditando(r)}>
                          Editar
                        </PageButtonSm>
                      )}
                      {r.ativo && (
                        <BotaoContorno type="button" onClick={() => setConfirmandoUso(r)}>
                          Usei como direcionamento
                        </BotaoContorno>
                      )}
                      {r.link_entregas && (
                        <PageButtonSm as="a" href={r.link_entregas} target="_blank" rel="noopener noreferrer">
                          Abrir entregas
                        </PageButtonSm>
                      )}
                    </Acoes>
                  </FichaRodape>
                </CardReferenciaCorpo>
              </CardReferencia>
            ))}
          </FichasLista>
        )}
      </PageCardContent>
      {confirmandoUso && (
        <ConfirmarModal
          titulo="Registrar o uso"
          mensagem={`Marcar que você usou "${confirmandoUso.projeto.nome}" como direcionamento no seu projeto? Conta nos números da Central e vale uma vez por pessoa e projeto.`}
          rotuloConfirmar="Sim, usei"
          rotuloProcessando="Registrando…"
          onCancelar={() => setConfirmandoUso(null)}
          onConfirmar={() => usar(confirmandoUso)}
        />
      )}
      {editando && (
        <ModalReferencia
          referencia={editando === "nova" ? null : editando}
          onFechar={() => setEditando(null)}
          onSalvo={async () => {
            setEditando(null);
            await carregar();
          }}
        />
      )}
    </PageCard>
  );
}
