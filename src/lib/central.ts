import { API_URL } from "@/config/config";
import { apiFetch } from "@/lib/api";

/**
 * Central de Conhecimento (2026-10-29): espelha `routers/central_conhecimento.py`.
 *
 * Uma ficha nasce de uma indicação, passa pelo gerente da frente (a
 * pertinência), é escrita pelos autores e publicada pelo diretor. Os
 * carimbos (`indicado_em`, `publicado_em`, `em`) são instantes UTC, lidos
 * com `formatarDataHora`.
 */

export type StatusFicha = "aguardando_gerente" | "com_autores" | "ajustes_pedidos" | "revisao_final" | "publicada" | "devolvida";
export type ViaFicha = "encerramento" | "banca" | "avulsa";
/** A chave de uma categoria da Tool Box (`cc_categoria.chave`): "metodologia", "ferramenta"... */
export type TipoFicha = string;

/** Uma categoria da Tool Box. Quem gere a Central edita nome, ícone e se está ativa. */
export interface Categoria {
  id: number | null;
  chave: string;
  nome: string;
  /** Nome do ícone (lucide), um de `ICONES_CATEGORIA`. */
  icone: string;
  ordem: number;
  ativa: boolean;
}

/** O que a ficha carrega de cada categoria, para o card e o chip. */
export interface CategoriaDaFicha {
  chave: string;
  nome: string;
  icone: string;
}

/** Os ícones que uma categoria pode usar (o backend valida a mesma lista). */
export const ICONES_CATEGORIA = [
  "compass",
  "wrench",
  "book-open",
  "sparkles",
  "file-check",
  "bar-chart-3",
  "lightbulb",
  "target",
  "layers",
  "database",
  "pen-tool",
  "calculator",
  "scale",
  "users",
  "globe",
  "puzzle",
  "search",
  "presentation",
  "table",
  "flask-conical",
] as const;

export const ROTULO_STATUS: Record<StatusFicha, string> = {
  aguardando_gerente: "Aguardando aprovação",
  com_autores: "Com os autores",
  ajustes_pedidos: "Ajustes pedidos",
  revisao_final: "Revisão final",
  publicada: "Publicada",
  devolvida: "Devolvida",
};

export const ROTULO_VIA: Record<ViaFicha, string> = {
  encerramento: "no arquivamento do projeto",
  banca: "na banca",
  avulsa: "avulsa",
};

export interface Autor {
  id: number;
  nome: string | null;
}

export interface AnexoFicha {
  id: number;
  nome: string;
  mime: string;
  tamanho: number;
  legenda: string | null;
  ordem: number;
  imagem: boolean;
}

export interface PermissoesFicha {
  editar: boolean;
  decidir: boolean;
  enviar_revisao: boolean;
  publicar: boolean;
  pedir_ajustes: boolean;
  marcar_uso: boolean;
}

export interface HistoricoFicha {
  id: number;
  usuario_id: number | null;
  usuario_nome: string | null;
  acao: string;
  detalhe: string | null;
  em: string;
}

/** O que a lista devolve. A ficha aberta vem como `FichaCompleta`. */
export interface Ficha {
  id: number;
  /** "014", o número do REF. */
  codigo: string;
  /** Nome da gestão em que foi indicada ("2026.2"). */
  gestao: string | null;
  /** Número da gestão (51 = 2026.2), para o filtro. */
  gestao_numero: number | null;
  titulo: string;
  tipos: TipoFicha[];
  categorias: CategoriaDaFicha[];
  frente_id: number | null;
  frente_nome: string | null;
  escopo_id: number | null;
  escopo_nome: string | null;
  projeto_id: number | null;
  projeto_nome: string | null;
  cliente: string | null;
  setor: string | null;
  ferramenta: string | null;
  por_que_se_destacou: string;
  em_uma_frase: string | null;
  apontada_diagnostico: boolean;
  status: StatusFicha;
  status_rotulo: string;
  indicado_por: number;
  indicado_por_nome: string | null;
  indicado_via: ViaFicha;
  indicado_em: string;
  responsavel_id: number | null;
  responsavel_nome: string | null;
  autores: Autor[];
  decidido_por_nome: string | null;
  decidido_em: string | null;
  publicado_por_nome: string | null;
  publicado_em: string | null;
  atualizado_em: string;
  usos: number;
  anexos: AnexoFicha[];
  permissoes: PermissoesFicha;
}

