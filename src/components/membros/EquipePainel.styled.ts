import styled, { css } from "styled-components";
import { theme } from "@/styles/theme";

/* ------------------------------------------------------------------ */
/* O campo na página, dois blocos, um por papel                       */
/* ------------------------------------------------------------------ */

/**
 * Coordenador e consultores lado a lado.
 *
 * Empilhados eles se liam como dois campos independentes de um formulário
 * longo, e a pergunta que importa ("o time está de pé?") exigia rolar. Lado
 * a lado o time inteiro cabe num olhar, e some no celular, onde não cabe.
 */
export const EquipeGrade = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${theme.spacing.md};

  @media (min-width: ${theme.breakpoints.md}px) {
    grid-template-columns: 1fr 1fr;
    align-items: start;
  }
`;

export const PapelBloco = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.borderRadius.lg};
  background: ${theme.colors.background};
`;

export const PapelCabecalho = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: ${theme.spacing.sm};
`;

export const PapelNome = styled.h4`
  margin: 0;
  font-size: ${theme.fontSize.sm};
  font-weight: ${theme.fontWeight.semibold};
  color: ${theme.colors.foreground};
`;

/** "2 de 3" / "opcional". Conta, não decora, por isso texto e não pílula. */
export const PapelContagem = styled.span`
  font-size: ${theme.fontSize.xs};
  color: ${theme.colors.mutedForeground};
`;

export const PessoaLista = styled.ul`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xs};
  margin: 0;
  padding: 0;
  list-style: none;
`;

export const PessoaCard = styled.li`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: 0.5rem 0.625rem;
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.borderRadius.md};
  background: ${theme.colors.card};
  min-width: 0;
`;

/**
 * As iniciais no lugar de foto, não existe foto no cadastro, e um ícone de
 * pessoa genérico repetido em cinco linhas vira ruído. A inicial diferencia.
 */
export const PessoaIniciais = styled.span`
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: ${theme.borderRadius.full};
  background: color-mix(in srgb, ${theme.colors.primary} 12%, var(--atlas-card));
  color: ${theme.colors.primary};
  font-size: ${theme.fontSize.xs};
  font-weight: ${theme.fontWeight.semibold};
`;

export const PessoaTexto = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.05rem;
`;

export const PessoaNome = styled.span`
  font-size: ${theme.fontSize.sm};
  font-weight: ${theme.fontWeight.medium};
  color: ${theme.colors.cardForeground};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const PessoaMeta = styled.span`
  font-size: ${theme.fontSize.xs};
  color: ${theme.colors.mutedForeground};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

/** Alvo de 2.25rem: o mínimo de toque, sem inflar a linha da pessoa. */
export const PessoaRemover = styled.button`
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border: none;
  border-radius: ${theme.borderRadius.md};
  background: transparent;
  color: ${theme.colors.mutedForeground};
  cursor: pointer;
  transition: background ${theme.transitions.fast}, color ${theme.transitions.fast};

  &:hover:not(:disabled) {
    background: color-mix(in srgb, ${theme.colors.destructive} 10%, var(--atlas-card));
    color: ${theme.colors.destructive};
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.ring};
    outline-offset: -2px;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
`;

/**
 * O botão de abrir o painel.
 *
 * Tracejado e ocupando a largura toda quando o papel está vazio: é o lugar
 * onde a pessoa VAI entrar, e a borda tracejada é a convenção de "vaga". Com
 * gente escolhida ele encolhe para um botão comum, a vaga já não está lá.
 */
export const AbrirPainel = styled.button<{ $vazio?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  min-height: 2.25rem;
  padding: 0 0.75rem;
  border-radius: ${theme.borderRadius.md};
  font-size: ${theme.fontSize.sm};
  font-weight: ${theme.fontWeight.medium};
  cursor: pointer;
  transition: background ${theme.transitions.fast}, border-color ${theme.transitions.fast},
    color ${theme.transitions.fast};

  ${({ $vazio }) =>
    $vazio
      ? css`
          width: 100%;
          min-height: 3rem;
          border: 1px dashed ${theme.colors.input};
          background: transparent;
          color: ${theme.colors.mutedForeground};

          &:hover:not(:disabled) {
            border-color: ${theme.colors.primary};
            color: ${theme.colors.primary};
            background: color-mix(in srgb, ${theme.colors.primary} 5%, var(--atlas-card));
          }
        `
      : css`
          align-self: flex-start;
          border: 1px solid ${theme.colors.border};
          background: ${theme.colors.card};
          color: ${theme.colors.foreground};

          &:hover:not(:disabled) {
            background: ${theme.colors.muted};
          }
        `}

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px color-mix(in srgb, ${theme.colors.ring} 35%, transparent);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }
`;

/* ------------------------------------------------------------------ */
/* Dentro do painel                                                     */
/* ------------------------------------------------------------------ */

export const PainelBusca = styled.input`
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

/**
 * O botão de cada linha da lista.
 *
 * Quem já está no time mostra "Remover" em vez de sumir da lista: sumindo,
 * a única forma de tirar alguém seria fechar o painel, e o painel existe
 * justamente para montar o time de uma vez só.
 */
export const LinhaAcao = styled.button<{ $escolhido?: boolean }>`
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 1.75rem;
  padding: 0 0.625rem;
  border-radius: ${theme.borderRadius.lg};
  font-size: ${theme.fontSize.xs};
  font-weight: ${theme.fontWeight.medium};
  cursor: pointer;
  transition: background ${theme.transitions.fast}, color ${theme.transitions.fast},
    border-color ${theme.transitions.fast};

  ${({ $escolhido }) =>
    $escolhido
      ? css`
          border: 1px solid ${theme.colors.border};
          background: ${theme.colors.background};
          color: ${theme.colors.mutedForeground};

          &:hover:not(:disabled) {
            border-color: color-mix(in srgb, ${theme.colors.destructive} 35%, transparent);
            color: ${theme.colors.destructive};
          }
        `
      : css`
          border: 1px solid transparent;
          background: ${theme.colors.primary};
          color: ${theme.colors.primaryForeground};

          &:hover:not(:disabled) {
            background: color-mix(in srgb, ${theme.colors.primary} 88%, black);
          }
        `}

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px color-mix(in srgb, ${theme.colors.ring} 35%, transparent);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }
`;

/** "3 no time" no rodapé do painel, ao lado do botão de concluir. */
export const RodapeContagem = styled.span`
  font-size: ${theme.fontSize.sm};
  color: ${theme.colors.mutedForeground};
`;
