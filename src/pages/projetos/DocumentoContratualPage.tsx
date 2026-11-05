import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import styled from "styled-components";
import { theme } from "@/styles/theme";
import { useAuth } from "@/context/AuthContext";
import { camposFaltandoDoErro } from "@/lib/api";
import { getFrentes } from "@/lib/bancas";
import { formatarDataHora } from "@/lib/projetos";
import { ehDiretoriaDeProjetos } from "@/utils/permissoes";
import type { Frente } from "@/types/banca";
import { ETAPAS_DOCUMENTO, indiceDaEtapaDocumento } from "@/lib/contratos-etapas";
import {
  analisarSolicitacao,
  aprovarInternamente,
  atualizarDadosDocumento,
  baixarArquivoDocumento,
  baixarModeloColeta,
  confirmarPreenchimento,
  considerarAceitoPorPrazo,
  deletarDocumento,
  deletarDocumentoPermanente,
  editarTexto,
  exportarAprovacao,
  extrairColeta,
  gerarDocumento,
  getDocumento,
  getDocumentosDoProjeto,
  getParagrafosEditaveis,
  getSolicitacoesAlteracao,
  getVersoesDocumento,
  marcarAssinado,
  montarLinkWhatsapp,
  reanexarDocumento,
  recusarAssinaturaTep,
  solicitarRevisaoInterna,
  visualizarArquivoDocumento,
} from "@/lib/contratos";
import type {
  DocumentoContratual,
  ParagrafoEditavel,
  SolicitacaoAlteracao,
  VersaoDocumentoContratual,
} from "@/types/contratos";
import { ROTULO_STATUS_DOCUMENTO, ROTULO_TIPO_DOCUMENTO, normalizarTrecho } from "@/types/contratos";
import { DadosDocumentoForm } from "./DadosDocumentoForm";
import { ConfirmarModal } from "@/components/ConfirmarModal";
import {
  PageStack,
  PageCard,
  PageCardHeader,
  PageCardTitle,
  PageCardContent,
  PageButton,
  PageButtonSm,
  PageBadge,
  PageLoadingBlock,
  ErrorBlock,
  ErrorText,
  EmptyText,
} from "@/styles/page.styled";
import { FieldInput, FieldLabel, FieldTextarea } from "../Bancas.styled";
import { ModalOverlay } from "@/styles/ModalOverlay";
import { VisualizadorPdf } from "../AprovacaoContratual.styled";
import { ModalContent, ModalHeader, ModalTitle, ModalClose, ModalBody, ModalFooter } from "@/styles/modal.styled";
import {
  AcoesLinha,
  AcaoPrincipalBarra,
  AcoesSecundariasLinha,
  ArquivoBotao,
  ArquivoLinha,
  ArquivoNome,
  DocumentoPaginaHeader,
  DocumentoPaginaTitulo,
  ProjetoDestaque,
  ProjetoLinha,
  VoltarLink,
  Etapas,
  Etapa,
  EtapaMarca,
  LinkCaixa,
  LinkDiscreto,
  LinkLinha,
  ParagrafoEditavelBloco,
  SolicitacaoCard,
  TrechoCitado,
  VersaoLinha,
} from "./ProjetoContratos.styled";
import { FrenteTag } from "./Projetos.styled";

function tomDoStatus(status: DocumentoContratual["status"]): "default" | "success" | "muted" | "warning" | "danger" {
  if (status === "assinado_e_arquivado") return "success";
  if (status === "aprovado_pelo_cliente") return "success";
  if (status === "alteracao_solicitada") return "warning";
  if (status === "aguardando_preenchimento") return "muted";
  return "default";
}

/** Só um chute inicial pro campo de telefone do WhatsApp — quem manda ainda
 *  pode trocar antes de abrir a mensagem (ver `montarLinkWhatsapp`). */
function telefoneRepresentante(dados: Record<string, unknown>): string {
  const contratante = dados.contratante as Record<string, unknown> | undefined;
  const representante = contratante?.representante as Record<string, unknown> | undefined;
  const telefone = representante?.telefone;
  return typeof telefone === "string" ? telefone : "";
}

function rotuloStatusArquivo(status: string): string {
  return status === "final_assinado" ? "final assinado" : "rascunho";
}

const STATUS_DADOS_TRAVADOS = new Set(["aprovado_pelo_cliente", "assinado_e_arquivado"]);
const STATUS_EDICAO_TEXTO = new Set(["em_revisao_interna", "aprovado_internamente", "alteracao_solicitada"]);
const STATUS_GERACAO_PERMITIDA = new Set([
  "aguardando_preenchimento",
  "em_revisao_interna",
  "aprovado_internamente",
  "alteracao_solicitada",
]);

const ETAPAS = ETAPAS_DOCUMENTO;
const indiceDaEtapa = indiceDaEtapaDocumento;

/**
 * ⭐ 2026-09-21 — a tela de um documento jurídico, como página própria (não
 * modal): o Contratos antigo era um produto à parte, com uma tela cheia por
 * fluxo — comprimir tudo isso num modal genérico do resto do ATLAS deixava
 * a experiência mais pobre do que o que já existia. O stepper no topo é a
 * mesma ideia visual do `DetalheContrato.tsx` de lá.
 */
function vazio(v: unknown): boolean {
  if (v == null || v === "") return true;
  if (Array.isArray(v)) return v.every(vazio);
  if (typeof v === "object") return Object.values(v as Record<string, unknown>).every(vazio);
  return false;
}

/** `atual` por cima de `fonte`, mas só onde `atual` tem algo preenchido;
 *  objetos são mesclados campo a campo, arrays vazios cedem lugar. */
function mesclarPreenchido(fonte: Record<string, unknown>, atual: Record<string, unknown>): Record<string, unknown> {
  const saida: Record<string, unknown> = { ...fonte };
  for (const [chave, valorAtual] of Object.entries(atual)) {
    const valorFonte = fonte[chave];
    if (vazio(valorAtual)) {
      if (valorFonte !== undefined) saida[chave] = valorFonte;
      else saida[chave] = valorAtual;
      continue;
    }
    if (
      valorAtual &&
      typeof valorAtual === "object" &&
      !Array.isArray(valorAtual) &&
      valorFonte &&
      typeof valorFonte === "object" &&
      !Array.isArray(valorFonte)
    ) {
      saida[chave] = mesclarPreenchido(valorFonte as Record<string, unknown>, valorAtual as Record<string, unknown>);
      continue;
    }
    saida[chave] = valorAtual;
  }
  return saida;
}

/** "Já tem coleta": o mínimo que a Coleta de Dados sempre traz. */
function temContratante(dados: unknown): boolean {
  const d = dados as { contratante?: { razao_social?: unknown } } | null | undefined;
  return !!d?.contratante?.razao_social;
}

