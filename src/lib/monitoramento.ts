import { apiFetch } from "@/lib/api";
import type { TomSituacao } from "@/lib/situacoes-carga";
import type { StatusProjeto } from "@/types/projeto";
import type { CronogramaResposta } from "@/types/cronograma";
import type { AprovacaoDiretoria, AprovacaoGerente, ResultadoBanca } from "@/types/banca";

/* Os tipos espelham `use_cases/monitoramento/monitoramento.py`. */

/**
 * O que faz um projeto pedir atenção.
 *
 * `entrega_interna` e `entrega_externa` saíram em 2026-08-12: o atraso da
 * ENTREGA ao cliente deixou de ser insight. Ele media a agenda do cliente e não
 * o trabalho do time, e deixava vermelho um projeto cuja banca aconteceu no
 * prazo. O atraso do escopo hoje é medido só contra a BANCA.
 */
export type TipoAtencao = "kickoff" | "banca" | "reuniao" | "tarefa";

/** Os rótulos do filtro, na ordem em que aparecem, do que o time controla no
 *  dia a dia (tarefa, reunião) para os marcos (banca, kickoff). */
export const ROTULO_ATENCAO: Record<TipoAtencao, string> = {
  tarefa: "Tarefas",
  reuniao: "Reuniões",
  banca: "Bancas",
  kickoff: "Kickoff",
};

/** Uma etapa do ciclo de vida e os projetos parados nela.
 *
 *  Vem em LISTA, não em objeto indexado por status: a ordem é o dado. A pizza
 *  desenha as fatias nesta sequência para se ler como funil, e um objeto não
 *  garante ordem de forma confiável. */
export interface EtapaDoPortfolio {
  status: StatusProjeto;
  total: number;
  /** Os projetos da fatia, já ordenados por nome. A fatia é clicável, e só a
   *  contagem não responde "quais são esses?". */
  projetos: { id: number; nome: string }[];
}

