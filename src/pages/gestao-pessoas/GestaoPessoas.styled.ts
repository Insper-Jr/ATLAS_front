import styled, { css } from "styled-components";
import { theme } from "@/styles/theme";
import { ModalOverlay } from "@/styles/modal.styled";
import { TableRow } from "@/pages/Bancas.styled";

/* ------------------------------------------------------------------ */
/* Sub-abas em pílula (Todos / Próximos ao limite / Análises)           */
/* ------------------------------------------------------------------ */

export const SubAbas = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

export const SubAba = styled.button<{ $ativa?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  height: 2rem;
  padding: 0 0.875rem;
  border-radius: ${theme.borderRadius.full};
  border: 1px solid ${({ $ativa }) => ($ativa ? theme.colors.primary : theme.colors.border)};
  background: ${({ $ativa }) => ($ativa ? theme.colors.primary : theme.colors.card)};
  color: ${({ $ativa }) => ($ativa ? theme.colors.primaryForeground : theme.colors.foreground)};
  font-size: ${theme.fontSize.sm};
  font-weight: ${theme.fontWeight.medium};
  cursor: pointer;
  white-space: nowrap;

  &:hover {
    border-color: ${theme.colors.primary};
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.ring};
    outline-offset: 2px;
  }
`;

/* ------------------------------------------------------------------ */
/* Barra "p/L" e pontos com sinal                                       */
/* ------------------------------------------------------------------ */

export const Medidor = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  min-width: 8rem;
`;

export const BarraTrilha = styled.div`
  flex: 1;
  height: 0.375rem;
  border-radius: ${theme.borderRadius.full};
  background: ${theme.colors.secondary};
  overflow: hidden;
`;

export const BarraFill = styled.div<{ $percent: number; $cor: string }>`
  height: 100%;
  width: ${({ $percent }) => Math.min(100, Math.max(0, $percent))}%;
  background: ${({ $cor }) => $cor};
  border-radius: ${theme.borderRadius.full};
`;

export const MedidorTexto = styled.span`
  font-size: ${theme.fontSize.xs};
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  color: ${theme.colors.foreground};
`;

export const Pontos = styled.span<{ $cor: string; $riscado?: boolean }>`
  font-weight: ${theme.fontWeight.semibold};
  font-variant-numeric: tabular-nums;
  color: ${({ $cor }) => theme.clarear($cor)};
  white-space: nowrap;
  ${({ $riscado }) =>
    $riscado &&
    css`
      text-decoration: line-through;
      opacity: 0.6;
    `}
`;

/* ------------------------------------------------------------------ */
/* Filtros e listas                                                     */
/* ------------------------------------------------------------------ */

export const Filtros = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.sm};
  margin-bottom: ${theme.spacing.md};

  & > * {
    flex: 0 1 14rem;
  }

  @media (max-width: ${theme.breakpoints.sm}px) {
    & > * {
      flex: 1 1 100%;
    }
  }
`;

export const Busca = styled.input`
  height: 2.25rem;
  padding: 0 0.75rem;
  border-radius: ${theme.borderRadius.lg};
  border: 1px solid ${theme.colors.input};
  background: ${theme.colors.background};
  font-size: ${theme.fontSize.sm};
  color: ${theme.colors.foreground};

  &:focus {
    outline: none;
    border-color: ${theme.colors.ring};
    box-shadow: 0 0 0 3px color-mix(in srgb, ${theme.colors.ring} 25%, transparent);
  }
`;

/** Linha clicável da tabela de membros. */
export const LinhaClicavel = styled(TableRow)`
  cursor: pointer;
  transition: background ${theme.transitions.fast};

  &:hover {
    background: ${theme.alpha(theme.colors.foreground, 0.035)};
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.ring};
    outline-offset: -2px;
  }
