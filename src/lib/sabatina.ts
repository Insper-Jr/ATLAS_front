import { apiFetch } from "@/lib/api";
import type {
  Eleicao,
  EleicaoPayload,
  MinhaEleicao,
  GraficosEleicao,
  SabatinaPeso,
} from "@/types/sabatina";

// ---------------------------------------------------------------- todo mundo

export function getMinhasEleicoes(token: string) {
  return apiFetch<MinhaEleicao[]>("/sabatina/minhas", { token });
}

/** `candidatoId` nulo é voto em branco. */
export function votar(eleicaoId: number, candidatoId: number | null, token: string) {
  return apiFetch<{ id: number; eleicao_id: number; em_branco: boolean }>(
    `/sabatina/eleicoes/${eleicaoId}/votar`,
    { aviso: "Voto registrado", method: "POST", token, body: JSON.stringify({ candidato_id: candidatoId }) },
  );
}

// ---------------------------------------------------------------- diretoria

export function getPesos(token: string) {
  return apiFetch<SabatinaPeso[]>("/sabatina/pesos", { token });
}

export function atualizarPesos(pesos: { posicao: string; peso: number }[], token: string) {
  return apiFetch<SabatinaPeso[]>("/sabatina/pesos", {
    aviso: "Pesos salvos", method: "PUT",
    token,
    body: JSON.stringify({ pesos }),
  });
}

export function getEleicoes(token: string) {
  return apiFetch<Eleicao[]>("/sabatina/eleicoes", { token });
}

export function criarEleicao(dados: EleicaoPayload, token: string) {
  return apiFetch<Eleicao>("/sabatina/eleicoes", {
    aviso: "Eleição criada", method: "POST",
    token,
    body: JSON.stringify(dados),
  });
}

export function editarEleicao(id: number, dados: EleicaoPayload, token: string) {
  return apiFetch<Eleicao>(`/sabatina/eleicoes/${id}`, {
    aviso: "Eleição salva", method: "PUT",
    token,
    body: JSON.stringify(dados),
  });
}

export function apagarEleicao(id: number, token: string) {
  return apiFetch<void>(`/sabatina/eleicoes/${id}`, { aviso: "Eleição apagada", method: "DELETE", token });
}

export function abrirEleicao(id: number, token: string) {
  return apiFetch<Eleicao>(`/sabatina/eleicoes/${id}/abrir`, { aviso: "Eleição aberta", method: "POST", token });
}

export function fecharEleicao(id: number, token: string) {
  return apiFetch<Eleicao>(`/sabatina/eleicoes/${id}/fechar`, { aviso: "Eleição fechada", method: "POST", token });
}

/** Agregado da corrida (aberta) ou da apuração (fechada). Sem eleitor. */
export function getGraficosEleicao(id: number, token: string) {
  return apiFetch<GraficosEleicao>(`/sabatina/eleicoes/${id}/graficos`, { token });
}
