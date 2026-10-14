import { apiFetch } from "@/lib/api";
import type { Configuracao } from "@/types/banca";

/**
 * ⚠ Sem uso na interface desde 2026-09-02: o teto de vagas, único campo que a
 * tela de Configurações editava por aqui, virou da COMBINAÇÃO de frentes e
 * viaja no `PUT /composicao-banca/{combinacao}`. Os dois wrappers ficam
 * porque a linha `configuracao` continua existindo e ainda é o PADRÃO de quem
 * não configurou (e da banca legada, sem frente vinculada) — o dia em que
 * alguém quiser editar esse padrão, é por aqui.
 */
export function getConfiguracao(token: string) {
  return apiFetch<Configuracao>("/configuracao", { token });
}

export function updateConfiguracao(
  dados: {
    vagas_por_banca?: number;
    lideranca_minima_por_frente?: number;
    health_track_persistencia_amarelo?: number;
    health_track_persistencia_vermelho?: number;
  },
  token: string,
) {
  return apiFetch<Configuracao>("/configuracao", {
    aviso: "Configuração salva", method: "PATCH",
    token,
    body: JSON.stringify(dados),
  });
}

/* ------------------------- composição de banca por combinação de frentes */

/** Uma linha do seletor: a combinação e o resumo do que ela exige hoje. */
export interface CombinacaoComposicao {
  /** A chave normalizada, ids ordenados unidos por `-` (`"1-2"`). */
  combinacao: string;
  frente_ids: number[];
  /** `Business + Direito` — pronto para exibir. */
  rotulo: string;
  sinergica: boolean;
  /** Mínimo de pessoas: soma de membros + liderança de cada frente. */
  minimo_total: number;
  /** Quantas pessoas CABEM numa banca desta combinação — o teto próprio dela
   *  ou, se não tiver um, o global (`configuracao.vagas_por_banca`). */
  vagas: number;
  /** `false` = está herdando o padrão, ninguém gravou números para ela. */
  configurada: boolean;
}

export interface RegraDaFrente {
  frente_id: number;
  frente_nome: string;
  /** Só piso: não há mais teto por frente (2026-09-03). */
  min_membros: number;
  min_lideranca: number;
  configurada: boolean;
}

export interface ComposicaoDaCombinacao {
  combinacao: string;
  rotulo: string;
  minimo_total: number;
  /** O teto que vale hoje para esta combinação. */
  vagas: number;
  /** `true` quando o teto acima é DELA; `false` quando está herdado do
   *  global e some no dia em que alguém mudar o padrão. */
  vagas_propria: boolean;
  frentes: RegraDaFrente[];
}

export function listarCombinacoesComposicao(token: string) {
  return apiFetch<CombinacaoComposicao[]>("/composicao-banca/combinacoes", { token });
}

export function getComposicaoBanca(combinacao: string, token: string) {
  return apiFetch<ComposicaoDaCombinacao>(`/composicao-banca/${combinacao}`, { token });
}

/**
 * Grava a regra da combinação inteira.
 *
 * ⚠ `frentes` traz TODAS as frentes da combinação, sempre — o backend recusa
 * uma lista parcial, porque a frente omitida cairia no padrão em silêncio.
 */
export function salvarComposicaoBanca(
  combinacao: string,
  frentes: Omit<RegraDaFrente, "frente_nome" | "configurada">[],
  vagas: number,
  token: string,
) {
  return apiFetch<{ combinacao: string }>(`/composicao-banca/${combinacao}`, {
    aviso: "Composição salva", method: "PUT",
    token,
    // ⭐ O teto vai junto: ele é da COMBINAÇÃO desde 2026-09-02, e não mais o
    // `vagas_por_banca` global que esta tela editava à parte. O global
    // continua sendo o padrão de quem nunca salvou.
    body: JSON.stringify({ frentes, vagas }),
  });
}
