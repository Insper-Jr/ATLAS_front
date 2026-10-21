import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import { addDays, addMonths, format, isSameMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { veTodosOsProjetos } from "@/utils/permissoes";
import {
  Calendar,
  CalendarClock,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Palette,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  COR_TIPO,
  getCoresCustomizadas,
  getEventos,
  ROTULO_TIPO,
  salvarCoresCustomizadas,
  type EventoCalendario,
  type TipoEvento,
} from "@/lib/calendario";
import { formatarDataHora, horaDoEvento, minutosDoEvento } from "@/lib/projetos";
import { DayEvents, DayNumber, WeekdayCell, WeekdayRow } from "@/components/calendario/CalendarGrid.styled";
import { TimelineDia, type ItemTimeline } from "@/components/calendario/TimelineDia";
import { DiaInteiroRotulo, DiaInteiroWrap } from "@/components/calendario/TimelineDia.styled";
import { chaveData, diasDaSemana, rotulosDiaSemana, semanasDoMes } from "@/components/calendario/semanas";
import {
  PageBadge,
  PageButton,
  PageButtonSm,
  PageLoadingBlock,
  ErrorBlock,
  ErrorText,
  EmptyText,
} from "@/styles/page.styled";
import { ViewToggleRow, ViewToggleBtn } from "@/pages/projetos/Projetos.styled";
import {
  AvisoMaisEventos,
  BotaoCores,
  Cabecalho,
  Chip,
  CorpoCalendario,
  DayCellPreenche,
  DetailList,
  DetailRow,
  DetailTerm,
  DetailValue,
  DivisorPainelCores,
  FiltroChips,
  FlutuanteEventos,
  GradeWrap,
  ItemCorInput,
  LinhaCor,
  LinhaDia,
  ListaEventosDia,
  MesAtual,
  ModalBody,
  ModalClose,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  ModalTitle,
  MonthGridPreenche,
  NarrowModalContent,
  PageHeaderRow,
  PageHeaderText,
  PageHeading,
  PageSubheading,
  PaginaCalendario,
  PainelCores,
  Pilula,
  TituloPainelCores,
  PilulasWrap,
  PilulaHora,
  PilulaTexto,
  WeekRowPreenche,
} from "./CalendarioGeral.styled";
import { diaDoValor, ehHojeEmBrasilia } from "@/lib/fuso";

const INICIO_SEMANA = 0;
const ROTULOS = rotulosDiaSemana(INICIO_SEMANA);
// "prova" fora de propósito, falta a plataforma ter de onde tirar o curso
// de cada usuário antes do filtro voltar a fazer sentido (ver
// `GetEventosCalendarioUseCase`, que também não gera esse tipo hoje).
const TIPOS: TipoEvento[] = ["banca", "kickoff", "reuniao", "entrega", "prazo_avaliacao_banca", "prazo_desempenho"];

/** Na pílula, prazo mostra o título ("Prazo: avaliar a banca de X") em vez
 *  do nome do projeto, senão fica igual à pílula da banca em si. */
function rotuloPilula(e: EventoCalendario): string {
  return e.tipo.startsWith("prazo") ? e.titulo : e.projeto_nome || e.titulo;
}
/** Reunião é semanal, POR PROJETO. Quem vê o portfólio inteiro (diretor,
 *  gerente) numa grade só leva reunião de TODOS os projetos junto, e ela
 *  sozinha lota todos os dias úteis de todas as semanas: o marco raro
 *  (banca, kickoff, entrega) e a rotina recorrente pesando igual afogam o
 *  que a pessoa realmente veio procurar. Reunião começa OFF só pra esses
 *  dois; coordenador/consultor está em poucos projetos (o recorte do
 *  backend já garante isso), a lista de reuniões deles é curta o bastante
 *  pra começar ligada. */
const TIPOS_PADRAO_PORTFOLIO: TipoEvento[] = TIPOS.filter((t) => t !== "reuniao");
/**
 * A célula tem altura FLEXÍVEL (encolhe pra caber as 5-6 semanas do mês na
 * tela, sem empurrar a página). Duas pílulas cabem com folga agora que o
 * aviso de excedente é um BADGE no canto da célula (`AvisoMaisEventos`),
 * não mais uma linha somada ao fim da pilha de pílulas — as pílulas usam a
 * altura de `DayEvents` inteira, sem dividir espaço com mais nada.
 */
const MAX_PILULAS_MES = 2;
/** A visão Semana só tem UMA fileira de dia — sobra muito mais altura por
 *  célula do que no mês inteiro, então cabe bem mais antes de precisar do
 *  "+N mais". */
const MAX_PILULAS_SEMANA = 8;
/** Nenhum evento do calendário geral guarda duração (só banca tem hora de
 *  verdade, e nem ela tem duração no banco) — a timeline da visão Dia
 *  precisa de uma altura de bloco, então usa esta como estimativa visual,
 *  não como dado real de agenda. */
const DURACAO_PADRAO_MIN = 60;

type Visao = "mes" | "semana" | "dia";

/**
 * O calendário geral do §6.5 — bancas, kickoffs, reuniões e entregas.
 *
 * Recorta por posição, como o resto do site: diretor vê o portfólio
 * inteiro, gerente só a própria frente, coordenador/consultor só os
 * projetos em que estão alocados. O  original pedia "acessível a todos,
 * sem recorte", decisão revista depois: só quem já enxerga tudo em toda
 * tela (a diretoria) tira proveito de ver o portfólio inteiro aqui também;
 * pra quem está em poucos projetos, o resto vira ruído. O recorte é feito
 * no backend (`GetEventosCalendarioUseCase`), a página só mostra o que
 * chega.
 */
export function CalendarioGeral() {
  const { token, usuario } = useAuth();
  const navigate = useNavigate();
  // Só diretor e gerente enxergam o portfólio inteiro, o texto
  // reflete o que a pessoa está de fato vendo, em vez de prometer "todos os
  // projetos" pra quem só vê os próprios.
  const veTudo = veTodosOsProjetos(usuario);
  const [visao, setVisao] = useState<Visao>("mes");
  const [data, setData] = useState(() => new Date());
  const [eventos, setEventos] = useState<EventoCalendario[]>([]);
  const [tiposAtivos, setTiposAtivos] = useState<TipoEvento[]>(() =>
    veTudo ? TIPOS_PADRAO_PORTFOLIO : TIPOS,
  );
  const [detalhe, setDetalhe] = useState<EventoCalendario | null>(null);
  const [diaAberto, setDiaAberto] = useState<Date | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const [coresCustom, setCoresCustom] = useState<Partial<Record<TipoEvento, string>>>(() =>
    getCoresCustomizadas(),
  );
  const [painelCoresAberto, setPainelCoresAberto] = useState(false);
  const refPainelCores = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!painelCoresAberto) return;
    function aoClicarFora(evento: MouseEvent) {
      if (!refPainelCores.current?.contains(evento.target as Node)) setPainelCoresAberto(false);
    }
    document.addEventListener("mousedown", aoClicarFora);
    return () => document.removeEventListener("mousedown", aoClicarFora);
  }, [painelCoresAberto]);

  function corDoTipo(tipo: TipoEvento): string {
    return coresCustom[tipo] ?? COR_TIPO[tipo];
  }

  function mudarCor(tipo: TipoEvento, cor: string) {
    setCoresCustom((atuais) => {
      const proximo = { ...atuais, [tipo]: cor };
      salvarCoresCustomizadas(proximo);
      return proximo;
    });
  }

  function restaurarCoresPadrao() {
    setCoresCustom({});
    salvarCoresCustomizadas({});
  }

  /**
   * O dropdown do "+N mais" no hover — não é o mesmo estado do "+N mais"
   * clicado (`diaAberto`, que abre o dia inteiro): aqui é só o QUE SOBROU
   * fora da pílula única de cada célula, ancorado no retângulo do próprio
   * chip. Um `setTimeout` cancelável dá a folga pro cursor atravessar o vão
   * entre o chip e o painel (que vive num portal, fora da árvore do chip, e
   * por isso nunca herda o `:hover` dele) sem o painel fechar no meio do
   * caminho.
   */
  const [flutuante, setFlutuante] = useState<{
    chave: string;
    eventos: EventoCalendario[];
    retangulo: DOMRect;
    /** Célula perto do rodapé da tela (última linha do mês): sem espaço
     *  embaixo pra lista abrir pra baixo como sempre, e nada aqui tem scroll
     *  (é um portal em `position: fixed`). Sem isso a lista simplesmente
     *  nascia fora da viewport, impossível de ver ou rolar até ela. */
    abrirParaCima: boolean;
  } | null>(null);
  const fecharFlutuanteRef = useRef<number | null>(null);

  function abrirFlutuante(chave: string, eventos: EventoCalendario[], retangulo: DOMRect) {
    if (fecharFlutuanteRef.current !== null) {
      window.clearTimeout(fecharFlutuanteRef.current);
      fecharFlutuanteRef.current = null;
    }
    // Estimativa de altura pela quantidade de eventos: não dá pra medir o
    // popover antes dele existir no DOM, e refazer a posição só depois de
    // montado pisca na tela.
    const alturaEstimada = eventos.length * 30 + 16;
    const abrirParaCima = window.innerHeight - retangulo.bottom < alturaEstimada;
    setFlutuante({ chave, eventos, retangulo, abrirParaCima });
  }

  function agendarFechoFlutuante() {
    fecharFlutuanteRef.current = window.setTimeout(() => setFlutuante(null), 150);
  }

  useEffect(() => {
    return () => {
      if (fecharFlutuanteRef.current !== null) window.clearTimeout(fecharFlutuanteRef.current);
    };
  }, []);

  // A janela de busca muda com a visão: mês inteiro (com as bordas das
  // semanas), só os 7 dias da semana corrente, ou só o dia — sempre o
  // mínimo necessário pro que está na tela agora.
  const { inicio, fim } = useMemo(() => {
    if (visao === "semana") {
      const dias = diasDaSemana(data, INICIO_SEMANA);
      return { inicio: chaveData(dias[0]), fim: chaveData(dias[6]) };
    }
    if (visao === "dia") {
      return { inicio: chaveData(data), fim: chaveData(data) };
    }
    const semanas = semanasDoMes(data, INICIO_SEMANA);
    return { inicio: chaveData(semanas[0][0]), fim: chaveData(semanas[semanas.length - 1][6]) };
  }, [visao, data]);

  async function carregar() {
    if (!token) return;
    setCarregando(true);
    setErro("");
    try {
      // O filtro por tipo é aplicado no cliente — evita ida ao servidor a
      // cada chip clicado.
      setEventos(await getEventos(inicio, fim, token));
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao carregar o calendário");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, inicio, fim]);

  const porDia = useMemo(() => {
    const mapa = new Map<string, EventoCalendario[]>();
    for (const e of eventos) {
      if (!tiposAtivos.includes(e.tipo)) continue;
      // Banca e prazos chegam como instante UTC: o dia é o de Brasília.
      const chave = diaDoValor(e.data);
      const lista = mapa.get(chave) ?? [];
      lista.push(e);
      mapa.set(chave, lista);
    }
    return mapa;
  }, [eventos, tiposAtivos]);

  function alternarTipo(tipo: TipoEvento) {
    setTiposAtivos((atuais) =>
      atuais.includes(tipo) ? atuais.filter((t) => t !== tipo) : [...atuais, tipo],
    );
  }

  function irAnterior() {
    if (visao === "mes") setData((d) => addMonths(d, -1));
    else if (visao === "semana") setData((d) => addDays(d, -7));
    else setData((d) => addDays(d, -1));
  }

  function irProximo() {
    if (visao === "mes") setData((d) => addMonths(d, 1));
    else if (visao === "semana") setData((d) => addDays(d, 7));
    else setData((d) => addDays(d, 1));
  }

  if (erro) {
    return (
      <ErrorBlock>
        <ErrorText>{erro}</ErrorText>
        <PageButton $variant="outline" onClick={carregar}>
          Tentar novamente
        </PageButton>
      </ErrorBlock>
    );
  }

  // No mês, a busca traz as bordas das semanas (dias de outro mês) — o
  // contador só soma o que é de fato do mês corrente. Semana e Dia já
  // buscam exatamente a janela visível, então tudo que voltou já conta.
  const visiveis = eventos.filter(
    (e) =>
      tiposAtivos.includes(e.tipo) &&
      (visao !== "mes" || isSameMonth(new Date(`${diaDoValor(e.data)}T12:00:00`), data)),
  );

  const rotuloPeriodo =
    visao === "mes"
      ? format(data, "MMMM 'de' yyyy", { locale: ptBR })
      : visao === "dia"
        ? format(data, "EEEE, d 'de' MMMM", { locale: ptBR })
        : (() => {
            const dias = diasDaSemana(data, INICIO_SEMANA);
            const mesmoMes = isSameMonth(dias[0], dias[6]);
            const de = format(dias[0], mesmoMes ? "d" : "d 'de' MMM", { locale: ptBR });
            const ate = format(dias[6], "d 'de' MMM", { locale: ptBR });
            return `${de} – ${ate}`;
          })();

  const rotuloContagem = visao === "mes" ? "neste mês" : visao === "semana" ? "nesta semana" : "neste dia";

  return (
    <PaginaCalendario>
      <PageHeaderRow>
        <PageHeaderText>
          <PageHeading>Calendário</PageHeading>
          <PageSubheading>
            Bancas, kickoffs, reuniões e entregas{" "}
            {veTudo ? "de todos os projetos" : "dos seus projetos"} ·{" "}
            {visiveis.length} {rotuloContagem}
          </PageSubheading>
        </PageHeaderText>
      </PageHeaderRow>

      <CorpoCalendario>
        <Cabecalho>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <PageButtonSm type="button" $variant="ghost" onClick={irAnterior}>
              <ChevronLeft size={14} />
            </PageButtonSm>
            <MesAtual>{rotuloPeriodo}</MesAtual>
            <PageButtonSm type="button" $variant="ghost" onClick={irProximo}>
              <ChevronRight size={14} />
            </PageButtonSm>
            <PageButtonSm type="button" $variant="outline" onClick={() => setData(new Date())}>
              Hoje
            </PageButtonSm>
          </div>

          <ViewToggleRow role="tablist" aria-label="Visão do calendário">
            <ViewToggleBtn
              type="button"
              role="tab"
              aria-selected={visao === "mes"}
              $ativo={visao === "mes"}
              onClick={() => setVisao("mes")}
            >
              <Calendar size={14} />
              Mês
            </ViewToggleBtn>
            <ViewToggleBtn
              type="button"
              role="tab"
              aria-selected={visao === "semana"}
              $ativo={visao === "semana"}
              onClick={() => setVisao("semana")}
            >
              <CalendarDays size={14} />
              Semana
            </ViewToggleBtn>
            <ViewToggleBtn
              type="button"
              role="tab"
              aria-selected={visao === "dia"}
              $ativo={visao === "dia"}
              onClick={() => setVisao("dia")}
            >
              <CalendarClock size={14} />
              Dia
            </ViewToggleBtn>
          </ViewToggleRow>

          <FiltroChips>
            {TIPOS.map((tipo) => (
              <Chip
                key={tipo}
                type="button"
                $ativo={tiposAtivos.includes(tipo)}
                $cor={corDoTipo(tipo)}
                onClick={() => alternarTipo(tipo)}
              >
                {ROTULO_TIPO[tipo]}
              </Chip>
            ))}
          </FiltroChips>

          <PageButtonSm
            type="button"
            $variant="outline"
            onClick={() => navigate("/bancas?aba=calendario")}
          >
            <ClipboardList size={14} />
            Bancas
          </PageButtonSm>

          <BotaoCores ref={refPainelCores}>
            <PageButtonSm
              type="button"
              $variant="ghost"
              aria-expanded={painelCoresAberto}
              aria-haspopup="dialog"
              onClick={() => setPainelCoresAberto((v) => !v)}
            >
              <Palette size={14} />
              Cores
            </PageButtonSm>
            {painelCoresAberto && (
              <PainelCores role="dialog" aria-label="Personalizar cores dos eventos">
                <TituloPainelCores>Cor dos eventos</TituloPainelCores>
                {TIPOS.map((tipo) => (
                  <LinhaCor key={tipo}>
                    <ItemCorInput
                      type="color"
                      aria-label={`Cor de ${ROTULO_TIPO[tipo]}`}
                      value={corDoTipo(tipo)}
                      onChange={(e) => mudarCor(tipo, e.target.value)}
                    />
                    <span>{ROTULO_TIPO[tipo]}</span>
                  </LinhaCor>
                ))}
                <DivisorPainelCores />
                <PageButtonSm type="button" $variant="outline" onClick={restaurarCoresPadrao}>
                  Restaurar padrão
                </PageButtonSm>
              </PainelCores>
            )}
          </BotaoCores>
        </Cabecalho>

        {carregando ? (
          <PageLoadingBlock />
        ) : visao === "dia" ? (
          <GradeWrap>
            {(() => {
              const eventosDoDia = porDia.get(chaveData(data)) ?? [];
              const semHora = eventosDoDia.filter((e) => minutosDoEvento(e.data) === null);
              const comHora = eventosDoDia.filter((e) => minutosDoEvento(e.data) !== null);
              const itensTimeline: ItemTimeline[] = comHora.map((e, i) => ({
                chave: `${e.tipo}-${e.referencia_id}-${i}`,
                inicioMin: minutosDoEvento(e.data)!,
                duracaoMin: DURACAO_PADRAO_MIN,
                conteudo: (
                  <Pilula
                    type="button"
                    $cor={corDoTipo(e.tipo)}
                    title={e.titulo}
                    onClick={() => setDetalhe(e)}
                  >
                    <PilulaHora>{horaDoEvento(e.data)}</PilulaHora>
                    <PilulaTexto>{rotuloPilula(e)}</PilulaTexto>
                  </Pilula>
                ),
              }));
              return (
                <TimelineDia
                  itens={itensTimeline}
                  ehHoje={ehHojeEmBrasilia(data)}
                  topo={
                    semHora.length > 0 ? (
                      <DiaInteiroWrap>
                        <DiaInteiroRotulo>Dia inteiro</DiaInteiroRotulo>
                        <EventosDoDia eventos={semHora} onAbrirEvento={setDetalhe} corDoTipo={corDoTipo} />
                      </DiaInteiroWrap>
                    ) : undefined
                  }
                />
              );
            })()}
          </GradeWrap>
        ) : (
          <GradeWrap>
            <MonthGridPreenche>
              <WeekdayRow>
                {ROTULOS.map((r) => (
                  <WeekdayCell key={r}>{r}</WeekdayCell>
                ))}
              </WeekdayRow>
              {(visao === "semana" ? [diasDaSemana(data, INICIO_SEMANA)] : semanasDoMes(data, INICIO_SEMANA)).map(
                (semana) => (
                  <WeekRowPreenche key={chaveData(semana[0])}>
                    {semana.map((dia) => {
                      const chave = chaveData(dia);
                      const doDia = porDia.get(chave) ?? [];
                      const maxPilulas = visao === "semana" ? MAX_PILULAS_SEMANA : MAX_PILULAS_MES;
                      const excedentes = doDia.length - maxPilulas;
                      return (
                        <DayCellPreenche
                          key={chave}
                          $outside={visao === "mes" && !isSameMonth(dia, data)}
                          $comEventos={doDia.length > 0}
                          // A célula inteira é o alvo — não só o badge — do
                          // mesmo jeito que já era antes com o "+N mais":
                          // clique abre o dia inteiro, hover abre o que
                          // ficou de fora das pílulas visíveis.
                          onClick={doDia.length > 0 ? () => setDiaAberto(dia) : undefined}
                          onMouseEnter={
                            excedentes > 0
                              ? (ev) =>
                                  abrirFlutuante(
                                    chave,
                                    doDia.slice(maxPilulas),
                                    ev.currentTarget.getBoundingClientRect(),
                                  )
                              : undefined
                          }
                          onMouseLeave={excedentes > 0 ? agendarFechoFlutuante : undefined}
                        >
                          <LinhaDia>
                            <DayNumber $today={ehHojeEmBrasilia(dia)}>{format(dia, "d")}</DayNumber>
                            {excedentes > 0 && <AvisoMaisEventos>+{excedentes}</AvisoMaisEventos>}
                          </LinhaDia>
                          <DayEvents>
                            <PilulasWrap>
                              {doDia.slice(0, maxPilulas).map((e, i) => (
                                <Pilula
                                  key={`${e.tipo}-${e.referencia_id}-${i}`}
                                  type="button"
                                  $cor={corDoTipo(e.tipo)}
                                  title={e.titulo}
                                  // Sem isto o clique também borbulharia pro
                                  // `onClick` da célula: a pessoa clicaria
                                  // numa banca específica e o dia inteiro
                                  // abriria por cima do modal de detalhe.
                                  onClick={(ev) => {
                                    ev.stopPropagation();
                                    setDetalhe(e);
                                  }}
                                >
                                  <PilulaTexto>{rotuloPilula(e)}</PilulaTexto>
                                </Pilula>
                              ))}
                            </PilulasWrap>
                          </DayEvents>
                        </DayCellPreenche>
                      );
                    })}
                  </WeekRowPreenche>
                ),
              )}
            </MonthGridPreenche>
          </GradeWrap>
        )}
      </CorpoCalendario>

      {diaAberto && (
        <DiaModal
          dia={diaAberto}
          eventos={porDia.get(chaveData(diaAberto)) ?? []}
          corDoTipo={corDoTipo}
          onClose={() => setDiaAberto(null)}
          onAbrirEvento={(e) => {
            setDetalhe(e);
          }}
        />
      )}

      {detalhe && <DetalheModal evento={detalhe} onClose={() => setDetalhe(null)} />}

      {flutuante &&
        createPortal(
          <FlutuanteEventos
            style={
              flutuante.abrirParaCima
                ? { bottom: window.innerHeight - flutuante.retangulo.top + 4, left: flutuante.retangulo.left }
                : { top: flutuante.retangulo.bottom + 4, left: flutuante.retangulo.left }
            }
            onMouseEnter={() => abrirFlutuante(flutuante.chave, flutuante.eventos, flutuante.retangulo)}
            onMouseLeave={agendarFechoFlutuante}
          >
            {flutuante.eventos.map((e, i) => (
              <Pilula
                key={`${e.tipo}-${e.referencia_id}-${i}`}
                type="button"
                $cor={corDoTipo(e.tipo)}
                title={e.titulo}
                onClick={() => {
                  setDetalhe(e);
                  setFlutuante(null);
                }}
              >
                <PilulaTexto>{rotuloPilula(e)}</PilulaTexto>
              </Pilula>
            ))}
          </FlutuanteEventos>,
          document.body,
        )}
    </PaginaCalendario>
  );
}

/** A lista de eventos de um dia, sem o "+N mais" — cada linha já é o
 *  evento inteiro, usada dentro do popover de "+N mais" e na visão Dia. */
function EventosDoDia({
  eventos,
  onAbrirEvento,
  corDoTipo,
}: {
  eventos: EventoCalendario[];
  onAbrirEvento: (e: EventoCalendario) => void;
  corDoTipo: (tipo: TipoEvento) => string;
}) {
  if (eventos.length === 0) {
    return <EmptyText>Nenhum evento neste dia.</EmptyText>;
  }
  return (
    <ListaEventosDia>
      {eventos.map((e, i) => {
        const hora = horaDoEvento(e.data);
        return (
          <Pilula
            key={`${e.tipo}-${e.referencia_id}-${i}`}
            type="button"
            $cor={corDoTipo(e.tipo)}
            title={e.titulo}
            onClick={() => onAbrirEvento(e)}
          >
            {hora && <PilulaHora>{hora}</PilulaHora>}
            <PilulaTexto>{rotuloPilula(e)}</PilulaTexto>
          </Pilula>
        );
      })}
    </ListaEventosDia>
  );
}

function DiaModal({
  dia,
  eventos,
  corDoTipo,
  onClose,
  onAbrirEvento,
}: {
  dia: Date;
  eventos: EventoCalendario[];
  corDoTipo: (tipo: TipoEvento) => string;
  onClose: () => void;
  onAbrirEvento: (e: EventoCalendario) => void;
}) {
  return (
    <ModalOverlay onClick={onClose} role="presentation">
      <NarrowModalContent onClick={(e) => e.stopPropagation()} role="dialog">
        <ModalHeader>
          <ModalTitle style={{ textTransform: "capitalize" }}>
            {format(dia, "EEEE, d 'de' MMMM", { locale: ptBR })}
          </ModalTitle>
          <ModalClose type="button" aria-label="Fechar" onClick={onClose}>
            <X size={18} />
          </ModalClose>
        </ModalHeader>
        <ModalBody>
          <EventosDoDia eventos={eventos} onAbrirEvento={onAbrirEvento} corDoTipo={corDoTipo} />
        </ModalBody>
        <ModalFooter>
          <PageButton $variant="outline" type="button" onClick={onClose}>
            Fechar
          </PageButton>
        </ModalFooter>
      </NarrowModalContent>
    </ModalOverlay>
  );
}

function DetalheModal({ evento, onClose }: { evento: EventoCalendario; onClose: () => void }) {
  return (
    <ModalOverlay onClick={onClose} role="presentation">
      <NarrowModalContent onClick={(e) => e.stopPropagation()} role="dialog">
        <ModalHeader>
          <ModalTitle>{ROTULO_TIPO[evento.tipo]}</ModalTitle>
          <ModalClose type="button" aria-label="Fechar" onClick={onClose}>
            <X size={18} />
          </ModalClose>
        </ModalHeader>
        <ModalBody>
          <DetailList>
            <DetailRow>
              <DetailTerm>Projeto</DetailTerm>
              <DetailValue>{evento.projeto_nome || "—"}</DetailValue>
            </DetailRow>
            <DetailRow>
              <DetailTerm>Quando</DetailTerm>
              <DetailValue>{formatarDataHora(evento.data)}</DetailValue>
            </DetailRow>
            <DetailRow>
              <DetailTerm>Descrição</DetailTerm>
              <DetailValue>{evento.titulo}</DetailValue>
            </DetailRow>
            {evento.status && (
              <DetailRow>
                <DetailTerm>Situação</DetailTerm>
                <DetailValue>
                  <PageBadge $tone={evento.status === "atrasada" ? "danger" : "default"}>
                    {evento.status}
                  </PageBadge>
                </DetailValue>
              </DetailRow>
            )}
          </DetailList>
        </ModalBody>
        <ModalFooter>
          <PageButton $variant="outline" type="button" onClick={onClose}>
            Fechar
          </PageButton>
          {/* Só oferece o link quando há projeto: quem não enxerga o projeto
              levaria 404 do `exigir_acesso_ao_projeto`. */}
          {evento.projeto_id && (
            <PageButton
              as={Link}
              to={`/projetos/${evento.projeto_id}`}
              state={{ voltarPara: "/calendario", voltarRotulo: "Voltar para o calendário" }}
            >
              Abrir projeto
            </PageButton>
          )}
          {evento.rota && (
            <PageButton as={Link} to={evento.rota}>
              Ir responder
            </PageButton>
          )}
        </ModalFooter>
      </NarrowModalContent>
    </ModalOverlay>
  );
}
