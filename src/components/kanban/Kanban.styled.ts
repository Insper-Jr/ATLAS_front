import styled, { css } from "styled-components";
import { theme } from "@/styles/theme";
import type { TonsColuna } from "@/lib/colunas-tarefa";

/** O número de colunas é dado, não constante: a diretoria pode criar mais. */
export const Board = styled.div<{ $colunas: number }>`
  display: grid;
  grid-template-columns: repeat(${({ $colunas }) => Math.max(1, $colunas)}, minmax(13.5rem, 1fr));
  gap: ${theme.spacing.sm};
  overflow-x: auto;
  padding-bottom: ${theme.spacing.sm};
  align-items: start;

  /* Com 5 colunas de 13,5rem o board pede 68rem: no celular ele fica sempre
     parado no meio de duas colunas, e nenhuma se lê inteira. Colunas mais
     estreitas e um snap por coluna fazem o board se comportar como as telas
     lado a lado que a pessoa já conhece — um deslize, uma coluna. */
  @media (max-width: ${theme.breakpoints.md - 1}px) {
    grid-template-columns: repeat(${({ $colunas }) => Math.max(1, $colunas)}, minmax(11rem, 1fr));
    /* proximity, não mandatory: o board é arrastável com @dnd-kit, que rola o
       container por conta própria quando o card chega na borda. Com mandatory o
       navegador puxa de volta para o ponto de encaixe no meio desse auto-scroll
       e o card fica pulando. Com proximity o encaixe só acontece quando o dedo
       solta perto de uma coluna. */
    scroll-snap-type: x proximity;

    /* O snap é do FILHO; sem isto o container não tem em que parar. */
    > * {
      scroll-snap-align: start;
    }
  }

  /* A barra padrão do SO (grossa, com setinha) destoa do resto da UI, aqui
     fica fina e some quando não tem o quê rolar. Firefox usa as propriedades
     scrollbar-width/scrollbar-color; o resto, os pseudo-elementos
     ::-webkit-scrollbar. */
  scrollbar-width: thin;
  scrollbar-color: ${theme.colors.border} transparent;

  &::-webkit-scrollbar {
    height: 8px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: ${theme.colors.border};
    border-radius: ${theme.borderRadius.full};
  }

  &::-webkit-scrollbar-thumb:hover {
    background: ${theme.colors.mutedForeground};
  }
`;

export const Coluna = styled.div<{ $sobre?: boolean; $cor?: TonsColuna }>`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
  min-height: 8rem;
  padding: ${theme.spacing.sm};
  border-radius: ${theme.borderRadius.lg};
  /* Ao arrastar por cima, a coluna acende na PRÓPRIA cor, assim o alvo do
     drop diz para onde a tarefa está indo, não só que há um alvo. */
  border: 1px solid
    ${({ $sobre, $cor }) => ($sobre ? ($cor?.ponto ?? theme.colors.ring) : theme.colors.border)};
  background: ${({ $sobre, $cor }) =>
    $sobre ? ($cor?.fundo ?? theme.colors.secondary) : theme.colors.background};
  transition: background ${theme.transitions.fast}, border-color ${theme.transitions.fast};
`;

export const ColunaTitulo = styled.h3`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  margin: 0;
  font-size: ${theme.fontSize.xs};
  font-weight: ${theme.fontWeight.medium};
`;

/** O texto do rótulo dentro da pílula (`StatusPilula`, de `Projetos.styled`,
 *  usada em todo cabeçalho de coluna do board), é ele que trunca com
 *  reticências quando não cabe, não a pílula inteira nem o contador ao lado. */
export const ColunaRotuloTexto = styled.span`
  overflow: hidden;
  min-width: 0;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const Ponto = styled.span<{ $cor: string }>`
  width: 0.5rem;
  height: 0.5rem;
  flex-shrink: 0;
  border-radius: ${theme.borderRadius.full};
  background: ${({ $cor }) => $cor};
`;

/** `flex-shrink: 0`, o número nunca perde espaço; quem trunca é o rótulo. */
export const Contador = styled.span`
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
  font-weight: ${theme.fontWeight.normal};
  color: ${theme.colors.mutedForeground};
`;

/** A contagem de vencidas, separada, vermelho não pode virar cor de coluna. */
export const ContadorVencidas = styled.span`
  margin-left: auto;
  font-size: ${theme.fontSize.xs};
  font-weight: ${theme.fontWeight.medium};
  color: ${theme.colors.destructive};
  white-space: nowrap;
