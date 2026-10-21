import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ChevronDown, ChevronUp, Pencil } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  abrirLote,
  createLote,
  deleteLote,
  fecharLote,
  getLotes,
  getPendencias,
  getPendenciasFechados,
  seguirDatasLote,
  updateLote,
} from "@/lib/desempenho-lotes";
import { getProjetos, paraDataUtc } from "@/lib/projetos";
import { getFrentes } from "@/lib/frentes";
import { getGpRegras, getGpTipos, type GpRegras, type GpTipo } from "@/lib/gestao-pessoas";
import {
  BlocoPontuacaoAutomatica,
  type PontuacaoAutomaticaValor,
} from "@/pages/gestao-pessoas/BlocoPontuacaoAutomatica";
import type { Frente } from "@/types/banca";
import { ConfirmarModal } from "@/components/ConfirmarModal";
import type { DesempenhoLote, DesempenhoPendencia, DesempenhoPendenciaFechada, DesempenhoTipo } from "@/types/desempenho";
import type { ProjetoResumo } from "@/types/projeto";
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
import { FieldGroup, FieldInput, FieldLabel, FieldSelect, FormStack } from "@/pages/Bancas.styled";
import {
  CampoInlineRow,
  FiltrosRow,
  LoteCard,
  LoteCardAcoes,
  LoteCardHeader,
  LoteCardMeta,
  LoteCardTitulo,
  LotesStack,
  PendenciaCard,
  PendenciaFaltamRotulo,
  PendenciaIcone,
  PendenciaNome,
  PendenciaTexto,
  ProjetoChip,
  ProjetoChipsRow,
  RodadaLegendaBolinha,
  RodadaLegendaItem,
  RodadaLegendaRow,
  SeletorBarra,
  SeletorBusca,
  SeletorContagem,
  SubLista,
} from "./Painel.styled";
import { camposDeBrasilia, FUSO, instanteDeBrasilia } from "@/lib/fuso";

/** Valor de `<input type="datetime-local">` no relógio de Brasília. */
function paraDatetimeLocal(iso: string): string {
  const { dia, hora } = camposDeBrasilia(iso);
  return `${dia}T${hora}`;
}

/** O inverso: o que foi digitado no campo é horário de Brasília, não do
 *  navegador (quem está fora do país abriria o lote na hora errada). */
function deDatetimeLocal(valor: string): string {
  const [dia, hora] = valor.split("T");
  return instanteDeBrasilia(dia, hora);
}

function agoraDatetimeLocal(): string {
  return paraDatetimeLocal(new Date().toISOString());
}

function formatarData(iso: string): string {
  return paraDataUtc(iso).toLocaleString("pt-BR", { timeZone: FUSO, dateStyle: "short", timeStyle: "short" });
}

/**
 * ⭐ As cores do contorno "quantas rodadas esse projeto já teve" (2026-09-05,
 * a pedido). Só entram nesta lista quando alguém realmente tem aquele
 * número de rodadas — não existe uma cor pré-reservada pra "rodada 7" que
 * nunca aconteceu. `success`/`warning`/`info` são as 3 cores nomeadas do
 * tema fora do vermelho (que já é a seleção); as duas últimas são um
 * extra caso um projeto raro chegue à 4ª ou 5ª rodada, e o `%` faz o
 * ciclo recomeçar se isso um dia não bastar, em vez de estourar.
 */
const CORES_RODADA = [
  "hsl(142, 71%, 45%)", // success
  "hsl(38, 92%, 50%)", // warning
  "hsl(199, 89%, 48%)", // info
  "hsl(271, 76%, 53%)", // roxo
  "hsl(330, 65%, 55%)", // rosa
];

/** Quantos lotes JÁ FECHADOS cobriram cada projeto — a "rodada" é isso: uma
 *  avaliação de desempenho que esse projeto já passou, de qualquer tipo. */
function contarRodadasPorProjeto(lotes: DesempenhoLote[]): Map<number, number> {
  const contagem = new Map<number, number>();
  for (const lote of lotes) {
    if (lote.aberto) continue;
    for (const pid of lote.projeto_ids) {
      contagem.set(pid, (contagem.get(pid) ?? 0) + 1);
    }
  }
  return contagem;
}

/** Uma cor por número de rodada QUE REALMENTE EXISTE, gerada na hora — não
 *  uma tabela fixa de 1 a N. Projeto sem rodada nenhuma não entra aqui, e o
 *  chip dele fica sem contorno extra. */
