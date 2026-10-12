import { apiFetch } from "@/lib/api";

/**
 * Notificação push (Web Push) neste aparelho. O backend manda os mesmos
 * avisos do sino e do e-mail pros aparelhos ativados; aqui é só ligar,
 * desligar e testar. Ver `routers/push.py` no backend e `public/sw.js`.
 *
 * iPhone: só funciona com o ATLAS adicionado à Tela de Início (iOS 16.4+).
 * No Safari comum o navegador nem oferece push.
 */
export type EstadoPush =
  /** iPhone/iPad fora da Tela de Início. */
  | "instalar_ios"
  /** Navegador sem push, ou sem service worker (ex.: `vite dev`). */
  | "sem_suporte"
  /** Servidor sem as chaves VAPID configuradas. */
  | "sem_servidor"
  /** A pessoa negou a permissão; só se desfaz nas configurações. */
  | "bloqueado"
  | "desativado"
  | "ativado";

export function ehIOS(): boolean {
  // iPad com iPadOS se apresenta como Mac; o toque denuncia.
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function rodandoInstalado(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function suportaPush(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

async function registro(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  return (await navigator.serviceWorker.getRegistration()) ?? null;
}

function bytesDaChave(base64url: string): Uint8Array<ArrayBuffer> {
  const base64 = (base64url + "=".repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const bruto = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(bruto.length));
  for (let i = 0; i < bruto.length; i++) bytes[i] = bruto.charCodeAt(i);
  return bytes;
}

export function getChavePublicaPush(token: string) {
  return apiFetch<{ chave: string | null }>("/push/chave-publica", { token });
}

async function salvarInscricao(inscricao: PushSubscription, token: string): Promise<void> {
  const dados = inscricao.toJSON();
  await apiFetch("/push/inscricoes", {
    method: "POST",
    token,
    body: JSON.stringify({
      endpoint: dados.endpoint,
      keys: { p256dh: dados.keys?.p256dh, auth: dados.keys?.auth },
      user_agent: navigator.userAgent.slice(0, 300),
    }),
  });
}

/** O estado deste aparelho, pra tela decidir o que oferecer. `chave` volta
 *  junto porque ativar precisa dela sem outra ida ao servidor (ver
 *  `ativarPush`). */
export async function estadoPush(token: string): Promise<{ estado: EstadoPush; chave: string | null }> {
  if (ehIOS() && !rodandoInstalado()) return { estado: "instalar_ios", chave: null };
  if (!suportaPush()) return { estado: "sem_suporte", chave: null };
  const reg = await registro();
  if (!reg) return { estado: "sem_suporte", chave: null };
  const { chave } = await getChavePublicaPush(token);
  if (!chave) return { estado: "sem_servidor", chave: null };
  if (Notification.permission === "denied") return { estado: "bloqueado", chave };
  const inscricao = await reg.pushManager.getSubscription();
  return { estado: inscricao && Notification.permission === "granted" ? "ativado" : "desativado", chave };
}

/**
 * Pede a permissão e inscreve este aparelho.
 *
 * Atenção: `requestPermission` é a PRIMEIRA coisa, sem nenhum `await` antes: o
 * Safari só mostra o pedido se ele vier direto do toque no botão. Por isso a
 * chave pública chega pronta, buscada antes em `estadoPush`.
 */
export async function ativarPush(token: string, chave: string): Promise<void> {
  const permissao = await Notification.requestPermission();
  if (permissao !== "granted") {
    throw new Error(
      permissao === "denied"
        ? "A permissão foi negada. Libere as notificações do ATLAS nas configurações do aparelho."
        : "A permissão não foi concedida.",
    );
  }
  const reg = await navigator.serviceWorker.ready;
  const inscricao =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: bytesDaChave(chave) }));
  await salvarInscricao(inscricao, token);
}

/** Desliga neste aparelho: tira do servidor e cancela no navegador. Não
 *  lança: no "Sair" isto roda de carona e não pode travar a saída. */
export async function desativarPush(token: string | null): Promise<void> {
  try {
    const reg = await registro();
    const inscricao = await reg?.pushManager.getSubscription();
    if (!inscricao) return;
    if (token) {
      await apiFetch("/push/inscricoes", {
        method: "DELETE",
        token,
        body: JSON.stringify({ endpoint: inscricao.endpoint }),
      }).catch(() => undefined);
    }
    await inscricao.unsubscribe();
  } catch {
    // Melhor esforço. Se sobrar inscrição no servidor, o próximo envio
    // recebe 410 do serviço de push e o backend apaga.
  }
}

/**
 * Ao abrir o app logado: se este aparelho já tem push ativado, garante que
 * o servidor sabe que ele é de QUEM está logado agora (aparelho que trocou
 * de pessoa, ou inscrição que o navegador renovou sozinho). Não lança.
 */
export async function sincronizarPush(token: string): Promise<void> {
  try {
    if (!suportaPush() || Notification.permission !== "granted") return;
    const reg = await registro();
    const inscricao = await reg?.pushManager.getSubscription();
    if (inscricao) await salvarInscricao(inscricao, token);
  } catch {
    // Sem efeito visível: a tela de Meu Perfil mostra o estado real.
  }
}

export function enviarPushTeste(token: string) {
  return apiFetch<{ entregues: number }>("/push/teste", { method: "POST", token });
}