`;

export const Card = styled.div<{
  $vencida?: boolean;
  $arrastando?: boolean;
  $cor?: TonsColuna;
  $bloqueada?: boolean;
}>`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  padding: ${theme.spacing.sm};
  border-radius: ${theme.borderRadius.md};
  /* A borda vermelha de VENCIDA vence a cor da coluna: é sinal de problema,
     não de estado, precisa continuar aparecendo sobre qualquer tinta. */
  border: 1px solid
    ${({ $vencida, $cor }) =>
      $vencida ? theme.colors.destructive : ($cor?.borda ?? theme.colors.border)};
  background: ${({ $cor }) => $cor?.fundo ?? theme.colors.card};
  box-shadow: ${theme.shadows.sm};
  cursor: grab;
  touch-action: none;

  ${({ $arrastando }) =>
    $arrastando &&
    css`
      opacity: 0.4;
      cursor: grabbing;
    `}

  /* Card sem transição manual válida (ex.: Vendido) ou cujo destino é
     ambíguo pra arrastar (Pausado, retoma pelo botão da página do
     projeto): mesma cor de sempre, só sem convite a arrastar. */
  ${({ $bloqueada }) =>
    $bloqueada &&
    css`
      cursor: default;
      opacity: 0.75;
    `}

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px color-mix(in srgb, ${theme.colors.ring} 30%, transparent);
  }
`;

export const CardTopo = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.25rem;
`;

/** Pedido de entrada pendente pra este projeto (§7.3) — sinal discreto no
 *  canto do card, sem precisar abrir o projeto pra descobrir que alguém
 *  está esperando resposta. Some sozinho quando o pedido é respondido. */
export const PendenteDot = styled.span`
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  width: 0.5rem;
  height: 0.5rem;
  border-radius: ${theme.borderRadius.full};
  background: ${theme.colors.destructive};
`;

export const BotaoExcluir = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  padding: 0.1rem;
  border: none;
  border-radius: ${theme.borderRadius.sm};
  background: transparent;
  color: ${theme.colors.mutedForeground};
  cursor: pointer;
  opacity: 0;
  transition: opacity ${theme.transitions.fast};

  ${Card}:hover &,
  &:focus-visible {
    opacity: 1;
  }

  &:hover {
    color: ${theme.colors.destructive};
    background: ${theme.colors.muted};
  }
`;

/** Ícone de alerta genérico pro canto do card — kickoff pendente
 *  (`ProjetoKanbanBoard`), alteração solicitada pelo cliente
 *  (`ContratosPainel`): o card do kanban é compacto demais pro texto,
 *  só cabe o ícone (o `title` carrega a explicação). */
export const AlertaCard = styled.span`
  display: inline-flex;
  flex-shrink: 0;
  color: ${theme.colors.destructive};
`;

export const CardTitulo = styled.span`
  font-size: ${theme.fontSize.sm};
  font-weight: ${theme.fontWeight.medium};
  color: ${theme.colors.foreground};
  line-height: 1.35;
`;

/**
 * O cliente, texto corrido, sempre em linha própria (nunca dividindo
 * espaço com outra informação de largura variável: era isso que fazia o
 * mesmo card quebrar diferente dependendo da coluna). Trunca com
 * reticências se não couber; o nome completo fica no title (tooltip).
 */
export const CardMeta = styled.div`
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: ${theme.fontSize.xs};
  color: ${theme.colors.mutedForeground};
`;

/**
 * As frentes do projeto, pílulas, não texto corrido, pra não se confundir
 * visualmente com o cliente logo acima (mesma cor/tamanho de fonte, só a
 * posição os diferenciava, o que sumia quando um dos dois quebrava linha).
 */
export const CardFrentes = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
`;

export const CardFrenteTag = styled.span`
  display: inline-flex;
  max-width: 100%;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  padding: 0.05rem 0.4rem;
  border-radius: ${theme.borderRadius.full};
  border: 1px solid ${theme.colors.border};
  background: ${theme.colors.secondary};
  font-size: ${theme.fontSize.xs};
  color: ${theme.colors.foreground};
`;

/**
 * A data da próxima banca, quando o projeto tem uma marcada. Sem
 * reticências aqui, cortar o texto escondia o horário, que é o dado que
 * essa linha existe pra mostrar. Deixa quebrar pra uma segunda linha se
 * precisar; o componente troca o espaço entre data e hora por um espaço
 * inquebrável, pra nunca cortar bem no meio do "hh:mm".
 */
export const CardBanca = styled.div`
  font-size: ${theme.fontSize.xs};
  font-variant-numeric: tabular-nums;
  color: ${theme.colors.mutedForeground};
`;

