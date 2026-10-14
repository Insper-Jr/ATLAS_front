import { apiFetch } from "@/lib/api";

/**
 * O calendário acadêmico do Insper, a carga que **define o dia útil**.
 *
 * Sem estes dados, `contar_dias_uteis` só exclui fim de semana, e toda a
 * contagem do sistema fica errada por feriado e semana de prova. É por isso
 * que este é o passo 1 do roteiro de demo.
 */

export type TipoDiaNaoLetivo = "feriado" | "prova" | "recesso" | "outro";

export interface DiaNaoLetivo {
  id: number;
  semestre_id: number;
  data: string;
  tipo: TipoDiaNaoLetivo;
  descricao: string | null;
  /** `null` = vale para TODAS as frentes (feriado nacional, por exemplo). */
  frente_id: number | null;
  /**
   * O calendário dentro da frente. `null` = vale para a frente INTEIRA.
   *
   * Uma frente cobre mais de um curso, e nem sempre eles têm as mesmas datas:
   * dentro da Tech, Ciência da Computação não segue o calendário das
   * engenharias. Aqui vem o rótulo do calendário a que o dia pertence.
   */
  variante: string | null;
}

export interface Semestre {
  id: number;
  nome: string;
  inicio: string;
  fim: string;
  status: "ativa" | "arquivada";
}

export const ROTULO_TIPO_DIA: Record<TipoDiaNaoLetivo, string> = {
  feriado: "Feriado",
  prova: "Semana de provas",
  recesso: "Recesso",
  outro: "Outro",
};

export function getSemestres(token: string) {
  return apiFetch<Semestre[]>("/semestres", { token });
}

export function createSemestre(
  dados: { nome: string; inicio: string; fim: string },
  token: string,
) {
  return apiFetch<Semestre>("/semestres", {
    aviso: "Semestre criado", method: "POST",
    token,
    body: JSON.stringify(dados),
  });
}

/** Arquivar a gestão, os indicadores reiniciam na próxima. */
export function updateSemestre(
  semestreId: number,
  dados: { status?: "ativa" | "arquivada"; nome?: string; inicio?: string; fim?: string },
  token: string,
) {
  return apiFetch<Semestre>(`/semestres/${semestreId}`, {
    aviso: "Semestre salvo", method: "PATCH",
    token,
    body: JSON.stringify(dados),
  });
}

export function getDiasNaoLetivos(semestreId: number, token: string) {
  return apiFetch<DiaNaoLetivo[]>(`/semestres/${semestreId}/dias-nao-letivos`, { token });
}

/**
 * O calendário base de uma frente.
 *
 * `apenasDaFrente` corta os dias globais da resposta, é o que a tela de
 * edição usa, para a diretoria não apagar um feriado nacional achando que
 * está mexendo só no calendário de Business.
 */
/**
 * `variantes` aceita VÁRIOS calendários de uma vez, e é assim que a tela de
 * conferência mostra engenharias e Ciência da Computação lado a lado. Cada dia
 * volta com o dono em `variante`, então ver as duas é comparar, não misturar.
 *
 * Vazio traz só o que vale para a frente inteira, mais os feriados globais —
 * que entram sempre, em qualquer combinação.
 */
export function getCalendarioDaFrente(
  semestreId: number,
  frenteId: number,
  token: string,
  apenasDaFrente = false,
  variantes: string[] = [],
) {
  const q = [
    `frente_id=${frenteId}`,
    apenasDaFrente ? "apenas_da_frente=true" : "",
    ...variantes.map((v) => `variante=${encodeURIComponent(v)}`),
  ]
    .filter(Boolean)
    .join("&");
  return apiFetch<DiaNaoLetivo[]>(`/semestres/${semestreId}/dias-nao-letivos?${q}`, { token });
}

export interface CalendariosDaFrente {
  frente_id: number;
  /** O calendário que vale para um projeto que não escolheu. `null` na frente de um curso só. */
  padrao: string | null;
  /** Os calendários que existem nesta frente. Vazio = ela tem um só. */
  calendarios: string[];
}

/**
 * Quais calendários existem dentro de uma frente.
 *
 * Vazio é o caso normal e a tela nem mostra o seletor: só a Tech cobre cursos
 * que discordam sobre as datas.
 */
export function getCalendariosDaFrente(semestreId: number, frenteId: number, token: string) {
  return apiFetch<CalendariosDaFrente>(
    `/semestres/${semestreId}/calendarios?frente_id=${frenteId}`,
    { token },
  );
}

/** Define qual calendário da frente vale para quem não escolheu o dele. */
export function definirCalendarioPadrao(
  frenteId: number,
  calendario: string | null,
  token: string,
) {
  return apiFetch(`/frentes/${frenteId}`, {
    aviso: "Calendário padrão definido", method: "PATCH",
    token,
    body: JSON.stringify({ calendario_padrao: calendario }),
  });
}

export interface DiaLidoDoPdf {
  data: string;
  tipo: TipoDiaNaoLetivo;
  /** A linha da legenda do PDF: feriado, avaliacao_final, recesso… */
  categoria: string;
  /** O nome legível da categoria, como está na legenda. */
  rotulo: string;
  /**
   * A quem o dia pertence.
   *
   * Feriado é do país e vale para todas as frentes, subir o PDF de Business
   * não pode criar uma cópia dele em cada frente. Todo o resto sai do
   * calendário de um CURSO: avaliação, recesso e aulas canceladas de
   * Administração não são os de Engenharia.
   */
  escopo: "global" | "frente";
}

