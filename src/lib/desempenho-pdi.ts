import { apiFetch } from "@/lib/api";
import { baixarArquivo } from "@/lib/arquivos";
import type {
  DesempenhoPdiItem,
  DesempenhoPdiItemTipoArquivo,
  DesempenhoPdiPasta,
  DesempenhoPdiPastaComItens,
  DesempenhoPdiPastaTipo,
  DesempenhoPdiPendencia,
  DesempenhoPdiPendenciasPasta,
  DesempenhoPdiResultadosPasta,
} from "@/types/desempenho";

export function getPastasPdi(token: string) {
  return apiFetch<DesempenhoPdiPasta[]>("/desempenho/pdi/pastas", { token });
}

/** Gestão de Pessoas: quem não enviar até o prazo toma ponto, e quem toma. */
export interface PastaPdiPontuacaoPayload {
  gp_pontua?: boolean;
  gp_tipo_id?: number | null;
  gp_pontos?: number | null;
  gp_alvo?: "mentorado" | "mentor" | "ambos" | null;
}

export function createPastaPdi(
  payload: { nome: string; tipo: DesempenhoPdiPastaTipo; prazo: string } & PastaPdiPontuacaoPayload,
  token: string,
) {
  return apiFetch<DesempenhoPdiPasta>("/desempenho/pdi/pastas", {
    aviso: "Pasta criada", method: "POST",
    token,
    body: JSON.stringify(payload),
  });
}

export function updatePastaPdi(
  pastaId: number,
  payload: { nome?: string; prazo?: string } & PastaPdiPontuacaoPayload,
  token: string,
) {
  return apiFetch<DesempenhoPdiPasta>(`/desempenho/pdi/pastas/${pastaId}`, {
    aviso: "Pasta salva", method: "PATCH",
    token,
    body: JSON.stringify(payload),
  });
}

export function deletePastaPdi(pastaId: number, token: string) {
  return apiFetch(`/desempenho/pdi/pastas/${pastaId}`, { aviso: "Pasta excluída", method: "DELETE", token });
}

export function getItensPdi(pastaId: number, token: string) {
  return apiFetch<DesempenhoPdiItem[]>(`/desempenho/pdi/pastas/${pastaId}/itens`, { token });
}

export function createItemPdi(
  pastaId: number,
  payload: { nome: string; tipo_arquivo: DesempenhoPdiItemTipoArquivo },
  token: string,
) {
  return apiFetch<DesempenhoPdiItem>(`/desempenho/pdi/pastas/${pastaId}/itens`, {
    aviso: "Item criado", method: "POST",
    token,
    body: JSON.stringify(payload),
  });
}

export function updateItemPdi(
  itemId: number,
  payload: { nome?: string; tipo_arquivo?: DesempenhoPdiItemTipoArquivo },
  token: string,
) {
  return apiFetch<DesempenhoPdiItem>(`/desempenho/pdi/itens/${itemId}`, {
    aviso: "Item salvo", method: "PATCH",
    token,
    body: JSON.stringify(payload),
  });
}

export function deleteItemPdi(itemId: number, token: string) {
  return apiFetch(`/desempenho/pdi/itens/${itemId}`, { aviso: "Item excluído", method: "DELETE", token });
}

export function getPendenciasPdi(itemId: number, token: string) {
  return apiFetch<DesempenhoPdiPendencia[]>(`/desempenho/pdi/itens/${itemId}/pendencias`, { token });
}

/** A pasta inteira, por mentorado. */
export function getPendenciasPastaPdi(pastaId: number, token: string) {
  return apiFetch<DesempenhoPdiPendenciasPasta>(`/desempenho/pdi/pastas/${pastaId}/pendencias`, { token });
}

export function getResultadosPastaPdi(pastaId: number, token: string) {
  return apiFetch<DesempenhoPdiResultadosPasta>(`/desempenho/pdi/pastas/${pastaId}/resultados`, { token });
}

export function getEnviosPdi(usuarioId: number, token: string) {
  return apiFetch<DesempenhoPdiPastaComItens[]>(`/usuarios/${usuarioId}/desempenho/pdi/envios`, { token });
}

export function uploadEnvioPdi(usuarioId: number, itemId: number, arquivo: File, token: string) {
  const formData = new FormData();
  formData.append("arquivo", arquivo);
  return apiFetch<{ item_id: number; mentorado_id: number; arquivo_nome: string; enviado_em: string }>(
    `/usuarios/${usuarioId}/desempenho/pdi/itens/${itemId}/envio`,
    { aviso: "Arquivo enviado", method: "POST", token, body: formData },
  );
}

export function deleteEnvioPdi(usuarioId: number, itemId: number, token: string) {
  return apiFetch(`/usuarios/${usuarioId}/desempenho/pdi/itens/${itemId}/envio`, {
    aviso: "Envio removido", method: "DELETE",
    token,
  });
}

/** O envio chega com `url` e `url_download` já assinados (ver `lib/arquivos.ts`). */
export function baixarEnvioPdi(envio: { url_download: string }) {
  baixarArquivo(envio.url_download);
}
