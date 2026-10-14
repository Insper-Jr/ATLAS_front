/**
 * O projeto e sua equipe (, –6.4).
 *
 * As formas aqui espelham os dois serializers do backend
 * (`use_cases/projeto/get_projeto.py`): o **resumo**, que alimenta os cards da
 * lista, e o **completo**, que a página do projeto consome.
 */

import type { ResultadoBanca, StatusBanca } from "@/types/banca";

/** Os 8 status do ciclo de vida + Pausado, que é um estado à parte. */
export type StatusProjeto =
  | "contrato_em_elaboracao"
  | "vendido"
  | "ambientacao"
  | "em_andamento"
  | "validacao_bancas"
  | "envio_tep"
  | "periodo_ajustes"
  | "finalizado"
  | "pausado";

export type PapelProjeto = "coordenador" | "consultor";

/** A forma enxuta, cards da lista. */
export interface ProjetoResumo {
  id: number;
  nome: string;
  cliente: string | null;
  criado_em: string;
  status: StatusProjeto;
  /** Contrato institucional (Agro etc.) — sem frente/equipe/escopo, só
   *  existe pra pendurar um documento jurídico. Fica fora da lista/Kanban
   *  geral de projetos e do Monitoramento pra sempre. */
  institucional: boolean;
  /** Nasceu pelo "+ Novo projeto (atalho)" (2026-10-14). Kickoff opcional:
   *  sem pendência, sem alerta, e Vendido sai pra qualquer etapa; cronograma
   *  e banca não dependem dele. A declaração de interesse não abre sozinha. */
  criado_pelo_atalho: boolean;
  frente_ids: number[];
  /** 2 frentes = projeto sinérgico; aparece para os dois gerentes. */
  sinergico: boolean;
  /** @deprecated Primeiro da lista, só pra quem ainda não migrou pra
   *  `coordenador_ids` — projeto pode ter mais de um coordenador. */
  coordenador_id: number | null;
  coordenador_ids: number[];
  consultor_ids: number[];
  /** Quem VENDEU o projeto. Zero ou mais.
   *
   *  ⚠ Fora de `consultor_ids` de propósito: vendedor não é da equipe. Vender
   *  não ocupa vaga de consultor nem entra na conta de capacidade — quem
   *  vendeu ganhou visão de leitura, não trabalho. */
  vendedor_ids: number[];
  /** Teto de consultores da equipe, escolhido na criação do projeto. O
   *  backend já mandava; faltava declarar aqui. */
  max_consultores: number | null;
  /** ⭐ 2026-09-22 — a pedido: se a declaração de interesse deste projeto
   *  está aberta em Vagas em Projetos. Abre sozinho ao assinar o Contrato
   *  de PS; fecha/abre manualmente quem lidera o projeto. */
  vagas_abertas: boolean;
  data_kickoff: string | null;
  kickoff_pendente: boolean;
  /** `null` = ambientação começa no próprio kickoff, o padrão. Só não-nulo
   *  quando o coordenador do projeto corrigiu que ela começou antes dele. */
  data_inicio_ambientacao: string | null;
  /** Arquivar não é excluir, só some das listagens normais. */
  arquivado_em: string | null;
  /** A banca ainda não realizada mais próxima, de qualquer escopo deste
   *  projeto. `null` se nenhuma estiver marcada ou todas já aconteceram. */
  proxima_banca: string | null;
  /** "Limpar histórico": corte de exibição da timeline (aba Histórico) —
   *  não apaga nada, as linhas anteriores continuam usadas na contagem de
   *  dias. `null` = nada oculto, mostra a timeline inteira. */
  historico_oculto_ate: string | null;
}

export interface MembroProjeto {
  usuario_id: number;
  papel: PapelProjeto;
  entrou_em: string;
}

export type StatusEscopo = "nao_iniciado" | "em_andamento" | "entregue" | "cancelado";

/** Como a banca aparece dentro do escopo (só o que a tabela precisa). */
export interface BancaDoEscopo {
  id: number;
  data_hora: string | null;
  realizado_em: string | null;
  resultado: ResultadoBanca | null;
  status: StatusBanca;
  /** Todos os escopos que esta banca cobre, este incluído, uma banca pode
   *  avaliar mais de um escopo do projeto de uma vez. */
  escopo_ids: number[];
  /**
   * ⭐ Cada TENTATIVA da banca, da primeira à atual (§9).
   *
   * Os campos acima descrevem só a tentativa CORRENTE: uma banca reprovada e
   * remarcada tem `data_hora` da 2ª e `resultado` nulo, e a reprovação da 1ª
   * vive aqui. É o que permite ao cronograma pintar as duas.
   *
   * Opcional porque as bancas anteriores a `banca_sessao` não têm nenhuma —
   * quem lê precisa tratar a lista vazia.
   */
  sessoes?: SessaoDaBanca[];
}

