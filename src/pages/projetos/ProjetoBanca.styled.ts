import styled from "styled-components";
import { theme } from "@/styles/theme";

export const Colunas = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
  gap: ${theme.spacing.md};
`;

export const Campo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
`;

export const CampoRotulo = styled.span`
  font-size: ${theme.fontSize.xs};
  color: ${theme.colors.mutedForeground};
`;

export const CampoValor = styled.span`
  font-size: ${theme.fontSize.sm};
  color: ${theme.colors.foreground};
`;

export const ListaNomes = styled.ul`
  margin: 0;
  padding-left: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  font-size: ${theme.fontSize.sm};
  color: ${theme.colors.foreground};
`;

/* Os styled `Grupo*` da lista de avaliadores agrupados moraram aqui até
   virarem `components/bancas/AvaliadoresAgrupados.styled` — o mesmo bloco
   passou a ser usado no "ver mais" da página /bancas. */

/**
 * A linha de uma TENTATIVA. A borda esquerda carrega o veredito — é o canal
 * que sobrevive a uma lista de três ou quatro sessões empilhadas.
 */
export const Tentativa = styled.li<{ $tom: "aprovada" | "reprovada" | "pendente" }>`
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border: 1px solid ${theme.colors.border};
  border-left: 3px solid
    ${({ $tom }) =>
      $tom === "aprovada"
        ? theme.colors.success
        : $tom === "reprovada"
          ? theme.colors.destructive
          : theme.colors.mutedForeground};
  border-radius: ${theme.borderRadius.md};
  background: ${theme.colors.background};
`;

export const TentativaTopo = styled.div`
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: ${theme.spacing.sm};
`;

export const TentativaNome = styled.strong`
  font-size: ${theme.fontSize.sm};
  color: ${theme.colors.foreground};
`;

export const TentativaMeta = styled.span`
  font-size: ${theme.fontSize.xs};
  color: ${theme.colors.mutedForeground};
`;

export const Lista = styled.ul`
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
`;

/** O voto de uma pessoa, com o comentário embaixo quando existe. */
export const Voto = styled.li<{ $aprova: boolean | null }>`
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border: 1px solid ${theme.colors.border};
  border-left: 3px solid
    ${({ $aprova }) =>
      $aprova === true
        ? theme.colors.success
        : $aprova === false
          ? theme.colors.destructive
          : theme.colors.border};
  border-radius: ${theme.borderRadius.md};
  background: ${theme.colors.background};
`;

export const VotoTopo = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: ${theme.spacing.sm};
`;

export const VotoAutor = styled.strong`
  font-size: ${theme.fontSize.sm};
  color: ${theme.colors.foreground};
`;

export const VotoRotulo = styled.span<{ $aprova: boolean | null }>`
  font-size: ${theme.fontSize.xs};
  font-weight: ${theme.fontWeight.medium};
  color: ${({ $aprova }) =>
    $aprova === true
      ? theme.colors.success
      : $aprova === false
        ? theme.colors.destructive
        : theme.colors.mutedForeground};
`;

/** O comentário escrito pelo avaliador — citação, não parágrafo solto. */
export const Comentario = styled.blockquote`
  margin: 0.15rem 0 0;
  padding-left: ${theme.spacing.sm};
  border-left: 2px solid ${theme.colors.border};
  font-size: ${theme.fontSize.sm};
  color: ${theme.colors.foreground};
  line-height: 1.5;
  white-space: pre-wrap;
`;

export const SecaoTitulo = styled.h3`
  margin: ${theme.spacing.md} 0 ${theme.spacing.sm};
  font-size: ${theme.fontSize.sm};
  font-weight: ${theme.fontWeight.medium};
  color: ${theme.colors.foreground};
`;

export const Ajuda = styled.p`
  margin: 0 0 ${theme.spacing.sm};
  font-size: ${theme.fontSize.xs};
  color: ${theme.colors.mutedForeground};
  line-height: 1.5;
`;

/**
 * ⚠ O aviso de que a banca reprovou. Chama a atenção de propósito: ele é a
 * única coisa na tela que diz o PRÓXIMO PASSO, e sem ele o coordenador fica
 * sabendo que reprovou sem saber que precisa marcar outra.
 */
export const AvisoReprovada = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${theme.spacing.sm};
  margin: ${theme.spacing.sm} 0;
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border: 1px solid ${theme.colors.destructive};
  border-left: 4px solid ${theme.colors.destructive};
  border-radius: ${theme.borderRadius.md};
  background: color-mix(in srgb, ${theme.colors.destructive} 8%, var(--atlas-card));
  font-size: ${theme.fontSize.sm};
  color: ${theme.colors.foreground};
  line-height: 1.5;
`;

/** O bloco "seu voto" — destacado por ser uma AÇÃO no meio de uma leitura. */
export const MeuVoto = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
  margin: ${theme.spacing.md} 0;
  padding: ${theme.spacing.md};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.borderRadius.md};
  background: ${theme.colors.muted};
`;

export const AcoesLinha = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.sm};
  align-items: center;
`;

/** A lista de presença do modal de realização. */
export const Presenca = styled.label`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: 0.3rem 0;
  font-size: ${theme.fontSize.sm};
  color: ${theme.colors.foreground};
  cursor: pointer;
`;

/** O nome do avaliador vira botão: clicar abre as notas e o comentário. */
export const VotoBotao = styled.button`
  display: contents;
  border: none;
  background: none;
  padding: 0;
  font: inherit;
  color: inherit;
  cursor: pointer;
  text-align: left;

  &:focus-visible {
    outline: 2px solid ${theme.colors.ring};
    outline-offset: 2px;
  }
`;

/** As notas por critério de UMA avaliação, abertas sob o nome. */
export const Criterios = styled.dl`
  margin: ${theme.spacing.sm} 0 0;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.2rem ${theme.spacing.md};
  font-size: ${theme.fontSize.sm};
`;

export const CriterioTexto = styled.dt`
  color: ${theme.colors.mutedForeground};
  line-height: 1.4;
`;

export const CriterioNota = styled.dd`
  margin: 0;
  font-weight: ${theme.fontWeight.medium};
  color: ${theme.colors.foreground};
  text-align: right;
`;

/** Resposta dissertativa: ocupa as duas colunas, porque é texto corrido. */
export const CriterioResposta = styled.dd`
  grid-column: 1 / -1;
  margin: 0 0 ${theme.spacing.xs};
  padding-left: ${theme.spacing.sm};
  border-left: 2px solid ${theme.colors.border};
  color: ${theme.colors.foreground};
  line-height: 1.5;
  white-space: pre-wrap;
`;
