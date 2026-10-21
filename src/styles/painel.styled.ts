/**
 * O painel lateral de escolher gente, o chrome e a lista de pessoas.
 *
 * Saiu de `pages/Vagas.styled.ts`, que passou a re-exportá-lo, pelo mesmo
 * motivo que `modal.styled.ts` saiu de `Calendario.styled`: a tela de criar
 * projeto precisava do MESMO painel, e importar `Vagas.styled` inteiro por
 * causa de vinte regras arrastaria junto a página de vagas inteira.
 *
 * Quem monta equipe usa as duas telas no mesmo dia. Se o painel de Vagas
 * ordena por carga e agrupa por frente e o de criar projeto for um `<select>`
 * alfabético, são duas réguas diferentes para a mesma decisão, e a segunda
 * some justamente a informação que faz escolher (quem está livre).
 */

import styled from "styled-components";
import { theme } from "@/styles/theme";

/**
 * Painel lateral, e não modal centralizado: o que está atrás continua
 * visível enquanto se escolhe, em Vagas é a grade de projetos, em criar
 * projeto são as frentes marcadas, que decidem quem faz sentido no time.
 */
export const PainelOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 40;
  background: ${theme.colors.veu};
`;

export const PainelLateral = styled.aside`
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 50;
  width: min(28rem, 100vw);
  display: flex;
  flex-direction: column;
  background: ${theme.colors.card};
  border-left: 1px solid ${theme.colors.border};
  box-shadow: ${theme.shadows.lg};
  animation: entrar ${theme.transitions.normal};

  @keyframes entrar {
    from {
      transform: translateX(100%);
    }
    to {
      transform: translateX(0);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

/**
 * O título do painel e a linha de apoio, um sobre o outro.
 *
 * Os dois são spans inline, soltos no cabeçalho eles encostavam um no outro
 * e o texto saía "Fluxo Orion2 de 3 consultores". Empilhar resolve sem
 * depender de `<br>` nem de espaço fabricado.
 */
export const PainelTitulo = styled.div`
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
`;

export const PainelCabecalho = styled.header`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md};
  border-bottom: 1px solid ${theme.colors.border};
`;

export const PainelFechar = styled.button`
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  border: none;
  border-radius: ${theme.borderRadius.md};
  background: transparent;
  color: ${theme.colors.mutedForeground};
  cursor: pointer;
  transition: background ${theme.transitions.fast}, color ${theme.transitions.fast};

  &:hover {
    background: ${theme.colors.muted};
    color: ${theme.colors.foreground};
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.ring};
    outline-offset: 2px;
  }
`;

/** Os filtros ficam fora da área rolável: sumir do campo de visão bem quando a
 *  lista fica longa é justamente quando ele é mais necessário. */
export const PainelFiltros = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md};
  border-bottom: 1px solid ${theme.colors.border};
`;

export const PainelCorpo = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: ${theme.spacing.md};
`;

/** Rodapé fixo do painel, usado quando escolher é multi e há um "pronto". */
export const PainelRodape = styled.footer`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md};
  border-top: 1px solid ${theme.colors.border};
  background: ${theme.colors.card};
`;

export const PainelGrupo = styled.div`
  & + & {
    margin-top: ${theme.spacing.lg};
  }
`;

export const PainelGrupoTitulo = styled.h4`
  margin: 0 0 ${theme.spacing.xs};
  font-size: ${theme.fontSize.xs};
  font-weight: ${theme.fontWeight.semibold};
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: ${theme.colors.mutedForeground};
`;

/**
 * A lista de candidatos.
 *
 * Cada pessoa ocupa DUAS linhas e nada mais: o nome e uma linha de apoio em
 * texto corrido. A versão anterior empilhava carga, pílula de situação,
 * posição e "pediu" como quatro etiquetas soltas na mesma linha, quatro
 * caixas coloridas por pessoa, vinte pessoas, e a única coisa que a tela
 * precisava responder ("quem está mais livre?") sumia no meio.
 *
 * `ul`/`li` de verdade: é uma lista, e leitor de tela anuncia o tamanho dela.
 */
export const CandidatoLista = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
`;

export const CandidatoLinha = styled.li`
  padding: ${theme.spacing.sm} 0;
  min-width: 0;

  & + & {
    border-top: 1px solid ${theme.colors.border};
  }
`;

/** A linha em si. A lista de projetos, quando aberta, cai por baixo dela. */
export const CandidatoTopo = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  min-width: 0;
`;

/**
 * "3 projetos" clicável.
 *
 * Botão de verdade, com aparência de texto: precisa de teclado e de
 * `aria-expanded`, e um `span` com `onClick` não dá nenhum dos dois. A seta
 * é o que avisa que há algo a abrir, sem ela a única pista seria o cursor,
 * que não existe no celular.
 */
export const BotaoDeTexto = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.15rem;
  padding: 0;
  border: none;
  background: none;
  font: inherit;
  color: inherit;
  cursor: pointer;
  transition: color ${theme.transitions.fast};

  &:hover {
    color: ${theme.colors.foreground};
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.ring};
    outline-offset: 2px;
    border-radius: ${theme.borderRadius.sm};
  }
`;

/** Os projetos da pessoa, recuados para se lerem como detalhe da linha. */
export const CandidatoProjetos = styled.ul`
  margin: ${theme.spacing.xs} 0 0;
  padding: ${theme.spacing.xs} 0 0 ${theme.spacing.md};
  list-style: none;
  border-top: 1px dashed ${theme.colors.border};

  li {
    font-size: ${theme.fontSize.xs};
    color: ${theme.colors.mutedForeground};
    line-height: 1.6;
  }
`;

export const CandidatoInfo = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
`;

export const CandidatoNome = styled.span`
  font-size: ${theme.fontSize.sm};
  font-weight: ${theme.fontWeight.medium};
  color: ${theme.colors.cardForeground};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

/** Linha de apoio: "3 projetos · Carga alta". Texto, não etiquetas. */
export const CandidatoMeta = styled.span`
  font-size: ${theme.fontSize.xs};
  color: ${theme.colors.mutedForeground};
`;

/**
 * A situação dentro da linha de apoio. A cor reforça, mas quem carrega o
 * significado é a palavra, "Carga alta" continua legível em preto e branco,
 * e por isso ela é `<strong>` e não um ponto colorido.
 */
export const CandidatoSituacao = styled.strong<{ $tom: "ok" | "atencao" | "alerta" | "neutro" }>`
  font-weight: ${theme.fontWeight.medium};
  color: ${({ $tom }) =>
    $tom === "alerta"
      ? theme.colors.destructive
      : $tom === "atencao"
        ? theme.colors.warningForeground
        : theme.colors.mutedForeground};
`;

/** Cabeçalho de seção do painel ("Pediram para entrar", "Disponíveis"). */
export const PainelSecaoTitulo = styled.h4`
  margin: 0 0 ${theme.spacing.xs};
  font-size: ${theme.fontSize.xs};
  font-weight: ${theme.fontWeight.semibold};
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: ${theme.colors.mutedForeground};
`;

export const PainelSecao = styled.section`
  & + & {
    margin-top: ${theme.spacing.lg};
    padding-top: ${theme.spacing.lg};
    border-top: 1px solid ${theme.colors.border};
  }
`;
