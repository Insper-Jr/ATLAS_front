import styled from "styled-components";
import { theme } from "@/styles/theme";

export const NotaSecao = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
`;

export const NotaTitulo = styled.h3`
  margin: 0;
  font-size: ${theme.fontSize.sm};
  font-weight: ${theme.fontWeight.normal};
  color: ${theme.colors.foreground};
`;

export const NotaLista = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.lg};
`;

export const NotaItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
`;

export const NotaLabel = styled.span`
  font-size: ${theme.fontSize.sm};
  font-weight: ${theme.fontWeight.medium};
  color: ${theme.colors.foreground};
  line-height: 1.4;
`;

export const NotaBotoesRow = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
`;

export const NotaBotao = styled.button<{ $selecionado: boolean; $largo?: boolean }>`
  width: ${({ $largo }) => ($largo ? "3.25rem" : "2.5rem")};
  height: 2.5rem;
  margin-left: ${({ $largo }) => ($largo ? theme.spacing.sm : 0)};
  border-radius: ${theme.borderRadius.md};
  border: 1px solid ${({ $selecionado }) => ($selecionado ? theme.colors.primary : theme.colors.border)};
  background: ${({ $selecionado }) => ($selecionado ? theme.colors.primary : theme.colors.background)};
  color: ${({ $selecionado }) => ($selecionado ? theme.colors.primaryForeground : theme.colors.foreground)};
  font-size: ${theme.fontSize.sm};
  font-weight: ${theme.fontWeight.medium};
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;

  &:hover:not(:disabled) {
    border-color: ${theme.colors.primary};
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.65;
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.ring};
    outline-offset: 2px;
  }
`;

