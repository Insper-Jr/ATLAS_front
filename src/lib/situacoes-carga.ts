import { apiFetch } from "@/lib/api";

/* A escala de carga da aba de Alocação, definida pela diretoria.
 * Espelha `use_cases/situacao_carga/`.
 *
 * São sempre TRÊS faixas por papel: só existe editar, não criar nem excluir.
 * É o que garante que o card de demanda alta nunca fique vazio por
 * configuração, a faixa mais alta existe por construção. */

export type PapelCarga = "coordenador" | "consultor";
/** Escolha fechada, não cor livre: a rampa do monitoramento carrega
 *  significado de gravidade, e cor arbitrária quebraria essa leitura além de
 *  escapar do contraste mínimo. */
export type TomSituacao = "ok" | "atencao" | "alerta" | "neutro";

export interface SituacaoCarga {
  id: number;
  papel: PapelCarga;
  nome: string;
  /** A partir de quantos projetos esta situação vale. Ela cobre até o mínimo
   *  da próxima, por isso não existe campo de máximo, e por isso não há como
   *  configurar faixa com buraco ou sobreposta. */
  min_projetos: number;
  tom: TomSituacao;
}

export type EditarSituacao = Partial<Omit<SituacaoCarga, "id" | "papel">>;

export const ROTULO_TOM: Record<TomSituacao, string> = {
  ok: "Verde (tudo bem)",
  neutro: "Cinza (neutro)",
  atencao: "Âmbar (atenção)",
  alerta: "Vermelho (alerta)",
};

export function getSituacoesCarga(token: string) {
  return apiFetch<SituacaoCarga[]>("/situacoes-carga", { token });
}

export function atualizarSituacaoCarga(id: number, dados: EditarSituacao, token: string) {
  return apiFetch<SituacaoCarga>(`/situacoes-carga/${id}`, {
    aviso: "Situação salva", method: "PATCH",
    token,
    body: JSON.stringify(dados),
  });
}

/** Como a faixa se lê na tela: "0 a 1", "2", "3 ou mais". */
export function descreverFaixa(situacao: SituacaoCarga, proxima?: SituacaoCarga): string {
  if (!proxima) return `${situacao.min_projetos} ou mais`;
  const ate = proxima.min_projetos - 1;
  return ate === situacao.min_projetos
    ? `${situacao.min_projetos}`
    : `${situacao.min_projetos} a ${ate}`;
}
