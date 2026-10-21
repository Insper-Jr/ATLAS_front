import styled, { css } from "styled-components";
import { theme } from "@/styles/theme";
import { DayCell, MonthGrid } from "@/components/calendario/CalendarGrid.styled";
import { COR_NAO_UTIL } from "./cores";

export const CronogramaScroll = styled.div<{ $semScrollProprio?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.lg};
  padding-right: ${theme.spacing.sm};

  /* O teto de altura existe para o cronograma, onde a legenda fica grudada ao
     lado e precisa continuar visível enquanto se rola o calendário.
     Onde não há legenda ao lado, ele só produz scroll dentro de scroll, e aí
     quem rola é a página. */
  ${({ $semScrollProprio }) =>
    !$semScrollProprio &&
    css`
      max-height: 60vh;
      overflow-y: auto;
    `}

  /* Enquanto arrasta, a seleção de texto nativa sobre a grade é o item nº 1
     que faz um drag caseiro parecer quebrado. O touch-action impede o
     navegador móvel de rolar em vez de pintar. */
  user-select: none;
  touch-action: none;

  /* Durante o export, o container não pode estar cortado nem rolado.
     Atenção: seletor de DESCENDENTE, e não "&.exportando": a classe é aplicada no
     wrapper que envolve grade + legenda (CronogramaLayout), não neste
     elemento. Com "&.exportando" a regra nunca casava, e o PNG saía cortado
     na altura do scroll. */
  .exportando & {
    max-height: none;
    overflow: visible;
  }
`;

export const BlocoMes = styled(MonthGrid)`
  /* Atenção: "CronogramaScroll" é um flex column com max-height. Sem o shrink: 0, o
     flex COMPRIME os blocos para caberem em 60vh em vez de deixar o container
     rolar, as semanas viram tiras de poucos pixels e os números do dia se
     sobrepõem. O bloco tem altura de conteúdo; quem rola é o pai. */
  flex-shrink: 0;
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.borderRadius.lg};
  overflow: hidden;
  background: ${theme.colors.background};
`;

/**
 * As linhas da grade do cronograma têm colunas variáveis: 7 nas visões de mês
 * e semana, 1 na de dia.
 *
 * Atenção: não reaproveitam a `WeekRow` da primitiva de propósito. Ela traz
 * "flex: 1; min-height: 0", que serve ao calendário de bancas (um mês
 * preenchendo altura fixa) e aqui só faz a linha colapsar abaixo do conteúdo.
 */
export const CabecalhoDias = styled.div<{ $colunas: number }>`
  display: grid;
  grid-template-columns: repeat(${({ $colunas }) => $colunas}, 1fr);
  border-bottom: 1px solid ${theme.colors.border};
`;

export const LinhaDias = styled.div<{ $colunas: number }>`
  display: grid;
  grid-template-columns: repeat(${({ $colunas }) => $colunas}, 1fr);
`;

export const TituloMes = styled.h3`
  margin: 0;
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  font-size: ${theme.fontSize.sm};
  font-weight: ${theme.fontWeight.semibold};
  text-transform: capitalize;
  color: ${theme.colors.foreground};
  background: ${theme.colors.secondary};
  border-bottom: 1px solid ${theme.colors.border};
