import { apiFetch } from "@/lib/api";
import type {
  Avaliacao,
  AvaliacaoNota,
  FormularioAtivo,
  NotaPorPergunta,
  Pergunta,
  PerguntaNovaVersao,
} from "@/types/banca";

export function getFormularioAtivo(token: string) {
  return apiFetch<FormularioAtivo>("/formularios/ativo", { token });
}

/** O ponto de partida do EDITOR: a versão ativa se tiver conteúdo, senão a
 *  última versão que tem. Assim "Publicar nova versão" nunca parte de uma
 *  tela em branco e apaga o que já estava salvo. Ver a rota
 *  `/formularios/para-editar` no backend. */
export function getFormularioParaEditar(token: string) {
  return apiFetch<FormularioAtivo>("/formularios/para-editar", { token });
}

export function createNovaVersaoFormulario(perguntas: PerguntaNovaVersao[], token: string) {
  return apiFetch<FormularioAtivo>("/formularios/nova-versao", {
    method: "POST",
    token,
    body: JSON.stringify({ perguntas }),
  });
}

export function getAvaliacoes(token: string) {
  return apiFetch<Avaliacao[]>("/avaliacoes", { token });
}

export function getAvaliacoesNotas(token: string) {
  return apiFetch<AvaliacaoNota[]>("/avaliacoes-notas", { token });
}

export function getPerguntas(token: string) {
  return apiFetch<Pergunta[]>("/perguntas", { token });
}

/** Backend usa "nota" ou "dissertativa"/"texto" para perguntas abertas. */
export function isPerguntaNota(tipo: string): boolean {
  return tipo === "nota";
}

export function formatNota(nota: number | null | undefined): string {
  if (nota == null) return "—";
  return nota.toFixed(1);
}

/** Escala 1-5 do formulário: < 3 grita (vermelho), 3 é meio-termo (âmbar),
 *  4-5 é bom (verde). Mesma leitura da AVD. ⚠ `"default"` do PageBadge é
 *  avermelhado — nunca usar pra nota "ok".
 *
 *  Compartilhado entre o Dashboard Bancas e "minhas avaliações" (2026-09-15,
 *  a pedido): as duas telas mostravam a mesma nota de jeitos diferentes —
 *  aqui com badge colorido, lá em texto puro — cada uma com sua própria
 *  cópia desta função, e as cores só existiam numa das duas. */
export function tomDaNota(nota: number | null | undefined): "danger" | "warning" | "success" | "muted" {
  if (nota == null) return "muted";
  if (nota < 3) return "danger";
  if (nota < 4) return "warning";
  return "success";
}

/** Perguntas de comentário opcional no formulário (não exigem resposta). */
export function isPerguntaOpcional(texto: string): boolean {
  return /opcional/i.test(texto);
}

/** Comentário livre vai para comentario_feedback, não como pergunta do formulário. */
export function isComentarioFeedbackPergunta(tipo: string, texto: string): boolean {
  return !isPerguntaNota(tipo) && isPerguntaOpcional(texto);
}

export function getNotasPorPergunta(bancaId: number, token: string) {
  return apiFetch<NotaPorPergunta[]>(`/bancas/${bancaId}/notas-por-pergunta`, { token });
}

export function createAvaliacao(
  dados: {
    banca_id: number;
    formulario_id: number;
    nome_avaliador?: string;
    tipo_avaliador?: "consultor" | "lideranca";
    projeto_avaliado?: string;
    escopo_avaliado_id?: number | null;
    escopo_avaliado_outro?: string | null;
  },
  token: string,
) {
  return apiFetch<Avaliacao>("/avaliacoes", {
    method: "POST",
    token,
    body: JSON.stringify({ ...dados, status: "rascunho" }),
  });
}

/**
 * Envia a avaliação — notas e feedback pedagógico (§8).
 *
 * ⭐ Rota própria (`POST .../submeter`), não o `PATCH` genérico: submeter tem
 * pré-condições (banca realizada, dentro do prazo, não reenviar).
 *
 * ⚠ Não decide mais a banca. Quem aprova é diretoria + gerente da frente —
 * ver `registrarAprovacaoBanca` em `lib/bancas.ts`.
 */
export function submeterAvaliacao(
  avaliacaoId: number,
  comentarioFeedback: string | null,
  token: string,
) {
  const comentario = comentarioFeedback?.trim();
  return apiFetch<{ id: number; status: string; comentario_feedback: string | null }>(
    `/avaliacoes/${avaliacaoId}/submeter`,
    {
      aviso: "Avaliação enviada", method: "POST",
      token,
      body: JSON.stringify({
        comentario_feedback: comentario || null,
      }),
    },
  );
}

export function createAvaliacaoNota(
  dados: { avaliacao_id: number; pergunta_id: number; nota?: number | null; resposta_texto?: string | null },
  token: string,
) {
  return apiFetch<AvaliacaoNota>("/avaliacoes-notas", {
    method: "POST",
    token,
    body: JSON.stringify(dados),
  });
}
