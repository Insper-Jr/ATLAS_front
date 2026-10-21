import styled from "styled-components";
import { theme } from "@/styles/theme";
import { PageStack } from "@/styles/page.styled";
import { DayCell, MonthGrid, WeekRow } from "@/components/calendario/CalendarGrid.styled";

export {
  PageHeaderRow,
  PageHeaderText,
  PageHeading,
  PageSubheading,
  ModalOverlay,
  ModalHeader,
  ModalTitle,
  ModalClose,
  ModalBody,
  ModalFooter,
  NarrowModalContent,
  DetailList,
  DetailRow,
  DetailTerm,
  DetailValue,
} from "./Bancas.styled";

/**
 * O calendário deve caber na altura da tela, não empurrar a página pra
 * rolar, é a diferença entre "abrir e já ver o mês inteiro" e "abrir e
 * primeiro descobrir que o mês continua mais embaixo". `100vh` menos o
 * padding vertical do `<Main>` (1.5rem em cima, 1.5rem embaixo, ver
 * `Layout.styled.ts`) é a altura de verdade disponível; o cabeçalho e a
 * barra de filtros ficam do tamanho que precisam, e só a grade do mês
 * (`GradeWrap`, com `flex: 1`) usa o resto.
 */
export const PaginaCalendario = styled(PageStack)`
  height: calc(100vh - 3rem);
  min-height: 0;
`;

export const MonthGridPreenche = styled(MonthGrid)`
  flex: 1;
  min-height: 0;
`;

/** A grade de 7 dias precisa de uma altura de LINHA de verdade (não `auto`)
 *  pra sobrar espaço pro `DayCell` esticar, sem isto, `flex: 1` no
 *  container não desce pras células, e a grade continua do tamanho do
 *  conteúdo mesmo com espaço livre embaixo. */
export const WeekRowPreenche = styled(WeekRow)`
  grid-template-rows: 1fr;
`;

/**
 * Sem o piso de `7.5rem` do `DayCell` padrão, aqui a célula encolhe ou
 * cresce pra caber exatamente nas 5 ou 6 semanas do mês dentro da altura
 * disponível, em vez de empurrar a página quando o mês tem 6 linhas.
 *
 * `$comEventos` dá o cursor de "isto abre algo" só quando há de fato o que abrir: dia
 * vazio não vira alvo de clique/hover à toa.
 */
export const DayCellPreenche = styled(DayCell)<{ $comEventos?: boolean }>`
  min-height: 0;
  cursor: ${({ $comEventos }) => ($comEventos ? "pointer" : "default")};

  ${({ $comEventos }) =>
    $comEventos &&
    `&:hover {
      background: ${theme.colors.secondary};
    }`}
`;

export const Cabecalho = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border: 1px solid ${theme.colors.border};
  border-bottom: none;
  border-radius: ${theme.borderRadius.xl} ${theme.borderRadius.xl} 0 0;
  background: ${theme.colors.card};
`;

export const MesAtual = styled.strong`
  font-size: ${theme.fontSize.base};
  font-weight: ${theme.fontWeight.semibold};
  text-transform: capitalize;
  color: ${theme.colors.foreground};
`;

/** Envolve `Cabecalho` + `GradeWrap`: precisa ser flex-column com `flex: 1`
 *  pra que o `flex: 1` do `GradeWrap` logo abaixo tenha um pai que de fato
 *  sobra espaço pra distribuir, sem isto, "crescer" não tem o que crescer. */
export const CorpoCalendario = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
`;

export const GradeWrap = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  border: 1px solid ${theme.colors.border};
  border-radius: 0 0 ${theme.borderRadius.xl} ${theme.borderRadius.xl};
  overflow: hidden;
  background: ${theme.colors.card};
`;

export const FiltroChips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
`;

export const Chip = styled.button<{ $ativo: boolean; $cor: string }>`
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.2rem 0.625rem;
  border-radius: ${theme.borderRadius.full};
  border: 1px solid ${({ $ativo, $cor }) => ($ativo ? $cor : theme.colors.border)};
  background: ${({ $ativo, $cor }) =>
    $ativo ? `color-mix(in srgb, ${$cor} 14%, var(--atlas-card))` : theme.colors.background};
  color: ${({ $ativo, $cor }) => ($ativo ? $cor : theme.colors.mutedForeground)};
  font-size: ${theme.fontSize.xs};
  font-weight: ${theme.fontWeight.medium};
  cursor: pointer;

  &:hover {
    border-color: ${({ $cor }) => $cor};
  }
`;

/** Só o ancoradouro do botão + painel — `position: relative` pra
 *  `PainelCores` (absoluto) abrir relativo A ELE, não à página. Não precisa
 *  de portal como o dropdown do dia: `Cabecalho` não corta overflow (quem
 *  corta é `GradeWrap`, mais abaixo, onde a grade em si vive), então um
 *  painel um pouco mais alto que a barra não é cortado. */
