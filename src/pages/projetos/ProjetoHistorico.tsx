import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { theme } from "@/styles/theme";
import { pode } from "@/utils/permissoes";
import {
  CORES_STATUS,
  excluirJustificativaAtraso,
  excluirRemarcacaoBanca,
  formatarDataHora,
  getHistoricoProjeto,
  mostrarHistoricoCompleto,
  ocultarHistorico,
  paraDataUtc,
  ROTULO_MOTIVO_ATRASO,
  ROTULO_STATUS,
} from "@/lib/projetos";
import { tonsDaColuna } from "@/lib/colunas-tarefa";
import { ConfirmarModal } from "@/components/ConfirmarModal";
import { EstadoVazio } from "@/components/EstadoVazio";
import type {
  HistoricoEntrada,
  JustificativaAtrasoHistorico,
  RemarcacaoBancaHistorico,
  StatusHistorico,
} from "@/types/projeto";
import type { StatusProjeto } from "@/types/projeto";
import {
  PageStack,
  PageCard,
  PageCardHeader,
  PageCardTitle,
  PageCardContent,
  PageButton,
  PageLoadingBlock,
  ErrorBlock,
  ErrorText,
} from "@/styles/page.styled";
import { Ponto } from "@/components/kanban/Kanban.styled";
import {
  AvisoBanner,
  StatusPilula,
  HistoricoAutorChip,
  HistoricoExcluirBtn,
  HistoricoResumoFaixa,
  HistoricoResumoLegenda,
  HistoricoResumoLegendaItem,
  HistoricoResumoSegmento,
  HistoricoRodape,
  HistoricoNotaCabecalho,
  HistoricoNotaLinha,
  HistoricoNotaMotivo,
  HistoricoNotaTag,
  HistoricoTipoTag,
  HistoricoAguardando,
  HistoricoNotaTexto,
  HistoricoPainelDia,
  HistoricoPainelDica,
  HistoricoReguaCabecalho,
  HistoricoReguaBloco,
  HistoricoReguaEixo,
  HistoricoReguaMes,
  HistoricoReguaNo,
  HistoricoReguaPista,
  HistoricoReguaPopup,
  HistoricoReguaPopupTexto,
  HistoricoReguaPopupTitulo,
  HistoricoReguaResumo,
  HistoricoReguaViewport,
  HistoricoTimelineConteudo,
  HistoricoTimelineDiaTitulo,
  HistoricoTimelineItem,
  HistoricoTimelineMeta,
  HistoricoTimelineTransicao,
} from "./Projetos.styled";
import { HistoricoFiltros } from "./HistoricoFiltros";
import { useProjeto } from "./ProjetoPage";
import { diaDoValor, FUSO, hojeEmBrasilia, somarDias } from "@/lib/fuso";

/**
 * A etiqueta e a cor de cada natureza de evento do Histórico.
 *
 * A cor não é decoração: é a leitura rápida da timeline. Verde é o que
 * destravou (dias aprovados), vermelho o que travou ou mudou uma data
 * combinada, azul é conversa registrada, cinza é pedido ainda sem desfecho.
 * Tipo desconhecido cai num genérico em vez de sumir da tela.
 */
const APARENCIA_EVENTO: Record<string, { rotulo: string; cor: string }> = {
  pedido_de_dias: { rotulo: "Pedido de dias", cor: theme.colors.mutedForeground },
  dias_de_ajuste: { rotulo: "Dias aprovados", cor: theme.colors.success },
  // Nada de `primary` aqui: neste tema ele é o MESMO vermelho do
  // `destructive`, e "Reunião" saía com cara de alerta. `info` e `warning`
  // são as cores que dizem "informação" e "atenção" sem gritar erro.
  reuniao: { rotulo: "Reunião", cor: theme.colors.info },
  entrega_alterada: { rotulo: "Entrega", cor: theme.colors.warning },
  // A banca acontecendo é evento de peso: é ela que destrava a entrega ao
  // cliente (§5.5). Fica em `info`, e não em `success` — a linha existe tanto
  // para a banca aprovada quanto para a reprovada, e a cor não pode antecipar
  // um veredito que está escrito no detalhe.
  banca_realizada: { rotulo: "Banca", cor: theme.colors.info },
};


function formatarDuracao(ms: number): string {
  const dias = Math.floor(ms / 86_400_000);
  if (dias >= 1) return `${dias} ${dias === 1 ? "dia" : "dias"}`;
  const horas = Math.floor(ms / 3_600_000);
  if (horas >= 1) return `${horas}h`;
  const minutos = Math.max(1, Math.floor(ms / 60_000));
  return `${minutos}min`;
}

function rotuloDia(iso: string): string {
  const data = paraDataUtc(iso);
  return data.toLocaleDateString("pt-BR", { timeZone: FUSO, weekday: "long", day: "2-digit", month: "long" });
}

/* ────────────────────────────────  · a escala da linha do tempo horizontal */

const MS_DIA = 86_400_000;
/**
 * O vão MÍNIMO entre dois nós, em pixels.
 *
 * ⚠ Não é escolha estética: é o alvo de toque de 44px. Dois dias seguidos
 * mais juntos do que isso ficam impossíveis de acertar com o dedo, e a régua
 * deixa de ser navegável exatamente onde o histórico é mais denso.
 */
const VAO_MIN = 44;
/**
 * O teto do vão.
 *
 * Sem ele, um projeto parado seis meses viraria uma régua de milhares de
 * pixels de NADA, com os dois grupos de eventos invisíveis nas pontas. A
 * proporção importa até o ponto em que ela ainda cabe na tela.
 */
const VAO_MAX = 170;
/** Pixels por dia corrido entre um registro e o seguinte. */
const PX_POR_DIA = 22;
/**
 * O passo do leque: quanto dois eventos do MESMO dia se afastam.
 *
 * Menor que `VAO_MIN` de propósito. Errar a marca vizinha dentro de um dia é
 * inofensivo — as duas abrem o mesmo painel, e o evento pretendido está lá do
 * mesmo jeito; errar o DIA vizinho abriria outra coisa, e é por isso que
 * aquele vão continua valendo o alvo de toque inteiro.
 */
