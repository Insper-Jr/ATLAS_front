import styled from "styled-components";
import { theme } from "@/styles/theme";
import { FieldInput } from "@/pages/Bancas.styled";

export const EscopoLista = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
`;

export const EscopoLinha = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${theme.spacing.sm};
  align-items: center;

  /* ⭐ 6 colunas, não 5 (2026-09-05, corrigido a pedido): mover | nome |
     frente | calendário | dias | remover. O calendário entrou na linha
     depois que esta grade já tinha 5 trilhas fixas para 5 campos — sem
     trilha própria, ele caía na sobra de "dias" (6rem, curto demais pra um
     rótulo de calendário) e empurrava "dias" para a sobra de "remover"
     (2rem, ilegível pra um número). Nome e frente ficavam gigantes porque
     eram as únicas trilhas em fr, e o grid dava a elas todo o espaço livre
     que sobrava das outras trilhas fixas demais. */
  @media (min-width: ${theme.breakpoints.md}px) {
    grid-template-columns:
      1.75rem minmax(0, 1.5fr) minmax(0, 0.85fr) minmax(0, 1.15fr) 4.75rem 2rem;
  }
`;

/** As duas setinhas empilhadas, reordena a lista antes de criar o projeto,
 *  não depois: mudar a ordem de escopo já salvo é outra tela, outro botão. */
export const MoverBotoes = styled.div`
  display: flex;
  flex-direction: row;
  gap: 0.125rem;

  @media (min-width: ${theme.breakpoints.md}px) {
    flex-direction: column;
  }
`;

export const MoverBotao = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 1.1rem;
  width: 1.75rem;
  border: none;
  border-radius: ${theme.borderRadius.sm};
  background: transparent;
  color: ${theme.colors.mutedForeground};
  cursor: pointer;

  &:hover:not(:disabled) {
    background: ${theme.colors.muted};
    color: ${theme.colors.foreground};
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.3;
  }
`;

export const DiasInput = styled(FieldInput)`
  text-align: right;
`;

export const RemoverBotao = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 2.25rem;
  width: 2rem;
  border: none;
  border-radius: ${theme.borderRadius.lg};
  background: transparent;
  color: ${theme.colors.mutedForeground};
  cursor: pointer;

  &:hover:not(:disabled) {
    background: ${theme.colors.muted};
    color: ${theme.colors.destructive};
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
`;

/**
 * O catálogo, agrupado por frente.
 *
 * Era um `<select>` só, com "Escopo · Frente" em cada linha, quarenta opções
 * numa lista sem hierarquia, e a relação entre a frente marcada lá em cima e
 * o que aparecia aqui não se via. Em grupos, o vínculo é a própria estrutura:
 * marcar Business faz nascer o bloco Business, desmarcar faz sumir.
 */
export const PickerCatalogo = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
  padding-top: ${theme.spacing.md};
  border-top: 1px dashed ${theme.colors.border};
`;

export const CatalogoGrupo = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xs};
`;

export const CatalogoGrupoTitulo = styled.h5`
  margin: 0;
  font-size: ${theme.fontSize.xs};
  font-weight: ${theme.fontWeight.semibold};
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: ${theme.colors.mutedForeground};
`;

export const CatalogoChips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.xs};
`;

/** Um escopo do catálogo, pronto para entrar. Clicar adiciona, sem passo
 *  intermediário de "escolher e confirmar", que era o que o select exigia. */
export const EscopoChip = styled.button<{ $outro?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  min-height: 2rem;
  padding: 0 0.625rem;
  border-radius: ${theme.borderRadius.full};
  border: 1px ${({ $outro }) => ($outro ? "dashed" : "solid")} ${theme.colors.border};
  background: ${({ $outro }) => ($outro ? "transparent" : theme.colors.background)};
  font-size: ${theme.fontSize.xs};
  font-weight: ${theme.fontWeight.medium};
  color: ${({ $outro }) => ($outro ? theme.colors.mutedForeground : theme.colors.foreground)};
  cursor: pointer;
  transition: background ${theme.transitions.fast}, border-color ${theme.transitions.fast},
    color ${theme.transitions.fast};

  &:hover:not(:disabled) {
    border-color: ${theme.colors.primary};
    color: ${theme.colors.primary};
    background: color-mix(in srgb, ${theme.colors.primary} 6%, var(--atlas-card));
  }

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px color-mix(in srgb, ${theme.colors.ring} 35%, transparent);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
`;