`;

export const NomeComNucleo = styled.span`
  display: flex;
  flex-direction: column;
  line-height: 1.3;

  strong {
    font-size: ${theme.fontSize.sm};
    font-weight: ${theme.fontWeight.medium};
    color: ${theme.colors.foreground};
  }

  span {
    font-size: ${theme.fontSize.xs};
    color: ${theme.colors.mutedForeground};
  }
`;

/* ------------------------------------------------------------------ */
/* Grade de cards compactos ("Próximos ao limite")                      */
/* ------------------------------------------------------------------ */

export const MembrosGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: ${theme.spacing.sm};
`;

export const MembroCard = styled.button`
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  padding: ${theme.spacing.md};
  border-radius: ${theme.borderRadius.lg};
  border: 1px solid ${theme.colors.border};
  background: ${theme.colors.card};
  text-align: left;
  cursor: pointer;
  transition: border-color ${theme.transitions.fast};

  &:hover {
    border-color: ${theme.colors.primary};
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.ring};
    outline-offset: 2px;
  }
`;

export const MembroCardTopo = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${theme.spacing.sm};
`;

export const BlocoTitulo = styled.h3`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  margin: 0 0 ${theme.spacing.sm};
  font-size: ${theme.fontSize.sm};
  font-weight: ${theme.fontWeight.semibold};
  color: ${theme.colors.foreground};

  & + ${MembrosGrid} {
    margin-bottom: ${theme.spacing.lg};
  }
`;

/* ------------------------------------------------------------------ */
/* Gaveta do membro                                                     */
/* ------------------------------------------------------------------ */

export const GavetaOverlay = styled(ModalOverlay)`
  justify-content: flex-end;
  align-items: stretch;
  padding: 0;
`;

export const GavetaPainel = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 36rem;
  height: 100%;
  overflow-y: auto;
  border-left: 1px solid ${theme.colors.border};
  background: ${theme.colors.card};
  box-shadow: ${theme.shadows.lg};
`;

export const GavetaCorpo = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.lg};
  padding: ${theme.spacing.lg};
`;

export const GavetaSubtitulo = styled.p`
  margin: 0.25rem 0 0;
  font-size: ${theme.fontSize.xs};
  color: ${theme.colors.mutedForeground};
`;

/** A linha abaixo do título de um modal (quem, quando). */
export const ModalSubtitulo = styled.p`
  margin: 0.25rem 0 0;
  font-size: ${theme.fontSize.sm};
  color: ${theme.colors.mutedForeground};
`;

export const Acoes = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.sm};
`;

/* ------------------------------------------------------------------ */
/* Score-cards (gaveta e Meus Pontos)                                   */
/* ------------------------------------------------------------------ */

export const ScoreGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
  gap: ${theme.spacing.md};
`;

export const ScoreCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md};
  border-radius: ${theme.borderRadius.lg};
  border: 1px solid ${theme.colors.border};
  background: ${theme.colors.card};
  box-shadow: ${theme.shadows.sm};
`;

export const ScoreTopo = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${theme.spacing.sm};
  font-size: ${theme.fontSize.sm};
  font-weight: ${theme.fontWeight.semibold};
  color: ${theme.colors.foreground};
`;

export const ScoreValor = styled.strong<{ $grande?: boolean }>`
  font-size: ${({ $grande }) => ($grande ? theme.fontSize["4xl"] : theme.fontSize["2xl"])};
  font-weight: ${theme.fontWeight.bold};
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
  line-height: 1.1;
  color: ${theme.colors.foreground};

  small {
    margin-left: 0.15rem;
    font-size: ${theme.fontSize.base};
    font-weight: ${theme.fontWeight.medium};
    color: ${theme.colors.mutedForeground};
  }
`;

export const ScoreRodape = styled.div`
  display: flex;
  justify-content: space-between;
  gap: ${theme.spacing.sm};
  font-size: ${theme.fontSize.xs};
  color: ${theme.colors.mutedForeground};
