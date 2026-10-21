/**
 * A paleta das etapas do cronograma.
 *
 * Por que não usar as cores do `theme.ts`: o tema tem essencialmente uma
 * matiz (vermelho) mais success/warning/info, e as três semânticas apontam
 * para significados já ocupados, vermelho é primary/destructive/atrasado,
 * verde é sucesso, âmbar é alerta. Cor de etapa **não pode encostar na
 * semântica de status do design system**, ou uma etapa verde vira "tudo bem"
 * num cronograma que está atrasado.
 *
 * A regra que impede o arco-íris: 8 matizes fixas, **mesma saturação e mesma
 * luminosidade**, só a matiz gira. E o formulário oferece exatamente essas 8
 * amostras, sem color picker livre.
 *
 * Os valores são hex literais gerados uma vez a partir da fórmula HSL
 * (matiz variável; amostra 62%/52%, fundo 62%/80%, texto 55%/25%). Literais
 * porque são mais fáceis de revisar num diff do que uma conversão em runtime
 *, e porque `cronograma_etapa.cor` é `CHAR(7)`, que só cabe `#RRGGBB`.
 *
 * O fundo já foi 92% de luminosidade, quase branco. Subiu para 80% para as
 * etapas pintarem de verdade. O texto teve que escurecer junto (era 45%/35%):
 * a 80% de fundo, o tom antigo caía para 3.5:1 em ciano, verde-água e
 * mostarda. Com 55%/25% o pior caso do conjunto é 5.35:1.
 */

export interface CorEtapa {
  /** Preenchimento da célula, pálido, para o calendário continuar um
   *  documento branco com células tingidas, não um mosaico de blocos. */
  fundo: string;
  /** A amostra da legenda, saturada. É este o valor GRAVADO no banco. */
  amostra: string;
  /** Texto sobre a célula: mesma matiz, escuro. Pálido + escuro da mesma
   *  matiz passa de 4.5:1 sem precisar de tabela caso a caso. */
  texto: string;
}

export const PALETA: CorEtapa[] = [
  { amostra: "#397AD0", fundo: "#ACC8EC", texto: "#1D3B63" }, // azul
  { amostra: "#7839D0", fundo: "#C7ACEC", texto: "#3A1D63" }, // roxo
  { amostra: "#39B7D0", fundo: "#ACE1EC", texto: "#1D5763" }, // ciano
  { amostra: "#D03985", fundo: "#ECACCC", texto: "#631D40" }, // magenta
  { amostra: "#D07539", fundo: "#ECC6AC", texto: "#63391D" }, // laranja
  { amostra: "#39D09E", fundo: "#ACECD7", texto: "#1D634C" }, // verde-água
  { amostra: "#AB39D0", fundo: "#DCACEC", texto: "#521D63" }, // violeta
  { amostra: "#D0AB39", fundo: "#ECDCAC", texto: "#63521D" }, // mostarda
];

/** A cor sugerida para a próxima etapa, determinística pela ordem, e então
 *  PERSISTIDA: apagar uma etapa anterior não pode deslizar as cores das
 *  outras, senão o PNG de agosto deixa de bater com a legenda de agosto. */
export function corSugerida(ordem: number): string {
  return PALETA[ordem % PALETA.length].amostra;
}

/** Os três tons a partir da cor gravada. */
export function tonsDaCor(cor: string): CorEtapa {
  const encontrada = PALETA.find((p) => p.amostra.toUpperCase() === cor.toUpperCase());
  if (encontrada) return encontrada;
  // Cor fora da paleta (linha legada, ou salva à mão): usa a própria como
  // fundo e um texto escuro neutro.
  return { fundo: cor, amostra: cor, texto: "#1F2937" };
}

/**
 * O fundo de um dia disputado por N etapas: fatias diagonais de tamanho igual.
 *
 * Com uma cor só devolve o próprio hex, célula chapada, sem gradiente, que é
 * o caso esmagadoramente comum e não deve pagar por este recurso.
 *
 * Atenção: as paradas são DUPLAS (`cor A% B%`), não simples. Com uma parada só o CSS
 * interpola entre as cores e sai um degradê borrado; repetindo a cor no fim da
 * própria fatia a transição vira um corte seco, que é o que dá o triângulo.
 *
 * 135deg aponta o eixo para o canto inferior direito, então a divisa corre de
 * baixo-esquerda para cima-direita, a diagonal "/".
 */
export function fundoDiagonal(cores: string[]): string {
  if (cores.length === 1) return cores[0];
  const passo = 100 / cores.length;
  const paradas = cores
    .map((cor, i) => `${cor} ${(i * passo).toFixed(4)}% ${((i + 1) * passo).toFixed(4)}%`)
    .join(", ");
  return `linear-gradient(135deg, ${paradas})`;
}