function gerarCoresPorRodada(rodadasPorProjeto: Map<number, number>): Map<number, string> {
  const distintas = [...new Set(rodadasPorProjeto.values())]
    .filter((n) => n > 0)
    .sort((a, b) => a - b);
  return new Map(distintas.map((n, i) => [n, CORES_RODADA[i % CORES_RODADA.length]]));
}

function statusLote(lote: DesempenhoLote): { rotulo: string; tone: "success" | "muted" | "warning" } {
  if (lote.override_manual === "aberto") return { rotulo: "Aberto (manual)", tone: "success" };
  if (lote.override_manual === "fechado") return { rotulo: "Fechado (manual)", tone: "muted" };
  if (lote.aberto) return { rotulo: "Aberto", tone: "success" };
  return paraDataUtc(lote.data_inicio) > new Date()
    ? { rotulo: "Agendado", tone: "warning" }
    : { rotulo: "Encerrado", tone: "muted" };
}

interface PendenciasDoAvaliador {
  avaliadorId: number;
  avaliadorNome: string;
  itens: DesempenhoPendencia[];
}

// Agrupa por AVALIADOR (quem falta preencher), não por par, um card por
// pessoa com todo mundo que falta avaliar junto é o que dá pra escanear
// rápido; uma linha por par vira uma parede de texto repetindo nomes.
function agruparPendenciasPorAvaliador(pendencias: DesempenhoPendencia[]): PendenciasDoAvaliador[] {
  const grupos = new Map<number, PendenciasDoAvaliador>();
  for (const p of pendencias) {
    if (p.respondida) continue;
    const atual = grupos.get(p.avaliador_id) ?? {
      avaliadorId: p.avaliador_id,
      avaliadorNome: p.avaliador_nome ?? `Usuário ${p.avaliador_id}`,
      itens: [],
    };
    atual.itens.push(p);
    grupos.set(p.avaliador_id, atual);
  }
  return Array.from(grupos.values());
}

