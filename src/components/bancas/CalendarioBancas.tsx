import { useMemo, useState } from "react";
import { addDays, addMonths, format, isSameDay, isSameMonth, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, CalendarClock, ChevronLeft, ChevronRight, X } from "lucide-react";
import { paraDataUtc } from "@/lib/projetos";
import { DayCell, DayEvents, DayNumber, WeekdayCell, WeekdayRow, WeekRow } from "@/components/calendario/CalendarGrid.styled";
import { chaveData, rotulosDiaSemana, semanasDoMes } from "@/components/calendario/semanas";
import { TimelineDia, type ItemTimeline } from "@/components/calendario/TimelineDia";
import { EmptyText, PageButton, PageButtonSm } from "@/styles/page.styled";
import { ViewToggleRow, ViewToggleBtn } from "@/pages/projetos/Projetos.styled";
import { theme } from "@/styles/theme";
import type { Banca, StatusBanca } from "@/types/banca";
import {
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  ModalTitle,
  ModalClose,
} from "@/styles/modal.styled";
import {
  AvisoChoque,
  AvisoMaisBancas,
  Cabecalho,
  CalendarioWrap,
  Grade,
  GradeWrap,
  Legenda,
  LegendaCor,
  LegendaItem,
  LinhaDiaNumero,
  MesAtual,
  NavegacaoMes,
  PilulaBanca,
  PilulaHora,
  PilulaProjeto,
  PilulaVagas,
  ResumoMes,
} from "./CalendarioBancas.styled";
import { ehHojeEmBrasilia, horaEmBrasilia, partesEmBrasilia } from "@/lib/fuso";

/** Uma banca que JÁ TEM data — o único tipo que este calendário desenha.
 *
 *  `Banca.data_hora` é nula enquanto a banca não é marcada, e um calendário
 *  não tem onde pôr um evento sem dia. O filtro em `marcadas` estreita para
 *  cá, e daqui para baixo ninguém precisa de guarda. */
type BancaMarcada = Banca & { data_hora: string };

/** Duas pílulas cabem sem esticar a célula — o resto vira "+N mais",
 *  clicável, do mesmo jeito que o Calendário geral. */
const MAX_PILULAS_MES = 2;
/** Nenhuma banca guarda duração no banco (só `data_hora`) — a visão Dia
 *  precisa de uma altura de bloco pra desenhar, então usa esta como
 *  estimativa visual, não como dado real de agenda. */
const DURACAO_PADRAO_MIN = 60;

const INICIO_SEMANA = 0;
const ROTULOS = rotulosDiaSemana(INICIO_SEMANA);

type Visao = "mes" | "dia";

/** Mesma leitura de `tomDoStatusBanca`, traduzida para cor direta — a pílula
 *  não é um `PageBadge` e precisa da cor, não do tom. */
const COR_STATUS: Record<StatusBanca, string> = {
  atrasada: theme.colors.destructive,
  realizada: theme.colors.success,
  aberta: theme.colors.info,
  nao_marcada: theme.colors.mutedForeground,
  cancelada: theme.colors.mutedForeground,
};

const ROTULO_CURTO: Record<StatusBanca, string> = {
  atrasada: "Atrasada",
  realizada: "Realizada",
  aberta: "Aberta",
  nao_marcada: "Não marcada",
  cancelada: "Cancelada",
};

/** `2026-08-12T17:00` (UTC) → `14:00`, no relógio de Brasília. */
function horaDe(iso: string): string {
  return horaEmBrasilia(paraDataUtc(iso));
}

/** Minutos desde 00:00 em Brasília, para posicionar a banca na timeline da visão Dia. */
function minutosDe(iso: string): number {
  const p = partesEmBrasilia(paraDataUtc(iso));
  return p.hora * 60 + p.minuto;
}

/**
 * ⭐ O calendário só de bancas (§8) — a tela que responde "esse horário está
 * livre?" antes de alguém marcar.
 *
 * ⚠ **Não é o Calendário geral com um filtro.** Lá as bancas dividem espaço
 * com kickoffs, reuniões e entregas, e o que importa numa banca — hora exata,
 * quantas vagas ainda faltam, e se duas caem no mesmo horário — não cabe numa
 * pílula que precisa servir a quatro tipos de evento. Mesmo formato de grade
 * do geral (tamanho de célula, "+N mais", toggle Mês/Dia), mas com a pílula
 * própria da banca — cor e estilo não mudam pra virar um ponto colorido
 * genérico.
 *
 * Alimentado pela lista que a página já carregou: nenhuma requisição nova, e
 * o que aparece aqui é exatamente o que aparece nas outras abas — inclusive o
 * recorte por posição, que o backend já aplicou.
 */