export interface VisaoGeral {
  kpis: {
    total: number;
    em_execucao: number;
    perto_de_finalizar: number;
    atrasados: number;
    pausados: number;
    finalizados: number;
  };
  /** As 6 etapas em curso, sempre todas, inclusive as vazias, com `total: 0`.
   *  A soma dos totais é igual a `placar_gestao.total_ativos`, e é isso que faz
   *  o número no meio da pizza fechar com as fatias. */
  por_etapa: EtapaDoPortfolio[];
  /** % dos projetos ativos sem banca atrasada. A entrega ao cliente fica de
   *  fora de propósito: depende da agenda dele. */
  placar_gestao: { percentual: number; no_prazo: number; total_ativos: number };
  /** % dos projetos em curso atrasados por QUALQUER motivo, banca ou entrega.
   *
   *  Não é o complemento do `placar_gestao`: aquele ignora atraso de entrega.
   *  `100 - placar` não dá este número, e os dois ficam lado a lado na tela —
   *  os rótulos precisam dizer o que cada um mede. */
  atrasados_gestao: { percentual: number; atrasados: number; total_ativos: number };
  entregas: {
    /** Escopos entregues NA GESTÃO ATUAL, o assunto do card.
     *
     *  Não bate com a soma da `tendencia`: ela abre 6 meses e ignora o
     *  semestre, senão viriam quatro meses zerados (a gestão começou em
     *  julho). São duas leituras no mesmo card, de propósito. */
    total_escopos: number;
    /** Entregas por mês nos últimos 6, do mais antigo ao mais novo. O mês
     *  corrente entra incompleto, é "o que saiu até agora", não previsão. */
    tendencia: { inicio: string; total: number }[];
  };
  bancas_proximas: {
    /** O id da banca, para a linha do card levar até ela em /bancas. */
    banca_id: number;
    projeto_id: number | null;
    projeto_nome: string;
    escopo: string;
    data_hora: string;
  }[];
  /**
   * O VÃO ENTRE ESCOPOS: da entrega ao cliente de um até a reunião inicial
   * do seguinte, um item por PAR, não por projeto.
   *
   * Media sempre até HOJE e dava número negativo quando a entrega estava
   * registrada para o futuro (a tela chegou a mostrar "-16 dias parado").
   * Corrigido em 2026-08-12.
   */
  tempo_parado: {
    projeto_id: number;
    projeto_nome: string;
    escopo_entregue: string;
    /** `null` quando o vão está ABERTO, ninguém começou o próximo escopo. */
    escopo_seguinte: string | null;
    /** Aberto = ainda correndo até hoje. Fechado = tamanho definitivo. */
    aberto: boolean;
    /** Dias CORRIDOS: é tempo de calendário parado, não esforço. */
    dias_parado: number;
  }[];
  /** o motivo é explícito, nunca um rótulo genérico. */
  atencao_agora: {
    projeto_id: number;
    projeto_nome: string;
    /** A categoria, para a tela filtrar. Vem separada do `motivo` porque
     *  aquele é frase escrita para humano e muda de redação, agrupar por ela
     *  seria agrupar por string livre. */
    tipo: TipoAtencao;
    motivo: string;
    dias: number | null;
  }[];
  /**
   * Os números da JANELA DO ESCOPO, agregados por projeto.
   *
   * Não confundir `dias_parados` com `tempo_parado` acima: aquele conta os
   * dias CORRIDOS desde a última entrega enquanto o projeto espera o próximo
   * escopo começar; este conta os **dias úteis em branco** do cronograma
   * inteiro, do kickoff até hoje, dia sem etapa, reunião, banca ou entrega.
   * O primeiro responde "está entre escopos?"; o segundo, "está andando?".
   *
   * `dias_de_atraso` é o PIOR atraso entre os escopos do projeto, não a soma:
   * somar dois escopos atrasados em paralelo contaria o mesmo calendário duas
   * vezes.
   */
  janela: {
    por_projeto: {
      projeto_id: number;
      projeto_nome: string;
      dias_ajustados: number;
      /** Dias úteis vendidos, somados os escopos não cancelados. É o
       *  DENOMINADOR: sem ele "12 dias além do vendido" não tem tamanho —
       *  12 sobre 60 é um projeto apertado, 12 sobre 10 é um que dobrou. */
      dias_vendidos: number;
      /** O nome do escopo que mais passou da janela — o mesmo de que vem o
       *  `dias_de_atraso` da linha. `null` quando nenhum passou. */
      escopo_alem_do_vendido: string | null;
      /** Quantos escopos do projeto passaram da janela, de quantos há. */
      escopos_alem_do_vendido: number;
      escopos: number;
      dias_de_atraso: number;
      dias_parados: number;
    }[];
    totais: { dias_ajustados: number; dias_de_atraso: number; dias_parados: number };
  };
}

export interface LinhaTarefas {
  projeto_id: number;
  projeto_nome: string;
  status: string;
  distribuiu_na_semana: boolean;
  total: number;
  ativas: number;
  vencidas: number;
  /** Nunca recebeu tarefa nenhuma. */
  sem_tarefas: boolean;
  /** Tem tarefas, mas todas concluídas ou canceladas, o quadro zerou e não
   *  veio o próximo lote. Situação diferente de `sem_tarefas`. */
  sem_tarefas_ativas: boolean;
  /** Dias ÚTEIS desde a última tarefa criada (ou desde o kickoff, se nunca
   *  houve nenhuma). `null` = projeto ainda sem kickoff. */
  dias_uteis_sem_tarefa: number | null;
  /** De ONDE o campo acima conta, lido do banco por `_marco_sem_tarefa`.
   *
   *  Vem na resposta porque o número de dias sozinho é ambíguo, não dá para
   *  saber se ele partiu do kickoff ou da última tarefa criada. Deduzir isso
   *  no front pelo `sem_tarefas` funcionava por coincidência e quebraria em
   *  silêncio se o filtro da lista mudasse. */
  marco_sem_tarefa: "kickoff" | "ultima_tarefa" | null;
  /** A data do marco acima. `null` = projeto ainda sem kickoff. */
  data_marco_sem_tarefa: string | null;
  /** O pior atraso do quadro, em dias ÚTEIS. */
  atraso_maximo_dias_uteis: number;
  ultima_movimentacao: string | null;
}

