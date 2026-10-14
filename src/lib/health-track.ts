import { apiFetch } from "@/lib/api";

/* Health Track: a saúde de cada projeto em pilares, e o status geral que sai
 * das cores deles. Espelha `routers/health_track.py`.
 *
 * Pilares, classificações e a regra do status vêm todos da API: a diretoria
 * edita pilares e regra sem deploy, então nada disso é constante aqui. */

export type CorHealthTrack = "verde" | "amarelo" | "vermelho";

export interface Pilar {
  id: number;
  nome: string;
  descricao: string | null;
  ordem: number;
  ativo: boolean;
}

/** "Saudável", "Atenção", "Crítico", com a descrição da spec (§3). */
export interface Classificacao {
  cor: CorHealthTrack;
  nome: string;
  descricao: string;
}

export interface AvaliacaoPilar {
  id: number;
  projeto_id: number;
  pilar_id: number;
  pilar_nome: string | null;
  cor: CorHealthTrack;
  comentario: string | null;
  avaliado_por: number;
  avaliado_por_nome: string | null;
  /** UTC sem `Z`, ler com `paraDataUtc`/`formatarDataHora`. */
  avaliado_em: string;
}

/** O status geral por duas réguas: a regra que valia na data do ciclo e a de
 *  hoje. Só divergem depois que a diretoria muda a regra. */
export interface StatusGeral {
  na_epoca: CorHealthTrack;
  pela_regra_atual: CorHealthTrack;
}

export interface AvaliacaoAtual {
  /** `null` enquanto algum pilar ativo não tem cor. */
  status_geral: (StatusGeral & { avaliado_em: string }) | null;
  pilares: { pilar: Pilar; avaliacao: AvaliacaoPilar | null }[];
  /** Quem preenche é decidido pelo backend (diretoria de projetos, ou gerente
   *  de uma frente do projeto). A tela não recalcula a regra de frente. */
  pode_preencher: boolean;
}

export interface Ciclo {
  avaliado_em: string;
  avaliado_por: number;
  avaliado_por_nome: string | null;
  status_geral: StatusGeral;
  avaliacoes: AvaliacaoPilar[];
}

export interface CorPilarEnvio {
  pilar_id: number;
  cor: CorHealthTrack;
  comentario?: string | null;
}

export interface RegraStatus {
  id: number;
  verde: { max_amarelos: number; max_vermelhos: number };
  /** Calculado pelo backend, não editável: amarelo é o que não é verde nem
   *  vermelho. */
  amarelo: { min_amarelos: number; max_amarelos: number; max_vermelhos: number };
  vermelho: { min_amarelos: number; min_vermelhos: number };
  vigente_desde: string;
  criado_por: number | null;
  criado_por_nome: string | null;
}

export interface EditarRegra {
  verde_max_amarelos: number;
  verde_max_vermelhos: number;
  vermelho_min_amarelos: number;
  vermelho_min_vermelhos: number;
}

/** Um projeto no mapa da carteira (§9). `pilares` é indexado pelo id do
 *  pilar; `null` quando ele ainda não tem cor. */
export interface ProjetoNaCarteira {
  id: number;
  nome: string;
  cliente: string | null;
  status: string;
  /** Em acompanhamento (entra nas rodadas) ou encerrado (pós-banca, só leitura). */
  bloco: "acompanhamento" | "encerrado";
  frentes: { id: number; nome: string }[];
  coordenadores: { id: number; nome: string }[];
  gerentes: { id: number; nome: string }[];
  /** `sequencia`: há quantas avaliações seguidas o pilar tem essa cor;
   *  `persistente`: amarelo ou vermelho que bateu o limite de Configurações (§7). */
  pilares: Record<string, { cor: CorHealthTrack; avaliado_em: string; sequencia: number; persistente: boolean } | null>;
  /** `null` enquanto algum pilar ativo não tem cor. */
  status_geral: StatusGeral | null;
  /** O status (pela regra atual) do ciclo completo anterior, pra tendência. */
  status_anterior: CorHealthTrack | null;
  avaliado_em: string | null;
  total_ciclos: number;
  algum_vermelho: boolean;
  /** Quantos pilares do projeto estão em alerta de persistência. */
  alertas_persistentes: number;
}

export interface Carteira {
  pilares: Pilar[];
  /** Os limites de §7 vigentes: a partir de quantas avaliações seguidas. */
  persistencia: { amarelo: number; vermelho: number };
  projetos: ProjetoNaCarteira[];
}