`;

/**
 * A célula pintável. Herda a grade compartilhada e acrescenta só o que é do
 * cronograma, a primitiva continua limpa para a tela de bancas.
 */
/** A altura da célula em cada visão, é o "expandir" ao descer o zoom.
 *
 *  O mês tem 6rem para o box de marco caber com o número do dia. A  pede um
 *  calendário "compacto", e 6rem ainda é compacto perto das 7.5rem da grade de
 *  bancas, mas é o preço de o marco ter nome escrito em vez de um glifo. */
const ALTURA_CELULA: Record<string, string> = {
  mes: "6rem",
  semana: "9rem",
  dia: "14rem",
};

export const PaintedDayCell = styled(DayCell)<{
  $cor?: string;
  $texto?: string;
  $naoUtil?: boolean;
  $preview?: boolean;
  $pintavel?: boolean;
  $vazia?: boolean;
  $visao?: string;
}>`
  min-height: ${({ $visao }) => ALTURA_CELULA[$visao ?? "mes"] ?? ALTURA_CELULA.mes};
  align-items: flex-start;
  justify-content: flex-start;
  position: relative;
  cursor: ${({ $pintavel }) => ($pintavel ? "cell" : "default")};

  /* A última linha do bloco não repete a borda do container arredondado. */
  ${LinhaDias}:last-child & {
    border-bottom: none;
  }

  /* O dia desenha só a borda direita e a de baixo. A de cima e a da esquerda
     vêm do vizinho, e o vizinho vazio (dia de outro mês) tem borda
     transparente: o dia logo abaixo ou à direita dele ficava sem contorno
     (2026-10-12, os dias 5, 6 e 7 abaixo da primeira semana). A sombra de 1px
     fecha o contorno; onde o vizinho já tem borda, cai em cima da mesma linha
     cinza e não muda nada. Funciona porque a célula é "position: relative"
     e pinta por cima das anteriores. */
  ${({ $vazia }) =>
    !$vazia &&
    css`
      box-shadow: -1px -1px 0 0 ${theme.colors.border};
    `}

  ${({ $vazia }) =>
    $vazia &&
    css`
      /* Dia de mês vizinho: some por completo. Com meses empilhados, a mesma
         data apareceria em DOIS blocos, o que quebra o hit-test e fica feio
         no PNG. */
      background: transparent;
      border-color: transparent;
      pointer-events: none;
    `}

  ${({ $naoUtil }) =>
    $naoUtil &&
    css`
      /* A hachura é o que sobrevive à impressão em preto-e-branco e ao PNG
         exportado, cor sozinha não. */
      background-color: ${COR_NAO_UTIL};
      background-image: repeating-linear-gradient(
        45deg,
        transparent,
        transparent 3px,
        color-mix(in srgb, var(--atlas-tinta) 5%, transparent) 3px,
        color-mix(in srgb, var(--atlas-tinta) 5%, transparent) 6px
      );
      cursor: not-allowed;
    `}

  /* "background" (e não "background-color"): o valor pode ser um hex chapado
     ou um linear-gradient de fatias, quando mais de uma etapa disputa o dia. */
  ${({ $cor, $naoUtil }) =>
    $cor &&
    !$naoUtil &&
    css`
      background: ${$cor};
    `}

  ${({ $preview }) =>
    $preview &&
    css`
      outline: 2px dashed ${theme.colors.foreground};
      outline-offset: -3px;
    `}
`;

export const NumeroDia = styled.span<{ $texto?: string; $hoje?: boolean }>`
  font-size: ${theme.fontSize.xs};
  font-weight: ${({ $hoje }) => ($hoje ? theme.fontWeight.bold : theme.fontWeight.medium)};
  color: ${({ $texto }) => $texto ?? theme.colors.foreground};
  /* Hoje ganha um círculo na cor do número, que já contrasta com o fundo da
     etapa. A célula alinha no início, então o círculo não estica na largura. */
  ${({ $hoje }) =>
    $hoje &&
    css`
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 1.6em;
      height: 1.6em;
      padding: 0 0.2em;
      border: 1.5px solid currentColor;
      border-radius: ${theme.borderRadius.full};
    `}
`;

/** A pilha de boxes de marco dentro da célula. */
export const MarcosDoDia = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  width: 100%;
  min-width: 0;
  margin-top: 0.15rem;
`;

/**
 * O box do marco, borda colorida, fundo quase branco e o nome escrito.
 *
 * Substituiu os antigos glifos de símbolo. O motivo original deles era o export
 * impresso em preto-e-branco, e o nome escrito atende isso melhor do que um
 * símbolo: texto sobrevive ao P&B, símbolo depende da legenda ao lado.
 */