export interface FichaCompleta extends Ficha {
  problema: string | null;
  passos: string[];
  quando_usar: string | null;
  onde_aparece: string | null;
  visao_autores: string[];
  perguntas_autores: string[];
  pontos_atencao: string | null;
  revisar_em: string | null;
  decisao_comentario: string | null;
  revisao_comentario: string | null;
  enviado_revisao_em: string | null;
  historico?: HistoricoFicha[];
}

export interface Destaque {
  usuario_id: number;
  nome: string | null;
  fichas: number;
  usos: number;
}

export interface ToolBox {
  semestre: { id: number; nome: string; inicio: string; fim: string; atual: boolean } | null;
  destaques: { autores: Destaque[]; indicadores: Destaque[] };
  publicadas: number;
  publicadas_na_gestao: number;
  referencias: number;
  usos: number;
  categorias: Categoria[];
  fichas: Ficha[];
}

/** "AR" de "Ana Ribeiro". */
export function iniciais(nome: string | null | undefined): string {
  const partes = (nome ?? "").trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  return ((partes[0][0] ?? "") + (partes.length > 1 ? partes[partes.length - 1][0] ?? "" : "")).toUpperCase();
}

export interface Pendencias {
  decide_pertinencia: boolean;
  gere: boolean;
  /** Coordena algum projeto agora: a aba "Meus projetos" aparece. */
  coordena_projetos: boolean;
  arquivamentos_pendentes: number;
  /** Finalizado exige o arquivamento (CENTRAL_EXIGE_ARQUIVAMENTO no backend). Na prévia, falso. */
  exige_arquivamento: boolean;
  pertinencia: FichaCompleta[];
  revisao: FichaCompleta[];
}

export interface OpcoesCentral {
  frentes: { id: number; nome: string }[];
  escopos: { id: number; nome: string; frente_id: number | null }[];
  projetos: { id: number; nome: string; cliente: string | null; status: string }[];
  membros: { id: number; nome: string; posicao: string }[];
  categorias: Categoria[];
  /** O maior número de gestão cadastrado (a ativa); nulo sem semestre numerado. */
  gestao_atual: number | null;
}

/** A gestão mais antiga oferecida nos filtros; as anteriores não têm registro. */
export const PRIMEIRA_GESTAO = 20;

/** As gestões de `PRIMEIRA_GESTAO` até a atual, da mais recente à mais antiga. */
export function gestoesAte(atual: number | null): number[] {
  if (!atual || atual < PRIMEIRA_GESTAO) return [];
  const lista: number[] = [];
  for (let n = atual; n >= PRIMEIRA_GESTAO; n -= 1) lista.push(n);
  return lista;
}

export function getCategorias(token: string) {
  return apiFetch<Categoria[]>("/central/categorias", { token });
}

export interface CategoriaPayload {
  nome?: string;
  icone?: string;
  ativa?: boolean;
  ordem?: number;
}

export function criarCategoria(payload: CategoriaPayload, token: string) {
  return apiFetch<Categoria>("/central/categorias", {
    aviso: "Categoria criada", method: "POST",
    token,
    body: JSON.stringify(payload),
  });
}

export function editarCategoria(categoriaId: number, payload: CategoriaPayload, token: string) {
  return apiFetch<Categoria>(`/central/categorias/${categoriaId}`, {
    aviso: "Categoria salva", method: "PATCH",
    token,
    body: JSON.stringify(payload),
  });
}

