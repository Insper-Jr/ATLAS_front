import { apiFetch } from "@/lib/api";
import type { Frente } from "@/types/banca";

export function getFrentes(token: string) {
  return apiFetch<Frente[]>("/frentes", { token });
}

export function createFrente(dados: { nome: string; piso_banca?: number }, token: string) {
  return apiFetch<Frente>("/frentes", {
    aviso: "Frente criada", method: "POST",
    token,
    body: JSON.stringify(dados),
  });
}

export function updateFrente(
  frenteId: number,
  dados: { nome?: string; piso_banca?: number },
  token: string,
) {
  return apiFetch<Frente>(`/frentes/${frenteId}`, {
    aviso: "Frente salva", method: "PATCH",
    token,
    body: JSON.stringify(dados),
  });
}

export function deleteFrente(frenteId: number, token: string) {
  return apiFetch(`/frentes/${frenteId}`, { aviso: "Frente excluída", method: "DELETE", token });
}
