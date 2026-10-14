/**
 * Aviso passageiro de canto ("Você entrou na banca", "Salvo"), 2026-10-14,
 * a pedido: até aqui a maioria das ações não dizia nada quando dava certo, e
 * no celular, sem recarregar a página, parecia que o clique não tinha feito
 * nada.
 *
 * Fica fora do React de propósito: quem dispara, na prática, é `apiFetch`
 * (a opção `aviso`), que não está dentro de componente nenhum. `<Toasts />`
 * assina esta lista e desenha.
 */

export type TomDoAviso = "sucesso" | "erro" | "atencao";

export interface Aviso {
  id: number;
  texto: string;
  tom: TomDoAviso;
}

type Ouvinte = () => void;

let avisos: Aviso[] = [];
const ouvintes = new Set<Ouvinte>();
let proximoId = 1;

function publicar() {
  for (const ouvinte of ouvintes) ouvinte();
}

/** Mostra um aviso e some sozinho: 3,5 s se for sucesso, 6 s se for erro ou atenção. */
export function avisar(texto: string, tom: TomDoAviso = "sucesso"): number {
  const id = proximoId++;
  avisos = [...avisos, { id, texto, tom }];
  publicar();
  window.setTimeout(() => dispensarAviso(id), tom === "sucesso" ? 3500 : 6000);
  return id;
}

export function dispensarAviso(id: number) {
  if (!avisos.some((a) => a.id === id)) return;
  avisos = avisos.filter((a) => a.id !== id);
  publicar();
}

/** Par pro `useSyncExternalStore`: a referência só muda quando a lista muda. */
export function lerAvisos(): Aviso[] {
  return avisos;
}

export function assinarAvisos(ouvinte: Ouvinte): () => void {
  ouvintes.add(ouvinte);
  return () => {
    ouvintes.delete(ouvinte);
  };
}
