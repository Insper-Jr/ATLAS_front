import { apiFetch } from "@/lib/api";
import type { DesempenhoMentoria } from "@/types/desempenho";

export function getMentorias(token: string) {
  return apiFetch<DesempenhoMentoria[]>("/desempenho/mentorias", { token });
}

export function createMentoria(payload: { mentor_id: number; mentorado_id: number }, token: string) {
  return apiFetch<DesempenhoMentoria>("/desempenho/mentorias", {
    aviso: "Mentoria criada", method: "POST",
    token,
    body: JSON.stringify(payload),
  });
}

export function deleteMentoria(mentoriaId: number, token: string) {
  return apiFetch(`/desempenho/mentorias/${mentoriaId}`, { aviso: "Mentoria removida", method: "DELETE", token });
}

export function getMeusMentorados(usuarioId: number, token: string) {
  return apiFetch<DesempenhoMentoria[]>(`/usuarios/${usuarioId}/desempenho/mentorados`, { token });
}
