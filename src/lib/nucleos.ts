import { apiFetch } from "@/lib/api";

/** Núcleo da Gestão de Pessoas (cadastro em Configurações, atribuição no
 *  modal de membro). Não confundir com `lib/nucleo.ts`, que são helpers da
 *  antiga página Núcleo. */
export interface Nucleo {
  id: number;
  nome: string;
  ativo: boolean;
  /** Quantos usuários ativos estão nele (quem está em dois conta nos dois). */
  membros: number;
}

export function getNucleos(token: string) {
  return apiFetch<Nucleo[]>("/nucleos", { token });
}

export function createNucleo(nome: string, token: string) {
  return apiFetch<Nucleo>("/nucleos", {
    aviso: "Núcleo criado", method: "POST",
    token,
    body: JSON.stringify({ nome }),
  });
}

export function updateNucleo(nucleoId: number, payload: { nome?: string; ativo?: boolean }, token: string) {
  return apiFetch<Nucleo>(`/nucleos/${nucleoId}`, {
    aviso: "Núcleo salvo", method: "PATCH",
    token,
    body: JSON.stringify(payload),
  });
}

/** Só quando nenhum usuário aponta para ele; senão o backend recusa (409). */
export function deleteNucleo(nucleoId: number, token: string) {
  return apiFetch(`/nucleos/${nucleoId}`, { aviso: "Núcleo excluído", method: "DELETE", token });
}
