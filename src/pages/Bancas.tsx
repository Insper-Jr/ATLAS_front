import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AlocarPessoasModal } from "./AlocarPessoasModal";
import { Desempenho } from "./Desempenho";
import { Clock, Plus, ShieldCheck, User, Users, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useLockBodyScroll } from "@/hooks/useLockBodyScroll";
import { ehDiretoriaDeProjetos } from "@/utils/permissoes";
import {
  alocar,
  cancelarBanca,
  deleteBanca,
  aceitaInscricao,
  desalocar,
  getBancas,
  getBancaDetalhes,
  getBancasFrentes,
  getCandidaturas,
  getAvaliacoesPendentes,
  getBancasParaAvaliar,
  getEquipesProjeto,
  getEscopos,
  getEscoposVendidos,
  getBancasEsperandoAprovacao,
  getFrentes,
  podeGerenciarBanca,
  pushAlocacao,
  quemPodeAprovar,
  registrarAprovacaoBanca,
  registrarDescricaoCoordenador,
  resumoDoQueFalta,
  ROTULO_STATUS_BANCA,
  getMinhasEntradaBancaPendentes,
  solicitarEntradaBanca,
  totalFaltando,
  tomDoStatusBanca,
} from "@/lib/bancas";
import { codigoDoErro, CODIGO_BANCA_LOTADA } from "@/lib/api";
import type { BancaEsperandoAprovacao, MinhaEntradaBancaPendente } from "@/lib/bancas";
import { getUsuarios } from "@/lib/usuarios";
import {
  createAvaliacao,
  createAvaliacaoNota,
  getFormularioAtivo,
  getAvaliacoes,
  isComentarioFeedbackPergunta,
  isPerguntaNota,
  isPerguntaOpcional,
  submeterAvaliacao,
} from "@/lib/avaliacoes";
import { CalendarioBancas } from "@/components/bancas/CalendarioBancas";
import { BancaFormModal } from "@/components/bancas/BancaFormModal";
import { AvaliadoresAgrupados } from "@/components/bancas/AvaliadoresAgrupados";
import { LocalEEntregaBloco } from "@/components/bancas/LocalEEntregaBloco";
import { AprovacaoLinha, FormDecisao } from "@/pages/monitoramento/AprovacaoLinha";
import {
  AprovacaoMeta,
  AtrasoTitulo,
  LinkProjeto,
  ListaSimples,
  Pilula,
} from "@/pages/monitoramento/Monitoramento.styled";
import { NotaEscala, NotaEscalaGrupo } from "@/components/NotaEscala";
import { AlertModal } from "@/components/AlertModal";
import { ConfirmarModal } from "@/components/ConfirmarModal";
import { DescricaoQuote } from "@/styles/shared.styled";
import {
  cancelarSolicitacaoTroca,
  confirmarSolicitacaoTroca,
  createSolicitacaoTroca,
  getSolicitacoesTroca,
} from "@/lib/solicitacoes-troca";
import { formatarDataHora, formatarDataHoraBanca, paraDataUtc } from "@/lib/projetos";
import { MotivoDesabilitado } from "@/components/MotivoDesabilitado";
import type {
  Banca,
  BancaDetalhes,
  BancaFrente,
  Candidatura,
  EquipeProjeto,
  Escopo,
  EscopoVendidoResumo,
  Frente,
  FormularioAtivo,
  Pergunta,
  ResultadoBanca,
} from "@/types/banca";
import type { SolicitacaoTroca } from "@/types/notificacao";
import type { UsuarioResumo } from "@/types/auth";
import {
  avaliadoresDaBanca,
  compararFrentes,
  frentesDaBanca,
  membrosDaBanca,
  nomeEscopo,
  nomeUsuario,
} from "@/lib/nucleo";
import {
  PageStack,
  PageCard,
  PageCardHeader,
  PageCardTitle,
  PageCardContent,
  PageButton,
  PageButtonSm,
  PageBadge,
  PageLoadingBlock,
  ErrorBlock,
  ErrorText,
  EmptyText,
} from "@/styles/page.styled";
import {
  DetailList,
  DetailRow,
  DetailTerm,
  DetailValue,
  AvaliadoresSecao,
  DescricaoSecao,
  FormStack,
  FieldGroup,
  FieldLabel,
  FieldInput,
  FieldTextarea,
  FieldSelect,
  FormErrorText,
  ModalOverlay,
  ModalHeader,
  ModalTitle,
  ModalSubtitulo,
  ModalClose,
  ModalBody,
  ModalFooter,
  ModalFooterSplit,
  NarrowModalContent,
  AvaliarModalBody,
  WideModalContent,
  PageHeaderAcoes,
  PageHeaderRow,
  PageHeaderText,
  PageHeading,
  PageSubheading,
  ListScrollWrap,
  LIST_MAX_VISIVEIS,
  SectionGroup,
  TabBar,
  TabButton,
  TabCount,
  BancaLinha,
  BancaCard,
  BancaCardScrollWrap,
  BancaCardFooter,
  BancaAcoesSecundarias,
  BancaData,
  BancaDataDiaSemana,
  BancaDataDia,
  BancaDataMes,
  BancaSemData,
  BancaInfo,
  BancaNomeLinha,
  BancaNome,
  BancaStatusBadges,
  BancaMetaLinha,
  BancaMetaItem,
  BancaAcoes,
  FrenteGrupo,
  FrenteGrupoTitulo,
  EscopoAvaliacaoBloco,
  EscopoAvaliacaoTitulo,
  FiltroFrenteSelect,
  CardHeaderTitulo,
} from "./Bancas.styled";
import { FUSO, partesEmBrasilia } from "@/lib/fuso";

type AbaBancas = "meus" | "alocacao" | "avaliacao" | "aprovacao" | "desempenho" | "calendario";

function porDataMaisProxima(a: Banca, b: Banca): number {
  // ⚠ Banca SEM data vai para o fim, e isto não é detalhe: `data_hora` é nula
  // enquanto a banca não é marcada, e `new Date(null).getTime()` é 0 — o epoch.
  // Ou seja, a não marcada era a "mais próxima" de todas e liderava a lista.
  if (!a.data_hora) return b.data_hora ? 1 : 0;
  if (!b.data_hora) return -1;
  return new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime();
}

/** O que a tela mostra no lugar da data quando a banca ainda não foi marcada.
 *  Constante para as telas não divergirem entre "Sem data", "A marcar" e "—". */
const SEM_DATA = "Sem data";

/* O filtro de frente das seções de banca. `TODAS_FRENTES` é um valor
   sentinela do `<select>`, não um nome de frente; `SEM_FRENTE` é grupo de
   verdade — banca sem frente cadastrada existe e não pode sumir da lista. */
const TODAS_FRENTES = "todas";
const SEM_FRENTE = "Sem frente";

/** Os blocos a que uma banca pertence: as frentes dela, ou `SEM_FRENTE`
 *  quando não tem nenhuma — banca sem frente cadastrada existe e não pode
 *  sumir da lista por falta de grupo. */
function frentesOuSemFrente(contexto: Contexto, banca: Banca): string[] {
  const nomes = frentesDaBanca(contexto.bancasFrentes, contexto.frentes, banca.id);
  return nomes.length > 0 ? nomes : [SEM_FRENTE];
}

interface Contexto {
  usuarios: UsuarioResumo[];
  escopos: Escopo[];
  escoposVendidos: EscopoVendidoResumo[];
  frentes: Frente[];
  bancasFrentes: BancaFrente[];
  equipesProjeto: EquipeProjeto[];
  candidaturas: Candidatura[];
  solicitacoesTroca: SolicitacaoTroca[];
  /** ⭐ 2026-09-18: meus próprios pedidos de entrada em banca ainda
   *  pendentes — troca "Solicitar entrada" por "Aguardando aprovação". */
  minhasEntradasPendentes: MinhaEntradaBancaPendente[];
  /** banca_id → prazo de avaliação, separado de `Banca` porque
   *  `paraAvaliar` funde `BancaParaAvaliar` com a `Banca` cheia e descarta os
   *  campos extras (ver `recarregar`). */
  prazosAvaliacao: Record<number, { prazoAvaliacao: string; prazoExpirado: boolean }>;
  /** banca_id → quem ainda não enviou a avaliação (2026-10-09, a pedido):
   *  aprovar a banca não quer dizer que todo mundo avaliou, e a seção de
   *  realizadas precisa continuar cobrando até a última avaliação entrar.
   *  Só preenchido pra quem pode agendar (a rota exige). */
  faltamAvaliar: Record<number, number[]>;
  /** Só quem ainda PODE enviar: pendência dentro do prazo (ou reaberta pela
   *  diretoria). É o que decide se uma banca já aprovada continua
   *  "aguardando avaliações" (2026-10-13, a pedido). */
  faltamAvaliarNoPrazo: Record<number, number[]>;
}

