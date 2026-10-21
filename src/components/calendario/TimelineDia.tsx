import { useMemo } from "react";
import type { ReactNode } from "react";
import {
  ALTURA_HORA_REM,
  BlocoEvento,
  ColunaEventos,
  ColunaHoras,
  GradeHoraria,
  LinhaAgora,
  LinhaHora,
  RotuloHora,
  TimelineWrap,
} from "./TimelineDia.styled";
import { partesEmBrasilia } from "@/lib/fuso";

export interface ItemTimeline {
  chave: string;
  /** Minutos desde 00:00 — ver `minutosDoEvento` em `lib/projetos.ts`. */
  inicioMin: number;
  duracaoMin: number;
  /** A pílula pronta de quem chama (`Pilula` no calendário geral,
   *  `PilulaBanca` no de bancas) — esta grade só decide ONDE ela entra. */
  conteudo: ReactNode;
}

interface ComColuna extends ItemTimeline {
  coluna: number;
  totalColunas: number;
}

/** Faixa padrão de horário comercial — estendida por fora só quando algum
 *  evento cai fora dela, pra não desenhar 24h quase todas vazias no caso
 *  comum. */
const HORA_PADRAO_INICIO = 7;
const HORA_PADRAO_FIM = 21;

/**
 * Agrupa por clusters de sobreposição e atribui colunas lado a lado dentro
 * de cada cluster — o mesmo problema que o Google Calendar resolve dividindo
 * a largura quando duas bancas caem no mesmo horário.
 */
function atribuirColunas(itens: ItemTimeline[]): ComColuna[] {
  const ordenados = [...itens].sort(
    (a, b) => a.inicioMin - b.inicioMin || a.duracaoMin - b.duracaoMin,
  );
  const resultado: ComColuna[] = [];
  let cluster: ItemTimeline[] = [];
  let fimCluster = -Infinity;

  function fecharCluster() {
    if (cluster.length === 0) return;
    const fimPorColuna: number[] = [];
    for (const item of cluster) {
      let coluna = fimPorColuna.findIndex((fim) => fim <= item.inicioMin);
      if (coluna === -1) {
        coluna = fimPorColuna.length;
        fimPorColuna.push(item.inicioMin + item.duracaoMin);
      } else {
        fimPorColuna[coluna] = item.inicioMin + item.duracaoMin;
      }
      resultado.push({ ...item, coluna, totalColunas: 0 });
    }
    // O total só fecha depois de ver o cluster inteiro — volta e carimba em
    // todo mundo que acabou de entrar.
    const totalColunas = fimPorColuna.length;
    for (let i = resultado.length - cluster.length; i < resultado.length; i++) {
      resultado[i].totalColunas = totalColunas;
    }
    cluster = [];
  }

  for (const item of ordenados) {
    if (cluster.length > 0 && item.inicioMin >= fimCluster) fecharCluster();
    cluster.push(item);
    fimCluster = Math.max(fimCluster, item.inicioMin + item.duracaoMin);
  }
  fecharCluster();

  return resultado;
}

function calcularFaixa(itens: ItemTimeline[]): [number, number] {
  let inicio = HORA_PADRAO_INICIO;
  let fim = HORA_PADRAO_FIM;
  for (const item of itens) {
    inicio = Math.min(inicio, Math.floor(item.inicioMin / 60));
    fim = Math.max(fim, Math.ceil((item.inicioMin + item.duracaoMin) / 60));
  }
  return [Math.max(0, inicio), Math.min(24, fim)];
}

/**
 * A grade horária estilo Google Calendar: hora na lateral, evento
 * posicionado na altura certa, duração vira a altura do bloco.
 *
 * Genérica de propósito — usada tanto no Calendário geral quanto no de
 * bancas, dois domínios diferentes. Por isso não desenha o CONTEÚDO de cada
 * evento (`conteudo` já vem pronto de quem chama) — só calcula onde ele
 * entra na grade.
 */
export function TimelineDia({
  itens,
  ehHoje = false,
  topo,
}: {
  itens: ItemTimeline[];
  ehHoje?: boolean;
  /** Conteúdo extra acima da grade horária. O calendário geral usa para os
   *  eventos "dia inteiro" (kickoff, reunião, entrega), que não têm hora pra
   *  entrar na timeline. Banca sempre tem hora, então o calendário de
   *  bancas nunca passa isto. */
  topo?: ReactNode;
}) {
  const [horaInicio, horaFim] = useMemo(() => calcularFaixa(itens), [itens]);
  const comColuna = useMemo(() => atribuirColunas(itens), [itens]);

  // A linha do "agora" no relógio de Brasília, igual às bancas da timeline.
  const agora = partesEmBrasilia(new Date());
  const minutosAgora = agora.hora * 60 + agora.minuto;
  const mostrarLinhaAgora =
    ehHoje && minutosAgora >= horaInicio * 60 && minutosAgora <= horaFim * 60;

  const horas = Array.from({ length: horaFim - horaInicio }, (_, i) => horaInicio + i);

  function topRem(min: number) {
    return ((min - horaInicio * 60) / 60) * ALTURA_HORA_REM;
  }

  return (
    <TimelineWrap>
      {topo}
      <GradeHoraria style={{ height: `${(horaFim - horaInicio) * ALTURA_HORA_REM}rem` }}>
        <ColunaHoras>
          {horas.map((h) => (
            <RotuloHora key={h}>
              <span>{String(h).padStart(2, "0")}:00</span>
            </RotuloHora>
          ))}
        </ColunaHoras>
        <ColunaEventos>
          {horas.map((h) => (
            <LinhaHora key={h} style={{ top: `${topRem(h * 60)}rem` }} />
          ))}
          {mostrarLinhaAgora && <LinhaAgora style={{ top: `${topRem(minutosAgora)}rem` }} />}
          {comColuna.map((item) => (
            <BlocoEvento
              key={item.chave}
              style={{
                top: `${topRem(item.inicioMin)}rem`,
                height: `${Math.max((item.duracaoMin / 60) * ALTURA_HORA_REM, 1.1)}rem`,
                left: `${(item.coluna / item.totalColunas) * 100}%`,
                width: `${100 / item.totalColunas}%`,
              }}
            >
              {item.conteudo}
            </BlocoEvento>
          ))}
        </ColunaEventos>
      </GradeHoraria>
    </TimelineWrap>
  );
}
