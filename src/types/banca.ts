import type { Posicao } from "./auth";

/**
 * Os 5 estados da banca.
 *
 * `atrasada`, venceu e não aconteceu, é o estado que não existia antes da
 * F5 e que destrava o monitoramento. Uma banca `atrasada` **ainda aceita
 * inscrição**: quem fecha é a realização, não o calendário.
 *
 * `cancelada` é a única saída manual que resta (2026-09-04): não existe mais
 * "Registrar realização" — `data_hora` passar sozinho já marca a banca como
 * realizada e dispara as avaliações. Cancelar (gerência/diretoria de
 * projetos) é o único jeito de tirar uma banca desse trilho, e só antes de
 * ela acontecer.
 */
export type StatusBanca = "nao_marcada" | "aberta" | "realizada" | "atrasada" | "cancelada";

export type ResultadoBanca = "aprovada" | "nao_aprovada";

/**
 * Campos vindos direto da tabela `banca`.
 *
 * `data_hora` é nullable no banco (é o que torna `nao_marcada` representável),
 * mas nenhum caminho de criação deixa a coluna vazia, tanto `POST /bancas`
 * quanto marcar pelo cronograma exigem a data. Na prática, "escopo sem banca"
 * é ausência de LINHA, e quem mostra isso é a aba Visão geral, lendo
 * `escopo.banca === null`. Por isso o tipo de listagem mantém a data
 * obrigatória, em vez de espalhar guardas por telas onde o caso não ocorre.
 */
export interface BancaBase {
  id: number;
  nome_projeto: string;
  escopo_id: number | null; // vazio quando o escopo vendido é um "Outro"
  coordenador_id: number;
  /** ⚠ **Nulo quando a banca ainda não foi marcada** — é o que torna o estado
   *  `nao_marcada` representável (a coluna é `nullable=True` em `banca_model.py`).
   *
   *  Este campo dizia `string` e mentia. Por isso o TypeScript nunca apontou os
   *  usos desprotegidos, e a banca sem data virava "Invalid Date" no card e
   *  liderava as listas ordenadas (`new Date(null).getTime()` é 0, o epoch). */
  data_hora: string | null; // ISO 8601
  /** Nulo = usa a soma do piso das frentes vinculadas. Só a diretoria
   *  define, ver `podeAgendar`/`usuario.posicao === "diretor"` no form. */
  piso_minimo_override: number | null;
  /**
   * O piso REAL da composição, já resolvido pela API: o override quando
   * existe, senão a soma do `piso_banca` das frentes vinculadas.
   *
   * Não confundir com `vagas`, que é o TETO de quantos cabem na banca.
   * Comparar `alocados < vagas` para dizer "abaixo do mínimo" acusa quase
   * toda banca, o teto é 5 e o  pede 3 numa banca só de Business.
   */
  piso_minimo: number;
  /**
   * ⭐ O mesmo `piso_minimo` acima, ABERTO por frente — o que a matriz de
   * Configurações exige e o que a banca tem hoje (2026-09-02).
   *
   * Existe porque o piso é uma soma: ele diz "faltam 2" e não diz de quê.
   * Vazio na banca legada, que não tem frente vinculada e por isso não cai em
   * combinação nenhuma.
   */
  composicao: ComposicaoDaFrente[];
}

/**
 * Uma linha da composição da banca — o PISO daquela frente e a contagem dela.
 *
 * ⚠ Só piso: não há mais teto por frente (2026-09-03). Completar acima do
 * piso é "tanto faz a frente", e o único teto é o total da banca (`vagas`).
 */
export interface ComposicaoDaFrente {
  frente_id: number;
  frente_nome: string;
  min_membros: number;
  min_lideranca: number;
  /** Já sem quem ocupa a cota de liderança: ela é vaga A MAIS, não sai daqui. */
  membros: number;
  liderancas: number;
}

