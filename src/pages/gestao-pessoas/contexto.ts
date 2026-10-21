import { useOutletContext } from "react-router-dom";
import type { GpCategoria, GpGestao, GpMembroResumo, GpRegistro, GpResumo, GpTipo } from "@/lib/gestao-pessoas";
import type { Nucleo } from "@/lib/nucleos";
import { avisar } from "@/lib/toast";

/** O que as abas e a gaveta da Gestão de Pessoas recebem pelo `Outlet`. */
export interface GpContexto {
  resumo: GpResumo;
  tipos: GpTipo[];
  nucleos: Nucleo[];
  /** Sobe a cada lançamento, correção ou retirada: quem lista registros
   *  recarrega quando muda. */
  versao: number;
  recarregar: () => Promise<void>;
  abrirMembro: (membro: GpMembroResumo, gestao?: GpGestao | null) => void;
  abrirRegistro: (categoria: GpCategoria, membro?: GpMembroResumo | null) => void;
  corrigir: (registro: GpRegistro) => void;
  retirar: (registro: GpRegistro) => void;
}

export function useGestaoPessoas(): GpContexto {
  return useOutletContext<GpContexto>();
}

/** Toast dos avisos que um lançamento gerou (o `apiFetch` já avisa o sucesso). */
export function avisarAvisosGerados(n: number) {
  if (n > 0) avisar(`${n} aviso(s) de pontuação gerado(s).`, "atencao");
}
