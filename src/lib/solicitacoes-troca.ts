import { apiFetch } from "@/lib/api";
import type { SolicitacaoTroca } from "@/types/notificacao";

export function getSolicitacoesTroca(token: string) {
  return apiFetch<SolicitacaoTroca[]>("/solicitacoes-troca", { token });
}

/**
 * `usuarioConvidadoId`, nulo abre pro pool de elegíveis (comportamento de
 * sempre); preenchido manda um convite direto pra essa pessoa, e só ela
 * pode confirmar (o backend garante isso, ver `confirmar_solicitacao_troca`).
 */
export function createSolicitacaoTroca(
  candidaturaId: number,
  token: string,
  usuarioConvidadoId?: number,
) {
  return apiFetch<SolicitacaoTroca>("/solicitacoes-troca", {
    aviso: "Pedido de troca enviado", method: "POST",
    token,
    body: JSON.stringify({
      candidatura_id: candidaturaId,
      usuario_convidado_id: usuarioConvidadoId ?? null,
    }),
  });
}

export function confirmarSolicitacaoTroca(solicitacaoId: number, token: string) {
  return apiFetch<SolicitacaoTroca>(`/solicitacoes-troca/${solicitacaoId}/confirmar`, {
    aviso: "Troca confirmada", method: "POST",
    token,
  });
}

export function cancelarSolicitacaoTroca(solicitacaoId: number, token: string) {
  return apiFetch<SolicitacaoTroca>(`/solicitacoes-troca/${solicitacaoId}/cancelar`, {
    aviso: "Pedido de troca cancelado", method: "POST",
    token,
  });
}
