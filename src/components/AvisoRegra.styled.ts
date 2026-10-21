import styled from "styled-components";
import { theme } from "@/styles/theme";

export const AvisoBox = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border-radius: ${theme.borderRadius.md};
  border: 1px solid color-mix(in srgb, ${theme.colors.destructive} 35%, transparent);
  background: color-mix(in srgb, ${theme.colors.destructive} 8%, var(--atlas-card));
  color: ${theme.colors.destructive};

  svg {
    flex-shrink: 0;
    margin-top: 0.125rem;
  }
`;

/** Selecionável: quem não entende a recusa copia e manda para outra pessoa. */
export const AvisoTexto = styled.p`
  margin: 0;
  flex: 1;
  font-size: ${theme.fontSize.sm};
  line-height: 1.45;
  user-select: text;
`;

export const AvisoFechar = styled.button`
  flex-shrink: 0;
  display: inline-flex;
  padding: 0.125rem;
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
  border-radius: ${theme.borderRadius.sm};

  &:hover {
    background: color-mix(in srgb, ${theme.colors.destructive} 15%, transparent);
  }
`;