export function Bancas() {
  /* Chegada pelo card "bancas nos próximos 7 dias" do monitoramento
     (/bancas?banca=123): a lista aqui é longa, então rola até a banca e a
     destaca. Sem isso o clique de lá só abriria a página e a pessoa teria de
     procurar de novo a banca em que acabou de clicar. */
  const [searchParams] = useSearchParams();
  const bancaDestacada = Number(searchParams.get("banca")) || null;
  const refDestacada = useRef<HTMLDivElement>(null);

  const { usuario, token } = useAuth();
  const [bancas, setBancas] = useState<Banca[]>([]);
  /** Cache banca_id → BancaDetalhes, pré-buscado em background assim que
   *  `bancas` chega, pra "ver mais" abrir instantâneo em vez de esperar os
   *  ~10s do fetch on-open contra o Supabase remoto. Se a banca não estiver
   *  aqui (ainda buscando, ou fora do universo pré-buscado), `VerMaisModal`
   *  cai no fetch on-open de sempre — e alimenta o cache quando resolve. */
  const [detalhesCache, setDetalhesCache] = useState<Record<number, BancaDetalhes>>({});

  // Depois que as bancas chegam, e não na montagem: no primeiro render a lista
  // ainda está vazia e não existe elemento para rolar até.
  useEffect(() => {
    refDestacada.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [bancaDestacada, bancas]);
  const [candidaturas, setCandidaturas] = useState<Candidatura[]>([]);
  const [paraAvaliar, setParaAvaliar] = useState<Banca[]>([]);
  const [jaAvaliadas, setJaAvaliadas] = useState<Banca[]>([]);
  const [contexto, setContexto] = useState<Contexto | null>(null);
  const [formulario, setFormulario] = useState<FormularioAtivo | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [bancaDetalhe, setBancaDetalhe] = useState<Banca | null>(null);
  const [bancaAvaliar, setBancaAvaliar] = useState<Banca | null>(null);
  const [bancaEditar, setBancaEditar] = useState<Banca | null>(null);
  const [criarAberto, setCriarAberto] = useState(false);
  /** ⭐ A saída pra "isto não vai acontecer" (2026-09-04, a pedido) —
   *  gerência e diretoria de projetos, ver `podeCancelar` abaixo. */
  const [bancaCancelar, setBancaCancelar] = useState<Banca | null>(null);
  const [bancaAlocar, setBancaAlocar] = useState<Banca | null>(null);
  /** ⭐ A banca que a diretoria ou o gerente da frente vai aprovar/reprovar
   *  (§5.5, §8) — o atalho de fora do projeto. */
  const [bancaResultado, setBancaResultado] = useState<Banca | null>(null);
  /** A fila "Esperando aprovação" — bancas realizadas sem veredito. */
  const [esperandoAprovacao, setEsperandoAprovacao] = useState<BancaEsperandoAprovacao[]>([]);
  // `?aba=calendario` é o link do botão "Bancas" em /calendario — sem ler
  // a query aqui, quem clicasse lá sempre caía na aba padrão (alocação) e
  // precisava trocar de aba à mão.
  const ABAS_VALIDAS: AbaBancas[] = [
    "meus",
    "alocacao",
    "avaliacao",
    "aprovacao",
    "desempenho",
    "calendario",
  ];
  const abaDaQuery = searchParams.get("aba") as AbaBancas | null;
  const [aba, setAba] = useState<AbaBancas>(
    abaDaQuery && ABAS_VALIDAS.includes(abaDaQuery) ? abaDaQuery : "alocacao",
  );
  const [avisoErro, setAvisoErro] = useState("");
  const [bancaParaExcluir, setBancaParaExcluir] = useState<Banca | null>(null);
  const [bancaConvidar, setBancaConvidar] = useState<Banca | null>(null);
  const [bancaSolicitarEntrada, setBancaSolicitarEntrada] = useState<Banca | null>(null);
  const [distribuindo, setDistribuindo] = useState(false);
  /** O que a distribuição fez — dito em números, não em "pronto!". */
  const [resultadoPush, setResultadoPush] = useState("");
  /** ⭐ 2026-09-05, a pedido: confirmação antes de rodar de verdade — um
   *  clique sem querer não pode sair alocando gente sem ninguém ter visto
   *  o que ia acontecer. */
  const [confirmandoDistribuicao, setConfirmandoDistribuicao] = useState(false);

  /**
   * ⭐ Prévia de quem o "Distribuir agora" provavelmente vai mexer — mesma
   * janela (7 dias) e o mesmo gate de fundo do backend
   * (`PushAlocacaoAutomaticaUseCase`): só entra banca com `piso_minimo` (o
   * TOTAL, já somado com a regra de composição) ainda não batido. Não é uma
   * cópia do rodízio inteiro — a escolha de QUEM é sorteado (pool de
   * liderança disponível, empate por rodízio) só existe no backend — só
   * de QUAIS bancas seriam tocadas e o que falta em cada uma, o suficiente
   * pra confirmar sem clicar às cegas.
   */
  const bancasParaDistribuir = useMemo(() => {
    const agora = new Date();
    const limite = new Date(agora.getTime() + 7 * 24 * 60 * 60 * 1000);
    return bancas
      .filter((b) => {
        if (!b.data_hora || b.status === "cancelada") return false;
        const dh = paraDataUtc(b.data_hora);
        return dh >= agora && dh <= limite && b.piso_minimo > b.alocados;
      })
      .sort((a, b) => paraDataUtc(a.data_hora!).getTime() - paraDataUtc(b.data_hora!).getTime());
  }, [bancas]);

  const podeAgendar = !!usuario?.permissoes.pode_definir_cronograma;
  const ehDiretor = ehDiretoriaDeProjetos(usuario);
  /** ⭐ Quem decide a aprovação da banca (§5.5, §8) — diretoria de projetos ou
   *  gerente de frente. Grosso de propósito: o backend recusa quem não for
   *  gerente da frente DESTA banca especificamente. */
  const podeAprovar = ehDiretor || usuario?.posicao === "gerente";
  /** Mesma audiência do Dashboard Bancas (2026-09-15, a pedido) — hoje é
   *  exatamente diretor_projetos + gerente, configurável por cargo em
   *  Configurações. Usado pra esconder de quem não gerencia coisas que só
   *  fazem sentido pra gerência/diretoria: a seção de bancas realizadas
   *  aguardando resultado, e o "avaliou" ao lado do nome na ficha da banca. */
  const podeVerDashboardBancas = !!usuario?.permissoes.pode_ver_dashboard_bancas;

  /**
   * `bancasAfetadas` (2026-10-14, a pedido): os detalhes de cada banca
   * (avaliadores por frente, o que o "Ver mais" mostra) moram num cache por
   * id, e recarregar as listas não o tocava. Entrar, sair ou tirar alguém da
   * banca atualizava o banco e a lista, mas a ficha seguia velha até
   * recarregar a página, o que no app instalado nem tem como fazer. Toda ação
   * invalida a(s) banca(s) que mexeu; sem lista, limpa tudo (ação cujo
   * alcance não se sabe aqui, como confirmar uma troca). O prefetch abaixo
   * rebusca o que sumiu.
   */
  async function recarregar(bancasAfetadas?: number[]) {
    if (!token || !usuario) return;
    setDetalhesCache((atual) => {
      if (!Array.isArray(bancasAfetadas)) return {};
      const copia = { ...atual };
      for (const id of bancasAfetadas) delete copia[id];
      return copia;
    });
    setCarregando(true);
    setErro("");
    try {
      const [bancasResp, candidaturasResp, avaliarResp, avaliacoesResp, usuarios, escopos, escoposVendidos, frentes, bancasFrentes, equipesProjeto, formularioAtivo, solicitacoesTroca, esperandoAprovacaoResp, minhasEntradasPendentes, pendentesDeTodos] =
        await Promise.all([
          getBancas(token),
          getCandidaturas(token),
          getBancasParaAvaliar(usuario.id, token),
          getAvaliacoes(token),
          getUsuarios(token),
          getEscopos(token),
          getEscoposVendidos(token),
          getFrentes(token),
          getBancasFrentes(token),
          getEquipesProjeto(token),
          getFormularioAtivo(token).catch(() => null),
          getSolicitacoesTroca(token),
          // Só quem decide (diretoria ou gerente) tem acesso à rota —
          // pedir para os outros só devolveria 403 à toa.
          podeAprovar ? getBancasEsperandoAprovacao(token) : Promise.resolve([]),
          getMinhasEntradaBancaPendentes(token),
          // Quem falta avaliar em cada banca: a rota exige `pode_definir_cronograma`.
          podeAgendar ? getAvaliacoesPendentes(token).catch(() => []) : Promise.resolve([]),
        ]);
      setBancas(bancasResp);
      setCandidaturas(candidaturasResp);
      setParaAvaliar(
        avaliarResp
          .map((item) => bancasResp.find((b) => b.id === item.banca_id))
          .filter((b): b is Banca => b != null)
          .sort(porDataMaisProxima),
      );
      const bancasAvaliadasIds = new Set(
        avaliacoesResp
          .filter((a) => a.avaliador_id === usuario.id && a.status === "submetida")
          .map((a) => a.banca_id),
      );
      const candidaturaBancaIds = new Set(
        candidaturasResp.filter((c) => c.usuario_id === usuario.id).map((c) => c.banca_id),
      );
      setJaAvaliadas(
        bancasResp
          .filter(
            (b) =>
              b.status === "realizada" && bancasAvaliadasIds.has(b.id) && candidaturaBancaIds.has(b.id),
          )
          // Decrescente (mais recente primeiro), e sem data no fim — mesma
          // razão de `porDataMaisProxima`.
          .sort((a, b) => {
            if (!a.data_hora) return b.data_hora ? 1 : 0;
            if (!b.data_hora) return -1;
            return new Date(b.data_hora).getTime() - new Date(a.data_hora).getTime();
          }),
      );
      setContexto({
        usuarios,
        escopos,
        escoposVendidos,
        frentes,
        bancasFrentes,
        equipesProjeto,
        candidaturas: candidaturasResp,
        solicitacoesTroca,
        minhasEntradasPendentes,
        prazosAvaliacao: Object.fromEntries(
          avaliarResp.map((item) => [
            item.banca_id,
            { prazoAvaliacao: item.prazo_avaliacao, prazoExpirado: item.prazo_expirado },
          ]),
        ),
        faltamAvaliar: pendentesDeTodos.reduce<Record<number, number[]>>((mapa, item) => {
          (mapa[item.banca_id] ??= []).push(item.usuario_id);
          return mapa;
        }, {}),
        faltamAvaliarNoPrazo: pendentesDeTodos
          .filter((item) => !item.prazo_expirado)
          .reduce<Record<number, number[]>>((mapa, item) => {
            (mapa[item.banca_id] ??= []).push(item.usuario_id);
            return mapa;
          }, {}),
      });
      setFormulario(formularioAtivo);
      setEsperandoAprovacao(esperandoAprovacaoResp);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao carregar bancas");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    recarregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, usuario]);

  // ⭐ Pré-busca em background os detalhes (avaliadores agrupados) de toda
  // banca da aba Alocação (status "aberta"/"atrasada" — ver
  // `aceitaInscricao`, a aba padrão da tela): sem isto, o "ver mais" só
  // buscava ao abrir, e a demora do Supabase remoto (~10s) fazia o clique
  // parecer travado. `aceitaInscricao(b.status)` sozinho é a união exata das
  // três seções da aba (já alocado + disponíveis + lotadas), sem repetir
  // `candidaturaDe`/`ehDoProprioGrupo` aqui.
  //
  // Concorrência limitada (4 por vez): sem isso, dezenas de bancas disparam
  // dezenas de requests simultâneos contra o mesmo banco lento, piorando a
  // lentidão pra todo mundo — inclusive o `recarregar()` acima. Best-effort:
  // o que falhar aqui cai no fetch on-open do `VerMaisModal` de qualquer jeito.
  useEffect(() => {
    if (!token) return;
    const alvo = bancas.filter((b) => aceitaInscricao(b.status) && !(b.id in detalhesCache));
    if (alvo.length === 0) return;
    let cancelado = false;
    let indice = 0;
    async function worker() {
      while (!cancelado) {
        const i = indice++;
        if (i >= alvo.length) return;
        try {
          const detalhe = await getBancaDetalhes(alvo[i].id, token as string);
          if (!cancelado) {
            setDetalhesCache((atual) => ({ ...atual, [detalhe.id]: detalhe }));
          }
        } catch {
          // silencioso: fallback é o fetch on-open de sempre.
        }
      }
    }
    void Promise.all(Array.from({ length: 4 }, worker));
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bancas, token]);

  /**
   * ⭐ Atualiza só o que a decisão de aprovação mudou, sem recarregar a
   * página inteira (`recarregar()` refaz TODAS as listas — pesado e visível
   * para uma mudança que o próprio backend já devolveu pronta).
   *
   * `situacao` é a resposta de `registrarAprovacaoBanca`, a fonte da verdade
   * do que ficou registrado — não um palpite local.
   */
  function handleAprovacaoDecidida(bancaId: number, resultado: ResultadoBanca | null) {
    setBancas((atual) => atual.map((b) => (b.id === bancaId ? { ...b, resultado } : b)));
    setEsperandoAprovacao((atual) => atual.filter((b) => b.banca_id !== bancaId));
  }

  if (erro) {
    return (
      <ErrorBlock>
        <ErrorText>Não foi possível carregar as bancas: {erro}</ErrorText>
        <PageButton $variant="outline" onClick={() => recarregar()}>
          Tentar novamente
        </PageButton>
      </ErrorBlock>
    );
  }

  if (carregando || !contexto || !usuario) return <PageLoadingBlock />;

  // A narrowing do `!usuario` acima não sobrevive dentro das funções
  // declaradas depois, o TS não sabe quando elas rodam. Segurar o valor
  // numa const resolve sem espalhar `usuario!` pelo arquivo.
  const usuarioLogado = usuario;
  const contextoAtual = contexto;

  function candidaturaDe(bancaId: number) {
    return candidaturas.find((c) => c.banca_id === bancaId && c.usuario_id === usuarioLogado.id);
  }

  // Coordenador ou membro da equipe daquela banca, o próprio grupo, que não
  // pode se candidatar a assistir/avaliar a própria banca.
  function ehDoProprioGrupo(banca: Banca): boolean {
    // `equipe_ids` já vem do backend somando coordenador + equipe do projeto
    // (`projeto_membro`) + a tabela legada. O `equipesProjeto` fica como
    // segunda checagem só para bancas antigas servidas por um backend anterior
    // ao campo, some quando todas tiverem passado por aqui.
    return (
      banca.equipe_ids?.includes(usuarioLogado.id) ||
      banca.coordenador_id === usuarioLogado.id ||
      contextoAtual.equipesProjeto.some((e) => e.banca_id === banca.id && e.usuario_id === usuarioLogado.id)
    );
  }

  const bancasDoProjeto = bancas.filter(ehDoProprioGrupo).sort(porDataMaisProxima);

  const mostrarMeusProjetos = podeAgendar || bancasDoProjeto.length > 0;

  // `aceitaInscricao` no lugar da comparação com a string antiga: uma banca
  // `atrasada` continua nestes baldes. Trocar só o literal a faria sumir da
  // tela inteira.
  const jaAlocado = bancas
    .filter((b) => aceitaInscricao(b.status) && candidaturaDe(b.id))
    .sort(porDataMaisProxima);
  // ⚠ 2026-09-18: "lotada" não é mais só `alocados >= vagas` — o backend
  // (`vaga_disponivel_para_mim`) já considera a reserva das últimas vagas
  // pro piso por frente. A MESMA banca cai em seções diferentes pra pessoas
  // diferentes: falta 1 de Tech, então ela é "lotada" pra quem é de
  // Business e "disponível" pra quem é de Tech.
  const lotadas = bancas
    .filter(
      (b) =>
        aceitaInscricao(b.status) &&
        !candidaturaDe(b.id) &&
        !b.vaga_disponivel_para_mim &&
        !ehDoProprioGrupo(b),
    )
    .sort(porDataMaisProxima);
  const disponiveisParaAlocacao = bancas
    .filter(
      (b) =>
        aceitaInscricao(b.status) &&
        !candidaturaDe(b.id) &&
        b.vaga_disponivel_para_mim &&
        !ehDoProprioGrupo(b),
    )
    .sort(porDataMaisProxima);

  /**
   * **O buraco em que uma banca some da tela.**
   *
   * ⚠ Apesar do nome antigo da seção ("sem avaliador"), o filtro NÃO checa
   * se a banca tem candidato nenhum — só se ELA NÃO ESTÁ na lista pessoal
   * de pendentes/já avaliadas de QUEM ESTÁ OLHANDO a tela. Uma banca com
   * 7 candidatos e 6 avaliações já submetidas cai aqui do mesmo jeito, se
   * quem abriu a página não é um dos avaliadores dela — as pendências são de
   * outras pessoas, não "não tem avaliador". Corrigido o nome pra não prometer
   * "zero avaliador" quando o que a seção garante é só "ainda sem resultado".
   *
   * As três seções de alocação acima exigem `aceitaInscricao`, e `paraAvaliar`
   * só traz banca em que o usuário logado é avaliador alocado. Uma banca
   * registrada como realizada não cai em nenhuma das quatro quando quem olha
   * não é avaliador dela: ela existe no banco, vem no `GET /bancas`, e a
   * interface inteira a ignora.
   *
   * Some sem nenhuma pista de que existiu. Desde que "Registrar realização"
   * saiu (2026-09-04) isto ficou mais comum, não menos: a finalização
   * automática sempre força a realização (`forcar=True`, ver
   * `finalizacao_automatica.py` no backend) — não há mais humano na tela
   * decidindo se vale a pena abaixo do mínimo. Listar aqui é o mínimo para a
   * banca continuar encontrável.
   */
  // ⚠ 2026-10-09, a pedido: uma banca APROVADA com avaliação faltando
  // continua aqui. Antes, registrar o resultado a tirava da seção e ninguém
  // mais via que ainda faltava gente enviar o formulário.
  // 2026-10-13, a pedido: mas só enquanto alguém ainda PODE enviar. Passado
  // o prazo (7 dias da realização, salvo reabertura pela diretoria), quem
  // não avaliou não consegue mais, e a banca com resultado não está
  // aguardando nada. Sem resultado ela fica de qualquer jeito.
  const realizadasAguardandoResultado = bancas
    .filter((b) => {
      if (!b.realizado_em) return false;
      const faltam = (contexto?.faltamAvaliar[b.id] ?? []).length > 0;
      const faltamNoPrazo = (contexto?.faltamAvaliarNoPrazo[b.id] ?? []).length > 0;
      if (b.resultado && !faltamNoPrazo) return false;
      // Se EU sou avaliador pendente, ela já está em "Para avaliar".
      if (paraAvaliar.some((p) => p.id === b.id)) return false;
      // Sem resultado e já avaliada por mim: só fica se faltar outra pessoa.
      if (!b.resultado && jaAvaliadas.some((j) => j.id === b.id) && !faltam) return false;
      return true;
    })
    .sort(porDataMaisProxima);

  async function handleAlocar(bancaId: number) {
    if (!token) return;
    // Sem o try/catch a recusa do backend — "esta vaga está reservada para
    // completar a composição", "banca lotada" — rejeitava a promise em
    // silêncio: nenhum aviso, o botão parecia não ter feito nada. Mesmo
    // modal de erro dos handlers de troca.
    setAvisoErro("");
    try {
      await alocar(bancaId, token);
      recarregar([bancaId]);
    } catch (err) {
      // ⚠ 2026-09-18, a pedido: a recusa por falta de vaga (teto cheio, ou a
      // última reservada pro piso por frente) não é mais um beco sem saída —
      // em vez do aviso de erro sozinho, abre "Solicitar entrada", que manda
      // o pedido pra diretoria decidir.
      if (codigoDoErro(err) === CODIGO_BANCA_LOTADA) {
        const banca = bancas.find((b) => b.id === bancaId);
        if (banca) {
          setBancaSolicitarEntrada(banca);
          return;
        }
      }
      setAvisoErro(err instanceof Error ? err.message : "Não foi possível se alocar");
    }
  }

  /**
   * ⭐ 2026-09-18: pedir para entrar numa banca lotada.
   *
   * `alocado_direto` é o caso raro em que a vaga abriu entre abrir o modal e
   * confirmar — a pessoa já entra, sem pedido nenhum indo pra fila.
   */
  async function handleSolicitarEntrada(bancaId: number, justificativa: string) {
    if (!token) return;
    const resultado = await solicitarEntradaBanca(bancaId, justificativa, token);
    setBancaSolicitarEntrada(null);
    recarregar([bancaId]);
    setAvisoErro(
      resultado.alocado_direto
        ? "A vaga estava livre — você já foi alocado, sem precisar de aprovação."
        : "Pedido enviado à diretoria. Você recebe uma notificação quando ela decidir.",
    );
  }

  /** ⭐ Roda na hora o mesmo rodízio do agendador das 6h (§8).
   *
   *  Diz quantas bancas e quantas pessoas — "nenhuma banca precisava" é
   *  resultado legítimo e frequente (só entram bancas dos próximos 7 dias
   *  ainda abaixo do piso), e sem o texto o clique pareceria não ter feito
   *  nada. */
  async function handleDistribuirAgora() {
    if (!token) return;
    setDistribuindo(true);
    setResultadoPush("");
    setAvisoErro("");
    try {
      const preenchidas = await pushAlocacao(token);
      const pessoas = preenchidas.reduce((total, b) => total + b.usuarios_alocados.length, 0);
      setResultadoPush(
        preenchidas.length === 0
          ? "Nenhuma banca dos próximos 7 dias precisava de gente."
          : `${preenchidas.length} banca(s) preenchida(s), ${pessoas} pessoa(s) escalada(s).`,
      );
      recarregar();
    } catch (err) {
      setAvisoErro(err instanceof Error ? err.message : "Erro ao distribuir avaliadores");
    } finally {
      setDistribuindo(false);
    }
  }

  async function handleDesalocar(bancaId: number) {
    const candidatura = candidaturaDe(bancaId);
    if (!token || !candidatura) return;
    setAvisoErro("");
    try {
      await desalocar(candidatura.id, token);
      recarregar([bancaId]);
    } catch (err) {
      setAvisoErro(err instanceof Error ? err.message : "Não foi possível se desalocar");
    }
  }

  async function handlePedirTroca(bancaId: number) {
    const candidatura = candidaturaDe(bancaId);
    if (!token || !candidatura) return;
    try {
      await createSolicitacaoTroca(candidatura.id, token);
      recarregar([bancaId]);
    } catch (err) {
      setAvisoErro(err instanceof Error ? err.message : "Erro ao pedir troca");
    }
  }

  async function handleConvidarTroca(bancaId: number, usuarioConvidadoId: number) {
    const candidatura = candidaturaDe(bancaId);
    if (!token || !candidatura) return;
    try {
      await createSolicitacaoTroca(candidatura.id, token, usuarioConvidadoId);
      setBancaConvidar(null);
      recarregar([bancaId]);
    } catch (err) {
      setAvisoErro(err instanceof Error ? err.message : "Erro ao convidar para a troca");
    }
  }

  async function handleConfirmarTroca(solicitacaoId: number) {
    if (!token) return;
    try {
      await confirmarSolicitacaoTroca(solicitacaoId, token);
      recarregar();
    } catch (err) {
      setAvisoErro(err instanceof Error ? err.message : "Erro ao confirmar troca");
    }
  }

  async function handleCancelarTroca(solicitacaoId: number) {
    if (!token) return;
    try {
      await cancelarSolicitacaoTroca(solicitacaoId, token);
      recarregar();
    } catch (err) {
      setAvisoErro(err instanceof Error ? err.message : "Erro ao cancelar troca");
    }
  }

  function handleExcluir(banca: Banca) {
    if (!token || !podeGerenciarBanca(banca, usuarioLogado.id, ehDiretor)) return;
    setBancaParaExcluir(banca);
  }

  async function confirmarExclusaoBanca() {
    if (!token || !bancaParaExcluir) return;
    await deleteBanca(bancaParaExcluir.id, token);
    setBancaParaExcluir(null);
    setBancaDetalhe(null);
    setBancaEditar(null);
    recarregar();
  }

  async function handleCancelar() {
    if (!token || !bancaCancelar) return;
    // O erro sobe para o modal mostrar; ele só fecha se deu certo.
    await cancelarBanca(bancaCancelar.id, token);
    setBancaCancelar(null);
    await recarregar([bancaCancelar.id]);
  }

  return (
    <PageStack>
      <PageHeaderRow>
        <PageHeaderText>
          <PageHeading>Bancas</PageHeading>
          <PageSubheading>
            {podeAgendar
              ? "Aloque-se para assistir bancas, avalie as que participou e crie bancas dos seus projetos."
              : "Aloque-se para assistir bancas disponíveis e avalie as que participou."}
          </PageSubheading>
          {ehDiretor && (
            <PageSubheading>
              Bancas dos próximos 7 dias que ainda estiverem sem gente são preenchidas
              automaticamente, por rodízio e priorizando a mesma frente — uma vez só por
              banca, não repetidamente. Cobrir um buraco que sobrar depois é manual: use
              “Distribuir agora” para rodar a distribuição na hora, ou “Alocar pessoas” num
              card para escalar alguém específico.
            </PageSubheading>
          )}
          {resultadoPush && <PageSubheading>{resultadoPush}</PageSubheading>}
        </PageHeaderText>
        <PageHeaderAcoes>
          {/* ⭐ A distribuição automática existia só no agendador das 6h: a
              rota estava pronta e nenhuma tela a chamava, então a diretoria não
              tinha como rodá-la ao fechar uma escala em cima da hora. */}
          {ehDiretor && (
            <PageButton
              type="button"
              $variant="outline"
              disabled={distribuindo}
              onClick={() => setConfirmandoDistribuicao(true)}
            >
              <Users size={16} />
              {distribuindo ? "Distribuindo…" : "Distribuir agora"}
            </PageButton>
          )}
          {podeAgendar && (
            <PageButton type="button" onClick={() => setCriarAberto(true)}>
              <Plus size={16} />
              Criar banca
            </PageButton>
          )}
        </PageHeaderAcoes>
      </PageHeaderRow>

      <TabBar>
        {mostrarMeusProjetos && (
          <TabButton type="button" $ativa={aba === "meus"} onClick={() => setAba("meus")}>
            Meus projetos
            <TabCount>{bancasDoProjeto.length}</TabCount>
          </TabButton>
        )}
        <TabButton type="button" $ativa={aba === "alocacao"} onClick={() => setAba("alocacao")}>
          Alocação
          <TabCount>{jaAlocado.length + disponiveisParaAlocacao.length + lotadas.length}</TabCount>
        </TabButton>
        <TabButton type="button" $ativa={aba === "avaliacao"} onClick={() => setAba("avaliacao")}>
          Avaliação
          <TabCount>
            {paraAvaliar.length + (podeVerDashboardBancas ? realizadasAguardandoResultado.length : 0)}
          </TabCount>
        </TabButton>
        {/* ⭐ Diretoria de projetos e gerente de frente — quem decide a banca
            hoje (§5.5, §8), não mais os avaliadores. */}
        {podeAprovar && (
          <TabButton type="button" $ativa={aba === "aprovacao"} onClick={() => setAba("aprovacao")}>
            Esperando aprovação
            <TabCount>{esperandoAprovacao.length}</TabCount>
          </TabButton>
        )}
        <TabButton type="button" $ativa={aba === "desempenho"} onClick={() => setAba("desempenho")}>
          Desempenho
        </TabButton>
        {/* Por último: as três primeiras são filas de TRABALHO ("o que eu
            preciso fazer"); esta é consulta ("esse horário está livre?"). */}
        <TabButton type="button" $ativa={aba === "calendario"} onClick={() => setAba("calendario")}>
          Calendário
          <TabCount>{bancas.length}</TabCount>
        </TabButton>
      </TabBar>

      {aba === "calendario" && (
        <CalendarioBancas bancas={bancas} onAbrirBanca={setBancaDetalhe} />
      )}

      {aba === "meus" && mostrarMeusProjetos && (
        <SecaoBancas
          bancaDestacada={bancaDestacada}
          refDestacada={refDestacada}
          titulo="Bancas dos meus projetos"
          bancas={bancasDoProjeto}
          contexto={contexto}
          acao="nenhuma"
          usuarioId={usuario.id}
          gerenciar={podeAgendar}
          onVerMais={setBancaDetalhe}
          onEditar={setBancaEditar}
          onExcluir={handleExcluir}
          onCancelar={setBancaCancelar}
          onAlocarPessoas={setBancaAlocar}
          ehDiretorLista={ehDiretor}
          onRegistrarResultado={setBancaResultado}
          podeAprovarLista={podeAprovar}
        />
      )}

      {aba === "alocacao" && (
        <SectionGroup>
          <SecaoBancas
          bancaDestacada={bancaDestacada}
          refDestacada={refDestacada}
            titulo="Já alocado"
            bancas={jaAlocado}
            contexto={contexto}
            acao="deslocar"
            usuarioId={usuario.id}
            gerenciar={podeAgendar}
            onCancelar={setBancaCancelar}
            onAlocarPessoas={setBancaAlocar}
            ehDiretorLista={ehDiretor}
            onRegistrarResultado={setBancaResultado}
          podeAprovarLista={podeAprovar}
            onAcao={handleDesalocar}
            onPedirTroca={handlePedirTroca}
            onConvidar={setBancaConvidar}
            onCancelarTroca={handleCancelarTroca}
            onVerMais={setBancaDetalhe}
          />
          <SecaoBancas
          bancaDestacada={bancaDestacada}
          refDestacada={refDestacada}
            titulo="Disponíveis para alocação"
            bancas={disponiveisParaAlocacao}
            contexto={contexto}
            filtrarPorFrente
            acao="alocar"
            usuarioId={usuario.id}
            gerenciar={podeAgendar}
            onAcao={handleAlocar}
            onCancelar={setBancaCancelar}
            onAlocarPessoas={setBancaAlocar}
            ehDiretorLista={ehDiretor}
            onRegistrarResultado={setBancaResultado}
          podeAprovarLista={podeAprovar}
            onVerMais={setBancaDetalhe}
          />
          <SecaoBancas
          bancaDestacada={bancaDestacada}
          refDestacada={refDestacada}
            titulo="Com alocação máxima"
            bancas={lotadas}
            contexto={contexto}
            acao="nenhuma"
            usuarioId={usuario.id}
            gerenciar={podeAgendar}
            onCancelar={setBancaCancelar}
            onAlocarPessoas={setBancaAlocar}
            ehDiretorLista={ehDiretor}
            onRegistrarResultado={setBancaResultado}
          podeAprovarLista={podeAprovar}
            onVerMais={setBancaDetalhe}
            onSolicitarEntrada={setBancaSolicitarEntrada}
          />
          <SecaoTrocas
            solicitacoes={contexto.solicitacoesTroca}
            bancas={bancas}
            usuarios={contexto.usuarios}
            usuarioId={usuario.id}
            onConfirmar={handleConfirmarTroca}
            onCancelar={handleCancelarTroca}
          />
        </SectionGroup>
      )}

      {aba === "avaliacao" && (
        <SectionGroup>
          <SecaoBancas
          bancaDestacada={bancaDestacada}
          refDestacada={refDestacada}
            titulo="Com avaliação pendente"
            bancas={paraAvaliar}
            contexto={contexto}
            acao="avaliar"
            gerenciar={podeAgendar}
            onCancelar={setBancaCancelar}
            onAlocarPessoas={setBancaAlocar}
            ehDiretorLista={ehDiretor}
            onRegistrarResultado={setBancaResultado}
          podeAprovarLista={podeAprovar}
            onAcao={(id) => setBancaAvaliar(paraAvaliar.find((b) => b.id === id) ?? null)}
            onVerMais={setBancaDetalhe}
          />
          {/* Realizada e sem resultado, mas fora da visão pessoal de quem
              olha (ver `realizadasAguardandoResultado`) — não quer dizer que
              não tenha avaliador NENHUM, só que os avaliadores dela, se
              houver, não são quem está com a tela aberta agora. Estas não
              caem em nenhuma das outras seções: as de alocação exigem status
              aberto, e a de avaliação pendente só lista quem é avaliador. Sem
              esta seção elas existiam no banco e a tela inteira as ignorava.

              A decisão (diretoria + gerente da frente) acontece pela própria
              seção, ou na aba "Esperando aprovação" ao lado. */}
          {/* Só quem gerencia (2026-09-15, a pedido): diretoria/gerência é
              quem decide o resultado ou aloca reforço aqui — o resto do time
              não tem ação nenhuma a tomar nessas bancas e só ficaria confuso
              vendo uma banca "sem avaliador" que talvez nem seja da equipe
              dele. */}
          {podeVerDashboardBancas && realizadasAguardandoResultado.length > 0 && (
            <SecaoBancas
              bancaDestacada={bancaDestacada}
              refDestacada={refDestacada}
              titulo="Realizadas aguardando resultado ou avaliações"
              bancas={realizadasAguardandoResultado}
              contexto={contexto}
              acao="nenhuma"
              usuarioId={usuario.id}
              gerenciar={podeAgendar}
              onAlocarPessoas={setBancaAlocar}
              ehDiretorLista={ehDiretor}
              onRegistrarResultado={setBancaResultado}
          podeAprovarLista={podeAprovar}
              onVerMais={setBancaDetalhe}
            />
          )}
          {/* "Avaliadas" saiu daqui — virou o histórico da aba Desempenho, pra
              não mostrar a mesma banca avaliada em dois lugares diferentes.
              Esta aba fica só com o que pede ação; o retrospecto mora lá. */}
        </SectionGroup>
      )}

      {aba === "aprovacao" && podeAprovar && (
        <SecaoEsperandoAprovacao
          itens={esperandoAprovacao}
          token={token}
          onDecidiu={handleAprovacaoDecidida}
        />
      )}

      {aba === "desempenho" && <Desempenho embutido />}

      <VerMaisModal
        banca={bancaDetalhe}
        contexto={contexto}
        usuarioId={usuario.id}
        token={token}
        detalhesCache={detalhesCache}
        onDetalheCarregado={(d) => setDetalhesCache((atual) => ({ ...atual, [d.id]: d }))}
        onClose={() => setBancaDetalhe(null)}
        onEditar={setBancaEditar}
        onExcluir={handleExcluir}
        onRegistrarResultado={setBancaResultado}
          podeAprovarLista={podeAprovar}
        ehDiretor={!!ehDiretor}
        podeGerirMembros={!!usuario.permissoes.pode_gerir_membros}
        podeVerAvaliou={podeVerDashboardBancas}
        onDescricaoEnviada={recarregar}
        onAlterou={() => recarregar(bancaDetalhe ? [bancaDetalhe.id] : undefined)}
      />

      {bancaConvidar && contexto && (
        <ConvidarTrocaModal
          banca={bancaConvidar}
          contexto={contexto}
          usuarioId={usuario.id}
          onConvidar={(usuarioConvidadoId) => handleConvidarTroca(bancaConvidar.id, usuarioConvidadoId)}
          onClose={() => setBancaConvidar(null)}
        />
      )}

      {bancaSolicitarEntrada && (
        <SolicitarEntradaBancaModal
          banca={bancaSolicitarEntrada}
          onSolicitar={(justificativa) => handleSolicitarEntrada(bancaSolicitarEntrada.id, justificativa)}
          onClose={() => setBancaSolicitarEntrada(null)}
        />
      )}

      {confirmandoDistribuicao && (
        <ConfirmarModal
          titulo="Distribuir agora"
          mensagem={
            bancasParaDistribuir.length === 0 ? (
              "Nenhuma banca dos próximos 7 dias parece precisar de gente agora — pode rodar mesmo assim, não deve alocar ninguém."
            ) : (
              <>
                <p style={{ margin: "0 0 0.5rem" }}>
                  Vai tentar preencher, por rodízio, {bancasParaDistribuir.length}{" "}
                  {bancasParaDistribuir.length === 1 ? "banca" : "bancas"} dos próximos 7 dias:
                </p>
                <ul style={{ margin: "0 0 0.5rem", paddingLeft: "1.25rem" }}>
                  {bancasParaDistribuir.map((b) => (
                    <li key={b.id}>
                      <strong>{b.nome_projeto}</strong> — {formatarDataHora(b.data_hora)} — falta{" "}
                      {resumoDoQueFalta(b.composicao) || `${b.piso_minimo - b.alocados} vaga(s)`}
                    </li>
                  ))}
                </ul>
                <p style={{ margin: 0, fontSize: "0.8rem", opacity: 0.8 }}>
                  O sorteio pode não conseguir cobrir tudo — se não houver ninguém disponível
                  daquela frente ou liderança, a vaga fica em aberto mesmo assim.
                </p>
              </>
            )
          }
          rotuloConfirmar="Distribuir agora"
          rotuloProcessando="Distribuindo…"
          onCancelar={() => setConfirmandoDistribuicao(false)}
          onConfirmar={async () => {
            await handleDistribuirAgora();
            setConfirmandoDistribuicao(false);
          }}
        />
      )}

      {bancaCancelar && token && (
        <ConfirmarModal
          titulo="Cancelar banca"
          mensagem={
            bancaCancelar.realizado_em
              ? `Cancelar a banca de "${bancaCancelar.nome_projeto}"? Ela já tinha sido marcada como realizada, mas isto desfaz: volta a "não aconteceu", e a avaliação de desempenho de finalização que abriu sozinha é fechada (ou apagada, se ninguém ainda respondeu nada). Use só pra imprevisto de última hora — se ela realmente aconteceu, isto não é o botão certo.`
              : `Cancelar a banca de "${bancaCancelar.nome_projeto}"? Ela não vai acontecer, e não abrirá sozinha a avaliação de banca nem a de desempenho de finalização.`
          }
          rotuloConfirmar="Cancelar banca"
          rotuloProcessando="Cancelando…"
          onCancelar={() => setBancaCancelar(null)}
          onConfirmar={handleCancelar}
        />
      )}

      {bancaResultado && token && (
        <AprovarBancaModal
          banca={bancaResultado}
          token={token}
          onFechar={() => setBancaResultado(null)}
          onRegistrou={(resultado) => {
            handleAprovacaoDecidida(bancaResultado.id, resultado);
            setBancaResultado(null);
          }}
        />
      )}

      {bancaAlocar && token && contexto && (
        <AlocarPessoasModal
          banca={bancaAlocar}
          usuarios={contexto.usuarios}
          candidaturas={candidaturas}
          equipes={contexto.equipesProjeto}
          token={token}
          onFechar={() => setBancaAlocar(null)}
          onAlocou={() => recarregar([bancaAlocar.id])}
        />
      )}

      {criarAberto && token && (
        <BancaFormModal
          dados={contexto}
          token={token}
          ehDiretor={ehDiretoriaDeProjetos(usuario)}
          onClose={() => setCriarAberto(false)}
          onSalvo={() => {
            setCriarAberto(false);
            recarregar();
          }}
        />
      )}

      {bancaEditar && token && (
        <BancaFormModal
          banca={bancaEditar}
          dados={contexto}
          token={token}
          ehDiretor={ehDiretoriaDeProjetos(usuario)}
          onClose={() => setBancaEditar(null)}
          onSalvo={() => {
            setBancaEditar(null);
            setBancaDetalhe(null);
            recarregar([bancaEditar.id]);
          }}
        />
      )}

      {bancaAvaliar && token && (
        <AvaliarModal
          banca={bancaAvaliar}
          formulario={formulario}
          escopos={contexto.escopos}
          token={token}
          onClose={() => setBancaAvaliar(null)}
          onEnviada={() => {
            setBancaAvaliar(null);
            recarregar();
          }}
        />
      )}

      {bancaParaExcluir && (
        <ConfirmarModal
          titulo="Excluir banca"
          mensagem={`Excluir a banca "${bancaParaExcluir.nome_projeto}"? Esta ação não pode ser desfeita.`}
          onCancelar={() => setBancaParaExcluir(null)}
          onConfirmar={confirmarExclusaoBanca}
        />
      )}

      {avisoErro && <AlertModal mensagem={avisoErro} onFechar={() => setAvisoErro("")} />}
    </PageStack>
  );
}

function SecaoBancas({
  titulo,
  bancas,
  contexto,
  acao,
  onAcao,
  onVerMais,
  usuarioId,
  gerenciar,
  onEditar,
  onExcluir,
  onCancelar,
  onAlocarPessoas,
  onRegistrarResultado,
  ehDiretorLista,
  podeAprovarLista,
  onPedirTroca,
  onConvidar,
  onCancelarTroca,
  onSolicitarEntrada,
  filtrarPorFrente,
  bancaDestacada,
  refDestacada,
}: {
  titulo: string;
  bancas: Banca[];
  contexto: Contexto;
  /* Vem de /bancas?banca=123, o link do card do monitoramento. */
  bancaDestacada?: number | null;
  refDestacada?: React.Ref<HTMLDivElement>;
  acao: "nenhuma" | "alocar" | "deslocar" | "avaliar";
  onAcao?: (bancaId: number) => void;
  onVerMais: (banca: Banca) => void;
  usuarioId?: number;
  gerenciar?: boolean;
  onEditar?: (banca: Banca) => void;
  onExcluir?: (banca: Banca) => void;
  /** ⭐ Abre a confirmação de cancelamento (2026-09-04, a pedido) — a única
   *  saída manual que resta desde que "Registrar realização" saiu. Só faz
   *  sentido em banca que ainda não aconteceu nem foi cancelada. */
  onCancelar?: (banca: Banca) => void;
  /** Abre a alocação manual, só faz sentido enquanto a banca não aconteceu. */
  onAlocarPessoas?: (banca: Banca) => void;
  /** Abre a decisão de aprovação, só faz sentido em banca já realizada. */
  onRegistrarResultado?: (banca: Banca) => void;
  /** Alocar OUTRA pessoa é ação de diretoria, diferente de gerenciar. */
  ehDiretorLista?: boolean;
  /** ⭐ Quem decide a aprovação (§5.5, §8): diretoria de projetos OU gerente
   *  de frente — diferente de `ehDiretorLista`, que é só diretoria. */
  podeAprovarLista?: boolean;
  onPedirTroca?: (bancaId: number) => void;
  /** Abre o picker de convite específico, alternativa ao pedido aberto. */
  onConvidar?: (banca: Banca) => void;
  onCancelarTroca?: (solicitacaoId: number) => void;
  /** ⭐ 2026-09-18: pedir para entrar mesmo com a banca lotada. Só nas bancas
   *  que já chegam aqui aceitando inscrição e sem ser do próprio grupo (a
   *  seção "Com alocação máxima" já filtra isso) — a checagem de sobra fica
   *  no backend de qualquer forma. */
  onSolicitarEntrada?: (banca: Banca) => void;
  /** Liga o filtro por frente e a separação da lista em blocos de frente.
   *  Só faz sentido em fila de ESCOLHA — quem procura banca para se alocar
   *  procura a da frente dele. Nas outras seções a lista é curta e já é
   *  sobre bancas que a pessoa tem em mãos. */
  filtrarPorFrente?: boolean;
}) {
  const [frenteFiltro, setFrenteFiltro] = useState(TODAS_FRENTES);
  const idFiltroFrente = `frente-${titulo.replace(/\s+/g, "-").toLowerCase()}`;

  /** Só as frentes que aparecem NESTAS bancas: oferecer o catálogo inteiro
   *  encheria o filtro de opção que não recorta nada. */
  const frentesDaLista = useMemo(() => {
    const nomes = new Set<string>();
    for (const banca of bancas) {
      for (const nome of frentesOuSemFrente(contexto, banca)) nomes.add(nome);
    }
    return [...nomes].sort((a, b) =>
      a === SEM_FRENTE ? 1 : b === SEM_FRENTE ? -1 : compararFrentes(a, b),
    );
  }, [bancas, contexto]);

  const visiveis = useMemo(() => {
    if (!filtrarPorFrente || frenteFiltro === TODAS_FRENTES) return bancas;
    return bancas.filter((banca) =>
      frentesOuSemFrente(contexto, banca).includes(frenteFiltro),
    );
  }, [bancas, contexto, filtrarPorFrente, frenteFiltro]);

  /** Com uma frente escolhida o agrupamento some: seria um bloco só, com um
   *  cabeçalho repetindo o que o filtro ao lado já diz. */
  const agrupado = !!filtrarPorFrente && frenteFiltro === TODAS_FRENTES;

  /**
   * A lista em blocos de frente, cada bloco na ordem de data que já vinha de
   * fora — agrupar não reordena nada dentro do bloco.
   *
   * Banca de duas frentes aparece nos dois blocos, de propósito: quem
   * procura a banca da frente dele precisa achá-la ali, e não num bloco
   * combinado que ele não pensaria em abrir. É o mesmo critério do painel de
   * alocação em Vagas.
   */
  const grupos = useMemo((): [string, Banca[]][] => {
    if (!agrupado) return [[frenteFiltro, visiveis]];
    const mapa = new Map<string, Banca[]>();
    for (const banca of visiveis) {
      for (const chave of frentesOuSemFrente(contexto, banca)) {
        mapa.set(chave, [...(mapa.get(chave) ?? []), banca]);
      }
    }
    return [...mapa.entries()].sort((a, b) =>
      a[0] === SEM_FRENTE ? 1 : b[0] === SEM_FRENTE ? -1 : compararFrentes(a[0], b[0]),
    );
  }, [agrupado, contexto, frenteFiltro, visiveis]);

  /** O cartão de uma banca. Função nomeada, e não um callback inline,
   *  porque a lista passou a ser renderizada em grupos: o mesmo cartão é
   *  usado dentro de cada frente. */
  function cartaoDe(banca: Banca) {
    // Banca sem data existe (é o estado `nao_marcada`) e chegava aqui
    // como "Invalid Date" nos três campos, porque `paraDataUtc(null)`
    // devolve data inválida em silêncio.
    const dataHora = banca.data_hora ? paraDataUtc(banca.data_hora) : null;
    const diaSemana = dataHora
      ? dataHora.toLocaleDateString("pt-BR", { timeZone: FUSO, weekday: "short" }).replace(".", "")
      : "";
    const mes = dataHora ? dataHora.toLocaleDateString("pt-BR", { timeZone: FUSO, month: "short" }).replace(".", "") : "";
    const hora = dataHora
      ? dataHora.toLocaleTimeString("pt-BR", { timeZone: FUSO, hour: "2-digit", minute: "2-digit" })
      : "";
    // ⚠ 2026-09-18: não é mais só o teto — `vaga_disponivel_para_mim` já
    // considera a reserva das últimas vagas pro piso por frente. A seção
    // "Disponíveis" só lista banca com vaga PRA ESTA PESSOA, então `lotada`
    // aqui deveria vir sempre `false` por construção; a fórmula fica pela
    // mesma pessoa, não pela bucketização de fora.
    const lotada = acao === "alocar" && !banca.vaga_disponivel_para_mim;
    // Independe da `acao`: a seção "Com alocação máxima" mostra o selo de
    // ESTADO (`acao === "nenhuma"`), e "Aberta para inscrições" numa banca
    // cheia se contradiz. Aqui a inscrição está fechada de fato.
    const alocacaoCompleta = banca.alocados >= banca.vagas;
    // ⭐ 2026-09-18, a pedido: quem já pediu não vê o botão de pedir de
    // novo — a tela mostra que o pedido está esperando decisão, em vez de
    // deixar parecer que nada foi enviado.
    const minhaEntradaPendente = contexto.minhasEntradasPendentes.some(
      (p) => p.banca_id === banca.id,
    );
    const podeGerenciar =
      gerenciar &&
      usuarioId != null &&
      podeGerenciarBanca(banca, usuarioId, ehDiretorLista);
    // Banca legada (sem escopo vendido vinculado) mostra o escopo do
    // catálogo, singular, como sempre foi. Banca costurada a
    // escopo(s) do projeto mostra todos os que ela cobre, uma
    // banca pode juntar mais de um, e o campo antigo só
    // guardava o primeiro.
    const nomesEscopos =
      banca.projeto_escopo_ids.length > 0
        ? banca.projeto_escopo_ids
            .map((id) => contexto.escoposVendidos.find((e) => e.id === id)?.nome)
            .filter((nome): nome is string => !!nome)
        : [nomeEscopo(contexto.escopos, banca.escopo_id)];
    const minhaCandidatura =
      acao === "deslocar" && usuarioId != null
        ? contexto.candidaturas.find((c) => c.banca_id === banca.id && c.usuario_id === usuarioId)
        : undefined;
    const minhaSolicitacaoPendente = minhaCandidatura
      ? contexto.solicitacoesTroca.find(
          (s) => s.candidatura_id === minhaCandidatura.id && s.status === "pendente",
        )
      : undefined;
    const prazo = acao === "avaliar" ? contexto.prazosAvaliacao[banca.id] : undefined;
    const prazoExpirado = !!prazo?.prazoExpirado;

    // ⚠ **A trava dos 7 dias (2026-09-09, refinada 2026-09-11) NÃO se
    // antecipa mais aqui.** Chegou a existir uma cópia client-side —
    // `alocados >= piso_minimo` — mas essa é a conta da banca INTEIRA; a
    // regra virou por PESSOA (`DeleteCandidaturaUseCase.
    // _saida_quebraria_composicao`, que confere a composição por frente SEM
    // esta pessoa) e o card não tem esse dado. A cópia velha desabilitava o
    // botão pra todo mundo, inclusive quem sair não quebraria nada — exatamente
    // o bug que motivou o refino. Agora o botão fica ativo e a resposta do
    // backend (`avisoErro`, em `handleDesalocar`) é quem diz se travou.

    // ⭐ A composição exigida (§8), que até aqui não aparecia em
    // lugar nenhum desta tela: o card mostrava só `vagas`, o TETO de
    // quantos cabem. Quem escala precisa do outro número — quantos
    // a banca ainda PRECISA, e de qual frente.
    const faltando = totalFaltando(banca.composicao);
    const oQueFalta = resumoDoQueFalta(banca.composicao);

    /**
     * ⭐ Por que o botão está cinza — e, principalmente, **o que
     * fazer agora**.
     *
     * O rótulo já dizia "Lotada" e "Prazo esgotado", que nomeiam o
     * estado e deixam a pessoa exatamente onde ela estava: sem saber
     * se é definitivo, se dá para contornar, ou com quem falar. As
     * três partes de toda mensagem da plataforma são o que está
     * bloqueado, por quê, e a saída.
     */
    const motivoBloqueio = lotada
      ? `Esta banca já tem ${banca.vagas} avaliadores, que é o máximo. ` +
        "Peça troca a quem já está alocado, ou volte se alguém se desalocar."
      : prazoExpirado
        ? "O prazo de 7 dias corridos para avaliar acabou" +
          (prazo?.prazoAvaliacao
            ? ` em ${formatarDataHora(prazo.prazoAvaliacao)}. `
            : ". ") +
          "A plataforma não aceita mais o envio. Avise a diretoria se esta avaliação ainda precisa entrar."
        : null;

    // 2026-10-05, a pedido: na aba Avaliação, quem clica no card quer
    // AVALIAR, não ler avaliadores/local/entrega. O "Avaliar" miúdo do
    // rodapé não devia ser o único caminho. Nas outras abas o card segue
    // abrindo o detalhe. Com o prazo esgotado não há o que abrir além do
    // detalhe, então ele volta a ser o destino.
    function abrirPeloCard() {
      if (acao === "avaliar" && onAcao && !prazoExpirado) {
        onAcao(banca.id);
        return;
      }
      onVerMais(banca);
    }

    // Qualquer clique dentro do rodapé de ações não deve também
    // disparar o clique do card inteiro (que abre "Ver mais").
    function pararPropagacao<T extends unknown[]>(fn?: (...args: T) => void) {
      return (e: React.MouseEvent, ...args: T) => {
        e.stopPropagation();
        fn?.(...args);
      };
    }

    return (
      <BancaCard
        key={banca.id}
        $destacada={banca.id === bancaDestacada}
        ref={banca.id === bancaDestacada ? refDestacada : undefined}
        role="button"
        tabIndex={0}
        onClick={abrirPeloCard}
        onKeyDown={(e) => {
          if (e.key === "Enter") abrirPeloCard();
        }}
      >
        <BancaData>
          {dataHora ? (
            <>
              <BancaDataDiaSemana>{diaSemana}</BancaDataDiaSemana>
              <BancaDataDia>{partesEmBrasilia(dataHora).dia}</BancaDataDia>
              <BancaDataMes>{mes}</BancaDataMes>
            </>
          ) : (
            <BancaSemData title="Banca ainda não marcada">
              <span>Sem</span>
              <span>data</span>
            </BancaSemData>
          )}
        </BancaData>

        <BancaInfo>
          <BancaNomeLinha>
            <BancaNome>{banca.nome_projeto}</BancaNome>
            {nomesEscopos.map((nome, i) => (
              <PageBadge key={`${nome}-${i}`} $tone="muted">
                {nome}
              </PageBadge>
            ))}
            {/* O selo de ESTADO (Inscrito, vaga(s), prazo) fica à
                direita, separado do que a banca É (nome, escopo)
                por alinhamento, não só por ser outra cor de badge. */}
            <BancaStatusBadges>
              {acao === "avaliar" && (
                <PageBadge $tone={prazoExpirado ? "danger" : "warning"}>
                  {prazoExpirado
                    ? "Prazo esgotado"
                    : prazo
                      ? `Prazo: ${formatarDataHoraBanca(prazo.prazoAvaliacao)}`
                      : "Pendente"}
                </PageBadge>
              )}
              {acao === "nenhuma" &&
                banca.realizado_em &&
                (contexto.faltamAvaliar[banca.id] ?? []).map((uid) => (
                  <PageBadge key={uid} $tone="warning">
                    Falta avaliar: {contexto.usuarios.find((u) => u.id === uid)?.nome.split(" ")[0] ?? `#${uid}`}
                  </PageBadge>
                ))}
              {acao === "deslocar" && <PageBadge $tone="default">Inscrito</PageBadge>}
              {acao === "alocar" &&
                (lotada ? (
                  <PageBadge $tone="danger">Lotada</PageBadge>
                ) : (
                  <PageBadge $tone="success">{banca.vagas - banca.alocados} vaga(s)</PageBadge>
                ))}
              {acao === "nenhuma" &&
                (onSolicitarEntrada ? (
                  // ⚠ 2026-09-18, corrigido: esta seção é SEMPRE "sem vaga
                  // pra você" (é a bucketização de fora que garante isso,
                  // via `vaga_disponivel_para_mim`) — mostrar o status cru
                  // da banca aqui ("Aberta para inscrições") contradizia o
                  // próprio card quando ela não estava no teto cheio, só
                  // com a última vaga reservada pra outra frente. A mesma
                  // frase da mensagem do modal de "Solicitar entrada".
                  <PageBadge $tone="danger">Sem vaga para você</PageBadge>
                ) : alocacaoCompleta && banca.status === "aberta" ? (
                  <PageBadge $tone="default">Lotada</PageBadge>
                ) : (
                  <PageBadge $tone={tomDoStatusBanca(banca.status)}>
                    {ROTULO_STATUS_BANCA[banca.status]}
                  </PageBadge>
                ))}
              {/* A banca que ainda não fecha a composição, dita em
                  gente e em frente — "Faltam 2" sozinho manda
                  procurar quem, e a resposta está aqui do lado. */}
              {faltando > 0 && !banca.realizado_em && (
                <PageBadge $tone="warning" title={`Faltam ${oQueFalta}`}>
                  Faltam {faltando}
                </PageBadge>
              )}
            </BancaStatusBadges>
          </BancaNomeLinha>
          <BancaMetaLinha>
            <BancaMetaItem>
              <Clock size={12} />
              {hora}
            </BancaMetaItem>
            <BancaMetaItem>
              <User size={12} />
              {nomeUsuario(contexto.usuarios, banca.coordenador_id)}
            </BancaMetaItem>
            <BancaMetaItem>
              <Users size={12} />
              {banca.alocados}/{banca.vagas} alocados
            </BancaMetaItem>
            {/* O mínimo da composição ao lado do teto: são números
                diferentes e a tela mostrava só o segundo, o que
                fazia "0/6 alocados" parecer a única régua. */}
            {banca.piso_minimo > 0 && (
              <BancaMetaItem title={oQueFalta ? `Faltam ${oQueFalta}` : undefined}>
                <ShieldCheck size={12} />
                mínimo {banca.piso_minimo}
                {oQueFalta ? ` · faltam ${oQueFalta}` : ""}
              </BancaMetaItem>
            )}
          </BancaMetaLinha>
        </BancaInfo>

        <BancaCardFooter>
          <BancaAcoesSecundarias>
            {podeGerenciar && onEditar && (
              <PageButtonSm $variant="outline" type="button" onClick={pararPropagacao(() => onEditar(banca))}>
                Editar
              </PageButtonSm>
            )}
            {podeGerenciar && onExcluir && (
              <PageButtonSm $variant="outline" type="button" onClick={pararPropagacao(() => onExcluir(banca))}>
                Excluir
              </PageButtonSm>
            )}

            {/* Escalar à mão: a diretoria não precisa esperar a
                janela de uma semana do push para preencher uma
                banca vazia. Sem checar `realizado_em` (2026-09-15, a
                pedido): diretoria também corrige a ficha de uma banca
                que já aconteceu — o backend já aceita isso pra quem
                gere membros. */}
            {ehDiretorLista && onAlocarPessoas && (
              <PageButtonSm
                $variant="outline"
                type="button"
                onClick={pararPropagacao(() => onAlocarPessoas(banca))}
              >
                Alocar pessoas
              </PageButtonSm>
            )}

            {/* ⭐ A saída pra "isto não vai acontecer" (2026-09-04, a
                pedido). Não existe mais "Registrar realização":
                `data_hora` passar sozinho já marca a banca como
                realizada e dispara as avaliações. Cancelar é a única
                ação manual que resta, e é gestão de calendário, não
                condução do projeto — por isso `podeAprovarLista`
                (diretoria de projetos OU gerente de frente, a mesma
                régua do backend em `require_gestao`), e não
                `gerenciar` (`pode_definir_cronograma`, que a
                coordenação também tem).

                ⭐ 2026-09-05: continua disponível mesmo já realizada —
                o imprevisto de última hora também se desfaz por aqui,
                inclusive a avaliação de desempenho que abriu sozinha.
                Só some depois de cancelada de fato. */}
            {podeAprovarLista && onCancelar && banca.status !== "cancelada" && (
              <PageButtonSm $variant="outline" type="button" onClick={pararPropagacao(() => onCancelar(banca))}>
                Cancelar banca
              </PageButtonSm>
            )}

            {/* ⭐ Só quando a banca JÁ aconteceu e continua sem
                veredito — e só para quem decide (diretoria de
                projetos ou gerente de frente). O backend recusa quem
                não for gerente da frente DESTA banca. */}
            {podeAprovarLista && onRegistrarResultado && banca.realizado_em && !banca.resultado && (
              <PageButtonSm
                $variant="outline"
                type="button"
                onClick={pararPropagacao(() => onRegistrarResultado(banca))}
              >
                Aprovar banca
              </PageButtonSm>
            )}
            {acao === "deslocar" && minhaCandidatura && (
              <>
                {minhaSolicitacaoPendente && onCancelarTroca ? (
                  <PageButtonSm
                    $variant="outline"
                    type="button"
                    onClick={pararPropagacao(() => onCancelarTroca(minhaSolicitacaoPendente.id))}
                  >
                    Cancelar troca
                  </PageButtonSm>
                ) : (
                  <>
                    {onPedirTroca && (
                      <PageButtonSm
                        $variant="outline"
                        type="button"
                        title="Abre o pedido pra qualquer pessoa elegível: quem confirmar primeiro assume sua vaga."
                        onClick={pararPropagacao(() => onPedirTroca(banca.id))}
                      >
                        Pedir troca
                      </PageButtonSm>
                    )}
                    {onConvidar && (
                      <PageButtonSm
                        $variant="outline"
                        type="button"
                        title="Convida uma pessoa específica pra assumir sua vaga; só ela pode confirmar."
                        onClick={pararPropagacao(() => onConvidar(banca))}
                      >
                        Convidar alguém
                      </PageButtonSm>
                    )}
                  </>
                )}
              </>
            )}
          </BancaAcoesSecundarias>

          {acao !== "nenhuma" && onAcao && (
            <MotivoDesabilitado motivo={motivoBloqueio}>
              <PageButtonSm
                $variant={acao === "deslocar" ? "outline" : "primary"}
                type="button"
                disabled={lotada || prazoExpirado}
                onClick={pararPropagacao(() => onAcao(banca.id))}
              >
                {lotada
                  ? "Lotada"
                  : prazoExpirado
                    ? "Prazo esgotado"
                    : acao === "alocar"
                      ? "Alocar-se"
                      : acao === "deslocar"
                        ? "Desalocar-se"
                        : "Avaliar"}
              </PageButtonSm>
            </MotivoDesabilitado>
          )}
          {onSolicitarEntrada &&
            (minhaEntradaPendente ? (
              <PageBadge
                $tone="warning"
                title="Você já pediu para entrar nesta banca — a diretoria ainda não decidiu."
              >
                Aguardando aprovação
              </PageBadge>
            ) : (
              <PageButtonSm
                type="button"
                $variant="outline"
                onClick={pararPropagacao(() => onSolicitarEntrada(banca))}
              >
                Solicitar entrada
              </PageButtonSm>
            ))}
        </BancaCardFooter>
      </BancaCard>
    );
  }

  return (
    <PageCard>
      <PageCardHeader>
        <CardHeaderTitulo>
          <PageCardTitle>{titulo}</PageCardTitle>
          {bancas.length > 0 && filtrarPorFrente && frentesDaLista.length > 1 && (
            <FiltroFrenteSelect
              id={idFiltroFrente}
              value={frenteFiltro}
              aria-label="Filtrar por frente"
              onChange={(e) => setFrenteFiltro(e.target.value)}
            >
              <option value={TODAS_FRENTES}>Todas as frentes</option>
              {frentesDaLista.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </FiltroFrenteSelect>
          )}
        </CardHeaderTitulo>
        <PageBadge $tone="muted">{visiveis.length}</PageBadge>
      </PageCardHeader>
      <PageCardContent>
        {/* ⭐ 2026-09-18, a pedido: sem isto, quem cai aqui via a banca
            lotada e parava — nada dizia que dava pra pedir entrada mesmo
            assim. O aviso é do CARD (aparece uma vez), não de cada linha,
            porque é uma explicação da seção, não de uma banca específica. */}
        {onSolicitarEntrada && bancas.length > 0 && (
          <EmptyText style={{ marginBottom: "0.75rem" }}>
            Mesmo lotada, dá pra pedir entrada — a diretoria decide.
          </EmptyText>
        )}
        {bancas.length === 0 && <EmptyText>Nenhuma banca aqui.</EmptyText>}
        {bancas.length > 0 && visiveis.length === 0 && (
          <EmptyText>Nenhuma banca desta frente.</EmptyText>
        )}
        {visiveis.length > 0 && (
          <BancaCardScrollWrap $scrollable={visiveis.length > LIST_MAX_VISIVEIS}>
            {grupos.map(([nomeGrupo, doGrupo]) => (
              <FrenteGrupo key={nomeGrupo}>
                {/* O cabeçalho some com uma frente escolhida: repetiria o filtro. */}
                {agrupado && (
                  <FrenteGrupoTitulo>
                    {nomeGrupo} · {doGrupo.length}
                  </FrenteGrupoTitulo>
                )}
                {doGrupo.map(cartaoDe)}
              </FrenteGrupo>
            ))}
          </BancaCardScrollWrap>
        )}
      </PageCardContent>
    </PageCard>
  );
}

/**
 * "Esperando aprovação" — bancas realizadas que ainda não têm decisão
 * (diretoria de projetos ou gerente da frente, §5.5, §8).
 *
 * Qualquer um decide sozinho: diretoria de projetos ou o gerente de qualquer
 * frente da banca aprova ou reprova, sem esperar mais ninguém. Não há mais
 * prazo aberto tipo "ainda dá para esperar": a decisão é sempre possível
 * assim que a banca aconteceu, por isso toda linha já oferece Aprovar e
 * Reprovar direto, sem passo intermediário.
 */
function SecaoEsperandoAprovacao({
  itens,
  token,
  onDecidiu,
}: {
  itens: BancaEsperandoAprovacao[];
  token: string | null;
  /** Atualiza o estado local com o resultado que o backend acabou de gravar
   *  — sem recarregar a página inteira. */
  onDecidiu: (bancaId: number, resultado: ResultadoBanca | null) => void;
}) {
  const [decidindo, setDecidindo] = useState<{ bancaId: number; aprovado: boolean } | null>(null);

  return (
    <PageCard id="fila-esperando-aprovacao">
      <PageCardHeader>
        <PageCardTitle>Esperando aprovação{itens.length > 0 && ` (${itens.length})`}</PageCardTitle>
      </PageCardHeader>
      <PageCardContent>
        {itens.length === 0 ? (
          <EmptyText>Toda banca realizada já tem resultado registrado.</EmptyText>
        ) : (
          <ListaSimples>
            {itens.map((item) => {
              const escopos = item.escopos.join(", ") || "nenhum escopo vinculado";

              return (
                <AprovacaoLinha
                  key={item.banca_id}
                  desde={item.realizado_em}
                  titulo={
                    <AtrasoTitulo>
                      {item.projeto_id ? (
                        <LinkProjeto to={`/projetos/${item.projeto_id}/banca`}>
                          {item.projeto_nome}
                        </LinkProjeto>
                      ) : (
                        <strong>{item.projeto_nome || "Banca"}</strong>
                      )}
                      <Pilula $tom="atencao">aguardando decisão</Pilula>
                    </AtrasoTitulo>
                  }
                  acoes={
                    decidindo?.bancaId === item.banca_id ? (
                      <FormDecisao
                        rotuloConfirmar={decidindo.aprovado ? "Confirmar aprovação" : "Confirmar reprovação"}
                        exigeTexto={false}
                        aviso={
                          <EmptyText>
                            Sua decisão sozinha já fecha o resultado da banca, sem esperar mais
                            ninguém.
                          </EmptyText>
                        }
                        onCancelar={() => setDecidindo(null)}
                        onConfirmar={async () => {
                          if (!token) return;
                          const resposta = await registrarAprovacaoBanca(
                            item.banca_id,
                            decidindo.aprovado,
                            null,
                            token,
                          );
                          setDecidindo(null);
                          onDecidiu(item.banca_id, resposta.resultado);
                        }}
                      />
                    ) : (
                      <>
                        <PageButtonSm
                          type="button"
                          onClick={() => setDecidindo({ bancaId: item.banca_id, aprovado: true })}
                        >
                          Aprovar
                        </PageButtonSm>
                        <PageButtonSm
                          type="button"
                          $variant="ghost"
                          onClick={() => setDecidindo({ bancaId: item.banca_id, aprovado: false })}
                        >
                          Reprovar
                        </PageButtonSm>
                        {item.projeto_id && (
                          <PageButtonSm as={Link} to={`/projetos/${item.projeto_id}/banca`} $variant="outline">
                            Ver a banca
                          </PageButtonSm>
                        )}
                      </>
                    )
                  }
                >
                  <AprovacaoMeta>
                    <span>
                      escopo: <strong>{escopos}</strong>
                    </span>
                    <span>
                      realizada em <strong>{formatarDataHora(item.realizado_em)}</strong>
                    </span>
                  </AprovacaoMeta>
                  <AprovacaoMeta>
                    <span>
                      pode aprovar: <strong>{quemPodeAprovar(item)}</strong>
                    </span>
                  </AprovacaoMeta>
                </AprovacaoLinha>
              );
            })}
          </ListaSimples>
        )}
      </PageCardContent>
    </PageCard>
  );
}

/** Pedidos abertos de troca de candidatura: qualquer consultor elegível
 *  pode confirmar; quem pediu vê os próprios pedidos aqui também, com opção
 *  de cancelar (o mesmo botão também aparece em "Já alocado", junto da
 *  banca, os dois lugares fazem a mesma coisa, de propósito). */
function SecaoTrocas({
  solicitacoes,
  bancas,
  usuarios,
  usuarioId,
  onConfirmar,
  onCancelar,
}: {
  solicitacoes: SolicitacaoTroca[];
  bancas: Banca[];
  usuarios: UsuarioResumo[];
  usuarioId: number;
  onConfirmar: (solicitacaoId: number) => void;
  onCancelar: (solicitacaoId: number) => void;
}) {
  // Defesa extra: o backend já cancela sozinho a troca pendente assim que a
  // banca é marcada realizada (e filtra de novo na listagem), mas o front
  // não deve confiar cegamente nisso — se a banca já não aceita mais
  // inscrição, a troca não faz sentido aparecer aqui de jeito nenhum.
  const pendentes = solicitacoes.filter((s) => {
    if (s.status !== "pendente") return false;
    const banca = bancas.find((b) => b.id === s.banca_id);
    return !banca || aceitaInscricao(banca.status);
  });
  // `elegiveis_ids` (2026-09-15) já resolve as duas perguntas de quem pode
  // ver "Confirmar": convite direto (lista de 1, o convidado) e pedido
  // aberto restrito por frente (só quem cobriria a vaga que ficaria
  // descoberta) — o resto do pool nem aparece aqui, nem precisa tentar pro
  // backend recusar.
  // ⚠ `?? []`: se o backend em produção ainda não tiver este campo no ar
  // (deploy do front à frente do back), `elegiveis_ids` vem `undefined` — e
  // sem a guarda a página quebrava inteira com "Cannot read properties of
  // undefined (reading 'includes')" em vez de só perder a restrição por
  // frente temporariamente.
  const disponiveis = pendentes.filter(
    (s) => s.usuario_original_id !== usuarioId && (s.elegiveis_ids ?? []).includes(usuarioId),
  );
  const minhas = pendentes.filter((s) => s.usuario_original_id === usuarioId);
  const total = disponiveis.length + minhas.length;

  function linha(solicitacao: SolicitacaoTroca, propria: boolean) {
    const banca = bancas.find((b) => b.id === solicitacao.banca_id);
    const dataHora = banca?.data_hora ? paraDataUtc(banca.data_hora) : null;
    const convitePraMim = !propria && solicitacao.usuario_convidado_id === usuarioId;
    const elegiveisIds = solicitacao.elegiveis_ids ?? [];
    const nomesElegiveis = elegiveisIds.map((id) => nomeUsuario(usuarios, id));
    return (
      <BancaLinha key={solicitacao.id}>
        <BancaData>
          {dataHora && (
            <>
              <BancaDataDiaSemana>
                {dataHora.toLocaleDateString("pt-BR", { timeZone: FUSO, weekday: "short" }).replace(".", "")}
              </BancaDataDiaSemana>
              <BancaDataDia>{partesEmBrasilia(dataHora).dia}</BancaDataDia>
            </>
          )}
        </BancaData>
        <BancaInfo>
          <BancaNomeLinha>
            <BancaNome>{banca?.nome_projeto ?? `Banca ${solicitacao.banca_id}`}</BancaNome>
            <PageBadge $tone={propria ? "default" : convitePraMim ? "success" : "warning"}>
              {propria ? "Meu pedido" : convitePraMim ? "Convite pra você" : "Troca aberta"}
            </PageBadge>
            {/* Vaga excedente (composição já fecha sem quem está saindo) não
                ganha badge — "tanto faz quem entra", como sempre foi. Só a
                vaga que de fato descobre a frente precisa dizer isso, senão
                quem vê "Confirmar" não entende por que não pode clicar. */}
            {solicitacao.vaga_precisada && (
              <PageBadge
                $tone="warning"
                title={
                  solicitacao.precisa_lideranca
                    ? `Só liderança de ${solicitacao.frente_nome} cobre esta vaga`
                    : `Só quem é de ${solicitacao.frente_nome} cobre esta vaga`
                }
              >
                {solicitacao.frente_nome}
                {solicitacao.precisa_lideranca ? " · liderança" : ""}
              </PageBadge>
            )}
          </BancaNomeLinha>
          <BancaMetaLinha>
            {/* Prefixo "Pedido por" de propósito: um nome pelado do lado do
                projeto lia como se fosse o coordenador dele (que aparece do
                mesmo jeito noutras telas) — sem dizer QUEM é essa pessoa,
                ficava ambíguo se era quem pediu a troca ou quem coordena. */}
            <BancaMetaItem>
              <User size={12} />
              Pedido por {nomeUsuario(usuarios, solicitacao.usuario_original_id)}
            </BancaMetaItem>
            {dataHora && (
              <BancaMetaItem>
                <Clock size={12} />
                {dataHora.toLocaleTimeString("pt-BR", { timeZone: FUSO, hour: "2-digit", minute: "2-digit" })}
              </BancaMetaItem>
            )}
            <BancaMetaItem
              title={nomesElegiveis.length ? `Pode confirmar: ${nomesElegiveis.join(", ")}` : undefined}
            >
              <Users size={12} />
              {elegiveisIds.length === 1
                ? "1 pessoa pode cobrir"
                : `${elegiveisIds.length} pessoas podem cobrir`}
            </BancaMetaItem>
          </BancaMetaLinha>
        </BancaInfo>
        <BancaAcoes>
          {propria ? (
            <PageButtonSm $variant="outline" type="button" onClick={() => onCancelar(solicitacao.id)}>
              Cancelar
            </PageButtonSm>
          ) : (
            <PageButtonSm type="button" onClick={() => onConfirmar(solicitacao.id)}>
              Confirmar
            </PageButtonSm>
          )}
        </BancaAcoes>
      </BancaLinha>
    );
  }

  return (
    <PageCard>
      <PageCardHeader>
        <PageCardTitle>Trocas disponíveis</PageCardTitle>
        <PageBadge $tone="muted">{total}</PageBadge>
      </PageCardHeader>
      <PageCardContent>
        {total === 0 && <EmptyText>Nenhuma solicitação de troca no momento.</EmptyText>}
        {total > 0 && (
          <ListScrollWrap $scrollable={total > LIST_MAX_VISIVEIS}>
            {disponiveis.map((s) => linha(s, false))}
            {minhas.map((s) => linha(s, true))}
          </ListScrollWrap>
        )}
      </PageCardContent>
    </PageCard>
  );
}

function VerMaisModal({
  banca,
  contexto,
  usuarioId,
  token,
  detalhesCache,
  onDetalheCarregado,
  onClose,
  onEditar,
  onExcluir,
  onRegistrarResultado,
  ehDiretor,
  podeAprovarLista,
  podeGerirMembros,
  podeVerAvaliou,
  onDescricaoEnviada,
  onAlterou,
}: {
  banca: Banca | null;
  contexto: Contexto;
  usuarioId: number;
  token: string | null;
  /** banca_id → detalhe já pré-buscado pelo pai (ver o efeito de prefetch em
   *  `Bancas()`); se presente, abre a lista de avaliadores na hora, sem
   *  esperar o fetch. */
  detalhesCache: Record<number, BancaDetalhes>;
  /** Alimenta o cache do pai quando o fetch on-open (fallback, banca fora do
   *  universo pré-buscado) resolve, pra reabrir a mesma banca depois vir do
   *  cache também. */
  onDetalheCarregado?: (detalhe: BancaDetalhes) => void;
  /** Mexeu em quem está na banca (tirou alguém): o pai recarrega as listas,
   *  senão o card continua mostrando a pessoa até recarregar a página. */
  onAlterou?: () => void;
  onClose: () => void;
  onEditar?: (banca: Banca) => void;
  onExcluir?: (banca: Banca) => void;
  /**
   * ⭐ A aprovação (§5.5, §8) — e o ÚNICO lugar de onde ela é sempre
   * alcançável.
   *
   * ⚠ O botão existe nos cards das listas, mas nenhuma delas contém a banca em
   * que ele é necessário: "Alocação" só mostra banca `aberta`/`atrasada`,
   * "Avaliação" exige candidatura própria e "Meus projetos" exige ser do
   * grupo. Uma banca REALIZADA e sem veredito, de um projeto que quem decide
   * não coordena, não aparecia em nenhuma — justamente a que "Esperando
   * aprovação" manda resolver. Daqui ela é alcançável pela aba Calendário e
   * por qualquer card.
   */
  onRegistrarResultado?: (banca: Banca) => void;
  ehDiretor?: boolean;
  /** ⭐ Diretoria OU gerente de frente — diferente de `ehDiretor` acima. */
  podeAprovarLista?: boolean;
  /** `pode_gerir_membros` (2026-09-11) — mostra o "remover" ao lado de cada
   *  avaliador. É a mesma permissão que `DELETE /candidaturas/{id}` cobra
   *  pra tirar QUALQUER pessoa (não só a própria) e passar por cima da
   *  trava dos 7 dias. */
  podeGerirMembros?: boolean;
  /** `pode_ver_dashboard_bancas` (2026-09-15) — mesma audiência que decide a
   *  banca: mostra "· avaliou" ao lado de quem já enviou o formulário. */
  podeVerAvaliou?: boolean;
  onDescricaoEnviada?: () => void;
}) {
  // A ficha completa — avaliadores com categoria e frente resolvidas, mais a
  // composição por frente. A lista `Banca` não carrega nada disso; buscar o
  // detalhe aqui é o mesmo caminho da aba Banca do projeto, sem reconstruir a
  // regra no cliente. Enquanto não chega, cai na lista corrida de nomes.
  //
  // O efeito roda sempre (o modal fica montado com `banca` nula) e a chave é
  // `banca?.id`, não o objeto, que muda de referência a cada render do pai.
  // Guardo o detalhe COM o id de origem em vez de limpá-lo ao trocar de banca:
  // um `setDetalhe(null)` síncrono no efeito dispara render em cascata (a
  // regra `set-state-in-effect`); comparar o id no render resolve igual.
  const [detalheFetched, setDetalheFetched] = useState<BancaDetalhes | null>(null);
  const bancaId = banca?.id ?? null;
  const doCache = bancaId != null ? detalhesCache[bancaId] : undefined;
  useEffect(() => {
    // Já veio do prefetch em background — nada a buscar, abre instantâneo.
    if (bancaId == null || !token || doCache) return;
    let ativo = true;
    getBancaDetalhes(bancaId, token)
      .then((d) => {
        if (ativo) {
          setDetalheFetched(d);
          onDetalheCarregado?.(d);
        }
      })
      .catch(() => undefined);
    return () => {
      ativo = false;
    };
    // `doCache` na dependência: se o prefetch terminar enquanto o modal já
    // está aberto esperando, este efeito reroda, vê o cache preenchido e o
    // cleanup acima descarta o fetch em andamento.
  }, [bancaId, token, doCache, onDetalheCarregado]);
  const detalheDaBanca =
    doCache ?? (detalheFetched && detalheFetched.id === bancaId ? detalheFetched : null);

  // Recarrega a ficha depois de mexer no local/entrega — atualiza o cache do
  // pai (por `onDetalheCarregado`), então `doCache` volta fresco no próximo
  // render.
  async function refetchDetalhe() {
    if (bancaId == null || !token) return;
    try {
      const d = await getBancaDetalhes(bancaId, token);
      setDetalheFetched(d);
      onDetalheCarregado?.(d);
    } catch {
      /* mantém o que já estava */
    }
  }

  // Quem tem `pode_gerir_membros` tira QUALQUER avaliador daqui — mesma rota
  // do "me desalocar" (`desalocar`/`DELETE /candidaturas/{id}`), que já passa
  // por cima da trava dos 7 dias pra quem gere membros (`eh_gestao` no
  // backend). Confirmação antes de disparar: tirar alguém escalado é o tipo
  // de clique que não se quer dar sem querer.
  const [removendo, setRemovendo] = useState<{ candidaturaId: number; nome: string } | null>(null);

  // Trava a rolagem do fundo enquanto o modal está aberto — sem isto a roda do
  // mouse sobre o véu arrasta a página atrás. Condicionada a `bancaId` (não ao
  // objeto `banca`): sem isso, todo render do pai desfazia e refazia a trava.
  useLockBodyScroll(bancaId != null);

  if (!banca) return null;

  const podeGerenciar = podeGerenciarBanca(banca, usuarioId, ehDiretor);
  // O coordenador não é avaliador da própria banca ("ninguém avalia o
  // próprio grupo"), no lugar do formulário de notas, ele só registra este
  // relato livre, e só depois que a banca de fato aconteceu.
  // ⚠ `coordenador_ids`, não `coordenador_id ===`: projeto pode ter mais de
  // um coordenador (2026-08-20), e comparar só com o primeiro deixava o
  // segundo sem o "registrar relato" mesmo tendo coordenado a banca (mesma
  // correção do `souCoordenador` em `ProjetoBanca.tsx`). Sem o detalhe ainda
  // carregado, cai no único id que a listagem já tinha.
  const ehCoordenador = detalheDaBanca
    ? detalheDaBanca.coordenador_ids.includes(usuarioId)
    : usuarioId === banca.coordenador_id;

  return (
    <>
    <ModalOverlay onClick={onClose} role="presentation">
      <NarrowModalContent onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="ver-mais-titulo">
        <ModalHeader>
          <ModalTitle id="ver-mais-titulo">{banca.nome_projeto}</ModalTitle>
          <ModalClose type="button" aria-label="Fechar" onClick={onClose}>
            <X size={18} />
          </ModalClose>
        </ModalHeader>
        <ModalBody>
          <DetailList>
            <DetailRow>
              <DetailTerm>Data</DetailTerm>
              <DetailValue>
                {banca.data_hora ? paraDataUtc(banca.data_hora).toLocaleDateString("pt-BR", { timeZone: FUSO }) : SEM_DATA}
              </DetailValue>
            </DetailRow>
            <DetailRow>
              <DetailTerm>Horário</DetailTerm>
              <DetailValue>
                {banca.data_hora
                  ? paraDataUtc(banca.data_hora).toLocaleTimeString("pt-BR", { timeZone: FUSO, hour: "2-digit", minute: "2-digit" })
                  : SEM_DATA}
              </DetailValue>
            </DetailRow>
            <DetailRow>
              {/* Mesmo critério do card da lista (`nomesEscopos` em
                  `BancaCard`): banca costurada a escopo(s) do projeto
                  mostra TODOS os que ela cobre via `projeto_escopo_ids`
                  resolvido em `escoposVendidos` — `escopo_id` só guarda o
                  primeiro e escondia o resto quando a banca cobria mais
                  de um. Banca legada (sem costura) cai no catálogo, como
                  sempre foi. */}
              <DetailTerm>{banca.projeto_escopo_ids.length > 1 ? "Escopos" : "Escopo"}</DetailTerm>
              <DetailValue>
                {(banca.projeto_escopo_ids.length > 0
                  ? banca.projeto_escopo_ids
                      .map((id) => contexto.escoposVendidos.find((e) => e.id === id)?.nome)
                      .filter((nome): nome is string => !!nome)
                  : [nomeEscopo(contexto.escopos, banca.escopo_id)]
                ).join(", ")}
              </DetailValue>
            </DetailRow>
            <DetailRow>
              <DetailTerm>Frentes</DetailTerm>
              <DetailValue>{frentesDaBanca(contexto.bancasFrentes, contexto.frentes, banca.id).join(", ") || "—"}</DetailValue>
            </DetailRow>
            <DetailRow>
              <DetailTerm>Coordenador</DetailTerm>
              {/* ⚠ `banca.coordenador_id` é só o PRIMEIRO coordenador (projeto
                  pode ter mais de um, 2026-08-20). `detalheDaBanca.coordenador`
                  já vem com todos os nomes juntos — mesma correção de
                  `get_banca_detalhes.py` que a aba Banca do projeto usa.
                  Enquanto o detalhe não chega, cai no nome único de sempre. */}
              <DetailValue>
                {detalheDaBanca?.coordenador ?? nomeUsuario(contexto.usuarios, banca.coordenador_id)}
              </DetailValue>
            </DetailRow>
            <DetailRow>
              <DetailTerm>Membros</DetailTerm>
              <DetailValue>
                {(
                  detalheDaBanca?.membros ??
                  membrosDaBanca(banca.equipe_ids, banca.coordenador_id, contexto.usuarios)
                ).join(", ") || "—"}
              </DetailValue>
            </DetailRow>
          </DetailList>

          {/* Local + entrega — o MESMO bloco da aba Banca do projeto. Só
              quem é do projeto avaliado edita (`equipe_ids` já soma
              coordenador + equipe); o resto vê em leitura. */}
          <LocalEEntregaBloco
            banca={detalheDaBanca ?? banca}
            podeMexer={
              !banca.cancelada_em &&
              ((banca.equipe_ids?.includes(usuarioId) ?? false) || !!ehDiretor)
            }
            token={token}
            onMudou={refetchDetalhe}
          />

          {/* Avaliadores separados por (liderança | membro) × frente, com o
              "1/2 · falta 1" de cada bloco — a mesma leitura da aba Banca do
              projeto. Enquanto o detalhe não chega, a lista corrida de nomes. */}
          <AvaliadoresSecao>
            <DetailTerm>Avaliadores</DetailTerm>
            {detalheDaBanca ? (
              detalheDaBanca.avaliadores.length === 0 ? (
                <DetailValue style={{ textAlign: "left" }}>—</DetailValue>
              ) : (
                <AvaliadoresAgrupados
                  avaliadores={detalheDaBanca.avaliadores}
                  frentesDaBanca={detalheDaBanca.frentes_da_banca}
                  composicao={detalheDaBanca.composicao}
                  realizadoEm={detalheDaBanca.realizado_em}
                  podeRemover={podeGerirMembros}
                  onRemover={(candidaturaId, nome) => setRemovendo({ candidaturaId, nome })}
                  podeVerAvaliou={podeVerAvaliou}
                />
              )
            ) : (
              <DetailValue style={{ textAlign: "left" }}>
                {avaliadoresDaBanca(contexto.candidaturas, contexto.usuarios, banca.id).join(", ") || "—"}
              </DetailValue>
            )}
          </AvaliadoresSecao>

          {banca.realizado_em && (ehCoordenador || banca.descricao_coordenador) && (
            <DescricaoSecao>
              <DescricaoCoordenador
                banca={banca}
                editavel={ehCoordenador}
                token={token}
                onEnviada={onDescricaoEnviada}
              />
            </DescricaoSecao>
          )}
        </ModalBody>
        <ModalFooter>
          {podeAprovarLista && onRegistrarResultado && banca.realizado_em && !banca.resultado && (
            <PageButton type="button" onClick={() => onRegistrarResultado(banca)}>
              Aprovar banca
            </PageButton>
          )}
          {podeGerenciar && onEditar && (
            <PageButton type="button" onClick={() => onEditar(banca)}>
              Editar
            </PageButton>
          )}
          {podeGerenciar && onExcluir && (
            <PageButton $variant="outline" type="button" onClick={() => onExcluir(banca)}>
              Excluir
            </PageButton>
          )}
          <PageButton $variant="outline" type="button" onClick={onClose}>
            Fechar
          </PageButton>
        </ModalFooter>
      </NarrowModalContent>
    </ModalOverlay>

    {removendo && token && (
      <ConfirmarModal
        titulo="Tirar da banca"
        mensagem={`${removendo.nome} vai ser desalocado(a) desta banca — a vaga fica aberta de novo.`}
        rotuloConfirmar="Tirar da banca"
        rotuloProcessando="Removendo…"
        onCancelar={() => setRemovendo(null)}
        onConfirmar={async () => {
          await desalocar(removendo.candidaturaId, token, `${removendo.nome} saiu da banca`);
          setRemovendo(null);
          await refetchDetalhe();
          onAlterou?.();
        }}
      />
    )}
    </>
  );
}

/**
 * O relato do coordenador sobre a banca, não é o formulário de avaliação
 * (ele nem candidato dela é, ver `create_candidatura`). Só aparece depois de
 * `realizado_em`; só o próprio coordenador edita, o resto só lê.
 */
function DescricaoCoordenador({
  banca,
  editavel,
  token,
  onEnviada,
}: {
  banca: Banca;
  editavel: boolean;
  token: string | null;
  onEnviada?: () => void;
}) {
  const [descricao, setDescricao] = useState(banca.descricao_coordenador ?? "");
  const [editando, setEditando] = useState(!banca.descricao_coordenador);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  async function enviar() {
    if (!token || !descricao.trim()) return;
    setEnviando(true);
    setErro("");
    try {
      await registrarDescricaoCoordenador(banca.id, descricao.trim(), token);
      setEditando(false);
      onEnviada?.();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao enviar a descrição");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <FieldGroup>
      <FieldLabel htmlFor="descricao-coordenador">Descrição do coordenador</FieldLabel>
      {editavel && editando ? (
        <>
          <FieldTextarea
            id="descricao-coordenador"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Como foi a banca, o que ficou combinado com o cliente…"
            disabled={enviando}
          />
          {erro && <FormErrorText>{erro}</FormErrorText>}
          <PageButtonSm type="button" disabled={enviando || !descricao.trim()} onClick={enviar}>
            {enviando ? "Enviando..." : "Enviar descrição"}
          </PageButtonSm>
        </>
      ) : (
        <>
          <DescricaoQuote>{banca.descricao_coordenador}</DescricaoQuote>
          {editavel && (
            <PageButtonSm $variant="outline" type="button" onClick={() => setEditando(true)}>
              Editar
            </PageButtonSm>
          )}
        </>
      )}
    </FieldGroup>
  );
}

/**
 * Convite direto pra troca, alternativa ao "Pedir troca" (pool aberto,
 * qualquer elegível confirma). Aqui quem pede escolhe a pessoa; só ela
 * consegue confirmar depois (o backend garante, ver `confirmar_solicitacao_troca`).
 * As mesmas exclusões do pool aberto valem aqui: coordenador e equipe do
 * projeto da banca, e quem já é candidato dela.
 */
function ConvidarTrocaModal({
  banca,
  contexto,
  usuarioId,
  onConvidar,
  onClose,
}: {
  banca: Banca;
  contexto: Contexto;
  usuarioId: number;
  onConvidar: (usuarioConvidadoId: number) => void;
  onClose: () => void;
}) {
  const excluidos = new Set<number>([usuarioId, banca.coordenador_id]);
  contexto.equipesProjeto
    .filter((e) => e.banca_id === banca.id)
    .forEach((e) => excluidos.add(e.usuario_id));
  contexto.candidaturas
    .filter((c) => c.banca_id === banca.id)
    .forEach((c) => excluidos.add(c.usuario_id));

  const elegiveis = contexto.usuarios
    .filter((u) => u.ativo && !excluidos.has(u.id))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  const [usuarioEscolhidoId, setUsuarioEscolhidoId] = useState<number | "">("");

  return (
    <ModalOverlay onClick={onClose} role="presentation">
      <NarrowModalContent onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="convidar-troca-titulo">
        <ModalHeader>
          <ModalTitle id="convidar-troca-titulo">Convidar para a troca, {banca.nome_projeto}</ModalTitle>
          <ModalClose type="button" aria-label="Fechar" onClick={onClose}>
            <X size={18} />
          </ModalClose>
        </ModalHeader>
        <ModalBody>
          {elegiveis.length === 0 ? (
            <EmptyText>Ninguém elegível pra convidar nesta banca no momento.</EmptyText>
          ) : (
            <FieldGroup>
              <FieldLabel htmlFor="convidado">Pessoa</FieldLabel>
              <FieldSelect
                id="convidado"
                value={usuarioEscolhidoId}
                onChange={(e) => setUsuarioEscolhidoId(Number(e.target.value))}
                autoFocus
                pesquisavel
              >
                <option value="">Escolha quem convidar</option>
                {elegiveis.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nome}
                  </option>
                ))}
              </FieldSelect>
            </FieldGroup>
          )}
        </ModalBody>
        <ModalFooter>
          <PageButton $variant="outline" type="button" onClick={onClose}>
            Cancelar
          </PageButton>
          <PageButton
            type="button"
            disabled={!usuarioEscolhidoId}
            onClick={() => usuarioEscolhidoId && onConvidar(usuarioEscolhidoId)}
          >
            Enviar convite
          </PageButton>
        </ModalFooter>
      </NarrowModalContent>
    </ModalOverlay>
  );
}

/**
 * ⭐ 2026-09-18, a pedido: pedir para entrar numa banca sem vaga livre.
 *
 * Abre em dois momentos — clicando direto no botão de uma banca lotada, ou
 * automaticamente quando "Alocar-se" recusa por falta de vaga
 * (`CODIGO_BANCA_LOTADA`, ver `handleAlocar`). Nos dois casos o pedido vai
 * pra fila da diretoria; aprovar cria a candidatura acima do teto normal.
 */
function SolicitarEntradaBancaModal({
  banca,
  onSolicitar,
  onClose,
}: {
  banca: Banca;
  onSolicitar: (justificativa: string) => Promise<void>;
  onClose: () => void;
}) {
  const [justificativa, setJustificativa] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  async function enviar() {
    setErro("");
    setEnviando(true);
    try {
      await onSolicitar(justificativa.trim());
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível enviar o pedido");
      setEnviando(false);
    }
    // No sucesso quem chamou fecha o modal — mexer no estado depois seria
    // atualizar um componente que já morreu.
  }

  return (
    <ModalOverlay onClick={onClose} role="presentation">
      <NarrowModalContent onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="solicitar-entrada-titulo">
        <ModalHeader>
          <ModalTitle id="solicitar-entrada-titulo">Solicitar entrada, {banca.nome_projeto}</ModalTitle>
          <ModalClose type="button" aria-label="Fechar" onClick={onClose}>
            <X size={18} />
          </ModalClose>
        </ModalHeader>
        <ModalBody>
          <p style={{ marginTop: 0 }}>
            {/* ⚠ 2026-09-18, corrigido: liderar com "X/Y avaliadores" ficava
                incoerente quando a banca não estava no teto (ex: 7/8) e a
                vaga que falta é reservada pra outra frente — não é "falta
                gente", é "falta gente da sua frente". A mesma frase do
                badge em "Com alocação máxima". */}
            Não há vaga disponível para você nesta banca ({banca.alocados}/{banca.vagas} avaliadores).
            O pedido vai para a diretoria decidir — se aprovado, você entra acima do máximo normal.
          </p>
          <FieldGroup>
            <FieldLabel htmlFor="justificativa-entrada">Por que você quer entrar nesta banca?</FieldLabel>
            <FieldInput
              as="textarea"
              id="justificativa-entrada"
              rows={3}
              autoFocus
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
            />
          </FieldGroup>
          {erro && <ErrorText>{erro}</ErrorText>}
        </ModalBody>
        <ModalFooter>
          <PageButton $variant="outline" type="button" onClick={onClose} disabled={enviando}>
            Cancelar
          </PageButton>
          <PageButton type="button" disabled={enviando || !justificativa.trim()} onClick={enviar}>
            {enviando ? "Enviando…" : "Enviar pedido"}
          </PageButton>
        </ModalFooter>
      </NarrowModalContent>
    </ModalOverlay>
  );
}

const OUTRO = "outro" as const;

interface RascunhoAvaliacao {
  nomeAvaliador: string;
  tipoAvaliador: "consultor" | "lideranca";
  projetoAvaliado: string;
  escopoSelecionado: number | typeof OUTRO | "";
  escopoOutro: string;
  notas: Record<number, number | null>;
  respostasTexto: Record<number, string>;
  comentario: string;
}

function chaveRascunhoAvaliacao(bancaId: number, usuarioId: number) {
  return `avaliacao-banca-rascunho-${bancaId}-${usuarioId}`;
}

function AvaliarModal({
  banca,
  formulario,
  escopos,
  token,
  onClose,
  onEnviada,
}: {
  banca: Banca;
  formulario: FormularioAtivo | null;
  escopos: Escopo[];
  token: string;
  onClose: () => void;
  onEnviada: () => void;
}) {
  const { usuario } = useAuth();
  const escoposOrdenados = escopos.slice().sort((a, b) => a.nome.localeCompare(b.nome));

  // ⚠ Pausar e retomar (2026-09-16, a pedido): fechar este modal o
  // desmontava, e reabrir criava uma instância nova, do zero — notas,
  // texto e comentário já preenchidos iam embora mesmo sem ter sido
  // enviado nada. Um único rascunho no localStorage, lido uma vez aqui e
  // espelhado a cada mudança (efeito logo abaixo), é o que deixa fechar e
  // reabrir sem perder o que já foi respondido. Mesma ideia do rascunho de
  // `AvaliacaoDesempenho.tsx`.
  const chaveRascunho = usuario ? chaveRascunhoAvaliacao(banca.id, usuario.id) : null;
  const [rascunhoInicial] = useState<RascunhoAvaliacao | null>(() => {
    if (!chaveRascunho) return null;
    try {
      const salvo = localStorage.getItem(chaveRascunho);
      return salvo ? (JSON.parse(salvo) as RascunhoAvaliacao) : null;
    } catch {
      return null;
    }
  });

  // Bloco 1. Nome e projeto são só leitura (2026-10-05, a pedido): quem
  // responde é quem está logado e o projeto é o da banca; deixar editar só
  // abria espaço pra digitar outro nome por engano. Os dois continuam no
  // estado e no rascunho porque o payload e a leitura de rascunhos antigos
  // esperam os campos. O tipo (consultor/liderança) e o escopo seguem como
  // ponto de partida que o avaliador pode confirmar diferente.
  const nomeAvaliador = usuario?.nome ?? "";
  const [tipoAvaliador, setTipoAvaliador] = useState<"consultor" | "lideranca">(
    rascunhoInicial?.tipoAvaliador ??
      (usuario && usuario.posicao !== "consultor" ? "lideranca" : "consultor"),
  );
  const projetoAvaliado = banca.nome_projeto;
  const [escopoSelecionado, setEscopoSelecionado] = useState<number | typeof OUTRO | "">(
    rascunhoInicial?.escopoSelecionado ?? (banca.escopo_id ?? OUTRO),
  );
  const [escopoOutro, setEscopoOutro] = useState(rascunhoInicial?.escopoOutro ?? "");

  // ⚠ O formulário vem como prop, carregado uma vez no load da página. Se a
  // diretoria editar o formulário enquanto a pessoa está com a tela aberta, a
  // prop fica velha: um escopo cujos critérios foram adicionados depois
  // aparece como "sem critérios" e a avaliação vai incompleta — foi o que
  // aconteceu na BLEND I (2026-09-10). Rebusca a versão atual ao abrir.
  const [formularioAtual, setFormularioAtual] = useState(formulario);
  useEffect(() => {
    let vivo = true;
    getFormularioAtivo(token)
      .then((f) => {
        if (vivo) setFormularioAtual(f);
      })
      .catch(() => {
        /* sem formulário ativo agora: fica com a prop */
      });
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const form = formularioAtual ?? formulario;

  // ⭐ Uma banca pode ter sido de mais de um escopo (2026-09-09). Quando a
  // costura com o projeto diz quais são (`escopos_avaliados_ids`), o
  // formulário mostra um BLOCO de critérios por escopo, empilhados, e não há
  // o que escolher — todo avaliador responde todos. Só a banca "Outro" (sem
  // escopo nenhum vinculado) cai no seletor manual de antes.
  const escoposDaBanca = banca.escopos_avaliados_ids ?? [];
  const modoMultiEscopo = escoposDaBanca.length > 0;

  // Legado / "Outro": o bloco técnico depende do que for escolhido AQUI, não
  // de `banca.escopo_id` direto.
  const escopoIdParaFiltro = typeof escopoSelecionado === "number" ? escopoSelecionado : null;

  const todasPerguntas = (form?.perguntas ?? [])
    .slice()
    .sort((a, b) => a.ordem - b.ordem)
    .filter((p) => !isComentarioFeedbackPergunta(p.tipo_resposta, p.texto));

  const perguntaEntraNoEnvio = (p: Pergunta) =>
    modoMultiEscopo
      ? p.escopo_id == null || escoposDaBanca.includes(p.escopo_id)
      : p.escopo_id == null || p.escopo_id === escopoIdParaFiltro;

  // Tudo que vai ser enviado (todos os blocos + as gerais). A validação e o
  // POST das notas iteram sobre isto.
  const perguntasVisiveis = todasPerguntas.filter(perguntaEntraNoEnvio);
  const perguntasNota = perguntasVisiveis.filter((p) => isPerguntaNota(p.tipo_resposta));

  // Recortes para desenhar os blocos empilhados no modo multi-escopo.
  const perguntasDoEscopo = (escopoId: number) =>
    todasPerguntas.filter((p) => p.escopo_id === escopoId);
  const perguntasGerais = todasPerguntas.filter((p) => p.escopo_id == null);

  const [notas, setNotas] = useState<Record<number, number | null>>(() => ({
    ...Object.fromEntries(perguntasNota.map((p) => [p.id, null])),
    ...rascunhoInicial?.notas,
  }));
  const [respostasTexto, setRespostasTexto] = useState<Record<number, string>>(
    rascunhoInicial?.respostasTexto ?? {},
  );
  const [comentario, setComentario] = useState(rascunhoInicial?.comentario ?? "");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  // Espelha o formulário inteiro pro localStorage a cada mudança — é o que
  // sobrevive a fechar o modal (ou a aba) no meio do preenchimento.
  useEffect(() => {
    if (!chaveRascunho) return;
    const rascunho: RascunhoAvaliacao = {
      nomeAvaliador,
      tipoAvaliador,
      projetoAvaliado,
      escopoSelecionado,
      escopoOutro,
      notas,
      respostasTexto,
      comentario,
    };
    try {
      localStorage.setItem(chaveRascunho, JSON.stringify(rascunho));
    } catch {
      // Modo privado ou quota cheia: perde a persistência, não a tela.
    }
  }, [
    chaveRascunho,
    nomeAvaliador,
    tipoAvaliador,
    projetoAvaliado,
    escopoSelecionado,
    escopoOutro,
    notas,
    respostasTexto,
    comentario,
  ]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    // ⚠ 2026-09-18, corrigido: `faltando` checa só as perguntas que ENTRARAM
    // no envio (`perguntasNota`, filtradas por escopo) — com a lista vazia
    // (ex.: `escopoSelecionado` de um rascunho antigo não casando com
    // nenhum critério do escopo certo), `.some(...)` dá `false` e a
    // validação passava em branco. Foi assim que a avaliação refeita da
    // Marcella Canozo na banca do ATLAS I foi enviada só com o comentário,
    // sem nota nenhuma. Bloqueia aqui, antes de checar nota por nota.
    if (perguntasNota.length === 0) {
      setErro(
        "Nenhum critério encontrado para o escopo selecionado — confira o escopo antes de enviar.",
      );
      return;
    }
    const faltando = perguntasNota.some((p) => notas[p.id] == null);
    if (faltando) {
      setErro("Selecione uma nota de 1 a 5 para todos os critérios.");
      return;
    }
    // ⭐ 2026-09-23 — a pedido: comentário passou a ser obrigatório.
    if (!comentario.trim()) {
      setErro("Escreva um comentário antes de enviar.");
      return;
    }
    setEnviando(true);
    setErro("");
    try {
      const avaliacao = await createAvaliacao(
        {
          banca_id: banca.id,
          formulario_id: form.id,
          nome_avaliador: nomeAvaliador.trim() || undefined,
          tipo_avaliador: tipoAvaliador,
          projeto_avaliado: projetoAvaliado.trim() || undefined,
          // Multi-escopo: a avaliação é UMA, cobre todos os blocos; o vínculo
          // por escopo mora em cada nota (via `pergunta.escopo_id`). Guarda o
          // primeiro escopo como referência do registro.
          escopo_avaliado_id: modoMultiEscopo ? escoposDaBanca[0] : escopoIdParaFiltro,
          escopo_avaliado_outro:
            modoMultiEscopo || escopoIdParaFiltro != null ? null : escopoOutro.trim() || null,
        },
        token,
      );
      for (const pergunta of perguntasVisiveis) {
        if (isPerguntaNota(pergunta.tipo_resposta)) {
          await createAvaliacaoNota(
            {
              avaliacao_id: avaliacao.id,
              pergunta_id: pergunta.id,
              nota: notas[pergunta.id] as number,
            },
            token,
          );
        } else {
          const valor = respostasTexto[pergunta.id];
          if (valor === undefined || valor === "") continue;
          await createAvaliacaoNota(
            {
              avaliacao_id: avaliacao.id,
              pergunta_id: pergunta.id,
              resposta_texto: valor,
            },
            token,
          );
        }
      }
      await submeterAvaliacao(avaliacao.id, comentario.trim() || null, token);
      if (chaveRascunho) {
        try {
          localStorage.removeItem(chaveRascunho);
        } catch {
          // Sem localStorage: nada a limpar.
        }
      }
      onEnviada();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao enviar avaliação");
    } finally {
      setEnviando(false);
    }
  }

  // Um bloco de critérios: as notas (escala 1-5) e depois as perguntas de
  // texto. Reaproveitado por escopo no modo multi e uma vez só no legado.
  const renderBlocoDeCriterios = (perguntas: Pergunta[]) => {
    const notasDoBloco = perguntas.filter((p) => isPerguntaNota(p.tipo_resposta));
    const textoDoBloco = perguntas.filter((p) => !isPerguntaNota(p.tipo_resposta));
    return (
      <>
        {notasDoBloco.length > 0 && (
          <NotaEscalaGrupo>
            {notasDoBloco.map((pergunta) => (
              <NotaEscala
                key={pergunta.id}
                id={`pergunta-${pergunta.id}`}
                label={pergunta.texto}
                value={notas[pergunta.id] ?? null}
                onChange={(valor) => setNotas((n) => ({ ...n, [pergunta.id]: valor }))}
              />
            ))}
          </NotaEscalaGrupo>
        )}
        {textoDoBloco.map((pergunta) => (
          <FieldGroup key={pergunta.id}>
            <FieldLabel htmlFor={`pergunta-${pergunta.id}`}>{pergunta.texto}</FieldLabel>
            <FieldTextarea
              id={`pergunta-${pergunta.id}`}
              value={respostasTexto[pergunta.id] ?? ""}
              onChange={(e) => setRespostasTexto((r) => ({ ...r, [pergunta.id]: e.target.value }))}
              required={!isPerguntaOpcional(pergunta.texto)}
            />
          </FieldGroup>
        ))}
      </>
    );
  };

  return (
    <ModalOverlay onClick={onClose} role="presentation">
      <WideModalContent onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="avaliar-titulo">
        <ModalHeader>
          <ModalTitle id="avaliar-titulo">Formulário de avaliação, {banca.nome_projeto}</ModalTitle>
          <ModalClose type="button" aria-label="Fechar" onClick={onClose}>
            <X size={18} />
          </ModalClose>
        </ModalHeader>
        {!form ? (
          <ModalBody>
            <EmptyText>Nenhum formulário ativo configurado no momento.</EmptyText>
          </ModalBody>
        ) : (
          <FormStack onSubmit={handleSubmit}>
            <AvaliarModalBody>
              <FieldGroup>
                <FieldLabel htmlFor="bloco1-nome">Nome</FieldLabel>
                <FieldInput id="bloco1-nome" value={nomeAvaliador} readOnly aria-readonly />
              </FieldGroup>
              <FieldGroup>
                <FieldLabel htmlFor="bloco1-tipo">Consultor ou Liderança</FieldLabel>
                <FieldSelect
                  id="bloco1-tipo"
                  value={tipoAvaliador}
                  onChange={(e) => setTipoAvaliador(e.target.value as "consultor" | "lideranca")}
                >
                  <option value="consultor">Consultor</option>
                  <option value="lideranca">Liderança</option>
                </FieldSelect>
              </FieldGroup>
              <FieldGroup>
                <FieldLabel htmlFor="bloco1-projeto">Projeto Avaliado</FieldLabel>
                <FieldInput id="bloco1-projeto" value={projetoAvaliado} readOnly aria-readonly />
              </FieldGroup>
              {modoMultiEscopo ? (
                /* Com 1 escopo só, o bloco de critérios logo abaixo já
                   repete o nome no título, a frase virava redundância, e o
                   rótulo "Escopos avaliados" sozinho (2026-10-05, corrigido)
                   ficava solto entre "Projeto Avaliado" e o nome do escopo.
                   Com 2+, o grupo lista os dois de uma vez, algo que os
                   títulos individuais não fazem. */
                escoposDaBanca.length > 1 && (
                  <FieldGroup>
                    <FieldLabel>Escopos avaliados</FieldLabel>
                    <ModalSubtitulo>
                      {escoposDaBanca.map((id) => nomeEscopo(escopos, id)).join(" · ")} — você
                      responde os critérios dos dois abaixo.
                    </ModalSubtitulo>
                  </FieldGroup>
                )
              ) : (
                <>
                  <FieldGroup>
                    <FieldLabel htmlFor="bloco1-escopo">Escopo Avaliado</FieldLabel>
                    <FieldSelect
                      id="bloco1-escopo"
                      value={escopoSelecionado}
                      pesquisavel
                      onChange={(e) =>
                        setEscopoSelecionado(e.target.value === OUTRO ? OUTRO : Number(e.target.value))
                      }
                    >
                      {escoposOrdenados.map((escopo) => (
                        <option key={escopo.id} value={escopo.id}>
                          {escopo.nome}
                        </option>
                      ))}
                      <option value={OUTRO}>Outro</option>
                    </FieldSelect>
                  </FieldGroup>
                  {escopoIdParaFiltro == null && (
                    <FieldGroup>
                      <FieldLabel htmlFor="bloco1-escopo-outro">Qual escopo?</FieldLabel>
                      <FieldInput
                        id="bloco1-escopo-outro"
                        value={escopoOutro}
                        onChange={(e) => setEscopoOutro(e.target.value)}
                        required
                      />
                    </FieldGroup>
                  )}
                </>
              )}

              {modoMultiEscopo ? (
                <>
                  {escoposDaBanca.map((escopoId) => {
                    const doEscopo = perguntasDoEscopo(escopoId);
                    return (
                      <EscopoAvaliacaoBloco key={escopoId}>
                        <EscopoAvaliacaoTitulo>
                          {nomeEscopo(escopos, escopoId)}
                        </EscopoAvaliacaoTitulo>
                        {doEscopo.length > 0 ? (
                          renderBlocoDeCriterios(doEscopo)
                        ) : (
                          <ModalSubtitulo>
                            Sem critérios configurados para este escopo no formulário ativo.
                          </ModalSubtitulo>
                        )}
                      </EscopoAvaliacaoBloco>
                    );
                  })}
                  {perguntasGerais.length > 0 && (
                    <EscopoAvaliacaoBloco>
                      <EscopoAvaliacaoTitulo>Todos os escopos</EscopoAvaliacaoTitulo>
                      {renderBlocoDeCriterios(perguntasGerais)}
                    </EscopoAvaliacaoBloco>
                  )}
                </>
              ) : (
                renderBlocoDeCriterios(perguntasVisiveis)
              )}
              <FieldGroup>
                <FieldLabel htmlFor="comentario">Comentário</FieldLabel>
                <FieldTextarea
                  id="comentario"
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                  required
                />
              </FieldGroup>
              {erro && <FormErrorText>{erro}</FormErrorText>}
            </AvaliarModalBody>
            <ModalFooterSplit>
              <PageButton $variant="outline" type="button" onClick={onClose}>
                Voltar
              </PageButton>
              <PageButton type="submit" disabled={enviando}>
                {enviando ? "Enviando..." : "Enviar avaliação"}
              </PageButton>
            </ModalFooterSplit>
          </FormStack>
        )}
      </WideModalContent>
    </ModalOverlay>
  );
}

/**
 * Quem decide é a diretoria de projetos ou o gerente da frente desta banca
 * (§5.5, §8): qualquer um decide sozinho, sem esperar o outro. Este botão é
 * o atalho de fora do projeto; a ficha completa fica na aba Banca do projeto
 * e em "Esperando aprovação".
 */
function AprovarBancaModal({
  banca,
  token,
  onFechar,
  onRegistrou,
}: {
  banca: Banca;
  token: string;
  onFechar: () => void;
  /** Recebe o resultado que o backend acabou de gravar, para o chamador
   *  atualizar o estado local sem recarregar a página. */
  onRegistrou: (resultado: ResultadoBanca | null) => void;
}) {
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  async function decidir(aprovado: boolean) {
    setSalvando(true);
    setErro("");
    try {
      const resposta = await registrarAprovacaoBanca(banca.id, aprovado, null, token);
      onRegistrou(resposta.resultado);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao registrar a decisão");
      setSalvando(false);
    }
  }

  return (
    <ModalOverlay onClick={onFechar} role="presentation">
      <NarrowModalContent onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="resultado-titulo">
        <ModalHeader>
          <ModalTitle id="resultado-titulo">Aprovar banca de {banca.nome_projeto}</ModalTitle>
          <ModalClose type="button" aria-label="Fechar" onClick={onFechar}>
            <X size={18} />
          </ModalClose>
        </ModalHeader>
        <ModalBody>
          <p>
            Diretoria de projetos e o gerente da frente desta banca podem decidir, e qualquer um
            decide sozinho: sua decisão já fecha o resultado, sem esperar mais ninguém.
          </p>
          {erro && <FormErrorText>{erro}</FormErrorText>}
        </ModalBody>
        <ModalFooterSplit>
          <PageButton $variant="outline" type="button" onClick={onFechar} disabled={salvando}>
            Cancelar
          </PageButton>
          <PageButton $variant="outline" type="button" onClick={() => decidir(false)} disabled={salvando}>
            {salvando ? "Salvando..." : "Reprovar"}
          </PageButton>
          <PageButton type="button" onClick={() => decidir(true)} disabled={salvando}>
            {salvando ? "Salvando..." : "Aprovar"}
          </PageButton>
        </ModalFooterSplit>
      </NarrowModalContent>
    </ModalOverlay>
  );
}
