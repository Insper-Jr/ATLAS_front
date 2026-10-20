/**
 * Para onde a pessoa ia antes de cair no login (2026-10-20, a pedido).
 *
 * Quem abre um link do ATLAS sem estar logado (ex.: /vagas mandado no grupo)
 * vai para o login e, depois de entrar, deve voltar para essa tela, não para
 * /projetos. O destino viaja na URL (`/login?volta=/vagas`), e não em
 * `location.state`, porque o 401 do `apiFetch` recarrega a página inteira e
 * o state não sobrevive a isso.
 */

const PARAMETRO = "volta";
const PADRAO = "/projetos";

/** Só caminho interno do próprio ATLAS. "//site.com", "/\\site.com" e URL
 *  completa ficam de fora: sem essa trava, um link com `?volta=` montado por
 *  alguém de fora mandaria a pessoa para outro site logo depois do login. */
export function destinoSeguro(valor: string | null | undefined): string {
  if (!valor || !valor.startsWith("/") || valor.startsWith("//") || valor.startsWith("/\\")) return PADRAO;
  if (valor.startsWith("/login") || valor.startsWith("/definir-senha")) return PADRAO;
  return valor;
}

/** `rota` com o destino junto, quando há um destino que valha lembrar. */
export function comVolta(rota: string, destino: string): string {
  const seguro = destinoSeguro(destino);
  if (seguro === PADRAO) return rota;
  return `${rota}?${PARAMETRO}=${encodeURIComponent(seguro)}`;
}

/** O destino guardado na query string atual (ou /projetos). */
export function lerVolta(search: string): string {
  return destinoSeguro(new URLSearchParams(search).get(PARAMETRO));
}