export const MarcoBox = styled.span<{
  $borda: string;
  $fundo: string;
  $texto: string;
  $clicavel?: boolean;
}>`
  display: block;
  width: 100%;
  padding: 0.1rem 0.3rem;
  border: 1px solid ${({ $borda }) => $borda};
  border-radius: ${theme.borderRadius.sm};
  background: ${({ $fundo }) => $fundo};
  color: ${({ $texto }) => $texto};
  font-size: 0.7rem;
  font-weight: ${theme.fontWeight.medium};
  line-height: 1.3;
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  /* Marco que abre ficha vira <button> (ver \`onClick\` em MarcoRenderizavel).
     Sem afordância nenhuma ninguém descobre que dá para clicar, e o box é
     pequeno demais para um ícone caber junto do rótulo. */
  ${({ $clicavel }) =>
    $clicavel &&
    `
    cursor: pointer;
    font: inherit;
    font-size: 0.7rem;
    font-weight: ${theme.fontWeight.medium};

    &:hover {
      filter: brightness(0.95);
      text-decoration: underline;
    }

    &:focus-visible {
      outline: 2px solid ${theme.colors.primary};
      outline-offset: 1px;
    }
  `}
`;

/**
 * O que a célula ganha quando há espaço (semana e dia): o nome da etapa e os
 * marcos por extenso. Na visão de mês a célula tem 3rem e nada disso cabe —
 * lá o título fica no `title` e a cor faz o trabalho, com a legenda ao lado.
 */
export const DetalheCelula = styled.div<{ $texto?: string }>`
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  margin-top: 0.15rem;
  min-width: 0;
  font-size: ${theme.fontSize.xs};
  line-height: 1.25;
  color: ${({ $texto }) => $texto ?? theme.colors.mutedForeground};

  strong {
    font-weight: ${theme.fontWeight.medium};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  small {
    font-size: 0.7rem;
    opacity: 0.85;
  }
`;

/* ------------------------------------------------------------------ */
/* Barra de ferramentas e legenda                                      */
/* ------------------------------------------------------------------ */

/**
 * A barra de ferramentas do cronograma, agora em ZONAS.
 *
 * ⭐ **Era uma linha só.** Navegação de período, troca de visão, os cinco
 * modos de marcação, o filtro de escopo, criar etapa, pedir dias, oficializar,
 * exportar e mais quatro frases de instrução dividiam a mesma linha, que
 * quebrava em três ou quatro no notebook. Tudo com o mesmo peso visual,
 * nenhuma pista de o que é olhar e o que é fazer.
 *
 * 📐 As zonas respondem a perguntas diferentes: a primeira é **onde estou**
 * (escopo, período, visão), a segunda é **o que faço** (marcar, criar,
 * oficializar), a terceira é **o que está armado agora**. Quem só veio ver o
 * cronograma nunca precisa passar da primeira.
 */
export const BarraZonas = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
  padding-bottom: ${theme.spacing.md};
`;

export const BarraLinha = styled.div<{ $secundaria?: boolean }>`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${theme.spacing.sm};

  /* A zona de edição vem recuada por uma borda, não por um card: ela é
     subordinada à primeira, e uma caixa em volta a promoveria a bloco
     independente. */
  ${({ $secundaria }) =>
    $secundaria &&
    css`
      padding-top: ${theme.spacing.sm};
      border-top: 1px solid ${theme.colors.border};
    `}
`;

/** Empurra o que vem depois para a direita. */
export const BarraEspaco = styled.div`
  flex: 1 1 auto;
  min-width: 0;
`;

/** O rótulo de um grupo de controles dentro da zona de edição. */
export const BarraRotuloZona = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: ${theme.fontSize.xs};
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: ${theme.colors.mutedForeground};
`;

