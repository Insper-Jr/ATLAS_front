import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { deleteAvaliacao, getAvaliacaoDetalhe, getAvaliacoes } from "@/lib/desempenho-avaliacoes";
import { getLotes } from "@/lib/desempenho-lotes";
import { tomDaNota } from "@/lib/avaliacoes";
import { getUsuarios } from "@/lib/usuarios";
import { getProjetos, paraDataUtc } from "@/lib/projetos";
import { getFrentes } from "@/lib/frentes";
import { getUsuariosFrentes } from "@/lib/usuarios-frentes";
import { frentesDoUsuario } from "@/lib/nucleo";
import { ConfirmarModal } from "@/components/ConfirmarModal";
import type { DesempenhoAvaliacao, DesempenhoAvaliacaoDetalhe, DesempenhoLote, DesempenhoTipo } from "@/types/desempenho";
import type { UsuarioFrente, UsuarioResumo } from "@/types/auth";
import type { ProjetoResumo } from "@/types/projeto";
import type { Frente } from "@/types/banca";
import {
  EmptyText,
  ErrorBlock,
  ErrorText,
  PageBadge,
  PageButton,
  PageButtonSm,
  PageCard,
  PageCardContent,
  PageCardHeader,
  PageCardTitle,
  PageLoadingBlock,
} from "@/styles/page.styled";
import { FieldInput, FieldSelect } from "@/pages/Bancas.styled";
import { ViewToggleRow, ViewToggleBtn } from "@/pages/projetos/Projetos.styled";
import { theme } from "@/styles/theme";
import {
  AvaliacaoDetalheBlock,
  DetalheComentarioBlock,
  DetalheComentarioRotulo,
  DetalheComentarioTexto,
  DetalheCriterioBarraFill,
  DetalheCriterioBarraTrilha,
  DetalheCriterioLabel,
  DetalheCriterioNumero,
  DetalheCriterioRow,
  DetalheCriterioTexto,
  DetalheCriteriosLista,
  DetalheNotaGeralDestaque,
  DetalheNotaGeralNumero,
  DetalheNotaGeralRotulo,
  FiltrosRow,
  ListaExpansivel,
  PessoaContexto,
  PessoaHeader,
  PessoaResumo,
  SubItem,
  SubItemAcoes,
  SubLista,
} from "./Painel.styled";
import { FUSO } from "@/lib/fuso";

type Modo = "avaliador" | "avaliado";

/** Vermelho abaixo do esperado, âmbar no meio, verde acima, mesma leitura
 *  rápida de "isso é bom ou ruim" da escala 1-5 do formulário de origem. */
function corDaNota(nota: number): string {
  if (nota < 3) return theme.colors.destructive;
  if (nota === 3) return theme.colors.warning;
  return theme.colors.success;
}

function formatarData(iso?: string): string {
  if (!iso) return "—";
  return paraDataUtc(iso).toLocaleString("pt-BR", { timeZone: FUSO, dateStyle: "short", timeStyle: "short" });
}

/**
 * Auditoria do registro bruto de avaliações — antes duas telas quase
 * idênticas ("Avaliadores" e "Avaliados"), agora uma só com um toggle.
 *
 * A ÚNICA diferença de verdade entre os dois modos é o lado do par
 * (avaliador_id, avaliado_id) usado pra agrupar; todo o resto — filtros,
 * expandir pra ver o detalhe de uma avaliação, remover — é idêntico. Esta
 * tela é o "olhar o log cru e moderar se precisar"; pra "como está a
 * pessoa X" o destino agora é a aba Relatórios, que já mostra o resultado
 * agregado e bonito em vez de avaliação por avaliação.
 */
