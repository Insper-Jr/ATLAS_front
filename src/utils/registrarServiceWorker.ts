/**
 * Registra o service worker (`public/sw.js`): cache dos arquivos do app e
 * notificação push. Só em produção: no `vite dev` os arquivos não têm hash e
 * um cache por cima só atrapalharia ver as mudanças.
 */
export function registrarServiceWorker(): void {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Sem service worker o app funciona igual, só sem cache e sem push.
    });
  });
}