/**
 * A faixa de estado: UMA frase sobre o gesto que está armado agora.
 *
 * ⚠ **Substitui cinco textos que ficavam fixos na barra** — a caixa "Escolha
 * um escopo acima", o "Clique num dia para marcar…", o "Arraste a partir de um
 * dia já pintado para desmarcar", o "Arraste além do fim da janela para pedir
 * dias" e o "Clique numa etapa da legenda para começar a pintar". Todos
 * verdadeiros, todos na tela ao mesmo tempo, e nenhum deles sobre o que a
 * pessoa estava fazendo naquele instante.
 *
 * As instruções que sobraram sem lugar não sumiram: as de gesto foram para o
 * modal "Como funciona", e a explicação de por que um modo depende de escopo
 * virou a dica do próprio grupo "Marcar".
 */
export const FaixaEstado = styled.div<{ $cor?: string }>`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: ${theme.borderRadius.md};
  border: 1px solid
    ${({ $cor }) => ($cor ? `color-mix(in srgb, ${$cor} 45%, var(--atlas-card))` : theme.colors.border)};
  background: ${({ $cor }) =>
    $cor ? `color-mix(in srgb, ${$cor} 10%, var(--atlas-card))` : theme.colors.muted};
  font-size: ${theme.fontSize.sm};
  color: ${theme.colors.foreground};

  strong {
    font-weight: ${theme.fontWeight.semibold};
  }
`;

/** A amostra de cor da etapa que o pincel está usando. */
export const FaixaEstadoAmostra = styled.span<{ $cor: string }>`
  width: 0.75rem;
  height: 0.75rem;
  flex-shrink: 0;
  border-radius: ${theme.borderRadius.sm};
  background: ${({ $cor }) => $cor};
`;

