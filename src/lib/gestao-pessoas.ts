import { apiFetch } from "@/lib/api";

/**
 * Gestão de Pessoas (2026-10-21): espelha `routers/gestao_pessoas.py`.
 *
 * Duas categorias de pontos, nunca somadas. Os pontos contam dentro da
 * gestão (o `semestre` do ATLAS); registros fora do semestre ficam no
 * histórico sem contar. Datas de registro são dia de Brasília; os carimbos
 * (`lancado_em`, `em`, `enviado_em`) são instantes, formatados por
 * `formatarDataHora`.
 */

export type GpCategoria = "obrigacoes" | "desempenho";
export type GpFaixa = "ok" | "proximo" | "limite";
export type GpRegistroStatus = "ativo" | "anulado";
export type GpOrigem = "manual" | "lote_desempenho" | "pasta_pdi" | "tarefa" | "banca";
export type GpAvisoOrigem = "automatico" | "manual";
export type GpAlvoPdi = "mentorado" | "mentor" | "ambos";

export interface GpSituacao {
  pontos: number;
  limite: number;
  faixa: GpFaixa;
  restantes: number;
  percentual: number;
}

export interface GpAjuste {
  id: number;
  em: string;
  /** Ausentes em `/me`: o membro não vê quem corrigiu. */
  por?: number | null;
  por_nome?: string | null;
  campo: "tipo" | "pontos" | "data" | "projeto" | "observacao" | "status";
  antes: string | null;
  depois: string | null;
  justificativa: string;
}

export interface GpRegistro {
  id: number;
  usuario_id: number;
  usuario_nome: string;
  categoria: GpCategoria;
  tipo_id: number;
  tipo_nome: string;
  pontos: number;
  /** "YYYY-MM-DD", dia de Brasília. */
  data: string;
  projeto_id: number | null;
  projeto_nome: string | null;
  observacao: string;
  /** Nulo = automático. Ausente em `/me`. */
  lancado_por?: number | null;
  lancado_por_nome?: string | null;
  lancado_em: string;
  status: GpRegistroStatus;
  origem: GpOrigem;
  ajustes: GpAjuste[];
}

export interface GpSemestre {
  id: number;
  nome: string;
  inicio: string;
  fim: string;
  atual: boolean;
}

export interface GpLimites {
  obrigacoes: number;
  desempenho: number;
}

export interface GpAlerta {
  restantes: number;
  percentual: number;
  texto: string;
}

export interface GpMembroResumo {
  usuario_id: number;
  nome: string;
  email: string;
  posicao: string;
  /** Uma pessoa pode estar em vários núcleos; listas por nome. */
  nucleo_ids: number[];
  nucleo_nomes: string[];
  ativo: boolean;
  obrigacoes: GpSituacao;
  desempenho: GpSituacao;
  /** Registros de qualquer status com `data` no semestre. */
  registros: number;
}

/** "Comercial, Institucional", ou "Sem núcleo" pra quem não está em nenhum. */
export function rotuloNucleos(membro: Pick<GpMembroResumo, "nucleo_nomes">): string {
  return membro.nucleo_nomes.length > 0 ? membro.nucleo_nomes.join(", ") : "Sem núcleo";
}

export interface GpResumo {
  semestre: GpSemestre;
  limites: GpLimites;
  alerta: GpAlerta;
  membros: GpMembroResumo[];
}

export interface GpTipo {
  id: number;
  categoria: GpCategoria;
  nome: string;
  pontos: number;
  ativo: boolean;
  ordem: number;
  uso_no_semestre: number;
}

export interface GpGestao {
  id: number;
  nome: string;
  inicio: string;
  fim: string;
  atual: boolean;
  membros: number;
  pontos_obrigacoes: number;
  pontos_desempenho: number;
}

export interface GpAviso {
  id: number;
  usuario_id: number;
  usuario_nome: string;
  usuario_email: string;
  categoria: GpCategoria;
  faixa: GpFaixa;
  pontuacao: number;
  limite: number;
  origem: GpAvisoOrigem;
  enviado_em: string;
  enviado_por_nome: string | null;
  copia_diretoria: boolean;
}

export interface GpRegraGatilho {
  ativa: boolean;
  tipo_id: number | null;
  pontos: number | null;
}

export interface GpRegras {
  tarefa: GpRegraGatilho;
  banca: GpRegraGatilho;
  lote_padrao: { tipo_id: number | null; pontos: number | null };
  pdi_padrao: { tipo_id: number | null; pontos: number | null; alvo: GpAlvoPdi | null };
}

export interface GpEvolucaoSemana {
  /** Segunda-feira da semana, "YYYY-MM-DD". */
  semana: string;
  obrigacoes: number;
  desempenho: number;
}

export interface GpMeusPontos {
  semestre: GpSemestre;
  limites: GpLimites;
  obrigacoes: GpSituacao;
  desempenho: GpSituacao;
  evolucao: GpEvolucaoSemana[];
  registros: GpRegistro[];
}

export interface GpPreviaAviso {
  assunto: string;
  corpo: string;
  situacao: GpSituacao;
  destinatarios: string[];
}

export interface GpRespostaRegistro {
  registro: GpRegistro;
  avisos_gerados: number;
}

/* ------------------------------------------------------------------ */
/* Cálculo local (prévia do modal de registro, análises)               */
/* ------------------------------------------------------------------ */

export const RANK_FAIXA: Record<GpFaixa, number> = { ok: 0, proximo: 1, limite: 2 };

/** A mesma régua do backend (`utils/gp_pontuacao.py`): no limite se
 *  `p >= L`; regular se `p <= 0`; senão "próximo" por restantes OU por
 *  percentual. */