export function CalendarioBancas({
  bancas,
  onAbrirBanca,
}: {
  bancas: Banca[];
  onAbrirBanca: (banca: Banca) => void;
}) {
  const [visao, setVisao] = useState<Visao>("mes");
  const [data, setData] = useState(() => new Date());
  const [diaAberto, setDiaAberto] = useState<Date | null>(null);

  /** Esta tela recebe a lista crua da página, que inclui banca "não marcada"
   *  (a linha nasce junto do escopo, sem data, status `nao_marcada`; ver
   *  `get_projeto.py`). Um calendário não tem onde desenhar um evento sem
   *  data, então essas ficam de fora — não é perda: "não marcada" não
   *  pertence a dia nenhum mesmo. Sem o filtro, `paraDataUtc(null)` vira
   *  Invalid Date e `format()` explode a página inteira (era o bug real por
   *  trás do "a aba Calendário não funciona").
   *
   *  ⭐ O retorno é um PREDICADO DE TIPO, e não um `boolean`: assim o
   *  TypeScript sabe que daqui para baixo `data_hora` é `string`, e os ~10
   *  usos seguintes dispensam guarda. Antes o tipo prometia `string` sempre
   *  e a promessa era falsa — o filtro existia, mas nada obrigava ninguém a
   *  usá-lo. */
  const marcadas = useMemo(
    () => bancas.filter((b): b is BancaMarcada => !!b.data_hora),
    [bancas],
  );

  const porDia = useMemo(() => {
    const mapa = new Map<string, BancaMarcada[]>();
    for (const b of marcadas) {
      const chave = chaveData(paraDataUtc(b.data_hora));
      const lista = mapa.get(chave) ?? [];
      lista.push(b);
      mapa.set(chave, lista);
    }
    // Dentro do dia, por hora: é a ordem em que a pessoa lê a agenda, e é o
    // que põe duas bancas do mesmo horário lado a lado.
    for (const lista of mapa.values()) {
      lista.sort((a, b) => horaDe(a.data_hora).localeCompare(horaDe(b.data_hora)));
    }
    return mapa;
  }, [marcadas]);

  const doPeriodo = useMemo(
    () =>
      marcadas.filter((b) =>
        visao === "dia"
          ? isSameDay(paraDataUtc(b.data_hora), data)
          : isSameMonth(paraDataUtc(b.data_hora), data),
      ),
    [marcadas, data, visao],
  );

  /**
   * ⚠ Os horários com mais de uma banca no mesmo dia — o choque que o §8
   * proíbe. Calculado aqui, e não no backend, porque é uma leitura da mesma
   * lista que já está na tela; o backend faz a checagem que **bloqueia**, esta
   * é a que **avisa**, inclusive sobre choques que já existem no banco.
   */
  const chocados = useMemo(() => {
    const conjunto = new Set<string>();
    for (const [dia, lista] of porDia) {
      const contagem = new Map<string, number>();
      for (const b of lista) {
        const hora = horaDe(b.data_hora);
        contagem.set(hora, (contagem.get(hora) ?? 0) + 1);
      }
      for (const [hora, n] of contagem) {
        if (n > 1) conjunto.add(`${dia}T${hora}`);
      }
    }
    return conjunto;
  }, [porDia]);

  function irAnterior() {
    setData((d) => (visao === "dia" ? addDays(d, -1) : addMonths(d, -1)));
  }

  function irProximo() {
    setData((d) => (visao === "dia" ? addDays(d, 1) : addMonths(d, 1)));
  }

  const rotuloPeriodo =
    visao === "dia"
      ? format(data, "EEEE, d 'de' MMMM", { locale: ptBR })
      : format(data, "MMMM 'de' yyyy", { locale: ptBR });

  const itensTimelineDoDia: ItemTimeline[] = useMemo(() => {
    if (visao !== "dia") return [];
    const chave = chaveData(data);
    const doDia = porDia.get(chave) ?? [];
    return doDia.map((b) => ({
      chave: String(b.id),
      inicioMin: minutosDe(b.data_hora),
      duracaoMin: DURACAO_PADRAO_MIN,
      conteudo: (
        <PilulaDaBanca
          banca={b}
          chocada={chocados.has(`${chave}T${horaDe(b.data_hora)}`)}
          onAbrirBanca={onAbrirBanca}
        />
      ),
    }));
  }, [visao, data, porDia, chocados, onAbrirBanca]);

  return (
    <CalendarioWrap>
      <Cabecalho>
        <NavegacaoMes>
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
        </NavegacaoMes>

        <ViewToggleRow role="tablist" aria-label="Visão do calendário de bancas">
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
            aria-selected={visao === "dia"}
            $ativo={visao === "dia"}
            onClick={() => setVisao("dia")}
          >
            <CalendarClock size={14} />
            Dia
          </ViewToggleBtn>
        </ViewToggleRow>

        <ResumoMes>
          {doPeriodo.length === 0
            ? `Nenhuma banca ${visao === "dia" ? "neste dia" : "neste mês"}`
            : `${doPeriodo.length} ${doPeriodo.length === 1 ? "banca" : "bancas"} ${visao === "dia" ? "neste dia" : "neste mês"}`}
        </ResumoMes>
      </Cabecalho>

      {visao === "dia" ? (
        <GradeWrap>
          <TimelineDia itens={itensTimelineDoDia} ehHoje={ehHojeEmBrasilia(data)} />
        </GradeWrap>
      ) : (
        <GradeWrap>
          <Grade>
            <WeekdayRow>
              {ROTULOS.map((r) => (
                <WeekdayCell key={r}>{r}</WeekdayCell>
              ))}
            </WeekdayRow>
            {semanasDoMes(data, INICIO_SEMANA).map((semana) => (
              <WeekRow key={chaveData(semana[0])}>
                {semana.map((dia) => {
                  const chave = chaveData(dia);
                  const doDia = porDia.get(chave) ?? [];
                  const excedentes = doDia.length - MAX_PILULAS_MES;
                  return (
                    <DayCell key={chave} $outside={!isSameMonth(dia, data)}>
                      <LinhaDiaNumero>
                        <DayNumber $today={ehHojeEmBrasilia(dia)}>{format(dia, "d")}</DayNumber>
                        {excedentes > 0 && (
                          <AvisoMaisBancas type="button" onClick={() => setDiaAberto(dia)}>
                            +{excedentes}
                          </AvisoMaisBancas>
                        )}
                      </LinhaDiaNumero>
                      <DayEvents>
                        {doDia.slice(0, MAX_PILULAS_MES).map((b) => (
                          <PilulaDaBanca
                            key={b.id}
                            banca={b}
                            chocada={chocados.has(`${chave}T${horaDe(b.data_hora)}`)}
                            onAbrirBanca={onAbrirBanca}
                          />
                        ))}
                      </DayEvents>
                    </DayCell>
                  );
                })}
              </WeekRow>
            ))}
          </Grade>
        </GradeWrap>
      )}

      <Legenda>
        {(Object.keys(COR_STATUS) as StatusBanca[]).map((status) => (
          <LegendaItem key={status}>
            <LegendaCor $cor={COR_STATUS[status]} />
            {ROTULO_CURTO[status]}
          </LegendaItem>
        ))}
        <LegendaItem>
          <LegendaCor $cor={theme.colors.mutedForeground} />
          O número embaixo é <strong>&nbsp;alocados/vagas</strong>
        </LegendaItem>
      </Legenda>

      {marcadas.length === 0 && <EmptyText>Nenhuma banca marcada.</EmptyText>}

      {diaAberto && (
        <DiaModal
          dia={diaAberto}
          bancas={porDia.get(chaveData(diaAberto)) ?? []}
          chocados={chocados}
          onAbrirBanca={(b) => {
            onAbrirBanca(b);
            setDiaAberto(null);
          }}
          onClose={() => setDiaAberto(null)}
        />
      )}
    </CalendarioWrap>
  );
}

