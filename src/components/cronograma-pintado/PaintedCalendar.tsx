import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { WeekdayCell } from "@/components/calendario/CalendarGrid.styled";
import { chaveData } from "@/components/calendario/semanas";
import {
  COR_MARCO,
  fundoDiagonal,
  TEXTO_SOBRE_DIVIDIDA,
  tonsDaCor,
  type TipoMarco,
} from "./cores";
import {
  BlocoMes,
  CabecalhoDias,
  CronogramaScroll,
  DetalheCelula,
  LinhaDias,
  MarcoBox,
  MarcosDoDia,
  NumeroDia,
  PaintedDayCell,
  TituloMes,
} from "./PaintedCalendar.styled";
import type { BlocoCalendario, Visao } from "./visao";
import { ehHojeEmBrasilia } from "@/lib/fuso";

export interface EtapaPintavel {
  id: number;
  /** A chave do grupo. Linhas com a mesma chave são TRECHOS de uma só etapa. */
  grupo: string;
  /** De qual escopo é, a etapa cobre a faixa de período do próprio escopo. */
  projeto_escopo_id?: number | null;
  nome: string;
  cor: string;
  data_inicio: string;
  data_fim: string;
  ordem: number;
}

export interface MarcoRenderizavel {
  /** Chave `yyyy-MM-dd`. */
  data: string;
  tipo: TipoMarco;
  /** O nome curto do box na visão de mês, onde não cabe o título inteiro. */
  rotulo: string;
  /** O nome completo, no box das visões maiores e no `title` da célula. */
  titulo: string;
  /**
   * Abre a ficha do marco. Sem isto o box é só rótulo, como sempre foi.
   *
   * Mora no DADO e não numa prop do calendário porque quem sabe o que um
   * marco abre é quem o montou: o calendário não conhece banca, reunião nem
   * entrega, ele desenha `MarcoRenderizavel`. Com uma prop `onMarcoClicado`
   * genérica, ou todos os marcos ficariam clicáveis (e três quartos deles
   * abririam nada), ou o componente precisaria de um `switch` por tipo.
   */
  onClick?: () => void;
}

export interface FaixaDerivada {
  tipo: "escopo" | "ambientacao" | "pausa";
  /** Só o período de escopo tem dono, é o que dá uma fatia por escopo. */
  projeto_escopo_id?: number | null;
  inicio: string;
  fim: string;
  rotulo: string;
  cor: string;
}

export interface DiaNaoUtil {
  tipo: string;
  descricao: string | null;
}

