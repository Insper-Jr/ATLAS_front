import { apiFetch } from "@/lib/api";
import type { Compatibilidade, FaixaDisponivel, FaixaGrade, MinhaGrade } from "@/types/grade";

/**
 * As faixas vêm do backend, e não de uma constante aqui, porque é a mesma
 * lista que valida a gravação. Duas cópias sairiam do ar uma da outra
 * no dia em que entrar curso com horário diferente.
 */
export function getFaixasDisponiveis(token: string) {
  return apiFetch<FaixaDisponivel[]>("/grade-horaria/faixas", { token });
}

export function getMinhaGrade(token: string) {
  return apiFetch<MinhaGrade>("/grade-horaria", { token });
}

/**
 * A grade de um membro específico. Só quem tem `pode_gerir_membros` — a
 * rota recusa qualquer outro token, é a única exceção a "cada um vê só a
 * própria grade".
 */
export function getGradeDeUsuario(usuarioId: number, token: string) {
  return apiFetch<MinhaGrade>(`/grade-horaria/${usuarioId}`, { token });
}

/**
 * Os ids de quem já enviou a grade no semestre ativo. Só quem tem
 * `pode_gerir_membros`, a mesma régua de `getGradeDeUsuario`.
 *
 * Quem enviou uma grade vazia ("não tenho aula") não entra: não deixa
 * registro, e não há como separar isso de "nunca enviou".
 */
export function getGradesPreenchidas(token: string) {
  return apiFetch<{ semestre_id: number; usuario_ids: number[] }>(
    "/grade-horaria/preenchidas",
    { token },
  );
}

/** Substitui a grade inteira. Lista vazia limpa, é gravação válida. */
export function salvarGrade(faixas: FaixaGrade[], token: string) {
  return apiFetch<MinhaGrade>("/grade-horaria", {
    aviso: "Grade horária salva", method: "PUT",
    token,
    body: JSON.stringify({ faixas }),
  });
}

/**
 * O cruzamento das grades de um grupo, só o resultado, nunca a grade
 * individual de ninguém.
 */
export function getCompatibilidade(usuarioIds: number[], token: string) {
  const params = usuarioIds.map((id) => `usuario_ids=${id}`).join("&");
  return apiFetch<Compatibilidade>(`/grade-horaria/compatibilidade?${params}`, { token });
}

/** A chave que identifica uma célula do quadro. */
export function chaveFaixa(dia: number, horaInicio: string) {
  return `${dia}:${horaInicio}`;
}