export const Barra = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding-bottom: ${theme.spacing.md};
`;

/**
 * Os botões da barra, na mesma caixa do select de escopo ao lado.
 *
 * O PageButtonSm tem 1.75rem e fonte xs; o FieldSelect, 2.25rem, raio maior e
 * fonte sm. Lado a lado a diferença aparece como desalinhamento. Aqui o botão
 * herda a métrica do campo, que é quem manda na linha.
 */
export const BotaoBarra = styled.button<{ $variant?: "outline" | "ghost" }>`
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  height: 2.25rem;
  padding: 0 0.75rem;
  border-radius: ${theme.borderRadius.lg};
  border: 1px solid
    ${({ $variant }) => ($variant === "ghost" ? "transparent" : theme.colors.input)};
  background: ${({ $variant }) =>
    $variant === "ghost" ? "transparent" : theme.colors.background};
  font-size: ${theme.fontSize.sm};
  font-weight: ${theme.fontWeight.medium};
  color: ${theme.colors.foreground};
  cursor: pointer;

  &:hover:not(:disabled) {
    background: ${theme.colors.muted};
  }

  &:focus-visible {
    outline: none;
    border-color: ${theme.colors.ring};
    box-shadow: 0 0 0 3px color-mix(in srgb, ${theme.colors.ring} 25%, transparent);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

/** O seletor de visão, dia · semana · mês, como um segmented control. */
export const GrupoVisao = styled.div`
  display: inline-flex;
  height: 2.25rem;
  border: 1px solid ${theme.colors.input};
  border-radius: ${theme.borderRadius.lg};
  overflow: hidden;
`;

export const BotaoVisao = styled.button<{ $ativo?: boolean }>`
  padding: 0 0.75rem;
  border: none;
  border-right: 1px solid ${theme.colors.border};
  background: ${({ $ativo }) => ($ativo ? theme.colors.secondary : "transparent")};
  font-size: ${theme.fontSize.xs};
  font-weight: ${({ $ativo }) =>
    $ativo ? theme.fontWeight.semibold : theme.fontWeight.medium};
  color: ${({ $ativo }) => ($ativo ? theme.colors.foreground : theme.colors.mutedForeground)};
  cursor: pointer;

  &:last-child {
    border-right: none;
  }

  &:hover:not(:disabled) {
    background: ${theme.colors.muted};
  }
`;

/**
 * A data de entrega do escopo, na barra do cronograma.
 *
 * Mesma métrica do select de escopo ao lado (2.25rem, raio lg), para a linha
 * não ficar com alturas diferentes.
 */
export const FieldEntrega = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  height: 2.25rem;
  padding: 0 0.75rem;
  border: 1px solid ${theme.colors.input};
  border-radius: ${theme.borderRadius.lg};
  background: ${theme.colors.background};
  font-size: ${theme.fontSize.sm};
  color: ${theme.colors.mutedForeground};

  input {
    border: none;
    background: transparent;
    font-size: ${theme.fontSize.sm};
    color: ${theme.colors.foreground};
    outline: none;
  }

  &:focus-within {
    border-color: ${theme.colors.ring};
    box-shadow: 0 0 0 3px color-mix(in srgb, ${theme.colors.ring} 25%, transparent);
  }

  input:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

export const NavPeriodo = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
`;

export const BotaoNav = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border: 1px solid ${theme.colors.input};
  border-radius: ${theme.borderRadius.lg};
  background: transparent;
  color: ${theme.colors.foreground};
  cursor: pointer;

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  &:hover:not(:disabled) {
    background: ${theme.colors.muted};
  }
`;

export const RotuloPeriodo = styled.span`
  /* ⚠ **Isto é uma reserva, e reserva sobrando vira buraco.** Eram 12rem, e
     na visão de mês o rótulo mais longo ("Setembro de 2026") ocupa perto de
     9 — sobravam ~3rem de vazio entre a navegação e o "Como funciona", que
     era o vão que incomodava.

     A reserva não pode ir a zero: sem ela, andar de agosto para setembro
     muda a largura do rótulo e empurra os botões à direita a cada clique nas
     setas. 9rem cobre o mais longo dos meses e para por aí. Nas visões de dia
     e semana o título é bem maior que isso e cresce sozinho. */
  min-width: 9rem;
  font-size: ${theme.fontSize.sm};
  font-weight: ${theme.fontWeight.medium};
  color: ${theme.colors.foreground};
`;

export const PincelAtivo = styled.span<{ $cor: string }>`
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.625rem;
  border-radius: ${theme.borderRadius.full};
  border: 1px solid ${({ $cor }) => $cor};
  background: color-mix(in srgb, ${({ $cor }) => $cor} 12%, var(--atlas-card));
  font-size: ${theme.fontSize.xs};
  font-weight: ${theme.fontWeight.medium};
  color: ${theme.colors.foreground};
`;

export const ContadorDias = styled.span`
  font-size: ${theme.fontSize.xs};
  font-variant-numeric: tabular-nums;
  color: ${theme.colors.mutedForeground};
`;

/**
 * "Como funciona", destacado de propósito.
 *
 * Não é um `BotaoVisao` como os outros: perdido entre os modos de marcação
 * ele virava mais um botão cinza numa fileira de botões cinza, e quem não
 * conhece a tela não achava justamente o que existe para essa pessoa. Fica
 * ao lado da data, em vermelho claro, lido como ajuda e não como ação.
 */
export const BotaoAjuda = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.3rem 0.7rem;
  border-radius: ${theme.borderRadius.md};
  border: 1px solid color-mix(in srgb, ${theme.colors.primary} 35%, transparent);
  background: color-mix(in srgb, ${theme.colors.primary} 10%, var(--atlas-card));
  color: ${theme.colors.primary};
  font-size: ${theme.fontSize.xs};
  font-weight: ${theme.fontWeight.medium};
  white-space: nowrap;
  cursor: pointer;

  &:hover {
    background: color-mix(in srgb, ${theme.colors.primary} 18%, var(--atlas-card));
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.primary};
    outline-offset: 1px;
  }
`;

/**
 * Esconde a cópia do export sem tirá-la do layout.
 *
 * Fora da tela por deslocamento, e não por `display: none`: o html-to-image
 * precisa de layout calculado, e um elemento sem display tem largura zero.
 *
 * Atenção: quem é fotografado é a MOLDURA lá dentro, nunca este elemento.
 * O html-to-image clona o nó COM os estilos dele; capturar este aqui levaria
 * o `position: fixed; left: -20000px` para dentro do clone, e o conteúdo
 * cairia fora da área renderizada. O resultado é um PDF em branco.
 */
export const AreaExportOculta = styled.div`
  position: fixed;
  top: 0;
  left: -20000px;
  pointer-events: none;