/** Uma tentativa de banca (§9) — a linha de `banca_sessao`. */
export interface SessaoDaBanca {
  id: number;
  /** 1 na primeira, 2 na segunda… É o que vira "2ª banca" na tela. */
  numero: number;
  data_hora: string | null;
  realizado_em: string | null;
  resultado: ResultadoBanca | null;
  /** Preenchido = tentativa arquivada. A corrente é a única sem ele. */
  encerrada_em: string | null;
  /** A tentativa foi cancelada e a banca marcada de novo (2026-10-13). */
  cancelada_em?: string | null;
}

/**
 * Um escopo vendido, com a contagem do  **já calculada pelo backend**.
 *
 * O front nunca recalcula dias úteis, só desenha a barra. É a mesma doutrina
 * de `permissoes.ts`: a regra mora num lugar só.
 */
export interface EscopoVendido {
  id: number;
  projeto_id: number;
  escopo_id: number | null;
  nome_customizado: string | null;
  /** Já resolvido: o nome do catálogo, ou o digitado quando é um "Outro". */
  nome: string;
  frente_id: number;
  /**
   * O calendário acadêmico que ESTE escopo segue — a base de contagem dos
   * dias úteis dele: janela, atraso e o cinza do cronograma.
   *
   * Vale dentro de `frente_id`: o par (frente, calendário) é o que identifica
   * um calendário base. `null` não quer dizer "não escolhido" — é o calendário
   * da frente que tem um só (Business, Direito, Processos), que não tem rótulo.
   * Ver `GET /calendarios-para-escolha`.
   */
  calendario: string | null;
  /** Ordem de exibição na tela do projeto, setinhas trocam este valor
   *  entre vizinhos, não é a ordem de criação (`id`). */
  ordem: number;
  /** Imutável, o registro comercial. Nunca vira "vendidos + ajustados". */
  dias_uteis_vendidos: number;
  /** Dias extras autorizados pela diretoria. Somam com os vendidos para
   *  formar a janela, mas são mostrados à parte: a tela diz
   *  *20 vendidos · 10 ajustados*, nunca "30 vendidos". */
  dias_uteis_ajustados: number;
  status: StatusEscopo;
  /** A reunião inicial, é ela que abre a janela do escopo. */
  data_inicio: string | null;
  data_entrega_planejada: string | null;
  data_entrega_real: string | null;
  tipo_atraso_entrega: "interno" | "externo" | null;
  /**
   * Carimbo do `POST /escopos-projeto/{id}/oficializar`, informativo,
   * só alimenta o banner "Cronograma oficializado em …".
   *
   * Não confundir com a JANELA do escopo (`data_inicio` → `fim_janela`):
   * são conceitos que convivem e não se consultam. A janela abre na reunião
   * inicial e não pergunta se o cronograma foi oficializado; oficializar não
   * mexe em dia nenhum da contagem. O merge do reajuste apagou este campo sem
   * querer, ele fica, o backend manteve a coluna e a rota.
   */
  cronograma_oficializado_em: string | null;
  consumidos: number;
  /** Pode ser negativo, é o "estourou em N dias". Medido contra
   *  *vendidos + ajustados*. */
  restantes: number;
  estourou: boolean;
  em_contagem: boolean;
  /** , dias úteis além da janela, derivados. Zero enquanto ela não estoura. */
  atraso: number;
  /**
   * o "porquê" do `atraso` acima, escrito por quem conduz o projeto.
   *
   * `null` = ainda não justificado, e é o que faz o card "Escopos vendidos"
   * PEDIR a nota em vez de só mostrar o número. Só a mais recente vem aqui —
   * o histórico completo das notas fica na aba Histórico.
   */
  justificativa_atraso: {
    id: number;
    texto: string;
    registrado_por: string | null;
    registrado_em: string;
  } | null;
  /**
   * , dias úteis pintados depois de a BANCA ser realizada: as
   * **correções** que ela apontou.
   *
   * **Não confundir com `dias_uteis_ajustados`.** Dias de ajuste aumentam a
   * JANELA do escopo e são pedidos à diretoria nos 3 primeiros dias úteis
   * depois da largada, é trabalho vendido que faltou. Correção é o tempo
   * gasto depois da banca arrumando o que ela apontou: não aumenta janela, não
   * se pede a ninguém, e não conta como atraso.
   */
  correcoes: number;
  /** O último dia da janela: início + vendidos + ajustados dias úteis.
   *  `null` enquanto o escopo não tem reunião inicial. */
  fim_janela: string | null;
  /** último dia em que ainda cabe PEDIR dias de ajuste. */
  prazo_pedido_ajuste: string | null;
  /** O prazo ainda está aberto hoje. */
  pedido_ajuste_aberto: boolean;
  banca: BancaDoEscopo | null;
  /** só true quando a banca do escopo saiu aprovada. */
  entrega_liberada: boolean;
  /**
   * ⭐ Quando alguém **confirmou** que a entrega foi ao cliente — o ato que
   * move o status para "entregue".
   *
   * ⚠ Não confundir com `data_entrega_real`, que é o DIA da entrega marcado no
   * cronograma. A data é registro (editável, corrigível); a confirmação é
   * declaração, e só ela muda o status. `null` = a data está marcada mas
   * ninguém afirmou a entrega ainda.
   */
  entrega_confirmada_em: string | null;
  /** O nome de quem confirmou — já resolvido pelo backend. */
  entrega_confirmada_por: string | null;
  /** O pedido de dias aguardando a diretoria — um por vez. */
  reajuste_pendente: PedidoDeDias | null;
}

