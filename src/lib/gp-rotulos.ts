import { theme } from "@/styles/theme";
import type { GpAlvoPdi, GpCategoria, GpFaixa, GpOrigem, GpTipo } from "@/lib/gestao-pessoas";

/** Rótulos e cores da Gestão de Pessoas, num lugar só. */

export const ROTULO_CATEGORIA: Record<GpCategoria, string> = {
  obrigacoes: "Obrigações",
  desempenho: "Desempenho",
};

/** Em minúsculas, pra frase corrida ("pontos por obrigações"). */
export const CATEGORIA_MINUSCULA: Record<GpCategoria, string> = {
  obrigacoes: "obrigações",
  desempenho: "desempenho",
};

export const ROTULO_FAIXA: Record<GpFaixa, string> = {
  ok: "Regular",
  proximo: "Próximo do limite",
  limite: "No limite",
};

/** Tom do `PageBadge` por faixa. */
export const TOM_FAIXA: Record<GpFaixa, "success" | "warning" | "danger"> = {
  ok: "success",
  proximo: "warning",
  limite: "danger",
};

/** Cor sólida por faixa, pra barra de progresso e gráficos. */
export const COR_FAIXA: Record<GpFaixa, string> = {
  ok: theme.colors.success,
  proximo: theme.colors.warning,
  limite: theme.colors.destructive,
};

/** Cor por categoria nos gráficos: obrigações no vermelho institucional,
 *  desempenho no azul de informação. */
export const COR_CATEGORIA: Record<GpCategoria, string> = {
  obrigacoes: theme.colors.primary,
  desempenho: theme.colors.info,
};

/** Pontos positivos pesam contra a pessoa (vermelho); redução alivia (verde). */
export function corDosPontos(pontos: number): string {
  return pontos > 0 ? theme.colors.destructive : theme.colors.success;
}

export function pontosComSinal(pontos: number): string {
  return pontos > 0 ? `+${pontos}` : String(pontos);
}

export const ROTULO_ORIGEM: Record<GpOrigem, string> = {
  manual: "Manual",
  lote_desempenho: "Automático: lote de Avaliação de Desempenho",
  pasta_pdi: "Automático: pasta de PDI",
  tarefa: "Automático: tarefa atrasada",
  banca: "Automático: falta em banca",
};

export const ROTULO_ALVO_PDI: Record<GpAlvoPdi, string> = {
  mentorado: "Mentorado",
  mentor: "Mentor",
  ambos: "Os dois",
};

/** O campo de um ajuste, como aparece na linha do tempo. */
export const ROTULO_CAMPO_AJUSTE: Record<string, string> = {
  tipo: "Tipo",
  pontos: "Pontos",
  data: "Data",
  projeto: "Projeto",
  observacao: "Observação",
  status: "Status",
};

/** "Obrigações: Falta em reunião obrigatória (2 pts)". Sem `<optgroup>`
 *  porque o `SelectCustom` só lê `<option>` direto. */
export function rotuloDoTipo(tipo: GpTipo, comCategoria = true): string {
  const pts = `${tipo.pontos} pt${tipo.pontos === 1 ? "" : "s"}`;
  return comCategoria ? `${ROTULO_CATEGORIA[tipo.categoria]}: ${tipo.nome} (${pts})` : `${tipo.nome} (${pts})`;
}

/** Os tipos ativos na ordem do catálogo, obrigações antes de desempenho. */
export function tiposParaSelecao(tipos: GpTipo[], categoria?: GpCategoria): GpTipo[] {
  const ordem: GpCategoria[] = ["obrigacoes", "desempenho"];
  return tipos
    .filter((t) => t.ativo && (!categoria || t.categoria === categoria))
    .sort((a, b) => ordem.indexOf(a.categoria) - ordem.indexOf(b.categoria) || a.ordem - b.ordem);
}

/** A mesma substituição de variáveis do backend (contrato 3.3), pra prévia
 *  ao vivo do aviso por e-mail. */
export function renderizarAviso(
  texto: string,
  dados: { nome: string; categoria: GpCategoria; pontuacao: number; limite: number },
): string {
  const restantes = Math.max(0, dados.limite - dados.pontuacao);
  return texto
    .replace(/\{\{\s*nome_completo\s*\}\}/g, dados.nome)
    .replace(/\{\{\s*nome\s*\}\}/g, dados.nome.trim().split(/\s+/)[0] ?? "")
    .replace(/\{\{\s*categoria\s*\}\}/g, CATEGORIA_MINUSCULA[dados.categoria])
    .replace(/\{\{\s*pontuacao\s*\}\}/g, String(dados.pontuacao))
    .replace(/\{\{\s*limite\s*\}\}/g, String(dados.limite))
    .replace(/\{\{\s*restantes\s*\}\}/g, String(restantes));
}