export interface Execucao {
  semana: {
    inicio: string;
    fim: string;
    /** Quem decide é o servidor, não o relógio do navegador, máquina com data
     *  ou fuso errado mostraria a semana errada como se fosse a de hoje. */
    eh_atual: boolean;
    eh_passada: boolean;
    /** 0 = semana atual, 1 = semana passada, 2 = duas atrás... */
    semanas_atras: number;
  };
  resumo_tarefas: {
    projetos: number;
    sem_tarefas: number;
    sem_tarefas_ativas: number;
    sem_distribuir_na_semana: number;
    com_vencidas: number;
  };
  tarefas: LinhaTarefas[];
  reunioes: {
    projeto_id: number;
    projeto_nome: string;
    realizou: boolean;
    dias: string[];
    dia_padrao: number | null;
  }[];
}

/** Um projeto na carga de alguém. Carrega a etapa porque o gráfico de barras
 *  filtra a carga por ela, com só o nome, cada troca de filtro exigiria uma
 *  requisição nova. O id deixa o chip da tabela virar link. */
export interface ProjetoDaCarga {
  id: number;
  nome: string;
  status: StatusProjeto;
}

export interface LinhaCarga {
  usuario_id: number;
  nome: string;
  posicao: string;
  /** A carga INTEIRA da pessoa, sem filtro. O gráfico de barras filtra por
   *  etapa no cliente, mas nunca reescreve este número nem a `situacao`:
   *  a mesma pessoa apareceria "Disponível" no gráfico filtrado e "Carga alta"
   *  na tabela logo abaixo. */
  total: number;
  projetos: ProjetoDaCarga[];
  /** A situação resolvida pela escala do papel, definida pela diretoria
   *  em Configurações. Vem pronta do backend porque a regra é dele, a tela
   *  reimplementá-la seria convite para divergirem.
   *
   *  `null` quando o total fica abaixo do menor mínimo da escala, a diretoria
   *  pode subir o mínimo da primeira faixa para deixar os menos carregados sem
   *  rótulo. A tela mostra um travessão. */
  situacao: { nome: string; tom: TomSituacao } | null;
  /** A pessoa caiu na faixa mais alta do seu papel.
   *
   *  Quem decide é o backend, pela POSIÇÃO da faixa na escala, não pelo nome
   *  nem pela cor, que são livres. Sem isso, a tela teria de procurar por
   *  `tom === "alerta"` ou pelo nome "Carga alta", e trocar a cor de uma faixa
   *  esvaziaria o destaque em silêncio. */
  demanda_alta: boolean;
}

/** Quantos projetos ainda cabem numa frente, por papel.
 *
 *  Os dois papéis vêm SEPARADOS de propósito. Virar um número só de "projetos
 *  vendáveis" exigiria assumir o tamanho da equipe, e a suposição sumiria
 *  dentro do resultado: quem lesse "8" não saberia que os consultores já estão
 *  no limite e que o 8 veio inteiro dos coordenadores. */
export interface CapacidadeFrente {
  /** `null` para quem não tem frente cadastrada. */
  frente_id: number | null;
  frente_nome: string;
  consultor: number;
  coordenador: number;
  pessoas: number;
}

export interface Alocacao {
  coordenadores: LinhaCarga[];
  consultores: LinhaCarga[];
  capacidade: {
    por_frente: CapacidadeFrente[];
    /** NÃO é a soma das linhas: quem está em duas frentes aparece nas duas,
     *  e somar contaria a vaga dela duas vezes. O backend conta por pessoa. */
    total: { consultor: number; coordenador: number };
    /** Até quantos projetos cada papel carrega sem sobrecarregar. Vem do
     *  backend para a tela não reescrever os números por conta própria. */
    teto: { consultor: number; coordenador: number };
  };
  /** Quem caiu na faixa mais alta do seu papel, já filtrado pelo backend.
   *  É o que devolve a leitura de "quem é o gargalo", perdida quando as
   *  duas tabelas passaram a ordenar do menos carregado para o mais. */
  demanda_alta: {
    coordenadores: LinhaCarga[];
    consultores: LinhaCarga[];
  };
}