const PASSO_LEQUE = 26;
/** Metade da largura do pop-up (17rem), em pixels: o quanto ele pode chegar
 *  perto da borda do card antes de ter de ser empurrado para dentro. */
const POPUP_MEIO = 136;

/** A âncora de uma linha: a mesma que a aba Atrasos usa em
 *  `/projetos/{id}/historico#justificativa-{id}`. */
function ancoraDe(linha: HistoricoEntrada): string {
  if (linha.tipo === "justificativa_atraso") return `justificativa-${idNumerico(linha.id)}`;
  if (linha.tipo === "banca_remarcada") return `remarcacao-${idNumerico(linha.id)}`;
  if (linha.tipo === "status") return `status-${linha.id}`;
  return `evento-${linha.id}`;
}

/**
 * A natureza, a cor, o título e o texto de uma linha — em UM lugar só.
 *
 * ⚠ Isto estava espalhado por quatro ramos do JSX. Com a régua precisando dos
 * mesmos dados para o pop-up, manter as duas cópias em dia seria questão de
 * tempo até uma natureza nova aparecer bonita na lista e genérica na régua.
 */
function descreverEvento(
  linha: HistoricoEntrada,
  escopos: { id: number; nome: string }[],
): { rotulo: string; cor: string; titulo: string; detalhe: string | null } {
  const nomeEscopo = (id: number | null | undefined) =>
    escopos.find((e) => e.id === id)?.nome ?? null;

  if (linha.tipo === "justificativa_atraso") {
    return {
      rotulo: "Justificativa de Atraso",
      cor: theme.colors.destructive,
      titulo:
        [
          linha.motivo_tipo
            ? (ROTULO_MOTIVO_ATRASO[linha.motivo_tipo] ?? linha.motivo_tipo)
            : null,
          nomeEscopo(linha.projeto_escopo_id),
        ]
          .filter(Boolean)
          .join(" · ") || "Atraso justificado",
      detalhe: linha.detalhe ?? null,
    };
  }

  if (linha.tipo === "banca_remarcada") {
    return {
      rotulo: "Remarcação de Banca",
      cor: theme.colors.destructive,
      titulo: [
        nomeEscopo(linha.projeto_escopo_id),
        `${formatarDataHora(linha.data_anterior)} → ${formatarDataHora(linha.data_nova)}`,
      ]
        .filter(Boolean)
        .join(" · "),
      detalhe: linha.detalhe ?? null,
    };
  }

  if (linha.tipo === "status") {
    return {
      rotulo: "Mudança de etapa",
      cor: tonsDaColuna(CORES_STATUS[linha.status_novo]).ponto,
      titulo: linha.status_anterior
        ? `${ROTULO_STATUS[linha.status_anterior]} → ${ROTULO_STATUS[linha.status_novo]}`
        : `${ROTULO_STATUS[linha.status_novo]} · projeto criado`,
      detalhe: null,
    };
  }

  const aparencia = APARENCIA_EVENTO[linha.tipo] ?? {
    rotulo: "Evento",
    cor: theme.colors.mutedForeground,
  };
  // A recusa de um pedido é o único caso em que o rótulo depende do dado, e
  // não só do tipo: "aprovados" e "negados" são histórias opostas.
  const negado = linha.tipo === "dias_de_ajuste" && linha.aprovado === false;
  return {
    rotulo: negado ? "Dias negados" : aparencia.rotulo,
    cor: negado ? theme.colors.destructive : aparencia.cor,
    titulo: linha.titulo ?? aparencia.rotulo,
    detalhe: linha.detalhe ?? null,
  };
}

/** A data de um nó da régua: "12 de ago", curta o bastante para caber sobre ela. */
function rotuloCurtoDia(chave: string): string {
  const [ano, mes, dia] = chave.split("-").map(Number);
  return new Date(ano, mes - 1, dia).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}

/** Um clique numa régua não deve disparar rolagem animada em quem pediu ao
 *  sistema para não ver movimento. */
function comportamentoDeRolagem(): ScrollBehavior {
  return typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ? "auto"
    : "smooth";
}

function chaveDia(iso: string): string {
  // Não é `iso.slice(0, 10)`: cortar a string pega a data em UTC, e um evento
  // entre 21h e meia-noite (horário de Brasília) cai no dia seguinte em UTC —
  // agruparia na data errada. Precisa passar pelo Date pra pegar o dia local.
  return diaDoValor(iso);
}

function ehStatus(h: HistoricoEntrada): h is StatusHistorico {
  return h.tipo === "status";
}

/** Quem registrou a linha, qualquer que seja o tipo.
 *
 * `alterado_por` é o único campo de autoria que TODAS as cinco fontes
 * emitem; `registrado_por` só existe em algumas. Preferir o específico e cair
 * no comum evita ter de listar as variantes aqui toda vez que nasce uma. */
function autorDe(h: HistoricoEntrada): number | null {
  if (ehStatus(h)) return h.alterado_por;
  const especifico = "registrado_por" in h ? h.registrado_por : null;
  return especifico ?? h.alterado_por ?? null;
}

/**
 * Timeline vertical das mudanças de status (F4) e notas de atraso/remarcação
 * de banca do projeto, com resumo de tempo por etapa, filtros
 * por status/autor/período, paginação por dia e "Limpar histórico".
 */
/**
 * O id NUMÉRICO de uma linha do histórico.
 *
 * O backend compõe a timeline de sete fontes e prefixa o id de cada uma para
 * as chaves não colidirem, `"justificativa:7"`, `"remarcacao:3"`,
 * `"entrega:12"`. Ótimo como chave de React, inútil como id de rota.
 *
 * Dois bugs saíram de ler o valor cru:
 *
 * - a âncora virava `#justificativa-justificativa:7`, e o link "justificado"
 *   da aba Atrasos aponta para `#justificativa-7`, a pessoa caía no topo do
 *   histórico em vez de na nota que acabou de escrever;
 * - o botão Excluir mandava `justificativa:7` para uma rota que espera `int`,
 *   e voltava 422.
 */
function idNumerico(id: number | string): number {
  return Number(String(id).split(":").pop());
}