const AvisoLinha = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.borderRadius.lg};
  background: ${theme.colors.muted};
  font-size: ${theme.fontSize.sm};

  > span {
    flex: 1 1 16rem;
  }
`;

export function DocumentoContratualPage() {
  const { documentoId: documentoIdParam } = useParams<{ documentoId: string }>();
  const documentoId = Number(documentoIdParam);
  const { token, usuario } = useAuth();
  const navigate = useNavigate();

  const [atual, setAtual] = useState<DocumentoContratual | null>(null);
  const [dados, setDados] = useState<Record<string, unknown>>({});
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [aprovandoInternamente, setAprovandoInternamente] = useState(false);
  const [erro, setErro] = useState("");
  const [camposFaltando, setCamposFaltando] = useState<string[]>([]);

  const linkAprovacao = atual?.link_aprovacao ?? null;
  const [telefoneWhatsapp, setTelefoneWhatsapp] = useState("");
  const [exportando, setExportando] = useState(false);
  const [recusandoAssinatura, setRecusandoAssinatura] = useState(false);
  const [marcandoAssinado, setMarcandoAssinado] = useState(false);
  const [considerandoAceito, setConsiderandoAceito] = useState(false);
  const [mostrarConfirmarApagar, setMostrarConfirmarApagar] = useState(false);
  // Pedido de revisão interna (2026-11-05): a administradora jurídica devolve
  // o rascunho com um comentário em vez de aprovar.
  const [mostrarPedirRevisao, setMostrarPedirRevisao] = useState(false);
  const [comentarioRevisao, setComentarioRevisao] = useState("");
  const [pedindoRevisao, setPedindoRevisao] = useState(false);
  // Marcar como assinado pede confirmação e, no Contrato de Prestação,
  // pergunta se a declaração de interesse abre agora (2026-11-05).
  const [mostrarConfirmarAssinado, setMostrarConfirmarAssinado] = useState(false);
  const [abrirDeclaracao, setAbrirDeclaracao] = useState(true);
  const [mostrarConfirmarApagarPermanente, setMostrarConfirmarApagarPermanente] = useState(false);
  const [baixando, setBaixando] = useState<"pdf" | "docx" | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [erroPreview, setErroPreview] = useState("");
  // ⭐ 2026-09-23 — a pedido: colapsada por padrão. Só quem realmente quer
  // olhar o documento paga o custo (visual e de rede — o PDF só é buscado
  // depois de expandir, ver o efeito abaixo), o resto da página não fica
  // gigante à toa pra quem só quer aprovar/baixar.
  const [previewAberta, setPreviewAberta] = useState(false);

  // O histórico inteiro (v1, v2, ...) — antes só dava pra ver a última
  // (`atual.ultima_versao`), e um reanexo/regeração fazia a versão anterior
  // sumir da tela mesmo com o arquivo intacto no banco.
  const [versoes, setVersoes] = useState<VersaoDocumentoContratual[]>([]);
  const [versaoAntigaAberta, setVersaoAntigaAberta] = useState<number | null>(null);
  const [previewAntigoUrl, setPreviewAntigoUrl] = useState<string | null>(null);
  const [erroPreviewAntigo, setErroPreviewAntigo] = useState("");
  const [baixandoAntigo, setBaixandoAntigo] = useState<{ versao: number; formato: "pdf" | "docx" } | null>(null);

  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoAlteracao[]>([]);
  const [analisando, setAnalisando] = useState<number | null>(null);

  const [mostrarEditorTexto, setMostrarEditorTexto] = useState(false);
  const reanexarRef = useRef<HTMLInputElement>(null);
  const [reanexando, setReanexando] = useState(false);
  const coletaRef = useRef<HTMLInputElement>(null);
  const [extraindoColeta, setExtraindoColeta] = useState(false);
  const [pendenciasColeta, setPendenciasColeta] = useState<string[] | null>(null);

  const [frentes, setFrentes] = useState<Frente[]>([]);
  useEffect(() => {
    if (!token) return;
    getFrentes(token).then(setFrentes).catch(() => {});
  }, [token]);
  const nomeFrente = (frenteId: number) => frentes.find((f) => f.id === frenteId)?.nome ?? `Frente ${frenteId}`;

  // Rascunho LOCAL do preenchimento (2026-10-07, a pedido): o que a pessoa
  // digita vai pro localStorage a cada mudança e volta quando ela reabre o
  // documento, mesmo sem ter clicado em "Salvar dados". Some quando o
  // servidor confirma (salvar, confirmar, gerar) ou quando ela descarta.
  const chaveRascunho = documentoId ? `atlas:contrato:rascunho:${documentoId}` : null;
  const [rascunhoRestaurado, setRascunhoRestaurado] = useState(false);
  const dadosServidorRef = useRef<string>("");

  function limparRascunho() {
    if (!chaveRascunho) return;
    try {
      localStorage.removeItem(chaveRascunho);
    } catch {
      /* sem storage: nada a limpar */
    }
    setRascunhoRestaurado(false);
  }

  useEffect(() => {
    if (!chaveRascunho || carregando) return;
    const serializado = JSON.stringify(dados ?? {});
    try {
      if (serializado === dadosServidorRef.current) localStorage.removeItem(chaveRascunho);
      else localStorage.setItem(chaveRascunho, serializado);
    } catch {
      /* storage cheio ou bloqueado: segue sem rascunho */
    }
  }, [dados, chaveRascunho, carregando]);

  // Sugestão de reutilizar a coleta de outro documento do mesmo projeto
  // (2026-10-07, a pedido): o TEP costuma ser o último, e os dados do
  // contratante já foram preenchidos no contrato ou no NDA.
  const [sugestaoReuso, setSugestaoReuso] = useState<DocumentoContratual | null>(null);

  useEffect(() => {
    if (!token || !documentoId) return;
    getDocumento(documentoId, token)
      .then((doc) => {
        setAtual(doc);
        dadosServidorRef.current = JSON.stringify(doc.dados ?? {});
        let dadosIniciais = doc.dados ?? {};
        if (chaveRascunho) {
          try {
            const salvo = localStorage.getItem(chaveRascunho);
            if (salvo && salvo !== dadosServidorRef.current) {
              dadosIniciais = JSON.parse(salvo);
              setRascunhoRestaurado(true);
            }
          } catch {
            /* rascunho ilegível: ignora */
          }
        }
        setDados(dadosIniciais);
        if (doc.projeto_id && !temContratante(dadosIniciais)) {
          getDocumentosDoProjeto(doc.projeto_id, token)
            .then(({ documentos }) => {
              const fonte = documentos
                .filter((d) => d.id !== doc.id && temContratante(d.dados))
                .sort((a, b) => b.id - a.id)[0];
              setSugestaoReuso(fonte ?? null);
            })
            .catch(() => {});
        }
        // O card de link de aprovação sobrevive a sair e voltar da página
        // (ver `link_aprovacao` no backend) — o telefone junto precisa do
        // mesmo chute inicial que já dava certo logo depois de exportar.
        if (doc.link_aprovacao) setTelefoneWhatsapp(telefoneRepresentante(doc.dados ?? {}));
      })
      .catch((err) => setErro(err instanceof Error ? err.message : "Erro ao carregar documento"))
      .finally(() => setCarregando(false));
  }, [documentoId, token]);

  // Pré-visualização em PDF do rascunho gerado — qualquer um que abra o
  // documento pode ver, não só quem pode aprovar internamente: ver o
  // conteúdo não deveria exigir baixar o arquivo primeiro (mesma experiência
  // que o cliente já tem na tela pública de aprovação). Só busca o PDF
  // depois de expandir (`previewAberta`) — colapsada, não gasta rede.
  useEffect(() => {
    if (!atual?.ultima_versao || !token || !previewAberta) {
      setPreviewUrl(null);
      return;
    }
    let cancelado = false;
    let url: string | null = null;
    setErroPreview("");
    visualizarArquivoDocumento(atual.id, token)
      .then((objectUrl) => {
        if (cancelado) {
          URL.revokeObjectURL(objectUrl);
          return;
        }
        url = objectUrl;
        setPreviewUrl(objectUrl);
      })
      .catch((err) => setErroPreview(err instanceof Error ? err.message : "Erro ao carregar a pré-visualização"));
    return () => {
      cancelado = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [atual?.id, atual?.ultima_versao, token, previewAberta]);

  // O histórico inteiro — carrega junto com o documento, é só uma lista
  // (nomes, números, datas), não o arquivo em si.
  useEffect(() => {
    if (!atual?.id || !token) return;
    getVersoesDocumento(atual.id, token)
      .then(({ versoes: v }) => setVersoes(v))
      .catch(() => {});
  }, [atual?.id, atual?.ultima_versao, token]);

  // Pré-visualização de uma versão ANTIGA (não a última) — mesma ideia do
  // efeito acima, só que por versão específica, e só uma aberta por vez.
  useEffect(() => {
    if (!atual?.id || !token || versaoAntigaAberta == null) {
      setPreviewAntigoUrl(null);
      return;
    }
    let cancelado = false;
    let url: string | null = null;
    setErroPreviewAntigo("");
    visualizarArquivoDocumento(atual.id, token, versaoAntigaAberta)
      .then((objectUrl) => {
        if (cancelado) {
          URL.revokeObjectURL(objectUrl);
          return;
        }
        url = objectUrl;
        setPreviewAntigoUrl(objectUrl);
      })
      .catch((err) => setErroPreviewAntigo(err instanceof Error ? err.message : "Erro ao carregar a pré-visualização"));
    return () => {
      cancelado = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [atual?.id, token, versaoAntigaAberta]);

  useEffect(() => {
    if (!atual || !token) return;
    if (atual.status === "alteracao_solicitada" || atual.status === "aguardando_aprovacao_cliente") {
      getSolicitacoesAlteracao(atual.id, token)
        .then(({ solicitacoes: s }) => setSolicitacoes(s))
        .catch(() => {});
    } else {
      setSolicitacoes([]);
    }
  }, [atual, token]);

  function voltar() {
    // A aba Contratos por projeto não existe mais — o único ponto de
    // entrada é a Kanban de nível de menu (`/contratos`).
    navigate("/contratos");
  }

  function aplicarReuso() {
    if (!sugestaoReuso) return;
    // Mantém só o que o documento atual já tinha PREENCHIDO; o resto vem do
    // outro. Mesclagem profunda: o documento novo nasce com o esqueleto dos
    // campos vazio ("" e {}), e um spread raso deixava o vazio ganhar do
    // preenchido (2026-10-07, corrigido). A assinatura não é reaproveitada:
    // é de outra data.
    const reaproveitados = { ...((sugestaoReuso.dados ?? {}) as Record<string, unknown>) };
    delete reaproveitados.assinatura;
    setDados(mesclarPreenchido(reaproveitados, (dados ?? {}) as Record<string, unknown>));
    setSugestaoReuso(null);
  }

  async function handleSalvar() {
    if (!atual || !token) return;
    setSalvando(true);
    setErro("");
    setCamposFaltando([]);
    try {
      const atualizado = await atualizarDadosDocumento(atual.id, dados, token);
      setAtual(atualizado);
      dadosServidorRef.current = JSON.stringify(atualizado.dados ?? {});
      limparRascunho();
      setDados(atualizado.dados ?? {});
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao salvar dados");
    } finally {
      setSalvando(false);
    }
  }

  async function handleConfirmar() {
    if (!atual || !token) return;
    setConfirmando(true);
    setErro("");
    setCamposFaltando([]);
    try {
      const salvo = await atualizarDadosDocumento(atual.id, dados, token);
      const atualizado = await confirmarPreenchimento(salvo.id, token);
      setAtual(atualizado);
      dadosServidorRef.current = JSON.stringify(atualizado.dados ?? {});
      limparRascunho();
      setDados(atualizado.dados ?? {});
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao confirmar");
      setCamposFaltando(camposFaltandoDoErro(err) ?? []);
    } finally {
      setConfirmando(false);
    }
  }

  async function handleGerar() {
    if (!atual || !token) return;
    setGerando(true);
    setErro("");
    setCamposFaltando([]);
    try {
      await atualizarDadosDocumento(atual.id, dados, token);
      await gerarDocumento(atual.id, token);
      const recarregado = await getDocumento(atual.id, token);
      setAtual(recarregado);
      dadosServidorRef.current = JSON.stringify(recarregado.dados ?? {});
      limparRascunho();
      setDados(recarregado.dados ?? {});
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao gerar documento");
      setCamposFaltando(camposFaltandoDoErro(err) ?? []);
    } finally {
      setGerando(false);
    }
  }

  async function handleAprovarInternamente() {
    if (!atual || !token) return;
    setAprovandoInternamente(true);
    setErro("");
    try {
      const atualizado = await aprovarInternamente(atual.id, token);
      setAtual(atualizado);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao aprovar internamente");
    } finally {
      setAprovandoInternamente(false);
    }
  }

  async function handleExportar() {
    if (!atual || !token) return;
    setExportando(true);
    setErro("");
    try {
      await exportarAprovacao(atual.id, token);
      setTelefoneWhatsapp(telefoneRepresentante(dados));
      const recarregado = await getDocumento(atual.id, token);
      setAtual(recarregado);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao exportar para aprovação");
    } finally {
      setExportando(false);
    }
  }

  async function handleRecusarAssinatura() {
    if (!atual || !token) return;
    setRecusandoAssinatura(true);
    setErro("");
    try {
      await recusarAssinaturaTep(atual.id, token);
      setTelefoneWhatsapp(telefoneRepresentante(dados));
      const recarregado = await getDocumento(atual.id, token);
      setAtual(recarregado);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao registrar recusa de assinatura");
    } finally {
      setRecusandoAssinatura(false);
    }
  }

  async function handleMarcarAssinado() {
    if (!atual || !token) return;
    setMarcandoAssinado(true);
    setErro("");
    try {
      const atualizado = await marcarAssinado(atual.id, token, atual.tipo === "contrato" ? abrirDeclaracao : true);
      setAtual(atualizado);
      setMostrarConfirmarAssinado(false);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao marcar como assinado");
      throw err;
    } finally {
      setMarcandoAssinado(false);
    }
  }

  async function handlePedirRevisao() {
    if (!atual || !token) return;
    if (!comentarioRevisao.trim()) {
      setErro("Escreva o que precisa mudar no rascunho.");
      return;
    }
    setPedindoRevisao(true);
    setErro("");
    try {
      const atualizado = await solicitarRevisaoInterna(atual.id, comentarioRevisao.trim(), token);
      setAtual(atualizado);
      setComentarioRevisao("");
      setMostrarPedirRevisao(false);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao pedir revisão");
    } finally {
      setPedindoRevisao(false);
    }
  }

  async function handleConsiderarAceito() {
    if (!atual || !token) return;
    setConsiderandoAceito(true);
    setErro("");
    try {
      const atualizado = await considerarAceitoPorPrazo(atual.id, token);
      setAtual(atualizado);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao considerar aceito");
    } finally {
      setConsiderandoAceito(false);
    }
  }

  async function handleDeletar() {
    if (!atual || !token) return;
    await deletarDocumento(atual.id, token);
    voltar();
  }

  async function handleDeletarPermanente() {
    if (!atual || !token) return;
    await deletarDocumentoPermanente(atual.id, token);
    voltar();
  }

  async function handleAnalisar(solicitacaoId: number) {
    if (!token) return;
    setAnalisando(solicitacaoId);
    try {
      const atualizada = await analisarSolicitacao(solicitacaoId, token);
      // A resposta traz só id/documento_id/status; substituir o item inteiro
      // apagava `texto`/`trechos` e a tela quebrava no render
      // (2026-10-07, corrigido). Mescla.
      setSolicitacoes((atuais) =>
        atuais.map((s) => (s.id === atualizada.id ? { ...s, status: atualizada.status } : s)),
      );
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao analisar solicitação");
    } finally {
      setAnalisando(null);
    }
  }

  // "Contrato de Prestação de Serviços - Projeto X v2.pdf" (2026-11-05), o
  // mesmo nome que o backend manda no download.
  function nomeDoArquivo(versao: number, formato: "pdf" | "docx"): string {
    if (!atual) return `documento_v${versao}.${formato}`;
    return `${ROTULO_TIPO_DOCUMENTO[atual.tipo]} - ${atual.projeto_nome} v${versao}.${formato}`;
  }

  async function handleBaixar(formato: "pdf" | "docx") {
    if (!atual || !token) return;
    setBaixando(formato);
    setErro("");
    try {
      await baixarArquivoDocumento(atual.id, formato, nomeDoArquivo(atual.ultima_versao ?? 0, formato), token);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao baixar arquivo");
    } finally {
      setBaixando(null);
    }
  }

  async function handleBaixarVersaoAntiga(versao: number, formato: "pdf" | "docx") {
    if (!atual || !token) return;
    setBaixandoAntigo({ versao, formato });
    setErro("");
    try {
      await baixarArquivoDocumento(atual.id, formato, nomeDoArquivo(versao, formato), token, versao);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao baixar arquivo");
    } finally {
      setBaixandoAntigo(null);
    }
  }

  async function handleReanexar(arquivo: File) {
    if (!atual || !token) return;
    setReanexando(true);
    setErro("");
    try {
      await reanexarDocumento(atual.id, arquivo, token);
      const recarregado = await getDocumento(atual.id, token);
      setAtual(recarregado);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao reanexar documento");
    } finally {
      setReanexando(false);
      if (reanexarRef.current) reanexarRef.current.value = "";
    }
  }

  async function handleExtrairColeta(arquivo: File) {
    if (!atual || !token || !atual.projeto_id) return;
    setExtraindoColeta(true);
    setErro("");
    setPendenciasColeta(null);
    try {
      const resultado = await extrairColeta(atual.projeto_id, atual.tipo, arquivo, token);
      setDados(resultado.dados);
      setPendenciasColeta(resultado.pendencias);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao extrair dados da Coleta");
    } finally {
      setExtraindoColeta(false);
      if (coletaRef.current) coletaRef.current.value = "";
    }
  }

  if (carregando) return <PageLoadingBlock />;

  if (!atual) {
    return (
      <ErrorBlock>
        <ErrorText>{erro || "Documento não encontrado."}</ErrorText>
        <PageButton $variant="outline" onClick={voltar}>
          Voltar
        </PageButton>
      </ErrorBlock>
    );
  }

  const dadosTravados = STATUS_DADOS_TRAVADOS.has(atual.status);
  const podeConfirmar = atual.status === "aguardando_preenchimento" && !atual.confirmado;
  const podeApagar = atual.status === "aguardando_preenchimento" && !atual.confirmado;
  // Apagar de vez, em qualquer etapa (inclusive já assinado e arquivado) —
  // restrito à diretoria; o backend recusa com 403 pra qualquer outra
  // pessoa, isto aqui só evita mostrar um botão que ia dar erro.
  const podeApagarPermanente = ehDiretoriaDeProjetos(usuario);
  // A última já aparece no card "Rascunho gerado" acima — aqui só o resto
  // do histórico, mais recente primeiro.
  const versoesAnteriores = versoes
    .filter((v) => v.versao !== atual.ultima_versao)
    .sort((a, b) => b.versao - a.versao);
  // 2026-11-05: o rascunho ficou pra trás (dados editados e salvos depois
  // dele, pedido de revisão em aberto, ou edição ainda não salva nesta
  // tela) -> "Gerar rascunho de novo" aparece, e aprovar o rascunho velho
  // deixa de fazer sentido.
  const dadosLocaisAlterados = !dadosTravados && JSON.stringify(dados ?? {}) !== JSON.stringify(atual.dados ?? {});
  const rascunhoDesatualizado =
    !!atual.ultima_versao && (atual.rascunho_desatualizado || !!atual.revisao_pendente || dadosLocaisAlterados);
  const podeAprovarInternamente =
    atual.status === "em_revisao_interna" && !!atual.ultima_versao && !atual.rascunho_desatualizado && !atual.revisao_pendente;
  // ⭐ 2026-09-23 — a pedido: quem não pode aprovar internamente continua
  // vendo que essa etapa existe (o botão não some), só não consegue clicar
  // — sem isto, `podeAprovarInternamente` (só por status) deixava o botão
  // vermelho e clicável pra qualquer um, que descobria só ao clicar (e
  // tomar 403) que não tinha a caixa.
  const usuarioPodeAprovarInternamente = !!usuario?.permissoes.pode_aprovar_contrato_internamente;
  const podeExportar = atual.status === "aprovado_internamente" && !!atual.ultima_versao;
  const podeGerar =
    STATUS_GERACAO_PERMITIDA.has(atual.status) &&
    !podeConfirmar &&
    ((!podeAprovarInternamente && !podeExportar) || rascunhoDesatualizado);
  const podeEditarRascunho = STATUS_EDICAO_TEXTO.has(atual.status) && !!atual.ultima_versao;
  const ehTep = atual.tipo === "tep";
  const podeRecusarAssinatura = ehTep && atual.status === "aprovado_pelo_cliente";
  const podeMarcarAssinado = atual.status === "aprovado_pelo_cliente";
  const podeConsiderarAceito =
    ehTep && atual.status === "aprovado_pelo_cliente" && (atual.dias_restantes_aceite_tacito ?? 1) <= 0;
  const etapaAtual = indiceDaEtapa(atual);

  return (
    <PageStack>
      <DocumentoPaginaHeader>
        <DocumentoPaginaTitulo>
          <div>
            <VoltarLink type="button" onClick={voltar}>
              <ArrowLeft size={14} /> Contratos
            </VoltarLink>
            <h1>{ROTULO_TIPO_DOCUMENTO[atual.tipo]}</h1>
            <ProjetoLinha>
              {atual.projeto_id ? (
                <ProjetoDestaque as={Link} to={`/projetos/${atual.projeto_id}`}>
                  {atual.projeto_nome}
                  {atual.projeto_cliente ? ` · ${atual.projeto_cliente}` : ""}
                </ProjetoDestaque>
              ) : (
                // Institucional: sem projeto de verdade, sem link — só o texto.
                <ProjetoDestaque>
                  {atual.projeto_nome}
                  {atual.projeto_cliente ? ` · ${atual.projeto_cliente}` : ""}
                </ProjetoDestaque>
              )}
              {atual.frente_ids.map((fid) => (
                <FrenteTag key={fid}>{nomeFrente(fid)}</FrenteTag>
              ))}
            </ProjetoLinha>
          </div>
        </DocumentoPaginaTitulo>
        <AcoesLinha>
          <PageBadge $tone={tomDoStatus(atual.status)}>{ROTULO_STATUS_DOCUMENTO[atual.status]}</PageBadge>
          {podeConsiderarAceito && <PageBadge $tone="warning">prazo de aceite tácito vencido</PageBadge>}
        </AcoesLinha>
      </DocumentoPaginaHeader>

      <PageCard>
        <PageCardContent>
          <Etapas>
            {ETAPAS.map((rotulo, i) => {
              const estado = i < etapaAtual ? "concluida" : i === etapaAtual ? "atual" : "pendente";
              return (
                <Etapa key={rotulo} $estado={estado}>
                  <EtapaMarca $estado={estado}>{estado === "concluida" ? "✓" : i + 1}</EtapaMarca>
                  {rotulo}
                </Etapa>
              );
            })}
          </Etapas>
          {atual.criado_por_nome && (
            <EmptyText style={{ marginTop: "0.75rem", marginBottom: 0 }}>
              Criado por {atual.criado_por_nome}.
            </EmptyText>
          )}
          {atual.aprovado_internamente_por_nome && (
            <EmptyText style={{ marginTop: "0.375rem", marginBottom: 0 }}>
              Aprovado internamente por {atual.aprovado_internamente_por_nome} em{" "}
              {formatarDataHora(atual.aprovado_internamente_em)}.
            </EmptyText>
          )}
        </PageCardContent>
      </PageCard>

      {erro && (
        <ErrorBlock>
          <ErrorText>{erro}</ErrorText>
        </ErrorBlock>
      )}

      <PageCard>
        <PageCardHeader>
          <PageCardTitle>Dados do documento</PageCardTitle>
        </PageCardHeader>
        <PageCardContent>
          {/* Coleta de Dados é herança da antiga plataforma externa — só faz
              sentido com um projeto de verdade por trás. Institucional
              (sem projeto) não tem de onde vir esse .docx. */}
          {!dadosTravados && atual.projeto_id && (
            <ArquivoLinha style={{ marginBottom: "1rem" }}>
              <ArquivoBotao htmlFor="coleta-dados-upload">
                {extraindoColeta ? "Extraindo..." : "Preencher a partir da Coleta de Dados"}
                <input
                  ref={coletaRef}
                  id="coleta-dados-upload"
                  type="file"
                  accept=".docx,.pdf"
                  disabled={extraindoColeta}
                  onChange={(e) => {
                    const arquivo = e.target.files?.[0];
                    if (arquivo) handleExtrairColeta(arquivo);
                  }}
                />
              </ArquivoBotao>
              <ArquivoNome $vazio>
                .docx ou PDF preenchido pelo cliente — só pré-preenche (
                <LinkDiscreto
                  type="button"
                  onClick={() =>
                    baixarModeloColeta(token!).catch((err) =>
                      setErro(err instanceof Error ? err.message : "Erro ao baixar o modelo"),
                    )
                  }
                >
                  baixar modelo em branco
                </LinkDiscreto>
                )
              </ArquivoNome>
            </ArquivoLinha>
          )}

          {pendenciasColeta && pendenciasColeta.length > 0 && (
            <ErrorBlock style={{ marginBottom: "1rem" }}>
              <strong style={{ fontSize: "0.85rem" }}>A Coleta não trouxe {pendenciasColeta.length} campo(s):</strong>
              {pendenciasColeta.map((p, i) => (
                <ErrorText key={i}>{p}</ErrorText>
              ))}
            </ErrorBlock>
          )}

          {rascunhoRestaurado && !dadosTravados && (
            <AvisoLinha>
              <span>Recuperamos o que você tinha digitado e ainda não salvou.</span>
              <PageButtonSm
                type="button"
                $variant="ghost"
                onClick={() => {
                  setDados(atual.dados ?? {});
                  limparRascunho();
                }}
              >
                Descartar e voltar ao salvo
              </PageButtonSm>
            </AvisoLinha>
          )}
          {sugestaoReuso && !dadosTravados && (
            <AvisoLinha>
              <span>
                Este projeto já tem a coleta de dados preenchida em{" "}
                <strong>{ROTULO_TIPO_DOCUMENTO[sugestaoReuso.tipo]}</strong>. Quer reutilizar os dados do contratante,
                representante e testemunhas aqui?
              </span>
              <PageButtonSm type="button" onClick={aplicarReuso}>
                Reutilizar
              </PageButtonSm>
              <PageButtonSm type="button" $variant="ghost" onClick={() => setSugestaoReuso(null)}>
                Agora não
              </PageButtonSm>
            </AvisoLinha>
          )}
          {dadosTravados ? (
            <EmptyText>O cliente já aprovou este documento — os dados não podem mais ser editados.</EmptyText>
          ) : (
            <DadosDocumentoForm
              tipo={atual.tipo}
              dados={dados}
              onChange={setDados}
              camposFaltando={camposFaltando}
              projetoId={atual.projeto_id}
              token={token}
            />
          )}
        </PageCardContent>
      </PageCard>

      {atual.revisoes.length > 0 && (
        <PageCard>
          <PageCardHeader>
            <PageCardTitle>Revisões pedidas pela administração jurídica</PageCardTitle>
          </PageCardHeader>
          <PageCardContent>
            {atual.revisoes.map((r) => (
              <SolicitacaoCard key={r.id} style={{ marginBottom: "0.5rem" }}>
                <AcoesLinha>
                  <PageBadge $tone={r.atendida_em ? "success" : "warning"}>
                    {r.atendida_em ? "atendida" : "aguardando novo rascunho"}
                  </PageBadge>
                  <EmptyText style={{ margin: 0 }}>
                    {r.solicitado_por_nome ?? "Administração jurídica"} · {formatarDataHora(r.criado_em)}
                  </EmptyText>
                </AcoesLinha>
                <p style={{ margin: 0, fontSize: "0.85rem", whiteSpace: "pre-wrap" }}>{r.comentario}</p>
              </SolicitacaoCard>
            ))}
          </PageCardContent>
        </PageCard>
      )}

      {!!atual.ultima_versao && (
        <PageCard>
          <PageCardHeader>
            <PageCardTitle>Rascunho gerado</PageCardTitle>
          </PageCardHeader>
          <PageCardContent>
            <VersaoLinha>
              <span>v{atual.ultima_versao}</span>
              <AcoesLinha>
                <PageButtonSm type="button" $variant="outline" onClick={() => setPreviewAberta((a) => !a)}>
                  {previewAberta ? "Ocultar pré-visualização" : "Pré-visualizar"}
                </PageButtonSm>
                <PageButtonSm type="button" $variant="outline" disabled={baixando === "pdf"} onClick={() => handleBaixar("pdf")}>
                  {baixando === "pdf" ? "Baixando..." : "Baixar PDF"}
                </PageButtonSm>
                <PageButtonSm type="button" $variant="outline" disabled={baixando === "docx"} onClick={() => handleBaixar("docx")}>
                  {baixando === "docx" ? "Baixando..." : "Baixar .docx"}
                </PageButtonSm>
              </AcoesLinha>
            </VersaoLinha>
            {previewAberta &&
              (erroPreview ? (
                <ErrorText>{erroPreview}</ErrorText>
              ) : previewUrl ? (
                <VisualizadorPdf src={previewUrl} title="Pré-visualização do documento" />
              ) : (
                <EmptyText>Carregando pré-visualização...</EmptyText>
              ))}
            {podeEditarRascunho && (
              <AcoesLinha style={{ marginTop: "0.75rem" }}>
                <PageButtonSm type="button" $variant="outline" onClick={() => setMostrarEditorTexto(true)}>
                  Editar texto do rascunho
                </PageButtonSm>
                <ArquivoBotao htmlFor="reanexar-docx">
                  {reanexando ? "Enviando..." : "Reanexar .docx editado"}
                  <input
                    ref={reanexarRef}
                    id="reanexar-docx"
                    type="file"
                    accept=".docx"
                    disabled={reanexando}
                    onChange={(e) => {
                      const arquivo = e.target.files?.[0];
                      if (arquivo) handleReanexar(arquivo);
                    }}
                  />
                </ArquivoBotao>
              </AcoesLinha>
            )}
          </PageCardContent>
        </PageCard>
      )}

      {versoesAnteriores.length > 0 && (
        <PageCard>
          <PageCardHeader>
            <PageCardTitle>Versões anteriores</PageCardTitle>
          </PageCardHeader>
          <PageCardContent>
            {versoesAnteriores.map((v) => (
              <div key={v.id}>
                <VersaoLinha>
                  <span>
                    v{v.versao} · {rotuloStatusArquivo(v.status_arquivo)} · {formatarDataHora(v.criado_em)}
                  </span>
                  <AcoesLinha>
                    <PageButtonSm
                      type="button"
                      $variant="outline"
                      onClick={() => setVersaoAntigaAberta((atual) => (atual === v.versao ? null : v.versao))}
                    >
                      {versaoAntigaAberta === v.versao ? "Ocultar pré-visualização" : "Pré-visualizar"}
                    </PageButtonSm>
                    <PageButtonSm
                      type="button"
                      $variant="outline"
                      disabled={baixandoAntigo?.versao === v.versao && baixandoAntigo.formato === "pdf"}
                      onClick={() => handleBaixarVersaoAntiga(v.versao, "pdf")}
                    >
                      {baixandoAntigo?.versao === v.versao && baixandoAntigo.formato === "pdf" ? "Baixando..." : "Baixar PDF"}
                    </PageButtonSm>
                    <PageButtonSm
                      type="button"
                      $variant="outline"
                      disabled={baixandoAntigo?.versao === v.versao && baixandoAntigo.formato === "docx"}
                      onClick={() => handleBaixarVersaoAntiga(v.versao, "docx")}
                    >
                      {baixandoAntigo?.versao === v.versao && baixandoAntigo.formato === "docx" ? "Baixando..." : "Baixar .docx"}
                    </PageButtonSm>
                  </AcoesLinha>
                </VersaoLinha>
                {versaoAntigaAberta === v.versao &&
                  (erroPreviewAntigo ? (
                    <ErrorText>{erroPreviewAntigo}</ErrorText>
                  ) : previewAntigoUrl ? (
                    <VisualizadorPdf src={previewAntigoUrl} title={`Pré-visualização da v${v.versao}`} />
                  ) : (
                    <EmptyText>Carregando pré-visualização...</EmptyText>
                  ))}
              </div>
            ))}
          </PageCardContent>
        </PageCard>
      )}

      {linkAprovacao && (
        <PageCard>
          <PageCardHeader>
            <PageCardTitle>Link de aprovação pronto para enviar</PageCardTitle>
          </PageCardHeader>
          <PageCardContent>
            <LinkCaixa>
              <CopiarLinkLinha rotulo="Link de aprovação" valor={linkAprovacao.link_aprovacao} />
              <div>
                <FieldLabel htmlFor="telefone-whatsapp">Número de WhatsApp de quem vai receber</FieldLabel>
                <AcoesLinha style={{ marginTop: "0.375rem" }}>
                  <FieldInput
                    id="telefone-whatsapp"
                    style={{ maxWidth: "14rem" }}
                    placeholder="(11) 99999-8888"
                    value={telefoneWhatsapp}
                    onChange={(e) => setTelefoneWhatsapp(e.target.value)}
                  />
                  <PageButton
                    as="a"
                    href={
                      telefoneWhatsapp.replace(/\D/g, "")
                        ? montarLinkWhatsapp(telefoneWhatsapp, linkAprovacao.mensagem_whatsapp)
                        : undefined
                    }
                    target="_blank"
                    rel="noreferrer"
                    $variant="outline"
                    type="button"
                    aria-disabled={!telefoneWhatsapp.replace(/\D/g, "")}
                    onClick={(e) => {
                      if (!telefoneWhatsapp.replace(/\D/g, "")) e.preventDefault();
                    }}
                  >
                    Abrir mensagem pronta no WhatsApp
                  </PageButton>
                </AcoesLinha>
              </div>
            </LinkCaixa>
          </PageCardContent>
        </PageCard>
      )}

      {solicitacoes.length > 0 && (
        <PageCard>
          <PageCardHeader>
            <PageCardTitle>Pedidos de alteração do cliente</PageCardTitle>
          </PageCardHeader>
          <PageCardContent>
            {solicitacoes.map((s) => (
              <SolicitacaoCard key={s.id} style={{ marginBottom: "0.5rem" }}>
                <AcoesLinha>
                  <PageBadge $tone={s.status === "pendente" ? "warning" : "success"}>
                    {s.status === "pendente" ? "pendente" : "analisada"}
                  </PageBadge>
                </AcoesLinha>
                <p style={{ margin: 0, fontSize: "0.85rem" }}>{s.texto}</p>
                {s.trechos.map(normalizarTrecho).map((t, i) => (
                  <div key={i}>
                    <TrechoCitado>{t.texto}</TrechoCitado>
                    {t.comentario && (
                      <p style={{ margin: "0.125rem 0 0 0.75rem", fontSize: "0.85rem" }}>
                        <strong>Comentário:</strong> {t.comentario}
                      </p>
                    )}
                  </div>
                ))}
                {s.status === "pendente" && (
                  <PageButtonSm
                    type="button"
                    $variant="outline"
                    disabled={analisando === s.id}
                    onClick={() => handleAnalisar(s.id)}
                    style={{ alignSelf: "flex-start" }}
                  >
                    {analisando === s.id ? "Marcando..." : "Marcar como analisada"}
                  </PageButtonSm>
                )}
              </SolicitacaoCard>
            ))}
          </PageCardContent>
        </PageCard>
      )}

      <AcaoPrincipalBarra>
        <div>
          {atual.status === "aguardando_aprovacao_cliente" && (
            <EmptyText style={{ margin: 0 }}>Aguardando o cliente responder pelo link enviado.</EmptyText>
          )}
          {rascunhoDesatualizado && atual.status !== "aguardando_aprovacao_cliente" && (
            <EmptyText style={{ margin: 0 }}>
              {atual.revisao_pendente
                ? "A administração jurídica pediu revisão: ajuste os dados e gere o rascunho de novo."
                : "Os dados mudaram depois do último rascunho: gere o rascunho de novo antes de seguir."}
            </EmptyText>
          )}
          {atual.status === "assinado_e_arquivado" && <EmptyText style={{ margin: 0 }}>Documento arquivado.</EmptyText>}
        </div>
        <AcoesLinha>
          {podeConfirmar && (
            <PageButton type="button" disabled={confirmando} onClick={handleConfirmar}>
              {confirmando ? "Confirmando..." : "Confirmar preenchimento"}
            </PageButton>
          )}
          {podeGerar && (
            <PageButton type="button" disabled={gerando} onClick={handleGerar}>
              {gerando ? "Gerando..." : atual.ultima_versao ? "Gerar rascunho de novo" : "Gerar rascunho"}
            </PageButton>
          )}
          {podeAprovarInternamente &&
            (usuarioPodeAprovarInternamente ? (
              <>
                <PageButton type="button" disabled={aprovandoInternamente} onClick={handleAprovarInternamente}>
                  {aprovandoInternamente ? "Aprovando..." : "Aprovar internamente"}
                </PageButton>
                <PageButton
                  type="button"
                  $variant="outline"
                  disabled={aprovandoInternamente}
                  onClick={() => setMostrarPedirRevisao(true)}
                >
                  Pedir revisão
                </PageButton>
              </>
            ) : (
              <PageButton type="button" $variant="outline" disabled title="Só quem pode aprovar internamente vê este botão liberado.">
                Aguardando aprovação interna
              </PageButton>
            ))}
          {podeExportar && (
            <PageButton type="button" disabled={exportando} onClick={handleExportar}>
              {exportando ? "Preparando..." : "Preparar envio ao cliente"}
            </PageButton>
          )}
          {podeMarcarAssinado && (
            <PageButton
              type="button"
              disabled={marcandoAssinado}
              onClick={() => {
                setAbrirDeclaracao(true);
                setMostrarConfirmarAssinado(true);
              }}
            >
              {marcandoAssinado ? "Marcando..." : "Marcar como assinado"}
            </PageButton>
          )}
          {podeRecusarAssinatura && (
            <PageButton type="button" $variant="outline" disabled={recusandoAssinatura} onClick={handleRecusarAssinatura}>
              {recusandoAssinatura ? "Registrando..." : "Cliente recusou assinar"}
            </PageButton>
          )}
          {podeConsiderarAceito && (
            <PageButton type="button" disabled={considerandoAceito} onClick={handleConsiderarAceito}>
              {considerandoAceito ? "Marcando..." : "Considerar assinado (prazo vencido)"}
            </PageButton>
          )}
        </AcoesLinha>
      </AcaoPrincipalBarra>

      <AcoesSecundariasLinha>
        <PageButtonSm type="button" $variant="outline" onClick={voltar}>
          Voltar
        </PageButtonSm>
        {!dadosTravados && (
          <PageButtonSm type="button" $variant="outline" disabled={salvando} onClick={handleSalvar}>
            {salvando ? "Salvando..." : "Salvar dados"}
          </PageButtonSm>
        )}
        {podeApagar && (
          <PageButtonSm type="button" $variant="outline" onClick={() => setMostrarConfirmarApagar(true)}>
            Apagar documento
          </PageButtonSm>
        )}
        {podeApagarPermanente && (
          <PageButtonSm
            type="button"
            $variant="outline"
            onClick={() => setMostrarConfirmarApagarPermanente(true)}
          >
            Apagar definitivamente
          </PageButtonSm>
        )}
      </AcoesSecundariasLinha>

      {mostrarEditorTexto && (
        <EditarTextoModal documentoId={atual.id} token={token!} onClose={() => setMostrarEditorTexto(false)} />
      )}

      {mostrarConfirmarAssinado && (
        <ConfirmarModal
          titulo="Marcar como assinado"
          mensagem={
            <div style={{ display: "grid", gap: "0.75rem" }}>
              <span>
                O {ROTULO_TIPO_DOCUMENTO[atual.tipo]} de <strong>{atual.projeto_nome}</strong> vai para Assinado e
                Arquivado.
                {atual.tipo === "contrato" &&
                  " O projeto vira Vendido e a empresa inteira é avisada."}
              </span>
              {atual.tipo === "contrato" && (
                <label style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={abrirDeclaracao}
                    onChange={(e) => setAbrirDeclaracao(e.target.checked)}
                    style={{ marginTop: "0.2rem" }}
                  />
                  <span>
                    Abrir a declaração de interesse agora. Quem é das frentes do projeto recebe, no mesmo aviso,
                    que pode se candidatar. Sem marcar, dá para abrir depois em Configurações do projeto.
                  </span>
                </label>
              )}
            </div>
          }
          rotuloConfirmar="Marcar como assinado"
          rotuloProcessando="Marcando…"
          onConfirmar={handleMarcarAssinado}
          onCancelar={() => setMostrarConfirmarAssinado(false)}
        />
      )}

      {mostrarPedirRevisao && (
        <ModalOverlay onClick={() => !pedindoRevisao && setMostrarPedirRevisao(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>Pedir revisão do rascunho</ModalTitle>
              <ModalClose type="button" onClick={() => setMostrarPedirRevisao(false)} aria-label="Fechar">
                ×
              </ModalClose>
            </ModalHeader>
            <ModalBody>
              <EmptyText style={{ marginTop: 0 }}>
                O documento continua em revisão interna. Quem elabora o contrato recebe o seu comentário e gera o
                rascunho de novo.
              </EmptyText>
              <FieldLabel htmlFor="comentario-revisao">O que precisa mudar?</FieldLabel>
              <FieldTextarea
                id="comentario-revisao"
                rows={5}
                value={comentarioRevisao}
                onChange={(e) => setComentarioRevisao(e.target.value)}
                autoFocus
              />
            </ModalBody>
            <ModalFooter>
              <PageButton type="button" $variant="outline" disabled={pedindoRevisao} onClick={() => setMostrarPedirRevisao(false)}>
                Cancelar
              </PageButton>
              <PageButton type="button" disabled={pedindoRevisao || !comentarioRevisao.trim()} onClick={handlePedirRevisao}>
                {pedindoRevisao ? "Enviando..." : "Pedir revisão"}
              </PageButton>
            </ModalFooter>
          </ModalContent>
        </ModalOverlay>
      )}

      {mostrarConfirmarApagar && (
        <ConfirmarModal
          titulo="Apagar documento"
          mensagem={`Isso apaga o ${ROTULO_TIPO_DOCUMENTO[atual.tipo]} deste projeto — só é possível porque ele ainda não foi confirmado. Não tem como desfazer.`}
          rotuloConfirmar="Apagar"
          rotuloProcessando="Apagando…"
          onConfirmar={handleDeletar}
          onCancelar={() => setMostrarConfirmarApagar(false)}
        />
      )}

      {mostrarConfirmarApagarPermanente && (
        <ConfirmarModal
          titulo="Apagar definitivamente"
          mensagem={`Isso apaga de vez o ${ROTULO_TIPO_DOCUMENTO[atual.tipo]} deste projeto — inclusive se já estiver assinado e arquivado, junto com todo o histórico dele (versões, solicitações de alteração, links de aprovação). Não tem como desfazer. O projeto ${atual.projeto_nome} não é afetado — só este documento sai.`}
          rotuloConfirmar="Apagar definitivamente"
          rotuloProcessando="Apagando…"
          confirmacaoTexto="APAGAR"
          onConfirmar={handleDeletarPermanente}
          onCancelar={() => setMostrarConfirmarApagarPermanente(false)}
        />
      )}
    </PageStack>
  );
}

function CopiarLinkLinha({ rotulo, valor }: { rotulo: string; valor: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    await navigator.clipboard.writeText(valor);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <LinkLinha>
      <code>{valor}</code>
      <PageButtonSm type="button" $variant="outline" onClick={copiar} aria-label={`Copiar ${rotulo}`}>
        {copiado ? "Copiado!" : "Copiar"}
      </PageButtonSm>
    </LinkLinha>
  );
}

function EditarTextoModal({ documentoId, token, onClose }: { documentoId: number; token: string; onClose: () => void }) {
  const [paragrafos, setParagrafos] = useState<ParagrafoEditavel[] | null>(null);
  const [edicoes, setEdicoes] = useState<Record<number, string>>({});
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    getParagrafosEditaveis(documentoId, token)
      .then(({ paragrafos: p }) => setParagrafos(p))
      .catch((err) => setErro(err instanceof Error ? err.message : "Erro ao carregar o texto"))
      .finally(() => setCarregando(false));
  }, [documentoId, token]);

  async function handleSalvar() {
    if (Object.keys(edicoes).length === 0) {
      onClose();
      return;
    }
    setSalvando(true);
    setErro("");
    try {
      await editarTexto(documentoId, edicoes, token);
      onClose();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao salvar o texto");
      setSalvando(false);
    }
  }

  return (
    <ModalOverlay onClick={onClose} role="presentation">
      <ModalContent $expandido onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="editar-texto-titulo">
        <ModalHeader>
          <ModalTitle id="editar-texto-titulo">Editar texto do rascunho</ModalTitle>
          <ModalClose type="button" aria-label="Fechar" onClick={onClose}>
            ×
          </ModalClose>
        </ModalHeader>
        <ModalBody>
          {erro && <ErrorText>{erro}</ErrorText>}
          {carregando ? (
            <PageLoadingBlock />
          ) : (
            paragrafos?.map((p) => (
              <ParagrafoEditavelBloco key={p.ref}>
                <FieldTextarea
                  rows={3}
                  value={edicoes[p.ref] ?? p.texto}
                  onChange={(e) => setEdicoes((atuais) => ({ ...atuais, [p.ref]: e.target.value }))}
                />
              </ParagrafoEditavelBloco>
            ))
          )}
        </ModalBody>
        <ModalFooter>
          <AcoesLinha>
            <PageButton type="button" $variant="outline" onClick={onClose} disabled={salvando}>
              Cancelar
            </PageButton>
            <PageButton type="button" disabled={salvando || carregando} onClick={handleSalvar}>
              {salvando ? "Salvando..." : "Salvar texto"}
            </PageButton>
          </AcoesLinha>
        </ModalFooter>
      </ModalContent>
    </ModalOverlay>
  );
}
