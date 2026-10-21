import { diasEntre, hojeEmBrasilia, somarDias } from "@/lib/fuso";
import type { GpRegistro } from "@/lib/gestao-pessoas";

/** As contas das Análises (spec 4.6 e 5.1), todas sobre `GET /registros`. */

export interface Periodo {
  de: string;
  ate: string;
  rotulo: string;
}

export type ChavePeriodo = "semestre" | "semana" | "mes" | "trimestre" | "custom";

export function formatarDia(dia: string): string {
  const [a, m, d] = dia.split("-");
  return `${d}/${m}/${a}`;
}

export function periodoDoFiltro(
  chave: ChavePeriodo,
  semestre: { nome: string; inicio: string; fim: string },
  custom: { de: string; ate: string },
): Periodo {
  const hoje = hojeEmBrasilia();
  switch (chave) {
    case "semana":
      return { de: somarDias(hoje, -6), ate: hoje, rotulo: "últimos 7 dias" };
    case "mes":
      return { de: somarDias(hoje, -29), ate: hoje, rotulo: "últimos 30 dias" };
    case "trimestre":
      return { de: somarDias(hoje, -89), ate: hoje, rotulo: "últimos 90 dias" };
    case "custom":
      return { de: custom.de, ate: custom.ate, rotulo: `${formatarDia(custom.de)} a ${formatarDia(custom.ate)}` };
    default:
      return { de: semestre.inicio.slice(0, 10), ate: semestre.fim.slice(0, 10), rotulo: `gestão ${semestre.nome}` };
  }
}

export function registrosAtivosNoPeriodo(registros: GpRegistro[], de: string, ate: string): GpRegistro[] {
  return registros.filter((r) => r.status === "ativo" && r.data >= de && r.data <= ate);
}

export function somaPontos(registros: GpRegistro[]): number {
  return registros.reduce((total, r) => total + r.pontos, 0);
}

export interface Estatisticas {
  n: number;
  media: number;
  mediana: number;
  desvio: number;
  acimaDaMedia: number;
}

/** Média, mediana, desvio-padrão amostral (n-1; 0 se n <= 1) e % acima da média. */
export function estatisticas(valores: number[]): Estatisticas {
  const n = valores.length;
  if (n === 0) return { n: 0, media: 0, mediana: 0, desvio: 0, acimaDaMedia: 0 };
  const media = valores.reduce((a, b) => a + b, 0) / n;
  const ordenados = [...valores].sort((a, b) => a - b);
  const mediana = n % 2 === 1 ? ordenados[(n - 1) / 2] : (ordenados[n / 2 - 1] + ordenados[n / 2]) / 2;
  const desvio = n <= 1 ? 0 : Math.sqrt(valores.reduce((acc, v) => acc + (v - media) ** 2, 0) / (n - 1));
  const acimaDaMedia = (valores.filter((v) => v > media).length / n) * 100;
  return { n, media, mediana, desvio, acimaDaMedia };
}

/** Densidade da normal teórica escalada por `n` (área = n membros). */
export function normalTeorica(x: number, n: number, media: number, desvio: number): number {
  return (n * Math.exp(-((x - media) ** 2) / (2 * desvio ** 2))) / (desvio * Math.sqrt(2 * Math.PI));
}

/** A segunda-feira da semana do dia. */
export function inicioDaSemana(dia: string): string {
  const [a, m, d] = dia.split("-").map(Number);
  const diaDaSemana = new Date(Date.UTC(a, m - 1, d)).getUTCDay();
  return somarDias(dia, diaDaSemana === 0 ? -6 : 1 - diaDaSemana);
}

export function inicioDoMes(dia: string): string {
  return `${dia.slice(0, 7)}-01`;
}

export function proximoMes(dia: string): string {
  const [a, m] = dia.split("-").map(Number);
  const ano = m === 12 ? a + 1 : a;
  const mes = m === 12 ? 1 : m + 1;
  return `${ano}-${String(mes).padStart(2, "0")}-01`;
}

