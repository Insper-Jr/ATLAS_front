/**
 * Export do cronograma em PDF ou imagem ("pronto para apresentações").
 *
 * A rasterização é sempre por `toPng`, o PDF só embute essa imagem numa
 * página; a saída em PNG é o mesmo dataUrl baixado direto, sem o jsPDF.
 *
 * Atenção: `html-to-image`, não `html2canvas`: o segundo reimplementa um
 * renderizador de CSS e engasga com `color-mix(in srgb, …)`, que este código
 * usa em vários lugares, aquelas células sairiam transparentes.
 * `html-to-image` serializa o DOM num `<foreignObject>` de SVG e deixa o
 * próprio navegador rasterizar: o que o navegador pinta, ele exporta.
 *
 * As bibliotecas entram por **import dinâmico**, dentro do handler de
 * clique. O Rollup emite um chunk separado e a primeira pintura da aba não
 * carrega os ~350 KB do jsPDF (nem sequer para quem só exporta PNG).
 */

const OPCOES = { pixelRatio: 2, backgroundColor: "#ffffff", cacheBust: true } as const;

function slug(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** "yyyy-MM-dd" de HOJE no fuso de Brasília, não em UTC.
 *
 * ⚠ `toISOString().slice(0, 10)` (como era) lê o dia em UTC — de 21h às
 * 23h59 no horário de Brasília (UTC-3) já é o dia seguinte em UTC, e o
 * arquivo baixava com a data de amanhã horas antes de amanhã existir aqui.
 * `Intl.DateTimeFormat` com `timeZone` fixo não depende do relógio/fuso do
 * SO de quem baixa, ao contrário de ler `getFullYear`/`getMonth`/`getDate`
 * locais — o "en-CA" só é o locale cujo formato padrão já sai em
 * "yyyy-MM-dd", não tem relação com fuso nenhum do Canadá. */
function hojeNoFusoDeBrasilia(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

function nomeArquivo(projeto: string, extensao: string, prefixo = "cronograma"): string {
  return `${prefixo}-${slug(projeto)}-${hojeNoFusoDeBrasilia()}.${extensao}`;
}

/**
 * A classe `exportando` solta o `max-height`/`overflow` do container e
 * des-stickifica a legenda: elementos sticky ou cortados pelo scroll saem na
 * posição rolada, não na real.
 */
async function comLayoutDeExport<T>(alvo: HTMLElement, acao: () => Promise<T>): Promise<T> {
  alvo.classList.add("exportando");
  // O arquivo sai sempre em cores de impressão, mesmo com o site no modo
  // noturno: `data-theme="light"` no alvo redefine os tokens só nesta
  // subárvore (`styles/tema.css`), e o `toPng` copia os estilos computados.
  const temaAntes = alvo.getAttribute("data-theme");
  alvo.setAttribute("data-theme", "light");
  try {
    // As fontes precisam estar prontas antes de rasterizar: com elas ainda
    // carregando, o texto sai deslocado ou simplesmente não sai.
    if (document.fonts?.ready) await document.fonts.ready;
    return await acao();
  } finally {
    alvo.classList.remove("exportando");
    if (temaAntes === null) alvo.removeAttribute("data-theme");
    else alvo.setAttribute("data-theme", temaAntes);
  }
}

/** Um bloco que não pode nascer numa página e terminar na outra, medido em px
 *  de CSS a partir do topo do nó fotografado. */
interface FaixaAtomica {
  topo: number;
  base: number;
}

/**
 * Os blocos que a quebra de página não pode partir.
 *
 * São os nós marcados com `data-export-atomico`: hoje, cada mês do calendário
 * e cada entrada da legenda. Quem chama esta função sem marcar nada nenhum
 * (o relatório de desempenho, que reusa `exportarPDF`) cai numa lista vazia e
 * volta a ganhar o corte por régua de antes, que é exatamente o comportamento
 * que ele já tinha.
 *
 * As medidas saem de `getBoundingClientRect` RELATIVAS ao alvo, e não de
 * `offsetTop`: o segundo é relativo ao ancestral posicionado mais próximo, e
 * dentro da moldura de export há grid, sticky e um ancestral `position: fixed`
 * — os números sairiam de sistemas de coordenadas diferentes conforme a
 * coluna.
 */
function faixasAtomicas(alvo: HTMLElement): FaixaAtomica[] {
  const topoDoAlvo = alvo.getBoundingClientRect().top;
  return Array.from(alvo.querySelectorAll<HTMLElement>("[data-export-atomico]")).map(
    (no) => {
      const caixa = no.getBoundingClientRect();
      return { topo: caixa.top - topoDoAlvo, base: caixa.bottom - topoDoAlvo };
    },
  );
}

/**
 * Onde esta página termina: o ponto mais baixo que dê, sem partir nada.
 *
 * Os candidatos são o corte da régua (`inicio` mais uma página cheia) e as
 * bordas de todos os blocos acima dele; ganha o mais baixo em que nenhum bloco
 * esteja atravessando a linha. Olhar as bordas basta: as alturas seguras formam
 * os vãos ENTRE os blocos, e todo vão começa e termina numa borda.
 *
 * A primeira versão subia o corte de bloco em bloco, do mais baixo para cima,
 * e parava no primeiro que coubesse. Parecia equivalente e não era: a moldura
 * tem DUAS colunas, então subir para escapar de um mês do calendário aterrissa
 * no meio de uma entrada da legenda, subir de novo cai no mês anterior, e a
 * cascata podia descer abaixo do início da página — aí ela desistia e cortava
 * na régua, justamente partindo o que devia proteger. Um teste com layouts
 * sorteados pegou o caso.
 */
function corteDaPagina(
  inicio: number,
  alturaDaPagina: number,
  alturaTotal: number,
  faixas: FaixaAtomica[],
): number {
  const daRegua = inicio + alturaDaPagina;
  if (daRegua >= alturaTotal) return alturaTotal;

  // A folga de meio pixel evita ler como "atravessado" o bloco que apenas
  // encosta na linha, que é justamente o corte bom.
  const atravessa = (y: number) =>
    faixas.some((f) => f.topo < y - 0.5 && f.base > y + 0.5);

  let melhor = atravessa(daRegua) ? -1 : daRegua;
  for (const faixa of faixas) {
    for (const borda of [faixa.topo, faixa.base]) {
      if (borda > melhor && borda <= daRegua && borda > inicio + 1 && !atravessa(borda)) {
        melhor = borda;
      }
    }
  }

  // Nenhum ponto seguro na página inteira: um bloco sozinho é mais alto que uma
  // folha, ou começou antes desta página. Corta na régua — uma quebra feia é
  // melhor do que um laço infinito ou um PDF sem o resto do cronograma.
  return melhor > inicio + 1 ? melhor : daRegua;
}

export async function exportarPNG(
  alvo: HTMLElement,
  nomeProjeto: string,
  prefixoArquivo = "cronograma",
): Promise<void> {
  const { toPng } = await import("html-to-image");
  const dataUrl = await comLayoutDeExport(alvo, () => toPng(alvo, OPCOES));

  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = nomeArquivo(nomeProjeto, "png", prefixoArquivo);
  link.click();
}

export async function exportarPDF(
  alvo: HTMLElement,
  nomeProjeto: string,
  /** Prefixo do arquivo. O relatório de desempenho reusa esta função e precisa
   *  sair como "relatorio-desempenho-…", não como "cronograma-…". */
  prefixoArquivo = "cronograma",
): Promise<void> {
  const [{ toPng }, { jsPDF }] = await Promise.all([
    import("html-to-image"),
    import("jspdf"),
  ]);
  // A medição acontece DENTRO do layout de export e antes do `toPng`: é a
  // classe `exportando` que solta o `max-height` e des-stickifica a legenda,
  // então medir fora dela daria as posições da tela, não as da foto.
  const { dataUrl, faixas, larguraEmCss } = await comLayoutDeExport(alvo, async () => ({
    faixas: faixasAtomicas(alvo),
    larguraEmCss: alvo.offsetWidth,
    dataUrl: await toPng(alvo, OPCOES),
  }));

  const imagem = new Image();
  imagem.src = dataUrl;
  await new Promise((resolve) => {
    imagem.onload = resolve;
  });

  const pdf = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
  const larguraPagina = pdf.internal.pageSize.getWidth();
  const alturaPagina = pdf.internal.pageSize.getHeight();
  const margem = 24;
  const largura = larguraPagina - margem * 2;
  const altura = (imagem.height / imagem.width) * largura;

  /**
   * Fatiar, e não encolher até ficar ilegível.
   *
   * A versão anterior cortava a cada `alturaUtil` e pronto, sem olhar o que
   * havia naquela linha: uma semana, um título de mês ou uma entrada da
   * legenda saía partida, metade no pé de uma folha e metade no topo da
   * seguinte. Agora o corte desce só até onde nenhum bloco atravessa.
   *
   * As contas ficam em px de CSS porque as faixas foram medidas assim; a
   * conversão para pt acontece só na hora de desenhar.
   */
  const escala = largura / larguraEmCss;
  const alturaUtil = alturaPagina - margem * 2;
  const alturaUtilEmCss = alturaUtil / escala;
  const alturaEmCss = altura / escala;

  let inicio = 0;
  while (inicio < alturaEmCss - 0.5) {
    const fim = corteDaPagina(inicio, alturaUtilEmCss, alturaEmCss, faixas);
    if (inicio > 0) pdf.addPage();

    // A imagem inteira entra deslocada, e a página mostra a fatia que calha de
    // cair na área visível.
    pdf.addImage(dataUrl, "PNG", margem, margem - inicio * escala, largura, altura);

    // As tarjas brancas são o que de fato recorta a fatia. O PDF só corta no
    // limite da FOLHA, não no da margem, então sem elas a sobra da imagem
    // invadiria as margens de cima e de baixo — e, com a página terminando
    // cedo para não partir um mês, a barra de baixo mostraria um pedaço
    // repetido do mês que abre a página seguinte.
    const usado = (fim - inicio) * escala;
    pdf.setFillColor(255, 255, 255);
    pdf.rect(0, 0, larguraPagina, margem, "F");
    pdf.rect(0, margem + usado, larguraPagina, alturaPagina - margem - usado, "F");

    inicio = fim;
  }

  pdf.save(nomeArquivo(nomeProjeto, "pdf", prefixoArquivo));
}
