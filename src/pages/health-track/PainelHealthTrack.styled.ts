import styled from "styled-components";
import { theme } from "@/styles/theme";

export const StatusLinha = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${theme.spacing.md};
`;

export const Meta = styled.p`
  margin: 0;
  font-size: ${theme.fontSize.sm};
  color: ${theme.colors.mutedForeground};
`;

/** "Pela regra atual seria X". Informativo, não alerta: a regra mudou, o
 *  projeto não piorou. Por isso tom neutro e não âmbar. */
export const NotaRegra = styled.p`
  margin: ${theme.spacing.md} 0 0;
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border-left: 3px solid ${theme.colors.border};
  background: ${theme.colors.muted};
  border-radius: 0 ${theme.borderRadius.md} ${theme.borderRadius.md} 0;
  font-size: ${theme.fontSize.sm};
  color: ${theme.colors.foreground};
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.375rem;
`;

export const Sucesso = styled.p`
  margin: ${theme.spacing.md} 0 0;
  font-size: ${theme.fontSize.sm};
  color: color-mix(in srgb, ${theme.colors.success} 55%, var(--atlas-tinta));
`;

/* ------------------------------------------------------------------ */
/* Lista de pilares                                                     */
/* ------------------------------------------------------------------ */

export const ListaPilares = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
`;

export const PilarItem = styled.li`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: ${theme.spacing.sm} ${theme.spacing.lg};
  padding: ${theme.spacing.md} 0;
  border-top: 1px solid ${theme.colors.border};

  &:first-child {
    border-top: 0;
    padding-top: 0;
  }

  @media (max-width: ${theme.breakpoints.md}px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

export const PilarNome = styled.p`
  margin: 0;
  font-size: ${theme.fontSize.sm};
  font-weight: ${theme.fontWeight.semibold};
  color: ${theme.colors.foreground};
`;

export const PilarDescricao = styled.p`
  margin: 0.125rem 0 0;
  font-size: ${theme.fontSize.xs};
  line-height: 1.5;
  color: ${theme.colors.mutedForeground};
  max-width: 65ch;
`;

export const Comentario = styled.p`
  grid-column: 1 / -1;
  margin: 0;
  font-size: ${theme.fontSize.sm};
  line-height: 1.5;
  color: ${theme.colors.foreground};
  white-space: pre-wrap;
`;

/* ------------------------------------------------------------------ */
/* Formulário                                                           */
/* ------------------------------------------------------------------ */

export const Legenda = styled.dl`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: ${theme.spacing.md};
  margin: 0 0 ${theme.spacing.lg};

  dd {
    margin: 0.25rem 0 0;
    font-size: ${theme.fontSize.xs};
    line-height: 1.5;
    color: ${theme.colors.mutedForeground};
  }

  @media (max-width: ${theme.breakpoints.md}px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

export const CampoPilar = styled.fieldset`
  margin: 0;
  padding: ${theme.spacing.md} 0;
  border: 0;
  border-top: 1px solid ${theme.colors.border};
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};

  legend {
    padding: 0;
    float: left;
    width: 100%;
  }
`;

export const Anterior = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  font-size: ${theme.fontSize.xs};
  color: ${theme.colors.mutedForeground};
`;

export const RotuloComentario = styled.label`
  font-size: ${theme.fontSize.xs};
  font-weight: ${theme.fontWeight.medium};
  color: ${theme.colors.mutedForeground};
`;

export const Rodape = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: ${theme.spacing.sm};
  padding-top: ${theme.spacing.md};
  border-top: 1px solid ${theme.colors.border};
`;

export const Faltando = styled.span`
  margin-right: auto;
  font-size: ${theme.fontSize.xs};
  color: ${theme.colors.mutedForeground};
`;

/* ------------------------------------------------------------------ */
/* Ciclos                                                               */
/* ------------------------------------------------------------------ */

export const ListaCiclos = styled.ol`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
`;

export const CicloItem = styled.li`
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.borderRadius.lg};
  padding: ${theme.spacing.md};

  details > summary {
    cursor: pointer;
    font-size: ${theme.fontSize.xs};
    color: ${theme.colors.mutedForeground};
    margin-top: ${theme.spacing.sm};
    width: fit-content;
  }

  details > summary:focus-visible {
    outline: 2px solid ${theme.colors.ring};
    outline-offset: 2px;
    border-radius: ${theme.borderRadius.sm};
  }
`;

/** "Ainda não avaliado nesta rodada": o status acima é da avaliação
 *  anterior, e a tela tem que dizer isso antes que alguém o leia como atual. */
export const PendenteNaRodada = styled.p`
  margin: ${theme.spacing.sm} 0 0;
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border-radius: ${theme.borderRadius.md};
  border: 1px solid ${theme.colors.destructive};
  background: color-mix(in srgb, ${theme.colors.destructive} 10%, var(--atlas-card));
  font-size: ${theme.fontSize.sm};
  color: color-mix(in srgb, ${theme.colors.destructive} 80%, var(--atlas-tinta));
`;

export const CicloCabecalho = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${theme.spacing.sm} ${theme.spacing.md};

  /* O status geral vem com rótulo na frente ("Status geral:") pra não ser
     confundido com a cor de um pilar; o botão de excluir vai pro canto. */
  .status-geral {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
  }

  /* Só o rótulo em caixa alta; o selo mantém a grafia da classificação. */
  .status-geral > .rotulo {
    font-size: ${theme.fontSize.xs};
    font-weight: ${theme.fontWeight.semibold};
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: ${theme.colors.mutedForeground};
  }

  .excluir {
    margin-left: auto;
  }
`;

/** Um cartão por pilar: o nome em cima, a cor embaixo. Cada par fica dentro
 *  da própria borda, então não há dúvida de qual cor é de qual pilar. */
export const CoresDoCiclo = styled.ul`
  list-style: none;
  margin: ${theme.spacing.sm} 0 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(9rem, 1fr));
  gap: ${theme.spacing.xs};

  li {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.3rem;
    padding: 0.4rem 0.6rem;
    border: 1px solid ${theme.colors.border};
    border-radius: ${theme.borderRadius.md};
    background: ${theme.colors.card};
    font-size: ${theme.fontSize.xs};
    color: ${theme.colors.mutedForeground};
    min-width: 0;
  }

  li > span:first-child {
    font-weight: ${theme.fontWeight.medium};
    color: ${theme.colors.foreground};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
  }
`;

export const ComentariosDoCiclo = styled.dl`
  margin: ${theme.spacing.sm} 0 0;

  dt {
    font-size: ${theme.fontSize.xs};
    font-weight: ${theme.fontWeight.semibold};
    margin-top: ${theme.spacing.sm};
  }

  dd {
    margin: 0.125rem 0 0;
    font-size: ${theme.fontSize.sm};
    line-height: 1.5;
    white-space: pre-wrap;
  }
`;