`;

/* ------------------------------------------------------------------ */
/* Linha do tempo de registros                                          */
/* ------------------------------------------------------------------ */

export const Timeline = styled.ul`
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
`;

export const TimelineItem = styled.li<{ $esmaecido?: boolean }>`
  display: grid;
  grid-template-columns: 0.625rem minmax(0, 1fr);
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.sm} 0;
  border-bottom: 1px solid ${theme.colors.border};
  opacity: ${({ $esmaecido }) => ($esmaecido ? 0.6 : 1)};

  &:last-child {
    border-bottom: none;
  }
`;

export const TimelinePonto = styled.span<{ $cor: string }>`
  width: 0.625rem;
  height: 0.625rem;
  margin-top: 0.3rem;
  border-radius: ${theme.borderRadius.full};
  background: ${({ $cor }) => $cor};
`;

export const TimelineCorpo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
`;

export const TimelineTitulo = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${theme.spacing.sm};
  font-size: ${theme.fontSize.sm};
  color: ${theme.colors.foreground};

  strong {
    font-weight: ${theme.fontWeight.medium};
  }

  .riscado {
    text-decoration: line-through;
  }
`;

export const TimelineMeta = styled.p`
  margin: 0;
  font-size: ${theme.fontSize.xs};
  line-height: 1.4;
  color: ${theme.colors.mutedForeground};
  overflow-wrap: anywhere;
`;

export const TimelineAcoes = styled.span`
  display: inline-flex;
  gap: 0.25rem;
  margin-left: auto;
`;

export const Ajustes = styled.ul`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin: 0.25rem 0 0;
  padding: 0.375rem 0.625rem;
  border-left: 2px solid ${theme.colors.border};
  list-style: none;
  font-size: ${theme.fontSize.xs};
  color: ${theme.colors.mutedForeground};

  strong {
    color: ${theme.colors.foreground};
    font-weight: ${theme.fontWeight.medium};
  }
`;

/* ------------------------------------------------------------------ */
/* Revisão do registro (dl)                                             */
/* ------------------------------------------------------------------ */

export const Revisao = styled.dl`
  display: grid;
  grid-template-columns: max-content minmax(0, 1fr);
  gap: 0.375rem ${theme.spacing.md};
  margin: 0;
  font-size: ${theme.fontSize.sm};

  dt {
    color: ${theme.colors.mutedForeground};
  }

  dd {
    margin: 0;
    color: ${theme.colors.foreground};
    overflow-wrap: anywhere;
  }
`;

export const Nota = styled.p`
  display: flex;
  align-items: flex-start;
  gap: 0.375rem;
  margin: 0;
  padding: 0.5rem 0.625rem;
  border-radius: ${theme.borderRadius.md};
  background: ${theme.colors.muted};
  font-size: ${theme.fontSize.xs};
  line-height: 1.4;
  color: ${theme.colors.foreground};

  svg {
    flex-shrink: 0;
    margin-top: 0.1rem;
  }
`;

export const CamposGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${theme.spacing.md};

  @media (max-width: ${theme.breakpoints.sm}px) {
    grid-template-columns: 1fr;
  }
`;

export const CampoLargo = styled.div`
  grid-column: 1 / -1;
`;

export const Checkbox = styled.label`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  font-size: ${theme.fontSize.sm};
  color: ${theme.colors.foreground};
  cursor: pointer;

  input {
    accent-color: ${theme.colors.primary};
  }
`;

/* ------------------------------------------------------------------ */
/* Análises                                                             */
/* ------------------------------------------------------------------ */

export const GradeDois = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${theme.spacing.lg};

  @media (min-width: ${theme.breakpoints.lg}px) {
    grid-template-columns: 1fr 1fr;
  }
`;

export const CabecalhoControles = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${theme.spacing.sm};
`;

export const Descricao = styled.p`
  margin: 0 0 ${theme.spacing.md};
  font-size: ${theme.fontSize.xs};
  line-height: 1.5;
  color: ${theme.colors.mutedForeground};
`;