function PilulaDaBanca({
  banca,
  chocada,
  onAbrirBanca,
}: {
  banca: BancaMarcada;
  chocada: boolean;
  onAbrirBanca: (banca: Banca) => void;
}) {
  const hora = horaDe(banca.data_hora);
  const lotada = banca.alocados >= banca.vagas;
  return (
    <PilulaBanca
      type="button"
      $cor={COR_STATUS[banca.status]}
      title={`${hora} · ${banca.nome_projeto} · ${ROTULO_CURTO[banca.status]} · ${banca.alocados}/${banca.vagas} avaliadores`}
      onClick={() => onAbrirBanca(banca)}
    >
      {chocada && <AvisoChoque>⚠ mesmo horário</AvisoChoque>}
      <PilulaHora>{hora}</PilulaHora>
      <PilulaProjeto>{banca.nome_projeto}</PilulaProjeto>
      <PilulaVagas $lotada={lotada}>
        {banca.alocados}/{banca.vagas}
      </PilulaVagas>
    </PilulaBanca>
  );
}

/** A lista inteira de um dia, sem o "+N mais" — aberta pelo badge quando o
 *  mês esconde bancas atrás dele. */
function DiaModal({
  dia,
  bancas,
  chocados,
  onAbrirBanca,
  onClose,
}: {
  dia: Date;
  bancas: BancaMarcada[];
  chocados: Set<string>;
  onAbrirBanca: (banca: Banca) => void;
  onClose: () => void;
}) {
  const chave = chaveData(dia);
  return (
    <ModalOverlay onClick={onClose} role="presentation">
      <ModalContent onClick={(e) => e.stopPropagation()} role="dialog">
        <ModalHeader>
          <ModalTitle style={{ textTransform: "capitalize" }}>
            {format(dia, "EEEE, d 'de' MMMM", { locale: ptBR })}
          </ModalTitle>
          <ModalClose type="button" aria-label="Fechar" onClick={onClose}>
            <X size={18} />
          </ModalClose>
        </ModalHeader>
        <ModalBody style={{ display: "flex", flexDirection: "column", gap: theme.spacing.xs }}>
          {bancas.map((b) => (
            <PilulaDaBanca
              key={b.id}
              banca={b}
              chocada={chocados.has(`${chave}T${horaDe(b.data_hora)}`)}
              onAbrirBanca={onAbrirBanca}
            />
          ))}
        </ModalBody>
        <ModalFooter>
          <PageButton $variant="outline" type="button" onClick={onClose}>
            Fechar
          </PageButton>
        </ModalFooter>
      </ModalContent>
    </ModalOverlay>
  );
}