export interface Atrasos {
  por_projeto: {
    projeto_id: number;
    projeto_nome: string;
    status: string;
    /** A SOMA dos dias de todos os motivos. Serve para volume acumulado, não
     *  para "há quanto tempo está parado", três escopos com 4 dias cada somam
     *  12 sem que nada esteja parado há 12 dias. */
    dias_totais: number;
    /** O PIOR motivo isolado. É o número em destaque na tela, e o que ordena
     *  a lista, responde "qual é o maior buraco deste projeto". */
    pior_motivo: number;
    motivos: {
      tipo: string;
      descricao: string;
      dias: number;
      escopo: string;
      projeto_escopo_id: number | null;
      /** A data que venceu: a banca não realizada ou a entrega planejada. */
      data_referencia: string | null;
      /** Já tem justificativa da diretoria cobrindo ESTE motivo (o
       *  mesmo escopo pode estar atrasado em banca e entrega ao mesmo tempo;
       *  uma nota de uma rodada de atraso anterior, já resolvida, não conta).
       *  O motivo continua na lista mesmo justificado: o alerta é automático. */
      justificado: boolean;
      /** Qual nota justifica, pra o selo "justificado" levar direto pra ela
       *  no histórico do projeto. `null` quando `justificado` é `false`. */
      justificativa_id: number | null;
    }[];
  }[];
  por_coordenador: {
    usuario_id: number;
    nome: string;
    projetos: number;
    atrasados: number;
    /** O maior atraso isolado entre os projetos dele, com o contexto junto.
     *
     *  Substituiu o acumulado: "40 dias somados" não diz se são quatro atrasos
     *  de 10 ou um de 40, e a ação é diferente em cada caso. */
    pior_dias: number;
    pior_projeto: string;
    pior_motivo: string;
  }[];
  /**
   * os escopos que passaram da JANELA, a coluna "Atraso" do card
   * "Escopos vendidos", com o porquê escrito por quem conduz o projeto.
   *
   * **Não são os `motivos` de `por_projeto`.** Aqueles perguntam "o que
   * venceu e não aconteceu?" e fecham quando o fato acontece; este pergunta
   * "o trabalho passou do tempo vendido?". Um escopo pode estourar a janela
   * com a banca realizada e a entrega em dia, e aí não há motivo nenhum
   * aberto, o projeto nem aparece na lista de atrasos.
   *
   * Vem ordenado com o que FALTA justificar primeiro: é fila de trabalho.
   */
  escopos_atrasados: {
    projeto_id: number;
    projeto_nome: string;
    projeto_escopo_id: number;
    escopo_nome: string;
    /** Dias úteis além da janela, a mesma conta da tela do projeto. */
    dias: number;
    dias_vendidos: number;
    dias_ajustados: number;
    /** `null` = ninguém explicou ainda. */
    justificativa: string | null;
    justificativa_id: number | null;
    registrado_por: string | null;
    registrado_em: string | null;
  }[];
  /** Os números da faixa do topo, calculados no backend, a divisão
   *  banca/entrega decide a leitura do  e o front recontar isso a partir
   *  das descrições seria reimplementar a classificação. */
  /** `com_externo`/`pior_externo` saíram com o motivo de entrega
   *  (2026-08-12): sem ele seriam dois zeros permanentes na faixa do topo. */
  resumo: {
    projetos: number;
    pior_caso: number;
  };
}

/** Espelha `Urgencia` de `types/tarefa.ts`, mesma gradação, backend igual. */
export type UrgenciaTarefa = "vencida" | "critica" | "atencao" | "normal";

export interface ColunaAgregada {
  /** Nome normalizado (minúsculo, sem espaço nas pontas), chave de
   *  agrupamento, já que colunas de projetos diferentes podem se chamar
   *  igual (ou quase). */
  chave: string;
  /** Nome de exibição, o da primeira coluna encontrada com esse nome. */
  nome: string;
  cor: string;
}

