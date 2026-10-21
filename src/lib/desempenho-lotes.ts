import { apiFetch } from "@/lib/api";
import type { DesempenhoLote, DesempenhoPendencia, DesempenhoPendenciaFechada, DesempenhoTipo } from "@/types/desempenho";

export function getLotes(token: string, abertos = true) {
  return apiFetch<DesempenhoLote[]>(`/desempenho/lotes?abertos=${abertos}`, { token });
}

export function createLote(
  payload: {
    nome: string;
    tipo: DesempenhoTipo;
    data_inicio: string;
    data_fim: string;
    projeto_ids: number[];
    /** Só na finalização — o backend ignora na periódica. Omitido = `true`. */
    inclui_avaliacao_de_escopo?: boolean;
    /** Gestão de Pessoas: quem ficar pendente no prazo toma ponto. */
    gp_pontua?: boolean;
    gp_tipo_id?: number | null;
    gp_pontos?: number | null;
  },
  token: string,
) {
  return apiFetch<DesempenhoLote>("/desempenho/lotes", {
    aviso: "Formulário criado", method: "POST",
    token,
    body: JSON.stringify(payload),
  });
}

export function updateLote(
  loteId: number,
  payload: Partial<{
    nome: string;
    data_inicio: string;
    data_fim: string;
    projeto_ids: number[];
    /** Aceitos enquanto `gp_aplicado_em` for nulo. */
    gp_pontua: boolean;
    gp_tipo_id: number | null;
    gp_pontos: number | null;
  }>,
  token: string,
) {
  return apiFetch<DesempenhoLote>(`/desempenho/lotes/${loteId}`, {
    aviso: "Formulário salvo", method: "PUT",
    token,
    body: JSON.stringify(payload),
  });
}

export function abrirLote(loteId: number, token: string) {
  return apiFetch<DesempenhoLote>(`/desempenho/lotes/${loteId}/abrir`, { aviso: "Formulário aberto", method: "POST", token });
}

export function fecharLote(loteId: number, token: string) {
  return apiFetch<DesempenhoLote>(`/desempenho/lotes/${loteId}/fechar`, { aviso: "Formulário fechado", method: "POST", token });
}

export function seguirDatasLote(loteId: number, token: string) {
  return apiFetch<DesempenhoLote>(`/desempenho/lotes/${loteId}/seguir-datas`, { aviso: "Formulário voltou a seguir as datas", method: "POST", token });
}

export function getPendencias(loteId: number, token: string) {
  return apiFetch<DesempenhoPendencia[]>(`/desempenho/lotes/${loteId}/pendencias`, { token });
}

/** Quem ficou pendente em cada formulário já fechado, por pessoa. */
export function getPendenciasFechados(token: string) {
  return apiFetch<DesempenhoPendenciaFechada[]>("/desempenho/lotes/pendencias-fechados", { token });
}

/** Exclusão de verdade (fora da regra 2.6 do doc, por pedido explícito), o
 * backend ainda recusa (409) se o lote já tiver avaliação/finalização real. */
export function deleteLote(loteId: number, token: string) {
  return apiFetch(`/desempenho/lotes/${loteId}`, { aviso: "Formulário excluído", method: "DELETE", token });
}