// Campos calculados que a API adiciona em GET /bancas e GET /bancas/{id}
// (não existem no banco, ver seção "Campos calculados" do schema)
export interface Banca extends BancaBase {
  status: StatusBanca;
  vagas: number;
  alocados: number;
  /**
   * ⭐ 2026-09-18: "tem vaga" PRA QUEM ESTÁ OLHANDO — pode ser `false` mesmo
   * com `alocados < vagas`, quando a última vaga é reservada pro piso de
   * uma frente que esta pessoa não cobre (ex.: falta 1 de Tech, e quem está
   * logado é de Business). É por isso que a mesma banca aparece "com vaga"
   * pra um consultor de Tech e "lotada" pra um de Business.
   */
  vaga_disponivel_para_mim: boolean;
  /**
   * quem NÃO pode avaliar esta banca por ser do grupo dela —
   * coordenador + equipe do projeto dos escopos que ela cobre.
   *
   * Vem do backend porque a resposta depende de duas fontes: a tabela legada
   * `equipe_projeto` (preenchida à mão na tela de bancas) e `projeto_membro`,
   * que é a equipe real e a única que existe quando a banca nasce pelo
   * cronograma. Olhar só a primeira deixava o consultor se inscrever na banca
   * do próprio projeto.
   */
  equipe_ids: number[];
  semestre_id: number;
  semestre_nome: string;
  /** A costura com o projeto: os escopos vendidos que esta banca cobre.
   *  Vazio nas bancas legadas, que não têm escopo vendido. */
  projeto_escopo_ids: number[];
  /** Os escopos do CATÁLOGO que a banca cobre — a chave que casa com
   *  `Pergunta.escopo_id`. O formulário de avaliação mostra um bloco de
   *  critérios por item aqui, empilhados. Banca de 1 escopo: 1 item. Banca
   *  legada: cai em `[escopo_id]`. */
  escopos_avaliados_ids: number[];
  realizado_em: string | null;
  /** ⭐ Preenchido só pela ação manual de cancelar (`POST /bancas/{id}/cancelar`,
   *  gerência/diretoria de projetos). Nulo em toda banca que ainda pode
   *  acontecer — inclusive as automáticas, que nunca passam por aqui. */
  cancelada_em: string | null;
  /** Onde a banca vai acontecer — texto livre, preenchido por quem é do
   *  projeto avaliado, editável até 1h antes. Nulo enquanto ninguém registrou. */
  local: string | null;
  /** Link da entrega anexado por consultor/coord do projeto, para acesso
   *  antes ou depois da banca. Nulo até alguém salvar. */
  entrega_link: string | null;
  resultado: ResultadoBanca | null;
  /** O relato do coordenador do projeto sobre a banca, texto livre, no
   *  lugar do formulário de avaliação (ele não é avaliador da própria
   *  banca). Nulo até ele preencher, só disponível depois de `realizado_em`. */
  descricao_coordenador: string | null;
  descricao_coordenador_enviada_em: string | null;
}

/**
 * A ficha da banca com os nomes RESOLVIDOS pelo backend, o retorno de
 * `GET /bancas/{id}/detalhes`.
 *
 * Existe ao lado de `Banca` (que traz ids crus) porque serve outro consumidor:
 * quem só quer mostrar a banca, sem carregar as listas de usuários, frentes e
 * candidaturas da empresa inteira para traduzir id em nome. Ver
 * `getBancaDetalhes` em `lib/bancas.ts`.
 */
export interface BancaDetalhes {
  id: number;
  nome_projeto: string;
  data_hora: string | null;
  realizado_em: string | null;
  /** ⭐ Preenchido só pela ação manual de cancelar — ver `BancaBase.cancelada_em`. */
  cancelada_em: string | null;
  /** Ver `BancaBase.local` — onde a banca vai acontecer, texto livre. */
  local: string | null;
  /** Ver `BancaBase.entrega_link`. */
  entrega_link: string | null;
  resultado: ResultadoBanca | null;
  status: StatusBanca;
  /** Plural: uma banca pode cobrir vários escopos do projeto de uma sentada. */
  escopos: string[];
  frentes: string[];
  /** As mesmas frentes com id — a ficha agrupa os avaliadores por frente da
   *  banca (liderança/membro de cada uma) e precisa casar `frente_ids` de
   *  cada pessoa. Vazio na banca legada, sem frente vinculada. */
  frentes_da_banca: { id: number; nome: string }[];
  /** ⭐ O que a combinação de frentes exige e o que a banca tem hoje, aberto
   *  por frente (mín./máx. de membro e de liderança). É o que deixa a ficha
   *  dizer "Membros · Business 2/3" e marcar frente lotada. Mesmo shape do
   *  `Banca.composicao`. Vazio na banca legada. */
  composicao: ComposicaoDaFrente[];
  /** Nome(s) — "e" entre os dois quando o projeto tem mais de um coordenador. */
  coordenador: string;
  /** ⚠ Só o PRIMEIRO coordenador, mantido pra quem ainda lê esse campo —
   *  projeto pode ter mais de um (2026-08-20). Para "sou eu, entre todos os
   *  coordenadores?" use `coordenador_ids`. */
  coordenador_id: number | null;
  /** Todos os coordenadores do projeto — comparar por nome quebra em
   *  homônimos e em qualquer diferença de grafia. */
  coordenador_ids: number[];
  /** Já sem o(s) coordenador(es), que tem(êm) linha própria na ficha. */
  membros: string[];
  /** ⭐ Objetos, não nomes: a aba precisa do id para saber quem é o usuário
   *  logado e se ele já enviou a avaliação nesta tentativa. */
  avaliadores: AvaliadorDaBanca[];
  descricao_coordenador: string | null;
  /** `null` nas bancas legadas, sem escopo vendido vinculado. */
  projeto_id: number | null;
  /** ⭐ Cada TENTATIVA (§9) — a 1ª que reprovou continua aqui depois da 2ª. */
  sessoes: SessaoDeBanca[];
  /** ⭐ As notas e o feedback de quem avaliou — pedagógico, não decide a
   *  banca. Só avaliações SUBMETIDAS. */
  avaliacoes: AvaliacaoDaBanca[];
  /** `true` quando a rota tirou o autor de cada avaliação (2026-10-16: quem
   *  é do projeto e não tem o Dashboard de Bancas lê notas e comentários
   *  sem saber de quem). Aí `avaliador` vem nulo e a ordem da lista não é a
   *  de envio. Com o dashboard vem `false`, com os nomes. */
  avaliacoes_anonimas: boolean;
  /** ⭐ Quem aprova a banca é diretoria + gerente da frente, não os
   *  avaliadores (§5.5, §8). */
  aprovacao: AprovacaoDaBanca;
  /** Média das notas por critério. Outra dimensão que a aprovação: mede QUÃO
   *  BEM, não se pode ir ao cliente. `null` quando ninguém preencheu notas. */
  nota_final: number | null;
}