export interface TarefaAgregada {
  id: number;
  titulo: string;
  projeto_id: number;
  projeto_nome: string;
  cliente: string;
  responsavel_ids: number[];
  responsavel_nomes: string[];
  prazo: string;
  grupo_coluna: string;
  coluna_nome: string;
  vencida: boolean;
  urgencia: UrgenciaTarefa;
  dias_para_prazo: number | null;
}

export interface TarefasGerais {
  colunas: ColunaAgregada[];
  tarefas: TarefaAgregada[];
}

/** O escopo que decide a posição do projeto na fila, o que está mais
 *  perto de estourar o prazo, entre os que ainda estão em contagem. */
export interface EscopoCritico {
  id: number;
  nome: string;
  restantes: number;
  estourou: boolean;
  data_entrega_planejada: string | null;
}

export interface CronogramaProjetoResumo {
  projeto_id: number;
  projeto_nome: string;
  cliente: string;
  cronograma: CronogramaResposta;
  /** `null` = nenhum escopo em contagem (todos entregues/cancelados, ou
   *  nenhum começou ainda), o card vai para o fim da fila. */
  escopo_critico: EscopoCritico | null;
}

export interface CronogramasGerais {
  /** Já vem ordenado do backend, do mais perto de estourar pro mais
   *  folgado, o front só renderiza na ordem recebida. */
  projetos: CronogramaProjetoResumo[];
}

/**
 * A query string dos filtros, a mesma em todas as abas.
 *
 * `status` vai como um `?status=` REPETIDO por etapa, não como lista separada
 * por vírgula: é o formato que o FastAPI lê direto em `List[str]`, sem parse
 * manual no servidor — e é o único que sobrevive a um nome de etapa que um dia
 * contenha vírgula.
 *
 * ⚠ Lista vazia não vira parâmetro nenhum. Um `?status=` pelado chegaria ao
 * backend como `[""]`, que é valor inválido: a aba responderia 422 quando a
 * pessoa apenas desmarcou tudo.
 */
function query(
  frenteId?: number | null,
  escopoId?: number | null,
  status?: StatusProjeto[] | null,
  extra?: Record<string, string | undefined>,
): string {
  const partes = [
    frenteId ? `frente_id=${frenteId}` : "",
    escopoId ? `escopo_id=${escopoId}` : "",
    ...(status ?? []).map((s) => `status=${encodeURIComponent(s)}`),
    ...Object.entries(extra ?? {}).map(([k, v]) => (v ? `${k}=${v}` : "")),
  ].filter(Boolean);
  return partes.length ? `?${partes.join("&")}` : "";
}

export function getVisaoGeral(
  token: string,
  frenteId?: number | null,
  escopoId?: number | null,
  status?: StatusProjeto[] | null,
) {
  return apiFetch<VisaoGeral>(`/monitoramento/visao-geral${query(frenteId, escopoId, status)}`, {
    token,
  });
}

/**
 * `referencia` = qualquer dia da semana desejada, em `YYYY-MM-DD`; o servidor
 * normaliza para a segunda. Sem ela, a semana de hoje.
 *
 * Só o passado é aceito, o backend recusa data futura com 422. Semana futura
 * devolveria "não distribuiu" e "não fez reunião" para todo mundo, porque as
 * duas medem ausência de registro; a tela acusaria o time por algo que ainda
 * nem teve chance de acontecer.
 */
export function getExecucao(
  token: string,
  frenteId?: number | null,
  referencia?: string,
  escopoId?: number | null,
  status?: StatusProjeto[] | null,
) {
  return apiFetch<Execucao>(
    `/monitoramento/execucao${query(frenteId, escopoId, status, { referencia })}`,
    { token },
  );
}

export function getAlocacao(
  token: string,
  frenteId?: number | null,
  escopoId?: number | null,
  status?: StatusProjeto[] | null,
) {
  return apiFetch<Alocacao>(`/monitoramento/alocacao${query(frenteId, escopoId, status)}`, { token });
}

export function getAtrasos(
  token: string,
  frenteId?: number | null,
  escopoId?: number | null,
  status?: StatusProjeto[] | null,
) {
  return apiFetch<Atrasos>(`/monitoramento/atrasos${query(frenteId, escopoId, status)}`, { token });
}

