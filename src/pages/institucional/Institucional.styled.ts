import styled, { css } from "styled-components";
import { theme } from "@/styles/theme";

export const Intro = styled.p`
  margin: 0;
  font-size: ${theme.fontSize.sm};
  line-height: 1.55;
  color: ${theme.colors.mutedForeground};

  strong {
    color: ${theme.colors.foreground};
    font-weight: ${theme.fontWeight.medium};
  }
`;

export const Grade = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: ${theme.spacing.md};
`;

export const Cartao = styled.li<{ $oculto?: boolean; $arrastando?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.borderRadius.lg};
  background: ${theme.colors.card};
  opacity: ${({ $oculto }) => ($oculto ? 0.55 : 1)};
  ${({ $arrastando }) =>
    $arrastando &&
    css`
      box-shadow: ${theme.shadows.lg};
      position: relative;
      z-index: ${theme.zIndex.base};
    `}
`;

/** Linha de cima do card: alça + número à esquerda, situação à direita. */
export const CartaoTopo = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${theme.spacing.sm};
`;

export const AlcaEPosicao = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.125rem;
`;

/** A alça de arrastar — é só ela que inicia o drag, pra o clique em "Editar" não arrastar. */
export const Alca = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.75rem;
  border: none;
  border-radius: ${theme.borderRadius.md};
  background: transparent;
  color: ${theme.colors.mutedForeground};
  cursor: grab;
  touch-action: none;

  &:hover {
    background: ${theme.colors.muted};
    color: ${theme.colors.foreground};
  }
  &:active {
    cursor: grabbing;
  }
`;

export const Posicao = styled.span`
  min-width: 1.25rem;
  font-size: ${theme.fontSize.xs};
  font-weight: ${theme.fontWeight.semibold};
  color: ${theme.colors.mutedForeground};
`;

export const Circulo = styled.span<{ $tamanho: number }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: ${({ $tamanho }) => $tamanho}px;
  height: ${({ $tamanho }) => $tamanho}px;
  border-radius: ${theme.borderRadius.full};
  background: color-mix(in srgb, ${theme.colors.primary} 12%, var(--atlas-card));
  color: ${theme.colors.primary};
  font-size: ${({ $tamanho }) => Math.round($tamanho * 0.34)}px;
  font-weight: ${theme.fontWeight.semibold};
  overflow: hidden;
`;

/** Foto + nome + cargo, lado a lado. */
export const Pessoa = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  min-width: 0;
`;

export const Info = styled.div`
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
`;

export const Nome = styled.span`
  font-size: ${theme.fontSize.sm};
  font-weight: ${theme.fontWeight.medium};
  color: ${theme.colors.foreground};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const Sub = styled.span`
  font-size: ${theme.fontSize.xs};
  color: ${theme.colors.mutedForeground};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const Etiquetas = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  min-height: 1.25rem;
`;

export const Acoes = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  margin-top: auto;
  padding-top: ${theme.spacing.sm};
  border-top: 1px solid ${theme.colors.border};

  > :last-child {
    margin-left: auto;
  }
`;

/* ─── Modal de cadastro ─────────────────────────────────────────────────── */

export const FormDuasColunas = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${theme.spacing.md};

  @media (max-width: ${theme.breakpoints.md}px) {
    grid-template-columns: 1fr;
  }
`;

export const CabecalhoIdiomas = styled(FormDuasColunas)`
  gap: ${theme.spacing.md};
  padding-bottom: ${theme.spacing.xs};
  border-bottom: 1px solid ${theme.colors.border};
`;

export const Idioma = styled.span`
  font-size: ${theme.fontSize.xs};
  font-weight: ${theme.fontWeight.semibold};
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${theme.colors.mutedForeground};

  small {
    margin-left: 0.375rem;
    font-weight: ${theme.fontWeight.normal};
    letter-spacing: 0;
    text-transform: none;
  }
`;

export const FotoBloco = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.md};
  border: 1px dashed ${theme.colors.border};
  border-radius: ${theme.borderRadius.lg};
`;

export const FotoAcoes = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.sm};
`;

export const Dica = styled.p`
  margin: ${theme.spacing.xs} 0 0;
  font-size: ${theme.fontSize.xs};
  color: ${theme.colors.mutedForeground};
`;

export const CheckLinha = styled.label`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  font-size: ${theme.fontSize.sm};
  color: ${theme.colors.foreground};
  cursor: pointer;

  input {
    width: 1rem;
    height: 1rem;
    accent-color: ${theme.colors.primary};
  }
`;

export const Pilha = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
`;
