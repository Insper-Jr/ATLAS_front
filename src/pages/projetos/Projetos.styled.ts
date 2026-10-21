import styled, { css, keyframes } from "styled-components";
import { Link, NavLink } from "react-router-dom";
import { theme } from "@/styles/theme";
import type { TonsColuna } from "@/lib/colunas-tarefa";

export {
  PageHeaderRow,
  PageHeaderText,
  PageHeading,
  PageSubheading,
  FormStack,
  FieldGroup,
  FieldLabel,
  Required,
  FieldInput,
  FieldTextarea,
  FieldSelect,
  CheckboxGrid,
  CheckboxLabel,
  FormErrorText,
  DataTable,
  TableHead,
  TableHeadCell,
  TableBody,
  TableRow,
  TableCell,
  NameCell,
  ActionsCell,
  DetailList,
  DetailRow,
  DetailTerm,
  DetailValue,
  ModalOverlay,
  ModalHeader,
  ModalTitle,
  ModalClose,
  ModalBody,
  ModalFooter,
  WideModalContent,
  SectionTitle,
} from "../Bancas.styled";

/**
 * O `FormStack` só espaça os filhos DIRETOS do <form>, e num card eles são
 * o conteúdo e o rodapé. Este é o empilhamento dos campos lá dentro.
 */
export const FormFields = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.lg};
`;

/** O selo de vagas abertas (§7.3): linha própria logo abaixo do subtítulo,
 *  não mais dentro da frase "N projetos · N com kickoff pendente" — enterrado
 *  no meio de uma frase de metadados, ninguém lia até o fim. Link sublinhado,
 *  não um badge com fundo/borda: aquele formato lia como mais um status
 *  (tipo `StatusPilula`), e isto é uma ação, não um estado do projeto. */
export const VagasSelo = styled(Link)`
  display: inline-flex;
  align-self: flex-start;
  align-items: center;
  gap: 0.2rem;
  margin-top: ${theme.spacing.sm};
  color: ${theme.colors.primary};
  font-size: ${theme.fontSize.sm};
  font-weight: ${theme.fontWeight.semibold};
  text-decoration: none;

  svg {
    transition: transform ${theme.transitions.fast};
  }

  &:hover svg {
    transform: translateX(0.15rem);
  }
`;

/** Link dentro de um `AvisoBanner` (ex.: "Responder" no aviso de pedido de
 *  entrada pendente) — herda a cor do aviso em vez do azul padrão do
 *  navegador, só ganha peso e sublinhado pra continuar lendo como ação. */
export const AvisoLink = styled(Link)`
  color: inherit;
  font-weight: ${theme.fontWeight.semibold};
  text-decoration: underline;
`;

/** O toggle "Link" / "Anexar PDF" do campo de proposta, um ou outro. */
export const ModoPropostaRow = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
`;

/* ------------------------------------------------------------------ */
/* Lista — os cards do §6.2                                            */
/* ------------------------------------------------------------------ */

export const CardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(17rem, 1fr));
  gap: ${theme.spacing.md};
`;

export const ProjetoCard = styled(NavLink)<{ $comSelecao?: boolean }>`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md};
  /* No modo seleção, o checkbox absoluto do canto superior esquerdo
     (SelecaoCheckboxWrap, abaixo) sobrepunha o título — nada empurrava
     o conteúdo, já que posição absoluta sai do fluxo. Reserva espaço à
     esquerda só enquanto o modo estiver ativo. */
  padding-left: ${({ $comSelecao }) => ($comSelecao ? "1.85rem" : theme.spacing.md)};
  border-radius: ${theme.borderRadius.xl};
  border: 1px solid ${theme.colors.border};
  background: ${theme.colors.card};
  box-shadow: ${theme.shadows.sm};
  text-decoration: none;
  color: inherit;
  transition: border-color ${theme.transitions.fast}, box-shadow ${theme.transitions.fast};

  &:hover {
    border-color: ${theme.colors.ring};
    box-shadow: ${theme.shadows.md};
  }

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px color-mix(in srgb, ${theme.colors.ring} 30%, transparent);
  }
`;

/** O checkbox de seleção em massa, canto oposto ao `PendenteDot` (que fica
 *  no topo-direito) pra nunca disputar o mesmo canto do card. Só existe
 *  no modo seleção — fora dele o card volta a ser um link puro. */
export const SelecaoCheckboxWrap = styled.span`
  position: absolute;
  top: 0.6rem;
  left: 0.6rem;
  z-index: 1;
  display: inline-flex;
  width: 1.25rem;
  height: 1.25rem;

  input {
    width: 100%;
    height: 100%;
    cursor: pointer;
  }
`;

/** A barra de ações em massa, some enquanto nada está selecionado — não
 *  ocupa espaço reservado o tempo todo por uma ação que é exceção, não
 *  rotina. */
export const SelecaoBarra = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border-radius: ${theme.borderRadius.lg};
  border: 1px solid ${theme.colors.border};
  background: ${theme.colors.secondary};
  font-size: ${theme.fontSize.sm};
  font-weight: ${theme.fontWeight.medium};
`;

export const SelecaoContagem = styled.span`
  margin-right: auto;
  color: ${theme.colors.mutedForeground};
`;

/** Mesmo sinal do Kanban (`Kanban.styled.ts`, `PendenteDot`) — pedido de
 *  entrada pendente pra este projeto, sem precisar abrir pra descobrir. */
export const PendenteDot = styled.span`
  position: absolute;
  top: 0.6rem;
  right: 0.6rem;
  width: 0.5rem;
  height: 0.5rem;
  border-radius: ${theme.borderRadius.full};
  background: ${theme.colors.destructive};
`;

export const CardTitle = styled.h2`
  margin: 0;
  font-size: ${theme.fontSize.base};
  font-weight: ${theme.fontWeight.semibold};
  color: ${theme.colors.foreground};
`;

export const CardCliente = styled.p`
  margin: 0;
  font-size: ${theme.fontSize.xs};
  color: ${theme.colors.mutedForeground};
`;

export const TagRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
`;

export const FrenteTag = styled.span`
  display: inline-flex;
  padding: 0.125rem 0.5rem;
  border-radius: ${theme.borderRadius.full};
  border: 1px solid ${theme.colors.border};
  background: ${theme.colors.secondary};
  font-size: ${theme.fontSize.xs};
  color: ${theme.colors.foreground};
`;

/**
 * A pílula de status/etapa, mesma borda arredondada e tamanho de fonte da
 * `FrenteTag`, em QUALQUER lugar que mostre uma cor de status: card da lista
 * de projetos, cabeçalho de coluna do kanban (de projeto ou de tarefa),
 * timeline do histórico, seletor de etapa. Um formato só, pra cor de status
 * nunca parecer um controle diferente dependendo de onde aparece.
 */
export const StatusPilula = styled.span<{ $cor: TonsColuna }>`
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  min-width: 0;
  padding: 0.125rem 0.5rem;
  border-radius: ${theme.borderRadius.full};
  border: 1px solid ${({ $cor }) => $cor.borda};
  background: ${({ $cor }) => $cor.fundo};
  color: ${({ $cor }) => $cor.texto};
  font-size: ${theme.fontSize.xs};
`;

export const CardEquipe = styled.p`
  margin: 0;
  font-size: ${theme.fontSize.xs};
  color: ${theme.colors.mutedForeground};
  line-height: 1.5;

  strong {
    font-weight: ${theme.fontWeight.medium};
    color: ${theme.colors.foreground};
  }
`;

/** O ícone antes de "Arquivado em ...", em linha com o texto, não numa
 *  linha própria: o SVG do ícone é um elemento de bloco por padrão, e sem
 *  esse wrapper `inline-flex` ele empurrava o texto pra baixo dele. */
export const ArquivadoEmLinha = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
`;

/** kickoff pendente, o único alerta que o card carrega hoje. */
export const CardAlerta = styled.p`
  display: flex;
  align-items: center;
  gap: 0.375rem;
  margin: 0;
  padding-top: ${theme.spacing.sm};
  border-top: 1px solid ${theme.colors.border};
  font-size: ${theme.fontSize.xs};
  font-weight: ${theme.fontWeight.medium};
  color: ${theme.colors.warningForeground};
`;

export const FiltersRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.sm};
  align-items: center;
`;

export const ViewToggleRow = styled.div`
  display: inline-flex;
  padding: 0.1875rem;
  border-radius: ${theme.borderRadius.lg};
  background: ${theme.colors.muted};
`;

export const ViewToggleBtn = styled.button<{ $ativo?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  height: 1.875rem;
  padding: 0 0.75rem;
  border: none;
  border-radius: ${theme.borderRadius.md};
  font-size: ${theme.fontSize.sm};
  font-weight: ${theme.fontWeight.medium};
  cursor: pointer;
  transition: background ${theme.transitions.fast}, color ${theme.transitions.fast};
  background: ${({ $ativo }) => ($ativo ? theme.colors.card : "transparent")};
  color: ${({ $ativo }) => ($ativo ? theme.colors.foreground : theme.colors.mutedForeground)};
  box-shadow: ${({ $ativo }) => ($ativo ? theme.shadows.sm : "none")};

  &:hover {
    color: ${theme.colors.foreground};
  }
`;

export const FrenteFilterWrap = styled.div`
  position: relative;
`;

export const FrenteFilterButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  height: 2.25rem;
  padding: 0 0.75rem;
  border-radius: ${theme.borderRadius.lg};
  border: 1px solid ${theme.colors.input};
  background: ${theme.colors.background};
  font-size: ${theme.fontSize.sm};
  color: ${theme.colors.foreground};
  cursor: pointer;

  &:focus-visible {
    outline: none;
    border-color: ${theme.colors.ring};
    box-shadow: 0 0 0 3px color-mix(in srgb, ${theme.colors.ring} 25%, transparent);
  }
