import { apiFetch } from "@/lib/api";
import type { CronogramaResposta, EtapaCronograma, MarcoCronograma } from "@/types/cronograma";

/** Uma etapa que existe com nome e cor, mas ainda sem nenhum dia pintado. */
export interface RascunhoEtapa {
  escopoId: number;
  nome: string;
  cor: string;
}

const CHAVE_RASCUNHOS = "atlas:cronograma:rascunhos";

/**
 * ⭐ **As etapas sem nenhum dia pintado, guardadas POR NAVEGADOR.**
 *
 * ⚠ `cronograma_etapa` é uma linha COM datas — `data_inicio` e `data_fim` são
 * obrigatórios. Uma etapa sem trecho nenhum simplesmente NÃO TEM como existir
 * no banco: apagar o último dia apaga a linha, e com ela o nome e a cor que
 * alguém escolheu. Quem só queria limpar os dias perdia a etapa inteira e
 * tinha de recriá-la.
 *
 * Guardar aqui é o que dá para fazer sem tocar no backend: a etapa vazia
 * sobrevive ao F5 e à navegação entre abas, volta para a legenda com nome e
 * cor, e some sozinha assim que ganha o primeiro trecho (aí ela existe no
 * banco de verdade) ou quando alguém a exclui de propósito.
 *
 * ⚠ **É por navegador, não por conta**: a etapa vazia não aparece para o
 * resto da equipe nem em outro computador. Para ela ser de verdade, o backend
 * precisa aceitar etapa sem data — enquanto não aceitar, esta é a diferença
 * entre perder o trabalho e não perder.
 */
export function getRascunhos(projetoId: number): RascunhoEtapa[] {
  try {
    const bruto = window.localStorage.getItem(`${CHAVE_RASCUNHOS}:${projetoId}`);
    const lido: unknown = bruto ? JSON.parse(bruto) : [];
    if (!Array.isArray(lido)) return [];
    // O que veio do disco pode ser de uma versão antiga do formato: só passa
    // o que tem os três campos com o tipo certo.
    return lido.filter(
      (r): r is RascunhoEtapa =>
        !!r &&
        typeof r === "object" &&
        typeof (r as RascunhoEtapa).escopoId === "number" &&
        typeof (r as RascunhoEtapa).nome === "string" &&
        typeof (r as RascunhoEtapa).cor === "string",
    );
  } catch {
    return [];
  }
}

export function salvarRascunhos(projetoId: number, rascunhos: RascunhoEtapa[]): void {
  try {
    window.localStorage.setItem(
      `${CHAVE_RASCUNHOS}:${projetoId}`,
      JSON.stringify(rascunhos),
    );
  } catch {
    // Modo privado ou quota cheia: a etapa vazia ainda vale para esta sessão
    // (já está no state do React), só não sobrevive a um F5.
  }
}

/** A aba inteira numa ida só, inclusive os dias cinzas da janela. */
export function getCronograma(projetoId: number, token: string) {
  return apiFetch<CronogramaResposta>(`/projetos/${projetoId}/cronograma`, { token });
}

export function createEtapa(
  escopoId: number,
  dados: { nome: string; cor: string; data_inicio: string; data_fim: string },
  token: string,
) {
  return apiFetch<EtapaCronograma>(`/escopos-projeto/${escopoId}/etapas`, {
    aviso: "Etapa criada", method: "POST",
    token,
    body: JSON.stringify(dados),
  });
}

/** O que o arrasto chama: um gesto = uma requisição, por intervalo. */
export function moverEtapa(etapaId: number, inicio: string, fim: string, token: string) {
  return apiFetch(`/cronograma/etapas/${etapaId}`, {
    method: "PUT",
    token,
    body: JSON.stringify({ data_inicio: inicio, data_fim: fim }),
  });
}

export function editarEtapa(
  etapaId: number,
  dados: { nome?: string; cor?: string; status?: string; ordem?: number },
  token: string,
) {
  return apiFetch(`/cronograma/etapas/${etapaId}`, {
    aviso: "Etapa salva", method: "PATCH",
    token,
    body: JSON.stringify(dados),
  });
}

/**
 * ⭐ O ajuste manual da janela do escopo — **só a diretoria de projetos**.
 *
 * Muda o tamanho da janela a qualquer momento, sem a janela, o prazo do §8 ou
 * o estado do projeto no caminho.
 *
 * ⚠ `dias_uteis_janela` é o TOTAL (vendidos + ajustados), não um incremento.
 * O backend guarda a diferença em `dias_uteis_ajustados` e nunca toca no
 * vendido, que é o registro comercial.
 */
export function ajustarJanelaManual(
  escopoId: number,
  dados: { dias_uteis_janela: number },
  token: string,
) {
  return apiFetch(`/escopos-projeto/${escopoId}/ajuste-manual`, {
    aviso: "Janela ajustada", method: "PUT",
    token,
    body: JSON.stringify(dados),
  });
}

