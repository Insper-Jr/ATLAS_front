import { apiFetch } from "@/lib/api";
import type { Posicao, StatusUsuario, UsuarioResumo } from "@/types/auth";

export function getUsuarios(token: string) {
  return apiFetch<UsuarioResumo[]>("/usuarios", { token });
}

/**
 * Quem aparece na lista "quem vendeu o projeto" do cadastro — computado no
 * backend (posição base OU `cargo_extra`, permissão `pode_responsavel_por_
 * vendas`, ver `usuario_model.py`). Para incluir outra pessoa, a diretoria dá
 * essa permissão ao cargo dela (ou marca BDR como `cargo_extra`). Quem já
 * está gravado como vendedor num projeto continua listado mesmo sem se
 * encaixar (os formulários somam os ids atuais a esta lista).
 */
export function podeSerVendedor(u: Pick<UsuarioResumo, "responsavel_por_vendas">): boolean {
  return u.responsavel_por_vendas;
}

export interface UpdateUsuarioPayload {
  nome?: string;
  email_insper?: string;
  /** a promoção da virada de gestão, consultor vira coordenador. */
  posicao?: Posicao;
  /**
   * sair por vontade própria (`ex_membro`) é diferente de ser desligado.
   * Em ambos os casos o histórico de participação em projetos permanece, é
   * por isso que `projeto_membro` fecha com `saiu_em` em vez de apagar linha.
   */
  status?: StatusUsuario;
  ativo?: boolean;
  /** O cargo extra — qualquer cargo marcado `sobreponivel` no catálogo
   *  (`posicao_permissao.sobreponivel`, ver `Config.tsx`), desde que
   *  diferente de `posicao`. `null` para tirar. */
  cargo_extra?: string | null;
  /** 1º a 8º semestre da graduação, ou `null` pra limpar. */
  semestre_graduacao?: number | null;
}

export function updateUsuario(usuarioId: number, dados: UpdateUsuarioPayload, token: string) {
  return apiFetch<UsuarioResumo>(`/usuarios/${usuarioId}`, {
    aviso: "Dados salvos", method: "PATCH",
    token,
    body: JSON.stringify(dados),
  });
}

/** `foto` é a data URI já redimensionada no cliente — ver `Avatar.tsx`.
 *  Sempre a PRÓPRIA foto, a rota não aceita `usuario_id`. */
export function atualizarMinhaFoto(foto: string, token: string) {
  return apiFetch<UsuarioResumo>("/usuarios/me/foto", {
    aviso: "Foto atualizada", method: "PUT",
    token,
    body: JSON.stringify({ foto }),
  });
}

export function removerMinhaFoto(token: string) {
  return apiFetch<UsuarioResumo>("/usuarios/me/foto", {
    aviso: "Foto removida", method: "DELETE",
    token,
  });
}

/** `desativadas` é a lista INTEIRA (substitui, não soma) dos tipos
 *  opcionais que a pessoa não quer mais por e-mail. Vazio liga tudo de
 *  volta. Sempre a PRÓPRIA preferência, a rota não aceita `usuario_id`. */
export function atualizarMinhasNotificacoesEmail(desativadas: string[], token: string) {
  return apiFetch<{ notificacoes_email_desativadas: string[] }>(
    "/usuarios/me/notificacoes-email",
    { aviso: "Preferência salva", method: "PATCH", token, body: JSON.stringify({ desativadas }) },
  );
}

/** Sem volta, o backend só aceita se o usuário já estiver desligado. */
export function deletarUsuarioPermanente(usuarioId: number, token: string) {
  return apiFetch<{ nome: string }>(`/usuarios/${usuarioId}/permanente`, {
    aviso: "Pessoa apagada", method: "DELETE",
    token,
  });
}

export interface RegistrarUsuarioPayload {
  nome: string;
  email_insper: string;
  posicao: Posicao;
  /** Ver `UpdateUsuarioPayload.cargo_extra`. */
  cargo_extra?: string | null;
  semestre_graduacao?: number | null;
}

/**
 * O que volta ao cadastrar (e ao reenviar): a senha de primeiro acesso EM
 * CLARO e se o e-mail saiu.
 *
 * Esta é a única vez que essa senha existe fora do e-mail, o banco só guarda
 * o hash. Se `email_enviado` for `false` (SMTP fora do ar ou não configurado),
 * a tela precisa mostrá-la para quem cadastrou repassar; e quem fechar a tela
 * sem anotar não a recupera, só reemite.
 */
export interface SenhaProvisoriaEmitida {
  senha_provisoria_gerada: string;
  email_enviado: boolean;
}

export interface TransferirDiretoriaPayload {
  novo_diretor_id: number;
  diretor_atual_id: number;
  /** QUAL diretoria está sendo passada — são três desde 2026-08-20.
   *
   *  Obrigatório, sem padrão, igual ao backend: adivinhar aqui promoveria
   *  alguém ao cargo errado, e a operação não tem desfazer (ela desliga quem
   *  sai). Na tela é sempre a posição de quem está transferindo, que é o
   *  único cargo que a pessoa tem para dar. */
  posicao: Posicao;
}

/**
 * A passagem de bastão da virada de gestão, num passo só. O backend
 * promove antes de desligar, para nunca existir um instante sem diretoria, e
 * quem sai vira ex-membro (o caso de "fim de gestão").
 */
export function transferirDiretoria(dados: TransferirDiretoriaPayload, token: string) {
  return apiFetch<{ novo_diretor: { id: number; nome: string } }>(
    "/usuarios/transferir-diretoria",
    { aviso: "Diretoria transferida", method: "POST", token, body: JSON.stringify(dados) },
  );
}

/**
 * ninguém se auto-registra, só a diretoria pré-cadastra um membro.
 *
 * Sem campo de senha: quem cadastra não escolhe a senha de ninguém. O backend
 * sorteia uma provisória, manda por e-mail e devolve aqui.
 */
export function registrarUsuario(dados: RegistrarUsuarioPayload, token: string) {
  return apiFetch<UsuarioResumo & SenhaProvisoriaEmitida>("/auth/registrar", {
    aviso: "Pessoa cadastrada", method: "POST",
    token,
    body: JSON.stringify(dados),
  });
}

/**
 * Reemite a senha de primeiro acesso, e-mail perdido, caixa cheia, ou membro
 * trancado para fora.
 *
 * Só diretoria, e **derruba a senha atual da pessoa**: é o caminho de
 * devolver acesso, não um "reenviar e-mail" inofensivo.
 */
export function reenviarSenhaProvisoria(usuarioId: number, token: string) {
  return apiFetch<{ id: number; email_insper: string } & SenhaProvisoriaEmitida>(
    `/usuarios/${usuarioId}/senha-provisoria`,
    { aviso: "Senha provisória reenviada", method: "POST", token },
  );
}