/**
 * Um avaliador escalado, com o estado dele NESTA tentativa.
 *
 * `presente` vem de `candidatura.confirmado`, marcado ao registrar a
 * realização — escalado e compareceu são coisas diferentes.
 */
export interface AvaliadorDaBanca {
  usuario_id: number;
  /** A candidatura, não o usuário — o que `DELETE /candidaturas/{id}`
   *  (desalocar) pede. Quem tem `pode_gerir_membros` usa pra tirar esta
   *  pessoa da banca direto da ficha. */
  candidatura_id: number;
  nome: string;
  presente: boolean;
  /** A posição da pessoa hoje. */
  posicao: Posicao;
  /** ⭐ Categoria da EXIBIÇÃO (liderança x membro): gerente, coordenador e
   *  diretoria são liderança. É mais grosso que a contagem por frente do
   *  backend — a ficha quer dizer "é gestão", a contagem quer saber se a
   *  cota daquela frente foi coberta. */
  eh_lideranca: boolean;
  /** As frentes a que a pessoa está vinculada. A ficha cruza com
   *  `BancaDetalhes.frentes_da_banca` para agrupar por frente. */
  frente_ids: number[];
  /** Coordenador de vendas: só para o "· vendas" no nome. Quem decide se a
   *  pessoa cai no bloco "outras frentes" é `lideranca_sem_frente`, abaixo —
   *  mais largo, cobre vendas E diretoria. */
  coordenador_vendas: boolean;
  /** ⭐ Liderança SEM frente (2026-09-04): coordenador de vendas OU
   *  diretoria (qualquer tipo — projetos, pessoas, geral). Nenhum dos dois
   *  fecha o piso de liderança de frente nenhuma no backend, então
   *  `agruparAvaliadores` os joga no bloco "outras frentes" mesmo vinculados
   *  a uma frente da banca — senão o nome apareceria ali e a cota "2/3" não
   *  contaria a pessoa, a mesma divergência que este campo existe pra evitar. */
  lideranca_sem_frente: boolean;
  /** O rascunho ou envio dele nesta sessão — `null` se ainda não abriu. */
  avaliacao_id: number | null;
  ja_enviou: boolean;
  comentario_feedback: string | null;
}

/** Uma tentativa de banca (§9) — a linha de `banca_sessao`. */
export interface SessaoDeBanca {
  id: number;
  numero: number;
  data_hora: string | null;
  realizado_em: string | null;
  resultado: ResultadoBanca | null;
  /** Preenchido = tentativa arquivada; a corrente é a única sem ele. */
  encerrada_em: string | null;
  /** A tentativa foi cancelada e a banca marcada de novo (2026-10-13). */
  cancelada_em: string | null;
}

/** Uma nota (ou resposta) dada a um critério do formulário. */
export interface NotaDoCriterio {
  pergunta: string;
  ordem: number;
  /** Critério de nota traz isto; pergunta dissertativa traz `resposta_texto`. */
  nota: number | null;
  resposta_texto: string | null;
}