export interface IndicarPayload {
  titulo: string;
  tipos: TipoFicha[];
  por_que_se_destacou: string;
  frente_id: number | null;
  escopo_id: number | null;
  escopo_texto?: string | null;
  projeto_id: number | null;
  projeto_texto?: string | null;
  autores_ids: number[];
  setor?: string | null;
  ferramenta?: string | null;
  via?: ViaFicha;
}

export interface EditarFichaPayload {
  titulo?: string;
  tipos?: TipoFicha[];
  frente_id?: number | null;
  escopo_id?: number | null;
  escopo_texto?: string | null;
  projeto_id?: number | null;
  projeto_texto?: string | null;
  autores_ids?: number[];
  responsavel_id?: number | null;
  setor?: string | null;
  ferramenta?: string | null;
  por_que_se_destacou?: string;
  em_uma_frase?: string | null;
  problema?: string | null;
  passos?: string[];
  quando_usar?: string | null;
  onde_aparece?: string | null;
  visao_autores?: string[];
  pontos_atencao?: string | null;
  revisar_em?: string | null;
  apontada_diagnostico?: boolean;
}

export function getToolBox(token: string) {
  return apiFetch<ToolBox>("/central/toolbox", { token });
}

export function getMinhasFichas(token: string) {
  return apiFetch<FichaCompleta[]>("/central/minhas", { token });
}

export function getPendenciasCentral(token: string) {
  return apiFetch<Pendencias>("/central/pendencias", { token });
}

export function getOpcoesCentral(token: string) {
  return apiFetch<OpcoesCentral>("/central/opcoes", { token });
}

export function getFicha(fichaId: number, token: string) {
  return apiFetch<FichaCompleta>(`/central/fichas/${fichaId}`, { token });
}

export function indicarFicha(payload: IndicarPayload, token: string) {
  return apiFetch<FichaCompleta>("/central/fichas", {
    aviso: "Indicação enviada", method: "POST",
    token,
    body: JSON.stringify(payload),
  });
}

export function editarFicha(fichaId: number, payload: EditarFichaPayload, token: string, aviso = "Ficha salva") {
  return apiFetch<FichaCompleta>(`/central/fichas/${fichaId}`, {
    aviso, method: "PATCH",
    token,
    body: JSON.stringify(payload),
  });
}

export function decidirPertinencia(fichaId: number, aprovar: boolean, comentario: string | null, token: string) {
  return apiFetch<FichaCompleta>(`/central/fichas/${fichaId}/decisao`, {
    aviso: aprovar ? "Indicação aprovada" : "Indicação devolvida", method: "POST",
    token,
    body: JSON.stringify({ aprovar, comentario }),
  });
}

export function enviarParaRevisao(fichaId: number, token: string) {
  return apiFetch<FichaCompleta>(`/central/fichas/${fichaId}/enviar-revisao`, {
    aviso: "Ficha enviada para a revisão final", method: "POST",
    token,
  });
}

export function pedirAjustes(fichaId: number, comentario: string, token: string) {
  return apiFetch<FichaCompleta>(`/central/fichas/${fichaId}/pedir-ajustes`, {
    aviso: "Ajustes pedidos aos autores", method: "POST",
    token,
    body: JSON.stringify({ comentario }),
  });
}

export function publicarFicha(fichaId: number, token: string) {
  return apiFetch<FichaCompleta>(`/central/fichas/${fichaId}/publicar`, {
    aviso: "Ficha publicada", method: "POST",
    token,
  });
}

export function marcarUso(fichaId: number, projetoId: number | null, token: string) {
  return apiFetch<FichaCompleta>(`/central/fichas/${fichaId}/uso`, {
    aviso: "Uso registrado. Obrigado por contar.", method: "POST",
    token,
    body: JSON.stringify({ projeto_id: projetoId }),
  });
}