export function getTarefasGerais(
  token: string,
  frenteId?: number | null,
  escopoId?: number | null,
  status?: StatusProjeto[] | null,
) {
  return apiFetch<TarefasGerais>(`/monitoramento/tarefas${query(frenteId, escopoId, status)}`, {
    token,
  });
}

export function getCronogramasGerais(
  token: string,
  frenteId?: number | null,
  escopoId?: number | null,
  status?: StatusProjeto[] | null,
) {
  return apiFetch<CronogramasGerais>(
    `/monitoramento/cronogramas${query(frenteId, escopoId, status)}`,
    { token },
  );
}

/* ------------------------------------------------------------------ */
/* Projetos ativos — o retrato do que está em curso                    */
/* ------------------------------------------------------------------ */

/** Uma linha da aba Projetos ativos. Espelha
 *  `use_cases/monitoramento/projetos_ativos.py`. */
export interface ProjetoAtivo {
  id: number;
  nome: string;
  cliente: string | null;
  status: StatusProjeto;
  frentes: string[];
  frente_ids: number[];
  sinergico: boolean;
  coordenador: string | null;
  coordenador_id: number | null;
  data_kickoff: string | null;
  /** Dias corridos desde o kickoff até hoje; `null` = kickoff ainda pendente. */
  dias_em_execucao: number | null;
  kickoff_pendente: boolean;
  /** A próxima banca ainda não realizada, de qualquer escopo; `null` se não há. */
  proxima_banca: string | null;
}

export function getProjetosAtivos(
  token: string,
  frenteId?: number | null,
  status?: StatusProjeto[] | null,
) {
  return apiFetch<ProjetoAtivo[]>(
    `/monitoramento/projetos-ativos${query(frenteId, null, status)}`,
    { token },
  );
}

/* ------------------------------------------------------------------ */
/* Histórico de projetos — o portfólio encerrado (só diretoria/gerência)*/
/* ------------------------------------------------------------------ */

export type FiltroHistorico = "todos" | "finalizados" | "arquivados";

/** Uma linha da aba Histórico. Espelha
 *  `use_cases/monitoramento/historico_projetos.py`. */
export interface HistoricoProjeto {
  id: number;
  nome: string;
  cliente: string | null;
  status: StatusProjeto;
  /** Arquivar é ORTOGONAL ao status: dá para arquivar um projeto que nunca
   *  chegou a "finalizado" (um pausado, por exemplo). */
  arquivado: boolean;
  /** Já vem com o NOME de cada frente resolvido pelo backend. */
  frentes: string[];
  frente_ids: number[];
  sinergico: boolean;
  coordenador: string | null;
  coordenador_id: number | null;
  data_kickoff: string | null;
  /** Quando o projeto virou "finalizado"; ou, se só arquivado, o `arquivado_em`. */
  encerrado_em: string | null;
  /** O nome do semestre em que encerrou, casado por DATA (o projeto não tem
   *  FK de semestre) — `null` quando a data não cai em nenhum semestre. */
  semestre: string | null;
  /** Dias corridos entre kickoff e encerramento; `null` sem uma das pontas. */
  duracao_dias: number | null;
}

/**
 * O portfólio encerrado que o usuário enxerga (§7.5, mesmo recorte do resto do
 * painel). `filtro` estreita no servidor; a aba pede "todos" e segmenta na
 * tela, para os contadores baterem sem três requisições.
 */
export function getHistoricoProjetos(
  token: string,
  frenteId?: number | null,
  filtro: FiltroHistorico = "todos",
) {
  return apiFetch<HistoricoProjeto[]>(
    `/monitoramento/historico-projetos${query(frenteId, null, null, { filtro })}`,
    { token },
  );
}

/* ------------------------------------------------------------------ */
/* Aprovações — a fila da diretoria                                    */
/* ------------------------------------------------------------------ */