/** A avaliação de um avaliador numa tentativa — notas e feedback pedagógico. */
export interface AvaliacaoDaBanca {
  /** Com `BancaDetalhes.avaliacoes_anonimas`, é só a posição na lista. */
  id: number;
  /** Nulos na versão anônima. */
  avaliador: string | null;
  avaliador_id: number | null;
  /** A tentativa a que esta avaliação pertence. */
  sessao: number;
  comentario_feedback: string | null;
  /** Também nulo na versão anônima: a hora do envio entregaria quem foi. */
  submetida_em: string | null;
  /** ⭐ Critério a critério — é o que a aba abre ao clicar no nome. */
  notas: NotaDoCriterio[];
}

/** A assinatura da diretoria de projetos — vale para a banca inteira. */
export interface AprovacaoDiretoria {
  aprovado: boolean;
  usuario_nome: string | null;
  em: string | null;
  nota: string | null;
}

/** A assinatura do gerente de UMA frente da banca — uma por frente. */
export interface AprovacaoGerente {
  frente_id: number;
  frente_nome: string;
  /** `null` = esta frente ainda não teve seu gerente decidindo. */
  aprovado: boolean | null;
  usuario_nome: string | null;
  em: string | null;
  nota: string | null;
  /**
   * ⭐ Quem PODE dar esta assinatura: os gerentes vinculados à frente, ou,
   * quando ninguém está vinculado ainda, todo gerente ativo do sistema (para
   * a tela indicar a quem pedir o cadastro em vez de destravar sozinha).
   * Pode vir vazio só se não houver gerente nenhum cadastrado em lugar
   * nenhum.
   */
  possiveis_gerentes: string[];
}

/**
 * Quem aprova a banca é diretoria de projetos OU gerente de qualquer frente
 * dela (§5.5, §8): qualquer um decide sozinho, sem esperar os demais.
 */
export interface AprovacaoDaBanca {
  resultado: ResultadoBanca | null;
  /** `null` = a diretoria ainda não decidiu. */
  aprovacao_diretoria: AprovacaoDiretoria | null;
  /** Vazio quando nenhuma frente da banca tem gerente cadastrado — nesse
   *  caso só a diretoria decide. */
  aprovacao_gerente: AprovacaoGerente[];
}

export interface Candidatura {
  id: number;
  banca_id: number;
  usuario_id: number;
  criado_em: string;
  confirmado: boolean;
}

export interface Desempenho {
  semestre_id: number;
  semestre_nome: string;
  bancas_atendidas: number;
  total_bancas_realizadas: number;
  percentual: number;
}

/** O CATÁLOGO de escopos por frente, distinto do escopo vendido de um
 *  projeto, que é `EscopoVendido` em `types/projeto.ts`. */
export interface Escopo {
  id: number;
  nome: string;
  frente_id: number | null;
  ativo: boolean;
}

/** Nome resolvido de um escopo VENDIDO (de um projeto), de todos os
 *  projetos, usado só pra página Bancas resolver `Banca.projeto_escopo_ids`
 *  em nomes, já que ela lista bancas de projetos diferentes ao mesmo tempo.
 *  Versão enxuta de `EscopoVendido` (`types/projeto.ts`), sem a contagem de
 *  dias, que não faz sentido fora do contexto de um projeto só. */
export interface EscopoVendidoResumo {
  id: number;
  projeto_id: number;
  nome: string;
}

export interface Frente {
  id: number;
  nome: string;
  ativa: boolean;
  /** Mínimo de membros da frente exigido numa banca, editável pela
   *  diretoria em Config. */
  piso_banca: number;
}

export interface Configuracao {
  id: number;
  /** Health Track §7: a partir de quantas avaliações seguidas na mesma cor
   *  um pilar vira alerta de persistência. */
  health_track_persistencia_amarelo: number;
  health_track_persistencia_vermelho: number;
  /** Teto de pessoas por banca, editável pela diretoria em Config. */
  vagas_por_banca: number;
  /** Quantas lideranças (gerente da frente, ou diretor) cada frente
   *  vinculada precisa ter na banca, separado do piso de membros comuns
   * , editável pela diretoria em Config. */
  lideranca_minima_por_frente: number;
  /** Gestão de Pessoas (2026-10-21): limites por categoria, regra de alerta
   *  e o modelo do aviso por e-mail. Editáveis em Configurações por quem
   *  tem `pode_configurar_gestao_pessoas`. */
  gp_limite_obrigacoes: number;
  gp_limite_desempenho: number;
  gp_alerta_restantes: number;
  gp_alerta_percentual: number;
  gp_alertas_ativos: boolean;
  gp_copia_diretoria: boolean;
  gp_aviso_assunto: string;
  gp_aviso_corpo: string;
  /** Ordem do menu lateral escolhida pela diretoria (2026-10-21); nulo =
   *  ordem do código. Ver `lib/menu-ordem.ts`. */
  menu_ordem?: { grupos: string[]; itens: Record<string, string[]> } | null;
}

