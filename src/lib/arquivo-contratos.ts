import { apiFetch } from "@/lib/api";
import type { ConteudoPasta, ItemArquivo, PastaArquivo } from "@/types/arquivo-contratos";
import { abrirArquivo, baixarArquivo } from "@/lib/arquivos";

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

/** O item chega com `url` e `url_download` já assinados (ver `lib/arquivos.ts`). */
export function baixarItemArquivo(item: ItemArquivo) {
  baixarArquivo(item.url_download);
}

export function abrirItemArquivo(item: ItemArquivo) {
  abrirArquivo(item.url, null, item.nome);
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