`;

/**
 * O nó que vira imagem. Posicionamento estático de propósito (ver acima).
 *
 * A largura fixa tira o PDF da mão do tamanho da janela: o arquivo sai igual
 * em qualquer monitor. O fundo branco é explícito porque o clone não herda o
 * fundo da página.
 */
export const MolduraExport = styled.div`
  width: 60rem;
  padding: ${theme.spacing.lg};
  background: #ffffff;
`;

export const CronogramaLayout = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${theme.spacing.lg};

  @media (min-width: ${theme.breakpoints.lg}px) {
    grid-template-columns: 1fr 15rem;
    align-items: start;
  }
`;

export const LegendaBox = styled.aside`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.md};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.borderRadius.lg};
  background: ${theme.colors.card};

  @media (min-width: ${theme.breakpoints.lg}px) {
    position: sticky;
    top: ${theme.spacing.md};
  }

  .exportando & {
    position: static;
  }
`;

export const LegendaGrupo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
`;

export const LegendaTitulo = styled.h4`
  margin: 0;
  font-size: ${theme.fontSize.xs};
  font-weight: ${theme.fontWeight.semibold};
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: ${theme.colors.mutedForeground};
`;

/**
 * A linha da legenda: o botão do pincel e, ao lado, o de excluir.
 *
 * São irmãos, e não aninhados, porque botão dentro de botão é HTML inválido —
 * o clique no interno dispararia o externo, e escolher excluir também trocaria
 * o pincel.
 */
export const LegendaLinha = styled.div`
  display: flex;
  align-items: center;
  gap: 0.125rem;

  /* Os botões da etapa (lápis e lixeira) ficam discretos e sobem para opacidade
     cheia quando a linha recebe mouse ou foco. Antes eram invisíveis até o
     hover, o que os tornava inalcançáveis no celular. */
  &:hover [data-acao-etapa],
  &:focus-within [data-acao-etapa] {
    opacity: 1;
  }
`;

export const BotaoExcluir = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  flex-shrink: 0;
  border: none;
  border-radius: ${theme.borderRadius.sm};
  background: transparent;
  color: ${theme.colors.mutedForeground};
  /* ⚠ **Era invisível até o hover.** No celular não existe
     hover: os botões da legenda eram inalcançáveis por lá. Agora ficam
     sempre visíveis, discretos, e ganham contraste quando o dedo ou o mouse
     chegam perto. */
  opacity: 0.55;
  cursor: pointer;
  transition: opacity ${theme.transitions.fast}, background-color ${theme.transitions.fast},
    color ${theme.transitions.fast};

  &:hover {
    opacity: 1;
    background: ${theme.colors.muted};
    color: ${theme.colors.destructive};
  }

  &:focus-visible {
    opacity: 1;
    outline: 2px solid ${theme.colors.ring};
    outline-offset: 1px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

export const LegendaItem = styled.button<{ $ativa?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  min-width: 0;
  width: 100%;
  padding: 0.3rem 0.375rem;
  border: 1px solid ${({ $ativa }) => ($ativa ? theme.colors.ring : "transparent")};
  border-radius: ${theme.borderRadius.md};
  background: ${({ $ativa }) => ($ativa ? theme.colors.secondary : "transparent")};
  font-size: ${theme.fontSize.xs};
  color: ${theme.colors.foreground};
  text-align: left;
  cursor: pointer;

  &:hover {
    background: ${theme.colors.muted};
  }
`;