export function calcularFaixa(
  pontos: number,
  limite: number,
  alerta: { restantes: number; percentual: number },
): GpFaixa {
  if (pontos >= limite) return "limite";
  if (pontos <= 0) return "ok";
  const porRestantes = limite - pontos <= alerta.restantes;
  const porPercentual = (pontos / limite) * 100 >= alerta.percentual;
  return porRestantes || porPercentual ? "proximo" : "ok";
}

/* ------------------------------------------------------------------ */
/* Rotas                                                               */
/* ------------------------------------------------------------------ */

function query(params: Record<string, string | number | null | undefined>): string {
  const q = new URLSearchParams();
  for (const [chave, valor] of Object.entries(params)) {
    if (valor !== null && valor !== undefined && valor !== "") q.set(chave, String(valor));
  }
  const texto = q.toString();
  return texto ? `?${texto}` : "";
}

export function getGpResumo(token: string, semestreId?: number | null) {
  return apiFetch<GpResumo>(`/gestao-pessoas/resumo${query({ semestre_id: semestreId })}`, { token });
}

export function getGpRegistros(
  token: string,
  filtros: {
    semestre_id?: number | null;
    usuario_id?: number | null;
    categoria?: GpCategoria | null;
    de?: string | null;
    ate?: string | null;
  } = {},
) {
  return apiFetch<GpRegistro[]>(`/gestao-pessoas/registros${query(filtros)}`, { token });
}

export interface CreateGpRegistroPayload {
  usuario_id: number;
  tipo_id: number;
  /** Com sinal: negativo é redução. Nunca zero. */
  pontos: number;
  data: string;
  projeto_id?: number | null;
  observacao: string;
}

export function createGpRegistro(payload: CreateGpRegistroPayload, token: string) {
  return apiFetch<GpRespostaRegistro>("/gestao-pessoas/registros", {
    aviso: "Registro salvo", method: "POST",
    token,
    body: JSON.stringify(payload),
  });
}

export interface UpdateGpRegistroPayload {
  tipo_id?: number;
  pontos?: number;
  data?: string;
  projeto_id?: number | null;
  observacao?: string;
  justificativa: string;
}

export function updateGpRegistro(registroId: number, payload: UpdateGpRegistroPayload, token: string) {
  return apiFetch<GpRespostaRegistro>(`/gestao-pessoas/registros/${registroId}`, {
    aviso: "Correção salva", method: "PATCH",
    token,
    body: JSON.stringify(payload),
  });
}

export function retirarGpRegistro(registroId: number, justificativa: string, token: string) {
  return apiFetch<GpRespostaRegistro>(`/gestao-pessoas/registros/${registroId}/retirar`, {
    aviso: "Pontos retirados. O registro continua no histórico.", method: "POST",
    token,
    body: JSON.stringify({ justificativa }),
  });
}

export function getMeusPontos(token: string) {
  return apiFetch<GpMeusPontos>("/gestao-pessoas/me", { token });
}

export function getGpGestoes(token: string) {
  return apiFetch<GpGestao[]>("/gestao-pessoas/gestoes", { token });
}

export function getGpTipos(token: string) {
  return apiFetch<GpTipo[]>("/gestao-pessoas/tipos", { token });
}

/** Os registros ativos do tipo no semestre ativo: quem e quais estão por
 *  trás do "uso no semestre" (2026-10-22). */
export function getGpUsoTipo(tipoId: number, token: string) {
  return apiFetch<GpRegistro[]>(`/gestao-pessoas/tipos/${tipoId}/uso`, { token });
}

export function createGpTipo(payload: { categoria: GpCategoria; nome: string; pontos: number }, token: string) {
  return apiFetch<GpTipo>("/gestao-pessoas/tipos", {
    aviso: "Tipo adicionado", method: "POST",
    token,
    body: JSON.stringify(payload),
  });
}

export function updateGpTipo(
  tipoId: number,
  payload: { nome?: string; pontos?: number; ativo?: boolean },
  token: string,
) {
  return apiFetch<GpTipo>(`/gestao-pessoas/tipos/${tipoId}`, {
    aviso: "Tipo salvo", method: "PATCH",
    token,
    body: JSON.stringify(payload),
  });
}

export function getGpRegras(token: string) {
  return apiFetch<GpRegras>("/gestao-pessoas/regras-automaticas", { token });
}

export function updateGpRegras(payload: Partial<GpRegras>, token: string) {
  return apiFetch<GpRegras>("/gestao-pessoas/regras-automaticas", {
    aviso: "Pontuação automática salva", method: "PUT",
    token,
    body: JSON.stringify(payload),
  });
}

export function getGpAvisos(token: string) {
  return apiFetch<GpAviso[]>("/gestao-pessoas/avisos", { token });
}

export function getGpPreviaAviso(usuarioId: number, categoria: GpCategoria, token: string) {
  return apiFetch<GpPreviaAviso>(
    `/gestao-pessoas/avisos/previa${query({ usuario_id: usuarioId, categoria })}`,
    { token },
  );
}

export function enviarGpAviso(usuarioId: number, categoria: GpCategoria, token: string) {
  return apiFetch<GpAviso>("/gestao-pessoas/avisos", {
    aviso: "Aviso enviado", method: "POST",
    token,
    body: JSON.stringify({ usuario_id: usuarioId, categoria }),
  });
}

/** Reavalia a faixa de todo mundo depois de mudar limites ou regra de
 *  alerta (quem subiu de faixa recebe aviso). Devolve quantos saíram. */
export function reavaliarGpAvisos(token: string) {
  return apiFetch<{ avisos_gerados: number }>("/gestao-pessoas/avisos/reavaliar", {
    method: "POST",
    token,
  });
}