interface PaintedCalendarProps {
  /** Os blocos a renderizar, já derivados pela página (ver `visao.ts`). */
  blocos: BlocoCalendario[];
  /** Manda na altura da célula e em quanto detalhe cabe dentro dela. */
  visao: Visao;
  etapas: EtapaPintavel[];
  marcos: MarcoRenderizavel[];
  faixas: FaixaDerivada[];
  /** Chave `yyyy-MM-dd` para o motivo. Vem do backend: `dias_uteis.py` é a
   *  definição única, e recalcular fim de semana aqui divergiria no dia em
   *  que a diretoria carregar um recesso. */
  diasNaoUteis: Map<string, DiaNaoUtil>;
  /**
   * O que IMPEDE pintar, quando difere do que é mostrado.
   *
   * Na visão Geral o calendário exibe a união das frentes, mas a trava é a
   * frente da etapa no pincel: pintar uma etapa de Business num dia que só é
   * não útil em Tech é legítimo. Sem esta separação o Geral ficaria mais
   * restrito que o escopo. Ausente, vale o próprio `diasNaoUteis`.
   */
  diasBloqueados?: Map<string, DiaNaoUtil>;
  /**
   * Os dias que a trava **não** deveria tratar como parede.
   *
   * Fim de semana e feriado são fato: não se trabalha, ponto. Já "fora da
   * janela do escopo" é um limite NEGOCIADO, a janela pode crescer se a
   * diretoria autorizar. Tratar os dois igual fazia o arrasto ser aparado em
   * silêncio, e a pessoa ficava arrastando sem entender por que nada
   * acontecia.
   *
   * Estes dias continuam com a mesma aparência de bloqueado (a janela ainda
   * não cresceu), mas o gesto que os alcança dispara `onNegociar` em vez de
   * ser engolido. A parte que cabe na janela é pintada normalmente, não se
   * perde o trabalho por causa do pedido.
   */
  diasNegociaveis?: Set<string>;
  /** O grupo do "pintando: X". `null` = cursor de leitura. */
  grupoAtivo: string | null;
  /** Nome e cor do grupo ativo. Necessário à parte porque uma etapa recém
   *  criada ainda não tem linha em `etapas`, e sem isto a PRIMEIRA pincelada
   *  ficava sem preview nenhum, nem contorno nem cor.
   *
   *  Quem passa deve mandar um objeto ESTÁVEL (o próprio grupo memoizado, não
   *  um literal novo), senão o memo do preview se invalida a cada render. */
  pincel?: { nome: string; cor: string } | null;
  somenteLeitura?: boolean;
  /**
   * Escreve o motivo dentro da célula do dia não útil, mesmo na visão de mês.
   *
   * No cronograma a hachura basta, quem olha quer ver as etapas, e o motivo
   * fica no `title`. Na tela de calendários base o dia não útil É o conteúdo,
   * então dizer "Feriado" ou "Avaliação final" na célula é o ponto.
   */
  mostrarMotivo?: boolean;
  /** Deixa o calendário crescer e quem rola passa a ser a página. Use onde não
   *  há legenda grudada ao lado, senão sobra scroll dentro de scroll. */
  semScrollProprio?: boolean;
  onPaintRange: (grupo: string, inicio: string, fim: string) => void;
  /** Arrasto iniciado sobre dia que já é da etapa: TIRA o intervalo dela. */
  onEraseRange?: (grupo: string, inicio: string, fim: string) => void;
  /** Notifica o intervalo em construção, para a barra mostrar a contagem. */
  onArrasteMudou?: (intervalo: { inicio: string; fim: string } | null) => void;
  /**
   * O arrasto alcançou dias negociáveis: quem chamou decide o que fazer (na
   * página, abrir o pedido de dias à diretoria). Recebe quantos dias úteis
   * negociáveis foram alcançados e o último deles.
   */
  onNegociar?: (grupo: string, diasExtras: number, ultimoDia: string) => void;
  /**
   * Um CLIQUE simples num dia, quando a página está num modo de marcação
   * (reunião inicial, reunião geral, banca ou entrega, conforme o de-para).
   *
   * Não interfere no arrasto: enquanto ele existe, `grupoAtivo` é `null` (a
   * página desliga o pincel ao entrar num modo), então os dois gestos nunca
   * disputam o mesmo clique. Dia não útil não dispara, não se marca reunião
   * em feriado.
   */
  onDiaClicado?: (dia: string) => void;
  /**
   * ⭐ A pessoa tentou pintar um dia travado — e a plataforma precisa dizer
   * por quê.
   *
   * ⚠ **Sem isto, a recusa era silêncio.** `iniciarArraste` saía por um
   * `return` quando o dia não é pintável, e nada acontecia: nem o arrasto
   * começava, nem mensagem aparecia. Quem tentava pintar antes da reunião
   * inicial, ou além do fim da janela, ficava clicando numa parede muda sem
   * descobrir que existe uma regra — e o backend, que tem a explicação
   * pronta, nunca chegava a ser chamado.
   *
   * Recebe o motivo que já está no mapa de `diasBloqueados`; quem monta a
   * frase é a página, que conhece o escopo e as datas da janela.
   */
  onBloqueado?: (dia: string, motivo: DiaNaoUtil) => void;
}

interface Arraste {
  grupo: string;
  ancora: string;
  hover: string;
  /** Decidido na âncora: começou sobre dia da própria etapa, então apaga. */
  apagando: boolean;
}

/** Uma fatia da célula: uma etapa (ou a faixa derivada) que reivindica o dia. */
interface DonoDoDia {
  fundo: string;
  texto: string;
  nome: string;
  /** Qual etapa (agrupada) é dona, usado para não repetir fatia da mesma. */
  grupo: string;
}

/**
 * O calendário pintável, meses empilhados, seg–dom, arrastar para
 * pintar um intervalo.
 *
 * Controlado e sem fetch próprio de propósito: é o que o torna testável e o
 * que faz o export ser determinístico.
 */