export function anexarArquivo(fichaId: number, arquivo: File, legenda: string, token: string) {
  const body = new FormData();
  body.append("arquivo", arquivo);
  if (legenda.trim()) body.append("legenda", legenda.trim());
  return apiFetch<AnexoFicha>(`/central/fichas/${fichaId}/anexos`, { aviso: "Anexo enviado", method: "POST", token, body });
}

export function editarAnexo(anexoId: number, legenda: string, token: string) {
  return apiFetch<AnexoFicha>(`/central/anexos/${anexoId}`, {
    aviso: "Legenda salva", method: "PATCH",
    token,
    body: JSON.stringify({ legenda }),
  });
}

export function apagarAnexo(anexoId: number, token: string) {
  return apiFetch<void>(`/central/anexos/${anexoId}`, { aviso: "Anexo apagado", method: "DELETE", token });
}

/** A rota exige token, então o arquivo vai por blob. */
export async function abrirAnexo(anexo: AnexoFicha, token: string) {
  const response = await fetch(`${API_URL}/central/anexos/${anexo.id}/arquivo`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error("Erro ao abrir o anexo");
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener");
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** URL temporária de uma imagem anexada, pra miniatura. */
export async function urlDoAnexo(anexo: AnexoFicha, token: string): Promise<string> {
  const response = await fetch(`${API_URL}/central/anexos/${anexo.id}/arquivo`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error("Erro ao carregar o anexo");
  return URL.createObjectURL(await response.blob());
}

/** As etapas da linha do tempo de uma ficha e em qual ela está. */
export const ETAPAS_FICHA = ["Indicada", "Gerente", "Autores", "Diretor", "Publicada"] as const;

export function etapaDaFicha(status: StatusFicha): { indice: number; devolvida: boolean } {
  switch (status) {
    case "aguardando_gerente":
      return { indice: 1, devolvida: false };
    case "com_autores":
    case "ajustes_pedidos":
      return { indice: 2, devolvida: false };
    case "revisao_final":
      return { indice: 3, devolvida: false };
    case "publicada":
      return { indice: 4, devolvida: false };
    case "devolvida":
      return { indice: 1, devolvida: true };
  }
}

export function tomDoStatus(status: StatusFicha): "success" | "warning" | "muted" | "default" {
  if (status === "publicada") return "success";
  if (status === "devolvida") return "muted";
  if (status === "aguardando_gerente" || status === "ajustes_pedidos") return "warning";
  return "default";
}

/* ------------------------------------------------------------------ */
/* Fase 2: arquivamento, banca, projetos de referência, painel         */
/* ------------------------------------------------------------------ */

export interface ProjetoDaCentral {
  id: number;
  nome: string;
  cliente: string | null;
  status: string;
  status_rotulo: string;
  frente_ids: number[];
  frentes: string[];
  escopos: { id: number | null; nome: string; frente_id: number | null }[];
  coordenador_id: number | null;
  coordenador: string | null;
  equipe: string[];
  /** "YYYY-MM-DD" da última entrega (real ou planejada). */
  entrega: string | null;
}

/** O "Arquivamento na Central" de um projeto (o backend ainda chama de encerramento por dentro). */
export interface Arquivamento {
  id: number;
  projeto_id: number;
  coordenador_id: number;
  enviado_em: string;
  checklist: boolean[];
  usos: UsoReferencias[];
  referencia_ficha_ids: number[];
  referencia_projeto_ids: number[];
  sem_ativos_motivo: string | null;
  observacao: string | null;
}

export type UsoReferencias = "ficha" | "projeto_referencia" | "assistente";

export interface MeuProjeto extends ProjetoDaCentral {
  /** O arquivamento mais recente; pode haver mais de um. */
  arquivamento: Arquivamento | null;
  /** A pessoa pode preencher: coordenador, gerente da frente ou quem gere. */
  pode_arquivar: boolean;
  /** Sem arquivamento e já nas etapas finais: Finalizado vai travar. Sempre falso quando a barreira está desligada. */
  arquivamento_urgente: boolean;
  exige_arquivamento: boolean;
  pre_indicacoes_banca: Ficha[];
  fichas: Ficha[];
}

export interface MeusProjetos {
  projetos: MeuProjeto[];
  checklist: string[];
  arquivamentos_pendentes: number;
  exige_arquivamento: boolean;
}

export interface AtivoEncerramento {
  titulo: string;
  tipos: TipoFicha[];
  por_que_se_destacou: string;
  autores_ids: number[];
  escopo_id: number | null;
}

export interface ArquivamentoPayload {
  ativos: AtivoEncerramento[];
  /** Obrigatório quando `ativos` vai vazio. */
  sem_ativos_motivo?: string | null;
  checklist: boolean[];
  usos: UsoReferencias[];
  referencia_ficha_ids?: number[];
  referencia_projeto_ids?: number[];
  observacao?: string | null;
}

export interface ProjetoReferencia {
  id: number;
  projeto_id: number;
  projeto: ProjetoDaCentral;
  pergunta_cliente: string;
  recomendacao: string;
  por_que_se_destacou: string;
  nota: string | null;
  link_entregas: string | null;
  /** A gestão do projeto (51 = 2026.2). */
  numero_gestao: number | null;
  ativo: boolean;
  escolhido_por_nome: string | null;
  escolhido_em: string;
  usos: number;
  anexos: AnexoFicha[];
  fichas: Ficha[];
  permissoes: { editar: boolean; marcar_uso: boolean };
}

export interface ReferenciaPayload {
  projeto_id?: number | null;
  pergunta_cliente?: string | null;
  recomendacao?: string | null;
  por_que_se_destacou?: string | null;
  nota?: string | null;
  link_entregas?: string | null;
  numero_gestao?: number | null;
  ativo?: boolean | null;
}

export interface Painel {
  semestre: { id: number; nome: string } | null;
  resumo: {
    publicadas: number;
    publicadas_na_gestao: number;
    em_andamento: number;
    aguardando_gerente: number;
    com_autores: number;
    revisao_final: number;
    autores_no_prazo: number;
    autores_total: number;
    escopos_cobertos: number;
    escopos_total: number;
    usos: number;
  };
  onde: { status: StatusFicha; rotulo: string; total: number }[];
  tempos: { chave: string; rotulo: string; dias: number | null; amostras: number }[];
  mais_usadas: { id: number; codigo: string; titulo: string; usos: number }[];
  origem: { via: ViaFicha; total: number }[];
  cobertura: { frente: string; escopo_id: number; escopo: string; referencias: number; fichas: number; coberto: boolean }[];
  atencao: { id: number; titulo: string; projeto_nome: string | null; status: StatusFicha; status_rotulo: string; dias: number; acao: string }[];
  pendentes_revisao: Ficha[];
}

export const ROTULO_USO_REFERENCIAS: Record<UsoReferencias, string> = {
  ficha: "Fichas da Tool Box",
  projeto_referencia: "Projetos de referência",
  assistente: "O assistente",
};

export function getMeusProjetosCentral(token: string) {
  return apiFetch<MeusProjetos>("/central/projetos", { token });
}

/** Um projeto só, para a página do arquivamento (quem pode preencher chega
 *  por aqui mesmo sem coordenar). Traz o checklist e os arquivamentos anteriores. */
export function getProjetoCentral(projetoId: number, token: string) {
  return apiFetch<MeuProjeto & { checklist: string[]; arquivamentos: Arquivamento[] }>(`/central/projetos/${projetoId}`, { token });
}

/** O código da recusa de Finalizado sem o arquivamento na Central. */
export const CODIGO_ARQUIVAMENTO_PENDENTE = "arquivamento_central_pendente";

export function rotaArquivamento(projetoId: number) {
  return `/central/projetos/${projetoId}/arquivar`;
}

export function enviarArquivamento(projetoId: number, payload: ArquivamentoPayload, token: string) {
  return apiFetch<{ arquivamento: Arquivamento; fichas: FichaCompleta[] }>(`/central/projetos/${projetoId}/arquivamento`, {
    aviso: payload.ativos.length > 0 ? "Arquivamento enviado. O gerente da frente vai analisar as indicações." : "Arquivamento enviado.",
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });
}

export interface PreIndicacaoPayload {
  titulo: string;
  tipos: TipoFicha[];
  por_que_se_destacou: string;
  autores_ids?: number[];
}

export function preIndicarNaBanca(bancaId: number, payload: PreIndicacaoPayload, token: string) {
  return apiFetch<FichaCompleta>(`/central/bancas/${bancaId}/pre-indicacoes`, {
    aviso: "Indicação enviada para a Central", method: "POST",
    token,
    body: JSON.stringify(payload),
  });
}

export function getPreIndicacoesDaBanca(bancaId: number, token: string) {
  return apiFetch<Ficha[]>(`/central/bancas/${bancaId}/pre-indicacoes`, { token });
}

export function getReferencias(token: string, incluirInativas = false) {
  return apiFetch<ProjetoReferencia[]>(`/central/referencias${incluirInativas ? "?incluir_inativas=true" : ""}`, { token });
}

export function criarReferencia(payload: ReferenciaPayload, token: string) {
  return apiFetch<ProjetoReferencia>("/central/referencias", {
    aviso: "Projeto de referência adicionado", method: "POST",
    token,
    body: JSON.stringify(payload),
  });
}

export function editarReferencia(referenciaId: number, payload: ReferenciaPayload, token: string) {
  return apiFetch<ProjetoReferencia>(`/central/referencias/${referenciaId}`, {
    aviso: "Projeto de referência salvo", method: "PATCH",
    token,
    body: JSON.stringify(payload),
  });
}

export function marcarUsoReferencia(referenciaId: number, projetoId: number | null, token: string) {
  return apiFetch<ProjetoReferencia>(`/central/referencias/${referenciaId}/uso`, {
    aviso: "Uso registrado. Obrigado por contar.", method: "POST",
    token,
    body: JSON.stringify({ projeto_id: projetoId }),
  });
}

export function anexarReferencia(referenciaId: number, arquivo: File, legenda: string, token: string) {
  const body = new FormData();
  body.append("arquivo", arquivo);
  if (legenda.trim()) body.append("legenda", legenda.trim());
  return apiFetch<AnexoFicha>(`/central/referencias/${referenciaId}/anexos`, { aviso: "Prévia enviada", method: "POST", token, body });
}

export function apagarAnexoReferencia(anexoId: number, token: string) {
  return apiFetch<void>(`/central/referencias/anexos/${anexoId}`, { aviso: "Prévia apagada", method: "DELETE", token });
}

export function urlAnexoReferencia(anexoId: number) {
  return `${API_URL}/central/referencias/anexos/${anexoId}/arquivo`;
}

export function getPainelCentral(token: string) {
  return apiFetch<Painel>("/central/painel", { token });
}

/* ------------------------------------------------------------------ */
/* Fase 3: vitrines de conteúdo                                         */
/* ------------------------------------------------------------------ */

export type ChaveConteudo = "metodo" | "capacitacao" | "recursos";

export interface ArquivoConteudo {
  id: number;
  chave: ChaveConteudo;
  nome: string;
  mime: string;
  tamanho: number;
  legenda: string | null;
  imagem: boolean;
}

export interface Conteudo<T = Record<string, unknown>> {
  chave: ChaveConteudo;
  dados: T;
  /** Ainda é o padrão do código (ninguém editou). */
  padrao: boolean;
  atualizado_em: string | null;
  arquivos: ArquivoConteudo[];
  permissoes: { editar: boolean };
}

export interface MetodoPasso {
  nome: string;
  pergunta: string;
  nivel: string;
  pagina: number | null;
  ficha_id?: number | null;
}

export interface MetodoEscopo {
  chave: string;
  nome: string;
  pagina: number | null;
  decisao: string;
  erro: string;
  passos: MetodoPasso[];
}

export interface MetodoDados {
  titulo: string;
  versao: string;
  origem: string;
  descricao: string;
  arquivo_id: number | null;
  fundamentos: { titulo: string; descricao: string; pagina: number | null; itens: { titulo: string; texto: string }[] };
  escopos: MetodoEscopo[];
  niveis: Record<string, string>;
}

export interface Aula {
  escopo: string;
  gestao: string;
  titulo: string;
  descricao: string;
  formato: string;
  /** Ids de `cc_arquivo` com as prévias dos slides. */
  previas: number[];
  /** O arquivo completo da aula (id de `cc_arquivo`), se foi enviado. */
  arquivo_id?: number | null;
  /** Ou um link externo para a aula (Teams, Drive). */
  link?: string | null;
  conteudo: string[];
  ficha_ids: number[];
  metodo: string | null;
}

export interface CapacitacaoDados {
  descricao: string;
  aulas: Aula[];
}

export interface RecursoExterno {
  nome: string;
  tipo: string;
  descricao: string;
  url: string | null;
  recursos: { nome: string; escopo: string; quando: string }[];
  acesso: string | null;
}

export interface RecursosDados {
  descricao: string;
  grupos: { titulo: string; itens: RecursoExterno[] }[];
}

export function getConteudo<T>(chave: ChaveConteudo, token: string) {
  return apiFetch<Conteudo<T>>(`/central/conteudo/${chave}`, { token });
}

export function atualizarConteudo<T>(chave: ChaveConteudo, dados: T, token: string) {
  return apiFetch<Conteudo<T>>(`/central/conteudo/${chave}`, {
    aviso: "Conteúdo salvo", method: "PUT",
    token,
    body: JSON.stringify({ dados }),
  });
}

export function restaurarConteudo<T>(chave: ChaveConteudo, token: string) {
  return apiFetch<Conteudo<T>>(`/central/conteudo/${chave}/restaurar`, { aviso: "Conteúdo restaurado ao padrão", method: "POST", token });
}

export function enviarArquivoConteudo(chave: ChaveConteudo, arquivo: File, legenda: string, token: string) {
  const body = new FormData();
  body.append("arquivo", arquivo);
  if (legenda.trim()) body.append("legenda", legenda.trim());
  return apiFetch<ArquivoConteudo>(`/central/conteudo/${chave}/arquivos`, { aviso: "Arquivo enviado", method: "POST", token, body });
}

export function apagarArquivoConteudo(arquivoId: number, token: string) {
  return apiFetch<void>(`/central/conteudo/arquivos/${arquivoId}`, { aviso: "Arquivo apagado", method: "DELETE", token });
}

export function urlArquivoConteudo(arquivoId: number) {
  return `${API_URL}/central/conteudo/arquivos/${arquivoId}/arquivo`;
}

/** Abre um arquivo protegido numa aba: a rota exige token, então vai por blob. */
export async function abrirUrlProtegida(url: string, token: string) {
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error("Erro ao abrir o arquivo");
  const blob = await response.blob();
  const objeto = URL.createObjectURL(blob);
  window.open(objeto, "_blank", "noopener");
  window.setTimeout(() => URL.revokeObjectURL(objeto), 60_000);
}

/** URL temporária de uma imagem protegida, para miniatura. */
export async function blobUrlProtegida(url: string, token: string): Promise<string> {
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error("Erro ao carregar a imagem");
  return URL.createObjectURL(await response.blob());
}
