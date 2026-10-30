import { preIndicarNaBanca } from "@/lib/central";
import { avisar } from "@/lib/toast";

export interface PreIndicacao {
  titulo: string;
  /** A chave da categoria (`cc_categoria.chave`). */
  tipo: string;
  porQue: string;
}

export const PRE_INDICACAO_VAZIA: PreIndicacao = { titulo: "", tipo: "metodologia", porQue: "" };

export function preIndicacaoPreenchida(v: PreIndicacao): boolean {
  return v.titulo.trim().length > 0 || v.porQue.trim().length > 0;
}

/**
 * Manda a pré-indicação depois que a avaliação foi enviada. Nunca derruba
 * a avaliação: se falhar, avisa e devolve a mensagem para a tela decidir.
 */
export async function enviarPreIndicacao(bancaId: number, v: PreIndicacao, token: string): Promise<string | null> {
  if (!preIndicacaoPreenchida(v)) return null;
  if (v.titulo.trim().length < 3 || v.porQue.trim().length < 10) {
    const msg = "A indicação para a Central precisa de um título e de uma justificativa (não foi enviada).";
    avisar(msg, "erro");
    return msg;
  }
  try {
    await preIndicarNaBanca(bancaId, { titulo: v.titulo.trim(), tipos: [v.tipo], por_que_se_destacou: v.porQue.trim() }, token);
    return null;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "A indicação para a Central não foi enviada";
    avisar(msg, "erro");
    return msg;
  }
}