export interface AprovacaoDiasDeAjuste {
  id: number;
  projeto_id: number;
  projeto_nome: string;
  escopo_nome: string;
  dias_solicitados: number;
  dias_vendidos: number;
  dias_ajustados: number;
  motivo: string;
  solicitado_por_nome: string | null;
  criado_em: string;
  /** O fim da janela como está hoje. `null` = escopo sem reunião inicial. */
  fim_janela: string | null;
  /**
   * ⭐ O fim da janela SE a diretoria aprovar — a resposta à pergunta que a
   * decisão faz de verdade. Não é somar: são N dias ÚTEIS a partir da reunião
   * inicial, pulando feriado, prova e recesso, e essa conta ninguém faz de
   * cabeça olhando "+5 sobre 8 vendidos".
   */
  fim_se_aprovar: string | null;
  /** §8: último dia em que ainda cabia pedir — do 1º escopo é o fim da ambientação. */
  prazo_pedido_ajuste: string | null;
  /**
   * §20.1: o pedido chegou DEPOIS do prazo dele.
   *
   * ⚠ Não é "o prazo já venceu": o que vale é a data do pedido, e um pedido
   * feito no último dia continua válido por mais que a decisão demore. Por
   * isso vem pronto do backend, em vez de sair de uma comparação com hoje.
   */
  fora_do_prazo: boolean;
}

/** Um motivo de atraso — a mesma forma que a aba Atrasos consome. */
export interface MotivoDeAtraso {
  tipo: string;
  descricao: string;
  dias: number;
  escopo: string | null;
  projeto_escopo_id: number | null;
  data_referencia: string | null;
  /** §7.4: já existe nota da diretoria cobrindo ESTE motivo. */
  justificado: boolean;
  justificativa_id: number | null;
  /**
   * §7.4: quando a diretoria PEDIU a explicação ao coordenador. `null` =
   * ninguém cobrou ainda. Com data, a fila mostra "aguardando o coordenador"
   * em vez de oferecer o pedido de novo.
   */
  pedido_em: string | null;
}

export interface AprovacaoAtraso {
  projeto_id: number;
  projeto_nome: string;
  status: string;
  dias_totais: number;
  /** ⭐ O pior motivo isolado — é ele que ordena, nunca a soma. */
  pior_motivo: number;
  /**
   * Estruturados, não frases. Sem o escopo e os dias de cada um, a diretoria
   * não tinha como escrever uma nota específica sem abrir o projeto.
   */
  motivos: MotivoDeAtraso[];
}

/** Alguém pediu para entrar num projeto e está parado esperando resposta. */
export interface AprovacaoEntrada {
  id: number;
  projeto_id: number;
  projeto_nome: string;
  usuario_id: number;
  usuario_nome: string | null;
  /** Em quantos projetos a pessoa já está — o contexto da decisão. */
  carga_do_solicitante: number;
  justificativa: string;
  criado_em: string;
}

/**
 * §5.5: a banca aconteceu e ainda espera diretoria + gerente da frente
 * (`use_cases/banca/aprovar_banca.py`).
 */
export interface AprovacaoBancaSemResultado {
  banca_id: number;
  projeto_id: number;
  projeto_nome: string;
  /** O primeiro escopo — mantido para quem já lê o campo. */
  escopo_nome: string;
  /** Todos os escopos que esta banca cobre: a decisão destrava a entrega de cada um. */
  escopos: { projeto_escopo_id: number; nome: string }[];
  realizado_em: string;
  resultado: ResultadoBanca | null;
  aprovacao_diretoria: AprovacaoDiretoria | null;
  aprovacao_gerente: AprovacaoGerente[];
}

/** §8: um pedido para marcar banca em horário já ocupado. */
export interface AprovacaoExcecaoChoque {
  id: number;
  projeto_id: number;
  projeto_nome: string;
  projeto_escopo_id: number | null;
  escopo_nome: string | null;
  data_hora_pretendida: string;
  /** O nome do projeto da banca que já ocupa o horário. */
  conflita_com: string | null;
  justificativa: string;
  solicitado_por_nome: string | null;
  criado_em: string;
}

/** §13: um pedido para marcar banca fora da janela do escopo. */
export interface AprovacaoForaDaJanela {
  id: number;
  projeto_id: number | null;
  projeto_nome: string;
  projeto_escopo_id: number;
  escopo_nome: string | null;
  data_hora_pretendida: string;
  /** O fim da janela hoje — quanto a data pretendida passa dela. */
  fim_janela: string | null;
  justificativa: string;
  solicitado_por_nome: string | null;
  criado_em: string;
}

