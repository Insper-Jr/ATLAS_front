import { apiFetch } from "@/lib/api";
import type { Posicao } from "@/types/auth";

export interface ProjetoComVaga {
  id: number;
  nome: string;
  cliente: string;
  descricao: string | null;
  status: string;
  /** As frentes que o projeto abrange. Duas = projeto sinérgico. */
  frentes: string[];
  coordenador_id: number | null;
  coordenador_nome: string | null;
  consultores: string[];
  alocados: number;
  max_consultores: number;
  vagas: number;
  /**
   * Por que ESTA pessoa não pode pedir agora. `null` = pode.
   *
   * Vem preenchido em vez de o projeto sumir da lista: projeto que some
   * sem explicação gera "por que não aparece o X?" e ninguém sabe responder.
   */
  impedimento: string | null;
}

/**
 * Como a diretoria classifica uma carga, vindo de `situacao_carga`.
 *
 * Substitui o antigo `teto` fixo em 3: a escala é recomendação, não limite —
 * quem está carregado continua podendo pedir, com o aviso na tela.
 */
export interface SituacaoDeCarga {
  nome: string;
  tom: "ok" | "atencao" | "alerta" | "neutro";
  min_projetos: number;
}

export interface ListaVagas {
  projetos: ProjetoComVaga[];
  minha_carga: number;
  /** `null` quando a carga fica abaixo do menor mínimo da escala. */
  situacao: SituacaoDeCarga | null;
  /** Só consultor pede para entrar. As outras posições são alocadas. */
  pode_solicitar: boolean;
  /** Monta equipe (gerência e diretoria), decide os pedidos. */
  pode_responder: boolean;
  /** Coordena algum projeto, vê o time e os pedidos, sem decidir. */
  coordena_projeto: boolean;
  /**
   * Se a grade da gestão deve oferecer filtro e agrupamento por frente.
   *
   * Falso para o gerente de uma frente só: a lista já vem recortada nela, e o
   * seletor teria uma opção. Vem do back porque quem decide é o recorte do
   * , não as frentes que por acaso apareceram na lista.
   */
  filtra_por_frente: boolean;
  /**
   * ⭐ A SOMA de vagas de verdade — não `projetos.length` (2026-09-05,
   * corrigido a pedido: 20 projetos na lista chegou a significar só 5 vagas
   * reais, porque a maioria estava cheia). Pra quem pede (`pode_solicitar`),
   * já vem recortada pelas frentes do próprio usuário — projeto de frente
   * que não é a dele (nem sinérgico com ela) não entra na conta. É este
   * campo que o selo "N vagas abertas" deve usar, nunca `projetos.length`.
   */
  vagas_disponiveis: number;
}

export interface MembroDoProjeto {
  usuario_id: number;
  nome: string | null;
  foto: string | null;
  papel: "coordenador" | "consultor";
}

export interface PedidoNoProjeto {
  id: number;
  usuario_nome: string | null;
  carga_do_solicitante: number;
  justificativa: string;
  status: "pendente" | "aprovada" | "recusada";
  criado_em: string;
  respondido_por_nome: string | null;
}

/** Um projeto que o usuário coordena, do jeito que ele o vê: só leitura. */
export interface ProjetoCoordenado {
  id: number;
  nome: string;
  cliente: string;
  status: string;
  frentes: string[];
  equipe: MembroDoProjeto[];
  alocados: number;
  max_consultores: number;
  vagas: number;
  pedidos: PedidoNoProjeto[];
}

export interface SolicitacaoRecebida {
  id: number;
  projeto_id: number;
  projeto_nome: string;
  /** As frentes do projeto, é por elas que a tela filtra. */
  frentes: string[];
  usuario_id: number;
  usuario_nome: string | null;
  /** Em quantos projetos o solicitante já está. */
  carga_do_solicitante: number;
  /** Como a diretoria classifica essa carga, a mesma escala do painel. */
  situacao_do_solicitante: SituacaoDeCarga | null;
  justificativa: string;
  status: "pendente" | "aprovada" | "recusada";
  criado_em: string;
  respondido_em: string | null;
  respondido_por_nome: string | null;
  resposta: string | null;
}