/**
 * O alerta de estouro **ao lado do calendário**, um por escopo, dentro da
 * legenda.
 *
 * Fica aqui, e não só no banner do topo, porque a pergunta que ele responde é
 * sobre UM escopo ("as etapas deste escopo passaram do que foi vendido?") e a
 * resposta precisa estar encostada na lista de etapas daquele escopo. No topo,
 * um projeto com três escopos daria três avisos empilhados sem dizer de quem é
 * cada um.
 *
 * Âmbar, não vermelho: passar do previsto é um aviso para negociar dias, não
 * um erro, e vermelho é a cor de `destructive` no tema.
 */
export const AvisoEscopo = styled.div<{ $tom?: "alerta" | "atraso" }>`
  display: flex;
  gap: 0.375rem;
  padding: 0.5rem 0.625rem;
  border-radius: ${theme.borderRadius.md};
  font-size: ${theme.fontSize.xs};
  line-height: 1.4;
  border: 1px solid
    ${({ $tom }) =>
      $tom === "atraso" ? theme.alpha(theme.colors.destructive, 0.35) : theme.alpha(theme.colors.warning, 0.4)};
  background: ${({ $tom }) =>
    $tom === "atraso" ? theme.alpha(theme.colors.destructive, 0.08) : theme.alpha(theme.colors.warning, 0.12)};
  color: ${theme.colors.foreground};

  strong {
    font-weight: ${theme.fontWeight.semibold};
  }
`;

/**
 * A etiqueta "correção" no trecho da legenda.
 *
 * Depois que a banca do escopo é realizada, tudo que se pinta ali é correção
 * do que ela apontou, e sem rótulo os dois ficam indistinguíveis: o mesmo
 * retângulo colorido pode ser o trabalho vendido ou a correção. É a diferença
 * entre "o escopo levou 14 dias" e "levou 10 + 4 de correção".
 *
 * Correção não é "dia de ajuste": ajuste aumenta a JANELA do escopo e é
 * pedido à diretoria nos 3 primeiros dias úteis depois da largada.
 */
export const TagCorrecao = styled.span`
  display: inline-block;
  margin-left: 0.375rem;
  padding: 0 0.3rem;
  border-radius: ${theme.borderRadius.sm};
  border: 1px solid ${theme.alpha(theme.colors.info, 0.4)};
  background: ${theme.alpha(theme.colors.info, 0.12)};
  font-size: 0.6875rem;
  font-weight: ${theme.fontWeight.medium};
  color: ${theme.colors.foreground};
  white-space: nowrap;
`;

export const Amostra = styled.span<{ $cor: string }>`
  width: 0.75rem;
  height: 0.75rem;
  flex-shrink: 0;
  border-radius: ${theme.borderRadius.sm};
  background: ${({ $cor }) => $cor};
`;

/**
 * O seletor de cor da etapa: as 8 amostras da `PALETA`, e só elas.
 *
 * Sem color picker livre de propósito, a paleta é fechada justamente para o
 * cronograma não virar arco-íris e para nenhuma etapa cair na matiz que o
 * design system reserva para status (vermelho = atrasado, verde = ok).
 */
export const PaletaGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

export const AmostraBotao = styled.button<{ $cor: string; $ativa: boolean }>`
  width: 2rem;
  height: 2rem;
  border-radius: ${theme.borderRadius.md};
  background: ${({ $cor }) => $cor};
  cursor: pointer;

  /* A seleção é um anel POR FORA, e não uma borda: borda encolheria a amostra
     e faria a cor selecionada parecer diferente das outras. */
  border: 2px solid ${theme.colors.card};
  outline: 2px solid ${({ $cor, $ativa }) => ($ativa ? $cor : "transparent")};
  outline-offset: 0;

  &:focus-visible {
    outline-color: ${theme.colors.ring};
  }
`;

export const LegendaTexto = styled.span`
  display: flex;
  flex-direction: column;
  min-width: 0;

  strong {
    font-weight: ${theme.fontWeight.medium};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  small {
    font-size: 0.65rem;
    color: ${theme.colors.mutedForeground};
  }
`;

