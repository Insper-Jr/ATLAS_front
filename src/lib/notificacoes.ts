import { apiFetch } from "@/lib/api";
import type { ListaNotificacoes, Notificacao } from "@/types/notificacao";

export function getNotificacoes(token: string | null) {
  return apiFetch<ListaNotificacoes>("/notificacoes", { token });
}

/** Só o número, para o polling do sino, não carrega tarefa, banca nem
 *  escopo de projeto nenhum. */
export function getContagemNotificacoes(token: string | null) {
  return apiFetch<{ nao_lidas: number }>("/notificacoes/contagem", { token });
}

/**
 * Marca uma como lida.
 *
 * O backend aceita `id` **ou** `chave` porque só o evento tem linha no
 * banco: a condição é recalculada a cada leitura e só ganha linha no
 * instante em que alguém a dispensa. Mandar a chave é o que faz essa linha
 * nascer.
 */
export function marcarNotificacaoLida(token: string | null, notificacao: Notificacao) {
  return apiFetch<{ lida_em: string }>("/notificacoes/lida", {
    token,
    method: "PATCH",
    body: JSON.stringify(
      notificacao.id !== null ? { id: notificacao.id } : { chave: notificacao.chave },
    ),
  });
}

export function marcarTodasLidas(token: string | null) {
  return apiFetch<{ marcadas: number }>("/notificacoes/marcar-todas-lidas", {
    token,
    aviso: "Todas marcadas como lidas", method: "POST",
  });
}

/** Só evento tem linha para apagar, e só depois de lido, ver
 *  `deletar_notificacao.py` no backend. */
export function excluirNotificacao(token: string | null, id: number) {
  return apiFetch<{ ok: boolean }>(`/notificacoes/${id}`, {
    token,
    aviso: "Notificação excluída", method: "DELETE",
  });
}

export function limparNotificacoesLidas(token: string | null) {
  return apiFetch<{ excluidas: number }>("/notificacoes/limpar-lidas", {
    token,
    aviso: "Notificações lidas limpas", method: "DELETE",
  });
}