`;

export const FrenteFilterPanel = styled.div`
  position: absolute;
  z-index: 20;
  top: calc(100% + 0.375rem);
  right: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 12rem;
  max-height: 14rem;
  overflow-y: auto;
  padding: 0.625rem 0.75rem;
  border-radius: ${theme.borderRadius.lg};
  border: 1px solid ${theme.colors.border};
  background: ${theme.colors.popover};
  box-shadow: ${theme.shadows.lg};
`;

/** Separa grupos de opções dentro de um dropdown de filtro (ex.: frentes,
 *  ordem, "Mostrar arquivados", em `ProjetosList`) sem precisar de um
 *  dropdown por grupo. */
export const FrenteFilterDivisor = styled.div`
  border-top: 1px solid ${theme.colors.border};
  margin: 0.125rem 0;
`;

/** O rótulo de cada grupo dentro do dropdown de filtro, "Frentes", "Ordem",
 *  "Arquivados". */
export const FrenteFilterSecao = styled.p`
  margin: 0;
  font-size: ${theme.fontSize.xs};
  font-weight: ${theme.fontWeight.medium};
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: ${theme.colors.mutedForeground};
`;

/** Uma opção clicável dentro do dropdown que não é checkbox (ex.: a direção
 *  da ordenação), mesma tipografia do `CheckboxLabel` ao lado, só sem o
 *  quadradinho. */
export const FrenteFilterOpcao = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0;
  border: none;
  background: none;
  font-size: ${theme.fontSize.sm};
  color: ${theme.colors.foreground};
  cursor: pointer;
  text-align: left;

  &:hover {
    color: ${theme.colors.primary};
  }
`;

export const FrenteFilterFooter = styled.button`
  align-self: flex-start;
  padding: 0;
  border: none;
  background: none;
  font-size: ${theme.fontSize.xs};
  color: ${theme.colors.primary};
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
`;

/* ------------------------------------------------------------------ */
/* Shell da página do projeto                                          */
/* ------------------------------------------------------------------ */

export const ProjetoShell = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.lg};
`;

export const ShellHeader = styled.header`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${theme.spacing.md};

  /* O bloco de nome/descrição/equipe (PageHeaderText) cede espaço primeiro —
     sem isto, um projeto com dois nomes compridos na equipe empurrava o
     status/Arquivar/Apagar pra uma linha embaixo, e ficava inconsistente
     com o projeto vizinho, cuja equipe tem nomes mais curtos. */
  & > *:first-child {
    flex: 1 1 320px;
    min-width: 0;
  }

  & > *:last-child {
    flex-shrink: 0;
  }
`;

export const VoltarLink = styled(NavLink)`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: ${theme.fontSize.xs};
  color: ${theme.colors.mutedForeground};
  text-decoration: none;

  &:hover {
    color: ${theme.colors.foreground};
  }
`;

export const StatusRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${theme.spacing.sm};
`;

/** O banner de kickoff pendente, some assim que a data é marcada. */
export const AvisoBanner = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border-radius: ${theme.borderRadius.lg};
  border: 1px solid color-mix(in srgb, ${theme.colors.warning} 45%, transparent);
  background: color-mix(in srgb, ${theme.colors.warning} 12%, var(--atlas-card));
  font-size: ${theme.fontSize.sm};
  color: ${theme.colors.warningForeground};
`;

/**
 * As abas do projeto (Visão geral, Cronograma, Tarefas, …).
 *
 * Em mobile ela ROLA na horizontal em vez de quebrar linha: com `flex-wrap` as
 * seis abas viravam um bloco de três linhas empurrando o conteúdo da página para
 * baixo da dobra. É o mesmo padrão da `TabBar` do monitoramento — a diferença é
 * que aqui as abas são sublinhadas, não pílulas.
 */
export const TabBar = styled.nav`
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  border-bottom: 1px solid ${theme.colors.border};

  @media (max-width: ${theme.breakpoints.md - 1}px) {
    flex-wrap: nowrap;
    overflow-x: auto;

    /* overflow-x: auto promove o eixo Y para auto, e o margin-bottom de -1px do
       link ativo passaria a render uma barra de rolagem vertical de 1px. O
       padding devolve esse 1px, e o hidden fecha a porta. */
    padding-bottom: 1px;
    overflow-y: hidden;

    /* A barra de rolagem sobre as abas suja mais do que orienta; o corte na
       borda da tela já indica que há mais aba para o lado. */
    scrollbar-width: none;

    &::-webkit-scrollbar {
      display: none;
    }
  }
`;

export const TabLink = styled(NavLink)<{ $desabilitada?: boolean }>`
  /* Sem os dois, o flex espremeria as abas até "Cronograma" quebrar no meio em
     vez de deixar a barra rolar. */
  flex-shrink: 0;
  white-space: nowrap;
  padding: 0.5rem 0.875rem;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  font-size: ${theme.fontSize.sm};
  font-weight: ${theme.fontWeight.medium};
  color: ${theme.colors.mutedForeground};
  text-decoration: none;
  transition: color ${theme.transitions.fast}, border-color ${theme.transitions.fast};

  &:hover {
    color: ${theme.colors.foreground};
  }

  &.active {
    color: ${theme.colors.primary};
    border-bottom-color: ${theme.colors.primary};
  }
`;

/* ------------------------------------------------------------------ */
/* Aba Visão geral                                                     */
/* ------------------------------------------------------------------ */

export const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${theme.spacing.lg};

  @media (min-width: ${theme.breakpoints.lg}px) {
    grid-template-columns: 1fr 1fr;
  }
`;

/**
 * A descrição do projeto, inteira, no card "Sobre o projeto" da Visão geral.
 *
 * ⭐ Ela morava no cabeçalho, cortada em duas linhas com um "Ver mais", e
 * repetida no topo das cinco abas. Num card cabe sem truncar — truncar texto
 * que alguém escreveu para ser lido nunca foi o objetivo, era falta de espaço
 * num lugar que não era o dela.
 *
 * `pre-wrap` porque quem escreve a descrição usa quebra de linha para separar
 * assunto, e colapsá-las transformava uma lista em parágrafo.
 */
export const DescricaoTexto = styled.p`
  margin: 0;
  font-size: ${theme.fontSize.sm};
  line-height: 1.6;
  color: ${theme.colors.foreground};
  white-space: pre-wrap;
  /* 65-75 caracteres por linha: acima disso o olho perde a linha na volta. */
  max-width: 70ch;
`;

export const LinkExterno = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: ${theme.fontSize.sm};
  color: ${theme.colors.primary};
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`;

export const DataRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${theme.spacing.sm};
  font-size: ${theme.fontSize.sm};
  color: ${theme.colors.foreground};

  & + & {
    margin-top: ${theme.spacing.sm};
  }
`;

export const DataLabel = styled.span`
  min-width: 9rem;
  font-size: ${theme.fontSize.xs};
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: ${theme.colors.mutedForeground};
`;

/**
 * O card de Datas em grade, não em linhas empilhadas, uma linha por campo
 * deixava letra minúscula boiando numa fileira inteira de espaço vazio à
 * direita. Aqui cada campo é uma célula (rótulo em cima, valor embaixo),
 * então o card usa a largura toda em vez de só a coluna da esquerda.
 */
export const DatasGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(8.5rem, 1fr));
  gap: ${theme.spacing.lg} ${theme.spacing.xl};
`;

export const DataItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
`;

/**
 * O `DataItem` que precisa de mais de uma coluna do `DatasGrid`.
 *
 * ⚠ As colunas do grid são `minmax(8.5rem, 1fr)`, medida pensada para uma data
 * (`14/08/2026`). Os cinco botões de dia da reunião não cabem nisso e
 * quebravam em duas fileiras dentro da própria célula, com três dias em cima e
 * dois embaixo — que lê como defeito, não como layout.
 */
export const DataItemLargo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  grid-column: span 2;

  /* Numa coluna só (celular) não há duas colunas para ocupar, e insistir no
     span deixaria a célula maior que o grid. */
  @media (max-width: ${theme.breakpoints.md}px) {
    grid-column: auto;
  }
`;

export const DataItemLabel = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: ${theme.fontSize.xs};
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: ${theme.colors.mutedForeground};
`;

/**
 * O ciclo de vida do projeto como uma TRILHA, não como uma lista de botões.
 *
 * ⭐ **Duas tentativas antes desta.** Era um dropdown: dois cliques, e os
 * destinos escondidos até o segundo. Virou uma fileira de botões, e aí ficou
 * pior — `destinosValidos` libera o trânsito livre entre TODAS as etapas
 * ativas, então a fileira era de sete botões mais "Pausar" mais "Arquivar":
 * uma parede de nove no cabeçalho de todas as abas.
 *
 * 📐 **O erro das duas era tratar isto como "escolher um valor".** Não é: as
 * sete etapas são um funil ordenado, e a pergunta de quem abre um projeto não
 * é "para onde mover" — é **em que ponto ele está**. A trilha responde isso
 * sem clique nenhum, e mover vira consequência: clicar numa etapa à frente
 * avança, numa atrás volta.
 *
 * ⚠ Só as etapas de `destinosValidos` respondem ao clique. As demais são
 * marcadores, e vêm como `span`, não como botão desabilitado — botão morto
 * promete um controle que não existe.
 */
