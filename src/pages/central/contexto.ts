import { useOutletContext } from "react-router-dom";
import type { Pendencias } from "@/lib/central";

/** O que a página da Central repassa às abas. */
export interface CentralContexto {
  pendencias: Pendencias | null;
  recarregarPendencias: () => Promise<void>;
  abrirIndicacao: () => void;
  /** Muda a cada indicação ou decisão; as abas que listam fichas recarregam. */
  versao: number;
}

export function useCentral() {
  return useOutletContext<CentralContexto>();
}