export interface CategoriaDoPdf {
  chave: string;
  rotulo: string;
  tipo: TipoDiaNaoLetivo;
  escopo: "global" | "frente";
  /** Quantos dias desta categoria caíram dentro do semestre. */
  encontrados: number;
}

export interface LeituraPdf {
  semestre_id: number;
  frente_id: number | null;
  /** Em qual calendário da frente este PDF vai cair. Volta como foi mandado. */
  variante: string | null;
  dias: DiaLidoDoPdf[];
  /** O catálogo vem do backend para o filtro não repetir a lista aqui. */
  categorias: CategoriaDoPdf[];
  resumo: {
    lidos: number;
    no_semestre: number;
    fora_do_semestre: number;
    /** Diferente de zero = o layout do PDF mudou e algo não foi reconhecido. */
    nao_reconhecidos: number;
  };
}

/**
 * Lê o PDF e devolve o que encontrou, NÃO grava.
 *
 * A gravação é uma chamada separada, depois da conferência na tela. A leitura
 * é posicional e pode errar se o Insper mudar o layout; salvar direto
 * contaminaria o cálculo de dias úteis de todos os projetos sem ninguém ver.
 */
export function lerCalendarioPdf(
  semestreId: number,
  frenteId: number,
  arquivo: File,
  token: string,
  variante?: string | null,
) {
  const corpo = new FormData();
  corpo.append("arquivo", arquivo);
  const q = `frente_id=${frenteId}${variante ? `&variante=${encodeURIComponent(variante)}` : ""}`;
  return apiFetch<LeituraPdf>(
    `/semestres/${semestreId}/dias-nao-letivos/ler-pdf?${q}`,
    { method: "POST", token, body: corpo },
  );
}

export interface DiaNaoLetivoPayload {
  data: string;
  tipo: TipoDiaNaoLetivo;
  descricao?: string | null;
}

export interface ResultadoCarga {
  semestre_id: number;
  criados: number;
  /** Datas que já estavam carregadas, a rota é idempotente por (semestre, data). */
  ignorados: number;
  dias: DiaNaoLetivo[];
}

/**
 * Carga em lote, o calendário inteiro do semestre de uma vez.
 *
 * Com `frenteId`, grava o calendário base daquela frente; sem ele, o global.
 * `variante` desce mais um degrau e grava dentro de UM calendário da frente.
 *
 * `substituir` limpa antes, mas só o MESMO recorte: recarregar o PDF de
 * Business não pode derrubar o que foi conferido em Tech, nem o de Ciência da
 * Computação apagar o das engenharias, que está na mesma frente. Por isso
 * `variante` tem de viajar junto sempre que `substituir` for verdadeiro.
 */
export function carregarDiasNaoLetivos(
  semestreId: number,
  dias: DiaNaoLetivoPayload[],
  token: string,
  opcoes?: { frenteId?: number | null; substituir?: boolean; variante?: string | null },
) {
  return apiFetch<ResultadoCarga>(`/semestres/${semestreId}/dias-nao-letivos`, {
    aviso: "Dias não letivos carregados", method: "POST",
    token,
    body: JSON.stringify({
      dias,
      frente_id: opcoes?.frenteId ?? null,
      variante: opcoes?.variante ?? null,
      substituir: opcoes?.substituir ?? false,
    }),
  });
}

export function deleteDiaNaoLetivo(diaId: number, token: string) {
  return apiFetch(`/dias-nao-letivos/${diaId}`, { aviso: "Dia removido", method: "DELETE", token });
}

export function limparDiasNaoLetivos(semestreId: number, token: string) {
  return apiFetch(`/semestres/${semestreId}/dias-nao-letivos`, { aviso: "Dias não letivos limpos", method: "DELETE", token });
}

/**
 * Interpreta a colagem de um calendário: uma linha por dia, nos formatos
 * `dd/mm/aaaa; tipo; descrição` ou `aaaa-mm-dd, tipo, descrição`.
 *
 * O  do briefing prevê leitura de imagem por OCR para a GRADE HORÁRIA
 * (coisa diferente, e fora desta entrega). Aqui é só colar texto, que é
 * como a diretoria recebe o calendário do Insper.
 */
export function interpretarColagem(texto: string): {
  dias: DiaNaoLetivoPayload[];
  erros: string[];
} {
  const dias: DiaNaoLetivoPayload[] = [];
  const erros: string[] = [];

  texto
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .forEach((linha, indice) => {
      const partes = linha.split(/[;,\t]/).map((p) => p.trim());
      const data = normalizarData(partes[0]);
      if (!data) {
        erros.push(`Linha ${indice + 1}: não entendi a data "${partes[0]}"`);
        return;
      }
      const tipoBruto = (partes[1] ?? "feriado").toLowerCase();
      const tipo: TipoDiaNaoLetivo = (
        ["feriado", "prova", "recesso", "outro"] as const
      ).includes(tipoBruto as TipoDiaNaoLetivo)
        ? (tipoBruto as TipoDiaNaoLetivo)
        : "outro";
      dias.push({ data, tipo, descricao: partes[2] || null });
    });

  return { dias, erros };
}

function normalizarData(bruto: string | undefined): string | null {
  if (!bruto) return null;
  const iso = bruto.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return bruto;
  const br = bruto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (br) {
    const [, d, m, a] = br;
    return `${a}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return null;
}
