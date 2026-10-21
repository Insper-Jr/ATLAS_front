import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import {
  gravarPreferencia,
  gravarTemaAtual,
  lerPreferencia,
  proximaTroca,
  resolverTema,
  type PreferenciaTema,
  type Tema,
} from "@/lib/tema";

interface TemaContextType {
  preferencia: PreferenciaTema;
  setPreferencia: (preferencia: PreferenciaTema) => void;
  temaAtual: Tema;
}

const TemaContext = createContext<TemaContextType | null>(null);

/* Os `theme-color` do navegador (barra do celular, moldura do PWA). */
const COR_BARRA: Record<Tema, string> = { claro: "#ffffff", escuro: "#121212" };

/* Rede de segurança do agendamento por `setTimeout`: o relógio pode pular
   (aparelho dormiu, aba suspensa) e o timer disparar tarde. */
const REAVALIAR_A_CADA_MS = 5 * 60_000;

/* `setTimeout` guarda o atraso num inteiro de 32 bits; acima disto dispara
   na hora. Nenhum nascer do sol fica tão longe, mas custa nada. */
const MAIOR_ATRASO_MS = 2_147_483_647;

function aplicarNoDocumento(tema: Tema) {
  document.documentElement.setAttribute("data-theme", tema === "escuro" ? "dark" : "light");
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", COR_BARRA[tema]);
  gravarTemaAtual(tema);
}

/**
 * Decide o tema (claro ou escuro) e o aplica no `<html data-theme>`.
 *
 * No automático, o tema vira na hora exata do pôr e do nascer do sol: um
 * timer é marcado para a próxima troca e, quando dispara, recalcula e marca
 * a seguinte. A reavaliação periódica e a volta do foco à aba cobrem os
 * casos em que o timer não dispara na hora.
 */
export function TemaProvider({ children }: { children: ReactNode }) {
  const [preferencia, setPreferenciaEstado] = useState<PreferenciaTema>(lerPreferencia);
  const [temaAtual, setTemaAtual] = useState<Tema>(() => resolverTema(lerPreferencia(), new Date()));

  const setPreferencia = useCallback((nova: PreferenciaTema) => {
    gravarPreferencia(nova);
    setPreferenciaEstado(nova);
    setTemaAtual(resolverTema(nova, new Date()));
  }, []);

  useEffect(() => {
    aplicarNoDocumento(temaAtual);
  }, [temaAtual]);

  useEffect(() => {
    if (preferencia !== "automatico") return;

    let timer: number | undefined;
    const agendar = () => {
      const agora = new Date();
      window.clearTimeout(timer);
      // Um segundo depois da troca, e não em cima: evita reavaliar a um
      // milissegundo antes e cair do lado errado do pôr do sol.
      const atraso = Math.min(proximaTroca(agora).getTime() - agora.getTime() + 1000, MAIOR_ATRASO_MS);
      timer = window.setTimeout(reavaliar, atraso);
    };
    // Só os timers e o listener chamam isto: o tema de agora já foi resolvido
    // no estado inicial e em `setPreferencia`.
    const reavaliar = () => {
      setTemaAtual(resolverTema("automatico", new Date()));
      agendar();
    };
    agendar();

    const intervalo = window.setInterval(reavaliar, REAVALIAR_A_CADA_MS);
    const aoVoltar = () => {
      if (document.visibilityState === "visible") reavaliar();
    };
    document.addEventListener("visibilitychange", aoVoltar);

    return () => {
      window.clearTimeout(timer);
      window.clearInterval(intervalo);
      document.removeEventListener("visibilitychange", aoVoltar);
    };
  }, [preferencia]);

  return (
    <TemaContext.Provider value={{ preferencia, setPreferencia, temaAtual }}>
      {children}
    </TemaContext.Provider>
  );
}

export function useTema() {
  const context = useContext(TemaContext);
  if (!context) throw new Error("useTema precisa estar dentro de um TemaProvider");
  return context;
}
