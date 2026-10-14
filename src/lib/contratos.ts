import { apiFetch } from "./api";
import { API_URL } from "@/config/config";
import type {
  AprovacaoPublica,
  DocumentoContratual,
  ExtracaoColeta,
  IdentidadeInstitucional,
  ItemPainelContratual,
  LinkAprovacao,
  ModeloContratual,
  ParagrafoEditavel,
  SolicitacaoAlteracao,
  TipoDocumentoContratual,
  VersaoDocumentoContratual,
} from "@/types/contratos";

export function getDocumentosDoProjeto(projetoId: number, token: string) {
  return apiFetch<{ documentos: DocumentoContratual[] }>(
    `/projetos/${projetoId}/documentos-contratuais`,
    { token },
  );
}

export function abrirDocumento(projetoId: number, tipo: TipoDocumentoContratual, token: string) {
  return apiFetch<DocumentoContratual>(`/projetos/${projetoId}/documentos-contratuais`, {
    aviso: "Documento aberto", method: "POST",
    body: JSON.stringify({ tipo }),
    token,
  });
}

export function getDocumento(documentoId: number, token: string) {
  return apiFetch<DocumentoContratual>(`/documentos-contratuais/${documentoId}`, { token });
}

/** A lista de projetos do passo "escolher projeto" do assistente de Novo
 *  Contrato — NÃO é `getProjetos` (recorte geral de visão de projeto, só
 *  ampliado por `pode_ver_todos_projetos`): aqui o critério é quem pode de
 *  fato abrir ESTE tipo de documento (`pode_elaborar_qualquer_contrato` vê
 *  todos, mesmo sem ser membro/vendedor de projeto nenhum). */
export function getProjetosDisponiveisParaDocumento(
  tipo: TipoDocumentoContratual,
  token: string,
) {
  return apiFetch<{ projetos: { id: number; nome: string; cliente: string | null }[] }>(
    `/documentos-contratuais/projetos-disponiveis?tipo=${tipo}`,
    { token },
  );
}

/** Contrato institucional (Agro etc.) — documento avulso, sem projeto de
 *  entrega nenhum por trás. `nomeProjeto` é só um campo de texto no
 *  formulário, não cria linha nenhuma em projeto. */
export function criarDocumentoInstitucional(
  dados: { nome_projeto: string; cliente: string | null; tipo: TipoDocumentoContratual },
  token: string,
) {
  return apiFetch<DocumentoContratual>(`/documentos-contratuais/institucional`, {
    aviso: "Documento criado", method: "POST",
    body: JSON.stringify(dados),
    token,
  });
}

/** Dias tipo "prova" do calendário acadêmico da(s) frente(s) do projeto,
 *  dentro de [inicio, fim] — só sugestão pro campo "Dias de exceção", quem
 *  preenche decide o que de fato entra. */
export function sugerirDiasExcecao(projetoId: number, inicio: string, fim: string, token: string) {
  return apiFetch<{ dias: { inicio: string; fim: string }[] }>(
    `/projetos/${projetoId}/documentos-contratuais/sugerir-dias-excecao?inicio=${inicio}&fim=${fim}`,
    { token },
  );
}

export function atualizarDadosDocumento(
  documentoId: number,
  dados: Record<string, unknown>,
  token: string,
) {
  return apiFetch<DocumentoContratual>(`/documentos-contratuais/${documentoId}`, {
    method: "PATCH",
    body: JSON.stringify({ dados }),
    token,
  });
}

export function confirmarPreenchimento(documentoId: number, token: string) {
  return apiFetch<DocumentoContratual>(`/documentos-contratuais/${documentoId}/confirmar`, {
    aviso: "Preenchimento confirmado", method: "POST",
    token,
  });
}

export function gerarDocumento(documentoId: number, token: string) {
  return apiFetch<VersaoDocumentoContratual>(`/documentos-contratuais/${documentoId}/gerar`, {
    aviso: "Documento gerado", method: "POST",
    token,
  });
}

export function aprovarInternamente(documentoId: number, token: string) {
  return apiFetch<DocumentoContratual>(`/documentos-contratuais/${documentoId}/aprovar-internamente`, {
    aviso: "Aprovado internamente", method: "POST",
    token,
  });
}

export function deletarDocumento(documentoId: number, token: string) {
  return apiFetch<void>(`/documentos-contratuais/${documentoId}`, { aviso: "Documento excluído", method: "DELETE", token });
}

/** Apagar de vez — mesmo já assinado e arquivado. Restrito à diretoria (o
 *  backend recusa com 403 pra qualquer outra pessoa); nunca apaga o projeto
 *  que o documento originou, só o documento e o histórico dele. */
export function deletarDocumentoPermanente(documentoId: number, token: string) {
  return apiFetch<void>(`/documentos-contratuais/${documentoId}/permanente`, { aviso: "Documento apagado", method: "DELETE", token });
}