export const PipelineTrilha = styled.div<{ $esmaecida?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.125rem;
  /* Sete etapas não cabem em tela estreita, e rolar é melhor do que espremer
     o rótulo até virar reticências. */
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  padding-bottom: 0.125rem;
  scrollbar-width: thin;

  /* Pausado: o funil continua legível, mas nada nele está correndo. */
  opacity: ${({ $esmaecida }) => ($esmaecida ? 0.45 : 1)};
  pointer-events: ${({ $esmaecida }) => ($esmaecida ? "none" : "auto")};
`;

/**
 * Uma etapa da trilha. Vem como botão quando dá para ir até ela, e como
 * `span` quando não dá (quem usa passa `as="span"`).
 *
 * Três estados: `feito` (já passou), `atual` (onde está) e `futuro` (ainda
 * não). A cor forte fica só no atual — sete cores lado a lado viram um
 * arco-íris, e aí nenhuma delas informa.
 */
export const PipelineEtapa = styled.button<{
  $estado: "feito" | "atual" | "futuro";
  $cor: string;
  $clicavel: boolean;
}>`
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  flex-shrink: 0;
  padding: 0.3rem 0.5rem;
  border: none;
  border-radius: ${theme.borderRadius.full};
  background: ${({ $estado, $cor }) =>
    $estado === "atual" ? `color-mix(in srgb, ${$cor} 14%, var(--atlas-card))` : "transparent"};
  font-size: ${theme.fontSize.xs};
  font-weight: ${({ $estado }) =>
    $estado === "atual" ? theme.fontWeight.semibold : theme.fontWeight.medium};
  color: ${({ $estado }) =>
    $estado === "atual" ? theme.colors.foreground : theme.colors.mutedForeground};
  white-space: nowrap;
  cursor: ${({ $clicavel }) => ($clicavel ? "pointer" : "default")};
  transition: background-color ${theme.transitions.fast}, color ${theme.transitions.fast};

  ${({ $clicavel, $cor }) =>
    $clicavel &&
    css`
      &:hover:not(:disabled) {
        background: color-mix(in srgb, ${$cor} 10%, var(--atlas-card));
        color: ${theme.colors.foreground};
      }
    `}

  &:focus-visible {
    outline: 2px solid ${theme.colors.ring};
    outline-offset: 1px;
  }

  &:disabled {
    opacity: 0.6;
    cursor: progress;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

/**
 * O ponto de cada etapa: cheio no que já passou e no atual, vazado no que
 * ainda vem.
 *
 * ⚠ É ele que tira a trilha da dependência de cor: "passou" e "não passou" se
 * distinguem pelo preenchimento, que sobrevive a daltonismo e a impressão em
 * preto e branco.
 */
export const PipelinePonto = styled.span<{ $estado: "feito" | "atual" | "futuro"; $cor: string }>`
  width: ${({ $estado }) => ($estado === "atual" ? "0.6rem" : "0.5rem")};
  height: ${({ $estado }) => ($estado === "atual" ? "0.6rem" : "0.5rem")};
  flex-shrink: 0;
  border-radius: ${theme.borderRadius.full};
  border: 1.5px solid ${({ $estado, $cor }) => ($estado === "futuro" ? theme.colors.border : $cor)};
  background: ${({ $estado, $cor }) => ($estado === "futuro" ? "transparent" : $cor)};
`;

/** O fio entre duas etapas. Decoração pura: quem usa marca `aria-hidden`. */
export const PipelineConector = styled.span<{ $percorrido: boolean }>`
  width: 0.75rem;
  height: 1.5px;
  flex-shrink: 0;
  background: ${({ $percorrido }) =>
    $percorrido ? theme.colors.mutedForeground : theme.colors.border};
`;

/** "Pausado": o estado à parte, que não é ponto nenhum do funil. */
export const PausadoAviso = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: 0.3rem 0.625rem;
  border-radius: ${theme.borderRadius.full};
  border: 1px solid color-mix(in srgb, ${theme.colors.warning} 45%, var(--atlas-card));
  background: color-mix(in srgb, ${theme.colors.warning} 12%, var(--atlas-card));
  font-size: ${theme.fontSize.xs};
  font-weight: ${theme.fontWeight.semibold};
  color: ${theme.colors.warningForeground};
`;

/* ------------------------------------------------------------------ */
/* Menu de ações do projeto                                            */
/* ------------------------------------------------------------------ */

/**
 * ⭐ **Editar, Arquivar e Apagar saíram do cabeçalho** e vieram para um menu.
 *
 * Eram três botões permanentes ao lado do nome, competindo com a trilha de
 * etapas, que é o controle de fato usado. "Apagar para sempre" principalmente:
 * uma ação irreversível não merece ser o terceiro elemento mais visível da
 * página só porque existe.
 *
 * 📐 Frequência decide proeminência. O que se faz toda semana fica na tela; o
 * que se faz uma vez na vida do projeto fica a um clique.
 */
export const AcoesWrap = styled.div`
  position: relative;
  flex-shrink: 0;
`;

export const AcoesBotao = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: ${theme.borderRadius.md};
  border: 1px solid ${theme.colors.input};
  background: ${theme.colors.background};
  color: ${theme.colors.mutedForeground};
  cursor: pointer;
  transition: background-color ${theme.transitions.fast}, color ${theme.transitions.fast};

  &:hover {
    background: ${theme.colors.muted};
    color: ${theme.colors.foreground};
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.ring};
    outline-offset: 2px;
  }

  @media (max-width: ${theme.breakpoints.md}px) {
    width: 2.75rem;
    height: 2.75rem;
  }
`;

export const AcoesMenu = styled.div`
  position: absolute;
  top: calc(100% + 0.25rem);
  right: 0;
  z-index: ${theme.zIndex.popover};
  display: flex;
  flex-direction: column;
  min-width: 13rem;
  padding: ${theme.spacing.xs};
  border-radius: ${theme.borderRadius.lg};
  border: 1px solid ${theme.colors.border};
  background: ${theme.colors.background};
  box-shadow: ${theme.shadows.lg};
`;

export const AcoesItem = styled.button<{ $perigo?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.625rem;
  border: none;
  border-radius: ${theme.borderRadius.md};
  background: transparent;
  font-size: ${theme.fontSize.sm};
  text-align: left;
  cursor: pointer;
  color: ${({ $perigo }) => ($perigo ? theme.colors.destructive : theme.colors.foreground)};

  &:hover:not(:disabled) {
    background: ${({ $perigo }) =>
      $perigo ? `color-mix(in srgb, ${theme.colors.destructive} 8%, var(--atlas-card))` : theme.colors.muted};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

/** Separa as ações destrutivas do resto do menu. */
export const AcoesDivisor = styled.div`
  height: 1px;
  margin: ${theme.spacing.xs} 0;
  background: ${theme.colors.border};
`;

/* ------------------------------------------------------------------ */
/* Cabeçalho compacto                                                  */
/* ------------------------------------------------------------------ */

/** A linha da identidade: nome, tags e, na ponta, o menu de ações. */
export const IdentidadeLinha = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: ${theme.spacing.sm};
`;

/**
 * A linha de contexto: cliente, equipe e proposta, em texto pequeno.
 *
 * ⭐ **Eram três blocos empilhados** — o subtítulo do cliente, um parágrafo de
 * descrição e um bloco de equipe com dois grupos rotulados e um avatar por
 * pessoa com o nome ao lado —, repetidos no topo de TODAS as abas. Aqui vira
 * uma linha só, com os itens separados por ponto médio.
 */
export const MetaLinha = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.375rem ${theme.spacing.sm};
  min-width: 0;
  font-size: ${theme.fontSize.sm};
  color: ${theme.colors.mutedForeground};
`;

export const MetaSeparador = styled.span`
  color: ${theme.colors.border};
`;

/**
 * A equipe como pilha de avatares sobrepostos.
 *
 * Os nomes por extenso ocupavam três linhas num projeto de cinco pessoas, e
 * "quem está no projeto" é pergunta de reconhecimento, não de leitura: o rosto
 * responde antes do nome. Os nomes continuam no `title` e na aba Visão geral,
 * onde há espaço para a equipe inteira.
 */
export const EquipePilha = styled.div`
  display: inline-flex;
  align-items: center;
  padding-left: 0.25rem;
`;

export const EquipeAvatarPequeno = styled.span<{ $cor: string }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  margin-left: -0.25rem;
  border-radius: ${theme.borderRadius.full};
  border: 2px solid ${theme.colors.background};
  background: ${({ $cor }) => $cor};
  font-size: 0.6rem;
  font-weight: ${theme.fontWeight.semibold};
  color: ${theme.colors.background};
  overflow: hidden;
`;

/** "+3", quando a equipe não cabe inteira na pilha. */
export const EquipeMais = styled(EquipeAvatarPequeno)`
  background: ${theme.colors.secondary};
  color: ${theme.colors.mutedForeground};
`;

export const EdicaoBotoes = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
  margin-top: ${theme.spacing.sm};
`;

/** O nome do projeto é o título da página (`PageHeading`), o lápis de
 *  editar mora ao lado dele, não escondido dentro do card de Descrição. */
export const NomeEditavel = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
`;

export const NomeBotaoEditar = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.25rem;
  border: none;
  border-radius: ${theme.borderRadius.md};
  background: transparent;
  color: ${theme.colors.mutedForeground};
  cursor: pointer;

  &:hover {
    color: ${theme.colors.foreground};
    background: ${theme.colors.muted};
  }
`;

export const DataItemValor = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: ${theme.spacing.sm};
  font-size: ${theme.fontSize.base};
  font-weight: ${theme.fontWeight.medium};
  color: ${theme.colors.foreground};
`;

/** O complemento discreto de um valor — "· até 20/08" ao lado de "5 dias
 *  úteis". Peso normal e cor apagada: é contexto do número, não o número. */
export const DataItemDetalhe = styled.span`
  font-weight: ${theme.fontWeight.normal};
  color: ${theme.colors.mutedForeground};
`;

/**
 * A variante de metadado do `DataItem` — "Criado em" e afins.
 *
 * ⭐ Menor e mais apagada de propósito: é dado de auditoria, não algo que
 * alguém vem à Visão geral procurar. Competir em tamanho com Kickoff ou
 * Entrega faria a tela sugerir que as duas coisas pesam igual.
 */
export const DataItemMeta = styled(DataItem)`
  ${DataItemLabel} {
    font-size: 0.65rem;
  }
  ${DataItemValor} {
    font-size: ${theme.fontSize.sm};
    font-weight: ${theme.fontWeight.normal};
    color: ${theme.colors.mutedForeground};
  }
`;

/**
 * A dica embaixo de uma data que é **lida** do cronograma, não editada aqui.
 *
 * Existe porque tirar o formulário sem dizer onde ele foi parar viraria um
 * beco: a pessoa via a data vazia, nenhum campo, e concluía que faltava
 * permissão.
 */
export const DataItemNota = styled.span`
  font-size: ${theme.fontSize.xs};
  line-height: 1.4;
  color: ${theme.colors.mutedForeground};
`;

/**
 * A caixa de um campo EDITÁVEL dentro da grade de Datas.
 *
 * ⭐ **Por que existe.** A grade é uma parede de fatos só de leitura, e um
 * controle largado no meio dela é lido como mais um fato. Foi o que aconteceu
 * com o calendário do projeto: era um segmented control, e quem usou não
 * percebeu que dava para clicar — os dois botões pareciam etiqueta de status,
 * que é justamente o que `PageBadge` desenha três células ao lado.
 *
 * A largura é limitada porque o `DataItemLargo` ocupa duas colunas do grid: um
 * select esticado até o fim delas fica com um vazio enorme entre o texto e a
 * seta, e aí volta a não parecer campo.
 */
export const DataItemCampo = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  width: 100%;
  max-width: 17rem;
`;

/** O estado da gravação ao lado do campo: "Salvando…" e depois "Salvo". */
export const DataItemEstado = styled.span<{ $ok?: boolean }>`
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: ${theme.fontSize.xs};
  color: ${({ $ok }) => ($ok ? theme.colors.primary : theme.colors.mutedForeground)};
`;

export const EquipeList = styled.ul`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
  margin: 0;
  padding: 0;
  list-style: none;
`;

export const EquipeItem = styled.li`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${theme.spacing.sm};
  font-size: ${theme.fontSize.sm};
  color: ${theme.colors.foreground};
`;

export const PapelTag = styled.span<{ $coordenador?: boolean }>`
  display: inline-flex;
  padding: 0.125rem 0.5rem;
  border-radius: ${theme.borderRadius.full};
  font-size: ${theme.fontSize.xs};
  font-weight: ${theme.fontWeight.medium};
  background: ${({ $coordenador }) =>
    $coordenador ? `color-mix(in srgb, ${theme.colors.primary} 10%, var(--atlas-card))` : theme.colors.muted};
  color: ${({ $coordenador }) => ($coordenador ? theme.colors.primary : theme.colors.mutedForeground)};
`;

/* ------------------------------------------------------------------ */
/* Tabela de escopos vendidos                                   */
/* ------------------------------------------------------------------ */

export const ProgressoWrap = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  min-width: 9rem;
`;

export const ProgressoTrilha = styled.div`
  flex: 1;
  height: 0.5rem;
  min-width: 4.5rem;
  border-radius: ${theme.borderRadius.full};
  background: ${theme.colors.muted};
  overflow: hidden;
`;

/** Clampa em 100% na largura, mas o RÓTULO ao lado mostra o número real
 *  (18/15), porque estourar o vendido é a informação, não um detalhe. */
export const ProgressoBarra = styled.div<{ $percentual: number; $estourou?: boolean }>`
  height: 100%;
  width: ${({ $percentual }) => Math.min(100, Math.max(0, $percentual))}%;
  border-radius: ${theme.borderRadius.full};
  background: ${({ $estourou }) =>
    $estourou ? theme.colors.destructive : theme.colors.success};
  transition: width ${theme.transitions.normal};
`;

export const ProgressoTexto = styled.span<{ $estourou?: boolean }>`
  font-size: ${theme.fontSize.xs};
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  color: ${({ $estourou }) => ($estourou ? theme.colors.destructive : theme.colors.mutedForeground)};
  font-weight: ${({ $estourou }) =>
    $estourou ? theme.fontWeight.semibold : theme.fontWeight.normal};
`;

/** O cadeado da entrega travada, conveniência de UI; quem barra é o backend. */
export const Cadeado = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: ${theme.fontSize.xs};
  color: ${theme.colors.mutedForeground};
  cursor: help;
`;

export const EscopoNome = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.125rem;

  strong {
    font-weight: ${theme.fontWeight.medium};
    color: ${theme.colors.foreground};
  }

  small {
    font-size: ${theme.fontSize.xs};
    color: ${theme.colors.mutedForeground};
  }
`;

export const LegendaTabela = styled.p`
  margin: ${theme.spacing.sm} 0 0;
  font-size: ${theme.fontSize.xs};
  color: ${theme.colors.mutedForeground};
`;

/** a célula "Atraso", o número e, embaixo, o porquê (ou o pedido dele). */
export const AtrasoCelula = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.25rem;
`;

/**
 * A célula "Entrega": a data e, embaixo, o estado da confirmação.
 *
 * ⭐ Data e confirmação empilhadas, e não num badge só, porque são duas
 * informações diferentes — *quando* foi e se alguém já **afirmou** que foi. Uma
 * data sozinha na coluna era lida como "entregue", que é justamente a confusão
 * que a confirmação existe para desfazer.
 */
export const EntregaCelula = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.25rem;

  small {
    font-size: ${theme.fontSize.xs};
    color: ${theme.colors.mutedForeground};
  }
`;

/**
 * A nota do atraso na célula.
 *
 * Cortada em duas linhas de propósito: a explicação pode ser longa, e deixá-la
 * crescer livre esticaria a linha inteira da tabela e empurraria as colunas de
 * banca e entrega para fora da vista. O texto completo fica no `title` e no
 * Histórico do projeto, que é onde ele é o assunto.
 */
export const JustificativaAtraso = styled.p`
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  max-width: 16rem;
  margin: 0;
  font-size: ${theme.fontSize.xs};
  color: ${theme.colors.mutedForeground};
`;

/** Painel das abas que ainda não existem (F6–F8, F11). */
export const EmBrevePanel = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.375rem;
  padding: ${theme.spacing.xl};
  border: 1px dashed ${theme.colors.border};
  border-radius: ${theme.borderRadius.xl};
  background: ${theme.colors.background};

  h2 {
    margin: 0;
    font-size: ${theme.fontSize.base};
    font-weight: ${theme.fontWeight.medium};
    color: ${theme.colors.foreground};
  }

  p {
    margin: 0;
    font-size: ${theme.fontSize.sm};
    color: ${theme.colors.mutedForeground};
  }
`;

/* ------------------------------------------------------------------ */
/* Aba Histórico                                                       */
/* ------------------------------------------------------------------ */

/**
 * "Tempo por etapa" como UMA barra empilhada, não como uma lista de barrinhas.
 *
 * ⭐ **Era um card lateral** de 260–320px com uma barra vertical por status,
 * dentro de um grid de duas colunas que espremia a timeline — o conteúdo real
 * da aba — em pouco mais da metade da largura. A informação é parte-do-todo
 * ("quanto do projeto foi gasto em cada etapa"), e parte-do-todo se lê melhor
 * numa faixa só, comparando larguras lado a lado, do que em barras separadas
 * cada uma com a própria escala.
 *
 * ⚠ **Nada aqui pode depender só da cor.** A legenda abaixo carrega nome e
 * duração de cada faixa; a faixa em si é o resumo visual, não a fonte do dado.
 */
export const HistoricoResumoFaixa = styled.div`
  display: flex;
  height: 0.75rem;
  border-radius: ${theme.borderRadius.full};
  background: ${theme.colors.secondary};
  overflow: hidden;
`;

export const HistoricoResumoSegmento = styled.div<{ $percent: number; $cor: string }>`
  width: ${({ $percent }) => $percent}%;
  background: ${({ $cor }) => $cor};
  transition: width ${theme.transitions.normal};

  /* Uma etapa de 1% vira um fio invisível: o mínimo garante que ela ainda
     exista na faixa, mesmo desproporcional. */
  min-width: 2px;

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

export const HistoricoResumoLegenda = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.sm} ${theme.spacing.md};
  margin-top: ${theme.spacing.sm};
`;

export const HistoricoResumoLegendaItem = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  font-size: ${theme.fontSize.xs};
  color: ${theme.colors.mutedForeground};

  strong {
    font-weight: ${theme.fontWeight.medium};
    color: ${theme.colors.foreground};
  }
`;

/**
 * A barra de filtros do Histórico: uma linha, acima da timeline.
 *
 * ⭐ **Era um card "Filtros"** sempre aberto, com cinco grupos em duas linhas,
 * ocupando meia tela antes de a primeira mudança do histórico aparecer. Filtro
 * é ferramenta, não conteúdo: fica rente, compacto, e o que ele filtra é que
 * ganha o espaço.
 */
export const HistoricoBarraFiltros = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${theme.spacing.sm} ${theme.spacing.md};
  padding: ${theme.spacing.sm} 0;
  border-bottom: 1px solid ${theme.colors.border};
`;

/** Um par rótulo + controle, deitado. O rótulo é pequeno e em caixa alta para
 *  não competir com as pastilhas que vêm depois dele. */
export const HistoricoFiltroCampo = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  min-width: 0;
`;

export const HistoricoFiltroTitulo = styled.span`
  flex-shrink: 0;
  font-size: ${theme.fontSize.xs};
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: ${theme.colors.mutedForeground};
`;

/** O botão "Datas" e o popover que ele abre. `relative` para o popover se
 *  ancorar nele. */
export const HistoricoDatasWrap = styled.div`
  position: relative;
`;

export const HistoricoDatasPopover = styled.div`
  position: absolute;
  top: calc(100% + 0.375rem);
  left: 0;
  z-index: ${theme.zIndex.popover};
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md};
  min-width: 15rem;
  border-radius: ${theme.borderRadius.lg};
  border: 1px solid ${theme.colors.border};
  background: ${theme.colors.background};
  box-shadow: ${theme.shadows.lg};

  /* Perto da borda direita da tela o popover ancorado à esquerda estouraria
     a viewport. */
  @media (max-width: ${theme.breakpoints.sm}px) {
    left: auto;
    right: 0;
  }
`;

/**
 * O rodapé da timeline, onde mora "Limpar histórico".
 *
 * ⚠ **Ação destrutiva não mora em card de filtro.** Ela estava no cabeçalho do
 * card "Filtros", ao lado de controles que só mudam o que se vê — vizinhança
 * que sugere que ela também só muda a exibição. Aqui embaixo, depois de tudo
 * que ela afeta, e sem competir com nada.
 */
export const HistoricoRodape = styled.div`
  display: flex;
  justify-content: center;
  padding-top: ${theme.spacing.lg};
  margin-top: ${theme.spacing.md};
  border-top: 1px solid ${theme.colors.border};
`;

export const HistoricoResumoLista = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
`;

export const HistoricoResumoLinha = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

export const HistoricoResumoCabecalho = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: ${theme.fontSize.xs};
  color: ${theme.colors.mutedForeground};
`;

export const HistoricoResumoNome = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  font-weight: ${theme.fontWeight.medium};
  color: ${theme.colors.foreground};
`;

export const HistoricoResumoBarraTrilha = styled.div`
  height: 0.4rem;
  border-radius: ${theme.borderRadius.full};
  background: ${theme.colors.secondary};
  overflow: hidden;
`;

export const HistoricoResumoBarraFill = styled.div<{ $percent: number; $cor: string }>`
  height: 100%;
  width: ${({ $percent }) => $percent}%;
  background: ${({ $cor }) => $cor};
  border-radius: ${theme.borderRadius.full};
  transition: width ${theme.transitions.normal};
`;

/**
 * Uma linha de filtros dentro do card "Filtros" do histórico, Etapa sozinha
 * numa linha (pode ter muitas pílulas), Quem alterou/Período/De/Até juntos
 * na linha de baixo, separadas por `FrenteFilterDivisor`. Duas linhas com
 * propósito claro, em vez de tudo espremido junto sem agrupamento.
 */
export const HistoricoFiltroLinha = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: ${theme.spacing.md};
  margin-bottom: ${theme.spacing.md};

  &:last-child {
    margin-bottom: 0;
  }
`;

export const HistoricoFiltroGrupo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  min-width: 10rem;
`;

export const HistoricoFiltroLabel = styled.label`
  font-size: ${theme.fontSize.xs};
  font-weight: ${theme.fontWeight.medium};
  color: ${theme.colors.mutedForeground};
`;

export const HistoricoFiltroPills = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
`;

/** O botão "Etapas" e o popover que ele abre. `relative` para o popover se
 *  ancorar nele, igual ao par do "Datas" logo abaixo. */
export const HistoricoEtapasWrap = styled.div`
  position: relative;
`;

/**
 * A lista de etapas que o botão "Etapas" abre.
 *
 * ⭐ **Era uma fileira de pastilhas sempre aberta.** Com seis etapas ela
 * quebrava em duas linhas e empurrava "Quem" e "Período" para baixo, e o
 * primeiro controle da barra era o que mais ocupava espaço nela.
 *
 * 📐 **Flutua, não empurra.** `position: absolute` tira a lista do fluxo: o
 * resto da barra e a linha do tempo abaixo ficam exatamente onde estavam, e
 * abrir o filtro não reposiciona nada na página. Mesma mecânica do popover de
 * "Datas", que é o vizinho dele nesta barra.
 *
 * ⚠ **Sem `max-height` e sem `overflow`, de propósito.** Uma lista de filtro
 * com rolagem própria esconde opções atrás de um segundo gesto e cria uma área
 * que rouba a roda do mouse de quem só queria descer a página. Ela cresce o
 * quanto precisar.
 */
export const HistoricoEtapasPopover = styled.div`
  position: absolute;
  top: calc(100% + 0.375rem);
  left: 0;
  z-index: ${theme.zIndex.popover};
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  padding: 0.375rem;
  min-width: 13rem;
  width: max-content;
  border-radius: ${theme.borderRadius.lg};
  border: 1px solid ${theme.colors.border};
  background: ${theme.colors.background};
  box-shadow: ${theme.shadows.lg};

  /* Perto da borda direita da tela o popover ancorado à esquerda estouraria a
     viewport. */
  @media (max-width: ${theme.breakpoints.sm}px) {
    left: auto;
    right: 0;
  }
`;

/** Uma etapa da lista. A linha inteira é o alvo, não só o texto. */
export const HistoricoEtapaOpcao = styled.button<{ $ativo: boolean; $cor: string }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.4rem 0.5rem;
  border: none;
  border-radius: ${theme.borderRadius.sm};
  background: ${({ $ativo, $cor }) =>
    $ativo ? `color-mix(in srgb, ${$cor} 14%, transparent)` : "transparent"};
  color: ${({ $ativo }) => ($ativo ? theme.colors.foreground : theme.colors.mutedForeground)};
  font-size: ${theme.fontSize.sm};
  font-weight: ${({ $ativo }) => ($ativo ? theme.fontWeight.medium : theme.fontWeight.normal)};
  text-align: left;
  cursor: pointer;
  transition: background ${theme.transitions.fast}, color ${theme.transitions.fast};

  &:hover {
    background: ${({ $ativo, $cor }) =>
      $ativo ? `color-mix(in srgb, ${$cor} 20%, transparent)` : theme.colors.muted};
    color: ${theme.colors.foreground};
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.ring};
    outline-offset: -2px;
  }

  /* Alvo de toque de 44px no celular, que é onde a lista mais aparece — a
     barra quebra e ela ocupa a largura toda. */
  @media (max-width: ${theme.breakpoints.md}px) {
    min-height: 2.75rem;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

/** O nome da etapa, que empurra o "check" para a direita da linha. */
export const HistoricoEtapaNome = styled.span`
  flex: 1;
  min-width: 0;
`;

export const HistoricoFiltroPill = styled.button<{ $ativo: boolean; $cor: string }>`
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.625rem;
  border-radius: ${theme.borderRadius.full};
  border: 1px solid ${({ $ativo, $cor }) => ($ativo ? $cor : theme.colors.border)};
  background: ${({ $ativo, $cor }) =>
    $ativo ? "color-mix(in srgb, " + $cor + " 16%, var(--atlas-card))" : theme.colors.background};
  color: ${({ $ativo }) => ($ativo ? theme.colors.foreground : theme.colors.mutedForeground)};
  font-size: ${theme.fontSize.xs};
  font-weight: ${theme.fontWeight.medium};
  cursor: pointer;
  transition: border-color ${theme.transitions.fast}, background ${theme.transitions.fast};

  &:hover {
    border-color: ${({ $cor }) => $cor};
  }
`;

/* O filtro de escopo do Cronograma: mesma pastilha de `FrenteToggle`
   (ProjetoNovo.styled), só que single-select — poucos escopos por projeto,
   cabem lado a lado, e o dropdown escondia a opção "Todos os escopos" atrás
   de um clique a mais para algo que é trocado o tempo todo. */
export const EscopoFiltroLista = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.sm};
`;

export const EscopoFiltroBotao = styled.button<{ $ativo: boolean }>`
  display: inline-flex;
  align-items: center;
  min-height: 2.25rem;
  padding: 0 0.875rem;
  border-radius: ${theme.borderRadius.full};
  font-size: ${theme.fontSize.sm};
  font-weight: ${theme.fontWeight.medium};
  cursor: pointer;
  transition: background ${theme.transitions.fast}, border-color ${theme.transitions.fast},
    color ${theme.transitions.fast};

  ${({ $ativo }) =>
    $ativo
      ? css`
          border: 1px solid ${theme.colors.primary};
          background: color-mix(in srgb, ${theme.colors.primary} 10%, var(--atlas-card));
          color: ${theme.colors.primary};
        `
      : css`
          border: 1px solid ${theme.colors.border};
          background: ${theme.colors.background};
          color: ${theme.colors.foreground};

          &:hover {
            background: ${theme.colors.muted};
          }
        `}
`;

export const HistoricoLimparFiltros = styled.button`
  align-self: flex-end;
  padding: 0.5rem 0;
  border: none;
  background: none;
  font-size: ${theme.fontSize.xs};
  font-weight: ${theme.fontWeight.medium};
  color: ${theme.colors.primary};
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
`;

export const HistoricoAutorChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.125rem 0.5rem;
  border-radius: ${theme.borderRadius.full};
  background: ${theme.colors.secondary};
  color: ${theme.colors.foreground};
  font-weight: ${theme.fontWeight.medium};
`;

/* ─────────────────────────────────────────────  · linha do tempo horizontal
 *
 * ⭐ **A timeline era VERTICAL: um fio à esquerda com uma bolinha por
 * registro.** Aquilo tinha o defeito de tratar tempo como espaço de lista —
 * dois eventos do mesmo dia e dois separados por seis semanas ficavam à mesma
 * distância um do outro, e a única forma de saber onde o tempo tinha ido era
 * ler as datas uma a uma. Também gastava 2,25rem de largura em TODA linha para
 * desenhar um fio que não dizia nada.
 *
 * Agora o tempo corre na horizontal, que é o eixo em que a gente já lê tempo
 * (o cronograma da aba ao lado corre assim, e todo calendário também), e a
 * DISTÂNCIA entre dois nós é proporcional aos dias que passaram entre eles:
 * um vão grande na régua é um período grande sem nada acontecendo. O tamanho
 * do nó cresce com quantos registros o dia tem.
 *
 * 📐 A régua é NAVEGAÇÃO e panorama; a leitura continua embaixo, numa lista
 * vertical. Texto corrido em coluna de 260px, rolando para o lado, seria pior
 * de ler do que o que já existia — e uma justificativa de atraso é texto
 * livre, às vezes longo. Uma timeline só: a lista perdeu o fio e as bolinhas,
 * senão seriam duas linhas do tempo competindo na mesma tela.
 */

export const HistoricoPeriodoPills = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
`;

export const HistoricoReguaCabecalho = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: ${theme.spacing.sm};
`;

/** "23 de junho → 19 de agosto · 57 dias · 41 registros": o vão da régua dito
 *  em palavras, porque proporção desenhada não se lê como número. */
export const HistoricoReguaResumo = styled.p`
  margin: 0;
  font-size: ${theme.fontSize.xs};
  color: ${theme.colors.mutedForeground};
`;

/**
 * A janela por onde a régua é vista.
 *
 * ⚠ O scroll lateral é DESTA caixa, nunca da página: a regra é a página
 * caber na largura da viewport, e uma régua de seis meses não cabe. O
 * `overscroll-behavior` impede que chegar ao fim da régua continue arrastando
 * a página junto.
 */
export const HistoricoReguaViewport = styled.div`
  position: relative;
  overflow-x: auto;
  overflow-y: hidden;
  overscroll-behavior-x: contain;
  scrollbar-width: thin;
  scrollbar-color: ${theme.colors.border} transparent;
  /* O foco do teclado num nó não pode ser cortado pela borda da janela. */
  padding: 0.25rem 0;

  &::-webkit-scrollbar {
    height: 6px;
  }
  &::-webkit-scrollbar-thumb {
    border-radius: ${theme.borderRadius.full};
    background: ${theme.colors.border};
  }
`;

/**
 * A pista, tão larga quanto o tempo pedir — e nunca menor que a janela.
 *
 * `max(100%, Xpx)`: quando o histórico é curto a pista se estica para ocupar
 * o card inteiro (e as posições, em %, se espalham junto); quando é longo, ela
 * passa da janela e a caixa acima rola. Uma régua de 300px encolhida no canto
 * de um card de 900px pareceria um erro de layout.
 */
export const HistoricoReguaPista = styled.div<{ $largura: number }>`
  position: relative;
  height: 5.25rem;
  width: ${({ $largura }) => `max(100%, ${$largura}px)`};
  /* Respiro nas pontas para o primeiro e o último nó não encostarem na borda,
     e para o rótulo do dia selecionado caber sobre eles. */
  padding: 0 2.25rem;
`;

/** A caixa interna a que as posições em % se referem (a pista tem padding, e
 *  `position: absolute` mediria a borda, não o conteúdo). */
export const HistoricoReguaEixo = styled.div`
  position: relative;
  height: 100%;

  /* O fio. Some nas duas pontas em vez de terminar em corte seco: a régua
     mostra um recorte do tempo, e uma borda dura afirmaria um começo e um fim
     que o histórico não tem. */
  &::before {
    content: "";
    position: absolute;
    left: 0;
    right: 0;
    top: 2.5rem;
    height: 2px;
    border-radius: ${theme.borderRadius.full};
    background: linear-gradient(
      90deg,
      transparent,
      ${theme.colors.border} 4%,
      ${theme.colors.border} 96%,
      transparent
    );
  }
`;

/**
 * ⭐ **Um nó por EVENTO, não por dia.**
 *
 * A régua dizia "neste dia houve 3 registros" e nada sobre o que foram — para
 * saber, era preciso ir na lista embaixo, que é justamente a lista que saiu.
 * Cada marca agora é uma coisa que foi feita, com a cor da natureza dela.
 *
 * 📐 A área clicável (`$largura`) é maior que o desenho e varia: entre DIAS
 * ela vale os 44px do alvo de toque; entre eventos do MESMO dia ela encolhe
 * para o passo do leque, porque aí as áreas não podem se sobrepor — e errar
 * o vizinho de leque é inofensivo, já que os dois abrem o mesmo painel.
 */
export const HistoricoReguaNo = styled.button<{
  $x: number;
  $largura: number;
  $tamanho: number;
  $cor: string;
  $ativo: boolean;
}>`
  position: absolute;
  left: ${({ $x }) => $x}%;
  top: 2.5rem;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  justify-content: center;
  width: ${({ $largura }) => $largura}px;
  height: 2.75rem;
  padding: 0;
  border: none;
  border-radius: ${theme.borderRadius.full};
  background: transparent;
  cursor: pointer;

  &::before {
    content: "";
    width: ${({ $tamanho }) => $tamanho}px;
    height: ${({ $tamanho }) => $tamanho}px;
    border-radius: 50%;
    background: ${({ $cor }) => $cor};
    /* O anel é da cor do FUNDO: serve só para o fio não passar por dentro do
       ponto. Halo colorido aqui multiplicaria a área de cor da régua. */
    box-shadow: 0 0 0 3px ${theme.colors.background};
    transition: transform ${theme.transitions.fast}, box-shadow ${theme.transitions.fast};
  }

  /* Só o ponto cresce, e por transform: a posição do nó na régua é o dado que
     ele carrega, e mexer em width/left no hover moveria a informação. */
  &:hover::before {
    transform: scale(1.35);
  }

  ${({ $ativo, $cor }) =>
    $ativo &&
    css`
      &::before {
        transform: scale(1.35);
        box-shadow:
          0 0 0 3px ${theme.colors.background},
          0 0 0 5px ${$cor};
      }
    `}

  &:focus-visible {
    outline: 2px solid ${theme.colors.ring};
    outline-offset: -6px;
  }

  @media (prefers-reduced-motion: reduce) {
    &::before {
      transition: none;
    }
  }
`;

/**
 * A caixa que ancora o pop-up.
 *
 * ⚠ O pop-up **não pode morar dentro da janela que rola**: `overflow-x: auto`
 * força o eixo vertical a recortar junto (é regra do CSS, `visible` vira
 * `auto` quando o outro eixo não é `visible`), e o pop-up sairia cortado. Ele
 * fica aqui fora, posicionado por pixel a partir da posição do nó na tela.
 */
export const HistoricoReguaBloco = styled.div`
  position: relative;
`;

/**
 * ⭐ **A espiada: o que foi aquele evento, sem sair do lugar.**
 *
 * Fica ABAIXO do fio, por cima do painel do dia, e não acima: o mouse vem de
 * cima, e um cartão nascendo debaixo do cursor empurraria o ponteiro para fora
 * do nó — o pop-up piscaria sem parar. `pointer-events: none` fecha a
 * questão: ele nunca disputa o mouse com a régua.
 *
 * ⚠ Isto é uma ESPIADA, nunca o único caminho até o conteúdo. Celular não tem
 * hover, e esta aba já apanhou disso antes; quem toca abre o painel, que traz
 * o mesmo texto por inteiro, com autor e com o botão de excluir.
 */
export const HistoricoReguaPopup = styled.div<{ $x: number; $seta: number; $cor: string }>`
  position: absolute;
  left: ${({ $x }) => $x}px;
  top: 3.6rem;
  z-index: 20;
  transform: translateX(-50%);
  /* Largura FIXA, e não max-content: é ela que deixa o cálculo de quanto o
     cartão pode ser empurrado para dentro da borda ser exato. Com largura
     variável, encostar na borda viraria chute e a seta apontaria para o
     lugar errado. */
  width: min(17rem, 100%);
  padding: 0.5rem 0.625rem;
  border: 1px solid ${theme.colors.border};
  border-left: 3px solid ${({ $cor }) => $cor};
  border-radius: ${theme.borderRadius.md};
  background: ${theme.colors.popover};
  box-shadow: ${theme.shadows.lg};
  pointer-events: none;

  /* A setinha que liga o cartão ao ponto de onde ele saiu. Sem ela, num dia
     cheio, não dá para saber a qual das marcas o texto se refere.

     ⚠ Ela NÃO fica no meio do cartão: perto das bordas o cartão é empurrado
     para dentro para não vazar, e uma seta cravada em 50% passaria a apontar
     para um vizinho — pior do que não ter seta. O deslocamento é exatamente
     o quanto o cartão andou. */
  &::before {
    content: "";
    position: absolute;
    left: calc(50% + ${({ $seta }) => $seta}px);
    top: -5px;
    width: 8px;
    height: 8px;
    transform: translateX(-50%) rotate(45deg);
    border-left: 1px solid ${theme.colors.border};
    border-top: 1px solid ${theme.colors.border};
    background: ${theme.colors.popover};
  }
`;

export const HistoricoReguaPopupTitulo = styled.p`
  margin: 0.25rem 0 0;
  font-size: ${theme.fontSize.sm};
  font-weight: ${theme.fontWeight.medium};
  color: ${theme.colors.foreground};
`;

/** O detalhe, cortado em duas linhas: espiada é espiada. O texto inteiro está
 *  no painel, a um clique. */
export const HistoricoReguaPopupTexto = styled.p`
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin: 0.25rem 0 0;
  font-size: ${theme.fontSize.xs};
  line-height: 1.45;
  color: ${theme.colors.mutedForeground};
`;

/**
 * O painel do dia, encaixado logo abaixo da régua.
 *
 * É ele que faz a régua valer sozinha: sem um lugar onde o evento se abre por
 * inteiro, a linha do tempo é bonita e não serve para nada — foi o que
 * aconteceu na primeira versão, com a lista vertical roubando o papel dela.
 */
export const HistoricoPainelDia = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
  margin-top: ${theme.spacing.md};
  padding-top: ${theme.spacing.md};
  border-top: 1px solid ${theme.colors.border};
`;

/** "clique numa marca da régua" — o que aparece antes do primeiro clique não
 *  é um vazio, é uma instrução. */
export const HistoricoPainelDica = styled.p`
  margin: 0;
  font-size: ${theme.fontSize.xs};
  color: ${theme.colors.mutedForeground};
`;

/**
 * O mês, embaixo do fio, com um risquinho onde ele começa.
 *
 * Sem isto a régua seria uma fileira de pontos sem escala — dá para ver que
 * houve um vão, mas não de quanto. Um rótulo por dia encheria tudo de texto
 * girado; um por mês ancora sem poluir.
 */
export const HistoricoReguaMes = styled.span<{ $x: number }>`
  position: absolute;
  left: ${({ $x }) => $x}%;
  top: 3.4rem;
  transform: translateX(-50%);
  font-size: ${theme.fontSize.xs};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${theme.colors.mutedForeground};
  white-space: nowrap;
  pointer-events: none;

  &::before {
    content: "";
    position: absolute;
    left: 50%;
    top: -0.6rem;
    width: 1px;
    height: 0.4rem;
    background: ${theme.colors.border};
  }
`;

/* ── o painel do dia, embaixo da régua ──────────────────── */

/**
 * O cabeçalho do dia que a régua abriu.
 *
 * ⚠ `scroll-margin-top` não é enfeite: sem ele o dia para colado no topo da
 * viewport, e no celular ainda por baixo do cabeçalho do projeto.
 */
export const HistoricoTimelineDiaTitulo = styled.p<{ $ativo?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0 0 ${theme.spacing.sm};
  scroll-margin-top: 5rem;
  font-size: ${theme.fontSize.xs};
  font-weight: ${theme.fontWeight.semibold};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${({ $ativo }) => ($ativo ? theme.colors.foreground : theme.colors.mutedForeground)};

  /* O fio que sobrou da timeline antiga, deitado: separa os dias sem custar
     uma coluna de largura em cada item. */
  &::after {
    content: "";
    flex: 1;
    height: 1px;
    background: ${theme.colors.border};
  }
`;

export const HistoricoTimelineItem = styled.div`
  display: block;
  min-width: 0;

  & + & {
    margin-top: ${theme.spacing.sm};
  }
`;

const realce = keyframes`
  0%, 100% { background: transparent; }
  25%, 75% { background: color-mix(in srgb, ${theme.colors.primary} 12%, transparent); }
`;

/**
 * $destaque/$realcado: uma nota de atraso ou remarcação de
 * banca, em vez de uma transição de status, ganha uma faixa à esquerda pra
 * se destacar na timeline, e pulsa quando a pessoa chega aqui direto pelo
 * link "Justificar atraso" (#justificativa-N/#remarcacao-N).
 */
export const HistoricoTimelineConteudo = styled.div<{
  $destaque?: boolean;
  $realcado?: boolean;
  /** A cor da borda esquerda do cartão, neutra por padrão.
   *
   *  Era vermelha cravada, de quando só a remarcação usava o destaque. Com
   *  seis naturezas de evento na timeline, colorir a moldura enchia a coluna
   *  de vermelho e verde e tudo passava a parecer alerta. A cor vive na
   *  etiqueta, que é um acento por linha; a moldura só delimita. */
}>`
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  min-width: 0;
  /* Espaço pro scroll não esconder o item embaixo de nada quando a gente
     pula direto pra ele vindo de "Justificar atraso". */
  scroll-margin-top: 5rem;

  ${({ $destaque }) =>
    $destaque &&
    css`
      padding: ${theme.spacing.sm} ${theme.spacing.md};
      border-radius: ${theme.borderRadius.md};
      background: color-mix(in srgb, ${theme.colors.mutedForeground} 4%, transparent);
      /* ⚠ A borda esquerda era colorida, na cor do evento, e somava mais uma
         superfície de cor por linha. O fundo cinza já separa o bloco; a cor
         fica reservada ao realce transitório de quem chega por âncora
         (#justificativa-7), que é o único caso em que ela precisa saltar. */
      border-left: 3px solid ${theme.colors.border};
    `}

  ${({ $realcado }) =>
    $realcado &&
    css`
      animation: ${realce} 1.8s ease-in-out;
    `}
`;

export const HistoricoTimelineTransicao = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

export const HistoricoTimelineMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: ${theme.fontSize.xs};
  color: ${theme.colors.mutedForeground};
`;

/** , a linha de nota de atraso ocupa a largura toda: é texto livre da
 *  diretoria, não cabe ao lado de uma pílula de status como a transição. */
export const HistoricoNotaLinha = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  width: 100%;
`;

export const HistoricoNotaCabecalho = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

/** Mesma proporção de `StatusPilula`/`FrenteTag`, antes era bem maior e mais
 *  pesada que as pílulas de etapa ao lado dela na timeline, duas linguagens
 *  visuais diferentes na mesma lista. */
export const HistoricoNotaTag = styled.span`
  display: inline-flex;
  align-items: center;
  /* Mesma razão de HistoricoTipoTag: a cor no texto, não numa pastilha. */
  color: ${theme.colors.destructive};
  font-size: ${theme.fontSize.xs};
  font-weight: ${theme.fontWeight.semibold};
  text-transform: uppercase;
  letter-spacing: 0.04em;
`;

/**
 * O contexto da nota (tipo do motivo + escopo), texto corrido separado por
 * "·", não uma segunda pílula ao lado de `HistoricoNotaTag`. Duas caixas e
 * um texto solto na mesma linha (o formato antigo) misturava linguagens
 * visuais diferentes pro mesmo tipo de informação; "Remarcação de Banca" já
 * mostrava o escopo assim, isto só alinha "Justificativa de Atraso" ao
 * mesmo padrão.
 */
export const HistoricoNotaMotivo = styled.span`
  font-size: ${theme.fontSize.xs};
  color: ${theme.colors.mutedForeground};
`;

export const HistoricoNotaTexto = styled.p`
  margin: 0;
  font-size: ${theme.fontSize.sm};
  line-height: 1.5;
  color: ${theme.colors.foreground};
  white-space: pre-wrap;
`;

/** Excluir uma nota, não é edição de rotina, então fica discreto
 *  e vermelho, só pra quem tem a permissão (a mesma trava de quem registra). */
export const HistoricoExcluirBtn = styled.button`
  align-self: flex-start;
  padding: 0;
  border: none;
  background: none;
  font-size: ${theme.fontSize.xs};
  font-weight: ${theme.fontWeight.medium};
  color: ${theme.colors.destructive};
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
`;


/** Os botões do cabeçalho da aba de tarefas, lado a lado. */
export const HeaderAcoes = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
`;

/* ------------------------------------------------------------------ */
/* Bancas por frente                                       */
/* ------------------------------------------------------------------ */

/** Um bloco por frente que o projeto contempla. */
export const FrenteBloco = styled.section`
  & + & {
    margin-top: ${theme.spacing.lg};
    padding-top: ${theme.spacing.lg};
    border-top: 1px solid ${theme.colors.border};
  }
`;

export const FrenteCabecalho = styled.header`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  margin-bottom: ${theme.spacing.sm};

  h3 {
    margin: 0;
    font-size: ${theme.fontSize.sm};
    font-weight: ${theme.fontWeight.semibold};
    color: ${theme.colors.foreground};
  }

  small {
    color: ${theme.colors.mutedForeground};
    font-size: ${theme.fontSize.xs};
  }
`;

export const BancaLinha = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.sm} 0;

  & + & {
    border-top: 1px dashed ${theme.colors.border};
  }
`;

/** O nome do escopo, que ocupa a folga e empurra data e status para a direita.
 *
 * O `small` é o aviso de banca compartilhada, quando a mesma banca avalia
 * mais de um escopo, cada linha diz com quem divide, senão a data repetida em
 * duas linhas pareceria erro de cadastro. */
export const BancaEscopo = styled.span`
  flex: 1;
  min-width: 10rem;
  font-size: ${theme.fontSize.sm};
  color: ${theme.colors.foreground};

  small {
    display: block;
    margin-top: 2px;
    font-size: ${theme.fontSize.xs};
    color: ${theme.colors.mutedForeground};
  }
`;

export const BancaData = styled.span`
  font-size: ${theme.fontSize.sm};
  font-variant-numeric: tabular-nums;
  color: ${theme.colors.foreground};
`;

/* ------------------------------------------------------------------ */
/* Escolher os escopos que entram numa banca                           */
/* ------------------------------------------------------------------ */

/** A lista de escopos do projeto dentro do modal de marcar banca. */
export const EscopoPicker = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.borderRadius.md};
  padding: ${theme.spacing.xs};
  max-height: 14rem;
  overflow-y: auto;
`;

/** Uma opção da lista. `$bloqueado` = escopo que já tem banca própria. */
export const EscopoOpcao = styled.label<{ $bloqueado?: boolean }>`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  border-radius: ${theme.borderRadius.sm};
  font-size: ${theme.fontSize.sm};
  color: ${({ $bloqueado }) =>
    $bloqueado ? theme.colors.mutedForeground : theme.colors.foreground};
  cursor: ${({ $bloqueado }) => ($bloqueado ? "not-allowed" : "pointer")};

  &:hover {
    background: ${({ $bloqueado }) => ($bloqueado ? "transparent" : theme.colors.muted)};
  }

  input {
    accent-color: ${theme.colors.primary};
  }

  span {
    flex: 1;
  }

  small {
    font-size: ${theme.fontSize.xs};
    color: ${theme.colors.mutedForeground};
  }
`;

/**
 * A etiqueta de tipo das linhas do Histórico, com a cor passada por quem usa.
 *
 * `HistoricoNotaTag` existe desde antes, mas com o vermelho cravado, servia a
 * um tipo só (remarcação). Com seis fontes na timeline, a cor precisa dizer
 * de que natureza é o evento: pedido é neutro, aprovação é verde, recusa é
 * vermelha, anotação de reunião é azul. Mesma forma, cor por parâmetro.
 */
export const HistoricoTipoTag = styled.span<{ $cor: string }>`
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  /* ⚠ **Sem pastilha: a cor vive só no texto.**
     Era borda + fundo tingido + texto colorido, e numa página com dez eventos
     por dia isso eram dez superfícies coloridas competindo com as pílulas de
     status, que usam OUTRA paleta (a das etapas). A cor continua fazendo a
     leitura rápida que APARENCIA_EVENTO justifica, sem mais um retângulo
     pintado por linha. */
  color: ${({ $cor }) => theme.clarear($cor)};
  font-size: ${theme.fontSize.xs};
  font-weight: ${theme.fontWeight.semibold};
  text-transform: uppercase;
  letter-spacing: 0.04em;
`;

/** "aguardando a diretoria", o estado de um pedido ainda sem resposta. */
export const HistoricoAguardando = styled.span`
  font-size: ${theme.fontSize.xs};
  font-style: italic;
  color: ${theme.colors.mutedForeground};
`;

/* ---------------------------------------------- contexto no cabeçalho fixo */

/**
 * A descrição do projeto no cabeçalho, cortada em duas linhas.
 *
 * ⭐ Ela subiu do card "Descrição" da Visão geral para cá em 14/08/2026: é a
 * resposta para "do que se trata este projeto", e quem precisa dela precisa em
 * qualquer aba — não só na primeira.
 *
 * 📐 Cortada em duas linhas porque é texto livre e cresce sem limite. Um
 * cabeçalho fixo que muda de altura conforme o tamanho da descrição empurraria
 * as abas para baixo em uns projetos e não em outros.
 */
export const DescricaoCabecalho = styled.p<{ $inteira: boolean }>`
  margin: 0.15rem 0 0;
  font-size: ${theme.fontSize.sm};
  line-height: 1.45;
  color: ${theme.colors.mutedForeground};
  max-width: 68ch;

  ${({ $inteira }) =>
    !$inteira &&
    `
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  `}
`;

export const DescricaoVerMais = styled.button`
  align-self: flex-start;
  margin-top: 0.1rem;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  font-size: ${theme.fontSize.xs};
  font-weight: ${theme.fontWeight.medium};
  color: ${theme.colors.primary};

  &:hover {
    text-decoration: underline;
  }
`;

/** A equipe no cabeçalho: coordenação e consultores lado a lado. */
export const EquipeCabecalho = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: ${theme.spacing.sm};
  margin-top: 0.35rem;
`;

export const EquipeGrupo = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  flex-wrap: wrap;
`;

export const EquipeRotulo = styled.span`
  display: inline-flex;
  align-items: baseline;
  gap: 0.35rem;
  font-size: ${theme.fontSize.xs};
  font-weight: ${theme.fontWeight.semibold};
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: ${theme.colors.mutedForeground};
`;

/**
 * "2 de 3" — a ocupação da equipe.
 *
 * ⭐ Responde "ainda cabe gente?" sem ninguém contar avatares, que é a
 * pergunta de quem vai alocar. Colado ao rótulo que ele conta: solto, o número
 * não diz de quê.
 */
export const EquipeOcupacao = styled.span<{ $cheio: boolean }>`
  font-size: ${theme.fontSize.xs};
  font-weight: ${theme.fontWeight.medium};
  font-variant-numeric: tabular-nums;
  text-transform: none;
  letter-spacing: 0;
  color: ${({ $cheio }) => ($cheio ? theme.colors.mutedForeground : theme.colors.primary)};
`;

export const EquipePessoa = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: ${theme.fontSize.sm};
  color: ${theme.colors.foreground};
`;

/** As iniciais. Cor derivada do id: a mesma pessoa é sempre a mesma cor. */
export const EquipeAvatar = styled.span<{ $cor: string }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: ${theme.borderRadius.full};
  background: ${({ $cor }) => $cor};
  color: #fff;
  font-size: 0.62rem;
  font-weight: ${theme.fontWeight.semibold};
  flex-shrink: 0;
`;

export const EquipeVazia = styled.span`
  font-size: ${theme.fontSize.sm};
  font-style: italic;
  color: ${theme.colors.mutedForeground};
`;

/** A linha da proposta na Visão geral: link e/ou anexo, lado a lado. */
export const PropostaLinha = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  flex-wrap: wrap;
`;

/**
 * A proposta no cabeçalho, ao lado do nome.
 *
 * ⭐ **Pílula com borda, não texto solto.** A primeira versão era só um ícone
 * cinza sem contorno — do tamanho de um pixel perdido ao lado de um título
 * grande, ninguém achava que aquilo era clicável. A mesma borda e o mesmo
 * arredondamento da `FrenteTag` ao lado fazem ela se anunciar como algo que
 * se aperta, sem competir em peso visual com o nome do projeto.
 */
const propostaBase = css`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.2rem 0.6rem;
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.borderRadius.full};
  background: ${theme.colors.secondary};
  cursor: pointer;
  font-size: ${theme.fontSize.xs};
  font-weight: ${theme.fontWeight.medium};
  color: ${theme.colors.foreground};
  text-decoration: none;

  &:hover {
    background: ${theme.colors.muted};
    border-color: ${theme.colors.mutedForeground};
  }

  &:disabled {
    cursor: default;
    opacity: 0.6;
  }
`;

export const PropostaLink = styled.a`
  ${propostaBase}
`;

export const PropostaBotao = styled.button`
  ${propostaBase}
`;

/**
 * Os avisos do Cronograma, num bloco só.
 *
 * ⭐ **Eram três `AvisoBanner` soltos** em dois pontos da página — janela do
 * escopo e carimbo de oficialização antes da barra, conflito de calendário
 * depois dela. Cada um com a própria caixa, a própria borda e o próprio
 * espaçamento: três blocos de peso igual empilhados antes de o calendário
 * aparecer, e o terceiro separado dos outros dois sem que nada explicasse por
 * quê.
 *
 * 📐 Aqui é uma caixa com uma linha por aviso. Continuam sendo assuntos
 * distintos — só param de custar três caixas.
 */
export const BlocoAvisos = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border-radius: ${theme.borderRadius.lg};
  border: 1px solid ${theme.colors.border};
  background: ${theme.colors.muted};
`;

export const LinhaAviso = styled.div<{ $tom?: "atencao" }>`
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  font-size: ${theme.fontSize.sm};
  line-height: 1.5;
  color: ${({ $tom }) =>
    $tom === "atencao" ? theme.colors.warningForeground : theme.colors.foreground};

  /* O ícone alinha com a primeira linha do texto, não com o centro do
     parágrafo — num aviso de três linhas, centralizado ele fica solto no
     meio do nada. */
  svg {
    flex-shrink: 0;
    margin-top: 0.15rem;
    color: ${({ $tom }) =>
      $tom === "atencao" ? theme.colors.warning : theme.colors.mutedForeground};
  }
`;

/* ------------------------------------------------------------------ */
/* Card de Equipe (aba Visão geral)                                    */
/* ------------------------------------------------------------------ */

/**
 * A equipe por extenso, na Visão geral.
 *
 * ⭐ Este card nasceu quando o cabeçalho encolheu: lá a equipe virou pilha de
 * rostos (reconhecer é instantâneo, e era isso que o bloco de nomes fazia
 * ocupando três linhas no topo de TODAS as abas), e os nomes precisavam de um
 * lugar legível. Aqui há espaço, e é onde já se vem conferir o cadastro.
 */
export const EquipeSecao = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.375rem;

  & + & {
    margin-top: ${theme.spacing.md};
    padding-top: ${theme.spacing.md};
    border-top: 1px solid ${theme.colors.border};
  }
`;

export const EquipeSecaoTitulo = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${theme.spacing.sm};
  font-size: ${theme.fontSize.xs};
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: ${theme.colors.mutedForeground};
`;

/** "3 de 4". Fica vermelho quando o time enche — é o que responde
 *  "ainda cabe gente?", a pergunta que traz alguém a esta lista. */
export const EquipeContagem = styled.span<{ $cheio: boolean }>`
  text-transform: none;
  letter-spacing: 0;
  font-weight: ${theme.fontWeight.medium};
  color: ${({ $cheio }) => ($cheio ? theme.colors.primary : theme.colors.mutedForeground)};
`;

export const EquipeLinhaPessoa = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: ${theme.fontSize.sm};
  color: ${theme.colors.foreground};
`;

export const EquipeAvatarLista = styled.span<{ $cor: string }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  flex-shrink: 0;
  border-radius: ${theme.borderRadius.full};
  background: ${({ $cor }) => $cor};
  font-size: 0.65rem;
  font-weight: ${theme.fontWeight.semibold};
  color: ${theme.colors.background};
  overflow: hidden;
`;

/**
 * A lixeira da linha de escopo vendido.
 *
 * 📐 Discreta por padrão e com contraste no hover, como o `BotaoExcluir` da
 * legenda do cronograma — visível sempre, porque no celular não existe hover
 * e um botão que só aparece no mouse fica inalcançável por lá.
 *
 * Desabilitada quando o escopo já tem banca marcada: o backend recusa, e
 * deixar clicar para devolver 422 é fazer a pessoa descobrir do jeito difícil.
 */
export const RemoverEscopoBotao = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border: none;
  border-radius: ${theme.borderRadius.sm};
  background: transparent;
  color: ${theme.colors.mutedForeground};
  opacity: 0.55;
  cursor: pointer;
  transition: opacity ${theme.transitions.fast}, background-color ${theme.transitions.fast},
    color ${theme.transitions.fast};

  &:hover:not(:disabled) {
    opacity: 1;
    background: ${theme.colors.muted};
    color: ${theme.colors.destructive};
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.ring};
    outline-offset: 1px;
  }

  &:disabled {
    opacity: 0.25;
    cursor: not-allowed;
  }
`;