export const Insights = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
  gap: ${theme.spacing.sm};
  margin-bottom: ${theme.spacing.md};
`;

export const Insight = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  padding: 0.5rem 0.75rem;
  border-radius: ${theme.borderRadius.md};
  background: ${theme.colors.muted};

  span {
    font-size: ${theme.fontSize.xs};
    color: ${theme.colors.mutedForeground};
  }

  strong {
    font-size: ${theme.fontSize.sm};
    font-weight: ${theme.fontWeight.semibold};
    color: ${theme.colors.foreground};
  }
`;

export const CaixaGrafico = styled.div<{ $altura?: string }>`
  width: 100%;
  height: ${({ $altura }) => $altura ?? "18rem"};
`;

export const Variacao = styled.span<{ $sinal: number }>`
  font-variant-numeric: tabular-nums;
  font-weight: ${theme.fontWeight.medium};
  color: ${({ $sinal }) =>
    $sinal > 0 ? theme.colors.destructive : $sinal < 0 ? theme.colors.success : theme.colors.mutedForeground};
`;

/* ------------------------------------------------------------------ */
/* Histórico                                                            */
/* ------------------------------------------------------------------ */

export const GestoesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
  gap: ${theme.spacing.md};
`;

export const GestaoCard = styled.button<{ $atual?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  padding: ${theme.spacing.md};
  border-radius: ${theme.borderRadius.lg};
  border: 1px solid ${({ $atual }) => ($atual ? theme.colors.primary : theme.colors.border)};
  background: ${({ $atual }) =>
    $atual ? `color-mix(in srgb, ${theme.colors.primary} 6%, ${theme.colors.card})` : theme.colors.card};
  text-align: left;
  cursor: pointer;

  &:hover {
    border-color: ${theme.colors.primary};
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.ring};
    outline-offset: 2px;
  }
`;

export const GestaoCardTitulo = styled.span`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  font-size: ${theme.fontSize.sm};
  font-weight: ${theme.fontWeight.semibold};
  color: ${theme.colors.foreground};
`;

export const GestaoCardMeta = styled.span`
  font-size: ${theme.fontSize.xs};
  color: ${theme.colors.mutedForeground};
`;

export const DiaCabecalho = styled.h3`
  margin: ${theme.spacing.md} 0 ${theme.spacing.xs};
  font-size: ${theme.fontSize.xs};
  font-weight: ${theme.fontWeight.semibold};
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: ${theme.colors.mutedForeground};

  &:first-of-type {
    margin-top: 0;
  }
`;

export const RegistroLinha = styled.div<{ $esmaecido?: boolean }>`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: ${theme.spacing.md};
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid ${theme.colors.border};
  opacity: ${({ $esmaecido }) => ($esmaecido ? 0.6 : 1)};

  &:last-child {
    border-bottom: none;
  }

  @media (max-width: ${theme.breakpoints.sm}px) {
    grid-template-columns: 1fr;
  }
`;

export const RegistroTexto = styled.button`
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
  padding: 0;
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;
  color: ${theme.colors.foreground};

  strong {
    font-size: ${theme.fontSize.sm};
    font-weight: ${theme.fontWeight.medium};
  }

  span {
    font-size: ${theme.fontSize.xs};
    color: ${theme.colors.mutedForeground};
    overflow-wrap: anywhere;
  }

  .riscado {
    text-decoration: line-through;
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.ring};
    outline-offset: 2px;
    border-radius: ${theme.borderRadius.sm};
  }
`;

export const RegistroDireita = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: ${theme.spacing.sm};
  font-size: ${theme.fontSize.xs};
  color: ${theme.colors.mutedForeground};
`;

export const TabelaEsmaecida = styled.tr<{ $esmaecido?: boolean }>`
  border-bottom: 1px solid ${theme.colors.border};
  opacity: ${({ $esmaecido }) => ($esmaecido ? 0.55 : 1)};

  &:last-child {
    border-bottom: none;
  }
`;
