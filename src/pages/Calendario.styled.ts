import styled, { css } from "styled-components";
import { theme } from "@/styles/theme";

const bancaPink = `color-mix(in srgb, ${theme.colors.destructive} 7%, ${theme.colors.card})`;
const bancaPinkBorder = `color-mix(in srgb, ${theme.colors.destructive} 28%, ${theme.colors.card})`;
const bancaRed = theme.colors.destructive;

export const PageStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.lg};
`;

export const Breadcrumb = styled.nav`
  font-size: ${theme.fontSize.sm};
  color: ${theme.colors.mutedForeground};

  span {
    color: ${theme.colors.foreground};
  }
`;

export const PageTitle = styled.h1`
  margin: 0;
  font-size: 1.75rem;
  font-weight: ${theme.fontWeight.bold};
  color: ${theme.colors.foreground};
`;

export const PageDescription = styled.p`
  margin: 0;
  max-width: 42rem;
  font-size: ${theme.fontSize.sm};
  line-height: 1.5;
  color: ${theme.colors.mutedForeground};
`;

/* ---- Card do calendário ---- */

export const CalendarCard = styled.section`
  overflow: hidden;
  border-radius: ${theme.borderRadius.xl};
  border: 1px solid ${theme.colors.border};
  background: ${theme.colors.card};
  box-shadow: ${theme.shadows.sm};
`;

export const CalendarCardIntro = styled.div`
  padding: ${theme.spacing.lg} ${theme.spacing.lg} ${theme.spacing.md};
  border-bottom: 1px solid ${theme.colors.border};
`;

export const CalendarCardTitle = styled.h2`
  margin: 0 0 0.25rem;
  font-size: ${theme.fontSize.base};
  font-weight: ${theme.fontWeight.semibold};
  color: ${theme.colors.foreground};
`;

export const CalendarCardDesc = styled.p`
  margin: 0;
  font-size: ${theme.fontSize.sm};
  color: ${theme.colors.mutedForeground};
`;

export const CalendarToolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  border-bottom: 1px solid ${theme.colors.border};
`;

export const ToolbarMonth = styled.span`
  font-size: ${theme.fontSize.base};
  font-weight: ${theme.fontWeight.medium};
  color: ${theme.colors.foreground};
  min-width: 8rem;
`;

export const ToolbarGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 0.375rem;
`;

export const ViewToggle = styled.div`
  display: inline-flex;
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.borderRadius.lg};
  overflow: hidden;
  background: ${theme.colors.background};
`;

export const ViewButton = styled.button<{ $active?: boolean }>`
  padding: 0.375rem 0.875rem;
  border: none;
  font-size: ${theme.fontSize.sm};
  font-weight: ${({ $active }) => ($active ? theme.fontWeight.medium : theme.fontWeight.normal)};
  cursor: pointer;
  background: ${({ $active }) => ($active ? theme.colors.background : "transparent")};
  color: ${({ $active }) => ($active ? theme.colors.foreground : theme.colors.mutedForeground)};
  box-shadow: ${({ $active }) => ($active ? theme.shadows.sm : "none")};

  &:not(:last-child) {
    border-right: 1px solid ${theme.colors.border};
  }

  &:hover {
    color: ${theme.colors.foreground};
  }
`;

export const NavButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2rem;
  height: 2rem;
  padding: 0 0.625rem;
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.borderRadius.lg};
  background: ${theme.colors.background};
  font-size: ${theme.fontSize.sm};
  color: ${theme.colors.foreground};
  cursor: pointer;

  &:hover {
    background: ${theme.colors.muted};
  }
`;

export const TodayButton = styled(NavButton)`
  min-width: auto;
  padding: 0 0.75rem;
  font-weight: ${theme.fontWeight.medium};
`;

/* ---- Grade mensal ----
   As primitivas vivem em `components/calendario/CalendarGrid.styled.ts`
   desde a F6, para o cronograma pintado usar a MESMA grade. Este re-export
   mantém `Calendario.tsx` e `Bancas.styled.ts` intactos. */

export {
  MonthGrid,
  WeekdayRow,
  WeekdayCell,
  WeekRow,
  DayCell,
  DayNumber,
  DayEvents,
  WeekGrid,
} from "@/components/calendario/CalendarGrid.styled";

/* `EventPill` e `MoreEvents` ficam aqui: são a pílula DE BANCA (usam as
   constantes de cor locais), não primitiva de grade. */