/** um pedido de dias de ajuste aguardando decisão. */
export interface PedidoDeDias {
  id: number;
  dias_solicitados: number;
  motivo: string;
  solicitado_por: number;
  solicitado_por_nome: string | null;
  criado_em: string;
}

/** A forma completa, página do projeto, aba Visão geral. */
export interface ProjetoCompleto extends ProjetoResumo {
  escopos: EscopoVendido[];
  descricao: string | null;
  link_proposta: string | null;
  anexo_proposta_nome: string | null;
  dias_ambientacao: number;
  /**
   * O último dia de ambientação, kickoff + `dias_ambientacao` dias
   * ÚTEIS, calculado pelo backend. Passado ele, o projeto vira Em andamento
   * sozinho. `null` = sem janela (sem kickoff ou zero dias), e aí a saída de
   * Ambientação continua sendo pela mão de alguém.
   */
  fim_ambientacao: string | null;
  /** ⭐ DERIVADA: a entrega do último escopo. O que ACONTECEU. */
  data_entrega_cliente: string | null;
  /**
   * ⭐ A PROMESSA feita ao cliente na venda. O que foi COMBINADO.
   *
   * Campo próprio, e não o de cima: juntar as duas fazia a promessa ser
   * sobrescrita pela realidade na primeira entrega. Separadas, dá para medir
   * se o projeto cumpriu o prazo prometido.
   */
  data_entrega_prevista_cliente: string | null;
  /** 1 = segunda … 7 = domingo. */
  dia_reuniao_padrao: number | null;
  criado_por: number | null;
  equipe: MembroProjeto[];
  /** Teto de consultores, decide quando o projeto sai da lista de vagas. */
  max_consultores: number;
  /** `true` para quem abriu como visitante: avaliador escalado numa banca
   *  deste projeto, sem enxergá-lo pelo §3. O shell usa a flag para mostrar
   *  só a aba Banca — as outras devolveriam 404 no clique. */
  apenas_banca: boolean;
  /** `true` quando a pessoa enxerga este projeto SÓ por tê-lo vendido.
   *
   *  Vê a ficha inteira, todas as abas, e nenhum botão de ação. Independente
   *  de `apenas_banca`: um avaliador não é vendedor, e o vendedor vê muito
   *  mais que a aba Banca.
   *
   *  A flag existe porque as permissões são globais por posição: sem ela, a
   *  tela de um consultor-vendedor mostraria "Nova tarefa" num projeto onde a
   *  API responde 403. */
  somente_leitura: boolean;
}

/**
 * Uma linha de `projeto_status_historico`. `alterado_por` vazio = o sistema
 * mudou sozinho (o kickoff, por exemplo), não uma pessoa clicando.
 */
export interface StatusHistorico {
  tipo: "status";
  id: number;
  status_anterior: StatusProjeto | null;
  status_novo: StatusProjeto;
  alterado_por: number | null;
  alterado_em: string;
}

/**
 * A nota de atraso da diretoria, `projeto_justificativa_atraso`, na
 * mesma linha do tempo do histórico de status. `alterado_em` aqui é quando a
 * nota foi registrada, não uma "mudança", o nome é o mesmo do status pra dar
 * uma chave só pra ordenar/agrupar por dia.
 */
