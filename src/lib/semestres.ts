import { apiFetch } from "@/lib/api";
import type { Semestre } from "@/types/banca";
import { hojeEmBrasilia } from "@/lib/fuso";

export function getSemestres(token: string) {
  return apiFetch<Semestre[]>("/semestres", { token });
}

/** O semestre de hoje (em Brasília). `inicio`/`fim` são dias puros e se
 *  comparam como texto: `new Date("2026-12-10")` lia meia-noite UTC, e o
 *  semestre deixava de ser o atual às 21h da véspera do último dia. */
export function semestreAtual(semestres: Semestre[]): Semestre | null {
  if (semestres.length === 0) return null;
  const hoje = hojeEmBrasilia();
  const atual = semestres.find((s) => s.inicio.slice(0, 10) <= hoje && hoje <= s.fim.slice(0, 10));
  if (atual) return atual;
  return [...semestres].sort((a, b) => b.fim.localeCompare(a.fim))[0];
}
