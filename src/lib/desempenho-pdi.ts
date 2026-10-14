import { apiFetch } from "@/lib/api";
import { API_URL } from "@/config/config";
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

export function createPastaPdi(
  payload: { nome: string; tipo: DesempenhoPdiPastaTipo; prazo: string },
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
  payload: { nome?: string; prazo?: string },
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

/** A rota exige Bearer token, então um `<a href>` direto não funciona —
 *  baixa como blob e dispara o download via um link temporário (mesmo
 *  padrão de `baixarAnexoProposta`). */
/** O arquivo em si, pra prévia ou download. A API exige o token, então o
 *  navegador não consegue abrir a URL direto num <img> ou numa aba. */
export async function getEnvioPdiBlob(usuarioId: number, itemId: number, token: string): Promise<Blob> {
  const response = await fetch(`${API_URL}/usuarios/${usuarioId}/desempenho/pdi/itens/${itemId}/envio`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error("Erro ao baixar o arquivo");
  return response.blob();
}

export async function baixarEnvioPdi(usuarioId: number, itemId: number, nomeArquivo: string, token: string) {
  const blob = await getEnvioPdiBlob(usuarioId, itemId, token);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo;
  link.click();
  URL.revokeObjectURL(url);
}
