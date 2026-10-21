import { apiFetch } from "@/lib/api";

/**
 * As colunas do kanban, **de cada projeto**, configuráveis pela diretoria
 * (gerir é dela).
 *
 * Eram um ENUM de 5 valores no backend, depois uma configuração global. Hoje
 * pertencem ao projeto: a diretora monta o fluxo de UM projeto sem mexer nos
 * outros. Por isso toda rota aqui carrega o `projetoId`.
 */
export interface ColunaTarefa {
  id: number;
  /** Slug das 5 originais; vazio nas criadas pela diretoria. */
  chave: string | null;
  nome: string;
  /** `#RRGGBB`, a cor "cheia". Os tons pálidos saem de `tonsDaColuna`. */
  cor: string;
  ordem: number;
  /**
   * Tarefa que chega aqui está encerrada: não fica vencida nem conta como
   * trabalho ativo no monitoramento. É o campo que segura a regra de negócio
   * quando as colunas deixam de ser uma lista fixa.
   */
  encerra_tarefa: boolean;
}

const base = (projetoId: number) => `/projetos/${projetoId}/tarefas-colunas`;

export function getColunas(projetoId: number, token: string) {
  return apiFetch<ColunaTarefa[]>(base(projetoId), { token });
}

export function createColuna(
  projetoId: number,
  dados: { nome: string; cor: string; encerra_tarefa: boolean },
  token: string,
) {
  return apiFetch<ColunaTarefa>(base(projetoId), {
    aviso: "Coluna criada", method: "POST",
    token,
    body: JSON.stringify(dados),
  });
}

export function updateColuna(
  projetoId: number,
  colunaId: number,
  dados: Partial<{ nome: string; cor: string; encerra_tarefa: boolean }>,
  token: string,
) {
  return apiFetch<ColunaTarefa>(`${base(projetoId)}/${colunaId}`, {
    aviso: "Coluna salva", method: "PATCH",
    token,
    body: JSON.stringify(dados),
  });
}

export function reordenarColunas(projetoId: number, ids: number[], token: string) {
  return apiFetch<ColunaTarefa[]>(`${base(projetoId)}/ordem`, {
    method: "PUT",
    token,
    body: JSON.stringify({ ids }),
  });
}

/** `moverPara` é obrigatório quando a coluna tem tarefas, elas nunca são
 *  apagadas junto. */
export function deleteColuna(
  projetoId: number,
  colunaId: number,
  token: string,
  moverPara?: number,
) {
  const query = moverPara ? `?mover_para=${moverPara}` : "";
  return apiFetch(`${base(projetoId)}/${colunaId}${query}`, { aviso: "Coluna excluída", method: "DELETE", token });
}

/* ------------------------------------------------------------------ */
/* Derivação dos tons                                                  */
/* ------------------------------------------------------------------ */

export interface TonsColuna {
  /** O ponto do rótulo, a cor cheia, como veio. */
  ponto: string;
  /** Fundo da pílula e dos cards: bem claro. */
  fundo: string;
  borda: string;
  /** Texto sobre o fundo pálido: mesma matiz, escuro. */
  texto: string;
}

/**
 * Três tons a partir de UMA cor.
 *
 * A diretoria escolhe uma cor só; fundo, borda e texto saem dela mantendo a
 * matiz e mexendo na luminosidade. É o que garante contraste sem obrigar
 * ninguém a escolher quatro valores, e o que impede uma cor escolhida de
 * ficar ilegível como fundo de card.
 */
export function tonsDaColuna(cor: string): TonsColuna {
  const { h, s } = hexParaHsl(cor);
  // Satura um mínimo para cinzas não virarem fundo branco invisível.
  const saturacao = Math.max(s, 12);
  const cheia = `hsl(${h} ${saturacao}% 50%)`;
  // Os tons saem da mistura com os tokens do tema, não de uma luminosidade
  // fixa: no claro a mistura com o card branco dá o pastel de sempre; no
  // escuro (modo noturno, 2026-10-21) o mesmo percentual escurece o card
  // na matiz da cor e o texto clareia, em vez de ficar texto claro sobre
  // fundo pastel ilegível.
  return {
    ponto: cor,
    fundo: `color-mix(in srgb, ${cheia} 10%, var(--atlas-card))`,
    borda: `color-mix(in srgb, ${cheia} 30%, var(--atlas-card))`,
    texto: `color-mix(in srgb, ${cheia} 60%, var(--atlas-foreground))`,
  };
}

function hexParaHsl(hex: string): { h: number; s: number; l: number } {
  const limpo = hex.replace("#", "");
  const r = parseInt(limpo.slice(0, 2), 16) / 255;
  const g = parseInt(limpo.slice(2, 4), 16) / 255;
  const b = parseInt(limpo.slice(4, 6), 16) / 255;
  if ([r, g, b].some(Number.isNaN)) return { h: 220, s: 10, l: 50 };

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 220, s: 0, l: l * 100 };

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;

  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

/**
 * Sugestões de cor no formulário. A diretoria pode digitar qualquer hex —
 * estas são só o atalho para as matizes que já funcionam bem juntas.
 */
export const CORES_SUGERIDAS = [
  "#9CA3AF", // cinza
  "#3B82F6", // azul
  "#F59E0B", // âmbar
  "#10B981", // verde
  "#EF4444", // vermelho
  "#8B5CF6", // roxo
  "#EC4899", // rosa
  "#14B8A6", // teal
  "#F97316", // laranja
  "#6366F1", // índigo
];
