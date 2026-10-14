import { apiFetch } from "@/lib/api";
import type { Permissoes, Posicao, PosicaoPermissao } from "@/types/auth";

/** As linhas do catálogo — os 6 cargos padrão mais os que a diretoria criou. */
export function getPosicoesPermissoes(token: string) {
  return apiFetch<PosicaoPermissao[]>("/posicoes-permissoes", { token });
}

export function updatePosicaoPermissao(
  posicao: Posicao,
  dados: Partial<Permissoes> & { nome?: string; sobreponivel?: boolean },
  token: string,
) {
  return apiFetch<PosicaoPermissao>(`/posicoes-permissoes/${posicao}`, {
    aviso: "Permissões salvas", method: "PATCH",
    token,
    body: JSON.stringify(dados),
  });
}

/** Cargo novo, nascendo com todas as caixas de permissão desligadas — quem
 *  criou marca o que quiser depois em "Editar". Não entra em nenhuma regra
 *  de identidade hardcoded (mentor, composição de banca, portfólio
 *  inteiro), de propósito.
 *
 *  `sobreponivel` é a EXCEÇÃO — perguntada já na criação (não uma permissão
 *  de ação, é sobre como o cargo se combina com outros: pode ser
 *  `cargo_extra` de qualquer pessoa?). */
export function createPosicaoPermissao(nome: string, sobreponivel: boolean, token: string) {
  return apiFetch<PosicaoPermissao>("/posicoes-permissoes", {
    aviso: "Cargo criado", method: "POST",
    token,
    body: JSON.stringify({ nome, sobreponivel }),
  });
}

/** Só cargos criados pela tela (`e_padrao: false`) — os 6 padrão são
 *  recusados pelo backend, e quem ainda tem gente no cargo também. */
export function deletePosicaoPermissao(posicao: Posicao, token: string) {
  return apiFetch<void>(`/posicoes-permissoes/${posicao}`, {
    aviso: "Cargo apagado", method: "DELETE",
    token,
  });
}

/** O `cargo_extra` SOMA permissões à posição base, nunca substitui — mesmo OU
 *  lógico que `usuario_tem_permissao` faz no backend (`middlewares/
 *  authorization.py`). Sem isto, uma caixa marcada só no cargo extra (ex.:
 *  "adm jurídico" com `pode_elaborar_qualquer_contrato`) nunca chegava no
 *  usuário logado — a aba correspondente ficava escondida mesmo pra quem
 *  tinha o direito. */
export function mesclarPermissoes(base: Permissoes, extra: Permissoes | null): Permissoes {
  if (!extra) return base;
  const mescladas = { ...base };
  for (const chave of Object.keys(base) as (keyof Permissoes)[]) {
    mescladas[chave] = base[chave] || extra[chave];
  }
  return mescladas;
}