export function fimDoMes(dia: string): string {
  return somarDias(proximoMes(inicioDoMes(dia)), -1);
}

const MESES_CURTOS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const MESES_LONGOS = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

export function mesCurto(dia: string): string {
  const [a, m] = dia.split("-");
  return `${MESES_CURTOS[Number(m) - 1]}/${a.slice(2)}`;
}

export function mesLongo(dia: string): string {
  const [a, m] = dia.split("-");
  const nome = MESES_LONGOS[Number(m) - 1];
  return `${nome.charAt(0).toUpperCase()}${nome.slice(1)} de ${a}`;
}

export type Granularidade = "semana" | "mes";
export type MetricaTempo = "total" | "ocorr" | "membro";

export interface Bucket {
  inicio: string;
  fim: string;
  rotulo: string;
  titulo: string;
  pontos: number;
  ocorrencias: number;
}

/** Buckets semanais (segunda a domingo) ou mensais de `de` até `min(ate, hoje)`. */
export function serieTempo(registros: GpRegistro[], de: string, ate: string, gran: Granularidade): Bucket[] {
  const ateReal = ate < hojeEmBrasilia() ? ate : hojeEmBrasilia();
  if (de > ateReal) return [];
  const ativos = registrosAtivosNoPeriodo(registros, de, ateReal);
  const buckets: Bucket[] = [];
  let inicio = gran === "semana" ? inicioDaSemana(de) : inicioDoMes(de);
  let indice = 0;
  while (inicio <= ateReal && indice < 200) {
    const fim = gran === "semana" ? somarDias(inicio, 6) : fimDoMes(inicio);
    const dentro = ativos.filter((r) => r.data >= inicio && r.data <= fim);
    buckets.push({
      inicio,
      fim,
      rotulo: gran === "semana" ? formatarDia(inicio).slice(0, 5) : mesCurto(inicio),
      titulo:
        gran === "semana"
          ? `Semana ${indice + 1}, de ${formatarDia(inicio)} a ${formatarDia(fim)}`
          : mesLongo(inicio),
      pontos: somaPontos(dentro),
      ocorrencias: dentro.length,
    });
    inicio = gran === "semana" ? somarDias(inicio, 7) : proximoMes(inicio);
    indice += 1;
  }
  return buckets;
}

export function valorDoBucket(b: Bucket, metrica: MetricaTempo, ativos: number): number {
  if (metrica === "total") return b.pontos;
  if (metrica === "ocorr") return b.ocorrencias;
  return ativos > 0 ? Number((b.pontos / ativos).toFixed(2)) : 0;
}

/** Variação B sobre A em %; `null` quando A é 0 (a tela escreve "novo"). */
export function variacao(a: number, b: number): number | null {
  if (a === 0) return null;
  return ((b - a) / a) * 100;
}

export function formatarVariacao(a: number, b: number): string {
  const v = variacao(a, b);
  if (v === null) return b > 0 ? "novo" : "sem base";
  const sinal = v > 0 ? "+" : "";
  return `${sinal}${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

/** Semanas de um período (mínimo 1); períodos em andamento contam só até hoje. */
export function semanasDoPeriodo(de: string, ate: string): number {
  const ateReal = ate < hojeEmBrasilia() ? ate : hojeEmBrasilia();
  const dias = Math.max(0, diasEntre(de, ateReal));
  return Math.max(1, (dias + 1) / 7);
}

/** Os meses do semestre (primeiro dia de cada um), pra montar os presets
 *  de comparação sem ano fixo. */
export function mesesDoSemestre(inicio: string, fim: string): string[] {
  const meses: string[] = [];
  let m = inicioDoMes(inicio.slice(0, 10));
  while (m <= fim.slice(0, 10) && meses.length < 12) {
    meses.push(m);
    m = proximoMes(m);
  }
  return meses;
}
