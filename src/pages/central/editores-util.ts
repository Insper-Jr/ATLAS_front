import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getToolBox, type Ficha } from "@/lib/central";

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
