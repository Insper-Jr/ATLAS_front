import { API_URL } from "@/config/config";
import { apiFetch } from "@/lib/api";
import type { ConteudoPasta, ItemArquivo, PastaArquivo } from "@/types/arquivo-contratos";

export function getPastaArquivo(pastaId: number | null, token: string) {
  return apiFetch<ConteudoPasta>(pastaId == null ? "/arquivo-contratos/pastas" : `/arquivo-contratos/pastas/${pastaId}`, {
    token,
  });
}

export function buscarArquivo(termo: string, token: string) {
  return apiFetch<ItemArquivo[]>(`/arquivo-contratos/busca?q=${encodeURIComponent(termo)}`, { token });
}

export function criarPastaArquivo(nome: string, paiId: number | null, token: string) {
  return apiFetch<PastaArquivo>("/arquivo-contratos/pastas", {
    aviso: "Pasta criada", method: "POST",
    token,
    body: JSON.stringify({ nome, pai_id: paiId }),
  });
}

export function renomearPastaArquivo(pastaId: number, nome: string, token: string) {
  return apiFetch<PastaArquivo>(`/arquivo-contratos/pastas/${pastaId}`, {
    aviso: "Pasta renomeada", method: "PATCH",
    token,
    body: JSON.stringify({ nome }),
  });
}

export function moverPastaArquivo(pastaId: number, paiId: number | null, token: string) {
  return apiFetch<PastaArquivo>(`/arquivo-contratos/pastas/${pastaId}`, {
    aviso: "Pasta movida", method: "PATCH",
    token,
    body: JSON.stringify({ pai_id: paiId, mover: true }),
  });
}

/** `recursivo`: apaga também tudo que está dentro (a tela confirma antes). */
export function apagarPastaArquivo(pastaId: number, token: string, recursivo = false) {
  return apiFetch<void>(`/arquivo-contratos/pastas/${pastaId}?recursivo=${recursivo}`, { aviso: "Pasta apagada", method: "DELETE", token });
}

export function importarItemArquivo(pastaId: number, arquivo: File, token: string) {
  const body = new FormData();
  body.append("arquivo", arquivo);
  return apiFetch<ItemArquivo>(`/arquivo-contratos/pastas/${pastaId}/itens`, { aviso: "Arquivo importado", method: "POST", token, body });
}

export async function baixarItemArquivo(item: ItemArquivo, token: string) {
  const response = await fetch(`${API_URL}/arquivo-contratos/itens/${item.id}/arquivo`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error("Erro ao baixar o arquivo");
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = item.nome;
  link.click();
  URL.revokeObjectURL(url);
}

/** URL pra abrir o PDF numa aba: a rota exige token, então vai por blob. */
export async function abrirItemArquivo(item: ItemArquivo, token: string) {
  const response = await fetch(`${API_URL}/arquivo-contratos/itens/${item.id}/arquivo`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error("Erro ao abrir o arquivo");
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener");
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function renomearItemArquivo(itemId: number, nome: string, token: string) {
  return apiFetch<ItemArquivo>(`/arquivo-contratos/itens/${itemId}`, {
    aviso: "Arquivo renomeado", method: "PATCH",
    token,
    body: JSON.stringify({ nome }),
  });
}

export function moverItemArquivo(itemId: number, pastaId: number, token: string) {
  return apiFetch<ItemArquivo>(`/arquivo-contratos/itens/${itemId}`, {
    aviso: "Arquivo movido", method: "PATCH",
    token,
    body: JSON.stringify({ pasta_id: pastaId }),
  });
}

export function substituirItemArquivo(itemId: number, arquivo: File, token: string) {
  const body = new FormData();
  body.append("arquivo", arquivo);
  return apiFetch<ItemArquivo>(`/arquivo-contratos/itens/${itemId}/arquivo`, { aviso: "Arquivo substituído", method: "PUT", token, body });
}

export function apagarItemArquivo(itemId: number, token: string) {
  return apiFetch<void>(`/arquivo-contratos/itens/${itemId}`, { aviso: "Arquivo apagado", method: "DELETE", token });
}