/** Um ponto da evolução (§16): a carteira numa rodada concluída, ou hoje. */
export interface PontoEvolucao {
  rotulo: string;
  em: string;
  total: number;
  avaliados: number;
  verde: number;
  amarelo: number;
  vermelho: number;
  pilares: Record<string, { verde: number; amarelo: number; vermelho: number }>;
}

export interface Evolucao {
  pilares: Pilar[];
  pontos: PontoEvolucao[];
}

// ---------------------------------------------------------------- ações (§15)

/** Problema -> responsável -> próxima ação -> prazo, preso a um projeto. */
export interface Acao {
  id: number;
  projeto_id: number;
  projeto_nome: string | null;
  pilar_id: number | null;
  pilar_nome: string | null;
  problema: string;
  proxima_acao: string;
  responsavel_id: number | null;
  responsavel_nome: string | null;
  /** `YYYY-MM-DD`. */
  prazo: string | null;
  atrasada: boolean;
  concluida_em: string | null;
  concluida_por_nome: string | null;
  criado_por_nome: string | null;
  criado_em: string;
}

export interface AcaoPayload {
  problema: string;
  proxima_acao: string;
  responsavel_id: number | null;
  prazo: string | null;
  pilar_id: number | null;
}

export function getAcoesAbertas(token: string) {
  return apiFetch<Acao[]>("/health-track/acoes", { token });
}

export function getAcoesDoProjeto(projetoId: number, token: string) {
  return apiFetch<Acao[]>(`/health-track/projetos/${projetoId}/acoes`, { token });
}

export function criarAcao(projetoId: number, dados: AcaoPayload, token: string) {
  return apiFetch<Acao>(`/health-track/projetos/${projetoId}/acoes`, {
    aviso: "Ação criada", method: "POST",
    token,
    body: JSON.stringify(dados),
  });
}

export function editarAcao(projetoId: number, acaoId: number, dados: AcaoPayload, token: string) {
  return apiFetch<Acao>(`/health-track/projetos/${projetoId}/acoes/${acaoId}`, {
    aviso: "Ação salva", method: "PUT",
    token,
    body: JSON.stringify(dados),
  });
}

export function concluirAcao(projetoId: number, acaoId: number, concluida: boolean, token: string) {
  return apiFetch<Acao>(`/health-track/projetos/${projetoId}/acoes/${acaoId}/concluir?concluida=${concluida}`, {
    aviso: "Ação atualizada", method: "POST",
    token,
  });
}

export function apagarAcao(projetoId: number, acaoId: number, token: string) {
  return apiFetch<void>(`/health-track/projetos/${projetoId}/acoes/${acaoId}`, { aviso: "Ação apagada", method: "DELETE", token });
}

/** As ações atribuídas a MIM, em qualquer projeto. Sem a caixa do Health
 *  Track: é a rota pessoal, que leva só a ação. */
export function getMinhasAcoes(token: string) {
  return apiFetch<Acao[]>("/health-track/minhas-acoes", { token });
}

export function concluirMinhaAcao(acaoId: number, concluida: boolean, token: string) {
  return apiFetch<Acao>(`/health-track/minhas-acoes/${acaoId}/concluir?concluida=${concluida}`, {
    aviso: "Ação atualizada", method: "POST",
    token,
  });
}

export function getEvolucao(token: string) {
  return apiFetch<Evolucao>("/health-track/evolucao", { token });
}

// ---------------------------------------------------------------- rodadas

export type SituacaoNaRodada = "pendente" | "avaliada" | "justificada";

export interface ProjetoNaRodada {
  projeto_id: number;
  projeto_nome: string;
  projeto_status: string | null;
  situacao: SituacaoNaRodada;
  justificativa: string | null;
  resolvido_em: string | null;
  resolvido_por_nome: string | null;
}

/**
 * Uma rodada de avaliação (2026-10-08): a diretoria abre quando decide que
 * é dia, a lista dos projetos em acompanhamento congela, e cada um precisa
 * ser avaliado ou justificado antes de a rodada concluir.
 */
export interface Rodada {
  id: number;
  aberta_em: string;
  aberta_por_nome: string | null;
  concluida_em: string | null;
  concluida_por_nome: string | null;
  total: number;
  pendente: number;
  avaliada: number;
  justificada: number;
  projetos: ProjetoNaRodada[];
}

export function getRodadaAtual(token: string) {
  return apiFetch<Rodada | null>("/health-track/rodadas/atual", { token });
}

export function getRodadas(token: string) {
  return apiFetch<Rodada[]>("/health-track/rodadas", { token });
}