export function PaintedCalendar({
  blocos,
  visao,
  etapas,
  marcos,
  faixas,
  diasNaoUteis,
  diasBloqueados,
  diasNegociaveis,
  grupoAtivo,
  pincel,
  somenteLeitura,
  mostrarMotivo,
  semScrollProprio,
  onPaintRange,
  onEraseRange,
  onNegociar,
  onArrasteMudou,
  onDiaClicado,
  onBloqueado,
}: PaintedCalendarProps) {
  const [arraste, setArraste] = useState<Arraste | null>(null);
  const rafRef = useRef<number | null>(null);
  const arrasteRef = useRef<Arraste | null>(null);
  arrasteRef.current = arraste;

  const marcosPorDia = useMemo(() => {
    const mapa = new Map<string, MarcoRenderizavel[]>();
    for (const m of marcos) {
      const lista = mapa.get(m.data) ?? [];
      lista.push(m);
      mapa.set(m.data, lista);
    }
    return mapa;
  }, [marcos]);

  /**
   * Quem são os donos de cada dia, uma LISTA, não um vencedor.
   *
   * O arraste entra como etapa virtual: o renderizador da célula não sabe a
   * diferença entre pintura salva e preview, só pergunta "quem é dona desta
   * data?". É isso que faz o preview aparecer sem estado duplicado.
   *
   * Duas etapas no mesmo dia dividem a célula em fatias diagonais (ver
   * `fundoDiagonal`). O campo `ordem` deixou de ser desempate de sobreposição
   * e passou a ser a ORDEM DAS FATIAS, a mesma da legenda, para o olho casar
   * as duas sem esforço.
   */
  const donosDoDia = useMemo(() => {
    const porDia = new Map<string, DonoDoDia[]>();

    // Dedupe por GRUPO: dois trechos da mesma etapa podem cair no mesmo dia
    // (o usuário repintou por cima), e sem isto a célula ganharia duas fatias
    // da cor idêntica, que lê como um bug, não como informação.
    const acrescentar = (inicio: string, fim: string, cor: string, nome: string, grupo: string) => {
      const tons = tonsDaCor(cor);
      for (const chave of diasDoIntervalo(inicio, fim)) {
        const lista = porDia.get(chave) ?? [];
        if (lista.some((d) => d.grupo === grupo)) continue;
        lista.push({ fundo: tons.fundo, texto: tons.texto, nome, grupo });
        porDia.set(chave, lista);
      }
    };

    // As faixas derivadas entram PRIMEIRO, e como fatia de verdade: um dia de
    // ambientação em que já se pintou uma etapa mostra as duas, dividido. Elas
    // vêm antes para ficarem sempre na mesma posição da divisão, senão a fatia
    // trocaria de lado conforme a ordem em que as etapas foram criadas.
    //
    // A chave do grupo carrega o escopo: dois escopos em PARALELO têm
    // duas faixas de período no mesmo dia, e sem isso o dedupe engoliria a
    // segunda como se fosse repetição da primeira.
    for (const faixa of faixas) {
      const grupo = `faixa:${faixa.tipo}:${faixa.projeto_escopo_id ?? ""}`;
      acrescentar(faixa.inicio, faixa.fim, faixa.cor, faixa.rotulo, grupo);
    }

    for (const etapa of [...etapas].sort((a, b) => a.ordem - b.ordem)) {
      acrescentar(etapa.data_inicio, etapa.data_fim, etapa.cor, etapa.nome, etapa.grupo);
      // A faixa do escopo é FUNDO, não concorrente: onde a etapa dele já
      // pinta o dia, a faixa sai de cena. Sem isto toda etapa apareceria pela
      // metade, dividida com a própria faixa que a contém, o tempo inteiro.
      if (etapa.projeto_escopo_id) {
        const chaveFaixa = `faixa:escopo:${etapa.projeto_escopo_id}`;
        for (const chave of diasDoIntervalo(etapa.data_inicio, etapa.data_fim)) {
          const lista = porDia.get(chave);
          if (lista?.some((d) => d.grupo === chaveFaixa)) {
            porDia.set(
              chave,
              lista.filter((d) => d.grupo !== chaveFaixa),
            );
          }
        }
      }
    }

    // A etapa em arrasto entra como mais uma fatia nos dias que ainda não são
    // dela, o preview mostra o resultado real do drop, não uma cor por cima.
    const preview = new Set<string>();
    if (arraste) {
      // Cai no `pincel` quando a etapa ainda não tem linha gravada.
      const etapa = etapas.find((e) => e.grupo === arraste.grupo);
      const nome = etapa?.nome ?? pincel?.nome;
      const cor = etapa?.cor ?? pincel?.cor;
      if (nome && cor) {
        const inicio = arraste.ancora <= arraste.hover ? arraste.ancora : arraste.hover;
        const fim = arraste.ancora <= arraste.hover ? arraste.hover : arraste.ancora;
        for (const chave of diasDoIntervalo(inicio, fim)) preview.add(chave);
        // Apagando, o preview é só o contorno: tingir sugeriria o contrário
        // do que o gesto faz.
        if (!arraste.apagando) acrescentar(inicio, fim, cor, nome, arraste.grupo);
      }
    }

    return { porDia, preview };
  }, [etapas, faixas, arraste, pincel]);

  const travas = diasBloqueados ?? diasNaoUteis;

  /** Negociável é alcançável pelo gesto, mesmo parecendo bloqueado: é assim
   *  que o arrasto além da janela vira um pedido em vez de nada. */
  const pintavel = useCallback(
    (chave: string) =>
      !somenteLeitura &&
      grupoAtivo !== null &&
      (!travas.has(chave) || !!diasNegociaveis?.has(chave)),
    [somenteLeitura, grupoAtivo, travas, diasNegociaveis],
  );

  /** O clique do modo de marcação. Só quando não há pincel disputando. */
  const marcavel = useCallback(
    (chave: string) =>
      !somenteLeitura && grupoAtivo === null && !!onDiaClicado && !travas.has(chave),
    [somenteLeitura, grupoAtivo, onDiaClicado, travas],
  );

  function iniciarArraste(e: React.PointerEvent<HTMLDivElement>, chave: string) {
    if (marcavel(chave) && e.button === 0) {
      e.preventDefault();
      onDiaClicado!(chave);
      return;
    }
    if (!pintavel(chave) || e.button !== 0) {
      // ⭐ A recusa fala. Só quando há pincel ligado e o dia está travado:
      // sem pincel a pessoa não estava tentando pintar, e explicar uma regra
      // que ela não esbarrou seria ruído.
      const motivo = travas.get(chave);
      if (e.button === 0 && grupoAtivo !== null && motivo) {
        onBloqueado?.(chave, motivo);
      }
      return;
    }
    // Mata a seleção de texto nativa sobre a grade.
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    // O gesto se decide AQUI, pela âncora, e vale para o arrasto inteiro:
    // começou sobre um dia que já é da etapa, o arrasto tira; começou sobre
    // dia livre (ou de outra etapa), pinta. Decidir célula a célula faria o
    // mesmo arrasto pintar um pedaço e apagar outro.
    const jaEhDaEtapa = (donosDoDia.porDia.get(chave) ?? []).some((d) => d.grupo === grupoAtivo);
    setArraste({ grupo: grupoAtivo!, ancora: chave, hover: chave, apagando: jaEhDaEtapa });
  }

  // pointermove/up ficam na WINDOW: o ponteiro sai da célula o tempo todo
  // durante um arrasto, e com pointer capture `e.target` deixa de ajudar.
  useEffect(() => {
    if (!arraste) return;

    function aoMover(e: PointerEvent) {
      if (rafRef.current !== null) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        // Hit-test por `data-dia`: `elementFromPoint` porque `e.target` é o
        // elemento capturador durante todo o arrasto.
        const alvo = document
          .elementFromPoint(e.clientX, e.clientY)
          ?.closest<HTMLElement>("[data-dia]");
        const chave = alvo?.dataset.dia;
        // Sem alvo (ponteiro na legenda, no vão entre meses, fora da janela)
        // MANTÉM o último hover, senão o preview pisca a cada borda.
        if (!chave) return;
        setArraste((atual) => (atual && atual.hover !== chave ? { ...atual, hover: chave } : atual));
      });
    }

    function aoSoltar(e: PointerEvent) {
      const atual = arrasteRef.current;
      setArraste(null);
      onArrasteMudou?.(null);
      if (!atual) return;

      // Atenção: hit-test do ponto FINAL aqui, e não confiar só no `hover`: num
      // arrasto rápido o último `pointermove` pode ter sido descartado pelo
      // throttle de rAF, e o intervalo sairia curto, a etapa terminaria
      // antes de onde o dedo soltou.
      const alvoFinal = document
        .elementFromPoint(e.clientX, e.clientY)
        ?.closest<HTMLElement>("[data-dia]");
      const fimReal = alvoFinal?.dataset.dia ?? atual.hover;

      const bruto =
        atual.ancora <= fimReal
          ? { inicio: atual.ancora, fim: fimReal }
          : { inicio: fimReal, fim: atual.ancora };
      // O gesto que passa da janela: a parte que cabe é pintada, e o
      // excedente vira o pedido à diretoria. Antes de aparar, porque aparar é
      // exatamente o que apagava a intenção.
      const negociados = diasNegociaveis
        ? diasDoIntervalo(bruto.inicio, bruto.fim).filter((d) => diasNegociaveis.has(d))
        : [];

      const aparado = apararPontas(bruto.inicio, bruto.fim, travas);
      if (aparado) {
        if (atual.apagando) onEraseRange?.(atual.grupo, aparado.inicio, aparado.fim);
        else onPaintRange(atual.grupo, aparado.inicio, aparado.fim);
      }

      // Apagar nunca negocia: tirar dias não precisa de autorização.
      if (negociados.length > 0 && !atual.apagando) {
        onNegociar?.(atual.grupo, negociados.length, negociados[negociados.length - 1]);
      }
    }

    window.addEventListener("pointermove", aoMover);
    window.addEventListener("pointerup", aoSoltar);
    window.addEventListener("pointercancel", aoSoltar);
    return () => {
      window.removeEventListener("pointermove", aoMover);
      window.removeEventListener("pointerup", aoSoltar);
      window.removeEventListener("pointercancel", aoSoltar);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [arraste, travas, diasNegociaveis, onPaintRange, onEraseRange, onNegociar, onArrasteMudou]);

  // Avisa a barra do intervalo em construção, para a contagem viva.
  useEffect(() => {
    if (!arraste) return;
    const inicio = arraste.ancora <= arraste.hover ? arraste.ancora : arraste.hover;
    const fim = arraste.ancora <= arraste.hover ? arraste.hover : arraste.ancora;
    onArrasteMudou?.({ inicio, fim });
  }, [arraste, onArrasteMudou]);

  // Nas células grandes (semana e dia) sobra espaço para dizer de quem é o dia
  // por escrito, em vez de depender só da cor e da legenda ao lado.
  const detalhado = visao !== "mes";

  return (
    <CronogramaScroll data-cronograma-export $semScrollProprio={semScrollProprio}>
      {blocos.map((bloco) => {
        const colunas = bloco.rotulos.length || bloco.linhas[0]?.length || 1;
        return (
          // `data-export-atomico`: o mês é a unidade que a quebra de página do
          // PDF não pode partir. Sem a marcação o corte caía por régua e uma
          // semana saía metade numa folha, metade na outra (ver `exportar.ts`).
          <BlocoMes key={bloco.chave} data-export-atomico>
            <TituloMes>{bloco.titulo}</TituloMes>
            {bloco.rotulos.length > 0 && (
              <CabecalhoDias $colunas={colunas}>
                {bloco.rotulos.map((rotulo) => (
                  <WeekdayCell key={rotulo}>{rotulo}</WeekdayCell>
                ))}
              </CabecalhoDias>
            )}
            {bloco.linhas.map((linha, indiceLinha) => (
              <LinhaDias key={`${bloco.chave}-${indiceLinha}`} $colunas={colunas}>
                {linha.map((dia, indiceColuna) => {
                  // `null` é preenchimento de mês vizinho: com os meses
                  // empilhados a mesma data cairia em DOIS blocos.
                  if (!dia) {
                    return (
                      <PaintedDayCell
                        key={`${bloco.chave}-${indiceLinha}-${indiceColuna}`}
                        $vazia
                        $visao={visao}
                      />
                    );
                  }

                  const chave = chaveData(dia);
                  const naoUtil = diasNaoUteis.get(chave);
                  const donos = donosDoDia.porDia.get(chave) ?? [];
                  // Uma dona = cor chapada; várias = fatias diagonais.
                  const fundo = donos.length
                    ? fundoDiagonal(donos.map((d) => d.fundo))
                    : undefined;
                  // Com a célula dividida, nenhuma cor da paleta serve para
                  // todas as fatias, cai no cinza-escuro neutro.
                  const corTexto =
                    donos.length === 1
                      ? donos[0].texto
                      : donos.length > 1
                        ? TEXTO_SOBRE_DIVIDIDA
                        : undefined;
                  const marcosDoDia = marcosPorDia.get(chave) ?? [];
                  const rotuloDoNaoUtil = naoUtil
                    ? `${rotuloNaoUtil(naoUtil.tipo)}${naoUtil.descricao ? `, ${naoUtil.descricao}` : ""}`
                    : null;

                  return (
                    <PaintedDayCell
                      key={chave}
                      data-dia={chave}
                      $visao={visao}
                      $naoUtil={!!naoUtil}
                      $cor={fundo}
                      $texto={corTexto}
                      $preview={donosDoDia.preview.has(chave)}
                      $pintavel={pintavel(chave)}
                      title={
                        rotuloDoNaoUtil ??
                        ([...donos.map((d) => d.nome), ...marcosDoDia.map((m) => m.titulo)].join(
                          " · ",
                        ) ||
                          undefined)
                      }
                      onPointerDown={(e) => iniciarArraste(e, chave)}
                    >
                      <NumeroDia $texto={corTexto} $hoje={ehHojeEmBrasilia(dia)}>
                        {format(dia, "d")}
                      </NumeroDia>

                      {/* O nome da etapa só onde cabe; no mês a cor + legenda
                          fazem esse trabalho e o espaço é do box de marco.
                          Com o dia dividido, lista TODAS as donas, é a única
                          forma de saber quem é cada fatia sem contar cor. */}
                      {detalhado && !rotuloDoNaoUtil && donos.length > 0 && (
                        <DetalheCelula $texto={corTexto}>
                          {donos.map((d) => (
                            <strong key={d.nome}>{d.nome}</strong>
                          ))}
                        </DetalheCelula>
                      )}
                      {(detalhado || mostrarMotivo) && rotuloDoNaoUtil && naoUtil && (
                        <DetalheCelula>
                          {/* A descrição é mais específica que o tipo: "Aulas
                              canceladas" e "Recesso" são os dois `recesso`. */}
                          <small>{naoUtil.descricao ?? rotuloNaoUtil(naoUtil.tipo)}</small>
                        </DetalheCelula>
                      )}

                      {marcosDoDia.length > 0 && (
                        <MarcosDoDia>
                          {marcosDoDia.map((m) => (
                            <MarcoBox
                              key={`${m.tipo}-${m.titulo}`}
                              // Vira <button> só quando abre alguma coisa: um
                              // rótulo sem ação não deve entrar na navegação
                              // por teclado nem anunciar-se como botão.
                              {...(m.onClick
                                ? {
                                    as: "button" as const,
                                    type: "button" as const,
                                    $clicavel: true,
                                    // O pointerdown é do ARRASTO de pintura,
                                    // que nasce na célula. Sem barrá-lo aqui,
                                    // clicar no marco começa uma pincelada.
                                    onPointerDown: (e: React.PointerEvent) => e.stopPropagation(),
                                    onClick: (e: React.MouseEvent) => {
                                      e.stopPropagation();
                                      m.onClick!();
                                    },
                                  }
                                : {})}
                              $borda={COR_MARCO.borda}
                              $fundo={COR_MARCO.fundo}
                              $texto={COR_MARCO.texto}
                              title={m.onClick ? `${m.titulo}, clique para ver os detalhes` : m.titulo}
                            >
                              {detalhado ? m.titulo : m.rotulo}
                            </MarcoBox>
                          ))}
                        </MarcosDoDia>
                      )}
                    </PaintedDayCell>
                  );
                })}
              </LinhaDias>
            ))}
          </BlocoMes>
        );
      })}
    </CronogramaScroll>
  );
}