export const EventPill = styled.button`
  width: 100%;
  padding: 0.2rem 0.375rem;
  border: 1px solid ${bancaPinkBorder};
  border-radius: ${theme.borderRadius.sm};
  background: ${bancaPink};
  font-size: 0.7rem;
  font-weight: ${theme.fontWeight.medium};
  color: ${bancaRed};
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
  line-height: 1.3;

  &:hover {
    background: color-mix(in srgb, ${bancaPink} 70%, ${bancaPinkBorder});
    border-color: ${theme.colors.primary};
  }
`;

export const MoreEvents = styled.button`
  padding: 0;
  border: none;
  background: none;
  font-size: 0.65rem;
  color: ${theme.colors.mutedForeground};
  text-align: left;
  cursor: pointer;

  &:hover {
    color: ${theme.colors.primary};
    text-decoration: underline;
  }
`;

/* ---- Vista semana / dia ---- */

export const DayViewPanel = styled.div`
  padding: ${theme.spacing.lg};
  min-height: 12rem;
`;

export const DayViewTitle = styled.h3`
  margin: 0 0 ${theme.spacing.md};
  font-size: ${theme.fontSize.lg};
  font-weight: ${theme.fontWeight.semibold};
`;

/* ---- Próximas bancas ---- */

export const UpcomingSection = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
`;

export const UpcomingTitle = styled.h2`
  margin: 0;
  font-size: ${theme.fontSize.lg};
  font-weight: ${theme.fontWeight.bold};
  color: ${theme.colors.foreground};
`;

export const UpcomingMonth = styled.p`
  margin: 0 0 ${theme.spacing.sm};
  font-size: ${theme.fontSize.sm};
  color: ${theme.colors.mutedForeground};
`;

export const UpcomingList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
`;

export const UpcomingEventCard = styled.button`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.25rem;
  width: 100%;
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  border: 1px solid ${bancaPinkBorder};
  border-radius: ${theme.borderRadius.lg};
  background: ${bancaPink};
  text-align: left;
  cursor: pointer;
  transition: border-color ${theme.transitions.fast}, box-shadow ${theme.transitions.fast};

  &:hover {
    border-color: ${theme.colors.primary};
    box-shadow: ${theme.shadows.sm};
  }
`;

export const UpcomingEventName = styled.span`
  font-size: ${theme.fontSize.base};
  font-weight: ${theme.fontWeight.semibold};
  color: ${bancaRed};
`;

export const UpcomingEventMeta = styled.span`
  font-size: ${theme.fontSize.sm};
  color: ${bancaRed};
  opacity: 0.85;
`;

export const EmptyUpcoming = styled.p`
  margin: 0;
  font-size: ${theme.fontSize.sm};
  color: ${theme.colors.mutedForeground};
`;

/* ---- Modal ----
   O chrome mudou-se para `styles/modal.styled.ts` e é re-exportado aqui, para
   os arquivos que já importavam daqui seguirem funcionando. Código NOVO importa
   do arquivo compartilhado. */

export {
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalClose,
  ModalBody,
  ModalFooter,
} from "@/styles/modal.styled";

export const ModalDetailList = styled.dl`
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  margin: 0;
`;

export const DetailRow = styled.div`
  display: flex;
  justify-content: space-between;
  gap: ${theme.spacing.md};
  font-size: ${theme.fontSize.sm};
`;

export const DetailTerm = styled.dt`
  margin: 0;
  color: ${theme.colors.mutedForeground};
  flex-shrink: 0;
`;

export const DetailValue = styled.dd`
  margin: 0;
  text-align: right;
  color: ${theme.colors.foreground};
`;

export const RetryButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 2rem;
  padding: 0 0.75rem;
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.borderRadius.lg};
  background: ${theme.colors.background};
  font-size: ${theme.fontSize.sm};
  cursor: pointer;

  &:hover {
    background: ${theme.colors.muted};
  }
`;

export const LoadingBlock = styled.div`
  height: 20rem;
  border-radius: ${theme.borderRadius.xl};
  background: ${theme.colors.muted};
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
  color: ${theme.colors.mutedForeground};
`;

export const StatusBadge = styled.span<{ $tone?: "success" | "warning" | "muted" }>`
  display: inline-flex;
  padding: 0.125rem 0.5rem;
  border-radius: ${theme.borderRadius.full};
  font-size: ${theme.fontSize.xs};
  font-weight: ${theme.fontWeight.medium};

  ${({ $tone = "success" }) =>
    $tone === "warning"
      ? css`
          background: color-mix(in srgb, ${theme.colors.primary} 12%, var(--atlas-card));
          color: ${theme.colors.primary};
        `
      : $tone === "muted"
        ? css`
            background: ${theme.colors.muted};
            color: ${theme.colors.mutedForeground};
          `
        : css`
            background: color-mix(in srgb, ${theme.colors.success} 14%, var(--atlas-card));
            color: ${theme.colors.success};
          `}
`;
