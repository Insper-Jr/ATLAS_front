/*
 * Service worker do ATLAS.
 *
 * Duas funções, e só elas:
 *
 * 1. Carregar rápido. Os arquivos de /assets/ têm o hash no nome, então nunca
 *    mudam: vêm do cache direto. A página (index.html) é sempre buscada na
 *    rede primeiro, pra um deploy novo chegar na hora; o cache só serve se a
 *    rede falhar. A API (/api/ e o backend em outro domínio) nunca passa por
 *    aqui: dado de tela é sempre o da hora.
 *
 * 2. Notificação push: mostrar o aviso que o backend manda e abrir a tela
 *    certa no clique.
 *
 * Trocar VERSAO descarta os caches antigos na próxima ativação.
 */

const VERSAO = "atlas-v1";
const CACHE_PAGINA = `${VERSAO}-pagina`;
const CACHE_ASSETS = `${VERSAO}-assets`;
const CACHE_ESTATICOS = `${VERSAO}-estaticos`;
// Cada deploy traz arquivos novos em /assets/ e os antigos param de ser
// usados. O limite impede o cache de crescer pra sempre.
const LIMITE_ASSETS = 120;
const ESTATICOS = ["/manifest.webmanifest", "/insperjr.png", "/icons/icon-192.png", "/icons/badge-96.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_PAGINA).then((c) => c.add("/")),
      caches.open(CACHE_ESTATICOS).then((c) => c.addAll(ESTATICOS)),
    ]).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((nomes) => Promise.all(nomes.filter((n) => !n.startsWith(VERSAO)).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

async function aparar(nomeCache, limite) {
  const cache = await caches.open(nomeCache);
  const chaves = await cache.keys();
  for (let i = 0; i < chaves.length - limite; i++) {
    await cache.delete(chaves[i]);
  }
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  // Página: rede primeiro, cache se estiver sem rede.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copia = res.clone();
            caches.open(CACHE_PAGINA).then((c) => c.put("/", copia));
          }
          return res;
        })
        .catch(() => caches.match("/", { cacheName: CACHE_PAGINA })),
    );
    return;
  }

  // Arquivos com hash no nome: cache primeiro.
  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(
      caches.open(CACHE_ASSETS).then(async (cache) => {
        const guardado = await cache.match(req);
        if (guardado) return guardado;
        const res = await fetch(req);
        if (res.ok) {
          await cache.put(req, res.clone());
          aparar(CACHE_ASSETS, LIMITE_ASSETS);
        }
        return res;
      }),
    );
    return;
  }

  // Ícones e manifest: devolve o do cache e atualiza por trás.
  if (ESTATICOS.includes(url.pathname) || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.open(CACHE_ESTATICOS).then(async (cache) => {
        const guardado = await cache.match(req);
        const daRede = fetch(req)
          .then((res) => {
            if (res.ok) cache.put(req, res.clone());
            return res;
          })
          .catch(() => guardado);
        return guardado || daRede;
      }),
    );
  }
});

self.addEventListener("push", (event) => {
  let dados;
  try {
    dados = event.data ? event.data.json() : {};
  } catch {
    dados = { corpo: event.data ? event.data.text() : "" };
  }
  const titulo = dados.titulo || "ATLAS";
  event.waitUntil(
    self.registration.showNotification(titulo, {
      body: dados.corpo || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-96.png",
      data: { url: dados.url || "/notificacoes" },
      lang: "pt-BR",
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const destino = new URL((event.notification.data && event.notification.data.url) || "/notificacoes", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((janelas) => {
      // Já tem o ATLAS aberto: traz pra frente e leva pra tela do aviso.
      for (const janela of janelas) {
        if (new URL(janela.url).origin === self.location.origin && "focus" in janela) {
          return janela.focus().then((j) => (j && "navigate" in j ? j.navigate(destino) : j));
        }
      }
      return self.clients.openWindow(destino);
    }),
  );
});