export interface BancaFrente {
  id: number;
  banca_id: number;
  frente_id: number;
}

export interface EquipeProjeto {
  id: number;
  banca_id: number;
  usuario_id: number;
}

export interface Pergunta {
  id: number;
  formulario_id?: number;
  texto: string;
  ordem: number;
  tipo_resposta: "nota" | "texto";
  /** Nulo = pergunta universal (aparece em toda banca); com valor, só
   *  aparece quando a banca avaliada é daquele escopo. */
  escopo_id: number | null;
}

export interface FormularioAtivo {
  id: number;
  semestre_id: number;
  perguntas: Pergunta[];
}

export interface NotaPorPergunta {
  pergunta_id: number;
  texto: string | null;
  media: number;
}

export interface PerguntaNovaVersao {
  /** Presente quando é a MESMA pergunta de antes, só editada — o backend
   *  atualiza esse registro em vez de criar outro, pra quem já respondeu sob
   *  este id (inclusive "Médias por critério" de banca já realizada)
   *  enxergar a correção. Ausente = pergunta nova. */
  id?: number;
  texto: string;
  ordem: number;
  tipo_resposta: "nota" | "texto";
  escopo_id: number | null;
}

export interface BancaParaAvaliar {
  usuario_id: number;
  banca_id: number;
  nome_projeto: string;
  data_hora: string;
  /** 7 dias corridos a partir de `banca.realizado_em`, depois disso o
   *  envio da avaliação é bloqueado, não só destacado. */
  prazo_avaliacao: string;
  prazo_expirado: boolean;
}

export interface Avaliacao {
  id: number;
  banca_id: number;
  avaliador_id: number;
  formulario_id: number;
  /** ⭐ A tentativa a que esta avaliação pertence (§9). `banca_id` é o mesmo
   *  na 1ª e na 2ª banca; é a sessão que as separa. Opcional porque as
   *  avaliações anteriores à coluna não a trazem — o padrão é 1. */
  sessao?: number;
  status: "rascunho" | "submetida";
  comentario_feedback: string | null;
  submetida_em: string | null;
  /** Bloco 1 do formulário, resposta livre, não necessariamente igual ao
   *  cadastro do sistema (o avaliador pode confirmar diferente). */
  nome_avaliador: string | null;
  tipo_avaliador: "consultor" | "lideranca" | null;
  projeto_avaliado: string | null;
  /** O escopo que o próprio avaliador confirmou, decide o Bloco 2, não
   *  necessariamente o mesmo de `banca.escopo_id`. */
  escopo_avaliado_id: number | null;
  escopo_avaliado_outro: string | null;
}

export interface AvaliacaoNota {
  id: number;
  avaliacao_id: number;
  pergunta_id: number;
  nota: number | null;
  resposta_texto: string | null;
}

export interface Semestre {
  id: number;
  nome: string;
  inicio: string;
  fim: string;
}

export interface HistoricoBanca {
  id: number;
  nome_projeto: string;
  escopo_id: number;
  /** Plural: uma banca pode cobrir mais de um escopo do projeto de uma
   *  sentada — `escopo_id` acima é só o campo legado de UM. Já vem com os
   *  nomes resolvidos pelo backend, igual `BancaDetalhes.escopos`. */
  escopos: string[];
  coordenador_id: number;
  data_hora: string;
  nota_final: number | null;
  semestre_id: number | null;
  semestre_nome: string | null;
  /** O relato do coordenador, ao lado da nota dos avaliadores, os dois
   *  lados da mesma banca (ver `descricao_coordenador` em `Banca`). */
  descricao_coordenador: string | null;
  descricao_coordenador_enviada_em: string | null;
  /** `null` = aconteceu, mas ainda espera diretoria ou gerente decidir. */
  resultado: ResultadoBanca | null;
  /** Janela de avaliação (2026-10-06): abre na realização e fecha 7 dias
   *  depois, salvo quando a diretoria força pelo Dashboard. */
  realizado_em: string | null;
  prazo_avaliacao: string | null;
  prazo_avaliacao_override: "aberto" | "fechado" | null;
  avaliacao_aberta: boolean;
}