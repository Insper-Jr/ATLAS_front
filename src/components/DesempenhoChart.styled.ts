import styled from "styled-components";
import { theme } from "@/styles/theme";

// Cores fixas na ordem categórica validada (ver skill de dataviz), nunca
// cicladas, sempre a mesma frente = mesma cor. Luz apenas: o app ainda não
// tem dark mode ativo (as variáveis --primary/--foreground/etc. do
// index.css também só definem o tema claro em uso hoje).
export const ChartWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 1.5rem;

  /* Empilha em vez de encolher o donut: com o donut de 128px e 1,5rem de folga,
     sobram ~200px de largura para a legenda numa tela de 375px, e os nomes das
     frentes ("Engenharia de Processos") quebravam em três linhas cada. */
  @media (max-width: ${theme.breakpoints.sm - 1}px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
  /* Cor por FRENTE, fixa (ver CORES_POR_FRENTE em DesempenhoChart.tsx):
     Business = preto (foreground, branco no escuro), Direito = vermelho claro (fixo), Tech = azul,
     Engenharia de Processos = verde. Nenhuma delas em cinza de propósito:
     "Outros" (frente fora deste mapa, ou banca "Sem frente") já usa
     --muted-foreground, um cinza — uma frente real em cinza também ficava
     visualmente idêntica a "Outros" no donut. */
  --chart-series-1: ${theme.colors.foreground};
  --chart-series-2: ${theme.colors.primary};
  --chart-series-3: #2a78d6;
  --chart-series-4: ${theme.colors.success};
`;

export const DonutBox = styled.div`
  position: relative;
  flex-shrink: 0;
  width: 128px;
  height: 128px;
`;

export const DonutCenter = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`;

export const DonutValue = styled.span`
  font-size: 1.15rem;
  font-weight: 700;
  line-height: 1;
`;

/** O balão que segue o mouse em cima do donut — `left`/`top` vêm inline
 *  (posição calculada a cada `mousemove`, ver DesempenhoChart.tsx), então só
 *  a aparência mora aqui. Nasce abaixo e à direita do cursor, não acima: o
 *  donut fica perto do topo do card (`PageCard` corta com `overflow:
 *  hidden`), e a lista de itens tornou o balão alto o bastante pra um
 *  balão-acima furar o topo do card quando a fatia hoverada está na parte
 *  de cima do anel. Abaixo sempre tem o resto do card (legenda) pra
 *  respirar. `pointer-events: none` pra ela nunca roubar o `mouseleave` do
 *  SVG por baixo. Mesmo espírito do balão de `PizzaEtapas` (Monitoramento):
 *  não é só "nome: valor", é a lista de quem está na fatia — senão o
 *  gráfico levanta a pergunta ("quais bancas são essas 3 de Tech?") sem
 *  responder. */
export const Tooltip = styled.div`
  position: absolute;
  transform: translate(0.75rem, 0.75rem);
  min-width: 9rem;
  max-width: 12rem;
  padding: ${theme.spacing.sm} 0.625rem;
  border-radius: ${theme.borderRadius.md};
  border: 1px solid ${theme.colors.border};
  background: ${theme.colors.card};
  pointer-events: none;
  z-index: 10;
  box-shadow: ${theme.shadows.md};
`;

export const TooltipTitulo = styled.p`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  margin: 0;
  padding-bottom: 0.35rem;
  border-bottom: 1px solid ${theme.colors.border};
  font-size: ${theme.fontSize.xs};
  font-weight: ${theme.fontWeight.semibold};
  color: ${theme.colors.foreground};
  white-space: nowrap;

  b {
    margin-left: auto;
    font-variant-numeric: tabular-nums;
    font-weight: ${theme.fontWeight.normal};
    color: ${theme.colors.mutedForeground};
  }
`;

export const TooltipLista = styled.ul`
  margin: 0.35rem 0 0;
  padding: 0;
  list-style: none;

  li {
    font-size: ${theme.fontSize.xs};
    line-height: 1.6;
    color: ${theme.colors.foreground};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  li[data-resto="true"] {
    color: ${theme.colors.mutedForeground};
  }
`;

export const Legend = styled.ul`
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  font-size: 0.875rem;
`;

export const LegendItem = styled.li`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

export const LegendSwatch = styled.span<{ $cor: string }>`
  width: 0.625rem;
  height: 0.625rem;
  flex-shrink: 0;
  border-radius: 999px;
  background: ${({ $cor }) => $cor};
`;

export const LegendEmpty = styled.li`
  color: var(--muted-foreground);
`;