export interface MinhaSolicitacao {
  id: number;
  projeto_id: number;
  projeto_nome: string;
  status: "pendente" | "aprovada" | "recusada";
  justificativa: string;
  resposta: string | null;
  criado_em: string;
  respondido_em: string | null;
}

export function getProjetosComVaga(token: string) {
  return apiFetch<ListaVagas>("/projetos-com-vaga", { token });
}

export function getMinhasSolicitacoes(token: string) {
  return apiFetch<MinhaSolicitacao[]>("/solicitacoes-projeto/minhas", { token });
}

/**
 * Os pedidos que o usuário pode responder, pendentes e já respondidos.
 *
 * Só gerência e diretoria; o gerente fica na frente dele. Coordenador recebe
 * lista vazia: a visão dele é `getProjetosCoordenados`.
 */
export function getSolicitacoesRecebidas(token: string) {
  return apiFetch<SolicitacaoRecebida[]>("/solicitacoes-projeto/recebidas", { token });
}

/** Alguém que a gestão pode colocar num projeto. */
export interface CandidatoAlocacao {
  usuario_id: number;
  nome: string;
  posicao: Posicao;
  frentes: string[];
  /** Quantos projetos ativos ocupa hoje, a régua. */
  carga: number;
  /** Quais são eles. Sem recorte de frente: quem aloca vê onde a pessoa
   *  está mesmo em frente que não acompanha (decisão de 2026-08-13). */
  projetos: { id: number; nome: string }[];
  /** Como a diretoria classifica essa carga. `null` abaixo do menor mínimo. */
  situacao: SituacaoDeCarga | null;
  /** Já pediu para entrar neste projeto e está aguardando resposta. */
  pediu_para_entrar: boolean;
}

/** Candidatos deste projeto, do menos carregado ao mais. */
export function getCandidatos(projetoId: number, token: string) {
  return apiFetch<CandidatoAlocacao[]>(`/solicitacoes-projeto/candidatos/${projetoId}`, { token });
}

/** Os projetos que o usuário coordena, com time e pedidos. Só leitura. */
export function getProjetosCoordenados(token: string) {
  return apiFetch<ProjetoCoordenado[]>("/solicitacoes-projeto/meus-projetos", { token });
}

/** A gestão coloca alguém no projeto sem que tenha havido pedido. */
export function alocarDireto(projetoId: number, usuarioId: number, token: string) {
  return apiFetch<{ projeto_id: number; usuario_id: number; papel: string }>(
    "/solicitacoes-projeto/alocar",
    {
      aviso: "Alocação feita", method: "POST",
      token,
      body: JSON.stringify({ projeto_id: projetoId, usuario_id: usuarioId }),
    },
  );
}

export function criarSolicitacao(projetoId: number, justificativa: string, token: string) {
  return apiFetch<{ id: number; status: string }>("/solicitacoes-projeto", {
    aviso: "Pedido de entrada enviado", method: "POST",
    token,
    body: JSON.stringify({ projeto_id: projetoId, justificativa }),
  });
}

/** Aprovar já inclui a pessoa na equipe como consultor. */
export function responderSolicitacao(
  solicitacaoId: number,
  aprovar: boolean,
  token: string,
  resposta?: string,
) {
  return apiFetch<{ id: number; status: string }>(`/solicitacoes-projeto/${solicitacaoId}`, {
    aviso: "Pedido respondido", method: "PATCH",
    token,
    body: JSON.stringify({ aprovar, resposta: resposta ?? null }),
  });
}

export function cancelarSolicitacao(solicitacaoId: number, token: string) {
  return apiFetch<void>(`/solicitacoes-projeto/${solicitacaoId}`, { aviso: "Pedido cancelado", method: "DELETE", token });
}