/** §13, 2026-09-10: um pedido para remarcar uma banca que já tem data. */
export interface AprovacaoRemarcacao {
  id: number;
  banca_id: number | null;
  projeto_id: number | null;
  projeto_nome: string;
  projeto_escopo_id: number;
  escopo_nome: string | null;
  /** A data que vale hoje — o "de" do "de → para". */
  data_hora_anterior: string;
  data_hora_pretendida: string;
  /** O fim da janela do escopo, só quando a data pedida passa dele (§13). */
  fim_janela: string | null;
  /** true = aprovar também autoriza marcar fora da janela, e o botão diz isso. */
  fora_da_janela: boolean;
  justificativa: string;
  solicitado_por_nome: string | null;
  criado_em: string;
}

/** 2026-11-03: um pedido para entregar um escopo sem banca. */
export interface AprovacaoDispensaBanca {
  id: number;
  projeto_id: number | null;
  projeto_nome: string;
  projeto_escopo_id: number;
  escopo_nome: string | null;
  justificativa: string;
  solicitado_por_nome: string | null;
  criado_em: string;
}

/**
 * 2026-09-18, a pedido: alguém pediu para entrar numa banca sem vaga livre
 * pra ela (banca no teto, ou a última vaga reservada pro piso por frente que
 * ela não cobre). Aprovar cria a candidatura, acima do teto normal.
 *
 * ⚠ Não confundir com `AprovacaoEntrada` (pedido pra entrar num PROJETO, via
 * Vagas) — esta é sobre entrar como avaliador numa BANCA já marcada.
 */
export interface AprovacaoEntradaBanca {
  id: number;
  banca_id: number;
  projeto_id: number | null;
  projeto_nome: string;
  data_hora: string | null;
  frentes: string[];
  vagas: number;
  alocados: number;
  justificativa: string;
  usuario_id: number;
  usuario_nome: string | null;
  criado_em: string;
}

/**
 * Havia uma terceira fila, `entregas_sem_classificacao` (entregas atrasadas
 * sem o rótulo interno/agenda do cliente). Removida em 2026-08-12 junto com o
 * atraso de ENTREGA nos insights: sem a métrica que separava os dois tipos, a
 * classificação deixou de mudar qualquer número.
 */
export interface Aprovacoes {
  dias_de_ajuste: AprovacaoDiasDeAjuste[];
  atrasos_sem_justificativa: AprovacaoAtraso[];
  solicitacoes_de_entrada: AprovacaoEntrada[];
  bancas_sem_resultado: AprovacaoBancaSemResultado[];
  /** §8: pedidos para marcar banca em horário já ocupado. */
  excecoes_de_choque: AprovacaoExcecaoChoque[];
  /** §13: pedidos para marcar banca fora da janela do escopo. */
  bancas_fora_da_janela: AprovacaoForaDaJanela[];
  /** §13, 2026-09-10: pedidos para remarcar uma banca que já tem data. */
  remarcacoes_de_banca: AprovacaoRemarcacao[];
  /** 2026-09-18: pedidos para entrar como avaliador numa banca sem vaga. */
  entradas_em_banca: AprovacaoEntradaBanca[];
  /** 2026-11-03: pedidos para entregar um escopo sem banca. */
  dispensas_de_banca: AprovacaoDispensaBanca[];
  /** Servido pronto pelo backend — o badge da aba precisa dele antes de
   *  qualquer render, e somar no front duplicaria a conta. */
  total: number;
}

/**
 * Tudo que espera decisão da diretoria, numa chamada.
 *
 * Sem `frenteId` de propósito: a fila é dela e ela enxerga a área inteira
 *. Um filtro aqui só criaria a chance de um pedido ficar escondido atrás
 * de uma opção que alguém deixou ligada.
 */
export function getAprovacoes(token: string) {
  return apiFetch<Aprovacoes>("/monitoramento/aprovacoes", { token });
}