/** O texto sobre uma célula dividida: as fatias têm matizes diferentes, então
 *  nenhuma cor da paleta serve para todas. Cinza-escuro neutro passa em todas. */
export const TEXTO_SOBRE_DIVIDIDA = "#1F2937";

/** Reservados e fora da rampa, para nunca disputarem matiz com as etapas.
 *  São superfície, não cor de etapa, por isso seguem o modo noturno: os
 *  valores (claro e escuro) ficam em `styles/tema.css`. */
export const COR_AMBIENTACAO = "var(--atlas-cal-ambientacao)";
export const COR_PAUSA = "var(--atlas-cal-pausa)";
export const COR_NAO_UTIL = "var(--atlas-cal-nao-util)";

/**
 * O período de cada escopo, da reunião inicial até a banca.
 *
 * Mesmas 8 matizes da paleta, na MESMA ordem, mas a 92% de luminosidade
 * (contra os 80% do fundo de etapa; os valores moram em `styles/tema.css`,
 * com a versão escura do modo noturno). A faixa é o pano de fundo do escopo e as
 * etapas são pintadas dentro dela: mesma família de cor amarra as duas, e a
 * diferença de luminosidade deixa claro quem é fundo e quem é conteúdo.
 *
 * A escolha é pelo ÍNDICE DO ESCOPO na lista do projeto, não pela cor das
 * etapas dele: as etapas de um mesmo escopo têm cores diferentes entre si, e
 * o período é do escopo inteiro.
 */
export const CORES_PERIODO_ESCOPO = [
  "var(--atlas-cal-periodo-0)", // azul
  "var(--atlas-cal-periodo-1)", // roxo
  "var(--atlas-cal-periodo-2)", // ciano
  "var(--atlas-cal-periodo-3)", // magenta
  "var(--atlas-cal-periodo-4)", // laranja
  "var(--atlas-cal-periodo-5)", // verde-água
  "var(--atlas-cal-periodo-6)", // violeta
  "var(--atlas-cal-periodo-7)", // mostarda
];

export function corPeriodoEscopo(indice: number): string {
  return CORES_PERIODO_ESCOPO[indice % CORES_PERIODO_ESCOPO.length];
}

/* ------------------------------------------------------------------ */
/* Marcos                                                       */
/* ------------------------------------------------------------------ */

export type TipoMarco =
  | "banca"
  | "entrega"
  | "kickoff"
  | "reuniao_alinhamento"
  | "visita_presencial"
  // As reuniões semanais viraram marcações do cronograma quando a aba
  // Reuniões deixou de existir: elas são marcadas aqui e precisam aparecer
  // aqui. Não são `cronograma_marco`, moram em `reuniao_semanal`, que é
  // quem dá a largada da contagem do escopo.
  | "reuniao_geral"
  | "reuniao_inicial"
  // ⭐ A PROMESSA ao cliente (`projeto.data_entrega_prevista_cliente`), não a
  // entrega de um escopo. É do PROJETO, então só aparece na visão Geral —
  // dentro de um escopo ela pareceria a data dele.
  | "entrega_prevista_cliente";

/**
 * Um vermelho só para todos os marcos.
 *
 * A distinção entre eles é o NOME escrito dentro do box, não a cor, por isso
 * não há legenda de marcos: não existe código de cor a decifrar. O vermelho
 * fica fora da rampa das etapas, então marco nunca se confunde com etapa.
 *
 * O fundo é quase BRANCO, e não um vermelho pálido: o box é desenhado por cima
 * de um dia que já pode estar pintado, e agora que os fundos das etapas são
 * mais fortes (80% de luminosidade), qualquer tinta no box o faria competir
 * com a etapa embaixo. Branco com borda saturada separa de todas elas.
 */
export const COR_MARCO = {
  borda: "#D03939",
  // Fundo e texto seguem o modo noturno (`styles/tema.css`); a borda não.
  fundo: "var(--atlas-cal-marco-fundo)",
  texto: "var(--atlas-cal-marco-texto)",
};

/** O rótulo curto do box na visão de mês, onde não cabe o título inteiro. */
export const ROTULOS_MARCO: Record<TipoMarco, string> = {
  banca: "Banca",
  entrega: "Entrega",
  kickoff: "Kickoff",
  reuniao_alinhamento: "Reunião",
  visita_presencial: "Visita",
  reuniao_geral: "Semanal",
  // Curto de propósito: na visão de mês a célula não cabe "Reunião inicial",
  // e é a largada do escopo que interessa distinguir da reunião de rotina.
  reuniao_inicial: "Largada",
  // "Prevista" e não "Entrega prevista": na visão de mês a célula não cabe o
  // nome inteiro, e o título completo fica no `title` e no box das visões
  // maiores.
  entrega_prevista_cliente: "Prevista",
};
