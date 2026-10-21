import styled from "styled-components";
import { theme } from "@/styles/theme";

/** Escala 1-5: < 3 vermelho, 3 âmbar, 4-5 verde, sem nota cinza. Mesma
 *  leitura da AVD e do `tomDaNota` de `Avaliacoes.tsx`. */
export type TomNota = "danger" | "warning" | "success" | "muted";

const CORES_NOTA: Record<TomNota, { texto: string; barra: string; fundo: string }> = {
  danger: {
    texto: theme.colors.destructive,
    barra: theme.colors.destructive,
    fundo: `color-mix(in srgb, ${theme.colors.destructive} 14%, var(--atlas-card))`,
  },
  warning: {
    texto: `color-mix(in srgb, ${theme.colors.warning} 78%, var(--atlas-tinta))`,
    barra: theme.colors.warning,
    fundo: `color-mix(in srgb, ${theme.colors.warning} 18%, var(--atlas-card))`,
  },
  success: {
    texto: `color-mix(in srgb, ${theme.colors.success} 82%, var(--atlas-tinta))`,
    barra: theme.colors.success,
    fundo: `color-mix(in srgb, ${theme.colors.success} 14%, var(--atlas-card))`,
  },
  muted: {
    texto: theme.colors.mutedForeground,
    barra: theme.colors.mutedForeground,
    fundo: theme.colors.secondary,
  },
};

export const RelatorioStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.lg};
`;

export const RelatorioTopoRow = styled.div`
  display: flex;
  justify-content: flex-end;
`;

// Agrupa tudo que entra no PDF (cabeçalho, abas, notas, comentários) num único
// nó, é o que a exportação (`exportarPDF`) fotografa. Precisa do próprio
// flex+gap porque, sem isso, virar filho único do RelatorioStack colapsaria o
// espaçamento entre as seções internas.
export const RelatorioConteudo = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.lg};
`;

export const RelatorioPessoaHeader = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
`;

export const RelatorioPessoaNome = styled.h2`
  margin: 0;
  font-size: ${theme.fontSize.xl};
  font-weight: ${theme.fontWeight.bold};
  color: ${theme.colors.foreground};
`;

export const RelatorioPessoaMeta = styled.p`
  margin: 0;
  font-size: ${theme.fontSize.sm};
  color: ${theme.colors.mutedForeground};
`;

export const TipoTabBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  border-bottom: 1px solid ${theme.colors.border};
`;

export const TipoTabButton = styled.button<{ $active: boolean }>`
  padding: 0.5rem 0.875rem;
  border: none;
  border-bottom: 2px solid ${({ $active }) => ($active ? theme.colors.primary : "transparent")};
  margin-bottom: -1px;
  background: transparent;
  font-size: ${theme.fontSize.sm};
  font-weight: ${theme.fontWeight.medium};
  color: ${({ $active }) => ($active ? theme.colors.primary : theme.colors.mutedForeground)};
  cursor: pointer;

  &:hover {
    color: ${theme.colors.primary};
  }
`;

export const LoteFiltroRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
`;

export const LoteFiltroChip = styled.button<{ $active: boolean }>`
  padding: 0.25rem 0.75rem;
  border-radius: ${theme.borderRadius.full};
  border: 1px solid ${({ $active }) => ($active ? theme.colors.primary : theme.colors.border)};
  background: ${({ $active }) => ($active ? theme.colors.primary : theme.colors.background)};
  color: ${({ $active }) => ($active ? theme.colors.primaryForeground : theme.colors.foreground)};
  font-size: ${theme.fontSize.xs};
  font-weight: ${theme.fontWeight.medium};
  cursor: pointer;

  &:hover:not(:disabled) {
    border-color: ${theme.colors.primary};
  }
`;

export const NotaGeralRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.lg};
`;

export const NotaGeralCirculo = styled.div<{ $tom: TomNota }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 3.5rem;
  height: 3.5rem;
  flex-shrink: 0;
  border-radius: ${theme.borderRadius.full};
  font-size: ${theme.fontSize.lg};
  font-weight: ${theme.fontWeight.bold};
  color: ${({ $tom }) => CORES_NOTA[$tom].texto};
  background: ${({ $tom }) => CORES_NOTA[$tom].fundo};
`;

export const NotaGeralLabel = styled.div`
  font-size: ${theme.fontSize.xs};
  color: ${theme.colors.mutedForeground};
  text-transform: uppercase;
  letter-spacing: 0.04em;
`;

export const NotaGeralQuantidade = styled.div`
  font-size: ${theme.fontSize.sm};
  color: ${theme.colors.mutedForeground};
`;

export const CriteriosList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
`;

export const CriterioRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

export const CriterioLabel = styled.span`
  font-size: ${theme.fontSize.sm};
  color: ${theme.colors.foreground};
`;

export const StarBarRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.625rem;
`;

export const StarBarTrack = styled.div`
  flex: 1;
  height: 0.375rem;
  border-radius: ${theme.borderRadius.full};
  background: ${theme.colors.secondary};
  overflow: hidden;
`;

export const StarBarFill = styled.div<{ $percent: number; $tom: TomNota }>`
  height: 100%;
  border-radius: ${theme.borderRadius.full};
  width: ${({ $percent }) => $percent}%;
  background: ${({ $tom }) => CORES_NOTA[$tom].barra};
  transition: width ${theme.transitions.fast};
`;

export const StarBarValue = styled.span<{ $tom: TomNota }>`
  min-width: 1.75rem;
  text-align: right;
  font-size: ${theme.fontSize.sm};
  font-weight: ${theme.fontWeight.bold};
  color: ${({ $tom }) => CORES_NOTA[$tom].texto};
`;

export const RespostaTextoBlock = styled.p`
  margin: 0;
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border-radius: ${theme.borderRadius.md};
  background: ${theme.colors.muted};
  font-size: ${theme.fontSize.sm};
  color: ${theme.colors.foreground};
`;

export const ComentariosList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
`;

export const ComentarioItem = styled.p`
  margin: 0;
  padding: ${theme.spacing.md};
  border-radius: ${theme.borderRadius.md};
  background: ${theme.colors.muted};
  font-size: ${theme.fontSize.sm};
  color: ${theme.colors.foreground};
  white-space: pre-wrap;
`;

export const SectionTitle = styled.h4`
  margin: 0;
  font-size: ${theme.fontSize.xs};
  font-weight: ${theme.fontWeight.semibold};
  color: ${theme.colors.mutedForeground};
  text-transform: uppercase;
  letter-spacing: 0.04em;
`;
