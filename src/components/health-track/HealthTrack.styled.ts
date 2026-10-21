import styled, { css } from "styled-components";
import { theme } from "@/styles/theme";
import type { CorHealthTrack } from "@/lib/health-track";

/* Mesma receita de fundo do `PageBadge` (14% success/destructive, 20%
   warning). O TEXTO é escurecido nas três: o verde e o vermelho puros não
   passam 4.5:1 sobre o próprio fundo claro, e aqui a cor carrega o
   diagnóstico do projeto, não um detalhe decorativo. */
export const FUNDO_COR: Record<CorHealthTrack, string> = {
  verde: `color-mix(in srgb, ${theme.colors.success} 14%, var(--atlas-card))`,
  amarelo: `color-mix(in srgb, ${theme.colors.warning} 20%, var(--atlas-card))`,
  vermelho: `color-mix(in srgb, ${theme.colors.destructive} 14%, var(--atlas-card))`,
};

export const TEXTO_COR: Record<CorHealthTrack, string> = {
  verde: `color-mix(in srgb, ${theme.colors.success} 55%, var(--atlas-tinta))`,
  amarelo: `color-mix(in srgb, ${theme.colors.warning} 60%, var(--atlas-tinta))`,
  vermelho: `color-mix(in srgb, ${theme.colors.destructive} 80%, var(--atlas-tinta))`,
};

/** A cor cheia, para o ponto e a borda do item escolhido. */
export const SOLIDO_COR: Record<CorHealthTrack, string> = {
  verde: theme.colors.success,
  amarelo: theme.colors.warning,
  vermelho: theme.colors.destructive,
};

/* ------------------------------------------------------------------ */
/* Selo                                                                 */
/* ------------------------------------------------------------------ */

export const Selo = styled.span<{ $cor: CorHealthTrack; $grande?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  border-radius: ${theme.borderRadius.full};
  font-weight: ${theme.fontWeight.medium};
  white-space: nowrap;
  background: ${({ $cor }) => FUNDO_COR[$cor]};
  color: ${({ $cor }) => TEXTO_COR[$cor]};

  ${({ $grande }) =>
    $grande
      ? css`
          padding: 0.375rem 0.875rem;
          font-size: ${theme.fontSize.base};
          svg {
            width: 1.125rem;
            height: 1.125rem;
          }
        `
      : css`
          padding: 0.125rem 0.5rem;
          font-size: ${theme.fontSize.xs};
          svg {
            width: 0.875rem;
            height: 0.875rem;
          }
        `}

  svg {
    flex-shrink: 0;
  }
`;

export const SemCor = styled.span`
  font-size: ${theme.fontSize.xs};
  color: ${theme.colors.mutedForeground};
`;

/* ------------------------------------------------------------------ */
/* Seletor de cor (radio group)                                         */
/* ------------------------------------------------------------------ */

export const GrupoCores = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.sm};
  margin: 0;
  padding: 0;
  border: 0;
`;

/* A opção é um <label> com o <input type="radio"> dentro, visualmente
   escondido: o navegador cuida de setas, Tab e leitor de tela; o estilo só
   veste o que já é acessível. */
export const OpcaoCor = styled.label<{ $cor: CorHealthTrack; $marcada: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  min-height: 2.75rem;
  padding: 0 0.875rem;
  border-radius: ${theme.borderRadius.lg};
  border: 1px solid ${theme.colors.border};
  background: ${theme.colors.card};
  color: ${theme.colors.foreground};
  font-size: ${theme.fontSize.sm};
  font-weight: ${theme.fontWeight.medium};
  cursor: pointer;
  transition: background ${theme.transitions.fast}, border-color ${theme.transitions.fast},
    color ${theme.transitions.fast};

  svg {
    width: 1rem;
    height: 1rem;
    color: ${({ $cor }) => SOLIDO_COR[$cor]};
  }

  &:hover {
    border-color: ${({ $cor }) => SOLIDO_COR[$cor]};
  }

  ${({ $cor, $marcada }) =>
    $marcada &&
    css`
      background: ${FUNDO_COR[$cor]};
      border-color: ${SOLIDO_COR[$cor]};
      color: ${TEXTO_COR[$cor]};
      svg {
        color: ${TEXTO_COR[$cor]};
      }
    `}

  &:has(input:focus-visible) {
    box-shadow: 0 0 0 3px color-mix(in srgb, ${theme.colors.ring} 35%, transparent);
  }

  input {
    position: absolute;
    opacity: 0;
    width: 1px;
    height: 1px;
    pointer-events: none;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;