export const AmostraHachurada = styled.span`
  width: 0.75rem;
  height: 0.75rem;
  flex-shrink: 0;
  border-radius: ${theme.borderRadius.sm};
  background-color: ${COR_NAO_UTIL};
  background-image: repeating-linear-gradient(
    45deg,
    transparent,
    transparent 2px,
    color-mix(in srgb, var(--atlas-tinta) 12%, transparent) 2px,
    color-mix(in srgb, var(--atlas-tinta) 12%, transparent) 4px
  );
`;

/* ------------------------------------------------------------------ */
/* Desfazer                                                             */
/* ------------------------------------------------------------------ */

/**
 * A barra de desfazer, fixa no rodapé.
 *
 * Flutuante e não dentro da barra de ferramentas: quem acabou de clicar
 * num dia está olhando para o calendário, não para o topo da tela. A janela
 * é curta de propósito, desfazer eterno viraria mais um estado para a
 * pessoa administrar.
 */
export const BarraDesfazer = styled.div`
  position: fixed;
  left: 50%;
  bottom: ${theme.spacing.lg};
  transform: translateX(-50%);
  z-index: 60;
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border-radius: ${theme.borderRadius.lg};
  background: ${theme.colors.foreground};
  color: ${theme.colors.background};
  box-shadow: ${theme.shadows.lg};
  font-size: ${theme.fontSize.sm};
  max-width: calc(100vw - 2rem);
`;

export const BotaoDesfazer = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.75rem;
  border-radius: ${theme.borderRadius.md};
  border: 1px solid currentColor;
  background: transparent;
  color: inherit;
  font: inherit;
  font-weight: ${theme.fontWeight.medium};
  cursor: pointer;
  white-space: nowrap;

  &:hover:not(:disabled) {
    background: rgb(255 255 255 / 15%);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

/** Os segundos restantes. `tabular-nums` para o texto não dançar a cada tique. */
export const ContagemDesfazer = styled.span`
  font-variant-numeric: tabular-nums;
  opacity: 0.75;
  font-size: ${theme.fontSize.xs};
`;

/**
 * "Nova etapa", no fim da lista de etapas de cada escopo.
 *
 * ⭐ **Estava na barra de ferramentas**, longe da lista em que a etapa
 * aparece depois de criada. A legenda é onde as etapas moram, com suas datas,
 * e é clicando nelas que se pega o pincel: o botão de criar pertence ao fim
 * dessa lista, não a uma barra genérica no topo da tela.
 *
 * 📐 Um por escopo, e não um só para todos: assim o escopo da etapa nova já
 * está decidido pelo lugar em que se clicou, e o modal não precisa mais
 * perguntar (o `FieldSelect` de escopo dele some).
 */
export const LegendaNovaEtapa = styled.button`
  display: flex;
  align-items: center;
  gap: 0.375rem;
  width: 100%;
  margin-top: 0.25rem;
  padding: 0.375rem 0.5rem;
  border: 1px dashed ${theme.colors.border};
  border-radius: ${theme.borderRadius.md};
  background: transparent;
  font-size: ${theme.fontSize.xs};
  font-weight: ${theme.fontWeight.medium};
  color: ${theme.colors.mutedForeground};
  cursor: pointer;
  transition: background-color ${theme.transitions.fast}, color ${theme.transitions.fast},
    border-color ${theme.transitions.fast};

  &:hover {
    border-color: ${theme.colors.mutedForeground};
    background: ${theme.colors.muted};
    color: ${theme.colors.foreground};
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.ring};
    outline-offset: 1px;
  }

  /* Alvo de toque de 44px no celular. */
  @media (max-width: ${theme.breakpoints.md}px) {
    min-height: 2.75rem;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

/**
 * O lápis ao lado da etapa na legenda: renomeia e troca a cor.
 *
 * Mesma caixa do `BotaoExcluir`, sem a cor de perigo — editar não é
 * destrutivo, e pintar os dois de vermelho apagaria a diferença entre eles no
 * instante em que ela mais importa.
 */
export const BotaoEditarEtapa = styled(BotaoExcluir)`
  &:hover {
    color: ${theme.colors.foreground};
  }
`;
