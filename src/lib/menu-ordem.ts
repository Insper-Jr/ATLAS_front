/**
 * Ordem do menu lateral escolhida pela diretoria (2026-10-21, a pedido).
 *
 * Vive em `configuracao.menu_ordem` e chega na sessão por `/auth/me`. Grupo
 * ou caminho que não esteja na lista fica no fim, na ordem do código, então
 * um item novo no menu aparece sem ninguém precisar reordenar de novo, e um
 * caminho que deixou de existir é só ignorado.
 */

export interface MenuOrdem {
  grupos: string[];
  itens: Record<string, string[]>;
}

/** Devolve `lista` na ordem de `preferida`; o que não está em `preferida`
 *  vai para o fim, na ordem original. */
export function ordenarPor<T>(lista: readonly T[], chaveDe: (item: T) => string, preferida: string[] | undefined): T[] {
  if (!preferida || preferida.length === 0) return [...lista];
  const posicao = new Map(preferida.map((chave, i) => [chave, i]));
  return [...lista].sort((a, b) => {
    const pa = posicao.get(chaveDe(a));
    const pb = posicao.get(chaveDe(b));
    if (pa === undefined && pb === undefined) return 0;
    if (pa === undefined) return 1;
    if (pb === undefined) return -1;
    return pa - pb;
  });
}

/** Troca o item `indice` com o vizinho de cima (`-1`) ou de baixo (`+1`). */
export function mover<T>(lista: T[], indice: number, direcao: -1 | 1): T[] {
  const alvo = indice + direcao;
  if (alvo < 0 || alvo >= lista.length) return lista;
  const copia = [...lista];
  [copia[indice], copia[alvo]] = [copia[alvo], copia[indice]];
  return copia;
}