export function ProjetoHistorico() {
  const { projeto, usuarios, recarregar } = useProjeto();
  const { token, usuario } = useAuth();
  const location = useLocation();
  const [historico, setHistorico] = useState<HistoricoEntrada[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [confirmandoLimpar, setConfirmandoLimpar] = useState(false);
  const [mostrandoTudo, setMostrandoTudo] = useState(false);
  // Mesma trava de quem registra, não é edição de rotina, é
  // pra corrigir engano/teste.
  const podeExcluir = pode(usuario, "registrar_justificativa_atraso");
  const [excluindo, setExcluindo] = useState<
    JustificativaAtrasoHistorico | RemarcacaoBancaHistorico | null
  >(null);

  // Quem acabou de justificar um atraso (ou remarcar uma banca) chega aqui
  // via `#justificativa-7`/`#remarcacao-3`, sem isso a pessoa caía no topo
  // da lista inteira e tinha que procurar a nota que acabou de escrever.
  const [realcado, setRealcado] = useState<string | null>(null);
  const jaRolouRef = useRef(false);
  useEffect(() => {
    if (carregando || jaRolouRef.current) return;
    const alvo = location.hash.replace("#", "");
    if (!alvo) return;
    jaRolouRef.current = true;
    const elemento = document.getElementById(alvo);
    if (!elemento) return;
    elemento.scrollIntoView({ behavior: "smooth", block: "center" });
    setRealcado(alvo);
    const t = setTimeout(() => setRealcado(null), 1800);
    return () => clearTimeout(t);
  }, [carregando, location.hash]);

  const [statusFiltro, setStatusFiltro] = useState<Set<StatusProjeto>>(new Set());
  const [autorFiltro, setAutorFiltro] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  /** Qual pill de período rápido está ativa, `null` quando as datas vieram
   *  de edição manual (ou não há filtro), pra não marcar um pill errado. */
  const [periodoRapido, setPeriodoRapido] = useState<number | null>(null);

  async function carregar() {
    if (!token) return;
    setCarregando(true);
    setErro("");
    try {
      setHistorico(await getHistoricoProjeto(projeto.id, token));
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao carregar o histórico");
    } finally {
      setCarregando(false);
    }
  }

  async function excluir(linha: JustificativaAtrasoHistorico | RemarcacaoBancaHistorico) {
    if (!token) return;
    if (linha.tipo === "justificativa_atraso") {
      await excluirJustificativaAtraso(projeto.id, idNumerico(linha.id), token);
    } else {
      await excluirRemarcacaoBanca(projeto.id, idNumerico(linha.id), token);
    }
    // No sucesso quem chamou desmonta o ConfirmarModal (ver o próprio
    // componente), precisa fechar aqui antes de recarregar.
    setExcluindo(null);
    await carregar();
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, projeto.id]);

  // "Limpar histórico" não apaga linha nenhuma, só marca o corte de
  // exibição no projeto (ver OcultarHistoricoUseCase no back). Por isso um
  // recarregar() (atualiza o projeto no contexto, pro banner aparecer) e um
  // carregar() (o back já devolve a lista filtrada pelo novo corte).
  async function limparHistorico() {
    if (!token) return;
    await ocultarHistorico(projeto.id, token);
    setConfirmandoLimpar(false);
    await Promise.all([recarregar(), carregar()]);
  }

  async function mostrarTudo() {
    if (!token) return;
    setMostrandoTudo(true);
    try {
      await mostrarHistoricoCompleto(projeto.id, token);
      await Promise.all([recarregar(), carregar()]);
    } finally {
      setMostrandoTudo(false);
    }
  }

  const nomeUsuario = (id: number) => usuarios.find((u) => u.id === id)?.nome ?? `Usuário ${id}`;

  // Cada linha marca a entrada num status, "quanto tempo ficou" é a
  // distância até a PRÓXIMA linha (ou até agora, pra quem está vigente).
  // Soma por status pra dar conta de quem visitou a mesma etapa mais de
  // uma vez (voltou e avançou de novo).
  const historicoStatus = useMemo(() => historico.filter(ehStatus), [historico]);

  const resumoPorStatus = useMemo(() => {
    if (historicoStatus.length === 0) return [];
    // `?? ""` porque a lista é composta de cinco fontes no backend, e uma
    // linha sem data derrubava a TELA INTEIRA no localeCompare. Ordenar mal
    // uma linha é um defeito; não abrir o Histórico é outro, bem maior.
    const ascendente = [...historicoStatus].sort((a, b) =>
      (a.alterado_em ?? "").localeCompare(b.alterado_em ?? ""),
    );
    const duracoes = new Map<StatusProjeto, number>();
    for (let i = 0; i < ascendente.length; i++) {
      const inicio = paraDataUtc(ascendente[i].alterado_em).getTime();
      const fim =
        i + 1 < ascendente.length ? paraDataUtc(ascendente[i + 1].alterado_em).getTime() : Date.now();
      const status = ascendente[i].status_novo;
      duracoes.set(status, (duracoes.get(status) ?? 0) + Math.max(0, fim - inicio));
    }
    const total = [...duracoes.values()].reduce((soma, ms) => soma + ms, 0) || 1;
    return [...duracoes.entries()]
      .map(([status, ms]) => ({ status, ms, percent: (ms / total) * 100 }))
      .sort((a, b) => b.ms - a.ms);
  }, [historicoStatus]);

  const statusPresentes = useMemo(
    () => [...new Set(historicoStatus.map((h) => h.status_novo))].sort(
      (a, b) => (resumoPorStatus.find((r) => r.status === a)?.ms ?? 0) < (resumoPorStatus.find((r) => r.status === b)?.ms ?? 0) ? 1 : -1,
    ),
    [historicoStatus, resumoPorStatus],
  );

  const autoresPresentes = useMemo(() => {
    const ids = [...new Set(historico.map(autorDe).filter((id): id is number => id !== null))];
    return ids.sort((a, b) => nomeUsuario(a).localeCompare(nomeUsuario(b), "pt-BR"));
  }, [historico, usuarios]);

  const temAutomatico = historicoStatus.some((h) => h.alterado_por === null);

  function alternarStatusFiltro(status: StatusProjeto) {
    setStatusFiltro((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(status)) proximo.delete(status);
      else proximo.add(status);
      return proximo;
    });
  }

  function limparFiltros() {
    setStatusFiltro(new Set());
    setAutorFiltro("");
    setDataInicio("");
    setDataFim("");
    setPeriodoRapido(null);
  }

  // Atalho pros recortes de data mais pedidos, sem isso, "só a última
  // semana" exigia calcular a data de cabeça e digitar nos dois campos.
  function aplicarPeriodoRapido(dias: number) {
    // Hoje de Brasília: o dia de UTC já é amanhã a partir das 21h.
    const fim = hojeEmBrasilia();
    setDataInicio(somarDias(fim, -dias));
    setDataFim(fim);
    setPeriodoRapido(dias);
  }

  function editarDataManual(campo: "inicio" | "fim", valor: string) {
    setPeriodoRapido(null);
    if (campo === "inicio") setDataInicio(valor);
    else setDataFim(valor);
  }

  const filtroAtivo = statusFiltro.size > 0 || autorFiltro !== "" || dataInicio !== "" || dataFim !== "";

  const historicoFiltrado = useMemo(() => {
    return historico.filter((linha) => {
      // O filtro de status pinta as PÍLULAS de transição, uma nota de
      // atraso não tem status, então fica de fora só se o usuário estiver
      // filtrando por status (senão ela sempre aparece).
      if (statusFiltro.size > 0 && (!ehStatus(linha) || !statusFiltro.has(linha.status_novo))) return false;
      const autor = autorDe(linha);
      if (autorFiltro === "automatico" && autor !== null) return false;
      if (autorFiltro && autorFiltro !== "automatico" && String(autor) !== autorFiltro) return false;
      const dia = chaveDia(linha.alterado_em);
      if (dataInicio && dia < dataInicio) return false;
      if (dataFim && dia > dataFim) return false;
      return true;
    });
  }, [historico, statusFiltro, autorFiltro, dataInicio, dataFim]);

  const gruposPorDia = useMemo(() => {
    const ordenado = [...historicoFiltrado].sort((a, b) =>
      (b.alterado_em ?? "").localeCompare(a.alterado_em ?? ""),
    );
    const grupos = new Map<string, HistoricoEntrada[]>();
    for (const linha of ordenado) {
      const chave = chaveDia(linha.alterado_em);
      const lista = grupos.get(chave) ?? [];
      lista.push(linha);
      grupos.set(chave, lista);
    }
    return [...grupos.entries()];
  }, [historicoFiltrado]);

  /* ───────────────────────────────────────  · a linha do tempo horizontal */

  /**
   * O evento em foco na régua: o que o painel abaixo mostra por inteiro.
   *
   * `null` enquanto ninguém clicou — aí vale o mais recente, calculado no
   * `focoEfetivo`. A aba nunca abre vazia: uma régua com um painel em branco
   * embaixo obrigaria a pessoa a adivinhar que é preciso clicar.
   */
  const [eventoEscolhido, setEventoEscolhido] = useState<string | null>(null);
  /** O evento sob o mouse (ou sob o foco do teclado), só para a espiada. */
  const [espiado, setEspiado] = useState<{ id: string; x: number; seta: number } | null>(
    null,
  );
  const reguaBlocoRef = useRef<HTMLDivElement | null>(null);
  const reguaViewportRef = useRef<HTMLDivElement | null>(null);
  const nosRef = useRef<(HTMLButtonElement | null)[]>([]);

  /**
   * ⭐ **A régua: um nó por EVENTO, posicionado pelo TEMPO e não pela ordem.**
   *
   * Duas decisões moram aqui, e as duas vieram de a primeira versão não ter
   * funcionado:
   *
   * 1. **Por evento, e não por dia.** Um nó por dia dizia "aqui houve três
   *    coisas" e escondia quais — a régua virava um índice de uma lista, e
   *    quem lia tinha de olhar para outro lugar. Cada marca agora É uma coisa
   *    que foi feita, com a cor da natureza dela.
   * 2. **Pelo tempo.** Numa lista, dois eventos do mesmo dia e dois separados
   *    por seis semanas ficam à mesma distância um do outro. Aqui a distância
   *    é o vão.
   *
   * 📐 Os eventos de um mesmo dia abrem em leque, com passo fixo: sem isso
   * eles cairiam exatamente no mesmo ponto e só o de cima seria clicável. O
   * vão entre DIAS é medido a partir do último nó do leque anterior, senão um
   * dia cheio invadiria o dia seguinte.
   */
  const regua = useMemo(() => {
    if (historicoFiltrado.length === 0) return null;
    // Do mais antigo para o mais recente: a régua corre da esquerda para a
    // direita, como qualquer linha do tempo. `gruposPorDia` vem ao contrário.
    const dias = [...gruposPorDia].reverse();
    const emMs = (chave: string) => {
      const [ano, mes, dia] = chave.split("-").map(Number);
      return new Date(ano, mes - 1, dia).getTime();
    };

    const nos: {
      id: string;
      dia: string;
      linha: HistoricoEntrada;
      x: number;
      largura: number;
      cor: string;
      rotulo: string;
      titulo: string;
      detalhe: string | null;
    }[] = [];
    let x = 0;

    for (let d = 0; d < dias.length; d++) {
      const [chave, linhasDoDia] = dias[d];
      if (d > 0) {
        const vaoDias = Math.round((emMs(chave) - emMs(dias[d - 1][0])) / MS_DIA);
        x += Math.min(VAO_MAX, Math.max(VAO_MIN, vaoDias * PX_POR_DIA));
      }
      // Dentro do dia, do mais cedo para o mais tarde. `gruposPorDia` guarda
      // cada dia em ordem decrescente, que é como a lista antiga lia.
      const doDia = [...linhasDoDia].reverse();
      for (let i = 0; i < doDia.length; i++) {
        const linha = doDia[i];
        if (i > 0) x += PASSO_LEQUE;
        const aparencia = descreverEvento(linha, projeto.escopos);
        nos.push({
          id: ancoraDe(linha),
          dia: chave,
          linha,
          x,
          // Entre dias a área clicável vale o alvo de toque inteiro; dentro do
          // leque ela vale o passo, para duas áreas não se sobreporem.
          largura: doDia.length > 1 ? PASSO_LEQUE : VAO_MIN,
          cor: aparencia.cor,
          rotulo: aparencia.rotulo,
          titulo: aparencia.titulo,
          detalhe: aparencia.detalhe,
        });
      }
    }

    const largura = x;
    const percentual = (px: number) => (largura === 0 ? 50 : (px / largura) * 100);

    // Os meses, embaixo do fio: sem escala, a régua mostraria que houve um vão
    // mas não de quanto. Um por mês, e só quando cabe sem colidir com o
    // anterior — dois rótulos sobrepostos são pior que nenhum.
    const meses: { chave: string; x: number; rotulo: string }[] = [];
    let ultimoRotuloX = -Infinity;
    let ultimoAno: number | null = null;
    for (const no of nos) {
      const [ano, mes] = no.dia.split("-").map(Number);
      const chaveMes = `${ano}-${mes}`;
      if (meses.some((m) => m.chave === chaveMes) || no.x - ultimoRotuloX < 56) continue;
      const nome = new Date(ano, mes - 1, 1)
        .toLocaleDateString("pt-BR", { month: "short" })
        .replace(".", "");
      meses.push({
        chave: chaveMes,
        x: no.x,
        // O ano só aparece quando vira: repetir "25" em todo mês é ruído, mas
        // um histórico que atravessa o ano-novo sem dizer isso mente.
        rotulo: ultimoAno !== null && ultimoAno !== ano ? `${nome} ${String(ano).slice(2)}` : nome,
      });
      ultimoRotuloX = no.x;
      ultimoAno = ano;
    }

    const vaoTotal = Math.round(
      (emMs(nos[nos.length - 1].dia) - emMs(nos[0].dia)) / MS_DIA,
    );

    return { nos, largura, percentual, meses, vaoTotal };
  }, [gruposPorDia, historicoFiltrado, projeto.escopos]);

  /**
   * Quem chega por `#justificativa-7` (o link "justificado" da aba Atrasos)
   * tem de cair com AQUELE registro aberto.
   *
   * 📐 Derivado durante o render, e não gravado por um efeito: o alvo já é
   * conhecido no primeiro render em que os dados existem, e um efeito só
   * atrasaria a escolha em um quadro — com o painel piscando o dia errado
   * antes de corrigir.
   */
  const ancoraDaUrl = location.hash.replace("#", "");

  /** O nó realmente em foco: o clicado, o da URL, ou o mais recente. */
  const focoEfetivo = useMemo(() => {
    if (!regua) return null;
    const porId = (id: string | null) => regua.nos.find((n) => n.id === id) ?? null;
    return (
      porId(eventoEscolhido) ?? porId(ancoraDaUrl) ?? regua.nos[regua.nos.length - 1] ?? null
    );
  }, [regua, eventoEscolhido, ancoraDaUrl]);

  const indiceFoco = regua && focoEfetivo ? regua.nos.indexOf(focoEfetivo) : 0;

  /** Os eventos do dia em foco, do mais recente para o mais antigo — é a ordem
   *  em que se lê "o que aconteceu neste dia". */
  const eventosDoDia = useMemo(() => {
    if (!focoEfetivo) return [];
    return gruposPorDia.find(([d]) => d === focoEfetivo.dia)?.[1] ?? [];
  }, [gruposPorDia, focoEfetivo]);

  function navegarRegua(e: React.KeyboardEvent) {
    if (!regua) return;
    const ultimo = regua.nos.length - 1;
    let destino: number | null = null;
    if (e.key === "ArrowRight") destino = Math.min(ultimo, indiceFoco + 1);
    else if (e.key === "ArrowLeft") destino = Math.max(0, indiceFoco - 1);
    else if (e.key === "Home") destino = 0;
    else if (e.key === "End") destino = ultimo;
    if (destino === null) return;
    e.preventDefault();
    setEventoEscolhido(regua.nos[destino].id);
    // `preventScroll`: quem centraliza o nó na régua é o efeito abaixo, e a
    // rolagem automática do foco brigaria com ele.
    nosRef.current[destino]?.focus({ preventScroll: true });
  }

  /** A posição do nó em pixels DENTRO do card, que é o que o pop-up precisa —
   *  ele mora fora da janela que rola, e portanto fora do sistema de
   *  coordenadas dela. */
  function espiar(indice: number, id: string) {
    const bloco = reguaBlocoRef.current;
    const botao = nosRef.current[indice];
    if (!bloco || !botao) return;
    const caixaNo = botao.getBoundingClientRect();
    const caixaBloco = bloco.getBoundingClientRect();
    const centro = caixaNo.left + caixaNo.width / 2 - caixaBloco.left;
    // Preso às bordas: um pop-up de 17rem centrado no primeiro nó vazaria o
    // card pela esquerda. `min` com a metade do bloco cobre a tela estreita
    // demais para 17rem, em que o cartão ocupa a largura inteira.
    const meio = Math.min(POPUP_MEIO, caixaBloco.width / 2);
    const x = Math.min(Math.max(centro, meio), Math.max(meio, caixaBloco.width - meio));
    setEspiado({
      id,
      x,
      // O quanto o cartão foi empurrado, para a seta desandar junto e
      // continuar apontando o nó. Presa a 14px das quinas, senão ela sai do
      // cartão e vira um losango solto.
      seta: Math.max(-(meio - 14), Math.min(meio - 14, centro - x)),
    });
  }

  // O nó em foco tem de estar VISÍVEL: numa régua que rola, ele pode estar
  // fora da janela quando se chega nele pelas setas ou por um link.
  useEffect(() => {
    const viewport = reguaViewportRef.current;
    const botao = nosRef.current[indiceFoco];
    if (!viewport || !botao) return;
    const caixaNo = botao.getBoundingClientRect();
    const caixaViewport = viewport.getBoundingClientRect();
    const desvio =
      caixaNo.left + caixaNo.width / 2 - (caixaViewport.left + caixaViewport.width / 2);
    if (Math.abs(desvio) < 1) return;
    viewport.scrollBy({ left: desvio, behavior: comportamentoDeRolagem() });
  }, [indiceFoco, regua]);

  /** O nó sob o mouse, resolvido a partir do id guardado na espiada. */
  const noEspiado = regua && espiado ? (regua.nos.find((n) => n.id === espiado.id) ?? null) : null;

  /**
   * Um evento aberto por inteiro, no painel do dia.
   *
   * 📐 Uma função, e não quatro ramos soltos dentro do JSX como era antes: o
   * painel é o único lugar onde um evento aparece completo, e é daqui que sai
   * o `id` que a aba Atrasos usa como âncora.
   */
  function renderEvento(linha: HistoricoEntrada) {
    const idAncora = ancoraDe(linha);

    if (linha.tipo === "justificativa_atraso") {
      const escopo = projeto.escopos.find((e) => e.id === linha.projeto_escopo_id);
      return (
        <HistoricoTimelineItem key={idAncora}>
          <HistoricoTimelineConteudo id={idAncora} $destaque $realcado={realcado === idAncora}>
            <HistoricoNotaLinha>
              <HistoricoNotaCabecalho>
                <HistoricoNotaTag>Justificativa de Atraso</HistoricoNotaTag>
                {(linha.motivo_tipo || escopo) && (
                  <HistoricoNotaMotivo>
                    {[
                      linha.motivo_tipo
                        ? (ROTULO_MOTIVO_ATRASO[linha.motivo_tipo] ?? linha.motivo_tipo)
                        : null,
                      escopo?.nome ?? null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </HistoricoNotaMotivo>
                )}
              </HistoricoNotaCabecalho>
              {/* `detalhe`, não `texto`. O backend unificou as cinco fontes do
                  histórico num envelope com `titulo`/`detalhe` prontos; o campo
                  `texto` parou de ser enviado e esta linha renderizava
                  `undefined`, a nota aparecia com autor e data, mas SEM o
                  motivo escrito. */}
              <HistoricoNotaTexto>{linha.detalhe}</HistoricoNotaTexto>
            </HistoricoNotaLinha>
            <HistoricoTimelineMeta>
              <HistoricoAutorChip>{nomeUsuario(linha.registrado_por)}</HistoricoAutorChip>
              <span>{formatarDataHora(linha.alterado_em)}</span>
              {podeExcluir && (
                <HistoricoExcluirBtn type="button" onClick={() => setExcluindo(linha)}>
                  Excluir
                </HistoricoExcluirBtn>
              )}
            </HistoricoTimelineMeta>
          </HistoricoTimelineConteudo>
        </HistoricoTimelineItem>
      );
    }

    if (linha.tipo === "banca_remarcada") {
      const escopo = projeto.escopos.find((e) => e.id === linha.projeto_escopo_id);
      return (
        <HistoricoTimelineItem key={idAncora}>
          <HistoricoTimelineConteudo id={idAncora} $destaque $realcado={realcado === idAncora}>
            <HistoricoNotaLinha>
              <HistoricoNotaCabecalho>
                <HistoricoNotaTag>Remarcação de Banca</HistoricoNotaTag>
                <HistoricoNotaMotivo>
                  {[
                    escopo?.nome ?? null,
                    `${formatarDataHora(linha.data_anterior)} → ${formatarDataHora(linha.data_nova)}`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </HistoricoNotaMotivo>
              </HistoricoNotaCabecalho>
              {/* Mesmo caso da justificativa de atraso acima: o campo virou
                  `detalhe` no envelope, e este lia o nome antigo. */}
              <HistoricoNotaTexto>{linha.detalhe}</HistoricoNotaTexto>
            </HistoricoNotaLinha>
            <HistoricoTimelineMeta>
              <HistoricoAutorChip>
                {linha.registrado_por ? nomeUsuario(linha.registrado_por) : "Automático"}
              </HistoricoAutorChip>
              <span>{formatarDataHora(linha.alterado_em)}</span>
              {podeExcluir && (
                <HistoricoExcluirBtn type="button" onClick={() => setExcluindo(linha)}>
                  Excluir
                </HistoricoExcluirBtn>
              )}
            </HistoricoTimelineMeta>
          </HistoricoTimelineConteudo>
        </HistoricoTimelineItem>
      );
    }

    if (linha.tipo === "status") {
      const tonsNovo = tonsDaColuna(CORES_STATUS[linha.status_novo]);
      return (
        <HistoricoTimelineItem key={idAncora}>
          <HistoricoTimelineConteudo id={idAncora}>
            <HistoricoTimelineTransicao>
              {linha.status_anterior && (
                <>
                  <StatusPilula $cor={tonsDaColuna(CORES_STATUS[linha.status_anterior])}>
                    <Ponto $cor={tonsDaColuna(CORES_STATUS[linha.status_anterior]).ponto} />
                    {ROTULO_STATUS[linha.status_anterior]}
                  </StatusPilula>
                  <span>→</span>
                </>
              )}
              <StatusPilula $cor={tonsNovo}>
                <Ponto $cor={tonsNovo.ponto} />
                {ROTULO_STATUS[linha.status_novo]}
              </StatusPilula>
              {!linha.status_anterior && <span>· projeto criado</span>}
            </HistoricoTimelineTransicao>
            <HistoricoTimelineMeta>
              <HistoricoAutorChip>
                {linha.alterado_por ? nomeUsuario(linha.alterado_por) : "Automático"}
              </HistoricoAutorChip>
              <span>{formatarDataHora(linha.alterado_em)}</span>
            </HistoricoTimelineMeta>
          </HistoricoTimelineConteudo>
        </HistoricoTimelineItem>
      );
    }

    // Toda linha que não é transição de status é desenhada aqui, a partir do
    // `titulo`/`detalhe` que o backend manda pronto, o que deixa uma fonte
    // nova aparecer sem a tela saber nada sobre ela. A ETIQUETA é o que dá
    // leitura: sem ela, seis naturezas de evento viravam seis frases soltas e
    // indistinguíveis.
    const aparencia = descreverEvento(linha, projeto.escopos);
    return (
      <HistoricoTimelineItem key={idAncora}>
        <HistoricoTimelineConteudo id={idAncora} $destaque $realcado={realcado === idAncora}>
          <HistoricoNotaLinha>
            <HistoricoNotaCabecalho>
              {/* A cor vive só na ETIQUETA. A moldura do cartão fica neutra de
                  propósito: com seis naturezas de evento, colorir também a
                  borda enchia o painel de vermelho e verde e tudo passava a
                  parecer alerta. Um acento por linha basta. */}
              <HistoricoTipoTag $cor={aparencia.cor}>{aparencia.rotulo}</HistoricoTipoTag>
              <HistoricoNotaMotivo>{aparencia.titulo}</HistoricoNotaMotivo>
              {linha.tipo === "pedido_de_dias" && linha.aguardando && (
                <HistoricoAguardando>aguardando a diretoria</HistoricoAguardando>
              )}
            </HistoricoNotaCabecalho>
            {aparencia.detalhe && <HistoricoNotaTexto>{aparencia.detalhe}</HistoricoNotaTexto>}
          </HistoricoNotaLinha>
          <HistoricoTimelineMeta>
            <HistoricoAutorChip>
              {linha.alterado_por ? nomeUsuario(linha.alterado_por) : "Automático"}
            </HistoricoAutorChip>
            <span>{formatarDataHora(linha.alterado_em)}</span>
          </HistoricoTimelineMeta>
        </HistoricoTimelineConteudo>
      </HistoricoTimelineItem>
    );
  }

  if (erro) {
    return (
      <ErrorBlock>
        <ErrorText>Não foi possível carregar o histórico: {erro}</ErrorText>
        <PageButton $variant="outline" onClick={carregar}>
          Tentar novamente
        </PageButton>
      </ErrorBlock>
    );
  }

  if (carregando) return <PageLoadingBlock />;

  if (historico.length === 0) {
    return (
      <PageStack>
        {projeto.historico_oculto_ate && (
          <AvisoBanner>
            Histórico anterior a {formatarDataHora(projeto.historico_oculto_ate)} está oculto.
            <PageButton type="button" $variant="outline" disabled={mostrandoTudo} onClick={mostrarTudo}>
              {mostrandoTudo ? "Mostrando…" : "Mostrar tudo"}
            </PageButton>
          </AvisoBanner>
        )}
        {/* Oculto e vazio são causas diferentes, e pedem reações diferentes:
            uma se desfaz num clique ali em cima, a outra é só esperar o
            projeto andar. */}
        {projeto.historico_oculto_ate ? (
          <EstadoVazio
            causa="filtro"
            titulo="Nada à vista no histórico"
            motivo={'O corte de exibição escondeu tudo. Use "Mostrar tudo" acima para trazer de volta.'}
          />
        ) : (
          <EstadoVazio
            causa="vazio"
            titulo="Nenhuma mudança registrada"
            motivo="As mudanças de etapa, notas de atraso, bancas e reuniões deste projeto aparecem aqui conforme acontecem."
          />
        )}
      </PageStack>
    );
  }

  return (
    <PageStack>
      {projeto.historico_oculto_ate && (
        <AvisoBanner>
          Histórico anterior a {formatarDataHora(projeto.historico_oculto_ate)} está oculto.
          <PageButton type="button" $variant="outline" disabled={mostrandoTudo} onClick={mostrarTudo}>
            {mostrandoTudo ? "Mostrando…" : "Mostrar tudo"}
          </PageButton>
        </AvisoBanner>
      )}

      {/* ⭐ O resumo virou UMA faixa empilhada, horizontal, no topo. Era um
          card lateral de 320px num grid de duas colunas, e a timeline — o
          conteúdo real da aba — ficava espremida na coluna que sobrava.
          A pergunta que este bloco responde ("onde o tempo foi") é de
          proporção, e proporção se lê melhor numa faixa só. */}
      {resumoPorStatus.length > 0 && (
        <PageCard>
          <PageCardHeader>
            <PageCardTitle>Tempo por etapa</PageCardTitle>
          </PageCardHeader>
          <PageCardContent>
            <HistoricoResumoFaixa
              role="img"
              aria-label={`Tempo por etapa: ${resumoPorStatus
                .map((r) => `${ROTULO_STATUS[r.status]}, ${formatarDuracao(r.ms)}`)
                .join("; ")}`}
            >
              {resumoPorStatus.map(({ status, percent }) => (
                <HistoricoResumoSegmento
                  key={status}
                  $percent={percent}
                  $cor={tonsDaColuna(CORES_STATUS[status]).ponto}
                  title={`${ROTULO_STATUS[status]} · ${Math.round(percent)}%`}
                />
              ))}
            </HistoricoResumoFaixa>
            {/* ⚠ A legenda não é enfeite: é ela que carrega nome e duração.
                A faixa sozinha diria tudo por cor, e cor não pode ser o
                único indicador. */}
            <HistoricoResumoLegenda>
              {resumoPorStatus.map(({ status, ms }) => (
                <HistoricoResumoLegendaItem key={status}>
                  <Ponto $cor={tonsDaColuna(CORES_STATUS[status]).ponto} />
                  <strong>{ROTULO_STATUS[status]}</strong>
                  {formatarDuracao(ms)}
                </HistoricoResumoLegendaItem>
              ))}
            </HistoricoResumoLegenda>
          </PageCardContent>
        </PageCard>
      )}

      <div>
        <HistoricoFiltros
          statusPresentes={statusPresentes}
          statusFiltro={statusFiltro}
          onAlternarStatus={alternarStatusFiltro}
          autoresPresentes={autoresPresentes}
          nomeUsuario={nomeUsuario}
          temAutomatico={temAutomatico}
          autorFiltro={autorFiltro}
          onAutorFiltro={setAutorFiltro}
          periodoRapido={periodoRapido}
          onPeriodoRapido={aplicarPeriodoRapido}
          dataInicio={dataInicio}
          dataFim={dataFim}
          onDataManual={editarDataManual}
          filtroAtivo={filtroAtivo}
          onLimpar={limparFiltros}
        />

        {/* ⭐ **A linha do tempo, deitada, e agora sozinha.**
            A lista vertical que ficava aqui embaixo saiu: eram duas linhas do
            tempo na mesma tela, e a de cima não passava de um índice da de
            baixo. Cada marca é um evento, à distância que os dias de verdade
            puseram entre eles; o mouse espia, o clique abre. */}
        {regua && focoEfetivo ? (
          <PageCard>
            <PageCardContent>
              <HistoricoReguaCabecalho>
                <PageCardTitle as="h3">Linha do tempo</PageCardTitle>
                <HistoricoReguaResumo>
                  {rotuloCurtoDia(regua.nos[0].dia)} →{" "}
                  {rotuloCurtoDia(regua.nos[regua.nos.length - 1].dia)}
                  {" · "}
                  {regua.vaoTotal} {regua.vaoTotal === 1 ? "dia" : "dias"}
                  {" · "}
                  {regua.nos.length} {regua.nos.length === 1 ? "registro" : "registros"}
                </HistoricoReguaResumo>
              </HistoricoReguaCabecalho>

              <HistoricoReguaBloco ref={reguaBlocoRef}>
                <HistoricoReguaViewport
                  ref={reguaViewportRef}
                  onMouseLeave={() => setEspiado(null)}
                >
                  <HistoricoReguaPista $largura={regua.largura}>
                    {/* As setas andam pela régua; o Tab passa por ela de uma
                        vez. Uma parada de Tab por evento seria a própria
                        definição de armadilha de teclado. */}
                    <HistoricoReguaEixo
                      role="group"
                      aria-label="Linha do tempo do histórico. Use as setas para percorrer os eventos."
                      onKeyDown={navegarRegua}
                    >
                      {regua.meses.map((mes) => (
                        <HistoricoReguaMes key={mes.chave} $x={regua.percentual(mes.x)} aria-hidden>
                          {mes.rotulo}
                        </HistoricoReguaMes>
                      ))}

                      {regua.nos.map((no, i) => (
                        <HistoricoReguaNo
                          key={no.id}
                          ref={(el) => {
                            nosRef.current[i] = el;
                          }}
                          type="button"
                          $x={regua.percentual(no.x)}
                          $largura={no.largura}
                          $tamanho={no.id === focoEfetivo.id ? 12 : 10}
                          $cor={no.cor}
                          // O dia INTEIRO se acende, não só o evento clicado:
                          // é o dia que o painel abriu, e ver o leque aceso diz
                          // de onde veio o que está escrito embaixo.
                          $ativo={no.dia === focoEfetivo.dia}
                          tabIndex={i === indiceFoco ? 0 : -1}
                          aria-pressed={no.id === focoEfetivo.id}
                          aria-label={`${no.rotulo}: ${no.titulo} · ${rotuloCurtoDia(no.dia)}`}
                          onClick={() => setEventoEscolhido(no.id)}
                          onMouseEnter={() => espiar(i, no.id)}
                          onFocus={() => espiar(i, no.id)}
                          onBlur={() => setEspiado(null)}
                        />
                      ))}
                    </HistoricoReguaEixo>
                  </HistoricoReguaPista>
                </HistoricoReguaViewport>

                {/* ⭐ A espiada. `role="status"` para o leitor de tela anunciar
                    o que o foco acabou de encontrar, já que o pop-up aparece
                    sem que ninguém tenha pedido. */}
                {noEspiado && espiado && (
                  <HistoricoReguaPopup
                    $x={espiado.x}
                    $seta={espiado.seta}
                    $cor={noEspiado.cor}
                    role="status"
                  >
                    <HistoricoNotaCabecalho>
                      <HistoricoTipoTag $cor={noEspiado.cor}>{noEspiado.rotulo}</HistoricoTipoTag>
                      <HistoricoNotaMotivo>
                        {formatarDataHora(noEspiado.linha.alterado_em)}
                      </HistoricoNotaMotivo>
                    </HistoricoNotaCabecalho>
                    <HistoricoReguaPopupTitulo>{noEspiado.titulo}</HistoricoReguaPopupTitulo>
                    {noEspiado.detalhe && (
                      <HistoricoReguaPopupTexto>{noEspiado.detalhe}</HistoricoReguaPopupTexto>
                    )}
                  </HistoricoReguaPopup>
                )}
              </HistoricoReguaBloco>

              {/* O dia que o clique abriu, por inteiro: texto completo, autor,
                  e o Excluir — coisas que não cabem, e não devem caber, num
                  pop-up que some quando o mouse anda. */}
              <HistoricoPainelDia>
                <HistoricoTimelineDiaTitulo $ativo>
                  {rotuloDia(focoEfetivo.linha.alterado_em)}
                </HistoricoTimelineDiaTitulo>
                {eventosDoDia.map(renderEvento)}
                <HistoricoPainelDica>
                  {regua.nos.length > 1
                    ? "Passe o mouse por uma marca da linha do tempo para espiar, clique para abrir o dia."
                    : "Este é o único registro do recorte atual."}
                </HistoricoPainelDica>
              </HistoricoPainelDia>
            </PageCardContent>
          </PageCard>
        ) : (
          <EstadoVazio
            causa="filtro"
            titulo="Nenhuma mudança bate com esses filtros"
            motivo={'O histórico tem registros, o recorte atual é que não alcança nenhum. Use "Limpar filtros" acima para ver tudo de novo.'}
          />
        )}

        {/* ⚠ "Limpar histórico" vivia no cabeçalho do card de Filtros, ao lado
            de controles que só mudam o que se VÊ — vizinhança que sugeria que
            ela também fosse só de exibição. Aqui embaixo, depois de tudo que
            ela afeta, e só para quem pode. */}
        {podeExcluir && (
          <HistoricoRodape>
            <PageButton type="button" $variant="ghost" onClick={() => setConfirmandoLimpar(true)}>
              Limpar histórico
            </PageButton>
          </HistoricoRodape>
        )}
      </div>

      {excluindo && (
        <ConfirmarModal
          titulo={excluindo.tipo === "justificativa_atraso" ? "Excluir justificativa" : "Excluir remarcação"}
          mensagem="Isso apaga o registro do histórico do projeto. Não dá pra desfazer."
          onConfirmar={() => excluir(excluindo)}
          onCancelar={() => setExcluindo(null)}
        />
      )}

      {confirmandoLimpar && (
        <ConfirmarModal
          titulo="Limpar histórico"
          mensagem={
            <>
              As mudanças de status de até agora saem da timeline. Nada é apagado de verdade: elas
              continuam contando pros dias já usados pelos escopos deste projeto, só não aparecem mais
              aqui. Dá pra trazer tudo de volta depois, em "Mostrar tudo".
            </>
          }
          rotuloConfirmar="Limpar"
          onCancelar={() => setConfirmandoLimpar(false)}
          onConfirmar={limparHistorico}
        />
      )}
    </PageStack>
  );
}
