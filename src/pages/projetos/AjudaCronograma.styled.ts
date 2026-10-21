import styled from "styled-components";
import { theme } from "@/styles/theme";

export const PassoLista = styled.ol`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
`;

/** Cada passo com um fio à esquerda: lê-se como sequência, não como lista
 *  de tópicos soltos. */
export const PassoItem = styled.li`
  padding-left: ${theme.spacing.md};
  border-left: 2px solid ${theme.colors.border};
`;

export const PassoTitulo = styled.h4`
  margin: 0 0 0.25rem;
  font-size: ${theme.fontSize.sm};
  font-weight: ${theme.fontWeight.semibold};
  color: ${theme.colors.cardForeground};
`;

export const PassoTexto = styled.p`
  margin: 0;
  font-size: ${theme.fontSize.sm};
  line-height: 1.5;
  color: ${theme.colors.mutedForeground};
`;

/**
 * O título de uma SEÇÃO da ajuda — acima dos passos, não dentro deles.
 *
 * ⚠ A ajuda cresceu de 5 para ~14 blocos ao cobrir o que alguém que nunca
 * abriu a tela precisa saber. Uma lista corrida desse tamanho vira parede: a
 * pessoa procura "como marco a banca?" e lê tudo até achar. As seções deixam
 * pular direto para o trecho certo.
 */
export const SecaoTitulo = styled.h3`
  margin: ${theme.spacing.lg} 0 ${theme.spacing.sm};
  font-size: ${theme.fontSize.sm};
  font-weight: ${theme.fontWeight.medium};
  color: ${theme.colors.mutedForeground};
  text-transform: uppercase;
  letter-spacing: 0.04em;

  /* A primeira seção encosta no topo do corpo do modal. */
  &:first-child {
    margin-top: 0;
  }
`;

/**
 * A regra que o sistema COBRA — não é dica, é o que faz o clique ser recusado.
 *
 * Separado do texto comum porque a diferença importa: ignorar uma dica custa
 * estética, ignorar uma trava custa um 422 que a pessoa não entende.
 */
export const Regra = styled.p`
  margin: ${theme.spacing.xs} 0 0;
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border-left: 3px solid ${theme.colors.warning};
  border-radius: ${theme.borderRadius.sm};
  background: color-mix(in srgb, ${theme.colors.warning} 10%, var(--atlas-card));
  font-size: ${theme.fontSize.sm};
  color: ${theme.colors.foreground};
  line-height: 1.55;
`;

/** Uma cor da legenda, explicada por dentro do texto. */
export const Amostra = styled.span<{ $cor: string }>`
  display: inline-block;
  width: 0.7rem;
  height: 0.7rem;
  margin-right: 0.3rem;
  border-radius: 2px;
  background: ${({ $cor }) => $cor};
  vertical-align: -1px;
`;
