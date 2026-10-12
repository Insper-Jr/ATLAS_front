/**
 * Está rodando num celular (ou tablet)?
 *
 * Decide a sessão longa (2026-10-12): no celular o login não expira na
 * prática, porque o aparelho já tem senha de desbloqueio e o push precisa da
 * pessoa logada. No computador a sessão segue curta. Ver
 * `ACCESS_TOKEN_CELULAR_DIAS` no backend.
 */
export function ehCelular(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  // iPad com iPadOS se apresenta como Mac; o toque denuncia.
  const ipad = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(ua) || ipad;
}
