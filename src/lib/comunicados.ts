import { apiFetch } from "@/lib/api";
import type { FiltroCargaBancas } from "@/lib/bancas";

/**
 * Comunicado manual (2026-10-11): a diretoria escolhe um recorte de pessoas
 * e manda sino + e-mail. Tudo aqui exige a caixa `pode_enviar_comunicados`
 * no backend. Ver `use_cases/comunicado/enviar_comunicado.py`.
 *
 * `pendentes_do_lote` precisa de `lote_id` e `inscritos_da_banca` de
 * `banca_id`; a aba escolhe os dois num seletor.
 */
export type SegmentoComunicado =
  | "zero_bancas"
  | "bancas_acima_de"
  | "pendentes_do_lote"
  | "inscritos_da_banca"
  | "por_posicao"
  | "todos"
  | "manual";

export interface FiltroComunicado {
  segmento: SegmentoComunicado;
  filtro_bancas?: FiltroCargaBancas;
  minimo_bancas?: number | null;
  lote_id?: number | null;
  banca_id?: number | null;
  so_confirmados?: boolean;
  posicoes?: string[];
  usuario_ids?: number[];
  /** Quem foi desmarcado na prévia. */
  excluir_ids?: number[];
}

export interface DestinatarioComunicado {
  usuario_id: number;
  nome: string;
  posicao: string;
  email: string;
  /** "3 bancas", "2 pendências"; nulo quando o segmento não tem número. */
  detalhe: string | null;
}

export interface PreviaComunicado {
  rotulo: string;
  destinatarios: DestinatarioComunicado[];
}

export interface ComunicadoEnviado {
  comunicado_id: string;
  enviados: number;
  rotulo: string;
}

export const ASSUNTO_MAX = 200;
export const MENSAGEM_MAX = 4000;

/** POST, não GET: o filtro carrega listas (ids, posições). */
export function getDestinatariosComunicado(filtro: FiltroComunicado, token: string) {
  return apiFetch<PreviaComunicado>("/comunicados/destinatarios", {
    method: "POST",
    token,
    body: JSON.stringify(filtro),
  });
}

export function enviarComunicado(
  payload: FiltroComunicado & { assunto: string; mensagem: string },
  token: string,
) {
  return apiFetch<ComunicadoEnviado>("/comunicados", {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });
}

/** Um disparo já feito, como aparece no histórico da aba Comunicados. */
export interface ComunicadoHistorico {
  comunicado_id: string;
  assunto: string;
  mensagem: string | null;
  remetente_id: number | null;
  remetente_nome: string | null;
  /** O recorte usado ("Quem está com 0 bancas (...)"). Nulo nos disparos
   *  anteriores a este campo. */
  rotulo: string | null;
  enviado_em: string;
  total: number;
  emails_enviados: number;
  lidas: number;
  destinatarios: string[];
}

export function getComunicados(token: string) {
  return apiFetch<ComunicadoHistorico[]>("/comunicados", { token });
}

export function textoSucesso(enviados: number): string {
  return `Comunicado enviado para ${enviados} ${enviados === 1 ? "pessoa" : "pessoas"}. Ele já está no sino de cada uma e o e-mail sai em seguida.`;
}