export function abrirRodada(token: string) {
  return apiFetch<Rodada>("/health-track/rodadas", { aviso: "Rodada aberta", method: "POST", token });
}

export function concluirRodada(id: number, token: string) {
  return apiFetch<Rodada>(`/health-track/rodadas/${id}/concluir`, { aviso: "Rodada concluída", method: "POST", token });
}

export function justificarProjeto(rodadaId: number, projetoId: number, justificativa: string, token: string) {
  return apiFetch<Rodada>(`/health-track/rodadas/${rodadaId}/projetos/${projetoId}/justificativa`, {
    aviso: "Justificativa salva", method: "PUT",
    token,
    body: JSON.stringify({ justificativa }),
  });
}

export function desfazerJustificativa(rodadaId: number, projetoId: number, token: string) {
  return apiFetch<Rodada>(`/health-track/rodadas/${rodadaId}/projetos/${projetoId}/justificativa`, {
    aviso: "Justificativa desfeita", method: "DELETE",
    token,
  });
}

export function getCarteira(token: string, frenteId: number | null = null) {
  const query = frenteId ? `?frente_id=${frenteId}` : "";
  return apiFetch<Carteira>(`/health-track/carteira${query}`, { token });
}

export function getPilares(token: string, todos = false) {
  return apiFetch<Pilar[]>(`/health-track/pilares${todos ? "?todos=true" : ""}`, { token });
}

export function criarPilar(dados: { nome: string; descricao?: string | null }, token: string) {
  return apiFetch<Pilar>("/health-track/pilares", {
    aviso: "Pilar criado", method: "POST",
    token,
    body: JSON.stringify(dados),
  });
}

export function editarPilar(
  id: number,
  dados: Partial<{ nome: string; descricao: string | null; ordem: number; ativo: boolean }>,
  token: string,
) {
  return apiFetch<Pilar>(`/health-track/pilares/${id}`, {
    aviso: "Pilar salvo", method: "PUT",
    token,
    body: JSON.stringify(dados),
  });
}

export function getClassificacoes(token: string) {
  return apiFetch<Classificacao[]>("/health-track/classificacoes", { token });
}

export function getAvaliacaoAtual(projetoId: number, token: string) {
  return apiFetch<AvaliacaoAtual>(`/health-track/projetos/${projetoId}/avaliacoes/atual`, { token });
}

export function getCiclos(projetoId: number, token: string) {
  return apiFetch<Ciclo[]>(`/health-track/projetos/${projetoId}/avaliacoes/ciclos`, { token });
}

export function registrarAvaliacao(projetoId: number, avaliacoes: CorPilarEnvio[], token: string) {
  return apiFetch<AvaliacaoPilar[]>(`/health-track/projetos/${projetoId}/avaliacoes`, {
    aviso: "Avaliação registrada", method: "POST",
    token,
    body: JSON.stringify({ avaliacoes }),
  });
}

/** Apaga UM preenchimento do projeto (todas as linhas com esse `avaliado_em`). */
export function apagarCiclo(projetoId: number, avaliadoEm: string, token: string) {
  return apiFetch<{ apagadas: number }>(
    `/health-track/projetos/${projetoId}/avaliacoes/ciclos?avaliado_em=${encodeURIComponent(avaliadoEm)}`,
    { aviso: "Ciclo apagado", method: "DELETE", token },
  );
}

/** Apaga todas as avaliações, rodadas e ações. Pilares e regra ficam. */
export function zerarHealthTrack(token: string) {
  return apiFetch<{ avaliacoes: number; rodadas: number; acoes: number }>("/health-track/tudo", {
    aviso: "Health Track zerado", method: "DELETE",
    token,
  });
}

export function getRegra(token: string) {
  return apiFetch<RegraStatus | null>("/health-track/regra", { token });
}

export function getHistoricoRegra(token: string) {
  return apiFetch<RegraStatus[]>("/health-track/regra/historico", { token });
}

export function atualizarRegra(dados: EditarRegra, token: string) {
  return apiFetch<RegraStatus>("/health-track/regra", {
    aviso: "Regra salva", method: "PUT",
    token,
    body: JSON.stringify(dados),
  });
}

/** Fallback dos rótulos enquanto `/classificacoes` não chegou, ou se falhar.
 *  O texto oficial vem da API; isto só evita uma cor sem nome na tela. */
export const ROTULO_COR: Record<CorHealthTrack, string> = {
  verde: "Saudável",
  amarelo: "Atenção",
  vermelho: "Crítico",
};
