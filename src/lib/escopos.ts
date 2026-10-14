import { apiFetch } from "@/lib/api";
import type { Escopo } from "@/types/banca";

/** `frenteId` filtra o catálogo pela frente, o  mostra só os escopos
 *  das frentes marcadas no formulário. A rota já aceita o parâmetro. */
export function getEscopos(token: string, frenteId?: number | null) {
  const query = frenteId ? `?frente_id=${frenteId}` : "";
  return apiFetch<Escopo[]>(`/escopos${query}`, { token });
}

export function createEscopo(nome: string, frenteId: number | null, token: string) {
  return apiFetch<Escopo>("/escopos", {
    aviso: "Escopo criado", method: "POST",
    token,
    body: JSON.stringify({ nome, frente_id: frenteId }),
  });
}

export function updateEscopo(escopoId: number, nome: string, frenteId: number | null, token: string) {
  return apiFetch<Escopo>(`/escopos/${escopoId}`, {
    aviso: "Escopo salvo", method: "PATCH",
    token,
    body: JSON.stringify({ nome, frente_id: frenteId }),
  });
}

export function deleteEscopo(escopoId: number, token: string) {
  return apiFetch(`/escopos/${escopoId}`, { aviso: "Escopo excluído", method: "DELETE", token });
}
