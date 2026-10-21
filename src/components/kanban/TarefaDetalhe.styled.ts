import styled from "styled-components";
import { theme } from "@/styles/theme";

/** A linha de urgência no topo do detalhe, o mesmo glifo do card, agora com
 *  o texto por extenso ("vence em 2 dias"). */
export const SinalLinha = styled.p<{ $cor: string }>`
  display: flex;
  align-items: center;
  gap: 0.375rem;
  margin: 0 0 ${theme.spacing.md};
  padding: 0.375rem 0.625rem;
  border-radius: ${theme.borderRadius.md};
  border: 1px solid ${({ $cor }) => `color-mix(in srgb, ${$cor} 35%, transparent)`};
  background: ${({ $cor }) => `color-mix(in srgb, ${$cor} 10%, var(--atlas-card))`};
  font-size: ${theme.fontSize.sm};
  font-weight: ${theme.fontWeight.medium};
  color: ${({ $cor }) => theme.clarear($cor)};
`;

export const DetalheGrid = styled.dl`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${theme.spacing.sm} ${theme.spacing.lg};
  margin: 0;

  @media (min-width: ${theme.breakpoints.sm}px) {
    grid-template-columns: 1fr 1fr;
  }
`;

export const DetalheItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
`;

export const DetalheRotulo = styled.dt`
  font-size: ${theme.fontSize.xs};
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: ${theme.colors.mutedForeground};
`;

export const DetalheValor = styled.dd`
  margin: 0;
  font-size: ${theme.fontSize.sm};
  color: ${theme.colors.foreground};
`;

export const SecaoTitulo = styled.h3`
  margin: ${theme.spacing.lg} 0 ${theme.spacing.sm};
  padding-top: ${theme.spacing.md};
  border-top: 1px solid ${theme.colors.border};
  font-size: ${theme.fontSize.sm};
  font-weight: ${theme.fontWeight.semibold};
  color: ${theme.colors.foreground};
`;

export const ListaComentarios = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
  max-height: 14rem;
  overflow-y: auto;
  margin-bottom: ${theme.spacing.sm};
`;

export const Comentario = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  padding: ${theme.spacing.sm};
  border-radius: ${theme.borderRadius.md};
  background: ${theme.colors.secondary};
`;

export const Autor = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: ${theme.fontSize.xs};

  strong {
    font-weight: ${theme.fontWeight.medium};
    color: ${theme.colors.foreground};
  }

  small {
    color: ${theme.colors.mutedForeground};
  }

  button {
    display: inline-flex;
    align-items: center;
    margin-left: auto;
    padding: 0.1rem;
    border: none;
    border-radius: ${theme.borderRadius.sm};
    background: transparent;
    color: ${theme.colors.mutedForeground};
    cursor: pointer;

    &:hover {
      color: ${theme.colors.destructive};
    }
  }
`;

export const ComentarioTexto = styled.p`
  margin: 0;
  font-size: ${theme.fontSize.sm};
  line-height: 1.45;
  color: ${theme.colors.foreground};
  white-space: pre-wrap;
`;

export const ComposerLinha = styled.div`
  display: flex;
  align-items: flex-end;
  gap: ${theme.spacing.sm};

  textarea {
    flex: 1;
    min-height: 2.5rem;
  }
`;