/**
 * ⏰ O sinal de urgência no card.
 *
 * O card mostra só NOME e RESPONSÁVEL; a data fica no detalhe. Este glifo é
 * o único indício de prazo na face, some quando falta tempo (`normal`) e
 * fica mais forte conforme aperta.
 */
export const SinalUrgencia = styled.span<{ $cor: string }>`
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  font-size: 0.8rem;
  line-height: 1;
  color: ${({ $cor }) => theme.clarear($cor)};
  cursor: help;
`;

/**
 * "parte · 1/3" — o card faz parte de uma tarefa dividida ("cada um faz a
 * sua parte"). O número é quantas partes já chegaram numa coluna que
 * encerra, para a pessoa ver de relance quanto do grupo falta sem abrir o
 * detalhe. Só aparece em card com `grupo_id`.
 */
export const GrupoTag = styled.span`
  align-self: flex-start;
  padding: 0.05rem 0.4rem;
  border-radius: ${theme.borderRadius.full};
  border: 1px solid ${theme.colors.border};
  background: ${theme.colors.secondary};
  font-size: ${theme.fontSize.xs};
  font-variant-numeric: tabular-nums;
  color: ${theme.colors.mutedForeground};
`;

export const ColunaVazia = styled.p`
  margin: 0;
  padding: ${theme.spacing.sm} 0;
  font-size: ${theme.fontSize.xs};
  color: ${theme.colors.mutedForeground};
  text-align: center;
`;

/* ------------------------------------------------------------------ */
/* Faixa da reunião semanal                                     */
/* ------------------------------------------------------------------ */

export const FaixaSemana = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: ${theme.spacing.sm};
`;

export const DiaSemana = styled.button<{ $registrado?: boolean; $padrao?: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: ${theme.spacing.sm} 0.25rem;
  border-radius: ${theme.borderRadius.lg};
  border: 1px solid
    ${({ $registrado, $padrao }) =>
      $registrado
        ? theme.colors.success
        : $padrao
          ? theme.colors.ring
          : theme.colors.border};
  background: ${({ $registrado }) =>
    $registrado ? `color-mix(in srgb, ${theme.colors.success} 12%, var(--atlas-card))` : theme.colors.background};
  cursor: pointer;
  transition: background ${theme.transitions.fast}, border-color ${theme.transitions.fast};

  &:hover:not(:disabled) {
    background: ${theme.colors.muted};
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
`;

export const DiaRotulo = styled.span`
  font-size: ${theme.fontSize.xs};
  font-weight: ${theme.fontWeight.medium};
  color: ${theme.colors.mutedForeground};
`;

export const DiaNumero = styled.span<{ $hoje?: boolean }>`
  font-size: ${theme.fontSize.base};
  font-weight: ${({ $hoje }) => ($hoje ? theme.fontWeight.bold : theme.fontWeight.medium)};
  color: ${theme.colors.foreground};
`;

export const DiaMarca = styled.span`
  font-size: ${theme.fontSize.xs};
  line-height: 1;
  min-height: 1rem;
`;

export const NavegacaoSemana = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${theme.spacing.sm};
  margin-bottom: ${theme.spacing.md};
`;

export const SemanaRotulo = styled.span`
  font-size: ${theme.fontSize.sm};
  font-weight: ${theme.fontWeight.medium};
  color: ${theme.colors.foreground};
`;

/* ------------------------------------------------------------------ */
/* "Sobre qual escopo foi?", o que dá a largada na contagem     */
/* ------------------------------------------------------------------ */

export const EscolhaEscopoPainel = styled.div`
  margin-top: ${theme.spacing.md};
  padding: ${theme.spacing.md};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.borderRadius.lg};
  background: ${theme.colors.muted};
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
`;

export const EscolhaEscopoTitulo = styled.p`
  margin: 0;
  font-size: ${theme.fontSize.sm};
  font-weight: ${theme.fontWeight.medium};
  color: ${theme.colors.foreground};
`;

export const EscolhaEscopoLista = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xs};
`;

export const EscolhaEscopoOpcao = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${theme.spacing.sm};
  width: 100%;
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.borderRadius.md};
  background: ${theme.colors.background};
  font-size: ${theme.fontSize.sm};
  color: ${theme.colors.foreground};
  text-align: left;
  cursor: pointer;
  transition: border-color ${theme.transitions.fast}, background ${theme.transitions.fast};

  &:hover:not(:disabled) {
    border-color: ${theme.colors.ring};
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }
`;

export const EscolhaEscopoDica = styled.span`
  font-size: ${theme.fontSize.xs};
  color: ${theme.colors.mutedForeground};
  white-space: nowrap;
`;
