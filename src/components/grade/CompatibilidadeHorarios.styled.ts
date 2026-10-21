import styled, { css } from "styled-components";
import { theme } from "@/styles/theme";

export type Teor = "alta" | "boa" | "media" | "baixa" | "nenhuma" | "desconhecida";

/** Cor por teor. `desconhecida` é cinza de propósito: sem grade preenchida
 *  não há resultado bom nem ruim, e pintar de verde ou vermelho seria fingir
 *  que a conta significa alguma coisa. */
function corDoTeor(teor: Teor) {
  switch (teor) {
    case "alta":
    case "boa":
      return theme.colors.success;
    case "media":
      return theme.colors.warning;
    case "baixa":
    case "nenhuma":
      return theme.colors.destructive;
    default:
      return theme.colors.mutedForeground;
  }
}

export const Bloco = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.borderRadius.lg};
  background: ${theme.colors.card};
`;

export const Topo = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: ${theme.spacing.md};
  flex-wrap: wrap;
`;

export const Titulo = styled.span`
  font-size: ${theme.fontSize.sm};
  font-weight: ${theme.fontWeight.medium};
  color: ${theme.colors.cardForeground};
`;

export const Selo = styled.span<{ $teor: Teor }>`
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.125rem 0.5rem;
  border-radius: ${theme.borderRadius.full};
  font-size: ${theme.fontSize.xs};
  font-weight: ${theme.fontWeight.medium};

  ${({ $teor }) => {
    const cor = corDoTeor($teor);
    return css`
      background: color-mix(in srgb, ${cor} 14%, var(--atlas-card));
      color: ${cor};
      border: 1px solid color-mix(in srgb, ${cor} 32%, transparent);
    `;
  }}
`;

export const Texto = styled.p`
  margin: 0;
  font-size: ${theme.fontSize.xs};
  color: ${theme.colors.mutedForeground};
`;

export const Aviso = styled.p`
  margin: 0;
  font-size: ${theme.fontSize.xs};
  color: ${theme.colors.warningForeground};
  background: color-mix(in srgb, ${theme.colors.warning} 16%, var(--atlas-card));
  border-radius: ${theme.borderRadius.md};
  padding: ${theme.spacing.sm};
`;

/* ------------------------------------------------------------------ */
/* Mini quadro                                                          */
/* ------------------------------------------------------------------ */

/** Versão compacta do quadro do perfil: mesma disposição, sem os rótulos de
 *  hora de término, porque aqui o que importa é o desenho das janelas. */
export const MiniQuadro = styled.table`
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
`;

export const MiniCabecalho = styled.th`
  padding: 0.25rem 0;
  font-size: 0.6875rem;
  font-weight: ${theme.fontWeight.medium};
  color: ${theme.colors.mutedForeground};
  text-align: center;
`;

export const MiniHora = styled.td`
  padding-right: ${theme.spacing.sm};
  width: 3.25rem;
  font-size: 0.6875rem;
  color: ${theme.colors.mutedForeground};
  text-align: right;
  white-space: nowrap;
`;

export const MiniCelula = styled.td<{ $livre: boolean }>`
  height: 1.25rem;
  border: 1px solid ${theme.colors.card};
  border-radius: 2px;
  background: ${({ $livre }) =>
    $livre
      ? `color-mix(in srgb, ${theme.colors.success} 55%, var(--atlas-card))`
      : theme.colors.muted};
`;
