// Sabatina: o processo eleitoral da Insper Jr. Espelha `routers/sabatina.py`.

export type StatusEleicao = "rascunho" | "aberta" | "fechada";

export interface SabatinaPeso {
  posicao: string;
  nome: string;
  peso: number;
  /** true quando não há linha gravada e o valor é o padrão do sistema. */
  padrao: boolean;
}

export interface PessoaSabatina {
  usuario_id: number;
  nome: string;
  posicao: string | null;
}

export interface CandidatoSabatina extends PessoaSabatina {
  /** id do vínculo candidato-eleição (é o que vai no voto). */
  id: number;
}

export interface LinhaResultado extends PessoaSabatina {
  candidato_id: number;
  votos: number;
  ponderado: number;
  percentual: number;
  passou: boolean;
  eleito: boolean;
}

export interface ResultadoEleicao {
  situacao: "eleito" | "ninguem_eleito" | "sem_votos";
  percentual_aprovacao: number;
  total_votos: number;
  total_ponderado: number;
  brancos: { votos: number; ponderado: number; percentual: number };
  candidatos: LinhaResultado[];
  eleito_candidato_id: number | null;
}

/** Visão da diretoria. */
export interface Eleicao {
  id: number;
  nome: string;
  percentual_aprovacao: number;
  status: StatusEleicao;
  criado_em: string;
  aberta_em: string | null;
  fechada_em: string | null;
  candidatos: CandidatoSabatina[];
  total_eleitores: number;
  total_votos: number;
  /** Em rascunho, a escolha da diretoria (vazio = todos os ativos menos candidatos); depois, quem recebeu a cédula. */
  eleitores_ids: number[];
  /** Quem não votou. Só vem fechada; aberta, a lista é vazia de propósito. */
  pendentes: PessoaSabatina[];
  /** Só vem fechada. */
  resultado: ResultadoEleicao | null;
}

/** Participação de uma posição: só quantidades, nunca quem. */
export interface FaixaPosicao {
  posicao: string;
  total: number;
  votaram: number;
}

/** Um voto na linha do tempo: quando, em quem e com que peso. Sem eleitor. */
export interface VotoNoTempo {
  em: string;
  candidato_id: number | null;
  peso: number;
}

/**
 * O agregado que alimenta a corrida ao vivo (aberta) e os gráficos da
 * apuração (fechada). O voto é anônimo: nada aqui identifica o eleitor.
 */
export interface GraficosEleicao {
  status: StatusEleicao;
  aberta_em: string | null;
  fechada_em: string | null;
  total_eleitores: number;
  parcial: ResultadoEleicao & { candidatos: (LinhaResultado & { nome: string })[] };
  por_posicao: FaixaPosicao[];
  linha_do_tempo: VotoNoTempo[];
}

/** A cédula de quem vota. */
export interface MinhaEleicao {
  id: number;
  nome: string;
  aberta_em: string | null;
  candidatos: { id: number; usuario_id: number; nome: string }[];
  sou_candidato: boolean;
  ja_votei: boolean;
  /** Com que peso meu voto entra, pela posição (e cargo extra) de agora. */
  meu_peso: number;
}

export interface EleicaoPayload {
  nome: string;
  percentual_aprovacao: number;
  candidato_ids: number[];
  /** Vazio = todos os membros ativos (menos candidatos). */
  eleitores_ids: number[];
}