export function PainelLotes() {
  const { token } = useAuth();
  const [lotes, setLotes] = useState<DesempenhoLote[]>([]);
  const [projetos, setProjetos] = useState<ProjetoResumo[]>([]);
  const [frentes, setFrentes] = useState<Frente[]>([]);
  // A lista começa só com os abertos (2026-10-06, a pedido); "Mostrar
  // todos" traz o histórico, em ordem de fechamento, do mais recente pro
  // mais antigo. Os filtros valem nos dois casos.
  const [mostrarTodos, setMostrarTodos] = useState(false);
  // Quem ficou pendente nos formulários FECHADOS, por pessoa (2026-10-13, a
  // pedido). `null` = ainda não pediu; abre e fecha pelo botão do cabeçalho.
  const [fechados, setFechados] = useState<DesempenhoPendenciaFechada[] | null>(null);
  const [fechadosAberto, setFechadosAberto] = useState(false);
  const [fechadosCarregando, setFechadosCarregando] = useState(false);
  const [fechadosErro, setFechadosErro] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<DesempenhoTipo | "todos">("todos");
  const [filtroFrente, setFiltroFrente] = useState<string>("todas");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const [pendenciasLoteId, setPendenciasLoteId] = useState<number | null>(null);
  const [pendencias, setPendencias] = useState<DesempenhoPendencia[]>([]);
  const [pendenciasCarregando, setPendenciasCarregando] = useState(false);
  const [paraExcluir, setParaExcluir] = useState<DesempenhoLote | null>(null);

  const [editandoLoteId, setEditandoLoteId] = useState<number | null>(null);
  const [editNome, setEditNome] = useState("");
  const [editDataInicio, setEditDataInicio] = useState("");
  const [editDataFim, setEditDataFim] = useState("");
  const [editProjetoIds, setEditProjetoIds] = useState<number[]>([]);
  const [editSalvando, setEditSalvando] = useState(false);
  const [editErro, setEditErro] = useState("");

  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<DesempenhoTipo>("periodico");
  // A Avaliação do Escopo (auto-avaliação de cada participante) entra junto?
  // Só é perguntado aqui, no lote aberto à mão. Na finalização fala do escopo
  // que passou pela banca; na periódica (2026-10-05), do escopo em andamento.
  const [incluiEscopo, setIncluiEscopo] = useState(true);
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [projetoIds, setProjetoIds] = useState<number[]>([]);
  const [buscaProjeto, setBuscaProjeto] = useState("");
  const [projetosExpandido, setProjetosExpandido] = useState(false);
  // ⭐ 2026-09-05, a pedido: o botão "Expandir" clicava e nada parecia
  // acontecer — porque de fato não acontecia nada quando a lista de chips já
  // cabia inteira nos 11rem da caixa. `scrollHeight` mede o conteúdo por
  // inteiro (não encolhe com o corte do `max-height`), então dá pra saber
  // ANTES de expandir se há algo escondido pra revelar.
  const chipsRowRef = useRef<HTMLDivElement>(null);
  const [precisaExpandirProjetos, setPrecisaExpandirProjetos] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState("");

  // Gestão de Pessoas: quem ficar pendente no prazo toma ponto? O padrão vem
  // de Configurações (`lote_padrao`); as regras só carregam pra quem pode
  // configurar GP, e sem elas o bloco começa desligado.
  const [gpTipos, setGpTipos] = useState<GpTipo[]>([]);
  const [gpRegras, setGpRegras] = useState<GpRegras | null>(null);
  const [gpNovo, setGpNovo] = useState<PontuacaoAutomaticaValor>({ pontua: false, tipoId: null, pontos: 1, alvo: "ambos" });
  const [editGp, setEditGp] = useState<PontuacaoAutomaticaValor>({ pontua: false, tipoId: null, pontos: 1, alvo: "ambos" });

  function gpPadrao(regras: GpRegras | null): PontuacaoAutomaticaValor {
    return {
      pontua: false,
      tipoId: regras?.lote_padrao.tipo_id ?? null,
      pontos: regras?.lote_padrao.pontos ?? 1,
      alvo: "ambos",
    };
  }

  async function buscar() {
    if (!token) return;
    setCarregando(true);
    setErro("");
    try {
      const [l, p, f] = await Promise.all([getLotes(token, false), getProjetos(token), getFrentes(token)]);
      setFrentes(f);
      setLotes(l);
      setProjetos(p);
      getGpTipos(token).then(setGpTipos).catch(() => setGpTipos([]));
      getGpRegras(token)
        .then((r) => {
          setGpRegras(r);
          setGpNovo(gpPadrao(r));
        })
        .catch(() => setGpRegras(null));
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao carregar formulários");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    buscar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const nomesProjeto = useMemo(() => new Map(projetos.map((p) => [p.id, p.nome])), [projetos]);
  const frenteIdsPorProjeto = useMemo(() => new Map(projetos.map((p) => [p.id, p.frente_ids])), [projetos]);

  const lotesVisiveis = useMemo(() => {
    const frenteId = filtroFrente === "todas" ? null : Number(filtroFrente);
    return lotes
      .filter((l) => mostrarTodos || l.aberto)
      .filter((l) => filtroTipo === "todos" || l.tipo === filtroTipo)
      .filter(
        (l) => frenteId === null || l.projeto_ids.some((pid) => frenteIdsPorProjeto.get(pid)?.includes(frenteId)),
      )
      .sort((a, b) => new Date(b.data_fim).getTime() - new Date(a.data_fim).getTime());
  }, [lotes, mostrarTodos, filtroTipo, filtroFrente, frenteIdsPorProjeto]);
  const totalFechados = lotes.filter((l) => !l.aberto).length;

  // ⭐ 2026-09-05, a pedido: contorno colorido no chip de cada projeto,
  // indicando quantas rodadas de avaliação (qualquer tipo, já fechadas) ele
  // já teve — pra quem monta uma periódica nova enxergar de relance quem já
  // rodou antes, sem abrir cada lote passado um por um.
  const rodadasPorProjeto = useMemo(() => contarRodadasPorProjeto(lotes), [lotes]);
  const coresPorRodada = useMemo(
    () => gerarCoresPorRodada(rodadasPorProjeto),
    [rodadasPorProjeto],
  );
  function corDaRodada(projetoId: number): string | undefined {
    const rodadas = rodadasPorProjeto.get(projetoId);
    return rodadas ? coresPorRodada.get(rodadas) : undefined;
  }

  const projetosVisiveis = useMemo(() => {
    const alvo = buscaProjeto.trim().toLowerCase();
    if (!alvo) return projetos;
    return projetos.filter((p) => `${p.nome} ${p.cliente}`.toLowerCase().includes(alvo));
  }, [projetos, buscaProjeto]);

  // Mede contra os 11rem fixos da caixa colapsada (`ProjetoChipsRow`), não
  // contra `clientHeight`: expandido, o `clientHeight` cresce junto com o
  // conteúdo e a comparação sempre daria "cabe", mesmo quando expandir foi
  // exatamente o que revelou o resto da lista.
  useEffect(() => {
    const el = chipsRowRef.current;
    if (!el) return;
    const remPx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    setPrecisaExpandirProjetos(el.scrollHeight > 11 * remPx + 1);
  }, [projetosVisiveis]);

  function toggleProjeto(id: number) {
    setProjetoIds((atual) => (atual.includes(id) ? atual.filter((p) => p !== id) : [...atual, id]));
  }

  function handleMudarTipo(novoTipo: DesempenhoTipo) {
    setTipo(novoTipo);
    // Começa vazio nos dois tipos. Antes a periódica vinha com TODOS os
    // projetos marcados, e a tela abria como um paredão vermelho onde não se
    // distinguia o que estava escolhido do que era só o padrão. O atalho de
    // marcar todos continua existindo, agora como botão, escolha explícita.
    setProjetoIds([]);
  }

  async function handleCriar(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    if (!nome.trim() || !dataInicio || !dataFim) {
      setErroForm("Preencha nome e as duas datas.");
      return;
    }
    if (gpNovo.pontua && (!gpNovo.tipoId || gpNovo.pontos < 1)) {
      setErroForm("Escolha o tipo de ocorrência e os pontos de quem ficar pendente.");
      return;
    }
    setSalvando(true);
    setErroForm("");
    try {
      const novo = await createLote(
        {
          nome: nome.trim(),
          tipo,
          data_inicio: deDatetimeLocal(dataInicio),
          data_fim: deDatetimeLocal(dataFim),
          projeto_ids: projetoIds,
          inclui_avaliacao_de_escopo: incluiEscopo,
          gp_pontua: gpNovo.pontua,
          gp_tipo_id: gpNovo.pontua ? gpNovo.tipoId : null,
          gp_pontos: gpNovo.pontua ? gpNovo.pontos : null,
        },
        token,
      );
      setLotes((atual) => [novo, ...atual]);
      setNome("");
      setDataInicio("");
      setDataFim("");
      setProjetoIds([]);
      setIncluiEscopo(true);
      setGpNovo(gpPadrao(gpRegras));
    } catch (err) {
      setErroForm(err instanceof Error ? err.message : "Erro ao criar formulário");
    } finally {
      setSalvando(false);
    }
  }

  async function handleAbrir(loteId: number) {
    if (!token) return;
    const atualizado = await abrirLote(loteId, token);
    setLotes((atual) => atual.map((l) => (l.id === loteId ? atualizado : l)));
    // Reabriu: pendências deixam de fazer sentido pra este lote, some o botão,
    // então fecha o painel se estivesse aberto.
    setPendenciasLoteId((atual) => (atual === loteId ? null : atual));
  }

  async function handleFechar(loteId: number) {
    if (!token) return;
    const atualizado = await fecharLote(loteId, token);
    setLotes((atual) => atual.map((l) => (l.id === loteId ? atualizado : l)));
  }

  async function handleSeguirDatas(loteId: number) {
    if (!token) return;
    const atualizado = await seguirDatasLote(loteId, token);
    setLotes((atual) => atual.map((l) => (l.id === loteId ? atualizado : l)));
  }

  function toggleEditProjeto(id: number) {
    setEditProjetoIds((atual) => (atual.includes(id) ? atual.filter((p) => p !== id) : [...atual, id]));
  }

  function handleIniciarEdicao(lote: DesempenhoLote) {
    setEditandoLoteId(lote.id);
    setEditNome(lote.nome);
    setEditDataInicio(paraDatetimeLocal(lote.data_inicio));
    setEditDataFim(paraDatetimeLocal(lote.data_fim));
    setEditProjetoIds(lote.projeto_ids);
    setEditGp({
      pontua: lote.gp_pontua,
      tipoId: lote.gp_tipo_id,
      pontos: lote.gp_pontos ?? gpRegras?.lote_padrao.pontos ?? 1,
      alvo: "ambos",
    });
    setEditErro("");
  }

  async function handleSalvarEdicao(loteId: number) {
    if (!token) return;
    if (!editNome.trim() || !editDataInicio || !editDataFim) {
      setEditErro("Preencha nome e as duas datas.");
      return;
    }
    const loteAtual = lotes.find((l) => l.id === loteId);
    const gpTravado = !!loteAtual?.gp_aplicado_em;
    if (!gpTravado && editGp.pontua && (!editGp.tipoId || editGp.pontos < 1)) {
      setEditErro("Escolha o tipo de ocorrência e os pontos de quem ficar pendente.");
      return;
    }
    setEditSalvando(true);
    setEditErro("");
    try {
      const atualizado = await updateLote(
        loteId,
        {
          nome: editNome.trim(),
          data_inicio: deDatetimeLocal(editDataInicio),
          data_fim: deDatetimeLocal(editDataFim),
          projeto_ids: editProjetoIds,
          // Depois de aplicados, os pontos não mudam mais (o backend recusa).
          ...(gpTravado
            ? {}
            : {
                gp_pontua: editGp.pontua,
                gp_tipo_id: editGp.pontua ? editGp.tipoId : null,
                gp_pontos: editGp.pontua ? editGp.pontos : null,
              }),
        },
        token,
      );
      setLotes((atual) => atual.map((l) => (l.id === loteId ? atualizado : l)));
      setEditandoLoteId(null);
    } catch (err) {
      setEditErro(err instanceof Error ? err.message : "Erro ao salvar o formulário");
    } finally {
      setEditSalvando(false);
    }
  }

  async function confirmarExclusao() {
    if (!token || !paraExcluir) return;
    await deleteLote(paraExcluir.id, token);
    setLotes((atual) => atual.filter((l) => l.id !== paraExcluir.id));
    setParaExcluir(null);
  }

  async function handleVerPendencias(loteId: number) {
    if (!token) return;
    if (pendenciasLoteId === loteId) {
      setPendenciasLoteId(null);
      return;
    }
    setPendenciasLoteId(loteId);
    setPendencias([]);
    setPendenciasCarregando(true);
    try {
      setPendencias(await getPendencias(loteId, token));
    } finally {
      setPendenciasCarregando(false);
    }
  }

  async function handleVerFechados() {
    if (!token) return;
    if (fechadosAberto) {
      setFechadosAberto(false);
      return;
    }
    setFechadosAberto(true);
    if (fechados !== null) return;
    setFechadosCarregando(true);
    setFechadosErro("");
    try {
      setFechados(await getPendenciasFechados(token));
    } catch (err) {
      setFechadosErro(err instanceof Error ? err.message : "Erro ao carregar as pendências");
    } finally {
      setFechadosCarregando(false);
    }
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
    <>
      <PageCard>
        <PageCardHeader>
          <PageCardTitle>Novo formulário</PageCardTitle>
          <PageButtonSm as={Link} to="/avaliacao-desempenho/painel/formularios" $variant="outline">
            <Pencil size={14} />
            Editar formulário
          </PageButtonSm>
        </PageCardHeader>
        <PageCardContent>
          <FormStack onSubmit={handleCriar}>
            <FieldGroup>
              <FieldLabel htmlFor="lote-nome">Nome</FieldLabel>
              <FieldInput id="lote-nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
            </FieldGroup>
            <FieldGroup>
              <FieldLabel htmlFor="lote-tipo">Tipo</FieldLabel>
              <FieldSelect id="lote-tipo" value={tipo} onChange={(e) => handleMudarTipo(e.target.value as DesempenhoTipo)}>
                <option value="periodico">Periódica</option>
                <option value="finalizacao">Finalização</option>
              </FieldSelect>
            </FieldGroup>
            <FieldGroup>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem" }}>
                <input
                  type="checkbox"
                  checked={incluiEscopo}
                  onChange={(e) => setIncluiEscopo(e.target.checked)}
                />
                {tipo === "finalizacao"
                  ? "Incluir a Avaliação do Escopo (cada participante avalia o escopo finalizado)"
                  : "Incluir a Avaliação do Escopo (cada participante avalia o escopo em andamento, ainda sem banca)"}
              </label>
            </FieldGroup>
            <BlocoPontuacaoAutomatica
              idPrefixo="lote-novo"
              pergunta="Quem ficar pendente no prazo toma ponto?"
              tipos={gpTipos}
              valor={gpNovo}
              onChange={setGpNovo}
            />
            <FieldGroup>
              <FieldLabel htmlFor="lote-inicio">Início</FieldLabel>
              <CampoInlineRow>
                <FieldInput
                  id="lote-inicio"
                  type="datetime-local"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  required
                />
                <PageButtonSm $variant="outline" type="button" onClick={() => setDataInicio(agoraDatetimeLocal())}>
                  Agora
                </PageButtonSm>
              </CampoInlineRow>
            </FieldGroup>
            <FieldGroup>
              <FieldLabel htmlFor="lote-fim">Fim</FieldLabel>
              <FieldInput
                id="lote-fim"
                type="datetime-local"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                required
              />
            </FieldGroup>
            <FieldGroup>
              <FieldLabel>Projetos cobertos</FieldLabel>
              <SeletorBarra>
                <SeletorBusca
                  type="search"
                  value={buscaProjeto}
                  onChange={(e) => setBuscaProjeto(e.target.value)}
                  placeholder="Buscar por projeto ou cliente"
                  aria-label="Buscar projeto"
                />
                <PageButtonSm
                  type="button"
                  $variant="outline"
                  onClick={() =>
                    setProjetoIds((atual) => [
                      ...new Set([...atual, ...projetosVisiveis.map((p) => p.id)]),
                    ])
                  }
                >
                  Marcar todos
                </PageButtonSm>
                <PageButtonSm type="button" $variant="outline" onClick={() => setProjetoIds([])}>
                  Limpar
                </PageButtonSm>
                <SeletorContagem>
                  {projetoIds.length} de {projetos.length} escolhidos
                </SeletorContagem>
                {/* ⭐ Só aparece quando há algo de fato escondido pelos
                    11rem da caixa (ou já expandida, pra sempre dar como
                    recolher) — antes ficava sempre visível e, com poucos
                    projetos, clicar não mudava nada na tela. */}
                {(precisaExpandirProjetos || projetosExpandido) && (
                  <PageButtonSm
                    type="button"
                    $variant="outline"
                    onClick={() => setProjetosExpandido((v) => !v)}
                  >
                    {projetosExpandido ? (
                      <>
                        <ChevronUp size={14} />
                        Recolher
                      </>
                    ) : (
                      <>
                        <ChevronDown size={14} />
                        Expandir
                      </>
                    )}
                  </PageButtonSm>
                )}
              </SeletorBarra>
              {/* ⭐ Só aparece quem tem rodada de verdade — sem lote fechado
                  nenhum ainda, a legenda não teria sentido nenhum. */}
              {coresPorRodada.size > 0 && (
                <RodadaLegendaRow>
                  {[...coresPorRodada.entries()].map(([rodadas, cor]) => (
                    <RodadaLegendaItem key={rodadas}>
                      <RodadaLegendaBolinha $cor={cor} />
                      {rodadas} {rodadas === 1 ? "rodada" : "rodadas"}
                    </RodadaLegendaItem>
                  ))}
                </RodadaLegendaRow>
              )}
              <ProjetoChipsRow ref={chipsRowRef} $expandido={projetosExpandido}>
                {projetosVisiveis.length === 0 ? (
                  <EmptyText>Nenhum projeto encontrado.</EmptyText>
                ) : (
                  projetosVisiveis.map((p) => {
                    const selecionado = projetoIds.includes(p.id);
                    return (
                      <ProjetoChip
                        key={p.id}
                        type="button"
                        $selecionado={selecionado}
                        $corRodada={corDaRodada(p.id)}
                        aria-pressed={selecionado}
                        onClick={() => toggleProjeto(p.id)}
                      >
                        {p.nome}
                      </ProjetoChip>
                    );
                  })
                )}
              </ProjetoChipsRow>
            </FieldGroup>
            {erroForm && <ErrorText>{erroForm}</ErrorText>}
            <PageButton type="submit" disabled={salvando}>
              {salvando ? "Criando..." : "Criar formulário"}
            </PageButton>
          </FormStack>
        </PageCardContent>
      </PageCard>

      <PageCard>
        <PageCardHeader>
          <PageCardTitle>
            Formulários ({lotesVisiveis.length}
            {!mostrarTodos && totalFechados > 0 ? ` abertos, ${totalFechados} no histórico` : ""})
          </PageCardTitle>
          {totalFechados > 0 && (
            <PageButtonSm type="button" $variant={fechadosAberto ? "primary" : "outline"} onClick={handleVerFechados}>
              <AlertTriangle size={14} />
              Pendências dos fechados
            </PageButtonSm>
          )}
        </PageCardHeader>
        <PageCardContent>
          <FiltrosRow>
            <FieldSelect
              aria-label="Filtrar por tipo"
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value as DesempenhoTipo | "todos")}
            >
              <option value="todos">Todos os tipos</option>
              <option value="periodico">Periódica</option>
              <option value="finalizacao">Finalização</option>
            </FieldSelect>
            <FieldSelect
              aria-label="Filtrar por frente"
              value={filtroFrente}
              onChange={(e) => setFiltroFrente(e.target.value)}
            >
              <option value="todas">Todas as frentes</option>
              {frentes.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome}
                </option>
              ))}
            </FieldSelect>
            <PageButtonSm type="button" $variant="outline" onClick={() => setMostrarTodos((v) => !v)}>
              {mostrarTodos ? "Só abertos" : "Mostrar todos"}
            </PageButtonSm>
          </FiltrosRow>
          {fechadosAberto && (
            <SubLista>
              {fechadosErro ? (
                <ErrorText>{fechadosErro}</ErrorText>
              ) : fechadosCarregando || fechados === null ? (
                <EmptyText>Carregando quem ficou pendente...</EmptyText>
              ) : fechados.length === 0 ? (
                <EmptyText>Ninguém ficou pendente nos formulários fechados.</EmptyText>
              ) : (
                fechados.map((pessoa) => (
                  <PendenciaCard key={pessoa.avaliador_id}>
                    <PendenciaIcone>
                      <AlertTriangle size={16} />
                    </PendenciaIcone>
                    <PendenciaTexto>
                      <PendenciaNome>{pessoa.avaliador_nome}</PendenciaNome>{" "}
                      <PendenciaFaltamRotulo>
                        {pessoa.total} {pessoa.total === 1 ? "avaliação" : "avaliações"} sem resposta
                      </PendenciaFaltamRotulo>
                      {pessoa.lotes.map((l) => (
                        <div key={l.lote_id} style={{ marginTop: "0.25rem" }}>
                          <strong>{l.lote_nome}</strong> (fechado em {formatarData(l.fechado_em)}):{" "}
                          {l.itens
                            .map((p) =>
                              p.form_type === "escopo"
                                ? `Escopo ${p.escopo_nome ?? ""}`.trim()
                                : `${p.avaliado_nome ?? ""} (${p.projeto_nomes.filter(Boolean).join(", ")})`,
                            )
                            .join(", ")}
                        </div>
                      ))}
                    </PendenciaTexto>
                  </PendenciaCard>
                ))
              )}
            </SubLista>
          )}
          {lotes.length === 0 ? (
            <EmptyText>Nenhum formulário criado ainda.</EmptyText>
          ) : lotesVisiveis.length === 0 ? (
            <EmptyText>
              {mostrarTodos
                ? "Nenhum formulário com esses filtros."
                : "Nenhum formulário aberto agora. Use \"Mostrar todos\" pra ver o histórico."}
            </EmptyText>
          ) : (
            <LotesStack>
            {lotesVisiveis.map((lote) => {
              const status = statusLote(lote);
              const gruposPendencias =
                pendenciasLoteId === lote.id ? agruparPendenciasPorAvaliador(pendencias) : [];
              return (
                <LoteCard key={lote.id}>
                  <LoteCardHeader>
                    <div>
                      <LoteCardTitulo>{lote.nome}</LoteCardTitulo>{" "}
                      <PageBadge $tone={status.tone}>{status.rotulo}</PageBadge>
                    </div>
                    <LoteCardAcoes>
                      <PageButtonSm
                        $variant="outline"
                        type="button"
                        onClick={() =>
                          editandoLoteId === lote.id ? setEditandoLoteId(null) : handleIniciarEdicao(lote)
                        }
                      >
                        {editandoLoteId === lote.id ? "Cancelar" : "Editar"}
                      </PageButtonSm>
                      <PageButtonSm $variant="outline" type="button" onClick={() => handleAbrir(lote.id)}>
                        Abrir
                      </PageButtonSm>
                      <PageButtonSm $variant="outline" type="button" onClick={() => handleFechar(lote.id)}>
                        Fechar
                      </PageButtonSm>
                      {lote.override_manual !== null && (
                        <PageButtonSm $variant="ghost" type="button" onClick={() => handleSeguirDatas(lote.id)}>
                          Voltar ao automático
                        </PageButtonSm>
                      )}
                      {/* Também com o lote aberto (2026-10-06, a pedido): a
                          diretoria quer acompanhar quem ainda não respondeu
                          antes do prazo fechar, não só cobrar depois. */}
                      <PageButtonSm type="button" onClick={() => handleVerPendencias(lote.id)}>
                        Pendências
                      </PageButtonSm>
                      <PageButtonSm $variant="ghost" type="button" onClick={() => setParaExcluir(lote)}>
                        Excluir
                      </PageButtonSm>
                    </LoteCardAcoes>
                  </LoteCardHeader>

                  {editandoLoteId === lote.id ? (
                    <FormStack onSubmit={(e) => { e.preventDefault(); handleSalvarEdicao(lote.id); }}>
                      <FieldGroup>
                        <FieldLabel htmlFor={`edit-nome-${lote.id}`}>Nome</FieldLabel>
                        <FieldInput
                          id={`edit-nome-${lote.id}`}
                          value={editNome}
                          onChange={(e) => setEditNome(e.target.value)}
                          required
                        />
                      </FieldGroup>
                      <FieldGroup>
                        <FieldLabel htmlFor={`edit-inicio-${lote.id}`}>Início</FieldLabel>
                        <CampoInlineRow>
                          <FieldInput
                            id={`edit-inicio-${lote.id}`}
                            type="datetime-local"
                            value={editDataInicio}
                            onChange={(e) => setEditDataInicio(e.target.value)}
                            required
                          />
                          <PageButtonSm
                            $variant="outline"
                            type="button"
                            onClick={() => setEditDataInicio(agoraDatetimeLocal())}
                          >
                            Agora
                          </PageButtonSm>
                        </CampoInlineRow>
                      </FieldGroup>
                      <FieldGroup>
                        <FieldLabel htmlFor={`edit-fim-${lote.id}`}>Fim</FieldLabel>
                        <FieldInput
                          id={`edit-fim-${lote.id}`}
                          type="datetime-local"
                          value={editDataFim}
                          onChange={(e) => setEditDataFim(e.target.value)}
                          required
                        />
                      </FieldGroup>
                      <FieldGroup>
                        <FieldLabel>Projetos cobertos</FieldLabel>
                        <ProjetoChipsRow>
                          {projetos.map((p) => (
                            <ProjetoChip
                              key={p.id}
                              type="button"
                              $selecionado={editProjetoIds.includes(p.id)}
                              $corRodada={corDaRodada(p.id)}
                              onClick={() => toggleEditProjeto(p.id)}
                            >
                              {p.nome}
                            </ProjetoChip>
                          ))}
                        </ProjetoChipsRow>
                      </FieldGroup>
                      <BlocoPontuacaoAutomatica
                        idPrefixo={`lote-${lote.id}`}
                        pergunta="Quem ficar pendente no prazo toma ponto?"
                        tipos={gpTipos}
                        valor={editGp}
                        onChange={setEditGp}
                        aplicadoEm={lote.gp_aplicado_em}
                      />
                      {editErro && <ErrorText>{editErro}</ErrorText>}
                      <PageButtonSm type="submit" disabled={editSalvando}>
                        {editSalvando ? "Salvando..." : "Salvar"}
                      </PageButtonSm>
                    </FormStack>
                  ) : (
                    <LoteCardMeta>
                      {lote.tipo === "periodico" ? "Periódica" : "Finalização"} · {formatarData(lote.data_inicio)} a{" "}
                      {formatarData(lote.data_fim)} · {lote.projeto_ids.length} projeto(s):{" "}
                      {lote.projeto_ids.map((id) => nomesProjeto.get(id) ?? id).join(", ") || "nenhum"}
                    </LoteCardMeta>
                  )}

                  {pendenciasLoteId === lote.id && (
                    <SubLista>
                      {pendenciasCarregando ? (
                        <EmptyText>Carregando pendências...</EmptyText>
                      ) : gruposPendencias.length === 0 ? (
                        <EmptyText>Ninguém pendente neste formulário.</EmptyText>
                      ) : (
                        gruposPendencias.map((grupo) => (
                          <PendenciaCard key={grupo.avaliadorId}>
                            <PendenciaIcone>
                              <AlertTriangle size={16} />
                            </PendenciaIcone>
                            <PendenciaTexto>
                              <PendenciaNome>{grupo.avaliadorNome}</PendenciaNome>{" "}
                              <PendenciaFaltamRotulo>falta avaliar:</PendenciaFaltamRotulo>{" "}
                              {grupo.itens.map((p, i) => (
                                <span key={`${p.avaliado_id}-${p.projeto_escopo_id ?? ""}`}>
                                  {/* Avaliação do Escopo é auto (avaliador ==
                                      avaliado): mostrar o nome da própria
                                      pessoa leria como "Fulano falta avaliar
                                      Fulano". É uma por escopo, daí o nome
                                      dele no rótulo. */}
                                  {p.form_type === "escopo"
                                    ? `Escopo ${p.escopo_nome ?? ""}`.trim()
                                    : p.avaliado_nome}
                                  {p.projeto_nomes.filter(Boolean).length > 0 &&
                                    ` (${p.projeto_nomes.filter(Boolean).join(", ")})`}
                                  {i < grupo.itens.length - 1 ? ", " : ""}
                                </span>
                              ))}
                            </PendenciaTexto>
                          </PendenciaCard>
                        ))
                      )}
                    </SubLista>
                  )}
                </LoteCard>
              );
            })}
            </LotesStack>
          )}
        </PageCardContent>
      </PageCard>

      {paraExcluir && (
        <ConfirmarModal
          titulo="Excluir formulário"
          mensagem={`Excluir o formulário "${paraExcluir.nome}"? Esta ação não pode ser desfeita.`}
          onCancelar={() => setParaExcluir(null)}
          onConfirmar={confirmarExclusao}
        />
      )}
    </>
  );
}
