/**
 * O fuso do ATLAS no front (2026-10-20, a pedido: "TUDO do ATLAS é
 * Brasília"). Mesma ideia de `src/utils/fuso.py` no backend.
 *
 * O backend manda dois tipos de valor:
 * - instante, em UTC e sem o "Z" ("2026-08-07T03:16:00"): carimbos
 *   (`criado_em`, `enviado_em`...), `banca.data_hora`, início e fim de lote;
 * - dia de calendário puro ("2026-08-07"): prazos, entregas, kickoff.
 *
 * Instante passa por aqui antes de virar texto, dia ou hora, e sempre no
 * fuso de Brasília, nunca no do navegador: quem está em intercâmbio vê e
 * marca o mesmo horário de quem está em São Paulo. Dia puro nunca passa por
 * `new Date`, que o leria como meia-noite UTC (21h do dia anterior aqui).
 */

export const FUSO = "America/Sao_Paulo";

const DIA_PURO = /^\d{4}-\d{2}-\d{2}$/;
const DIAS_DA_SEMANA = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const formatadorDePartes = new Intl.DateTimeFormat("en-US", {
  timeZone: FUSO,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  weekday: "short",
});

const pad = (n: number) => String(n).padStart(2, "0");

export function ehDiaPuro(valor: string): boolean {
  return DIA_PURO.test(valor);
}

/**
 * Instante do backend como `Date`. Sem fuso marcado, `new Date(...)` lê a
 * string como hora LOCAL em vez de UTC e erra por 3h; com fuso (`Z` ou
 * `+00:00`), respeita o que veio.
 */
export function paraDataUtc(iso: string): Date {
  const temFuso = /Z$|[+-]\d{2}:?\d{2}$/.test(iso);
  return new Date(temFuso ? iso : `${iso}Z`);
}

export interface PartesEmBrasilia {
  ano: number;
  mes: number;
  dia: number;
  hora: number;
  minuto: number;
  /** 0 = domingo, igual a `Date.getDay()`. */
  diaDaSemana: number;
}

/** Ano, mês, dia, hora e minuto do instante no relógio de Brasília. */
export function partesEmBrasilia(instante: Date): PartesEmBrasilia {
  const partes: Record<string, string> = {};
  for (const p of formatadorDePartes.formatToParts(instante)) partes[p.type] = p.value;
  return {
    ano: Number(partes.year),
    mes: Number(partes.month),
    dia: Number(partes.day),
    hora: Number(partes.hour) % 24,
    minuto: Number(partes.minute),
    diaDaSemana: DIAS_DA_SEMANA.indexOf(partes.weekday),
  };
}

/** "YYYY-MM-DD" do dia de Brasília em que o instante caiu. */
export function diaEmBrasilia(instante: Date): string {
  const p = partesEmBrasilia(instante);
  return `${p.ano}-${pad(p.mes)}-${pad(p.dia)}`;
}

/** Hoje em Brasília, "YYYY-MM-DD". Nunca `toISOString().slice(0, 10)`, que
 *  já é amanhã a partir das 21h daqui. */
export function hojeEmBrasilia(): string {
  return diaEmBrasilia(new Date());
}

/**
 * O dia de calendário de qualquer valor do backend: dia puro passa direto,
 * instante vira o dia de Brasília em que caiu. Uma banca às 21h30 de 10/08
 * chega como "2026-08-11T00:30:00" e precisa contar como 10/08.
 */
export function diaDoValor(valor: string): string {
  if (ehDiaPuro(valor)) return valor;
  const instante = paraDataUtc(valor);
  if (Number.isNaN(instante.getTime())) return valor.slice(0, 10);
  return diaEmBrasilia(instante);
}

/** "HH:mm" do instante em Brasília. */
export function horaEmBrasilia(instante: Date): string {
  const p = partesEmBrasilia(instante);
  return `${pad(p.hora)}:${pad(p.minuto)}`;
}

/** Minutos de diferença entre Brasília e UTC naquele instante (hoje, -180). */
function deslocamentoEmMinutos(instante: Date): number {
  const p = partesEmBrasilia(instante);
  const comoSeFosseUtc = Date.UTC(p.ano, p.mes - 1, p.dia, p.hora, p.minuto);
  const semSegundos = Math.floor(instante.getTime() / 60000) * 60000;
  return (comoSeFosseUtc - semSegundos) / 60000;
}

/**
 * O instante (ISO em UTC, com "Z") de um dia e hora digitados como horário
 * de Brasília. É o que vai pro backend quando alguém marca banca ou abre
 * lote: `new Date("2026-08-10T14:00").toISOString()` usaria o fuso do
 * navegador, e quem está em Lisboa marcaria 10h daqui achando que era 14h.
 * Confere o deslocamento duas vezes pra acertar a virada de horário de
 * verão, se o Brasil voltar a ter.
 */
export function instanteDeBrasilia(dia: string, hora: string): string {
  const [ano, mes, d] = dia.split("-").map(Number);
  const [h, m] = hora.split(":").map(Number);
  const ingenuo = Date.UTC(ano, mes - 1, d, h, m || 0);
  let deslocamento = deslocamentoEmMinutos(new Date(ingenuo));
  let instante = ingenuo - deslocamento * 60000;
  const conferido = deslocamentoEmMinutos(new Date(instante));
  if (conferido !== deslocamento) {
    deslocamento = conferido;
    instante = ingenuo - deslocamento * 60000;
  }
  return new Date(instante).toISOString();
}

/** Dia ("YYYY-MM-DD") e hora ("HH:mm") de Brasília de um instante do
 *  backend, pra preencher `<input type="date">` e `<input type="time">`. */
export function camposDeBrasilia(iso: string): { dia: string; hora: string } {
  const instante = paraDataUtc(iso);
  return { dia: diaEmBrasilia(instante), hora: horaEmBrasilia(instante) };
}

/** Um dia da grade de um calendário (Date montado no fuso do navegador, como
 *  os do date-fns) é hoje em Brasília? `isToday` comparava com o hoje do
 *  navegador, e fora do Brasil o destaque caía no dia errado. */
export function ehHojeEmBrasilia(diaDaGrade: Date): boolean {
  const chave = `${diaDaGrade.getFullYear()}-${pad(diaDaGrade.getMonth() + 1)}-${pad(diaDaGrade.getDate())}`;
  return chave === hojeEmBrasilia();
}

/** "YYYY-MM-DD" somado de `dias` dias de calendário (negativo volta). */
export function somarDias(dia: string, dias: number): string {
  const [a, m, d] = dia.split("-").map(Number);
  const alvo = new Date(Date.UTC(a, m - 1, d + dias));
  return `${alvo.getUTCFullYear()}-${pad(alvo.getUTCMonth() + 1)}-${pad(alvo.getUTCDate())}`;
}

/** Dias de calendário entre dois "YYYY-MM-DD" (positivo se `ate` vem depois). */
export function diasEntre(de: string, ate: string): number {
  const [a1, m1, d1] = de.split("-").map(Number);
  const [a2, m2, d2] = ate.split("-").map(Number);
  return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86400000);
}