/**
 * A rota exige Bearer token, então nem um `<a href>` nem um `<iframe src>`
 * direto funcionam (nenhum dos dois manda o header Authorization) — busca
 * como blob, e quem chama decide o que fazer com ele (baixar ou exibir).
 */
async function buscarArquivoDocumento(
  documentoId: number,
  formato: "pdf" | "docx",
  token: string,
  versao?: number,
): Promise<Blob> {
  const query = versao != null ? `&versao=${versao}` : "";
  const response = await fetch(
    `${API_URL}/documentos-contratuais/${documentoId}/arquivo?formato=${formato}${query}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!response.ok) throw new Error("Erro ao carregar o arquivo do documento");
  return response.blob();
}

/** Baixa o arquivo via um link temporário (mesmo padrão de
 *  `baixarAnexoProposta` em `lib/projetos.ts`). Sem `versao`, baixa a
 *  última — com `versao`, baixa aquela específica do histórico. */
export async function baixarArquivoDocumento(
  documentoId: number,
  formato: "pdf" | "docx",
  nomeArquivo: string,
  token: string,
  versao?: number,
) {
  const blob = await buscarArquivoDocumento(documentoId, formato, token, versao);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Pré-visualização embutida na página do documento — mesma ideia da tela
 * pública de aprovação (`urlArquivoAprovacao`), só que autenticada: em vez
 * de uma URL direta num `<iframe src>` (que não carrega o Authorization),
 * busca o PDF como blob e devolve uma Object URL pra colocar no `src`.
 *
 * ⚠ Quem chama é responsável por `URL.revokeObjectURL` na URL devolvida
 * quando não precisar mais dela (troca de documento, unmount) — senão o
 * blob fica preso em memória pelo resto da sessão.
 */
export async function visualizarArquivoDocumento(
  documentoId: number,
  token: string,
  versao?: number,
): Promise<string> {
  const blob = await buscarArquivoDocumento(documentoId, "pdf", token, versao);
  return URL.createObjectURL(blob);
}

/** O histórico inteiro de versões geradas (v1, v2, ...), a mais recente
 *  primeiro — antes só dava pra ver/baixar a última. */
export function getVersoesDocumento(documentoId: number, token: string) {
  return apiFetch<{ versoes: VersaoDocumentoContratual[] }>(
    `/documentos-contratuais/${documentoId}/versoes`,
    { token },
  );
}

/** Rota pública (sem token) — o link direto serve tanto pro `<iframe>` da
 *  tela de aprovação quanto pra um `<a>` de download comum. */
export function urlArquivoAprovacao(token: string) {
  return `${API_URL}/aprovacao/${token}/arquivo`;
}

// ---------- exportar / aprovar / assinar ----------

export function exportarAprovacao(documentoId: number, token: string) {
  return apiFetch<LinkAprovacao>(`/documentos-contratuais/${documentoId}/exportar-aprovacao`, {
    aviso: "Enviado para aprovação", method: "POST",
    token,
  });
}

export function recusarAssinaturaTep(documentoId: number, token: string) {
  return apiFetch<LinkAprovacao>(`/documentos-contratuais/${documentoId}/recusar-assinatura-tep`, {
    aviso: "Recusa registrada", method: "POST",
    token,
  });
}

export function marcarAssinado(documentoId: number, token: string) {
  return apiFetch<DocumentoContratual>(`/documentos-contratuais/${documentoId}/marcar-assinado`, {
    aviso: "Marcado como assinado", method: "POST",
    token,
  });
}

export function considerarAceitoPorPrazo(documentoId: number, token: string) {
  return apiFetch<DocumentoContratual>(
    `/documentos-contratuais/${documentoId}/considerar-aceito-por-prazo`,
    { aviso: "Considerado aceito por prazo", method: "POST", token },
  );
}

// ---------- aprovação pública (sem login) ----------

export function getAprovacao(token: string) {
  return apiFetch<AprovacaoPublica>(`/aprovacao/${token}`);
}

/** O texto do documento em blocos, pra selecionar e citar um trecho — o PDF
 *  no `<iframe>` não expõe seleção pro JavaScript da página. */
export function getTextoAprovacao(token: string) {
  return apiFetch<{ paragrafos: string[] }>(`/aprovacao/${token}/texto`);
}

export function responderAprovacao(
  token: string,
  request: { acao: "aprovar" | "alteracao"; texto?: string; trechos?: string[] },
) {
  return apiFetch<{ ok: true }>(`/aprovacao/${token}/responder`, {
    aviso: "Resposta registrada", method: "POST",
    body: JSON.stringify(request),
  });
}

// ---------- solicitação de alteração ----------

export function getSolicitacoesAlteracao(documentoId: number, token: string) {
  return apiFetch<{ solicitacoes: SolicitacaoAlteracao[] }>(
    `/documentos-contratuais/${documentoId}/solicitacoes-alteracao`,
    { token },
  );
}

export function analisarSolicitacao(solicitacaoId: number, token: string) {
  return apiFetch<SolicitacaoAlteracao>(
    `/solicitacoes-alteracao-contratual/${solicitacaoId}/analisar`,
    { aviso: "Solicitação analisada", method: "PATCH", token },
  );
}

// ---------- edição manual do rascunho ----------

export function getParagrafosEditaveis(documentoId: number, token: string) {
  return apiFetch<{ paragrafos: ParagrafoEditavel[] }>(
    `/documentos-contratuais/${documentoId}/paragrafos-editaveis`,
    { token },
  );
}

export function editarTexto(documentoId: number, edicoes: Record<number, string>, token: string) {
  return apiFetch<{ alterados: number }>(`/documentos-contratuais/${documentoId}/texto`, {
    aviso: "Texto salvo", method: "PATCH",
    body: JSON.stringify({ edicoes }),
    token,
  });
}

export function reanexarDocumento(documentoId: number, arquivo: File, token: string) {
  const body = new FormData();
  body.append("arquivo", arquivo);
  return apiFetch<VersaoDocumentoContratual>(`/documentos-contratuais/${documentoId}/reanexar`, {
    aviso: "Documento reanexado", method: "POST",
    body,
    token,
  });
}

// ---------- Coleta de Dados ----------

/** O .docx em branco pra mandar ao cliente preencher. */
export async function baixarModeloColeta(token: string) {
  const response = await fetch(`${API_URL}/documentos-contratuais/coleta-dados/modelo`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error("Erro ao baixar o modelo da Coleta de Dados");
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "Coleta de Dados - Modelo.docx";
  link.click();
  URL.revokeObjectURL(url);
}

export function extrairColeta(
  projetoId: number,
  tipo: TipoDocumentoContratual,
  arquivo: File,
  token: string,
) {
  const body = new FormData();
  body.append("arquivo", arquivo);
  return apiFetch<ExtracaoColeta>(
    `/projetos/${projetoId}/documentos-contratuais/extrair-coleta?tipo=${tipo}`,
    { method: "POST", body, token },
  );
}

// ---------- Identidade Institucional ----------

export function getIdentidadeInstitucional(token: string) {
  return apiFetch<IdentidadeInstitucional>("/identidade-institucional", { token });
}

export function atualizarIdentidadeInstitucional(
  dados: Partial<IdentidadeInstitucional>,
  token: string,
) {
  return apiFetch<IdentidadeInstitucional>("/identidade-institucional", {
    aviso: "Identidade institucional salva", method: "PATCH",
    body: JSON.stringify({ dados }),
    token,
  });
}

// ---------- Painel (aba Contratos) ----------

export function getPainelContratual(token: string) {
  return apiFetch<{ itens: ItemPainelContratual[] }>("/contratos-painel", { token });
}

// ---------- WhatsApp ----------

/** Mesma regra de `wa_link_contratual.py` (removida de lá em 2026-09-20): só
 *  os dígitos do telefone, prefixados com "55" se ainda não tiverem. O
 *  número vem de quem está mandando a mensagem, digitado na hora — não do
 *  que estiver cadastrado no formulário do documento (pode estar errado, ou
 *  ser de outra pessoa). */
export function montarLinkWhatsapp(telefone: string, mensagem: string): string {
  const digitos = telefone.replace(/\D/g, "");
  const numeroCompleto = digitos.startsWith("55") ? digitos : `55${digitos}`;
  return `https://wa.me/${numeroCompleto}?text=${encodeURIComponent(mensagem)}`;
}

// ---------- Modelos base (.docx) ----------

export function getModelosContratuais(token: string) {
  return apiFetch<ModeloContratual[]>("/documentos-contratuais/modelos", { token });
}

/** O modelo em uso (personalizado ou o padrão do deploy), pra baixar. */
export async function baixarModeloContratual(tipo: string, nomeArquivo: string, token: string) {
  const response = await fetch(`${API_URL}/documentos-contratuais/modelos/${tipo}/arquivo`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error("Erro ao baixar o modelo");
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo;
  link.click();
  URL.revokeObjectURL(url);
}

export function enviarModeloContratual(tipo: string, arquivo: File, token: string) {
  const body = new FormData();
  body.append("arquivo", arquivo);
  return apiFetch<ModeloContratual>(`/documentos-contratuais/modelos/${tipo}`, { aviso: "Modelo enviado", method: "PUT", token, body });
}

export function removerModeloContratual(tipo: string, token: string) {
  return apiFetch<void>(`/documentos-contratuais/modelos/${tipo}`, { aviso: "Modelo removido", method: "DELETE", token });
}
