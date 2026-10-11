import { apiFetch } from "@/lib/api";
import { API_URL } from "@/config/config";
import type { ExMembro, ExMembroPayload } from "@/types/institucional";

// Tudo aqui exige a caixa `pode_acessar_institucional` no backend. A leitura
// que o SITE faz (`/publico/ex-membros`) não passa por este arquivo — é
// chamada direto pelo site, sem login.

export function getExMembros(token: string) {
  return apiFetch<ExMembro[]>("/institucional/ex-membros", { token });
}

export function criarExMembro(dados: ExMembroPayload, token: string) {
  return apiFetch<ExMembro>("/institucional/ex-membros", {
    method: "POST",
    token,
    body: JSON.stringify(dados),
  });
}

export function editarExMembro(id: number, dados: ExMembroPayload, token: string) {
  return apiFetch<ExMembro>(`/institucional/ex-membros/${id}`, {
    method: "PUT",
    token,
    body: JSON.stringify(dados),
  });
}

export function publicarExMembro(id: number, publicado: boolean, token: string) {
  return apiFetch<ExMembro>(`/institucional/ex-membros/${id}/publicado`, {
    method: "PATCH",
    token,
    body: JSON.stringify({ publicado }),
  });
}

export function apagarExMembro(id: number, token: string) {
  return apiFetch<void>(`/institucional/ex-membros/${id}`, { method: "DELETE", token });
}

/** A lista INTEIRA de ids, na ordem final — o backend recusa lista parcial. */
export function reordenarExMembros(ids: number[], token: string) {
  return apiFetch<ExMembro[]>("/institucional/ex-membros/ordem", {
    method: "PUT",
    token,
    body: JSON.stringify({ ids }),
  });
}

/** Qualquer imagem: o backend redimensiona e converte pra JPEG. */
export function enviarFotoExMembro(id: number, arquivo: File, token: string) {
  const form = new FormData();
  form.append("arquivo", arquivo);
  return apiFetch<ExMembro>(`/institucional/ex-membros/${id}/foto`, { method: "PUT", token, body: form });
}

export function removerFotoExMembro(id: number, token: string) {
  return apiFetch<ExMembro>(`/institucional/ex-membros/${id}/foto`, { method: "DELETE", token });
}

/** Importa os ex-membros que o site tinha fixos no código. Não duplica. */
export function importarExMembrosIniciais(token: string) {
  return apiFetch<{ importados: number; atualizados: number; pulados: number }>("/institucional/ex-membros/importar-iniciais", {
    method: "POST",
    token,
  });
}

/**
 * A foto da aba vem pela rota AUTENTICADA (mostra também quem está oculto),
 * então não dá pra pôr a URL direto num `<img>`: precisa do token no header.
 * Baixa como blob e devolve um object URL — quem chama revoga depois.
 */
export async function baixarFotoExMembro(id: number, token: string, versao: number): Promise<string> {
  const resposta = await fetch(`${API_URL}/institucional/ex-membros/${id}/foto?v=${versao}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!resposta.ok) throw new Error("Não foi possível carregar a foto.");
  return URL.createObjectURL(await resposta.blob());
}