/** Apaga a etapa e, com ela, a pintura dos dias que eram dela. */
export function deleteEtapa(etapaId: number, token: string) {
  return apiFetch(`/cronograma/etapas/${etapaId}`, { aviso: "Etapa excluída", method: "DELETE", token });
}

export function createMarco(
  projetoId: number,
  dados: { tipo: string; data: string; projeto_escopo_id?: number | null; nota?: string | null },
  token: string,
) {
  return apiFetch<MarcoCronograma>(`/projetos/${projetoId}/marcos`, {
    aviso: "Marco criado", method: "POST",
    token,
    body: JSON.stringify(dados),
  });
}

export function deleteMarco(marcoId: number, token: string) {
  return apiFetch(`/cronograma/marcos/${marcoId}`, { aviso: "Marco excluído", method: "DELETE", token });
}

/**
 * A entrega PLANEJADA do escopo, a data que o cronograma promete.
 *
 * Diferente de `/entrega`, que grava a entrega REAL e fica travada até a banca
 * sair aprovada. Aqui é planejamento, que é do que esta tela trata.
 */
export function definirEntregaPlanejada(
  escopoId: number,
  data: string | null,
  token: string,
) {
  return apiFetch(`/escopos-projeto/${escopoId}`, {
    aviso: "Entrega planejada salva", method: "PATCH",
    token,
    body: JSON.stringify({ data_entrega_planejada: data }),
  });
}

/** cravar o cronograma, marco informativo, não trava mais edição. */
export function oficializarCronograma(escopoId: number, token: string) {
  return apiFetch(`/escopos-projeto/${escopoId}/oficializar`, { aviso: "Cronograma oficializado", method: "POST", token });
}

/* -----------------------------------------------  · dias de ajuste */

/* Os dois fluxos CONVIVEM, não são versões um do outro, apesar de terem se
   cruzado no merge. `oficializarCronograma` acima só carimba
   `cronograma_oficializado_em`: virou marco informativo e não tranca mais o
   calendário atrás de uma fila de aprovação, que era o cadeado que
   transformava em rotina a exceção que o  pedia que fosse rara. A janela
   do escopo NÃO consulta esse carimbo: quem a estica é o pedido de DIAS
   abaixo, e é só ele que passa por aprovação. */

/**
 * O coordenador do projeto (ou a diretoria de projetos) pede dias extras para
 * o escopo.
 *
 * Só dá certo dentro do prazo — o fim da ambientação no primeiro escopo
 * vendido, os **3 primeiros dias úteis** da reunião inicial nos demais — e só
 * para o coordenador daquele projeto ou para a diretoria de projetos
 * (2026-08-31). As duas regras são do backend, e ele responde 422 com a
 * explicação pronta para a tela mostrar.
 */
export function pedirDiasDeAjuste(
  escopoId: number,
  dados: { dias_solicitados: number; motivo: string },
  token: string,
) {
  return apiFetch(`/escopos-projeto/${escopoId}/reajuste`, {
    aviso: "Pedido de dias de ajuste enviado", method: "POST",
    token,
    body: JSON.stringify(dados),
  });
}

/** A fila de pedidos aguardando decisão, só a diretoria enxerga. */
export function getPedidosDeDiasPendentes(token: string) {
  return apiFetch<PedidoPendente[]>("/reajustes/pendentes", { token });
}

/**
 * A decisão da diretoria. Aprovar **soma** os dias em `dias_uteis_ajustados` e
 * estica a janela; negar só registra, e o coordenador pode pedir de novo,
 * desde que ainda esteja dentro do prazo.
 */
export function responderPedidoDeDias(
  solicitacaoId: number,
  dados: { aprovado: boolean; justificativa: string },
  token: string,
) {
  return apiFetch(`/reajustes/${solicitacaoId}/responder`, {
    aviso: "Pedido respondido", method: "PATCH",
    token,
    body: JSON.stringify(dados),
  });
}

export interface PedidoPendente {
  id: number;
  projeto_escopo_id: number;
  projeto_id: number | null;
  projeto_nome: string | null;
  escopo_nome: string | null;
  solicitado_por: number;
  solicitado_por_nome: string | null;
  dias_solicitados: number;
  /** A janela de hoje, para a decisão ter contra o que somar. */
  dias_uteis_vendidos: number | null;
  dias_uteis_ajustados: number | null;
  motivo: string;
  criado_em: string;
}

/* ------------------------------------------------------------------ */

/* `mesesDaJanela` vivia aqui: expandia a janela do backend na lista de meses a
   empilhar. Saiu quando o cronograma passou a ter as visões de dia/semana/mês
   (`components/cronograma-pintado/visao.ts`), que derivam o período em foco a
   partir de uma data de referência, a janela agora só delimita a navegação.
   Se um dia voltar a visão de "projeto inteiro", é este o ponto de partida. */
