/**
 * Modo noturno: o site escurece quando o sol se põe em Brasília e volta a
 * clarear quando ele nasce.
 *
 * O nascer e o pôr saem do algoritmo de posição solar da NOAA (o mesmo da
 * planilha "Solar Calculator"), sem rede nenhuma: só a data, a latitude e a
 * longitude. Precisão de uns dois minutos, que é mais do que basta para
 * trocar um tema.
 *
 * A preferência (`automatico`, `claro`, `escuro`) fica no `localStorage` em
 * `atlas-tema`. `atlas-tema-atual` guarda o último resultado para o script
 * inline do `index.html` escurecer a página antes do React montar.
 */

export type PreferenciaTema = "automatico" | "claro" | "escuro";
export type Tema = "claro" | "escuro";

export const CHAVE_PREFERENCIA = "atlas-tema";
export const CHAVE_TEMA_ATUAL = "atlas-tema-atual";

/* Coordenadas e fuso de São Paulo, o mesmo fuso de Brasília. */
const LATITUDE = -23.55;
const LONGITUDE = -46.63;
const FUSO = "America/Sao_Paulo";

/* Refração atmosférica mais o raio do disco: o sol "nasce" quando o centro
   está 0,833° abaixo do horizonte, que é o que os almanaques publicam. */
const ZENITE_NASCER = 90.833;

const MS_POR_DIA = 86_400_000;
const MS_POR_MINUTO = 60_000;

const rad = (graus: number) => (graus * Math.PI) / 180;
const graus = (radianos: number) => (radianos * 180) / Math.PI;

interface DiaLocal {
  ano: number;
  mes: number;
  dia: number;
}

const formatoDia = new Intl.DateTimeFormat("en-CA", {
  timeZone: FUSO,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** O dia do calendário em Brasília em que `instante` cai. */
function diaLocal(instante: Date): DiaLocal {
  const [ano, mes, dia] = formatoDia.format(instante).split("-").map(Number);
  return { ano, mes, dia };
}

/**
 * Nascer e pôr do sol de um dia do calendário, em instantes absolutos.
 *
 * As contas da NOAA dão os eventos em minutos UTC a partir da meia-noite UTC
 * do dia; como Brasília é UTC-3 e os dois eventos caem entre 8h e 22h UTC, os
 * dois ficam no mesmo dia UTC do dia local, sem virada de data para tratar.
 */
export function solDoDia({ ano, mes, dia }: DiaLocal): { nascer: Date; por: Date } {
  const meiaNoiteUtc = Date.UTC(ano, mes - 1, dia);
  // Dia juliano ao meio-dia UTC, que é o instante de referência da planilha.
  const dj = meiaNoiteUtc / MS_POR_DIA + 2440587.5 + 0.5;
  const sj = (dj - 2451545) / 36525;

  const longMedia = (280.46646 + sj * (36000.76983 + sj * 0.0003032)) % 360;
  const anomMedia = 357.52911 + sj * (35999.05029 - 0.0001537 * sj);
  const excentricidade = 0.016708634 - sj * (0.000042037 + 0.0000001267 * sj);
  const equacaoCentro =
    Math.sin(rad(anomMedia)) * (1.914602 - sj * (0.004817 + 0.000014 * sj)) +
    Math.sin(rad(2 * anomMedia)) * (0.019993 - 0.000101 * sj) +
    Math.sin(rad(3 * anomMedia)) * 0.000289;
  const longVerdadeira = longMedia + equacaoCentro;
  const longAparente = longVerdadeira - 0.00569 - 0.00478 * Math.sin(rad(125.04 - 1934.136 * sj));
  const obliqMedia = 23 + (26 + (21.448 - sj * (46.815 + sj * (0.00059 - sj * 0.001813))) / 60) / 60;
  const obliqCorrigida = obliqMedia + 0.00256 * Math.cos(rad(125.04 - 1934.136 * sj));
  const declinacao = graus(Math.asin(Math.sin(rad(obliqCorrigida)) * Math.sin(rad(longAparente))));

  const y = Math.tan(rad(obliqCorrigida / 2)) ** 2;
  const equacaoTempo =
    4 *
    graus(
      y * Math.sin(2 * rad(longMedia)) -
        2 * excentricidade * Math.sin(rad(anomMedia)) +
        4 * excentricidade * y * Math.sin(rad(anomMedia)) * Math.cos(2 * rad(longMedia)) -
        0.5 * y * y * Math.sin(4 * rad(longMedia)) -
        1.25 * excentricidade * excentricidade * Math.sin(2 * rad(anomMedia)),
    );

  const anguloHorario = graus(
    Math.acos(
      Math.cos(rad(ZENITE_NASCER)) / (Math.cos(rad(LATITUDE)) * Math.cos(rad(declinacao))) -
        Math.tan(rad(LATITUDE)) * Math.tan(rad(declinacao)),
    ),
  );

  const meioDiaSolar = 720 - 4 * LONGITUDE - equacaoTempo;
  return {
    nascer: new Date(meiaNoiteUtc + (meioDiaSolar - anguloHorario * 4) * MS_POR_MINUTO),
    por: new Date(meiaNoiteUtc + (meioDiaSolar + anguloHorario * 4) * MS_POR_MINUTO),
  };
}

/** O dia seguinte ao de `instante`, no calendário de Brasília. */
function diaSeguinte(instante: Date): DiaLocal {
  const { ano, mes, dia } = diaLocal(instante);
  return diaLocal(new Date(Date.UTC(ano, mes - 1, dia + 1, 12)));
}

/** Escuro entre o pôr do sol e o nascer seguinte. */
export function temaAutomatico(agora: Date): Tema {
  const { nascer, por } = solDoDia(diaLocal(agora));
  return agora < nascer || agora >= por ? "escuro" : "claro";
}

/** O instante da próxima troca: o nascer ou o pôr que ainda não aconteceu. */
export function proximaTroca(agora: Date): Date {
  const { nascer, por } = solDoDia(diaLocal(agora));
  if (agora < nascer) return nascer;
  if (agora < por) return por;
  return solDoDia(diaSeguinte(agora)).nascer;
}

/* ------------------------------------------------------------------ */
/* Preferência                                                         */
/* ------------------------------------------------------------------ */

export function lerPreferencia(): PreferenciaTema {
  try {
    const bruta = localStorage.getItem(CHAVE_PREFERENCIA);
    return bruta === "claro" || bruta === "escuro" ? bruta : "automatico";
  } catch {
    return "automatico";
  }
}

export function gravarPreferencia(preferencia: PreferenciaTema): void {
  try {
    if (preferencia === "automatico") localStorage.removeItem(CHAVE_PREFERENCIA);
    else localStorage.setItem(CHAVE_PREFERENCIA, preferencia);
  } catch {
    // Sem storage (modo privado, cota cheia) a escolha vale só nesta aba.
  }
}

export function gravarTemaAtual(tema: Tema): void {
  try {
    localStorage.setItem(CHAVE_TEMA_ATUAL, tema);
  } catch {
    // Idem: só perde o pré-carregamento do index.html.
  }
}

export function resolverTema(preferencia: PreferenciaTema, agora: Date): Tema {
  return preferencia === "automatico" ? temaAutomatico(agora) : preferencia;
}
