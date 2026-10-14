import { apiFetch } from "@/lib/api";
import { ehDiretoriaDeProjetos } from "@/utils/permissoes";
import type {
  ComentarioTarefa,
  ReuniaoRegistrada,
  ReunioesResposta,
  Tarefa,
  Urgencia,
} from "@/types/tarefa";
import type { Usuario } from "@/types/auth";

export function getTarefas(projetoId: number, token: string) {
  return apiFetch<Tarefa[]>(`/projetos/${projetoId}/tarefas`, { token });
}

export interface CreateTarefaPayload {
  titulo: string;
  responsavel_ids: number[];
  prazo: string;
  projeto_escopo_id?: number | null;
  /** Vazio = a primeira coluna do board. */
  coluna_id?: number | null;
  /** "conjunta" (padrão) = um card, todos os responsáveis. "individual" = um
   *  card por pessoa, mesmo grupo. Só faz diferença com 2+ responsáveis. */
  atribuicao?: "conjunta" | "individual";
}

/** Devolve uma lista: 1 card na conjunta, N na "cada um faz a sua parte". */
export function createTarefa(projetoId: number, dados: CreateTarefaPayload, token: string) {
  return apiFetch<Tarefa[]>(`/projetos/${projetoId}/tarefas`, {
    aviso: "Tarefa criada", method: "POST",
    token,
    body: JSON.stringify(dados),
  });
}

/** Move (arrastar) e edita, a mesma rota. */
export function updateTarefa(
  tarefaId: number,
  dados: Partial<CreateTarefaPayload>,
  token: string,
) {
  return apiFetch<Tarefa>(`/tarefas/${tarefaId}`, {
    method: "PATCH",
    token,
    body: JSON.stringify(dados),
  });
}

export function deleteTarefa(tarefaId: number, token: string) {
  return apiFetch(`/tarefas/${tarefaId}`, { aviso: "Tarefa excluída", method: "DELETE", token });
}

/* ------------------------------------------------------------------ */
/* Comentários                                                         */
/* ------------------------------------------------------------------ */

export function getComentarios(tarefaId: number, token: string) {
  return apiFetch<ComentarioTarefa[]>(`/tarefas/${tarefaId}/comentarios`, { token });
}

export function createComentario(tarefaId: number, texto: string, token: string) {
  return apiFetch<ComentarioTarefa>(`/tarefas/${tarefaId}/comentarios`, {
    aviso: "Comentário enviado", method: "POST",
    token,
    body: JSON.stringify({ texto }),
  });
}

export function deleteComentario(comentarioId: number, token: string) {
  return apiFetch(`/comentarios/${comentarioId}`, { aviso: "Comentário excluído", method: "DELETE", token });
}

/* ------------------------------------------------------------------ */
/* Permissão e urgência                                                */
/* ------------------------------------------------------------------ */

/**
 * Editar o CONTEÚDO (título, responsáveis, prazo) e EXCLUIR a tarefa: a
 * coordenação do projeto e a diretoria de projetos (2026-09-09). O consultor
 * não mexe — nem no que ele mesmo criou.
 *
 * `coordenadorIds` = `projeto.coordenador_ids`. O backend aplica a mesma
 * régua; aqui é só para a tela não oferecer um botão que volta 403.
 */
export function podeEditarTarefa(
  usuario: Usuario | null | undefined,
  _tarefa: Tarefa,
  coordenadorIds: number[],
): boolean {
  if (!usuario) return false;
  return ehDiretoriaDeProjetos(usuario) || coordenadorIds.includes(usuario.id);
}

/**
 * Mover no kanban: coordenação e diretoria movem qualquer tarefa; o consultor
 * move só as em que está como responsável (2026-09-09).
 */
export function podeMoverTarefa(
  usuario: Usuario | null | undefined,
  tarefa: Tarefa,
  coordenadorIds: number[],
): boolean {
  if (!usuario) return false;
  return (
    podeEditarTarefa(usuario, tarefa, coordenadorIds) ||
    tarefa.responsavel_ids.includes(usuario.id)
  );
}

/**
 * "Fulano", "Fulano e Beltrano", "Fulano +2" — o rótulo curto de vários
 * responsáveis para o card. Só o primeiro nome de cada um, senão estoura a
 * largura do card com três pessoas.
 */
export function rotuloResponsaveis(nomes: string[]): string {
  const primeiros = nomes.map((n) => n.trim().split(/\s+/)[0]).filter(Boolean);
  if (primeiros.length === 0) return "Sem responsável";
  if (primeiros.length === 1) return primeiros[0];
  if (primeiros.length === 2) return `${primeiros[0]} e ${primeiros[1]}`;
  return `${primeiros[0]} +${primeiros.length - 1}`;
}

/** O símbolo e a cor de cada nível, glifo junto da cor, nunca cor sozinha. */
export const SINAL_URGENCIA: Record<
  Urgencia,
  { glifo: string; cor: string; rotulo: (dias: number | null) => string } | null
> = {
  vencida: {
    glifo: "⚠",
    cor: "#DC2626",
    rotulo: (d) => (d === null ? "vencida" : `vencida há ${Math.abs(d)} dia${Math.abs(d) > 1 ? "s" : ""}`),
  },
  critica: {
    glifo: "⚠",
    cor: "#EA580C",
    rotulo: (d) => (d === 0 ? "vence hoje" : "vence amanhã"),
  },
  atencao: {
    glifo: "⏱",
    cor: "#CA8A04",
    rotulo: (d) => `vence em ${d} dias`,
  },
  normal: null,
};

/* ------------------------------------------------------------------ */

export function getReunioes(projetoId: number, token: string) {
  return apiFetch<ReunioesResposta>(`/projetos/${projetoId}/reunioes`, { token });
}

/**
 * `escopoId` decide o TIPO da reunião, e as duas são marcadas no calendário
 * do cronograma:
 *
 * - preenchido → **reunião inicial**, que abre a janela daquele escopo e faz a
 *   contagem correr;
 * - vazio → **reunião geral** do projeto, que conta para o  ("projeto sem
 *   reunião na semana") mas não mexe em contagem nenhuma.
 *
 * As duas cabem no mesmo dia, o backend só recusa duas do mesmo tipo.
 */
export function createReuniao(
  projetoId: number,
  data: string,
  escopoId: number | null,
  token: string,
  observacoes?: string | null,
) {
  return apiFetch<ReuniaoRegistrada>(`/projetos/${projetoId}/reunioes`, {
    aviso: "Reunião registrada", method: "POST",
    token,
    body: JSON.stringify({
      data_reuniao: data,
      projeto_escopo_id: escopoId,
      observacoes: observacoes ?? null,
    }),
  });
}

/**
 * Mover de dia, trocar o escopo ou editar as observações.
 *
 * `observacoes` só viaja quando é passado: omitir preserva o que estava lá,
 * que é o que "arrastei a reunião de quarta para quinta" precisa.
 */
export function updateReuniao(
  reuniaoId: number,
  data: string,
  escopoId: number | null,
  token: string,
  observacoes?: string | null,
) {
  return apiFetch<ReuniaoRegistrada>(`/reunioes/${reuniaoId}`, {
    aviso: "Reunião salva", method: "PATCH",
    token,
    body: JSON.stringify({
      data_reuniao: data,
      projeto_escopo_id: escopoId,
      ...(observacoes === undefined ? {} : { observacoes }),
    }),
  });
}

export function deleteReuniao(reuniaoId: number, token: string) {
  return apiFetch(`/reunioes/${reuniaoId}`, { aviso: "Reunião excluída", method: "DELETE", token });
}