const ROTULOS_NAO_UTIL: Record<string, string> = {
  fim_de_semana: "Fim de semana",
  feriado: "Feriado",
  prova: "Semana de provas",
  recesso: "Recesso",
};

function rotuloNaoUtil(tipo: string): string {
  return ROTULOS_NAO_UTIL[tipo] ?? "Dia não letivo";
}

/**
 * As chaves `yyyy-MM-dd` de um intervalo fechado.
 *
 * O `T12:00:00` é deliberado: `new Date("2026-08-10")` é lido como UTC e
 * volta um dia no Brasil. Meio-dia local não escorrega em nenhum fuso.
 */
export function diasDoIntervalo(inicio: string, fim: string): string[] {
  const dias: string[] = [];
  const atual = new Date(`${inicio}T12:00:00`);
  const limite = new Date(`${fim}T12:00:00`);
  while (atual <= limite) {
    dias.push(chaveData(atual));
    atual.setDate(atual.getDate() + 1);
  }
  return dias;
}

/**
 * Caminha as pontas para dentro até o primeiro/último dia útil.
 *
 * Uma etapa que "começa no sábado" envenena o `contar_dias_uteis` do
 * monitoramento depois, o intervalo gravado tem que ser honesto.
 */
export function apararPontas(
  inicio: string,
  fim: string,
  diasNaoUteis: Map<string, unknown>,
): { inicio: string; fim: string } | null {
  const uteis = diasDoIntervalo(inicio, fim).filter((d) => !diasNaoUteis.has(d));
  if (uteis.length === 0) return null;
  return { inicio: uteis[0], fim: uteis[uteis.length - 1] };
}
