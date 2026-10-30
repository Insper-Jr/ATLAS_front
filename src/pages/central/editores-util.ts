import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  blobUrlProtegida,
  getToolBox,
  urlArquivoConteudo,
  type ArquivoConteudo,
  type Ficha,
} from "@/lib/central";

/** Move o item `i` de uma lista uma posição para cima ou para baixo. */
export function mover<T>(lista: T[], i: number, delta: -1 | 1): T[] {
  const j = i + delta;
  if (j < 0 || j >= lista.length) return lista;
  const copia = [...lista];
  [copia[i], copia[j]] = [copia[j], copia[i]];
  return copia;
}

/** Carrega as fichas publicadas para os seletores. */
export function useFichasPublicadas(): Ficha[] {
  const { token } = useAuth();
  const [fichas, setFichas] = useState<Ficha[]>([]);
  useEffect(() => {
    if (!token) return;
    let vivo = true;
    getToolBox(token)
      .then(
        (t) =>
          vivo && setFichas(t.fichas.filter((f) => f.status === "publicada")),
      )
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, [token]);
  return fichas;
}

/** URL temporária da miniatura de uma imagem protegida (nula até carregar). */
export function useMiniatura(arquivo: ArquivoConteudo | null, token: string | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!arquivo || !arquivo.imagem || !token) return;
    let vivo = true;
    let criado: string | null = null;
    blobUrlProtegida(urlArquivoConteudo(arquivo.id), token)
      .then((u) => {
        criado = u;
        if (vivo) setUrl(u);
      })
      .catch(() => {});
    return () => {
      vivo = false;
      if (criado) URL.revokeObjectURL(criado);
    };
  }, [arquivo, token]);
  return url;
}
