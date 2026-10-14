import { useSyncExternalStore } from "react";
import { AlertTriangle, CheckCircle2, X, XCircle } from "lucide-react";
import styled, { keyframes } from "styled-components";
import { breakpoints, theme } from "@/styles/theme";
import { assinarAvisos, dispensarAviso, lerAvisos, type TomDoAviso } from "@/lib/toast";

const entrar = keyframes`
  from { opacity: 0; transform: translateY(0.5rem); }
  to { opacity: 1; transform: translateY(0); }
`;

/** Embaixo e centralizado no celular (longe do polegar que acabou de clicar
 *  no topo, e por cima da barra do sistema via safe-area); canto inferior
 *  direito no computador. */
const Pilha = styled.div`
  position: fixed;
  left: 50%;
  bottom: calc(1rem + env(safe-area-inset-bottom, 0px));
  transform: translateX(-50%);
  z-index: ${theme.zIndex.toast};
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: min(calc(100vw - 2rem), 26rem);
  pointer-events: none;

  @media (min-width: ${breakpoints.md}px) {
    left: auto;
    right: 1.25rem;
    bottom: 1.25rem;
    transform: none;
  }
`;

const COR: Record<TomDoAviso, string> = {
  sucesso: theme.colors.success,
  erro: theme.colors.destructive,
  atencao: theme.colors.warning,
};

const Cartao = styled.div<{ $tom: TomDoAviso }>`
  pointer-events: auto;
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  padding: 0.7rem 0.6rem 0.7rem 0.9rem;
  background: ${theme.colors.card};
  color: ${theme.colors.foreground};
  border: 1px solid ${theme.colors.border};
  border-left: 3px solid ${({ $tom }) => COR[$tom]};
  border-radius: ${theme.borderRadius.lg};
  box-shadow: ${theme.shadows.lg};
  font-size: ${theme.fontSize.sm};
  line-height: 1.4;
  animation: ${entrar} 180ms ease-out;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const Icone = styled.span<{ $tom: TomDoAviso }>`
  flex-shrink: 0;
  display: inline-flex;
  margin-top: 0.1rem;
  color: ${({ $tom }) => COR[$tom]};
`;

const Texto = styled.span`
  flex: 1;
`;

const Fechar = styled.button`
  flex-shrink: 0;
  display: inline-flex;
  padding: 0.15rem;
  border: 0;
  background: transparent;
  color: ${theme.colors.mutedForeground};
  cursor: pointer;
  border-radius: ${theme.borderRadius.sm};

  &:hover {
    color: ${theme.colors.foreground};
    background: ${theme.colors.muted};
  }
`;

const ICONE: Record<TomDoAviso, typeof CheckCircle2> = {
  sucesso: CheckCircle2,
  erro: XCircle,
  atencao: AlertTriangle,
};

/**
 * A pilha de avisos passageiros (ver `lib/toast.ts`). Um só na árvore, em
 * `App`. `role="status"` + `aria-live` pra leitor de tela anunciar sem
 * roubar o foco.
 */
export function Toasts() {
  const avisos = useSyncExternalStore(assinarAvisos, lerAvisos, lerAvisos);
  if (avisos.length === 0) return null;
  return (
    <Pilha role="status" aria-live="polite">
      {avisos.map((aviso) => {
        const Simbolo = ICONE[aviso.tom];
        return (
          <Cartao key={aviso.id} $tom={aviso.tom}>
            <Icone $tom={aviso.tom} aria-hidden="true">
              <Simbolo size={16} />
            </Icone>
            <Texto>{aviso.texto}</Texto>
            <Fechar type="button" aria-label="Fechar aviso" onClick={() => dispensarAviso(aviso.id)}>
              <X size={14} />
            </Fechar>
          </Cartao>
        );
      })}
    </Pilha>
  );
}