export const BotaoCores = styled.div`
  position: relative;
`;

export const PainelCores = styled.div`
  position: absolute;
  z-index: 30;
  top: calc(100% + 0.375rem);
  right: 0;
  display: flex;
  flex-direction: column;
  width: 13rem;
  padding: 0.5rem;
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.borderRadius.lg};
  background: ${theme.colors.card};
  box-shadow: ${theme.shadows.lg};
`;

export const TituloPainelCores = styled.p`
  margin: 0.25rem 0.5rem 0.375rem;
  font-size: ${theme.fontSize.xs};
  font-weight: ${theme.fontWeight.semibold};
  color: ${theme.colors.mutedForeground};
  text-transform: uppercase;
  letter-spacing: 0.03em;
`;

/** Cada linha é um botão de verdade (o `<label>` inteiro), não só o swatch —
 *  a área de clique maior e o fundo no hover deixam claro que dá pra clicar
 *  em qualquer parte da linha, não só no quadradinho de cor. */
export const LinhaCor = styled.label`
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.375rem 0.5rem;
  border-radius: ${theme.borderRadius.md};
  font-size: ${theme.fontSize.sm};
  color: ${theme.colors.foreground};
  cursor: pointer;
  transition: background-color 0.1s ease;

  &:hover {
    background: ${theme.colors.secondary};
  }
`;

/**
 * `<input type="color">` nativo, mas com a casca do navegador removida e
 * redesenhada como uma bolinha — sem componente próprio de paleta, porque é
 * uma preferência pessoal de leitura (§ comentário em
 * `getCoresCustomizadas`), não algo que precise da mesma curadoria de cor
 * das etapas do cronograma (aquelas SÃO gravadas e viram legenda
 * compartilhada). O quadrado cru do input nativo, com a moldura em relevo do
 * navegador, destoava do resto — pílulas e chips da tela são todos
 * arredondados.
 */
export const ItemCorInput = styled.input`
  flex-shrink: 0;
  appearance: none;
  -webkit-appearance: none;
  width: 1.375rem;
  height: 1.375rem;
  padding: 0;
  border: none;
  border-radius: ${theme.borderRadius.full};
  box-shadow: inset 0 0 0 1px ${theme.colors.border};
  cursor: pointer;

  /* Sem isto o Chrome desenha o swatch com um respiro cinza por dentro —
     a bolinha ficaria menor que a área clicável, com uma borda dupla feia. */
  &::-webkit-color-swatch-wrapper {
    padding: 0;
    border-radius: inherit;
  }
  &::-webkit-color-swatch {
    border: none;
    border-radius: inherit;
  }
  &::-moz-color-swatch {
    border: none;
    border-radius: inherit;
  }

  &:hover {
    box-shadow:
      inset 0 0 0 1px ${theme.colors.border},
      0 0 0 3px ${theme.colors.secondary};
  }
  &:focus-visible {
    outline: none;
    box-shadow:
      inset 0 0 0 1px ${theme.colors.border},
      0 0 0 3px ${theme.colors.ring};
  }
`;

export const DivisorPainelCores = styled.div`
  height: 1px;
  margin: 0.375rem 0.125rem 0.5rem;
  background: ${theme.colors.border};
`;

/**
 * A linha de um evento dentro da célula do dia, pintada com a cor do tipo
 * (fundo tingido + friso à esquerda), não mais uma caixa cheia com borda
 * inteira. O calendário é a única tela do site em que a cor É o conteúdo —
 * é ela que deixa ver, sem clicar em nada, "essa semana tem duas bancas e
 * uma entrega". Neutralizar isso (como uma versão anterior desta tela
 * chegou a fazer) tira exatamente o que faz um calendário ser lido de
 * relance.
 *
 * Sem glifo: esta tela não é impressa nem exportada (ao contrário do
 * cronograma pintado do projeto), então o símbolo tipográfico só ocupava
 * espaço sem cumprir o papel de substituto da cor.
 */
