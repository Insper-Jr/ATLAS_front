import styled, { css } from "styled-components";
import { theme } from "@/styles/theme";

/* ------------------------------------------------------------------ */
/* Layout de página                                                    */
/* ------------------------------------------------------------------ */

export const PageStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.lg};
`;

export const PageHeader = styled.header`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xs};

  @media (min-width: ${theme.breakpoints.md}px) {
    flex-direction: row;
    align-items: flex-end;
    justify-content: space-between;
  }
`;

export const PageHeaderText = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xs};
`;

export const PageTitle = styled.h1`
  margin: 0;
  font-size: ${theme.fontSize["2xl"]};
  font-weight: ${theme.fontWeight.bold};
  letter-spacing: -0.01em;
  color: ${theme.colors.foreground};
`;

export const PageSubtitle = styled.p`
  margin: 0;
  font-size: ${theme.fontSize.sm};
  color: ${theme.colors.mutedForeground};
`;

export const PageStats = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.sm};
`;

export const PageStat = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  border-radius: ${theme.borderRadius.full};
  border: 1px solid ${theme.colors.border};
  background: ${theme.colors.secondary};
  font-size: ${theme.fontSize.sm};
  color: ${theme.colors.foreground};
`;

export const PageGrid = styled.div<{ $columns?: 1 | 2 }>`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${theme.spacing.lg};

  @media (min-width: ${theme.breakpoints.lg}px) {
    grid-template-columns: ${({ $columns = 2 }) => ($columns === 2 ? "minmax(280px, 360px) 1fr" : "1fr")};
  }
`;

/* ------------------------------------------------------------------ */
/* Card                                                                 */
/* ------------------------------------------------------------------ */

export const PageCard = styled.section`
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: ${theme.borderRadius.xl};
  border: 1px solid ${theme.colors.border};
  background: ${theme.colors.card};
  box-shadow: ${theme.shadows.sm};
`;

export const PageCardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;

  /* O cabeçalho costuma ser "título à esquerda, controle à direita" (o seletor
     de papel da Alocação, por exemplo). Numa tela estreita os dois não cabem na
     mesma linha, e sem o wrap o controle era espremido até cortar o rótulo em
     vez de descer. Quebrando, ele vira uma segunda linha inteira.
     No desktop nada muda: só quebra o que não cabe. */
  flex-wrap: wrap;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  border-bottom: 1px solid ${theme.colors.border};
`;

export const PageCardTitle = styled.h2`
  margin: 0;
  font-size: ${theme.fontSize.base};
  font-weight: ${theme.fontWeight.medium};
  color: ${theme.colors.cardForeground};
`;

export const PageCardContent = styled.div`
  padding: ${theme.spacing.lg};
`;

/* ------------------------------------------------------------------ */
/* Botões                                                               */
/* ------------------------------------------------------------------ */

const buttonBase = css`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  border-radius: ${theme.borderRadius.lg};
  font-size: ${theme.fontSize.sm};
  font-weight: ${theme.fontWeight.medium};
  line-height: 1;
  cursor: pointer;
  transition: background ${theme.transitions.fast}, color ${theme.transitions.fast},
    border-color ${theme.transitions.fast}, opacity ${theme.transitions.fast};
  outline: none;

  &:focus-visible {
    box-shadow: 0 0 0 3px color-mix(in srgb, ${theme.colors.ring} 35%, transparent);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }
`;

export const PageButton = styled.button<{ $variant?: "primary" | "outline" | "ghost" }>`
  ${buttonBase}
  height: 2rem;
  padding: 0 0.75rem;
  border: 1px solid transparent;

  /* Alvo de toque: 2rem (32px) é metade do mínimo confortável para o polegar.
     Só a altura e o respiro lateral crescem — a fonte fica igual, senão os
     rótulos longos ("Registrar justificativa") começam a quebrar linha. */
  @media (max-width: ${theme.breakpoints.md}px) {
    height: 2.75rem;
    padding: 0 1rem;
  }

  ${({ $variant = "primary" }) =>
    $variant === "primary"
      ? css`
          background: ${theme.colors.primary};
          color: ${theme.colors.primaryForeground};
          &:hover:not(:disabled) {
            background: color-mix(in srgb, ${theme.colors.primary} 88%, black);
          }
        `
      : $variant === "outline"
        ? css`
            border-color: ${theme.colors.border};
            background: ${theme.colors.background};
            color: ${theme.colors.foreground};
            &:hover:not(:disabled) {
              background: ${theme.colors.muted};
            }
          `
        : css`
            background: transparent;
            color: ${theme.colors.foreground};
            &:hover:not(:disabled) {
              background: ${theme.colors.muted};
            }
          `}
