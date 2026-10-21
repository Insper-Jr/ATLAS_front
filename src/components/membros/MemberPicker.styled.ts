import styled from "styled-components";
import { theme } from "@/styles/theme";

export const PickerStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
`;

export const ChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${theme.spacing.sm};
  min-height: 2.25rem;
`;

export const Chip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.5rem 0.25rem 0.625rem;
  border-radius: ${theme.borderRadius.full};
  border: 1px solid ${theme.colors.border};
  background: ${theme.colors.secondary};
  font-size: ${theme.fontSize.sm};
  color: ${theme.colors.foreground};
`;

export const ChipRemove = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  background: transparent;
  color: ${theme.colors.mutedForeground};
  cursor: pointer;
  line-height: 0;

  &:hover:not(:disabled) {
    color: ${theme.colors.destructive};
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
`;

export const FiltroFrentesRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.sm} ${theme.spacing.md};
`;

export const AddRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.sm};
`;

/* ------------------------------------------------------------------ */
/* Dropdown customizado, nem select nativo, nem checkboxes soltas: o    */
/* filtro de frente mora dentro do próprio painel, junto da lista.       */
/* ------------------------------------------------------------------ */

export const DropdownWrap = styled.div`
  position: relative;
  flex: 1;
  min-width: 12rem;
`;

export const DropdownTrigger = styled.button<{ $vazio?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${theme.spacing.sm};
  width: 100%;
  padding: 0.5rem 0.75rem;
  border-radius: ${theme.borderRadius.md};
  border: 1px solid ${theme.colors.input};
  background: ${theme.colors.background};
  color: ${({ $vazio }) => ($vazio ? theme.colors.mutedForeground : theme.colors.foreground)};
  font-size: ${theme.fontSize.sm};
  text-align: left;
  cursor: pointer;
  transition: border-color ${theme.transitions.fast};

  &:hover:not(:disabled) {
    border-color: ${theme.colors.primary};
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  svg {
    flex-shrink: 0;
    color: ${theme.colors.mutedForeground};
  }
`;

// \`position: fixed\` + coordenadas por \`style\` inline (calculadas em JS) —
// não \`absolute\`. Este painel é renderizado num portal em \`document.body\`
// porque vive dentro de modais: sem isso, a borda do modal (que tem
// \`overflow\` limitado) cortava a lista pela metade.
export const DropdownPanel = styled.div`
  position: fixed;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.sm};
  border-radius: ${theme.borderRadius.lg};
  border: 1px solid ${theme.colors.border};
  background: ${theme.colors.popover};
  box-shadow: ${theme.shadows.lg};
  overflow-y: auto;
`;

export const DropdownBusca = styled.input`
  width: 100%;
  padding: 0.375rem 0.625rem;
  border-radius: ${theme.borderRadius.md};
  border: 1px solid ${theme.colors.border};
  background: ${theme.colors.background};
  color: ${theme.colors.foreground};
  font-size: ${theme.fontSize.sm};

  &:focus {
    outline: none;
    border-color: ${theme.colors.ring};
  }
`;

export const DropdownFiltroFrentes = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  padding-bottom: ${theme.spacing.sm};
  border-bottom: 1px solid ${theme.colors.border};
`;

export const FrentePill = styled.button<{ $ativo: boolean }>`
  padding: 0.25rem 0.625rem;
  border-radius: ${theme.borderRadius.full};
  border: 1px solid ${({ $ativo }) => ($ativo ? theme.colors.primary : theme.colors.border)};
  background: ${({ $ativo }) =>
    $ativo ? "color-mix(in srgb, " + theme.colors.primary + " 12%, var(--atlas-card))" : theme.colors.background};
  color: ${({ $ativo }) => ($ativo ? theme.colors.primary : theme.colors.mutedForeground)};
  font-size: ${theme.fontSize.xs};
  font-weight: ${theme.fontWeight.medium};
  cursor: pointer;
  transition: border-color ${theme.transitions.fast}, background ${theme.transitions.fast};

  &:hover {
    border-color: ${theme.colors.primary};
  }
`;

export const DropdownLista = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  overflow-y: auto;
`;

export const DropdownItem = styled.button`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.125rem;
  padding: 0.5rem 0.625rem;
  border: none;
  border-radius: ${theme.borderRadius.md};
  background: transparent;
  color: ${theme.colors.foreground};
  font-size: ${theme.fontSize.sm};
  text-align: left;
  cursor: pointer;

  &:hover {
    background: ${theme.colors.secondary};
  }
`;

export const DropdownItemMeta = styled.span`
  font-size: ${theme.fontSize.xs};
  color: ${theme.colors.mutedForeground};
`;

export const DropdownLimpar = styled(DropdownItem)`
  color: ${theme.colors.destructive};
  border-bottom: 1px solid ${theme.colors.border};
  border-radius: 0;
  padding-bottom: 0.625rem;
  margin-bottom: 0.125rem;
`;

export const DropdownVazio = styled.p`
  margin: 0;
  padding: ${theme.spacing.sm} 0.625rem;
  font-size: ${theme.fontSize.sm};
  color: ${theme.colors.mutedForeground};
`;

/** A contagem de consultores selecionados, vira vermelha em caso de erro. */
export const CountHint = styled.p<{ $ok: boolean }>`
  margin: 0;
  font-size: ${theme.fontSize.xs};
  color: ${({ $ok }) => ($ok ? theme.colors.mutedForeground : theme.colors.destructive)};
`;