export const Pilula = styled.button<{ $cor: string }>`
  display: flex;
  align-items: center;
  gap: 0.3rem;
  width: 100%;
  padding: 0.1rem 0.4rem;
  border: none;
  border-radius: ${theme.borderRadius.full};
  /* Forte só na extremidade esquerda, um corte seco, não um degradê. Os
     dois stops repetidos na MESMA posição (3px, 3px) são o que faz o
     "gradiente" parar de misturar e virar duas cores lado a lado. */
  background: linear-gradient(
    to right,
    ${({ $cor }) => $cor} 3px,
    color-mix(in srgb, ${({ $cor }) => $cor} 16%, var(--atlas-card)) 3px
  );
  color: color-mix(in srgb, ${({ $cor }) => $cor} 85%, var(--atlas-tinta));
  font-size: 0.68rem;
  font-weight: ${theme.fontWeight.medium};
  text-align: left;
  cursor: pointer;
  line-height: 1.3;

  /* ⭐ No celular a pílula vira um PONTO.
     A grade é 7 colunas de 1fr sem rolagem horizontal: em 375px cada célula
     tem ~50px, onde não cabe nem "Rec" de "Recrutamento". Mostrar quantos
     eventos há e de que tipo (a cor) é o que resta de útil nesse tamanho — e
     nada se perde, porque tocar na célula já abre o dia inteiro (ver o
     onClick de DayCellPreenche em CalendarioGeral.tsx).

     Os dois spans filhos são o texto e a hora; some com eles em vez de
     referenciar PilulaTexto/PilulaHora, que só são declarados abaixo. */
  @media (max-width: ${theme.breakpoints.md - 1}px) {
    width: 0.5rem;
    height: 0.5rem;
    padding: 0;
    gap: 0;
    background: ${({ $cor }) => $cor};

    & > span {
      display: none;
    }

    /* O hover abaixo repinta o gradiente, e num ponto de 8px o corte em 3px
       viraria meia bolinha de outra cor. Num aparelho híbrido (tablet com
       mouse) isso apareceria de verdade. */
    &:hover {
      background: ${({ $cor }) => $cor};
    }
  }

  &:hover {
    background: linear-gradient(
      to right,
      ${({ $cor }) => $cor} 3px,
      color-mix(in srgb, ${({ $cor }) => $cor} 26%, var(--atlas-card)) 3px
    );
  }
`;

export const PilulaTexto = styled.span`
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
`;

/** Só aparece em evento com hora de verdade (banca) — ver `horaDoEvento`. */
export const PilulaHora = styled.span`
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
  font-weight: ${theme.fontWeight.semibold};
  opacity: 0.75;
`;

export const PilulasWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  flex: 1;
  min-height: 0;
  overflow: hidden;

  /* Empilhadas viram uma coluna de pontos; em linha, quatro pontos ocupam
     menos de uma linha de texto e a célula do dia fica com a altura de sempre.
     Ver o comentário da Pilula. */
  @media (max-width: ${theme.breakpoints.md - 1}px) {
    flex-direction: row;
    flex-wrap: wrap;
    align-content: flex-start;
    gap: 0.15rem;
  }
`;

/**
 * A linha do topo da célula: número do dia à esquerda, aviso de excedente
 * à direita, os dois no mesmo eixo. Existe porque um `position: absolute`
 * ancorado só pelo canto da célula (tentativa anterior) desalinhava o badge
 * do número do dia — cada um seguia sua própria régua (fluxo normal vs.
 * canto absoluto), e o resultado lia como torto. Os dois num flex-row com
 * `align-items: center` compartilham a MESMA linha de base sempre, não
 * importa a altura de cada um.
 */
export const LinhaDia = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.25rem;
`;

/**
 * O aviso de quantos eventos ficaram fora das pílulas visíveis. Vermelho
 * (a mesma cor de `theme.colors.primary`) de propósito — é o único
 * elemento desta tela que pede atenção antes de qualquer clique, o
 * equivalente a um contador de notificação.
 *
 * É `<span>`, não `<button>`: quem abre o dropdown (hover) e quem abre o
 * dia inteiro (clique) é a CÉLULA — `DayCellPreenche` — não o badge; ele é
 * só o aviso visual de que há mais.
 */
export const AvisoMaisEventos = styled.span`
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.1rem;
  height: 1.1rem;
  padding: 0 0.3rem;
  border: 1px solid ${theme.colors.primary};
  border-radius: ${theme.borderRadius.full};
  background: ${theme.colors.card};
  color: ${theme.colors.primary};
  font-size: 0.62rem;
  font-weight: ${theme.fontWeight.bold};
  line-height: 1;
  pointer-events: none;

  ${DayCellPreenche}:hover & {
    background: ${theme.colors.primary};
    color: ${theme.colors.primaryForeground};
  }
`;

/** O painel do hover do dia — portal pra `document.body` porque a célula
 *  tem `overflow: hidden` (é o que corta as pílulas excedentes de
 *  propósito); um painel filho ficaria cortado junto. Por isso também é
 *  `position: fixed` com coordenadas calculadas na hora
 *  (`getBoundingClientRect` da célula), em vez de `absolute` ancorado num
 *  pai que ele nem está mais dentro. */
export const FlutuanteEventos = styled.div`
  position: fixed;
  z-index: 40;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  min-width: 11rem;
  max-width: 16rem;
  padding: 0.5rem;
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.borderRadius.lg};
  background: ${theme.colors.card};
  box-shadow: ${theme.shadows.lg};
`;

/** A lista de eventos de UM dia — usada tanto no popover de "+N mais"
 *  quanto na visão Dia (o mesmo conteúdo, só que embutido na página em vez
 *  de flutuando). */
export const ListaEventosDia = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
`;

