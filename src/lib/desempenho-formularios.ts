import { apiFetch } from "@/lib/api";
import type { DesempenhoFormulario, DesempenhoPapel, DesempenhoTipo, DesempenhoTipoResposta } from "@/types/desempenho";

/** Com `loteId`, traz a versão que AQUELE lote usa (congelada, se o
 *  formulário foi editado "só pra futuros" com o lote aberto). */
export function getFormulario(tipo: DesempenhoTipo, papel: DesempenhoPapel, token: string, loteId?: number) {
  const query = loteId != null ? `?lote_id=${loteId}` : "";
  return apiFetch<DesempenhoFormulario>(`/desempenho/formularios/${tipo}/${papel}${query}`, { token });
}

/** Lotes abertos que ainda usam a versão vigente deste formulário, ou seja,
 *  os que uma edição afetaria. É o que decide se a tela pergunta
 *  "aplicar ao lote em andamento ou só a futuros?". */
export function getLotesAbertosDoFormulario(tipo: DesempenhoTipo, papel: DesempenhoPapel, token: string) {
  return apiFetch<{ id: number; nome: string }[]>(`/desempenho/formularios/${tipo}/${papel}/lotes-abertos`, {
    token,
  });
}

interface CriterioInput {
  id?: number;
  label: string;
  descricao?: string | null;
  tipo_resposta: DesempenhoTipoResposta;
  limite_caracteres?: number | null;
}

interface SecaoInput {
  id?: number;
  titulo: string;
  descricao?: string | null;
  criterios: CriterioInput[];
}

export function updateFormulario(
  tipo: DesempenhoTipo,
  papel: DesempenhoPapel,
  payload: Partial<{
    nota_geral_titulo: string;
    nota_geral_descricao: string;
    comentarios_titulo: string;
    comentarios_descricao: string;
    comentarios_aviso: string;
    secoes: SecaoInput[];
    /** Com lote aberto: true aplica a edição ao lote em andamento; false
     *  congela a versão atual pros lotes abertos e a edição vale só pra
     *  futuros. Sem lote aberto, tanto faz. */
    aplicar_em_abertos: boolean;
  }>,
  token: string,
) {
  return apiFetch<DesempenhoFormulario>(`/desempenho/formularios/${tipo}/${papel}`, {
    aviso: "Formulário salvo", method: "PUT",
    token,
    body: JSON.stringify(payload),
  });
}