export function PainelAvaliacoes() {
  const { token } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const modo: Modo = pathname.endsWith("/avaliados") ? "avaliado" : "avaliador";
  const [avaliacoes, setAvaliacoes] = useState<DesempenhoAvaliacao[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioResumo[]>([]);
  const [lotes, setLotes] = useState<DesempenhoLote[]>([]);
  const [projetos, setProjetos] = useState<ProjetoResumo[]>([]);
  const [frentes, setFrentes] = useState<Frente[]>([]);
  const [usuariosFrentes, setUsuariosFrentes] = useState<UsuarioFrente[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [expandido, setExpandido] = useState<string | null>(null);
  const [filtroTipo, setFiltroTipo] = useState<DesempenhoTipo | "todos">("todos");
  const [filtroFrente, setFiltroFrente] = useState<string>("todas");
  const [busca, setBusca] = useState("");
  // "pessoas" = agrupa avaliação por avaliador/avaliado (o de sempre).
  // "escopo" = só as Avaliações do Escopo, agrupadas pelo ESCOPO avaliado
  // (2026-09-10) — "Análise Mercadológica · BLEND I (média 4)".
  const [visao, setVisao] = useState<"pessoas" | "escopo">("pessoas");

  const [avaliacaoExpandidaId, setAvaliacaoExpandidaId] = useState<number | null>(null);
  const [detalhes, setDetalhes] = useState<Map<number, DesempenhoAvaliacaoDetalhe>>(new Map());
  const [paraRemover, setParaRemover] = useState<DesempenhoAvaliacao | null>(null);

  async function buscar() {
    if (!token) return;
    setCarregando(true);
    setErro("");
    try {
      const [a, u, l, p, f, uf] = await Promise.all([
        getAvaliacoes(token),
        getUsuarios(token),
        getLotes(token, false),
        getProjetos(token),
        getFrentes(token),
        getUsuariosFrentes(token),
      ]);
      setAvaliacoes(a);
      setUsuarios(u);
      setLotes(l);
      setProjetos(p);
      setFrentes(f);
      setUsuariosFrentes(uf);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao carregar avaliações");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    buscar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function trocarModo(novoModo: Modo) {
    setExpandido(null);
    setAvaliacaoExpandidaId(null);
    navigate(
      novoModo === "avaliado"
        ? "/avaliacao-desempenho/painel/avaliados"
        : "/avaliacao-desempenho/painel/avaliadores",
    );
  }

  const nomes = useMemo(() => new Map(usuarios.map((u) => [u.id, u.nome])), [usuarios]);
  const tipoPorLote = useMemo(() => new Map(lotes.map((l) => [l.id, l.tipo])), [lotes]);
  const projetoIdsPorLote = useMemo(() => new Map(lotes.map((l) => [l.id, l.projeto_ids])), [lotes]);
  const nomeProjetoPorId = useMemo(() => new Map(projetos.map((p) => [p.id, p.nome])), [projetos]);
  const projetoPorId = useMemo(() => new Map(projetos.map((p) => [p.id, p])), [projetos]);
  const semestrePorUsuario = useMemo(
    () => new Map(usuarios.map((u) => [u.id, u.semestre_graduacao])),
    [usuarios],
  );

  // Só a(s) frente(s) que a PESSOA integra hoje (`usuario_frente`), nunca a
  // união das frentes dos projetos que ela avaliou/foi avaliada, que pode
  // juntar frentes de rodadas diferentes e não bate com "a pessoa está em
  // 1 ou 2 frentes, nunca mais".
  const frenteIdsPorUsuario = useMemo(() => {
    const mapa = new Map<number, Set<number>>();
    for (const uf of usuariosFrentes) {
      const atual = mapa.get(uf.usuario_id) ?? new Set<number>();
      atual.add(uf.frente_id);
      mapa.set(uf.usuario_id, atual);
    }
    return mapa;
  }, [usuariosFrentes]);

  // O lote cobre MUITOS projetos (a rodada inteira), mas uma avaliação é
  // sempre sobre um par específico, o que se quer mostrar é só o(s)
  // projeto(s) que ligam avaliador e avaliado (mesmo projeto, um como
  // coordenador e o outro como consultor), não a lista inteira da rodada.
  function projetosDaAvaliacao(a: DesempenhoAvaliacao): string {
    const idsDoLote = projetoIdsPorLote.get(a.lote_id) ?? [];
    const comuns = idsDoLote.filter((id) => {
      const projeto = projetoPorId.get(id);
      if (!projeto) return false;
      const membros = new Set([...projeto.coordenador_ids, ...projeto.consultor_ids]);
      return membros.has(a.avaliador_id) && membros.has(a.avaliado_id);
    });
    return comuns.map((id) => nomeProjetoPorId.get(id)).filter(Boolean).join(", ") || "—";
  }

  // O resumo de contexto que aparece do lado do nome: a frente que a pessoa
  // integra hoje e o semestre da graduação dela, atributos DA PESSOA, não
  // da rodada de avaliação.
  function resumoContexto(pessoaId: number): string {
    const frentesPessoa = frentesDoUsuario(usuariosFrentes, frentes, pessoaId);
    const semestre = semestrePorUsuario.get(pessoaId);
    const partes = [frentesPessoa.join("/") || "sem frente", semestre ? `${semestre}º semestre` : "sem semestre"];
    return partes.join(" · ");
  }

  const avaliacoesFiltradas = useMemo(() => {
    if (filtroTipo === "todos") return avaliacoes;
    return avaliacoes.filter((a) => tipoPorLote.get(a.lote_id) === filtroTipo);
  }, [avaliacoes, tipoPorLote, filtroTipo]);

  // Cada grupo é `{ chave, titulo, pessoaId?, lista }`. `pessoaId` só existe
  // na visão "pessoas" — o contexto (frente/semestre) sai dele no render.
  type Grupo = { chave: string; titulo: string; pessoaId?: number; lista: DesempenhoAvaliacao[] };
  const grupos = useMemo<Grupo[]>(() => {
    let base: Grupo[];
    if (visao === "escopo") {
      const mapa = new Map<string, Grupo>();
      for (const a of avaliacoesFiltradas) {
        if (!a.eh_escopo && !a.escopo) continue;
        // Avaliação do Escopo sem escopo identificado (o backend não conseguiu
        // desambiguar): fica num grupo próprio aqui, em vez de sumir ou de
        // cair na visão por pessoa (2026-10-12).
        if (!a.escopo) {
          const semEscopo = mapa.get("sem") ?? {
            chave: "escopo-sem-identificacao",
            titulo: "Escopo não identificado",
            lista: [],
          };
          semEscopo.lista.push(a);
          mapa.set("sem", semEscopo);
          continue;
        }
        // ⭐ 2026-09-24, corrigido: `escopo_id` é o CATÁLOGO ("Análise
        // Mercadológica"), o mesmo em todo projeto que tem esse tipo de
        // escopo — o grupo já mistura BLEND I, ATLAS I etc. por baixo.
        // Cravar `projeto_nome` de UM item no título grande lia como "só
        // deste projeto", quando não é. O projeto de cada avaliação
        // continua aparecendo por item, em `projetosDaAvaliacao` na lista
        // expandida — aqui é só o nome do escopo.
        // "Outro" sem par no catálogo não tem `escopo_id`: agrupa pelo nome.
        const chaveEscopo =
          a.escopo.escopo_id != null ? `id-${a.escopo.escopo_id}` : `nome-${a.escopo.nome.toLowerCase()}`;
        const atual = mapa.get(chaveEscopo) ?? {
          chave: `escopo-${chaveEscopo}`,
          titulo: a.escopo.nome,
          lista: [],
        };
        atual.lista.push(a);
        mapa.set(chaveEscopo, atual);
      }
      base = Array.from(mapa.values());
    } else {
      const mapa = new Map<number, DesempenhoAvaliacao[]>();
      for (const a of avaliacoesFiltradas) {
        // A Avaliação do Escopo é outra visão, nunca "Fulano avaliou Fulano".
        // `eh_escopo` cobre também a que veio sem escopo identificado.
        if (a.eh_escopo || a.escopo) continue;
        const chave = modo === "avaliador" ? a.avaliador_id : a.avaliado_id;
        const lista = mapa.get(chave) ?? [];
        lista.push(a);
        mapa.set(chave, lista);
      }
      // O filtro de frente é sobre a PESSOA do agrupamento, aplicado depois de
      // agrupar — senão removeria linhas soltas e deixaria a contagem errada.
      base = Array.from(mapa.entries())
        .filter(([pessoaId]) => {
          if (filtroFrente !== "todas" && !frenteIdsPorUsuario.get(pessoaId)?.has(Number(filtroFrente))) {
            return false;
          }
          return true;
        })
        .map(([pessoaId, lista]) => ({
          chave: `pessoa-${pessoaId}`,
          titulo: nomes.get(pessoaId) ?? `Usuário ${pessoaId}`,
          pessoaId,
          lista,
        }));
    }
    // ⭐ 2026-09-22 — a pedido: ordem alfabética (era por quantidade de
    // avaliações, decrescente) e busca por nome, mesmo padrão de
    // `PainelRelatorio.tsx`/`Membros.tsx`.
    return base
      .filter((g) => g.titulo.toLowerCase().includes(busca.trim().toLowerCase()))
      .sort((a, b) => a.titulo.localeCompare(b.titulo));
  }, [avaliacoesFiltradas, filtroFrente, frenteIdsPorUsuario, modo, visao, nomes, busca]);

  async function toggleDetalhe(avaliacaoId: number) {
    if (!token) return;
    if (avaliacaoExpandidaId === avaliacaoId) {
      setAvaliacaoExpandidaId(null);
      return;
    }
    setAvaliacaoExpandidaId(avaliacaoId);
    if (!detalhes.has(avaliacaoId)) {
      const detalhe = await getAvaliacaoDetalhe(avaliacaoId, token);
      setDetalhes((atual) => new Map(atual).set(avaliacaoId, detalhe));
    }
  }

  async function confirmarRemocao() {
    if (!token || !paraRemover) return;
    await deleteAvaliacao(paraRemover.id, token);
    setAvaliacoes((atual) => atual.filter((a) => a.id !== paraRemover.id));
    setAvaliacaoExpandidaId(null);
    setParaRemover(null);
  }

  if (erro) {
    return (
      <ErrorBlock>
        <ErrorText>{erro}</ErrorText>
        <PageButton $variant="outline" onClick={buscar}>
          Tentar novamente
        </PageButton>
      </ErrorBlock>
    );
  }

  if (carregando) return <PageLoadingBlock />;

  return (
    <PageCard>
      <PageCardHeader>
        <PageCardTitle>
          {visao === "escopo"
            ? "Como cada escopo foi avaliado"
            : modo === "avaliador"
              ? "Quem avaliou quem"
              : "Como cada um foi avaliado"}{" "}
          ({grupos.length})
        </PageCardTitle>
        {/* O toggle avaliador/avaliado só faz sentido agrupando por PESSOA —
            na visão de escopo o agrupamento é o próprio escopo. */}
        {visao !== "escopo" && (
          <ViewToggleRow role="tablist" aria-label="Agrupar por">
            <ViewToggleBtn
              type="button"
              role="tab"
              aria-selected={modo === "avaliador"}
              $ativo={modo === "avaliador"}
              onClick={() => trocarModo("avaliador")}
            >
              Por avaliador
            </ViewToggleBtn>
            <ViewToggleBtn
              type="button"
              role="tab"
              aria-selected={modo === "avaliado"}
              $ativo={modo === "avaliado"}
              onClick={() => trocarModo("avaliado")}
            >
              Por avaliado
            </ViewToggleBtn>
          </ViewToggleRow>
        )}
      </PageCardHeader>
      <PageCardContent>
        <FiltrosRow>
          <FieldInput
            type="text"
            placeholder="Buscar por nome..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            aria-label="Buscar por nome"
          />
          <FieldSelect value={visao} onChange={(e) => setVisao(e.target.value as "pessoas" | "escopo")}>
            <option value="pessoas">Avaliação de pessoas</option>
            <option value="escopo">Avaliação de escopo</option>
          </FieldSelect>
          <FieldSelect value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value as DesempenhoTipo | "todos")}>
            <option value="todos">Todos os tipos</option>
            <option value="periodico">Periódica</option>
            <option value="finalizacao">Finalização</option>
          </FieldSelect>
          {visao === "pessoas" && (
            <FieldSelect value={filtroFrente} onChange={(e) => setFiltroFrente(e.target.value)}>
              <option value="todas">Todas as frentes</option>
              {frentes.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome}
                </option>
              ))}
            </FieldSelect>
          )}
        </FiltrosRow>

        {grupos.length === 0 ? (
          <EmptyText>
            {busca.trim()
              ? `Nenhum resultado para "${busca.trim()}".`
              : visao === "escopo"
                ? "Nenhuma Avaliação do Escopo registrada ainda."
                : "Nenhuma avaliação registrada ainda."}
          </EmptyText>
        ) : (
          <ListaExpansivel>
            {grupos.map((grupo) => {
              const { chave, titulo, pessoaId, lista } = grupo;
              // Média some só na visão "por avaliador" (é "X enviadas"); em
              // "por avaliado" e "por escopo" a média é o ponto.
              const temMedia = visao === "escopo" || modo === "avaliado";
              const media = temMedia
                ? lista.reduce((soma, a) => soma + a.nota_geral, 0) / lista.length
                : null;
              return (
                <div key={chave}>
                  <PessoaHeader
                    type="button"
                    onClick={() => {
                      // Fechar e reabrir uma pessoa volta à lista inteira de
                      // avaliações dela, sem o "Detalhes" que estava aberto
                      // (2026-10-06, a pedido).
                      setAvaliacaoExpandidaId(null);
                      setExpandido((atual) => (atual === chave ? null : chave));
                    }}
                  >
                    <span>
                      {titulo}{" "}
                      {pessoaId != null && (
                        <PessoaContexto>({resumoContexto(pessoaId)})</PessoaContexto>
                      )}
                    </span>
                    <PessoaResumo>
                      {!temMedia ? (
                        `${lista.length} avaliações enviadas`
                      ) : (
                        <>
                          {lista.length}{" "}
                          {visao === "escopo" ? "avaliações" : "avaliações recebidas"} · média{" "}
                          <PageBadge $tone={tomDaNota(media!)}>{media!.toFixed(1)}</PageBadge>
                        </>
                      )}
                    </PessoaResumo>
                  </PessoaHeader>
                  {expandido === chave && (
                    <SubLista>
                      {lista.map((a) => {
                        const outroLadoId =
                          visao === "escopo" || modo === "avaliado" ? a.avaliador_id : a.avaliado_id;
                        const detalhe = detalhes.get(a.id);
                        const expandidaAqui = avaliacaoExpandidaId === a.id;
                        return (
                          <div key={a.id}>
                            <SubItem>
                              <span>
                                {nomes.get(outroLadoId) ?? `Usuário ${outroLadoId}`}
                                {" · "}
                                {projetosDaAvaliacao(a)}
                                {" · "}
                                {formatarData(a.criado_em)}
                              </span>
                              <SubItemAcoes>
                                <PageBadge $tone={tomDaNota(a.nota_geral)}>{a.nota_geral.toFixed(1)}</PageBadge>
                                <PageButtonSm $variant="outline" type="button" onClick={() => toggleDetalhe(a.id)}>
                                  {expandidaAqui ? "Ocultar" : "Detalhes"}
                                </PageButtonSm>
                                <PageButtonSm $variant="ghost" type="button" onClick={() => setParaRemover(a)}>
                                  Remover
                                </PageButtonSm>
                              </SubItemAcoes>
                            </SubItem>
                            {expandidaAqui && (
                              <AvaliacaoDetalheBlock>
                                {!detalhe ? (
                                  <EmptyText>Carregando...</EmptyText>
                                ) : (
                                  <>
                                    <DetalheNotaGeralDestaque $cor={corDaNota(detalhe.nota_geral)}>
                                      <DetalheNotaGeralRotulo>Nota geral</DetalheNotaGeralRotulo>
                                      <DetalheNotaGeralNumero $cor={corDaNota(detalhe.nota_geral)}>
                                        {detalhe.nota_geral.toFixed(1)}
                                      </DetalheNotaGeralNumero>
                                    </DetalheNotaGeralDestaque>

                                    <DetalheCriteriosLista>
                                      {detalhe.notas.map((n) =>
                                        n.tipo_resposta === "nota" && n.nota != null ? (
                                          <DetalheCriterioRow key={n.criterio_id}>
                                            <DetalheCriterioLabel>
                                              {n.label ?? `Critério ${n.criterio_id}`}
                                            </DetalheCriterioLabel>
                                            <DetalheCriterioBarraTrilha>
                                              <DetalheCriterioBarraFill
                                                $percent={(n.nota / 5) * 100}
                                                $cor={corDaNota(n.nota)}
                                              />
                                            </DetalheCriterioBarraTrilha>
                                            <DetalheCriterioNumero $cor={corDaNota(n.nota)}>
                                              {n.nota.toFixed(1)}
                                            </DetalheCriterioNumero>
                                          </DetalheCriterioRow>
                                        ) : (
                                          <DetalheCriterioRow key={n.criterio_id}>
                                            <DetalheCriterioLabel>
                                              {n.label ?? `Critério ${n.criterio_id}`}
                                            </DetalheCriterioLabel>
                                            <div />
                                            <div />
                                            <DetalheCriterioTexto>{n.resposta_texto || "—"}</DetalheCriterioTexto>
                                          </DetalheCriterioRow>
                                        ),
                                      )}
                                    </DetalheCriteriosLista>

                                    <DetalheComentarioBlock>
                                      <DetalheComentarioRotulo>Comentário</DetalheComentarioRotulo>
                                      <DetalheComentarioTexto>{detalhe.comentarios || "—"}</DetalheComentarioTexto>
                                    </DetalheComentarioBlock>
                                  </>
                                )}
                              </AvaliacaoDetalheBlock>
                            )}
                          </div>
                        );
                      })}
                    </SubLista>
                  )}
                </div>
              );
            })}
          </ListaExpansivel>
        )}
      </PageCardContent>

      {paraRemover && (
        <ConfirmarModal
          titulo="Remover avaliação"
          mensagem={`Remover a avaliação de ${
            nomes.get(paraRemover.avaliador_id) ?? `Usuário ${paraRemover.avaliador_id}`
          } sobre ${nomes.get(paraRemover.avaliado_id) ?? `Usuário ${paraRemover.avaliado_id}`}? Esta ação não pode ser desfeita.`}
          rotuloConfirmar="Remover"
          onCancelar={() => setParaRemover(null)}
          onConfirmar={confirmarRemocao}
        />
      )}
    </PageCard>
  );
}
