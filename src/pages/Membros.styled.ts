import styled from "styled-components";
import { theme } from "@/styles/theme";
import { FieldInput as BaseFieldInput } from "./Bancas.styled";

export {
  PageHeaderRow,
  PageHeaderText,
  PageHeading,
  PageSubheading,
  DataTable,
  TableHead,
  TableHeadCell,
  TableBody,
  TableRow,
  NameCell,
  TableCell,
  ActionsCell,
  DetailList,
  DetailRow,
  DetailTerm,
  DetailValue,
  FormStack,
  FieldGroup,
  FieldLabel,
  FieldInput,
  FieldSelect,
  CheckboxGrid,
  CheckboxLabel,
  FormErrorText,
  ModalOverlay,
  ModalHeader,
  ModalTitle,
  ModalClose,
  ModalBody,
  ModalFooter,
  WideModalContent,
} from "./Bancas.styled";

export const StatusBadge = styled.span<{ $ativo?: boolean }>`
  display: inline-flex;
  padding: 0.125rem 0.5rem;
  border-radius: ${theme.borderRadius.full};
  font-size: ${theme.fontSize.xs};
  font-weight: ${theme.fontWeight.medium};
  background: ${({ $ativo }) =>
    $ativo ? "color-mix(in srgb, #1baf7a 14%, var(--atlas-card))" : theme.colors.muted};
  color: ${({ $ativo }) => ($ativo ? "#1baf7a" : theme.colors.mutedForeground)};
`;

export const ModalActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${theme.spacing.sm};
  padding-top: ${theme.spacing.sm};
`;

export const EditSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
  padding-top: ${theme.spacing.md};
  border-top: 1px solid ${theme.colors.border};
`;

export const EditSectionTitle = styled.h3`
  margin: 0;
  font-size: ${theme.fontSize.sm};
  font-weight: ${theme.fontWeight.semibold};
  color: ${theme.colors.foreground};
`;

export const ToggleRow = styled.label`
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

export const FiltersRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.sm};
  margin-bottom: ${theme.spacing.md};
`;

export const SearchField = styled(BaseFieldInput)`
  flex: 1;
  min-width: 12rem;
  height: 2rem;
`;

export const HeaderActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.sm};
`;

/** Envolve o "Ver grade" para pendurar o `PinoGrade` no canto: quem ainda
 *  não enviou a grade do semestre. `inline-flex` para não esticar a célula. */
export const BotaoComPino = styled.span`
  position: relative;
  display: inline-flex;
`;

/** O pino de alerta mordendo o canto superior direito do botão. `border` na
 *  cor do card recorta o pino contra a borda do botão. */
export const PinoGrade = styled.span`
  position: absolute;
  top: -0.3rem;
  right: -0.3rem;
  width: 0.6rem;
  height: 0.6rem;
  border-radius: ${theme.borderRadius.full};
  background: ${theme.colors.warning};
  border: 2px solid ${theme.colors.card};
`;

/* ------------------------------------------------------------------ */
/* Senha de primeiro acesso                                      */
/* ------------------------------------------------------------------ */

export const SenhaProvisoriaCaixa = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.md};
  border: 1px dashed ${theme.colors.border};
  border-radius: ${theme.borderRadius.lg};
  background: ${theme.colors.muted};
`;

/** Monoespaçada e espaçada: esta senha vai ser LIDA e digitada à mão, em
 *  fonte proporcional, `O` e `0` (que o gerador já evita) e `rn`/`m` viram
 *  fonte de erro na hora de repassar. */
export const SenhaProvisoriaValor = styled.code`
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: ${theme.fontSize.lg};
  font-weight: ${theme.fontWeight.medium};
  letter-spacing: 0.08em;
  color: ${theme.colors.foreground};
  user-select: all;
`;