export interface JustificativaAtrasoHistorico {
  tipo: "justificativa_atraso";
  id: number;
  projeto_escopo_id: number | null;
  /** "banca" | "escopo" | null (nota geral). Os tipos de entrega saíram dos
   *  insights em 2026-08-12, mas notas antigas ainda os carregam. */
  motivo_tipo: string | null;
  /**
   * **O texto da nota vem em `detalhe`, não aqui.**
   *
   * O backend unificou as fontes do histórico num envelope com `titulo` e
   * `detalhe` prontos, e parou de emitir `texto`. O campo continua declarado
   *, opcional, porque declará-lo obrigatório foi o que escondeu o bug: a
   * tela lia `linha.texto`, o `tsc` aprovava, e a nota renderizava vazia.
   */
  texto?: string;
  registrado_por: number;
  alterado_em: string;
  //: O campo de autoria comum a todas as cinco fontes, o backend o emite
  //: junto de `registrado_por` para a tela não precisar saber de qual veio.
  alterado_por?: number | null;
  titulo?: string;
  detalhe?: string | null;
}

/**
 * O que TODA linha do histórico carrega, qualquer que seja o tipo.
 *
 * O backend compõe a lista de cinco fontes e devolve `titulo`/`detalhe` já
 * escritos, é o que deixa a tela renderizar um tipo novo sem saber nada
 * sobre ele. Antes disto, um tipo não previsto caía no ramo de status,
 * tentava ler `status_novo` inexistente e derrubava a PÁGINA INTEIRA.
 */
interface LinhaBase {
  id: number | string;
  /** Frase pronta: "Status: X → Y", "+5 dias de ajuste aprovados, escopo". */
  titulo?: string;
  /** O texto livre por baixo: justificativa, motivo, observação. */
  detalhe?: string | null;
  /** Chave única de ordenação e agrupamento por dia. Sempre presente. */
  alterado_em: string;
  alterado_por?: number | null;
}

/** o PEDIDO de dias, com o texto que o coordenador escreveu. */
export interface PedidoDeDiasHistorico extends LinhaBase {
  tipo: "pedido_de_dias";
  /** Ainda sem resposta da diretoria, a linha aparece assim mesmo. */
  aguardando?: boolean;
}

/** a DECISÃO sobre o pedido, com o texto que a diretoria escreveu. */
export interface DiasDeAjusteHistorico extends LinhaBase {
  tipo: "dias_de_ajuste";
  aprovado?: boolean;
}

/** o que ficou combinado numa reunião, só as que têm anotação. */
export interface ReuniaoHistorico extends LinhaBase {
  tipo: "reuniao";
}

/** uma data de entrega prometida que mudou (ou foi registrada). */
export interface EntregaAlteradaHistorico extends LinhaBase {
  tipo: "entrega_alterada";
  autorizado_por?: number | null;
}

/** A remarcação de uma banca. */
export interface RemarcacaoBancaHistorico {
  //: O backend emite `banca_remarcada`. A tela chamava isto de
  //: `remarcacao_banca` e o `if` nunca casava, a linha caía no ramo de
  //: status e quebrava a página.
  tipo: "banca_remarcada";
  id: number;
  projeto_escopo_id: number | null;
  data_anterior: string;
  data_nova: string;
  /** Mesmo caso de `texto` na justificativa de atraso: o motivo escrito vem
   *  em `detalhe`. Opcional para o `tsc` cobrar quem tentar lê-lo. */
  justificativa?: string;
  registrado_por: number | null;
  alterado_em: string;
  titulo?: string;
  detalhe?: string | null;
  alterado_por?: number | null;
}

/**
 * ⭐ A banca tendo ACONTECIDO, e no que deu (§8).
 *
 * Uma linha por SESSÃO: a banca que reprovou continua no histórico depois que
 * a segunda é marcada — é o que dá sentido ao rótulo "2ª banca". O veredito vem
 * escrito em `detalhe`, junto do resto do envelope comum.
 */
export interface BancaRealizadaHistorico {
  tipo: "banca_realizada";
  id: string;
  projeto_escopo_id: number | null;
  titulo: string;
  detalhe: string | null;
  alterado_em: string;
  alterado_por?: number | null;
}

export type HistoricoEntrada =
  | StatusHistorico
  | JustificativaAtrasoHistorico
  | RemarcacaoBancaHistorico
  | BancaRealizadaHistorico
  | DiasDeAjusteHistorico
  | PedidoDeDiasHistorico
  | ReuniaoHistorico
  | EntregaAlteradaHistorico;

/** O que o formulário de equipe manda de volta, sem `entrou_em`, que é do backend. */
export interface MembroEquipePayload {
  usuario_id: number;
  papel: PapelProjeto;
}
