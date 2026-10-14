import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ehDiretoriaDeProjetos } from "@/utils/permissoes";
import {
  Pencil,
  Plus,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
// `oficializarCronograma` e `pedirDiasDeAjuste` CONVIVEM, apesar de terem se
// cruzado no merge: o primeiro só carimba a data (, informativo) e o
// segundo estica a janela (, passa pela diretoria). Nenhum consulta o outro.
import {
  createEtapa,
  definirEntregaPlanejada,
  deleteEtapa,
  editarEtapa,
  getCronograma,
  getRascunhos,
  salvarRascunhos,
  type RascunhoEtapa,
  moverEtapa,
  oficializarCronograma,
  ajustarJanelaManual,
  pedirDiasDeAjuste,
} from "@/lib/cronograma";
import {
  formatarData,
  marcarBancaDoEscopo,
  marcarEntregaEscopo,
  marcarKickoff,
  paraDataUtc,
} from "@/lib/projetos";
import { createReuniao, deleteReuniao, updateReuniao } from "@/lib/tarefas";
import { chaveData } from "@/components/calendario/semanas";
import {
  corPeriodoEscopo,
  corSugerida,
  COR_AMBIENTACAO,
  COR_PAUSA,
  ROTULOS_MARCO,
} from "@/components/cronograma-pintado/cores";
import { exportarPDF, exportarPNG } from "@/components/cronograma-pintado/exportar";
import {
  diasDoIntervalo,
  PaintedCalendar,
  type FaixaDerivada,
  type MarcoRenderizavel,
} from "@/components/cronograma-pintado/PaintedCalendar";
import {
  Amostra,
  AmostraHachurada,
  AvisoEscopo,
  AreaExportOculta,
  BotaoEditarEtapa,
  BotaoExcluir,
  BarraDesfazer,
  BotaoDesfazer,
  ContagemDesfazer,
  CronogramaLayout,
  MolduraExport,
  LegendaBox,
  LegendaGrupo,
  LegendaItem,
  LegendaLinha,
  LegendaNovaEtapa,
  LegendaTexto,
  LegendaTitulo,
  TagCorrecao,
} from "@/components/cronograma-pintado/PaintedCalendar.styled";
import {
  ancorar,
  avancar,
  blocosDaVisao,
  blocosDosMeses,
  intervaloDaVisao,
  mesesDaJanela,
  normalizar,
  type Visao,
} from "@/components/cronograma-pintado/visao";
import type { CronogramaResposta } from "@/types/cronograma";
import type { EscopoVendido } from "@/types/projeto";
import {
  PageStack,
  PageButton,
  PageLoadingBlock,
  ErrorBlock,
  ErrorText,
  EmptyText,
} from "@/styles/page.styled";
import { AvisoBanner } from "./Projetos.styled";
import { ConfirmarModal } from "@/components/ConfirmarModal";
import {
  planejarEscrita,
  subtrairTrecho,
  unirTrechos,
} from "@/components/cronograma-pintado/trechos";
import { ExportarPdfModal } from "./ExportarPdfModal";
import { NovaEtapaModal } from "./NovaEtapaModal";
import { MarcarBancaModal } from "./MarcarBancaModal";
import { MarcarEntregaModal } from "./MarcarEntregaModal";
import { AjudaCronogramaModal } from "./AjudaCronogramaModal";
import { AjusteJanelaModal } from "./AjusteJanelaModal";
import { AvisoRegra } from "@/components/AvisoRegra";
import { MarcarReuniaoModal } from "./MarcarReuniaoModal";
import { BancaDetalhesModal } from "./BancaDetalhesModal";
import { PedirDiasModal } from "./PedirDiasModal";
import { CronogramaBarra } from "./CronogramaBarra";
import { useProjeto } from "./ProjetoPage";


/**
 * Os modos de marcação, o que transforma esta aba no painel único de datas
 * do projeto.
 *
 * `escopo: true` quer dizer que o modo precisa de um escopo escolhido na
 * barra: a reunião inicial abre a janela DE UM escopo, e banca e entrega são
 * dele. A reunião geral é do projeto e funciona também na visão Geral.
 */
const MODOS = [
  { valor: "kickoff", rotulo: "Kickoff", escopo: false },
  { valor: "reuniao_inicial", rotulo: "Reunião inicial", escopo: true },
  { valor: "reuniao_geral", rotulo: "Reunião semanal", escopo: false },
  { valor: "banca", rotulo: "Banca", escopo: true },
  // UMA entrega só: entrega do escopo **é** a entrega ao cliente daquele
  // escopo. Havia aqui um modo "Entrega ao cliente" separado, do
  // projeto, duas datas para a mesma promessa, que divergiam no primeiro
  // reagendamento.
  { valor: "entrega", rotulo: "Entrega", escopo: true },
] as const;

type ModoMarcacao = (typeof MODOS)[number]["valor"] | null;

/** "2026-07-14" -> "14/07". O ano é ruído numa legenda de um semestre só. */
function semAno(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
}

/** Hoje em `yyyy-MM-dd` local, o formato de todas as datas desta tela. */
function hojeIso(): string {
  const agora = new Date();
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  const dia = String(agora.getDate()).padStart(2, "0");
  return `${agora.getFullYear()}-${mes}-${dia}`;
}


/**
 * ⭐ Um período por BANCA REALIZADA — e o rótulo que o retrabalho dela recebe.
 *
 * ⚠ **Correção ≠ ajuste, e o resultado da banca é que separa os dois.**
 *
 * - banca **reprovada** → o que vem depois é **correção**, e numerada: o time
 *   está consertando o que aquela banca apontou. "correção 1" e "correção 2"
 *   contam a história de um escopo que precisou de duas tentativas.
 * - banca **aprovada** → o trabalho passou; o que vem depois são **ajustes**
 *   finos antes de entregar ao cliente, não conserto de reprovação.
 *
 * Chamar tudo de "correção" acusava de reprovação um escopo que passou de
 * primeira, e um único rótulo não distinguia o retrabalho da 1ª banca do da 2ª.
 *
 * ⚠ Sem veredito ainda, o rótulo é "ajustes": é o neutro. "correção" afirmaria
 * uma reprovação que ninguém decidiu.
 *
 * Cada período vai do dia SEGUINTE à realização até a véspera da próxima
 * (a última fica aberta). O dia da banca é dela, não do conserto que ela pediu.
 */
interface PeriodoPosBanca {
  /** `yyyy-MM-dd` — o primeiro dia que já é retrabalho. */
  inicio: string;
  /** `yyyy-MM-dd` da próxima banca, ou `null` na última (fica aberta). */
  fim: string | null;
  rotulo: string;
}

function derivarPeriodosPosBanca(escopo: EscopoVendido): PeriodoPosBanca[] {
  const sessoes = escopo.banca?.sessoes ?? [];
  const realizadas = sessoes
    .filter((s) => s.realizado_em)
    .map((s) => ({ dia: s.realizado_em!.slice(0, 10), resultado: s.resultado }))
    .sort((a, b) => a.dia.localeCompare(b.dia));

  // Banca anterior a `banca_sessao`, ou escopo antigo entregue sem registro de
  // realização: cai na régua de sempre, com o rótulo genérico.
  if (realizadas.length === 0) {
    const marco = escopo.banca?.realizado_em?.slice(0, 10) ?? escopo.data_entrega_real?.slice(0, 10);
    return marco ? [{ inicio: marco, fim: null, rotulo: "correção" }] : [];
  }

  return realizadas.map((r, i) => ({
    inicio: r.dia,
    fim: realizadas[i + 1]?.dia ?? null,
    // Sem numeração: o que importa é a NATUREZA do retrabalho, não a ordem.
    // "correção 1" e "correção 2" faziam a legenda parecer um índice, e o
    // número já está no calendário — a banca que o precede tem marcação
    // própria no dia.
    rotulo: r.resultado === "nao_aprovada" ? "correção" : "ajustes",
  }));
}

/** O período em que este trecho TERMINA — `null` se ele acabou antes de
 *  qualquer banca, ou seja, ainda é trabalho vendido. */
function periodoDoTrecho(periodos: PeriodoPosBanca[], dataFim: string): PeriodoPosBanca | null {
  // De trás para frente: o trecho pertence ao último período que ele alcança.
  for (let i = periodos.length - 1; i >= 0; i--) {
    if (dataFim > periodos[i].inicio) return periodos[i];
  }
  return null;
}

/**
 * O começo e o fim de uma etapa inteira, com quantos pedaços ela tiver.
 *
 * Os trechos já chegam ordenados por `data_inicio` (ver `grupos`), então o
 * começo é o do primeiro. O fim ainda sai de um máximo: um trecho que começa
 * depois pode terminar antes, e o intervalo precisa cobrir o ponto mais
 * distante, não o último da lista.
 *
 * Mora aqui fora porque a legenda da tela e a do PDF chegaram às duas na mesma
 * pergunta, e um `reduce` copiado nos dois lugares é convite a consertar só um
 * deles da próxima vez.
 */
function intervaloDaEtapa(trechos: { data_inicio: string; data_fim: string }[]) {
  if (trechos.length === 0) return null;
  return {
    inicio: trechos[0].data_inicio,
    fim: trechos.reduce(
      (maior, t) => (t.data_fim > maior ? t.data_fim : maior),
      trechos[0].data_fim,
    ),
  };
}

export function ProjetoCronograma() {
  // `recarregar` do shell: kickoff e entrega ao cliente moram no PROJETO, e
  // sem ele o cabeçalho e a Visão geral ficariam com a data velha.
  const { projeto, frentes, recarregar: recarregarProjeto } = useProjeto();
  const nomeFrente = (frenteId: number) =>
    frentes.find((f) => f.id === frenteId)?.nome ?? `Frente ${frenteId}`;
  const { usuario, token } = useAuth();
  const areaExport = useRef<HTMLDivElement>(null);

  const [dados, setDados] = useState<CronogramaResposta | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");

  /**
   * ⭐ **O atalho das Pendências** — `?marcar=banca&escopo=12`.
   *
   * A Visão geral sabe exatamente o que falta e em qual escopo; sem isto, ela
   * despejava a pessoa na aba e a fazia refazer à mão as duas escolhas que a
   * pendência já tinha dito (o escopo na barra, o modo em MARCAR) antes de
   * poder clicar no dia. Com o atalho, o clique no dia é o próximo gesto.
   *
   * Os parâmetros são consumidos UMA vez, no estado inicial, e apagados da URL
   * logo em seguida: eles são um empurrão, não estado da tela. Deixá-los lá
   * faria o F5 (ou o voltar do navegador) rearmar um modo de marcação que a
   * pessoa já tinha desligado no Esc.
   */
  const [params, setParams] = useSearchParams();
  useEffect(() => {
    if (!params.has("marcar") && !params.has("escopo")) return;
    const limpo = new URLSearchParams(params);
    limpo.delete("marcar");
    limpo.delete("escopo");
    setParams(limpo, { replace: true });
    // Só na montagem: `params` muda por causa deste próprio efeito.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * O escopo em foco, ou "geral" para o projeto inteiro.
   *
   * Geral não é só um filtro solto: ele é a visão consolidada, junta etapas,
   * marcos, entregas e os dias não úteis de TODAS as frentes. Abre nele porque
   * "como está o cronograma?" é a pergunta de quem chega; editar é ação
   * deliberada de quem escolhe um escopo.
   */
  /** O escopo que o atalho pediu, guardado porque a URL é limpa logo em
   *  seguida — `carregar` ainda precisa dele para conferir se existe. */
  const [escopoPedido] = useState<number | null>(() => {
    const pedido = Number(params.get("escopo"));
    return Number.isInteger(pedido) && pedido > 0 ? pedido : null;
  });
  const [escopoSelecionado, setEscopoSelecionado] = useState<number | "geral">(
    escopoPedido ?? "geral",
  );

  /**
   * A última marcação, enquanto ela ainda pode ser desfeita.
   *
   * Só existe quando há PARA ONDE voltar. Kickoff, banca e entrega não
   * aceitam data vazia na API (`data_kickoff: date`, não `Optional`), então
   * marcar a primeira vez é irreversível, e oferecer um "desfazer" que
   * falharia seria pior que não oferecer.
   */
  const [desfazer, setDesfazer] = useState<{
    rotulo: string;
    acao: () => Promise<unknown>;
    ate: number;
  } | null>(null);
  const [restam, setRestam] = useState(0);
  const [ajudaAberta, setAjudaAberta] = useState(false);
  const [grupoAtivo, setGrupoAtivo] = useState<string | null>(null);
  const [previewIntervalo, setPreviewIntervalo] = useState<{ inicio: string; fim: string } | null>(
    null,
  );
  // Mês é o default: é o formato canônico. Dia e semana são lentes de
  // detalhe. `referencia` é o período em foco; `null` até a janela chegar.
  const [visao, setVisao] = useState<Visao>("mes");
  const [referencia, setReferencia] = useState<Date | null>(null);
  /**
   * O escopo em que a etapa nova vai nascer, ou `null` com o modal fechado.
   *
   * São DOIS botões de criar, e por isso o estado não é um booleano:
   *
   * - o da legenda mora dentro do grupo de um escopo, e o lugar do clique já
   *   responde qual é — vai o id;
   * - o da barra fica encostado no fim da lista de escopos e segue o que está
   *   selecionado ali; em "Todos os escopos" não há um selecionado, e aí vai
   *   `"perguntar"`, que é o que faz o campo de escopo reaparecer no modal.
   */
  const [criandoEtapa, setCriandoEtapa] = useState<number | "perguntar" | null>(null);
  const [confirmandoOficializacao, setConfirmandoOficializacao] = useState(false);
  /**
   * o pedido de dias em preenchimento, com o que o CALENDÁRIO já disse.
   *
   * Não é um booleano porque o pedido não nasce mais de um formulário em
   * branco: o coordenador arrasta a etapa além da janela e o excedente do
   * gesto já chega aqui como `dias` e `ateDia`. O botão da barra continua
   * abrindo o mesmo modal, só que sem seleção (`ateDia: null`), é a porta de
   * quem prefere digitar o número.
   *
   * Guarda o `escopoId` em vez de depender do escopo selecionado na barra: na
   * visão Geral dá para pintar a etapa de um escopo sem que ele seja o
   * escolhido, e o pedido é sempre do escopo da ETAPA que foi arrastada.
   */
  const [pedindoDias, setPedindoDias] = useState<{
    escopoId: number;
    dias: number;
    /** O último dia útil alcançado no arrasto; `null` quando veio do botão. */
    ateDia: string | null;
  } | null>(null);
  /**
   * O modo de marcação ativo, o que faz desta aba o **painel único de
   * datas** do projeto. Com um modo ligado, clicar num dia crava aquela
   * data em vez de pintar etapa.
   *
   * `null` = o comportamento de sempre (pintar com o pincel). Ligar um modo
   * desliga o pincel, e vice-versa: os dois usam o mesmo clique, e deixá-los
   * ligados juntos faria o gesto ser ambíguo.
   *
   * Nasce ligado quando as Pendências mandaram `?marcar=` (ver acima). O valor
   * é conferido contra `MODOS` em vez de sofrer um cast: a URL é digitável, e
   * um `?marcar=qualquercoisa` deixaria a tela num modo que não existe.
   */
  const [modoMarcacao, setModoMarcacao] = useState<ModoMarcacao>(() => {
    const pedido = params.get("marcar");
    return MODOS.some((m) => m.valor === pedido) ? (pedido as ModoMarcacao) : null;
  });
  /** A banca cuja ficha está aberta, o clique no marco do calendário. */
  const [bancaAberta, setBancaAberta] = useState<number | null>(null);
  const [remarcando, setRemarcando] = useState<{ dia: string; escopoId: number } | null>(null);
  /** A reunião sendo marcada ou editada pelo calendário. */
  const [reuniaoAberta, setReuniaoAberta] = useState<{
    dia: string;
    tipo: "inicial" | "geral";
    escopoId: number | null;
    reuniaoId: number | null;
    observacoes: string | null;
  } | null>(null);
/**
   * A entrega sendo registrada ou alterada pelo calendário.
   *
   * Diferente da banca, ela **não** precisa caber na janela do escopo: a
   * janela é o tempo de TRABALHO vendido, e a apresentação ao cliente costuma
   * acontecer dias depois da banca.
   */
  const [entregaAberta, setEntregaAberta] = useState<{ dia: string; escopoId: number } | null>(
    null,
  );
  /** O kickoff sendo marcado pelo calendário, confirma antes por causa da ambientação. */
  const [kickoffAberto, setKickoffAberto] = useState<string | null>(null);
  /**
   * Etapas com nome e cor mas ainda sem trecho: não existem no banco, porque
   * `cronograma_etapa` exige datas.
   *
   * ⚠ Elas nascem do `localStorage` e voltam para lá a cada mudança. Antes
   * viviam só em memória, e apagar o último dia de uma etapa a fazia sumir de
   * vez no primeiro F5 — que é o que `getRascunhos` explica por inteiro.
   */
  const [rascunhos, setRascunhos] = useState<RascunhoEtapa[]>(() => getRascunhos(projeto.id));
  useEffect(() => {
    salvarRascunhos(projeto.id, rascunhos);
  }, [projeto.id, rascunhos]);
  /**
   * ⭐ **O que a pincelada acabou de desenhar, antes de o servidor confirmar.**
   *
   * ⚠ Pintar era uma espera visível: o gesto disparava de uma a três
   * requisições EM SÉRIE (mover, criar, apagar os trechos que sobraram) e só
   * então recarregava o cronograma inteiro e o projeto. Até tudo isso voltar,
   * a célula continuava do jeito que estava — a pessoa via o próprio arrasto
   * sumir e reaparecer segundos depois, e não tinha como saber se tinha dado
   * certo.
   *
   * Aqui o resultado do gesto entra na lista de etapas na hora, como se já
   * estivesse gravado, e sai quando a resposta de verdade chega. Se a
   * gravação falhar, `carregar()` traz o estado real e desfaz o desenho —
   * o aviso de erro explica o resto.
   */
  const [pinturaOtimista, setPinturaOtimista] = useState<{
    chave: string;
    escopoId: number;
    escopoNome: string;
    nome: string;
    cor: string;
    ordem: number;
    trechos: { inicio: string; fim: string }[];
  } | null>(null);
  const [exportandoPdf, setExportandoPdf] = useState(false);
  /** Enquanto não é `null`, a cópia fora da tela está montada com estes meses. */
  const [mesesExport, setMesesExport] = useState<Date[] | null>(null);
  /** O escopo escolhido no modal de export, independente do que está na tela. */
  const [escopoExport, setEscopoExport] = useState<number | "geral">("geral");
  const [etapaParaExcluir, setEtapaParaExcluir] = useState<{
    chave: string;
    nome: string;
    trechos: number;
  } | null>(null);
  /**
   * A etapa aberta no modal de edição, ou `null` com ele fechado.
   *
   * ⚠ Guarda a CHAVE, e não o objeto do grupo: `grupos` é recalculado a cada
   * pincelada, e uma cópia velha do grupo mandaria o PATCH para trechos que
   * podem já ter sido divididos ou apagados no meio do caminho.
   */
  const [etapaParaEditar, setEtapaParaEditar] = useState<{
    chave: string;
    nome: string;
    cor: string;
    escopoId: number;
  } | null>(null);
  /** O escopo cuja janela a diretoria está ajustando, ou `null`. */
  const [ajustandoJanela, setAjustandoJanela] = useState<number | null>(null);

  const podeEditar = !!usuario?.permissoes.pode_definir_cronograma;
  const ehDiretor = ehDiretoriaDeProjetos(usuario);
  const souCoordenador = projeto.equipe.some(
    (m) => m.usuario_id === usuario?.id && m.papel === "coordenador",
  );
  /**
   * Quem pede dias de ajuste (§8): o COORDENADOR deste projeto ou a DIRETORIA
   * DE PROJETOS (2026-08-31, a pedido — ela enxerga o portfólio inteiro e pede
   * sem estar na equipe).
   *
   * ⚠ Espelha `_exigir_quem_pode` do backend, e existe uma vez só porque a
   * regra vale em dois lugares desta tela: o botão da barra e o arrasto para
   * além da janela (`diasNegociaveis`). Mostrar para gerente ou consultor
   * entregaria um 422 depois de preencher o formulário.
   */
  const podePedirDiasDeAjuste = souCoordenador || ehDiretor;

  const carregar = useCallback(async () => {
    if (!token) return;
    setErro("");
    try {
      const resposta = await getCronograma(projeto.id, token);
      setDados(resposta);
      // Um rascunho que já virou etapa de verdade (alguém pintou nela de outro
      // navegador, ou nesta mesma aba antes de um reload) não tem mais razão
      // de existir no disco. Sem esta limpeza ele fica lá para sempre —
      // inofensivo na tela, porque cai no mesmo grupo, mas lixo mesmo assim.
      const gravadas = new Set(
        resposta.escopos.flatMap((e) =>
          (e.etapas ?? []).map((et) => `${e.id}|${et.nome}|${et.cor}`),
        ),
      );
      setRascunhos((atual) => {
        const sobrando = atual.filter((r) => !gravadas.has(`${r.escopoId}|${r.nome}|${r.cor}`));
        return sobrando.length === atual.length ? atual : sobrando;
      });
      // Ancora aqui, e não num efeito: o efeito seria um setState em cascata
      // logo após o render (react-hooks/set-state-in-effect). Abrimos no
      // período de hoje trazido para dentro da janela, um cronograma já
      // encerrado abriria num mês vazio e pareceria quebrado.
      setReferencia((atual) =>
        atual ??
        ancorar(new Date(), resposta.janela.inicio.slice(0, 10), resposta.janela.fim.slice(0, 10)),
      );
      // Projeto de escopo único: já abre nele. Só troca quando o filtro
      // ainda está em "geral" — se a pessoa já tiver escolhido algo (ou
      // voltado pra "Todos" antes de este ser o único escopo), um reload
      // não deveria puxar a escolha de volta.
      if (resposta.escopos.length === 1) {
        const unico = resposta.escopos[0].id;
        setEscopoSelecionado((atual) => (atual === "geral" ? unico : atual));
      }
      // O `?escopo=` das Pendências apontou para um escopo que não existe neste
      // projeto — URL velha, escopo cancelado no meio do caminho, id digitado à
      // mão. Volta para Geral e desliga a marcação: com um escopo inexistente
      // selecionado o calendário filtra tudo, e a pessoa veria um cronograma
      // vazio sem nada explicando por quê. Aqui e não num efeito, pelo mesmo
      // motivo da âncora acima (`react-hooks/set-state-in-effect`).
      if (escopoPedido !== null && !resposta.escopos.some((e) => e.id === escopoPedido)) {
        setEscopoSelecionado("geral");
        setModoMarcacao(null);
        setAviso("O escopo do atalho não existe mais neste projeto.");
      }
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao carregar o cronograma");
    } finally {
      setCarregando(false);
    }
  }, [projeto.id, token, escopoPedido]);

  useEffect(() => {
    setCarregando(true);
    carregar();
  }, [carregar]);

  // Esc sai do modo de marcação. Sem isso, quem ligou "Banca" sem querer fica
  // com o calendário armado e marca no primeiro clique seguinte.
  useEffect(() => {
    if (!modoMarcacao) return;
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") setModoMarcacao(null);
    }
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [modoMarcacao]);

  // Um tique por segundo enquanto houver o que desfazer. O `setState` mora
  // no callback do intervalo, não no corpo do efeito, no corpo ele dispararia
  // render em cascata.
  useEffect(() => {
    if (!desfazer) return;
    const tique = () => {
      const s = Math.ceil((desfazer.ate - Date.now()) / 1000);
      if (s <= 0) setDesfazer(null);
      else setRestam(s);
    };
    tique();
    const id = window.setInterval(tique, 1000);
    return () => window.clearInterval(id);
  }, [desfazer]);

  const modoGeral = escopoSelecionado === "geral";
  const escopo = modoGeral
    ? null
    : (dados?.escopos.find((e) => e.id === escopoSelecionado) ?? null);
  /**
   * O carimbo, e SÓ isso: ele alimenta um banner e habilita o botão.
   *
   * Não é trava de nada. `pincelTravado`, o `disabled` da entrega e os
   * filtros de "escopo oficializado" saíram daqui de propósito: pintar é
   * sempre permitido, e quem delimita o trabalho é a JANELA do escopo, que não
   * pergunta se o cronograma foi oficializado.
   */
  const oficializado = !!escopo?.cronograma_oficializado_em;

  /** As frentes cujo calendário deve aparecer: a do escopo, ou todas no Geral. */
  const frentesVisiveis = useMemo(() => {
    if (!dados) return new Set<number>();
    return modoGeral
      ? new Set(dados.escopos.map((e) => e.frente_id))
      : new Set(escopo ? [escopo.frente_id] : []);
  }, [dados, modoGeral, escopo]);

  /**
   * O calendário acadêmico da frente do escopo SELECIONADO.
   *
   * Cada frente tem o seu, as semanas de avaliação de Administração não são
   * as de Engenharia. Trocar o escopo no seletor troca o calendário junto, que
   * é o que faz um projeto sinérgico mostrar a realidade de cada lado.
   *
   * Os dias sem frente (`null`) entram sempre: feriado é do país.
   */
  /** Sábado e domingo da janela, a base dos dois mapas abaixo. */
  const fimDeSemana = useMemo(() => {
    const mapa = new Map<string, { tipo: string; descricao: string | null }>();
    if (!dados) return mapa;
    // Não vem do backend de propósito: `dia_nao_letivo` guarda o que a
    // diretoria carrega do PDF, e fim de semana não é carregado, o cálculo de
    // dias úteis já o exclui por definição.
    const fim = new Date(`${dados.janela.fim.slice(0, 10)}T12:00:00`);
    const cursor = new Date(`${dados.janela.inicio.slice(0, 10)}T12:00:00`);
    while (cursor <= fim) {
      if (cursor.getDay() === 0 || cursor.getDay() === 6) {
        mapa.set(chaveData(cursor), { tipo: "fim_de_semana", descricao: null });
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    return mapa;
  }, [dados]);

  /**
   * O que aparece hachurado: fim de semana + o calendário das frentes visíveis.
   *
   * No Geral são todas as frentes do projeto, para nenhum bloqueio ficar
   * escondido na visão que serve para apresentar.
   */
  const diasNaoUteis = useMemo(() => {
    const mapa = new Map(fimDeSemana);
    for (const dia of dados?.dias_nao_uteis ?? []) {
      if (dia.frente_id !== null && !frentesVisiveis.has(dia.frente_id)) continue;
      mapa.set(dia.data.slice(0, 10), { tipo: dia.tipo, descricao: dia.descricao });
    }
    return mapa;
  }, [dados, frentesVisiveis, fimDeSemana]);

  /**
   * Dias úteis entre duas datas ISO, inclusive, a régua do prazo no banner.
   *
   * Usa o mesmo mapa que hachura o calendário, então feriado e semana de provas
   * já entram. Não é uma segunda definição de dia útil: `dias_uteis.py` continua
   * sendo a fonte, e este mapa veio dele.
   */
  const diasUteisEntre = useCallback(
    (de: string, ate: string) =>
      de > ate ? 0 : diasDoIntervalo(de, ate).filter((d) => !diasNaoUteis.has(d)).length,
    [diasNaoUteis],
  );

  /**
   * o banner da janela. **Informa, não bloqueia**, pintar além dela
   * continua permitido, e é essa a diferença para a banca, que é recusada.
   *
   * Três estados, nesta ordem de prioridade:
   *
   * 1. pedido de dias aguardando a diretoria;
   * 2. prazo ainda aberto (mostra quantos dias úteis restam para pedir);
   * 3. já pintou além da janela e o prazo venceu, mostra
   *    *vendidos · ajustados · atraso* e diz que não cabe mais pedido.
   *
   * **Etapa posterior à banca realizada não dispara nada**: aquilo é
   * CORREÇÃO, tem métrica própria e não é estouro de janela.
   */
  const avisoJanela = useMemo(() => {
    if (!escopo) return null;

    // **Aqui só entra INFORMAÇÃO, nunca pedido.** O "peça dias de ajuste"
    // virou um botão na barra, visível apenas enquanto o prazo do pedido
    // existe; misturado ao aviso de atraso, ele fazia parecer que aumentar a
    // janela e corrigir o que a banca apontou fossem a mesma coisa.
    //
    // ANTES do corte de `data_inicio`: um pedido feito na ambientação existe
    // sem reunião inicial, e sem este aviso ele sumia da tela — o botão some
    // enquanto há pendente, e ninguém dizia por quê.
    if (escopo.reajuste_pendente) {
      return {
        tom: "aguardando" as const,
        texto:
          `Pedido de +${escopo.reajuste_pendente.dias_solicitados} dias de ajuste ` +
          "aguardando a diretoria.",
      };
    }

    if (!escopo.data_inicio) return null;

    if (escopo.atraso === 0) return null;

    return {
      tom: "atraso" as const,
      texto:
        `${escopo.dias_uteis_vendidos} vendidos` +
        // Negativo desde o ajuste manual da diretoria: "· -15 ajustados" lia
        // como erro de conta, "· 15 a menos" diz o que houve.
        (escopo.dias_uteis_ajustados
          ? escopo.dias_uteis_ajustados > 0
            ? ` · ${escopo.dias_uteis_ajustados} ajustados`
            : ` · ${Math.abs(escopo.dias_uteis_ajustados)} a menos`
          : "") +
        ` · ${escopo.consumidos} consumidos · ${escopo.atraso} ` +
        `${escopo.atraso === 1 ? "dia" : "dias"} em atraso.`,
    };
  }, [escopo]);



  /** Banca, entrega e kickoff são LIDOS de onde já vivem (`banca.data_hora`,
   *  `data_entrega_*`, `data_kickoff`), não há linha de marco para eles. */
  const marcos = useMemo<MarcoRenderizavel[]>(() => {
    if (!dados) return [];
    const lista: MarcoRenderizavel[] = [];
    // ⭐ A promessa ao cliente — do PROJETO, não de um escopo.
    //
    // Só na visão Geral: dentro de um escopo específico ela apareceria colada
    // às datas dele e passaria por entrega daquele escopo, que é outra coisa
    // (e já tem marco próprio, logo abaixo).
    if (modoGeral && projeto.data_entrega_prevista_cliente) {
      lista.push({
        data: projeto.data_entrega_prevista_cliente.slice(0, 10),
        tipo: "entrega_prevista_cliente",
        rotulo: ROTULOS_MARCO.entrega_prevista_cliente,
        titulo: "Entrega prevista ao cliente",
      });
    }
    if (dados.data_kickoff) {
      lista.push({
        data: dados.data_kickoff.slice(0, 10),
        tipo: "kickoff",
        rotulo: ROTULOS_MARCO.kickoff,
        titulo: "Kickoff",
      });
    }
    for (const e of dados.escopos) {
      // Num escopo específico só entram os marcos DELE. O kickoff fica de fora
      // deste filtro logo acima: ele é do projeto, não de um escopo.
      if (!modoGeral && e.id !== escopoSelecionado) continue;
      if (e.banca?.data_hora) {
        const bancaId = e.banca.id;
        lista.push({
          data: chaveData(paraDataUtc(e.banca.data_hora)),
          tipo: "banca",
          rotulo: ROTULOS_MARCO.banca,
          titulo: `Banca, ${e.nome}`,
          // O único marco que abre ficha. Banca é a marcação que carrega
          // informação que NÃO cabe no calendário, quem avalia, quem é a
          // equipe, qual o resultado, e até aqui ela só existia na tela
          // `/bancas`, longe de onde a data aparece.
          onClick: () => setBancaAberta(bancaId),
        });
      }
      const entrega = e.data_entrega_real ?? e.data_entrega_planejada;
      if (entrega) {
        lista.push({
          data: entrega.slice(0, 10),
          tipo: "entrega",
          rotulo: ROTULOS_MARCO.entrega,
          titulo: `Entrega, ${e.nome}`,
        });
      }
    }
    // As reuniões do a inicial de cada escopo (que abre a janela) e as
    // gerais do projeto. Sem elas aqui, marcar uma reunião no calendário não
    // deixava marca nenhuma no calendário.
    for (const r of dados.reunioes ?? []) {
      if (!modoGeral && r.projeto_escopo_id && r.projeto_escopo_id !== escopoSelecionado) continue;
      const daquele = dados.escopos.find((e) => e.id === r.projeto_escopo_id);
      const inicial = r.tipo === "inicial";
      lista.push({
        data: r.data_reuniao.slice(0, 10),
        tipo: inicial ? "reuniao_inicial" : "reuniao_geral",
        rotulo: ROTULOS_MARCO[inicial ? "reuniao_inicial" : "reuniao_geral"],
        titulo: [
          inicial ? `Reunião inicial, ${daquele?.nome ?? "escopo"}` : "Reunião semanal",
          r.observacoes,
        ]
          .filter(Boolean)
          .join(": "),
      });
    }
    for (const m of dados.marcos) {
      if (!modoGeral && m.projeto_escopo_id && m.projeto_escopo_id !== escopoSelecionado) continue;
      lista.push({
        data: m.data.slice(0, 10),
        tipo: m.tipo,
        rotulo: ROTULOS_MARCO[m.tipo],
        // A nota é o nome que o coordenador deu; sem ela, o rótulo do tipo.
        titulo: m.nota ?? ROTULOS_MARCO[m.tipo],
      });
    }
    return lista;
  }, [dados, modoGeral, escopoSelecionado, projeto.data_entrega_prevista_cliente]);

  /**
   * A JANELA de cada escopo, da reunião inicial até *vendidos + ajustados*
   * dias úteis, chega como faixa derivada, junto de ambientação e pausa.
   *
   * Já foi "até a banca", e sumia enquanto a banca não tivesse data. A faixa
   * é previsão: é dentro dela que a banca precisa caber, não o contrário.
   *
   * A cor sai do ÍNDICE do escopo na lista do projeto, a mesma ordem dos
   * grupos da legenda, então a faixa e o título do escopo na legenda casam
   * sem ninguém precisar decorar cor. O recorte segue o do calendário: no
   * modo Geral aparecem todas; com um escopo selecionado, só a dele.
   */
  const todasAsFaixas = useMemo<FaixaDerivada[]>(() => {
    const escopos = dados?.escopos ?? [];
    const indicePorEscopo = new Map(escopos.map((e, i) => [e.id, i]));
    return (dados?.faixas_derivadas ?? []).map((f) => ({
      ...f,
      inicio: f.inicio.slice(0, 10),
      fim: f.fim.slice(0, 10),
      cor:
        f.tipo === "escopo"
          ? corPeriodoEscopo(indicePorEscopo.get(f.projeto_escopo_id ?? -1) ?? 0)
          : f.tipo === "ambientacao"
            ? COR_AMBIENTACAO
            : COR_PAUSA,
      rotulo:
        f.tipo === "escopo"
          ? `${escopos.find((e) => e.id === f.projeto_escopo_id)?.nome ?? f.rotulo}, janela do escopo`
          : f.rotulo,
    }));
  }, [dados]);

  /** O que vai para o calendário, mesmo recorte das etapas. A LEGENDA usa
   *  `todasAsFaixas`: ela lista os escopos todos, mesmo os fora da visão. */
  const faixas = useMemo(
    () =>
      todasAsFaixas.filter(
        (f) => f.tipo !== "escopo" || modoGeral || f.projeto_escopo_id === escopoSelecionado,
      ),
    [todasAsFaixas, modoGeral, escopoSelecionado],
  );

  const janela = useMemo(
    () =>
      dados
        ? { inicio: dados.janela.inicio.slice(0, 10), fim: dados.janela.fim.slice(0, 10) }
        : null,
    [dados],
  );

  const blocos = useMemo(
    () => (referencia ? blocosDaVisao(visao, referencia) : []),
    [visao, referencia],
  );

  // A navegação para nas bordas da janela, fora dela não há cronograma.
  const limites = useMemo(() => {
    if (!referencia || !janela) return { recuar: true, avancar: true };
    const atual = intervaloDaVisao(visao, referencia);
    return {
      recuar: atual.inicio <= janela.inicio,
      avancar: atual.fim >= janela.fim,
    };
  }, [visao, referencia, janela]);

  function navegar(passo: number) {
    setReferencia((atual) => (atual ? avancar(visao, atual, passo) : atual));
  }

  /** Trocar de visão mantém o período em foco, ancorado no seu início. */
  function trocarVisao(nova: Visao) {
    setVisao(nova);
    setReferencia((atual) => (atual ? normalizar(nova, atual) : atual));
  }

  /**
   * TODAS as etapas do projeto, de todos os escopos, o calendário é do
   * projeto, não do escopo.
   *
   * O seletor de escopo continua existindo, mas só decide a que escopo uma
   * etapa NOVA pertence e sobre qual janela o banner fala. Trocar de
   * escopo não muda mais o que o calendário mostra: a  admite escopos em
   * paralelo, e escondê-los um do outro esconderia justamente a sobreposição
   * que o coordenador precisa enxergar para não estourar a equipe.
   *
   * Cada etapa carrega de onde veio, para a legenda poder agrupar.
   */
  const etapas = useMemo(
    () =>
      (dados?.escopos ?? [])
        .filter((e) => modoGeral || e.id === escopoSelecionado)
        .flatMap((e) =>
        (e.etapas ?? []).map((etapa) => ({
          ...etapa,
          // Linhas com a mesma chave são TRECHOS de uma etapa só. Nome e cor
          // definem a identidade porque é isso que o usuário enxerga, o id é
          // detalhe de como o banco guarda.
          grupo: `${e.id}|${etapa.nome}|${etapa.cor}`,
          escopoId: e.id,
          escopoNome: e.nome,
        })),
      ),
    [dados, modoGeral, escopoSelecionado],
  );

  /**
   * As etapas como a TELA as mostra: as gravadas, com o gesto em curso já
   * aplicado por cima.
   *
   * O grupo que está sendo pintado sai inteiro e volta com os trechos que o
   * gesto produziu — é a lista que o `unirTrechos`/`subtrairTrecho` já
   * calculou para mandar ao servidor, então o que aparece na tela é
   * exatamente o que vai ser gravado, não uma aproximação.
   *
   * ⚠ Os ids sintéticos são NEGATIVOS de propósito: eles só existem como
   * chave de render enquanto a resposta não chega, e um id negativo estoura
   * na cara de quem tentar mandá-lo para a API em vez de falhar em silêncio.
   */
  const etapasNaTela = useMemo(() => {
    const p = pinturaOtimista;
    if (!p) return etapas;
    // A pessoa pode ter trocado de escopo no meio do voo: aí o gesto não
    // pertence mais ao que está na tela.
    if (!modoGeral && p.escopoId !== escopoSelecionado) return etapas;
    return [
      ...etapas.filter((e) => e.grupo !== p.chave),
      ...p.trechos.map((t, i) => ({
        id: -1 - i,
        projeto_escopo_id: p.escopoId,
        nome: p.nome,
        cor: p.cor,
        data_inicio: t.inicio,
        data_fim: t.fim,
        status: "planejada" as const,
        ordem: p.ordem,
        grupo: p.chave,
        escopoId: p.escopoId,
        escopoNome: p.escopoNome,
      })),
    ];
  }, [etapas, pinturaOtimista, modoGeral, escopoSelecionado]);

  /** As etapas como o usuário as vê: uma entrada por grupo, com seus trechos. */
  const grupos = useMemo(() => {
    const mapa = new Map<string, { chave: string; nome: string; cor: string; escopoId: number; trechos: typeof etapas }>();

    // Rascunhos primeiro, para uma etapa recém-criada já aparecer na legenda
    // mesmo sem nenhum trecho. Se ela ganhar trechos, o laço abaixo preenche
    // esta mesma entrada, a chave é a mesma.
    for (const r of rascunhos) {
      const chave = `${r.escopoId}|${r.nome}|${r.cor}`;
      mapa.set(chave, {
        chave,
        nome: r.nome,
        cor: r.cor,
        escopoId: r.escopoId,
        trechos: [],
      });
    }

    for (const etapa of etapasNaTela) {
      const atual = mapa.get(etapa.grupo);
      if (atual) {
        atual.trechos.push(etapa);
      } else {
        mapa.set(etapa.grupo, {
          chave: etapa.grupo,
          nome: etapa.nome,
          cor: etapa.cor,
          escopoId: etapa.escopoId,
          trechos: [etapa],
        });
      }
    }
    for (const g of mapa.values()) {
      g.trechos.sort((a, b) => a.data_inicio.localeCompare(b.data_inicio));
    }
    return [...mapa.values()];
  }, [etapasNaTela, rascunhos]);

  /**
   * Os dias em que uma etapa pisa no calendário de uma frente que NÃO está
   * sendo mostrada.
   *
   * Num projeto sinérgico a etapa vale para as duas frentes, mas o calendário
   * na tela é o de uma só. Sem este aviso, o coordenador pintaria por cima da
   * semana de provas de Tech enquanto olha o calendário de Business e nunca
   * saberia, que é exatamente o caso que o aviso existe para pegar.
   */
  const conflitosDeFrente = useMemo(() => {
    if (!dados || !escopo) return [];
    const outras = dados.dias_nao_uteis.filter(
      (d) => d.frente_id !== null && d.frente_id !== escopo.frente_id,
    );
    if (outras.length === 0) return [];

    const nomeDaFrente = new Map(
      dados.escopos.map((e) => [e.frente_id, e.nome] as const),
    );
    const porDia = new Map<string, (typeof outras)[number]>();
    for (const d of outras) porDia.set(d.data.slice(0, 10), d);

    const achados: { data: string; etapa: string; frente: number; motivo: string }[] = [];
    for (const etapa of etapas) {
      for (const chave of diasDoIntervalo(etapa.data_inicio, etapa.data_fim)) {
        const conflito = porDia.get(chave);
        if (!conflito) continue;
        achados.push({
          data: chave,
          etapa: etapa.nome,
          frente: conflito.frente_id!,
          motivo: conflito.descricao ?? conflito.tipo,
        });
      }
    }
    return achados.map((c) => ({
      ...c,
      // O escopo daquela frente é o nome que o coordenador reconhece; a frente
      // em si não aparece em lugar nenhum desta tela.
      escopoDaOutraFrente: nomeDaFrente.get(c.frente) ?? "outra frente",
    }));
  }, [dados, escopo, etapas]);


  /** O pincel manda: pintar é editar a etapa ativa, então quem trava é o
   *  escopo DELA, não o que está escolhido no seletor. */
  const grupoDoPincel = grupos.find((g) => g.chave === grupoAtivo);
  /* `pincelTravado` vivia aqui, ligado ao cronograma oficializado. pintar
     é sempre permitido, o banner avisa quando passa da janela, e o único
     bloqueio duro é a banca fora dela. */

  /** O escopo do pedido de dias em aberto, ver o comentário de `pedindoDias`. */
  const escopoDoPedido = useMemo(
    () => dados?.escopos.find((e) => e.id === pedindoDias?.escopoId) ?? null,
    [dados, pedindoDias],
  );

  /** A frente do escopo dono da etapa no pincel, quem manda no que trava. */
  const frenteDoPincel = useMemo(
    () => dados?.escopos.find((e) => e.id === grupoDoPincel?.escopoId)?.frente_id ?? null,
    [dados, grupoDoPincel],
  );

  /**
   * O que IMPEDE pintar, e que não é a mesma coisa que o que aparece.
   *
   * Quem manda aqui é a frente da etapa no pincel, não a visão. No Geral o
   * calendário mostra a união das frentes, mas pintar uma etapa de Business
   * num dia que só é não útil em Tech continua legítimo: é exatamente o caso
   * que o aviso de conflito existe para sinalizar, não para proibir. Usar a
   * união como trava deixaria o Geral MAIS restrito que o escopo.
   */
  /** O escopo dono da etapa no pincel, é a janela DELE que trava o arrasto. */
  const escopoDoPincel = useMemo(
    () => dados?.escopos.find((e) => e.id === grupoDoPincel?.escopoId) ?? null,
    [dados, grupoDoPincel],
  );

  const diasBloqueados = useMemo(() => {
    const mapa = new Map(fimDeSemana);
    for (const dia of dados?.dias_nao_uteis ?? []) {
      if (dia.frente_id !== null && dia.frente_id !== frenteDoPincel) continue;
      mapa.set(dia.data.slice(0, 10), { tipo: dia.tipo, descricao: dia.descricao });
    }

    // **A etapa não sai da janela do escopo.** Fora dela o dia fica
    // intocável, como um feriado: o calendário do escopo é o tempo que foi
    // vendido, e esticar o trabalho para além dele é renegociar prazo, não
    // arrastar o mouse. A saída é pedir dias à diretoria, e só nos 3 primeiros
    // dias úteis depois da largada.
    //
    // **Banca já realizada solta a trava.** A partir dela, mexer no
    // cronograma daquele escopo é AJUSTE, não é mais o trabalho vendido
    // correndo, e ajuste nasce fora da janela por definição. A entrega também
    // solta, mas é consequência: o  só a permite depois da banca.
    const alvo = escopoDoPincel;
    const emAjustes = !!alvo?.data_entrega_real || !!alvo?.banca?.realizado_em;
    if (dados && alvo && !emAjustes) {
      const inicio = alvo.data_inicio?.slice(0, 10) ?? null;
      const fim = alvo.fim_janela?.slice(0, 10) ?? null;
      const motivo = inicio
        ? { tipo: "fora_da_janela", descricao: `fora da janela de ${alvo.nome}` }
        : { tipo: "sem_janela", descricao: `${alvo.nome} ainda não teve reunião inicial` };
      for (const dia of diasDoIntervalo(
        dados.janela.inicio.slice(0, 10),
        dados.janela.fim.slice(0, 10),
      )) {
        if (!inicio || !fim || dia < inicio || dia > fim) mapa.set(dia, motivo);
      }
    }
    return mapa;
  }, [dados, frenteDoPincel, fimDeSemana, escopoDoPincel]);

  /**
   * os dias DEPOIS do fim da janela que o arrasto pode alcançar para
   * virar um pedido à diretoria, em vez de esbarrar numa parede muda.
   *
   * É o que responde "quantos dias a mais eu quero?" com o gesto que a pessoa
   * já usa para tudo nesta tela: arrastar no calendário. O excedente do
   * arrasto vira `dias_solicitados`; a parte que cabe na janela é pintada
   * normalmente (o `apararPontas` do calendário cuida disso).
   *
   * **Só dias ÚTEIS entram.** É a contagem deles que vai no pedido, e o
   * backend soma dias úteis em `dias_uteis_ajustados`, deixar um sábado no
   * conjunto pediria um dia que a janela não gasta.
   *
   * Vazio (= a parede volta a ser parede) quando o pedido não teria como ser
   * aceito: fora do prazo (`pedido_ajuste_aberto`), para quem não pode pedir
   * (ver `podePedirDiasDeAjuste`), ou com um pedido já pendente. Abrir o
   * formulário nesses casos entregaria um 422 depois de a pessoa escrever a
   * justificativa.
   */
  const diasNegociaveis = useMemo(() => {
    const negociaveis = new Set<string>();
    const alvo = escopoDoPincel;
    if (!dados || !alvo) return negociaveis;

    // Mesma soltura de trava do `diasBloqueados`: depois da banca realizada o
    // escopo está em correções, que não são janela e não se pedem a ninguém.
    const emAjustes = !!alvo.data_entrega_real || !!alvo.banca?.realizado_em;
    const fim = alvo.fim_janela?.slice(0, 10) ?? null;
    if (emAjustes || !fim) return negociaveis;
    if (!podePedirDiasDeAjuste || !alvo.pedido_ajuste_aberto || alvo.reajuste_pendente) {
      return negociaveis;
    }

    // O que é dia não útil DE VERDADE (fim de semana, feriado, recesso) —
    // recomposto sem a camada "fora da janela" que o `diasBloqueados` soma.
    const naoUteis = new Map(fimDeSemana);
    for (const dia of dados.dias_nao_uteis) {
      if (dia.frente_id !== null && dia.frente_id !== frenteDoPincel) continue;
      naoUteis.set(dia.data.slice(0, 10), { tipo: dia.tipo, descricao: dia.descricao });
    }

    for (const dia of diasDoIntervalo(fim, dados.janela.fim.slice(0, 10))) {
      if (dia > fim && !naoUteis.has(dia)) negociaveis.add(dia);
    }
    return negociaveis;
  }, [dados, escopoDoPincel, frenteDoPincel, fimDeSemana, podePedirDiasDeAjuste]);


  /**
   * O alerta **ao lado do calendário**, um por escopo.
   *
   * A pergunta que ele responde é de UM escopo, "as etapas deste escopo
   * passaram do tempo que foi previsto para ele?", e por isso mora na legenda,
   * encostado na lista de etapas daquele escopo. O banner do topo fala do
   * escopo selecionado; aqui todos aparecem ao mesmo tempo, que é o que a visão
   * Geral precisa.
   *
   * **A régua é o que foi VENDIDO**, não a janela esticada: é o "tempo
   * previsto inicialmente" que o coordenador combinou. Quando o estouro cabe
   * nos dias que a diretoria autorizou, o aviso muda de tom em vez de sumir —
   * continuar vendo que o escopo passou do vendido é o que justifica o ajuste.
   *
   * Dois silêncios de propósito: escopo sem etapa nenhuma, e os dias pintados
   * **depois da banca realizada**, que são CORREÇÕES e têm métrica própria.
   */
  const avisoDoEscopo = useCallback(
    (escopoId: number) => {
      const escopoAlvo = dados?.escopos.find((e) => e.id === escopoId);
      if (!escopoAlvo) return null;

      // Depois da banca realizada o escopo entra em AJUSTES: a janela deixa
      // de valer, e cobrar o limite dela seria cobrar a régua errada.
      if (escopoAlvo.banca?.realizado_em || escopoAlvo.data_entrega_real) return null;

      const trechos = grupos
        .filter((g) => g.escopoId === escopoId)
        .flatMap((g) => g.trechos.map((x) => ({ inicio: x.data_inicio, fim: x.data_fim })));

      const dias = new Set<string>();
      for (const trecho of unirTrechos(trechos)) {
        for (const dia of diasDoIntervalo(trecho.inicio, trecho.fim)) {
          if (diasNaoUteis.has(dia)) continue;
          dias.add(dia);
        }
      }

      const pintados = dias.size;
      const vendidos = escopoAlvo.dias_uteis_vendidos;
      const ajustados = escopoAlvo.dias_uteis_ajustados;

      // Janela cheia: daqui em diante o calendário recusa dias novos, e é
      // aqui que a pessoa descobre por quê, antes de arrastar e "não
      // acontecer nada".
      if (pintados > 0 && pintados >= vendidos + ajustados) {
        return {
          tom: "alerta" as const,
          texto:
            `A janela está cheia: ${pintados} de ${vendidos + ajustados} dias úteis pintados. ` +
            (escopoAlvo.pedido_ajuste_aberto
              ? "Para pintar além dela, peça dias de ajuste à diretoria."
              : "O prazo para pedir dias de ajuste já venceu, a janela não muda mais."),
        };
      }

      if (pintados <= vendidos) return null;

      const alem = pintados - vendidos;
      const cabeNoAjuste = pintados <= vendidos + ajustados;
      return {
        tom: cabeNoAjuste ? ("alerta" as const) : ("atraso" as const),
        texto: cabeNoAjuste
          ? `${pintados} dias úteis pintados · ${vendidos} vendidos. Os ${alem} dias a mais ` +
            `cabem nos ${ajustados} autorizados pela diretoria.`
          : `${pintados} dias úteis pintados · ${vendidos} vendidos` +
            (ajustados ? ` + ${ajustados} ajustados` : "") +
            `. São ${pintados - vendidos - ajustados} dias além do previsto para este escopo.`,
      };
    },
    [dados, grupos, diasNaoUteis],
  );

  /**
   * Pintar ACRESCENTA um trecho ao grupo, em vez de mover a etapa inteira.
   *
   * O novo intervalo entra na lista, os que se encostam são fundidos, e o
   * resultado é reconciliado contra as linhas que já existem, reaproveitando
   * ids para o `criado_em`/`criado_por` de cada trecho não se perder a cada
   * pincelada.
   */
  const aoPintar = useCallback(
    async (grupoChave: string, inicio: string, fim: string) => {
      if (!token) return;
      const grupo = grupos.find((g) => g.chave === grupoChave);
      if (!grupo) return;
      setAviso("");
      // o alerta de estouro. Medido ANTES de gravar, com o trecho novo
      // já somado, é a pincelada que acabou de acontecer que a pessoa precisa
      // relacionar ao aviso.
      try {
        const existentes = grupo.trechos.map((t) => ({
          id: t.id,
          inicio: t.data_inicio,
          fim: t.data_fim,
        }));
        const desejados = unirTrechos([...existentes, { inicio, fim }]);
        const plano = planejarEscrita(existentes, desejados);

        // ⭐ A tela recebe o resultado ANTES da ida ao servidor. `desejados` é
        // literalmente o que vai ser gravado, então não é um palpite: é o
        // mesmo desenho, só adiantado.
        setPinturaOtimista({
          chave: grupoChave,
          escopoId: grupo.escopoId,
          escopoNome: grupo.trechos[0]?.escopoNome ?? "",
          nome: grupo.nome,
          cor: grupo.cor,
          ordem: grupo.trechos[0]?.ordem ?? 0,
          trechos: desejados.map((t) => ({ inicio: t.inicio, fim: t.fim })),
        });

        for (const t of plano.atualizar) await moverEtapa(t.id, t.inicio, t.fim, token);
        for (const t of plano.criar) {
          await createEtapa(
            grupo.escopoId,
            { nome: grupo.nome, cor: grupo.cor, data_inicio: t.inicio, data_fim: t.fim },
            token,
          );
        }
        for (const id of plano.remover) await deleteEtapa(id, token);

        // Ganhou trecho: deixa de ser rascunho e passa a viver no banco.
        setRascunhos((atual) =>
          atual.filter((r) => `${r.escopoId}|${r.nome}|${r.cor}` !== grupoChave),
        );
        await Promise.all([carregar(), recarregarProjeto()]);
      } catch (err) {
        // O backend também barra fora da janela, e a mensagem dele já diz onde
        // a janela termina e se ainda dá para pedir dias, repassar é melhor do
        // que reescrever a regra aqui.
        setAviso(err instanceof Error ? err.message : "Erro ao pintar a etapa");
        // Deu errado: o estado real tem que voltar para a tela, senão fica o
        // desenho de uma pintura que não existe.
        await carregar();
      } finally {
        setPinturaOtimista(null);
      }
    },
    [token, carregar, recarregarProjeto, grupos],
  );

  /**
   * Desmarcar: tira o intervalo da etapa em que o gesto começou.
   *
   * Não há botão de borracha. O arrasto que nasce sobre um dia já pintado pela
   * etapa selecionada apaga; o que nasce sobre dia livre pinta. Quem decide é
   * o calendário, na âncora, e avisa aqui qual dos dois foi.
   */
  const aoApagar = useCallback(
    async (grupoChave: string, inicio: string, fim: string) => {
      if (!token) return;
      const grupo = grupos.find((g) => g.chave === grupoChave);
      if (!grupo) return;
      setAviso("");
      try {
        const existentes = grupo.trechos.map((t) => ({
          id: t.id,
          inicio: t.data_inicio,
          fim: t.data_fim,
        }));
        const desejados = subtrairTrecho(existentes, { inicio, fim });
        const plano = planejarEscrita(existentes, desejados);

        setPinturaOtimista({
          chave: grupoChave,
          escopoId: grupo.escopoId,
          escopoNome: grupo.trechos[0]?.escopoNome ?? "",
          nome: grupo.nome,
          cor: grupo.cor,
          ordem: grupo.trechos[0]?.ordem ?? 0,
          trechos: desejados.map((t) => ({ inicio: t.inicio, fim: t.fim })),
        });

        // ⭐ **Apagar o último dia não apaga a ETAPA.**
        //
        // `cronograma_etapa` é uma linha COM datas: sem trecho nenhum ela não
        // existe no banco, e tirar o último dia fazia a etapa sumir da legenda
        // junto — com o nome e a cor que alguém escolheu. Quem quis apagar um
        // dia perdia a etapa inteira e tinha que recriá-la.
        //
        // Ela volta a ser rascunho, que é exatamente o estado em que nasceu:
        // existe na tela, com nome e cor, esperando a primeira pincelada.
        //
        // ⚠ Rascunho vive só nesta aba. Um F5 leva embora a etapa que ficou
        // sem nenhum dia — para ela sobreviver ao reload, o backend precisaria
        // aceitar etapa sem data.
        if (desejados.length === 0) {
          setRascunhos((atual) =>
            atual.some((r) => `${r.escopoId}|${r.nome}|${r.cor}` === grupoChave)
              ? atual
              : [...atual, { escopoId: grupo.escopoId, nome: grupo.nome, cor: grupo.cor }],
          );
        }

        for (const t of plano.atualizar) await moverEtapa(t.id, t.inicio, t.fim, token);
        for (const t of plano.criar) {
          await createEtapa(
            grupo.escopoId,
            { nome: grupo.nome, cor: grupo.cor, data_inicio: t.inicio, data_fim: t.fim },
            token,
          );
        }
        for (const id of plano.remover) await deleteEtapa(id, token);
        await carregar();
      } catch (err) {
        setAviso(err instanceof Error ? err.message : "Erro ao desmarcar");
        await carregar();
      } finally {
        setPinturaOtimista(null);
      }
    },
    [token, carregar, grupos],
  );

  /**
   * A etapa nova nasce SEM dia nenhum marcado.
   *
   * Ela não vai para o backend ainda: `cronograma_etapa` exige data_inicio e
   * data_fim, e semear com a data de hoje pintava um dia que ninguém pediu —
   * e que, pior, não dava para desmarcar. Enquanto não tem trecho, ela vive só
   * aqui como rascunho; a primeira pincelada é que cria a linha.
   */
  function criarEtapa(nome: string, cor: string, escopoId: number) {
    setAviso("");
    setRascunhos((atual) => [...atual, { escopoId, nome, cor }]);
    setGrupoAtivo(`${escopoId}|${nome}|${cor}`);
    setCriandoEtapa(null);
  }

  /**
   * Apaga a etapa INTEIRA, com todos os seus trechos.
   *
   * O erro sobe para o modal mostrar; ele só fecha se deu certo.
   */
  /**
   * O que entra no PDF, segundo o escopo escolhido NO MODAL, não o da tela.
   *
   * Exportar "somente Análise Mercadológica" enquanto se olha o Geral tem que
   * produzir o PDF daquele escopo, e não uma foto do que está na tela.
   */
  const exportGeral = escopoExport === "geral";
  const etapasExport = useMemo(
    () => (exportGeral ? etapas : etapas.filter((e) => e.escopoId === escopoExport)),
    [etapas, exportGeral, escopoExport],
  );
  const marcosExport = useMemo(() => {
    if (exportGeral || !dados) return marcos;
    const doEscopo = dados.escopos.find((e) => e.id === escopoExport);
    const nome = doEscopo?.nome;
    // Kickoff é do projeto e fica em qualquer recorte; banca e entrega levam o
    // nome do escopo no título, que é como dá para separá-los aqui.
    return marcos.filter((m) => m.tipo === "kickoff" || (nome && m.titulo.includes(nome)));
  }, [marcos, exportGeral, escopoExport, dados]);
  const diasNaoUteisExport = useMemo(() => {
    if (exportGeral || !dados) return diasNaoUteis;
    const frente = dados.escopos.find((e) => e.id === escopoExport)?.frente_id;
    const mapa = new Map(fimDeSemana);
    for (const dia of dados.dias_nao_uteis) {
      if (dia.frente_id !== null && dia.frente_id !== frente) continue;
      mapa.set(dia.data.slice(0, 10), { tipo: dia.tipo, descricao: dia.descricao });
    }
    return mapa;
  }, [dados, exportGeral, escopoExport, diasNaoUteis, fimDeSemana]);

  /**
   * Renomeia a etapa e/ou troca a cor dela, em TODOS os trechos de uma vez.
   *
   * 📐 Nome e cor não moram na etapa: moram em cada linha de
   * `cronograma_etapa`, e o que a legenda chama de "uma etapa" são as linhas
   * que casam em `escopo|nome|cor`. Renomear só uma delas não renomeia nada —
   * parte, ao contrário: a linha renomeada vira uma etapa nova e solta.
   *
   * ⚠ Os trechos saem de `etapas`, o que está GRAVADO, e não de `grupos`, que
   * pode estar com a pintura otimista por cima. Ids negativos são de desenho,
   * e o servidor não conhece nenhum deles.
   */
  async function salvarEdicaoEtapa(nome: string, cor: string) {
    const alvo = etapaParaEditar;
    if (!alvo) return;
    setAviso("");

    const trechos = etapas.filter((e) => e.grupo === alvo.chave);
    if (token && trechos.length > 0) {
      // O erro sobe: o modal mostra e continua aberto, com o que foi digitado.
      for (const trecho of trechos) await editarEtapa(trecho.id, { nome, cor }, token);
    }

    // A etapa sem trecho nenhum é rascunho e não existe no banco: para ela, a
    // edição é isto e só isto.
    setRascunhos((atual) =>
      atual.map((r) =>
        `${r.escopoId}|${r.nome}|${r.cor}` === alvo.chave ? { ...r, nome, cor } : r,
      ),
    );
    // A chave é feita de nome e cor, então editar MUDA a chave. O pincel
    // aponta para a chave: sem isto, salvar desarmava o pincel de quem estava
    // pintando com aquela etapa.
    const novaChave = `${alvo.escopoId}|${nome}|${cor}`;
    setGrupoAtivo((atual) => (atual === alvo.chave ? novaChave : atual));

    setEtapaParaEditar(null);
    if (trechos.length > 0) await carregar();
  }

  /**
   * ⭐ O ajuste manual da janela: um número, sem passar por trava nenhuma.
   *
   * ⚠ **Recarrega o PROJETO junto do cronograma.** `dias_uteis_ajustados` mora
   * no escopo, e é dele que saem a faixa da janela, o aviso de estouro e a
   * conta de dias na legenda — sem `recarregarProjeto`, a janela na tela
   * continuaria a antiga com as etapas já na posição nova.
   */
  async function salvarAjusteDaJanela(escopoId: number, diasJanela: number) {
    if (!token) return;
    setAviso("");
    // O erro sobe: o modal mostra e continua aberto, com o que foi digitado.
    await ajustarJanelaManual(escopoId, { dias_uteis_janela: diasJanela }, token);
    setAjustandoJanela(null);
    await Promise.all([carregar(), recarregarProjeto()]);
  }

  async function excluirGrupo(chave: string) {
    if (!token) return;
    const grupo = grupos.find((g) => g.chave === chave);
    if (!grupo) return;
    setAviso("");
    for (const trecho of grupo.trechos) await deleteEtapa(trecho.id, token);
    setRascunhos((atual) => atual.filter((r) => `${r.escopoId}|${r.nome}|${r.cor}` !== chave));
    // Se o pincel era esta etapa, ele fica órfão, apagar tem que desarmá-lo.
    setGrupoAtivo((atual) => (atual === chave ? null : atual));
    setEtapaParaExcluir(null);
    await carregar();
  }

  /**
   * A entrega PLANEJADA do escopo selecionado.
   *
   * Fica aqui porque é decisão de cronograma: a  diz que ao fim da
   * ambientação o coordenador crava o cronograma do escopo, e a data de
   * entrega faz parte disso. Não confundir com a entrega REAL, que é registro
   * de execução e fica travada até a banca aprovar.
   */
  async function salvarEntrega(valor: string) {
    if (!token || !escopo) return;
    setAviso("");
    try {
      await definirEntregaPlanejada(escopo.id, valor || null, token);
      await carregar();
    } catch (err) {
      setAviso(err instanceof Error ? err.message : "Erro ao definir a entrega");
    }
  }

  /**
   * cravar o cronograma do escopo, um CARIMBO, não um cadeado.
   *
   * Já foi o cadeado que trancava o calendário atrás de uma fila de
   * aprovação; hoje só registra a data e alimenta o banner. Por isso não
   * recarrega o projeto nem mexe em janela: nenhum dia da contagem muda.
   */
  async function oficializar() {
    if (!token || !escopo) return;
    await oficializarCronograma(escopo.id, token);
    setConfirmandoOficializacao(false);
    await carregar();
  }

  /**
   * O clique num dia, quando há modo de marcação ligado (do de-para).
   *
   * Cada modo escreve numa tabela diferente, mas para quem usa é o mesmo
   * gesto: escolher o dia no calendário. Era isso que estava espalhado por
   * três telas (Reuniões, Visão geral e o botão "marcar banca" do topo).
   *
   * A banca abre confirmação em vez de gravar direto: ela pode exigir
   * justificativa (fora da janela, ou remarcação), e o backend recusa sem ela.
   */
  /** Registra o desfazer com a janela de 30 s. */
  function oferecerDesfazer(rotulo: string, acao: () => Promise<unknown>) {
    setDesfazer({ rotulo, acao, ate: Date.now() + 30_000 });
  }

  async function executarDesfazer() {
    if (!desfazer) return;
    const acao = desfazer.acao;
    setDesfazer(null);
    try {
      await acao();
      await Promise.all([carregar(), recarregarProjeto()]);
    } catch (e) {
      setAviso(e instanceof Error ? e.message : "Não foi possível desfazer");
    }
  }

  function marcarDia(dia: string) {
    if (!token || !modoMarcacao) return;
    setAviso("");

    // Nenhum modo grava direto: os quatro abrem confirmação. A reunião precisa
    // das observações, a banca e a entrega podem exigir justificativa, e um
    // clique que crava data sem passo intermediário erra fácil no calendário.
    if (modoMarcacao === "reuniao_geral" || modoMarcacao === "reuniao_inicial") {
      const inicial = modoMarcacao === "reuniao_inicial";
      if (inicial && !escopo) return;
      const escopoId = inicial ? (escopo?.id ?? null) : null;
      /**
       * ⭐ A reunião INICIAL é uma só por escopo — clicar noutro dia MOVE a
       * que existe, não cria outra.
       *
       * ⚠ Antes a busca era só por dia, então clicar num dia diferente caía no
       * caminho de criação e nascia uma segunda "reunião inicial" para o mesmo
       * escopo. Pior que a duplicata na tela: `data_inicio` do escopo deriva da
       * reunião mais antiga, então marcar uma segunda numa data anterior movia
       * a janela inteira para trás — prazos, banca e atraso recalculados sem
       * ninguém ter pedido.
       *
       * A geral continua por dia: ela é semanal, e o projeto tem várias.
       */
      const existente = inicial
        ? (dados?.reunioes ?? []).find((r) => (r.projeto_escopo_id ?? null) === escopoId)
        : (dados?.reunioes ?? []).find(
            (r) =>
              r.data_reuniao.slice(0, 10) === dia && (r.projeto_escopo_id ?? null) === escopoId,
          );
      setReuniaoAberta({
        dia,
        tipo: inicial ? "inicial" : "geral",
        escopoId,
        reuniaoId: existente?.id ?? null,
        observacoes: existente?.observacoes ?? null,
      });
      return;
    }

    if (modoMarcacao === "kickoff") {
      setKickoffAberto(dia);
      return;
    }
    if (!escopo) return;
    if (modoMarcacao === "banca") setRemarcando({ dia, escopoId: escopo.id });
    else if (modoMarcacao === "entrega") setEntregaAberta({ dia, escopoId: escopo.id });
  }

  /**
   * O kickoff, marcado no calendário como todas as outras datas do projeto.
   *
   * Confirma antes porque ele não é só um ponto no cronograma: é de onde a
   * ambientação conta, e mexer nele pode encerrar ou reabrir a janela
   * que move o status do projeto sozinho.
   */
  async function confirmarKickoff() {
    if (!token || !kickoffAberto) return;
    const anterior = projeto.data_kickoff?.slice(0, 10) ?? null;
    await marcarKickoff(projeto.id, kickoffAberto, token);
    // Só há desfazer se existia data antes: a API não aceita kickoff vazio.
    if (anterior) {
      oferecerDesfazer("Kickoff movido", () => marcarKickoff(projeto.id, anterior, token));
    }
    setKickoffAberto(null);
    setModoMarcacao(null);
    await carregar();
    await recarregarProjeto();
  }

  /** Confirma a banca, com justificativa, horário e cobertura de escopos. */
  async function confirmarBanca(justificativa: string, horario: string, escopoIds: number[]) {
    if (!token || !remarcando) return;
    const anteriorIso = dados?.escopos.find((e) => e.id === remarcando.escopoId)?.banca?.data_hora ?? null;
    await marcarBancaDoEscopo(
      remarcando.escopoId,
      new Date(`${remarcando.dia}T${horario}:00`).toISOString(),
      token,
      justificativa || undefined,
      escopoIds,
    );
    // Remarcar exige justificativa, então o desfazer manda uma que
    // diz o que foi: a linha do histórico tem que contar a verdade.
    if (anteriorIso) {
      const escopoId = remarcando.escopoId;
      oferecerDesfazer("Banca remarcada", () =>
        marcarBancaDoEscopo(escopoId, anteriorIso, token, "Desfeito pelo usuário", escopoIds),
      );
    }
    setRemarcando(null);
    setModoMarcacao(null);
    // As duas: `carregar()` atualiza o calendário; `recarregarProjeto()`
    // atualiza o shell, de onde a Visão geral e o cabeçalho leem. Sem a
    // segunda, a banca recém-marcada aparecia como "não marcada" na outra aba.
    await Promise.all([carregar(), recarregarProjeto()]);
  }

  /**
   * Registra, edita ou apaga a reunião do dia.
   *
   * A mesma função cobre os três porque o modal é um só: o que muda é haver ou
   * não `reuniaoId`. Apagar a reunião INICIAL desfaz a `data_inicio` do escopo
   *, quem faz isso é o backend, que recalcula a partir da primeira reunião
   * restante.
   */
  async function salvarReuniao(observacoes: string) {
    if (!token || !reuniaoAberta) return;
    const { dia, escopoId, reuniaoId } = reuniaoAberta;
    if (reuniaoId) {
      const obsAntes = reuniaoAberta.observacoes ?? "";
      await updateReuniao(reuniaoId, dia, escopoId, token, observacoes);
      oferecerDesfazer("Reunião alterada", () =>
        updateReuniao(reuniaoId, dia, escopoId, token, obsAntes),
      );
    } else {
      const criada = await createReuniao(projeto.id, dia, escopoId, token, observacoes);
      // A única marcação plenamente reversível: criar tem inverso exato.
      if (criada?.id) {
        oferecerDesfazer("Reunião marcada", () => deleteReuniao(criada.id, token));
      }
    }
    setReuniaoAberta(null);
    setModoMarcacao(null);
    // A reunião inicial abre a janela do escopo: sem recarregar o projeto, a
    // Visão geral seguia dizendo "não iniciado".
    await Promise.all([carregar(), recarregarProjeto()]);
  }

  async function apagarReuniao() {
    if (!token || !reuniaoAberta?.reuniaoId) return;
    await deleteReuniao(reuniaoAberta.reuniaoId, token);
    setReuniaoAberta(null);
    setModoMarcacao(null);
    await Promise.all([carregar(), recarregarProjeto()]);
  }

  /**
   * §13: registrar a DATA da entrega é livre; alterá-la é decisão da diretoria.
   *
   * ⚠ Isto não entrega o escopo — só grava o dia. Quem move o status para
   * "Entregue" é a confirmação na Visão geral (`confirmarEntregaEscopo`), e por
   * isso o nome daqui fala de data, não de entrega.
   */
  async function salvarDataDeEntrega(justificativa: string) {
    if (!token || !entregaAberta) return;
    const anterior = dados?.escopos.find((e) => e.id === entregaAberta.escopoId)?.data_entrega_real ?? null;
    await marcarEntregaEscopo(
      entregaAberta.escopoId,
      entregaAberta.dia,
      token,
      justificativa || undefined,
    );
    if (anterior) {
      const escopoId = entregaAberta.escopoId;
      oferecerDesfazer("Entrega alterada", () =>
        marcarEntregaEscopo(escopoId, anterior.slice(0, 10), token, "Desfeito pelo usuário"),
      );
    }
    setEntregaAberta(null);
    setModoMarcacao(null);
    await carregar();
    await recarregarProjeto();
  }

  /**
   * o coordenador (ou a diretoria de projetos) pede mais dias para a JANELA
   * do escopo.
   *
   * O backend recusa fora do prazo (que é o fim da ambientação no primeiro
   * escopo e 3 dias úteis da largada nos demais) e para quem não pode pedir,
   * não duplicamos a regra aqui. Deixa o erro SUBIR para o modal
   * em vez de tratá-lo: a recusa ("o prazo venceu em 08/09") pertence ao
   * formulário que a pessoa está preenchendo, não a um banner no topo.
   */
  async function pedirDias(dias: number, motivo: string) {
    if (!token || !pedindoDias) return;
    await pedirDiasDeAjuste(pedindoDias.escopoId, { dias_solicitados: dias, motivo }, token);
    setPedindoDias(null);
    await Promise.all([carregar(), recarregarProjeto()]);
  }

  /**
   * o arrasto passou do fim da janela, o excedente vira o pedido.
   *
   * Chega aqui só o que o calendário considerou negociável (ver
   * `diasNegociaveis`), então `diasExtras` já é a contagem de dias ÚTEIS que
   * falta para a etapa caber: exatamente o número que o backend vai somar em
   * `dias_uteis_ajustados` se a diretoria aprovar.
   *
   * Abre o modal em vez de enviar direto: o  exige a justificativa, e um
   * arrasto não tem onde escrevê-la.
   */
  function negociarDias(_grupo: string, diasExtras: number, ultimoDia: string) {
    if (!escopoDoPincel) return;
    setAviso("");
    setPedindoDias({ escopoId: escopoDoPincel.id, dias: diasExtras, ateDia: ultimoDia });
  }

  /**
   * ⭐ A pessoa tentou pintar um dia travado — e agora a tela diz por quê.
   *
   * ⚠ **Antes isto era silêncio.** O calendário desistia do arrasto e não
   * acontecia nada: nem pintava, nem avisava. Quem tentava pintar antes da
   * reunião inicial ficava clicando numa parede muda, sem descobrir que existe
   * uma ordem a seguir — e o backend, que tem a explicação pronta, nunca era
   * chamado, porque a requisição não chegava a sair.
   *
   * 📐 A frase é montada AQUI, e não no calendário, porque ela precisa do nome
   * do escopo, das datas da janela e de saber se ainda dá para pedir dias. O
   * calendário só sabe que o dia está travado.
   */
  function explicarBloqueio(_dia: string, motivo: { tipo: string; descricao: string | null }) {
    const alvo = escopoDoPincel;

    if (motivo.tipo === "sem_janela") {
      setAviso(
        `${alvo ? `O escopo "${alvo.nome}"` : "Este escopo"} ainda não teve reunião ` +
          "inicial, e é ela que abre a janela de dias vendidos. Marque a reunião inicial " +
          "primeiro — só depois dá para pintar etapas e marcar a banca.",
      );
      return;
    }

    if (motivo.tipo === "fora_da_janela") {
      const ate = alvo?.fim_janela ? ` A janela termina em ${formatarData(alvo.fim_janela)}.` : "";
      // O pedido de dias só existe enquanto o prazo dele está aberto — oferecer
      // a saída fora do prazo seria mandar a pessoa levar outra recusa.
      const saida =
        diasNegociaveis.size > 0
          ? " Para esticar, arraste além do fim da janela: isso abre um pedido de dias à diretoria."
          : " O prazo para pedir dias de ajuste já passou, então a janela deste escopo não muda mais.";
      return setAviso(
        `Este dia está fora da janela${alvo ? ` de "${alvo.nome}"` : ""}.${ate}${saida}`,
      );
    }

    // Fim de semana, feriado, recesso: fato, não regra negociável.
    setAviso(
      `${motivo.descricao ?? "Este dia não é útil"} — as etapas contam só dias úteis, ` +
        "então feriados e fins de semana ficam de fora da contagem.",
    );
  }

  /**
   * Gera o PDF ou a imagem a partir de uma cópia FORA DA TELA com os meses
   * escolhidos.
   *
   * Não dá para rasterizar o calendário visível: ele mostra o recorte da visão
   * atual (um dia, se for o caso), e o  quer o cronograma de apresentação.
   * O erro sobe para o modal mostrar.
   */
  async function gerarPdf(
    mesesEscolhidos: Date[],
    escopoEscolhido: number | "geral",
    formato: "pdf" | "png",
  ) {
    setEscopoExport(escopoEscolhido);
    setMesesExport(mesesEscolhidos);
    // Dois frames: um para o React montar a área, outro para o navegador
    // aplicar o layout. Sem isso o html-to-image fotografa a folha em branco.
    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)),
    );
    try {
      if (!areaExport.current) throw new Error("A área de exportação não montou");
      if (formato === "png") {
        await exportarPNG(areaExport.current, projeto.nome);
      } else {
        await exportarPDF(areaExport.current, projeto.nome);
      }
      setExportandoPdf(false);
    } finally {
      setMesesExport(null);
    }
  }

  if (erro) {
    return (
      <ErrorBlock>
        <ErrorText>Não foi possível carregar o cronograma: {erro}</ErrorText>
        <PageButton $variant="outline" onClick={() => carregar()}>
          Tentar novamente
        </PageButton>
      </ErrorBlock>
    );
  }

  if (carregando || !dados) return <PageLoadingBlock />;

  // Cronograma antes do kickoff não tem o que dizer, é o estado honesto.
  // Menos no projeto do atalho (2026-10-14): lá o kickoff é opcional e o
  // cronograma (e a banca) precisam andar sem ele.
  if (!dados.data_kickoff && !projeto.criado_pelo_atalho) {
    return (
      <AvisoBanner>
        Marque o kickoff na aba <Link to={`/projetos/${projeto.id}`}>Visão geral</Link> para montar
        o cronograma, é ele que dá o ponto de partida da contagem.
      </AvisoBanner>
    );
  }

  if (dados.escopos.length === 0) {
    return <EmptyText>Cadastre um escopo vendido antes de montar o cronograma.</EmptyText>;
  }

  const diasPreview = previewIntervalo
    ? diasDoIntervalo(previewIntervalo.inicio, previewIntervalo.fim).filter(
        (d) => !diasNaoUteis.has(d),
      ).length
    : null;

  return (
    <PageStack>
      {/* Só informação: a decisão da diretoria mora na lista de
          "Pedidos de dias de ajuste" do Monitoramento, e o pedido do
          coordenador é o botão da barra. */}
      {avisoJanela && <AvisoBanner>{avisoJanela.texto}</AvisoBanner>}

      {/* Banner de OUTRO assunto, e por isso separado do de cima: este é o
          carimbo, memória de quando o cronograma foi cravado. Ele não
          fala da janela nem a limita, os dois convivem e podem aparecer
          juntos. `escopo!` é seguro: `oficializado` já exige o escopo. */}
      {oficializado && (
        <AvisoBanner>
          Cronograma oficializado em {formatarData(escopo!.cronograma_oficializado_em)}.
        </AvisoBanner>
      )}

      <CronogramaBarra
        escopos={dados.escopos}
        escopoSelecionado={escopoSelecionado}
        onEscopo={(id) => {
          setEscopoSelecionado(id);
          setGrupoAtivo(null);
        }}
        visao={visao}
        onVisao={trocarVisao}
        tituloPeriodo={blocos[0]?.titulo ?? ""}
        limites={limites}
        onNavegar={navegar}
        onAjuda={() => setAjudaAberta(true)}
        onNovaEtapa={() =>
          setCriandoEtapa(escopoSelecionado === "geral" ? "perguntar" : escopoSelecionado)
        }
        onExportar={() => setExportandoPdf(true)}
        podeEditar={podeEditar}
        modos={MODOS}
        modoMarcacao={modoMarcacao}
        onModo={(valor) => {
          // Ligar um modo desliga o pincel: os dois disputam o mesmo clique, e
          // mantê-los juntos tornaria o gesto ambíguo.
          setGrupoAtivo(null);
          setModoMarcacao((atual) => (atual === valor ? null : (valor as ModoMarcacao)));
        }}
        escopoAtual={escopo}
        onEntregaPlanejada={salvarEntrega}
        podePedirDias={
          !!escopo?.pedido_ajuste_aberto && podePedirDiasDeAjuste && !escopo.reajuste_pendente
        }
        rotuloPrazoPedido={escopo ? formatarData(escopo.prazo_pedido_ajuste) : null}
        diasUteisRestantesDoPedido={diasUteisEntre(
          hojeIso(),
          escopo?.prazo_pedido_ajuste?.slice(0, 10) ?? "",
        )}
        onPedirDias={() =>
          escopo && setPedindoDias({ escopoId: escopo.id, dias: 5, ateDia: null })
        }
        mostrarOficializar={
          podeEditar && !!escopo && !oficializado && etapas.length > 0 && !!escopo.banca
        }
        onOficializar={() => setConfirmandoOficializacao(true)}
        pincel={grupoDoPincel ? { nome: grupoDoPincel.nome, cor: grupoDoPincel.cor } : null}
        diasPreview={diasPreview}
        temEtapas={etapas.length > 0}
      />

      <AvisoRegra mensagem={aviso} onFechar={() => setAviso("")} />

      {/* O calendário na tela é o de uma frente só, mas a etapa vale para as
          duas. Este banner é o único lugar em que o conflito com a frente
          escondida aparece. */}
      {conflitosDeFrente.length > 0 && (
        <AvisoBanner>
          <TriangleAlert size={14} />
          <span>
            {conflitosDeFrente.length} {conflitosDeFrente.length === 1 ? "dia pintado cai" : "dias pintados caem"}{" "}
            em calendário de outra frente do projeto, que não aparece nesta visão:{" "}
            {[
              ...new Set(
                conflitosDeFrente.map(
                  (c) => `${formatarData(c.data)} (${c.motivo}, ${c.escopoDaOutraFrente})`,
                ),
              ),
            ].join(" · ")}
          </span>
        </AvisoBanner>
      )}

      <CronogramaLayout>
        <PaintedCalendar
          blocos={blocos}
          visao={visao}
          etapas={etapasNaTela}
          marcos={marcos}
          faixas={faixas}
          diasNaoUteis={diasNaoUteis}
          diasBloqueados={diasBloqueados}
          diasNegociaveis={diasNegociaveis}
          grupoAtivo={grupoAtivo}
          pincel={grupoDoPincel ?? null}
          somenteLeitura={!podeEditar}
          onPaintRange={aoPintar}
          onEraseRange={aoApagar}
          onNegociar={negociarDias}
          onArrasteMudou={setPreviewIntervalo}
          onDiaClicado={modoMarcacao ? marcarDia : undefined}
          onBloqueado={explicarBloqueio}
          semScrollProprio
        />

        <LegendaBox>
          {/* Um grupo por escopo: com o calendário do projeto inteiro, "Etapas"
              numa lista só não diria de qual escopo é cada faixa. Com um
              escopo só, o título continua sendo o nome dele, sem seção órfã. */}
          {dados.escopos.map((esc) => {
            const doEscopo = grupos.filter((g) => g.escopoId === esc.id);
            const periodo = todasAsFaixas.find(
              (f) => f.tipo === "escopo" && f.projeto_escopo_id === esc.id,
            );
            /**
             * A partir daqui, o que está pintado é CORREÇÃO.
             *
             * Correção ≠ dia de ajuste. Ajuste aumenta a JANELA e é pedido à
             * diretoria dentro do prazo do §8; correção é o tempo gasto
             * depois da banca arrumando o que ela apontou. Sem o rótulo, o
             * mesmo retângulo colorido pode ser o trabalho vendido ou a
             * correção, e o calendário deixa de contar a história certa.
             */
            const periodosPosBanca = derivarPeriodosPosBanca(esc);
            return (
              <LegendaGrupo key={esc.id}>
                <LegendaTitulo>{esc.nome}</LegendaTitulo>
                {/* A janela: é dentro dela que as etapas são pintadas.
                    Sem janela, o escopo ainda não teve reunião inicial, e é
                    isso que a linha diz. */}
                {periodo ? (
                  <LegendaLinha>
                    <LegendaItem as="div">
                      <Amostra $cor={periodo.cor} />
                      <LegendaTexto>
                        <strong>janela do escopo</strong>
                        <small>
                          {semAno(periodo.inicio)} – {semAno(periodo.fim)} ·{" "}
                          {esc.dias_uteis_vendidos} vendidos
                          {esc.dias_uteis_ajustados !== 0 &&
                            ` ${esc.dias_uteis_ajustados > 0 ? "+" : "−"} ${Math.abs(
                              esc.dias_uteis_ajustados,
                            )} ajustados`}
                        </small>
                      </LegendaTexto>
                    </LegendaItem>
                    {/* ⭐ A porta manual da DIRETORIA DE PROJETOS (2026-08-31).
                        Mora aqui, e não no lápis de cada etapa, porque o que
                        se remaneja é o conjunto: esticar a janela e mover as
                        etapas dentro dela são o mesmo ato, e um modal por
                        etapa faria decidir sem nunca ver o todo. */}
                    {ehDiretor && (
                      <BotaoEditarEtapa
                        type="button"
                        data-acao-etapa
                        aria-label={`Ajustar a janela e as etapas de ${esc.nome}`}
                        title="Ajustar janela e datas das etapas"
                        onClick={() => setAjustandoJanela(esc.id)}
                      >
                        <Pencil size={14} />
                      </BotaoEditarEtapa>
                    )}
                  </LegendaLinha>
                ) : (
                  <EmptyText>
                    Sem janela: marque a reunião inicial no calendário, é ela que abre a
                    janela deste escopo.
                  </EmptyText>
                )}
                {/* O alerta do escopo, encostado nas etapas dele. Aparece
                    mesmo sem reunião inicial: os dias vendidos são conhecidos
                    desde a venda, e pintar 21 num escopo de 20 já é estouro. */}
                {(() => {
                  const aviso = avisoDoEscopo(esc.id);
                  return aviso ? (
                    <AvisoEscopo $tom={aviso.tom}>
                      <TriangleAlert size={14} />
                      <span>{aviso.texto}</span>
                    </AvisoEscopo>
                  ) : null;
                })()}
                {doEscopo.length === 0 && <EmptyText>Nenhuma etapa ainda.</EmptyText>}
                {doEscopo.map((grupo) => (
                  <LegendaLinha key={grupo.chave}>
                    <LegendaItem
                      type="button"
                      $ativa={grupo.chave === grupoAtivo}
                      onClick={() =>
                        setGrupoAtivo(grupo.chave === grupoAtivo ? null : grupo.chave)
                      }
                    >
                      <Amostra $cor={grupo.cor} />
                      <LegendaTexto>
                        <strong>{grupo.nome}</strong>
                        {/* Uma linha por ETAPA, e não uma por trecho: pintada
                            em pedaços separados, a etapa rendia quatro ou cinco
                            linhas de "21/08 – 21/08 · 1 dia útil" e a caixa
                            virava uma parede de datas.

                            A versão anterior abria trecho a trecho de propósito,
                            para o vão entre eles aparecer. O vão não se perde:
                            ele está desenhado no calendário ao lado, que é onde
                            a forma do cronograma se lê de verdade — aqui a
                            legenda repetia em números o que o desenho já diz. */}
                        {(() => {
                          const intervalo = intervaloDaEtapa(grupo.trechos);
                          if (!intervalo) return null;
                          // Dias ÚTEIS, não corridos: é a unidade em que o
                          // escopo é vendido e em que o atraso é medido. Somados
                          // TRECHO A TRECHO, e não de ponta a ponta do
                          // intervalo: o vão entre um trecho e o seguinte não
                          // foi trabalhado, e contá-lo inflaria a etapa contra
                          // os dias vendidos do escopo.
                          const uteis = grupo.trechos.reduce(
                            (soma, t) =>
                              soma +
                              diasDoIntervalo(t.data_inicio, t.data_fim).filter(
                                (d) => !diasNaoUteis.has(d),
                              ).length,
                            0,
                          );
                          // Qual banca precede cada trecho, e como ela terminou,
                          // é o que decide entre "correção" e "ajustes". As
                          // etiquetas eram por trecho e agora se juntam na linha
                          // da etapa, sem repetir a mesma duas vezes. Apagá-las
                          // junto com as datas esconderia que parte do que está
                          // pintado é conserto pós-banca, e não trabalho vendido.
                          const rotulos = grupo.trechos
                            .map((t) => periodoDoTrecho(periodosPosBanca, t.data_fim)?.rotulo)
                            .filter(
                              (r, i, todos): r is string => !!r && todos.indexOf(r) === i,
                            );
                          return (
                            <small>
                              {semAno(intervalo.inicio)} – {semAno(intervalo.fim)} ·{" "}
                              {uteis} 
                              {uteis === 1 ? "dia útil" : "dias úteis"}
                              {rotulos.map((r) => (
                                <TagCorrecao key={r}>{r}</TagCorrecao>
                              ))}
                            </small>
                          );
                        })()}
                      </LegendaTexto>
                    </LegendaItem>

                    {/* Editar e excluir seguem a mesma trava do pincel: o que
                        manda é o escopo DESTA etapa, não o do seletor. */}
                    {podeEditar && (
                      <BotaoEditarEtapa
                        type="button"
                        data-acao-etapa
                        aria-label={`Editar a etapa ${grupo.nome}`}
                        title="Editar etapa"
                        onClick={() =>
                          setEtapaParaEditar({
                            chave: grupo.chave,
                            nome: grupo.nome,
                            cor: grupo.cor,
                            escopoId: grupo.escopoId,
                          })
                        }
                      >
                        <Pencil size={14} />
                      </BotaoEditarEtapa>
                    )}
                    {podeEditar && (
                      <BotaoExcluir
                        type="button"
                        data-acao-etapa
                        aria-label={`Excluir a etapa ${grupo.nome}`}
                        title="Excluir etapa"
                        onClick={() =>
                          setEtapaParaExcluir({
                            chave: grupo.chave,
                            nome: grupo.nome,
                            trechos: grupo.trechos.length,
                          })
                        }
                      >
                        <Trash2 size={14} />
                      </BotaoExcluir>
                    )}
                  </LegendaLinha>
                ))}
                {/* ⭐ O criar encostado na lista em que a etapa vai aparecer.
                    Estava na barra do topo, longe daqui. */}
                {podeEditar && (
                  <LegendaNovaEtapa type="button" onClick={() => setCriandoEtapa(esc.id)}>
                    <Plus size={13} aria-hidden />
                    Nova etapa
                  </LegendaNovaEtapa>
                )}
              </LegendaGrupo>
            );
          })}

          <LegendaGrupo>
            <LegendaTitulo>Outros</LegendaTitulo>
            {faixas.some((f) => f.tipo === "ambientacao") && (
              <LegendaItem as="div">
                <Amostra $cor={COR_AMBIENTACAO} />
                <LegendaTexto>ambientação</LegendaTexto>
              </LegendaItem>
            )}
            <LegendaItem as="div">
              <AmostraHachurada />
              <LegendaTexto>
                <strong>não útil</strong>
                <small>fim de semana, feriado, prova ou recesso</small>
              </LegendaTexto>
            </LegendaItem>
          </LegendaGrupo>
        </LegendaBox>
      </CronogramaLayout>

      {/* A cópia que o PDF rasteriza: os meses escolhidos empilhados, a
          legenda do lado e nada de interação. Só existe durante o export. */}
      {mesesExport && (
        <AreaExportOculta aria-hidden>
          <MolduraExport ref={areaExport}>
          <CronogramaLayout>
            <PaintedCalendar
              blocos={blocosDosMeses(mesesExport)}
              visao="mes"
              etapas={etapasExport}
              marcos={marcosExport}
              faixas={faixas}
              diasNaoUteis={diasNaoUteisExport}
              grupoAtivo={null}
              somenteLeitura
              onPaintRange={() => {}}
            />
            <LegendaBox>
              {dados.escopos.map((esc) => {
                const doEscopo = grupos.filter((g) => g.escopoId === esc.id);
                const periodo = todasAsFaixas.find(
                  (f) => f.tipo === "escopo" && f.projeto_escopo_id === esc.id,
                );
                if (doEscopo.length === 0 && !periodo) return null;
                return (
                  <LegendaGrupo key={esc.id}>
                    <LegendaTitulo>{esc.nome}</LegendaTitulo>
                    {periodo && (
                      <LegendaItem as="div">
                        <Amostra $cor={periodo.cor} />
                        <LegendaTexto>
                          <strong>período do escopo</strong>
                          <small>
                            {formatarData(periodo.inicio)} – {formatarData(periodo.fim)}
                          </small>
                        </LegendaTexto>
                      </LegendaItem>
                    )}
                    {doEscopo.map((grupo) => (
                      <LegendaItem as="div" key={grupo.chave}>
                        <Amostra $cor={grupo.cor} />
                        <LegendaTexto>
                          <strong>{grupo.nome}</strong>
                          {/* Uma linha por etapa, como na legenda da tela e pelo
                              mesmo motivo — no papel a parede de datas é pior
                              ainda, porque não há rolagem para escapar dela.

                              Só o intervalo, sem a contagem de dias úteis e sem
                              as etiquetas de correção/ajustes que a tela mostra:
                              este PDF sai para apresentação, e quanto a banca
                              reprovou é conversa de dentro de casa. */}
                          {(() => {
                            const intervalo = intervaloDaEtapa(grupo.trechos);
                            return intervalo ? (
                              <small>
                                {formatarData(intervalo.inicio)} –{" "}
                                {formatarData(intervalo.fim)}
                              </small>
                            ) : null;
                          })()}
                        </LegendaTexto>
                      </LegendaItem>
                    ))}
                  </LegendaGrupo>
                );
              })}
              <LegendaGrupo>
                <LegendaTitulo>Outros</LegendaTitulo>
                {faixas.some((f) => f.tipo === "ambientacao") && (
                  <LegendaItem as="div">
                    <Amostra $cor={COR_AMBIENTACAO} />
                    <LegendaTexto>ambientação</LegendaTexto>
                  </LegendaItem>
                )}
                <LegendaItem as="div">
                  <AmostraHachurada />
                  <LegendaTexto>
                    <strong>não útil</strong>
                    <small>fim de semana, feriado, prova ou recesso</small>
                  </LegendaTexto>
                </LegendaItem>
              </LegendaGrupo>
            </LegendaBox>
          </CronogramaLayout>
          </MolduraExport>
        </AreaExportOculta>
      )}

      {exportandoPdf && janela && (
        <ExportarPdfModal
          meses={
            // Sem semestre cadastrado, o recorte padrão é a janela inteira —
            // melhor oferecer demais que não oferecer nada.
            dados.semestre
              ? mesesDaJanela(dados.semestre.inicio, dados.semestre.fim)
              : mesesDaJanela(janela.inicio, janela.fim)
          }
          mesesExtras={mesesDaJanela(janela.inicio, janela.fim)}
          escopos={dados.escopos.map((e) => ({ id: e.id, nome: e.nome }))}
          escopoAtual={escopoSelecionado}
          onCancelar={() => setExportandoPdf(false)}
          onExportar={gerarPdf}
        />
      )}

      {criandoEtapa !== null && (
        <NovaEtapaModal
          corInicial={corSugerida(etapas.length)}
          // Todos os escopos: o filtro `!cronograma_oficializado_em` que vivia
          // aqui saiu junto com o cadeado.
          escopos={dados.escopos.map((e) => ({ id: e.id, nome: e.nome }))}
          escopoFixo={criandoEtapa === "perguntar" ? null : criandoEtapa}
          onCancelar={() => setCriandoEtapa(null)}
          onCriar={criarEtapa}
        />
      )}

      {/* O mesmo formulário do criar: editar pede os mesmos dois campos, e o
          `key` obriga a remontagem para os campos nascerem com a etapa certa
          quando se abre uma e depois outra. */}
      {etapaParaEditar && (
        <NovaEtapaModal
          key={etapaParaEditar.chave}
          edicao
          nomeInicial={etapaParaEditar.nome}
          corInicial={etapaParaEditar.cor}
          escopos={dados.escopos.map((e) => ({ id: e.id, nome: e.nome }))}
          escopoFixo={etapaParaEditar.escopoId}
          onCancelar={() => setEtapaParaEditar(null)}
          onCriar={(nome, cor) => salvarEdicaoEtapa(nome, cor)}
        />
      )}

      {/* ⭐ O ajuste manual da janela — o lápis ao lado de "janela do escopo". */}
      {ajustandoJanela !== null && (() => {
        const esc = dados.escopos.find((e) => e.id === ajustandoJanela);
        if (!esc) return null;
        return (
          <AjusteJanelaModal
            nomeEscopo={esc.nome}
            diasJanela={esc.dias_uteis_vendidos + esc.dias_uteis_ajustados}
            onCancelar={() => setAjustandoJanela(null)}
            onSalvar={(dias) => salvarAjusteDaJanela(esc.id, dias)}
          />
        );
      })()}

      {etapaParaExcluir && (
        <ConfirmarModal
          titulo="Excluir etapa"
          mensagem={
            <>
              A etapa <strong>{etapaParaExcluir.nome}</strong> será apagada
              {etapaParaExcluir.trechos > 1 && `, os ${etapaParaExcluir.trechos} trechos dela`}, e
              os dias que estavam pintados voltam a ficar em branco. As tarefas e a banca do escopo
              não são afetadas.
            </>
          }
          onCancelar={() => setEtapaParaExcluir(null)}
          onConfirmar={() => excluirGrupo(etapaParaExcluir.chave)}
        />
      )}

      {remarcando && escopo && (
        <MarcarBancaModal
          nomeEscopo={escopo.nome}
          escopoId={escopo.id}
          bancaAtualId={escopo.banca?.id ?? null}
          escoposDoProjeto={dados.escopos.map((e) => ({
            id: e.id,
            nome: e.nome,
            frente_id: e.frente_id,
            status: e.status,
            bancaId: e.banca?.id ?? null,
          }))}
          nomeFrente={nomeFrente}
          dia={remarcando.dia}
          jaTemData={!!escopo.banca?.data_hora}
          fimJanela={escopo.fim_janela}
          folgaAtual={
            escopo.banca?.data_hora
              ? diasUteisEntre(hojeIso(), escopo.banca.data_hora.slice(0, 10))
              : null
          }
          ehDiretor={ehDiretor}
          onCancelar={() => setRemarcando(null)}
          onConfirmar={confirmarBanca}
        />
      )}

      {confirmandoOficializacao && (
        <ConfirmarModal
          titulo="Oficializar cronograma"
          // Diz o que o carimbo NÃO faz: a versão antiga trancava o
          // calendário, e quem já usou o sistema espera esse cadeado aqui.
          mensagem={
            <>
              Registra a data em que este cronograma foi cravado. As etapas continuam
              editáveis, quem delimita o trabalho é a <strong>janela do escopo</strong>.
            </>
          }
          rotuloConfirmar="Oficializar"
          onCancelar={() => setConfirmandoOficializacao(false)}
          onConfirmar={oficializar}
        />
      )}

      {reuniaoAberta && (
        <MarcarReuniaoModal
          tipo={reuniaoAberta.tipo}
          nomeEscopo={escopo?.nome}
          dia={reuniaoAberta.dia}
          observacoesAtuais={reuniaoAberta.observacoes}
          editando={!!reuniaoAberta.reuniaoId}
          onCancelar={() => setReuniaoAberta(null)}
          onSalvar={salvarReuniao}
          onApagar={reuniaoAberta.reuniaoId ? apagarReuniao : undefined}
        />
      )}

      {entregaAberta && escopo && (
        <MarcarEntregaModal
          alvo={escopo.nome}
          dia={entregaAberta.dia}
          entregaAtual={escopo.data_entrega_real}
          ehDiretor={ehDiretor}
          onCancelar={() => setEntregaAberta(null)}
          onConfirmar={salvarDataDeEntrega}
        />
      )}

      {kickoffAberto && (
        <ConfirmarModal
          titulo={projeto.data_kickoff ? "Mudar o kickoff" : "Marcar o kickoff"}
          rotuloConfirmar={projeto.data_kickoff ? "Mudar" : "Marcar"}
          mensagem={
            <>
              O kickoff do projeto passa a ser <strong>{formatarData(kickoffAberto)}</strong>.
              É dele que a <strong>ambientação</strong> conta ({projeto.dias_ambientacao} dias
              úteis), e é ela que move o status do projeto sozinho.
            </>
          }
          onCancelar={() => setKickoffAberto(null)}
          onConfirmar={confirmarKickoff}
        />
      )}

      {bancaAberta !== null && (
        <BancaDetalhesModal bancaId={bancaAberta} onFechar={() => setBancaAberta(null)} />
      )}

      {/* O escopo do PEDIDO, não o da barra: na visão Geral o arrasto pode ser
          de uma etapa cujo escopo não é o selecionado. */}
      {pedindoDias && escopoDoPedido && (
        <PedirDiasModal
          nomeEscopo={escopoDoPedido.nome}
          diasVendidos={escopoDoPedido.dias_uteis_vendidos}
          diasAjustados={escopoDoPedido.dias_uteis_ajustados}
          prazo={formatarData(escopoDoPedido.prazo_pedido_ajuste)}
          diasIniciais={pedindoDias.dias}
          fimAtual={formatarData(escopoDoPedido.fim_janela)}
          ateDia={pedindoDias.ateDia ? formatarData(pedindoDias.ateDia) : null}
          onCancelar={() => setPedindoDias(null)}
          onPedir={pedirDias}
        />
      )}

      {ajudaAberta && <AjudaCronogramaModal onFechar={() => setAjudaAberta(false)} />}

      {desfazer && (
        <BarraDesfazer role="status" aria-live="polite">
          <span>{desfazer.rotulo}.</span>
          <BotaoDesfazer type="button" onClick={executarDesfazer}>
            Desfazer
            <ContagemDesfazer>{restam}s</ContagemDesfazer>
          </BotaoDesfazer>
        </BarraDesfazer>
      )}

    </PageStack>
  );
}
