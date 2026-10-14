import { apiFetch } from "@/lib/api";
import type { UsuarioFrente } from "@/types/auth";

export function getUsuariosFrentes(token: string) {
  return apiFetch<UsuarioFrente[]>("/usuarios-frentes", { token });
}

export function createUsuarioFrente(dados: { usuario_id: number; frente_id: number }, token: string) {
  return apiFetch<UsuarioFrente>("/usuarios-frentes", {
    aviso: "Frente vinculada", method: "POST",
    token,
    body: JSON.stringify(dados),
  });
}

export function deleteUsuarioFrente(usuarioFrenteId: number, token: string) {
  return apiFetch(`/usuarios-frentes/${usuarioFrenteId}`, { aviso: "Frente desvinculada", method: "DELETE", token });
}

export async function syncFrentesUsuario(
  usuarioId: number,
  frenteIds: number[],
  atuais: UsuarioFrente[],
  token: string,
) {
  const vinculos = atuais.filter((uf) => uf.usuario_id === usuarioId);
  const atuaisIds = new Set(vinculos.map((uf) => uf.frente_id));
  const novosIds = new Set(frenteIds);

  await Promise.all(
    vinculos.filter((uf) => !novosIds.has(uf.frente_id)).map((uf) => deleteUsuarioFrente(uf.id, token)),
  );

  await Promise.all(
    frenteIds.filter((id) => !atuaisIds.has(id)).map((frenteId) => createUsuarioFrente({ usuario_id: usuarioId, frente_id: frenteId }, token)),
  );
}