`;

export const PageButtonSm = styled(PageButton)`
  height: 1.75rem;
  padding: 0 0.625rem;
  font-size: ${theme.fontSize.xs};

  /* Precisa vir depois do media query herdado do PageButton, senão a altura de
     2.75rem de lá venceria e o botão "pequeno" ficaria do tamanho do normal no
     celular. 2.25rem é o meio-termo: dá para acertar com o dedo e as barras de
     ação com 3 ou 4 destes ainda cabem numa linha. */
  @media (max-width: ${theme.breakpoints.md}px) {
    height: 2.25rem;
    padding: 0 0.875rem;
  }
`;

/* ------------------------------------------------------------------ */
/* Badge / status                                                       */
/* ------------------------------------------------------------------ */

export const PageBadge = styled.span<{
  $tone?: "default" | "success" | "muted" | "warning" | "danger";
}>`
  display: inline-flex;
  align-items: center;
  padding: 0.125rem 0.5rem;
  border-radius: ${theme.borderRadius.full};
  font-size: ${theme.fontSize.xs};
  font-weight: ${theme.fontWeight.medium};
  white-space: nowrap;

  ${({ $tone = "default" }) =>
    $tone === "success"
      ? css`
          background: color-mix(in srgb, ${theme.colors.success} 14%, var(--atlas-card));
          color: ${theme.colors.success};
        `
      : /* `danger` é reservado para o que precisa gritar: banca atrasada e
           escopo que estourou os dias vendidos. Vem com borda, para não se
           confundir com o `default`, que também é avermelhado. */
        $tone === "danger"
        ? css`
            background: color-mix(in srgb, ${theme.colors.destructive} 14%, var(--atlas-card));
            color: ${theme.colors.destructive};
            border: 1px solid color-mix(in srgb, ${theme.colors.destructive} 35%, transparent);
          `
        : $tone === "warning"
          ? css`
              background: color-mix(in srgb, ${theme.colors.warning} 20%, var(--atlas-card));
              color: ${theme.colors.warningForeground};
            `
          : $tone === "muted"
            ? css`
                background: ${theme.colors.muted};
                color: ${theme.colors.mutedForeground};
              `
            : css`
                background: color-mix(in srgb, ${theme.colors.primary} 10%, var(--atlas-card));
                color: ${theme.colors.primary};
              `}
`;

/* ------------------------------------------------------------------ */
/* Listas e estados                                                     */
/* ------------------------------------------------------------------ */

export const EmptyText = styled.p`
  margin: 0;
  font-size: ${theme.fontSize.sm};
  color: ${theme.colors.mutedForeground};
`;

export const PageLoadingBlock = styled.div`
  height: 16rem;
  width: 100%;
  border-radius: ${theme.borderRadius.xl};
  background: linear-gradient(
    90deg,
    ${theme.colors.muted} 0%,
    color-mix(in srgb, ${theme.colors.muted} 60%, var(--atlas-card)) 50%,
    ${theme.colors.muted} 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.2s ease-in-out infinite;

  @keyframes shimmer {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }
`;

export const ErrorBlock = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.75rem;
  padding: ${theme.spacing.xl};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.borderRadius.xl};
  background: ${theme.colors.background};
`;

export const ErrorText = styled.p`
  margin: 0;
  font-size: ${theme.fontSize.sm};
  font-weight: ${theme.fontWeight.medium};
  /* ⚠ 2026-09-21, corrigido: estava na cor de texto secundário
     (mutedForeground) — um "ErrorText" cinza-claro é indistinguível de uma
     legenda qualquer, e é usado em toda a aplicação pra mostrar o motivo de
     uma ação ter falhado. Precisa ler como erro à primeira vista. */
  color: ${theme.colors.destructive};
`;
