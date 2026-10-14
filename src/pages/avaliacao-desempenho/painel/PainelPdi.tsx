import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, Download, Maximize2, Minimize2, Plus, X } from "lucide-react";
import { PreviewArquivoModal } from "@/components/PreviewArquivoModal";
import { useAuth } from "@/context/AuthContext";
import { createMentoria, deleteMentoria, getMentorias } from "@/lib/desempenho-mentorias";
import { getUsuarios } from "@/lib/usuarios";
import { MENTORES_ELEGIVEIS } from "@/utils/permissoes";
import {
  createItemPdi,
  createPastaPdi,
  deleteItemPdi,
  deletePastaPdi,
  getItensPdi,
  getPastasPdi,
  getPendenciasPastaPdi,
  getPendenciasPdi,
  getResultadosPastaPdi,
  baixarEnvioPdi,
  getEnvioPdiBlob,
  updateItemPdi,
  updatePastaPdi,
} from "@/lib/desempenho-pdi";
import { formatarData } from "@/lib/projetos";
import { FotoCircular } from "@/components/Avatar";
import type {
  DesempenhoMentoria,
  DesempenhoPdiPendenciasPasta,
} from "@/types/desempenho";
import type { UsuarioResumo } from "@/types/auth";
import type {
  DesempenhoPdiItem,
  DesempenhoPdiItemTipoArquivo,
  DesempenhoPdiPasta,
  DesempenhoPdiPastaTipo,
  DesempenhoPdiPendencia,
  DesempenhoPdiResultadoEnvio,
  DesempenhoPdiResultadosPasta,
} from "@/types/desempenho";
import {
  EmptyText,
  ErrorBlock,
  ErrorText,
  PageBadge,
  PageButton,
  PageButtonSm,
  PageCard,
  PageCardContent,
  PageCardHeader,
  PageCardTitle,
  PageLoadingBlock,
} from "@/styles/page.styled";
import { FieldGroup, FieldInput, FieldLabel, FieldSelect, FormStack } from "@/pages/Bancas.styled";
import {
  ModalBody,
  ModalClose,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  ModalOverlay,
} from "@/styles/modal.styled";
import { ConfirmarModal } from "@/components/ConfirmarModal";
import {
  Iniciais,
  LoteCardMeta,
  MentoradosLista,
  MentoriaCabecalho,
  MentoriaGrupo,
  MentoriaGrupoTitulo,
  MentoriaLinha,
  MentorPapel,
  PastaCard,
  PastaCardTitulo,
  PastaCardTopo,
  PastaNumero,
  PastaNumeroENome,
  PastasGrid,
  PendenciaAtrasoRotulo,
  PendenciaCard,
  PendenciaIcone,
  PendenciaNome,
  PendenciaTexto,
  ResultadoArquivo,
  ResultadoPessoa,
  ResultadoPessoaTitulo,
  SubItem,
  SubLista,
} from "./Painel.styled";

/** "Ana Souza" -> "AS". Duas letras bastam e cabem no círculo. */
function iniciais(nome: string | null | undefined): string {
  const partes = (nome ?? "").trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  const primeira = partes[0][0];
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return (primeira + ultima).toUpperCase();
}

const ROTULO_TIPO: Record<DesempenhoPdiPastaTipo, string> = {
  inicial: "PDI inicial (só a diretoria envia)",
  encontro: "Encontro (o mentor envia, pelo mentorado)",
};

const ROTULO_TIPO_CURTO: Record<DesempenhoPdiPastaTipo, string> = {
  inicial: "Inicial",
  encontro: "Encontro",
};

const ROTULO_TIPO_ARQUIVO: Record<DesempenhoPdiItemTipoArquivo, string> = {
  documento: "Documento (PDF/Word)",
  foto: "Foto (JPG/PNG)",
  planilha: "Planilha (Excel)",
  qualquer: "Qualquer arquivo",
};

/**
 * Aba PDI do painel: quem mentora quem, e as pastas/prazos de PDI. Os dois
 * ficam juntos aqui porque, na prática, é a diretoria olhando pra mentoria
 * como um todo — mesmo a alocação (quem mentora quem) sendo independente do
 * conteúdo das pastas (que é um template global, não pertence a nenhum
 * vínculo específico; ver `pode_enviar_pdi` no backend, a única ponte real
 * entre os dois é essa permissão, não um dado compartilhado).
 */
export function PainelPdi() {
  const { token } = useAuth();
  const [mentorias, setMentorias] = useState<DesempenhoMentoria[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioResumo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const [mentorId, setMentorId] = useState("");
  const [mentoradoId, setMentoradoId] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState("");
  const [paraRemover, setParaRemover] = useState<DesempenhoMentoria | null>(null);

  // Recolhida por padrão: uma lista de mentores/mentorados não é o tipo de
  // coisa que se quer ver toda vez que se entra na aba, e nomes juntam
  // rápido (um mentor por posição elegível, todo consultor alocado).
  const [mentoriasExpandidas, setMentoriasExpandidas] = useState(false);

  async function buscar() {
    if (!token) return;
    setCarregando(true);
    setErro("");
    try {
      const [m, u] = await Promise.all([getMentorias(token), getUsuarios(token)]);
      setMentorias(m);
      setUsuarios(u);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao carregar mentorias");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    buscar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Mentor pode ser coordenador, gerente ou diretor (2026-08-06), não só coordenador.
  const mentoresElegiveis = useMemo(
    () =>
      usuarios
        .filter((u) => MENTORES_ELEGIVEIS.includes(u.posicao))
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
    [usuarios],
  );
  const mentoradosJaAlocados = useMemo(() => new Set(mentorias.map((m) => m.mentorado_id)), [mentorias]);
  const candidatosMentorado = useMemo(
    () =>
      usuarios
        .filter((u) => u.posicao === "consultor" && !mentoradosJaAlocados.has(u.id))
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
    [usuarios, mentoradosJaAlocados],
  );

  const porMentor = useMemo(() => {
    const grupos = new Map<number, DesempenhoMentoria[]>();
    for (const m of mentorias) {
      const lista = grupos.get(m.mentor_id) ?? [];
      lista.push(m);
      grupos.set(m.mentor_id, lista);
    }
    return Array.from(grupos.values());
  }, [mentorias]);

  async function handleCriar(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !mentorId || !mentoradoId) {
      setErroForm("Escolha o mentor e o mentorado.");
      return;
    }
    setSalvando(true);
    setErroForm("");
    try {
      const nova = await createMentoria({ mentor_id: Number(mentorId), mentorado_id: Number(mentoradoId) }, token);
      setMentorias((atual) => [...atual, nova]);
      setMentorId("");
      setMentoradoId("");
    } catch (err) {
      setErroForm(err instanceof Error ? err.message : "Erro ao criar vínculo de mentoria");
    } finally {
      setSalvando(false);
    }
  }

  async function confirmarRemocao() {
    if (!token || !paraRemover) return;
    await deleteMentoria(paraRemover.id, token);
    setMentorias((atual) => atual.filter((m) => m.id !== paraRemover.id));
    setParaRemover(null);
  }

  if (erro) {
    return (
      <ErrorBlock>
        <ErrorText>{erro}</ErrorText>
        <PageButton $variant="outline" onClick={buscar}>
          Tentar novamente
        </PageButton>
      </ErrorBlock>
    );
  }

  if (carregando) return <PageLoadingBlock />;

  return (
    <>
      <PageCard>
        <PageCardHeader>
          <PageCardTitle>Alocar mentoria</PageCardTitle>
        </PageCardHeader>
        <PageCardContent>
          <FormStack onSubmit={handleCriar}>
            <FieldGroup>
              <FieldLabel htmlFor="mentor">Mentor</FieldLabel>
              <FieldSelect id="mentor" value={mentorId} onChange={(e) => setMentorId(e.target.value)} required pesquisavel>
                <option value="">Selecione...</option>
                {mentoresElegiveis.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </FieldSelect>
            </FieldGroup>
            <FieldGroup>
              <FieldLabel htmlFor="mentorado">Mentorado (consultor)</FieldLabel>
              <FieldSelect id="mentorado" value={mentoradoId} onChange={(e) => setMentoradoId(e.target.value)} required pesquisavel>
                <option value="">Selecione...</option>
                {candidatosMentorado.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </FieldSelect>
            </FieldGroup>
            {erroForm && <ErrorText>{erroForm}</ErrorText>}
            <PageButton type="submit" disabled={salvando}>
              {salvando ? "Salvando..." : "Criar vínculo"}
            </PageButton>
          </FormStack>
        </PageCardContent>
      </PageCard>

      <PastasPdiCard />

      <PageCard>
        <PageCardHeader>
          <PageCardTitle>
            Mentorias ativas{mentorias.length > 0 && ` (${mentorias.length})`}
          </PageCardTitle>
          {mentorias.length > 0 && (
            <PageButtonSm
              type="button"
              $variant="outline"
              onClick={() => setMentoriasExpandidas((v) => !v)}
            >
              {mentoriasExpandidas ? (
                <>
                  <ChevronUp size={14} />
                  Recolher
                </>
              ) : (
                <>
                  <ChevronDown size={14} />
                  Expandir
                </>
              )}
            </PageButtonSm>
          )}
        </PageCardHeader>
        {mentorias.length === 0 ? (
          <PageCardContent>
            <EmptyText>Nenhuma mentoria cadastrada ainda.</EmptyText>
          </PageCardContent>
        ) : (
          mentoriasExpandidas && (
            <PageCardContent>
              {porMentor.map((lista) => (
                <MentoriaGrupo key={lista[0].mentor_id}>
                  <MentoriaCabecalho>
                    <Iniciais $mentor aria-hidden>
                      {lista[0].mentor_foto ? (
                        <FotoCircular src={lista[0].mentor_foto} />
                      ) : (
                        iniciais(lista[0].mentor_nome)
                      )}
                    </Iniciais>
                    <div>
                      <MentoriaGrupoTitulo>{lista[0].mentor_nome}</MentoriaGrupoTitulo>
                      <MentorPapel>
                        Mentor de {lista.length}{" "}
                        {lista.length === 1 ? "pessoa" : "pessoas"}
                      </MentorPapel>
                    </div>
                  </MentoriaCabecalho>
                  <MentoradosLista>
                    {lista.map((m) => (
                      <MentoriaLinha key={m.id}>
                        <Iniciais aria-hidden>
                          {m.mentorado_foto ? (
                            <FotoCircular src={m.mentorado_foto} />
                          ) : (
                            iniciais(m.mentorado_nome)
                          )}
                        </Iniciais>
                        <span>{m.mentorado_nome}</span>
                        <PageButtonSm $variant="outline" type="button" onClick={() => setParaRemover(m)}>
                          Remover
                        </PageButtonSm>
                      </MentoriaLinha>
                    ))}
                  </MentoradosLista>
                </MentoriaGrupo>
              ))}
            </PageCardContent>
          )
        )}
      </PageCard>

      {paraRemover && (
        <ConfirmarModal
          titulo="Remover mentoria"
          mensagem={`Remover o vínculo de mentoria com ${paraRemover.mentorado_nome}? Esta ação não pode ser desfeita.`}
          rotuloConfirmar="Remover"
          onCancelar={() => setParaRemover(null)}
          onConfirmar={confirmarRemocao}
        />
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */

/**
 * As pastas de PDI — prazos e documentos exigidos (ex.: "Encontro 3", até
 * tal data). Componente separado, com o próprio fetch: um template global,
 * não pertence a nenhum vínculo de mentoria específico. Card no espírito de
 * um board de etapas de processo seletivo — abrir UMA pasta pra editar
 * expande só o cartão dela; as outras continuam fechadas do lado. Criar
 * pasta nova é modal, pra grade não competir de saída com um formulário
 * sempre aberto.
 */
function PastasPdiCard() {
  const { token } = useAuth();
  const [pastas, setPastas] = useState<DesempenhoPdiPasta[]>([]);
  const [itensPorPasta, setItensPorPasta] = useState<Record<number, DesempenhoPdiItem[]>>({});
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [paraExcluir, setParaExcluir] = useState<DesempenhoPdiPasta | null>(null);
  const [erroExcluir, setErroExcluir] = useState("");

  const [modalAberto, setModalAberto] = useState(false);
  const [modalExpandido, setModalExpandido] = useState(false);
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<DesempenhoPdiPastaTipo>("encontro");
  const [prazo, setPrazo] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState("");

  // Checklist sendo montada junto com a pasta nova, os itens só são
  // criados de fato depois que a pasta existe (o backend exige pasta_id),
  // então ficam aqui como rascunho até o submit.
  const [itensNovaPasta, setItensNovaPasta] = useState<{ nome: string; tipo_arquivo: DesempenhoPdiItemTipoArquivo }[]>(
    [],
  );
  const [builderItemNome, setBuilderItemNome] = useState("");
  const [builderItemTipo, setBuilderItemTipo] = useState<DesempenhoPdiItemTipoArquivo>("qualquer");

  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [editNome, setEditNome] = useState("");
  const [editPrazo, setEditPrazo] = useState("");
  const [editSalvando, setEditSalvando] = useState(false);
  const [editErro, setEditErro] = useState("");

  const [adicionandoItemPastaId, setAdicionandoItemPastaId] = useState<number | null>(null);
  const [novoItemNome, setNovoItemNome] = useState("");
  const [novoItemTipo, setNovoItemTipo] = useState<DesempenhoPdiItemTipoArquivo>("qualquer");
  const [itemSalvando, setItemSalvando] = useState(false);
  const [itemErroForm, setItemErroForm] = useState("");

  const [editandoItemId, setEditandoItemId] = useState<number | null>(null);
  const [editItemNome, setEditItemNome] = useState("");
  const [editItemTipo, setEditItemTipo] = useState<DesempenhoPdiItemTipoArquivo>("qualquer");
  const [editItemSalvando, setEditItemSalvando] = useState(false);
  const [editItemErro, setEditItemErro] = useState("");

  const [paraExcluirItem, setParaExcluirItem] = useState<DesempenhoPdiItem | null>(null);
  const [erroExcluirItem, setErroExcluirItem] = useState("");

  const [pendenciasItemId, setPendenciasItemId] = useState<number | null>(null);
  const [pendencias, setPendencias] = useState<DesempenhoPdiPendencia[]>([]);

  // "Resultados" de uma pasta (2026-10-06, a pedido): todo mundo que mandou
  // algo nela, com os arquivos por item, num modal.
  const [resultadosPasta, setResultadosPasta] = useState<DesempenhoPdiPasta | null>(null);
  const [resultados, setResultados] = useState<DesempenhoPdiResultadosPasta | null>(null);
  const [resultadosErro, setResultadosErro] = useState("");

  // "Pendências" da pasta inteira, ao lado de "Resultados" (2026-10-13, a
  // pedido): antes só aparecia item a item, dentro do "Editar".
  const [pendenciasPasta, setPendenciasPasta] = useState<DesempenhoPdiPasta | null>(null);
  const [pendenciasPastaDados, setPendenciasPastaDados] = useState<DesempenhoPdiPendenciasPasta | null>(null);
  const [pendenciasPastaErro, setPendenciasPastaErro] = useState("");

  async function abrirPendenciasPasta(pasta: DesempenhoPdiPasta) {
    if (!token) return;
    setPendenciasPasta(pasta);
    setPendenciasPastaDados(null);
    setPendenciasPastaErro("");
    try {
      setPendenciasPastaDados(await getPendenciasPastaPdi(pasta.id, token));
    } catch (err) {
      setPendenciasPastaErro(err instanceof Error ? err.message : "Erro ao carregar as pendências");
    }
  }

  async function abrirResultados(pasta: DesempenhoPdiPasta) {
    if (!token) return;
    setResultadosPasta(pasta);
    setResultados(null);
    setResultadosErro("");
    try {
      setResultados(await getResultadosPastaPdi(pasta.id, token));
    } catch (err) {
      setResultadosErro(err instanceof Error ? err.message : "Erro ao carregar os resultados");
    }
  }

  // Prévia sem baixar (2026-10-13): clicar no nome abre; o ícone baixa.
  const [preview, setPreview] = useState<{ mentoradoId: number; envio: DesempenhoPdiResultadoEnvio } | null>(null);
  const carregarPreview = useCallback(
    () => getEnvioPdiBlob(preview?.mentoradoId ?? 0, preview?.envio.item_id ?? 0, token ?? ""),
    [preview, token],
  );

  async function baixarResultado(mentoradoId: number, envio: DesempenhoPdiResultadoEnvio) {
    if (!token) return;
    try {
      await baixarEnvioPdi(mentoradoId, envio.item_id, envio.arquivo_nome, token);
    } catch (err) {
      setResultadosErro(err instanceof Error ? err.message : "Erro ao baixar o arquivo");
    }
  }

  async function buscar() {
    if (!token) return;
    setCarregando(true);
    setErro("");
    try {
      const listaPastas = await getPastasPdi(token);
      setPastas(listaPastas);
      const listasItens = await Promise.all(listaPastas.map((p) => getItensPdi(p.id, token)));
      const mapa: Record<number, DesempenhoPdiItem[]> = {};
      listaPastas.forEach((p, i) => {
        mapa[p.id] = listasItens[i];
      });
      setItensPorPasta(mapa);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao carregar as pastas de PDI");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    buscar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function abrirModal() {
    setModalAberto(true);
    setModalExpandido(false);
    setNome("");
    setTipo("encontro");
    setPrazo("");
    setItensNovaPasta([]);
    setErroForm("");
  }

  function adicionarItemAoBuilder() {
    if (!builderItemNome.trim()) return;
    setItensNovaPasta((atual) => [...atual, { nome: builderItemNome.trim(), tipo_arquivo: builderItemTipo }]);
    setBuilderItemNome("");
    setBuilderItemTipo("qualquer");
  }

  function removerItemDoBuilder(index: number) {
    setItensNovaPasta((atual) => atual.filter((_, i) => i !== index));
  }

  async function handleCriar(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    if (!nome.trim() || !prazo) {
      setErroForm("Preencha nome e prazo.");
      return;
    }
    setSalvando(true);
    setErroForm("");
    try {
      const nova = await createPastaPdi({ nome: nome.trim(), tipo, prazo }, token);
      const itensCriados = await Promise.all(
        itensNovaPasta.map((item) => createItemPdi(nova.id, item, token)),
      );
      setPastas((atual) => [...atual, nova]);
      setItensPorPasta((atual) => ({ ...atual, [nova.id]: itensCriados }));
      setModalAberto(false);
    } catch (err) {
      setErroForm(err instanceof Error ? err.message : "Erro ao criar a pasta");
    } finally {
      setSalvando(false);
    }
  }

  function handleIniciarEdicao(pasta: DesempenhoPdiPasta) {
    setEditandoId(pasta.id);
    setEditNome(pasta.nome);
    setEditPrazo(pasta.prazo);
    setEditErro("");
  }

  function fecharEdicao() {
    setEditandoId(null);
    setAdicionandoItemPastaId(null);
    setEditandoItemId(null);
    setPendenciasItemId(null);
  }

  async function handleSalvarEdicao(pastaId: number) {
    if (!token) return;
    if (!editNome.trim() || !editPrazo) {
      setEditErro("Preencha nome e prazo.");
      return;
    }
    setEditSalvando(true);
    setEditErro("");
    try {
      const atualizada = await updatePastaPdi(pastaId, { nome: editNome.trim(), prazo: editPrazo }, token);
      setPastas((atual) => atual.map((p) => (p.id === pastaId ? atualizada : p)));
    } catch (err) {
      setEditErro(err instanceof Error ? err.message : "Erro ao salvar a pasta");
    } finally {
      setEditSalvando(false);
    }
  }

  async function confirmarExclusao() {
    if (!token || !paraExcluir) return;
    setErroExcluir("");
    try {
      await deletePastaPdi(paraExcluir.id, token);
      setPastas((atual) => atual.filter((p) => p.id !== paraExcluir.id));
      setEditandoId((atual) => (atual === paraExcluir.id ? null : atual));
      setParaExcluir(null);
    } catch (err) {
      setErroExcluir(
        err instanceof Error
          ? err.message
          : "Erro ao excluir a pasta, provavelmente ainda tem item cadastrado nela.",
      );
    }
  }

  function abrirAdicionarItem(pastaId: number) {
    setAdicionandoItemPastaId((atual) => (atual === pastaId ? null : pastaId));
    setNovoItemNome("");
    setNovoItemTipo("qualquer");
    setItemErroForm("");
  }

  async function handleCriarItem(e: React.FormEvent, pastaId: number) {
    e.preventDefault();
    if (!token) return;
    if (!novoItemNome.trim()) {
      setItemErroForm("Dê um nome pro item.");
      return;
    }
    setItemSalvando(true);
    setItemErroForm("");
    try {
      const novo = await createItemPdi(pastaId, { nome: novoItemNome.trim(), tipo_arquivo: novoItemTipo }, token);
      setItensPorPasta((atual) => ({ ...atual, [pastaId]: [...(atual[pastaId] ?? []), novo] }));
      setAdicionandoItemPastaId(null);
    } catch (err) {
      setItemErroForm(err instanceof Error ? err.message : "Erro ao criar o item");
    } finally {
      setItemSalvando(false);
    }
  }

  function handleIniciarEdicaoItem(item: DesempenhoPdiItem) {
    setEditandoItemId(item.id);
    setEditItemNome(item.nome);
    setEditItemTipo(item.tipo_arquivo);
    setEditItemErro("");
  }

  async function handleSalvarEdicaoItem(pastaId: number, itemId: number) {
    if (!token) return;
    if (!editItemNome.trim()) {
      setEditItemErro("Dê um nome pro item.");
      return;
    }
    setEditItemSalvando(true);
    setEditItemErro("");
    try {
      const atualizado = await updateItemPdi(itemId, { nome: editItemNome.trim(), tipo_arquivo: editItemTipo }, token);
      setItensPorPasta((atual) => ({
        ...atual,
        [pastaId]: (atual[pastaId] ?? []).map((i) => (i.id === itemId ? atualizado : i)),
      }));
      setEditandoItemId(null);
    } catch (err) {
      setEditItemErro(err instanceof Error ? err.message : "Erro ao salvar o item");
    } finally {
      setEditItemSalvando(false);
    }
  }

  async function confirmarExclusaoItem() {
    if (!token || !paraExcluirItem) return;
    setErroExcluirItem("");
    try {
      await deleteItemPdi(paraExcluirItem.id, token);
      setItensPorPasta((atual) => ({
        ...atual,
        [paraExcluirItem.pasta_id]: (atual[paraExcluirItem.pasta_id] ?? []).filter((i) => i.id !== paraExcluirItem.id),
      }));
      setParaExcluirItem(null);
    } catch (err) {
      setErroExcluirItem(
        err instanceof Error ? err.message : "Erro ao excluir o item, provavelmente já existe envio nele.",
      );
    }
  }

  async function handleVerPendencias(itemId: number) {
    if (!token) return;
    if (pendenciasItemId === itemId) {
      setPendenciasItemId(null);
      return;
    }
    setPendenciasItemId(itemId);
    setPendencias(await getPendenciasPdi(itemId, token));
  }

  if (erro) {
    return (
      <PageCard>
        <PageCardContent>
          <ErrorBlock>
            <ErrorText>{erro}</ErrorText>
            <PageButton $variant="outline" onClick={buscar}>
              Tentar novamente
            </PageButton>
          </ErrorBlock>
        </PageCardContent>
      </PageCard>
    );
  }

  return (
    <PageCard>
      <PageCardHeader>
        <PageCardTitle>Pastas de PDI</PageCardTitle>
        <PageButtonSm type="button" $variant="outline" onClick={abrirModal}>
          <Plus size={14} />
          Adicionar pasta
        </PageButtonSm>
      </PageCardHeader>
      <PageCardContent>
        {carregando ? (
          <PageLoadingBlock />
        ) : pastas.length === 0 ? (
          <EmptyText>Nenhuma pasta cadastrada ainda.</EmptyText>
        ) : (
          <PastasGrid>
            {pastas.map((pasta, index) => {
              const itens = itensPorPasta[pasta.id] ?? [];
              return (
                <PastaCard key={pasta.id}>
                  <PastaCardTopo>
                    <PastaNumeroENome>
                      <PastaNumero aria-hidden>{index + 1}</PastaNumero>
                      <PastaCardTitulo>
                        {pasta.nome}
                        {pasta.semestre && ` (${pasta.semestre})`}
                      </PastaCardTitulo>
                    </PastaNumeroENome>
                    <PageBadge $tone="muted">{ROTULO_TIPO_CURTO[pasta.tipo]}</PageBadge>
                  </PastaCardTopo>
                  <LoteCardMeta>
                    Prazo: {formatarData(pasta.prazo)} · {itens.length} {itens.length === 1 ? "item" : "itens"} exigido(s)
                  </LoteCardMeta>
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    <PageButtonSm type="button" $variant="outline" onClick={() => handleIniciarEdicao(pasta)}>
                      Editar
                    </PageButtonSm>
                    <PageButtonSm type="button" $variant="outline" onClick={() => abrirPendenciasPasta(pasta)}>
                      Pendências
                    </PageButtonSm>
                    <PageButtonSm type="button" onClick={() => abrirResultados(pasta)}>
                      Resultados
                    </PageButtonSm>
                  </div>
                </PastaCard>
              );
            })}
          </PastasGrid>
        )}
      </PageCardContent>

      {pendenciasPasta && (
        <ModalOverlay onClick={() => setPendenciasPasta(null)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>
                Pendências
                <br />
                <small>
                  {pendenciasPasta.nome} · prazo {formatarData(pendenciasPasta.prazo)}
                </small>
              </ModalTitle>
              <ModalClose type="button" aria-label="Fechar" onClick={() => setPendenciasPasta(null)}>
                <X size={18} />
              </ModalClose>
            </ModalHeader>
            <ModalBody>
              {pendenciasPastaErro && <ErrorText>{pendenciasPastaErro}</ErrorText>}
              {!pendenciasPastaDados && !pendenciasPastaErro ? (
                <PageLoadingBlock />
              ) : pendenciasPastaDados && pendenciasPastaDados.pessoas.length === 0 ? (
                <EmptyText>Todo mundo enviou tudo no prazo.</EmptyText>
              ) : (
                pendenciasPastaDados && (
                  <SubLista>
                    <LoteCardMeta>
                      {pendenciasPastaDados.pessoas.length}{" "}
                      {pendenciasPastaDados.pessoas.length === 1 ? "pessoa" : "pessoas"} · {pendenciasPastaDados.total_itens}{" "}
                      {pendenciasPastaDados.total_itens === 1 ? "item exigido" : "itens exigidos"}
                    </LoteCardMeta>
                    {pendenciasPastaDados.pessoas.map((pessoa) => (
                      <ResultadoPessoa key={pessoa.mentorado_id}>
                        <ResultadoPessoaTitulo>
                          <strong>{pessoa.mentorado_nome}</strong>
                          {pessoa.mentor_nome && <> · mentorado(a) de {pessoa.mentor_nome}</>}
                        </ResultadoPessoaTitulo>
                        {pessoa.itens.map((item) => (
                          <ResultadoArquivo key={item.item_id}>
                            <span>{item.item_nome}</span>
                            <PageBadge $tone={item.status === "pendente" ? "danger" : "warning"}>
                              {item.status === "pendente"
                                ? "Não enviou"
                                : `Enviou atrasado${item.enviado_em ? ` em ${formatarData(item.enviado_em)}` : ""}`}
                            </PageBadge>
                          </ResultadoArquivo>
                        ))}
                      </ResultadoPessoa>
                    ))}
                  </SubLista>
                )
              )}
            </ModalBody>
          </ModalContent>
        </ModalOverlay>
      )}

      {resultadosPasta && (
        <ModalOverlay onClick={() => setResultadosPasta(null)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>
                Resultados
                <br />
                <small>
                  {resultadosPasta.nome} · prazo {formatarData(resultadosPasta.prazo)}
                </small>
              </ModalTitle>
              <ModalClose type="button" aria-label="Fechar" onClick={() => setResultadosPasta(null)}>
                <X size={18} />
              </ModalClose>
            </ModalHeader>
            <ModalBody>
              {resultadosErro && <ErrorText>{resultadosErro}</ErrorText>}
              {!resultados && !resultadosErro ? (
                <PageLoadingBlock />
              ) : resultados && resultados.pessoas.length === 0 ? (
                <EmptyText>Ninguém enviou nada nesta pasta ainda.</EmptyText>
              ) : (
                resultados && (
                  <SubLista>
                    <LoteCardMeta>
                      {resultados.pessoas.length} {resultados.pessoas.length === 1 ? "pessoa enviou" : "pessoas enviaram"}{" "}
                      · {resultados.total_itens} {resultados.total_itens === 1 ? "item exigido" : "itens exigidos"}
                    </LoteCardMeta>
                    {resultados.pessoas.map((pessoa) => (
                      <ResultadoPessoa key={pessoa.mentorado_id}>
                        <ResultadoPessoaTitulo>
                          <strong>{pessoa.mentorado_nome}</strong>
                          {pessoa.mentor_nome && <> · mentorado(a) de {pessoa.mentor_nome}</>}
                          {" · "}
                          {pessoa.envios.length} de {resultados.total_itens}{" "}
                          {resultados.total_itens === 1 ? "item" : "itens"}
                        </ResultadoPessoaTitulo>
                        {pessoa.envios.map((envio) => (
                          <ResultadoArquivo key={envio.item_id}>
                            <span>{envio.item_nome}:</span>
                            <PageButtonSm
                              type="button"
                              $variant="outline"
                              onClick={() => setPreview({ mentoradoId: pessoa.mentorado_id, envio })}
                            >
                              {envio.arquivo_nome}
                            </PageButtonSm>
                            <PageButtonSm
                              type="button"
                              $variant="ghost"
                              aria-label={`Baixar ${envio.arquivo_nome}`}
                              onClick={() => baixarResultado(pessoa.mentorado_id, envio)}
                            >
                              <Download size={14} />
                            </PageButtonSm>
                            <span className="meta">
                              enviado por {envio.enviado_por_nome ?? "?"} em {formatarData(envio.enviado_em)}
                            </span>
                            {envio.atrasado && <PendenciaAtrasoRotulo>Entregue com atraso</PendenciaAtrasoRotulo>}
                          </ResultadoArquivo>
                        ))}
                      </ResultadoPessoa>
                    ))}
                  </SubLista>
                )
              )}
            </ModalBody>
          </ModalContent>
        </ModalOverlay>
      )}

      {editandoId !== null && (() => {
        const pasta = pastas.find((p) => p.id === editandoId);
        if (!pasta) return null;
        const itens = itensPorPasta[pasta.id] ?? [];
        return (
          <ModalOverlay onClick={fecharEdicao}>
            <ModalContent onClick={(e) => e.stopPropagation()}>
              <ModalHeader>
                <ModalTitle>
                  Editar pasta de PDI
                  <br />
                  <small>{pasta.nome}</small>
                </ModalTitle>
                <ModalClose type="button" onClick={fecharEdicao} aria-label="Fechar">
                  <X size={16} />
                </ModalClose>
              </ModalHeader>
              <ModalBody>
                  <FormStack
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSalvarEdicao(pasta.id);
                    }}
                  >
                    <FieldGroup>
                      <FieldLabel htmlFor={`edit-pdi-nome-${pasta.id}`}>Nome</FieldLabel>
                      <FieldInput
                        id={`edit-pdi-nome-${pasta.id}`}
                        value={editNome}
                        onChange={(e) => setEditNome(e.target.value)}
                        required
                      />
                    </FieldGroup>
                    <FieldGroup>
                      <FieldLabel htmlFor={`edit-pdi-prazo-${pasta.id}`}>Prazo</FieldLabel>
                      <FieldInput
                        id={`edit-pdi-prazo-${pasta.id}`}
                        type="date"
                        value={editPrazo}
                        onChange={(e) => setEditPrazo(e.target.value)}
                        required
                      />
                    </FieldGroup>
                    {editErro && <ErrorText>{editErro}</ErrorText>}
                    <PageButtonSm type="submit" disabled={editSalvando}>
                      {editSalvando ? "Salvando..." : "Salvar"}
                    </PageButtonSm>
                  </FormStack>

                  <SubLista>
                    {itens.length === 0 && <EmptyText>Nenhum documento exigido nesta pasta ainda.</EmptyText>}

                    {itens.map((item) => (
                      <div key={item.id}>
                        {editandoItemId === item.id ? (
                          <FormStack
                            onSubmit={(e) => {
                              e.preventDefault();
                              handleSalvarEdicaoItem(pasta.id, item.id);
                            }}
                          >
                            <FieldGroup>
                              <FieldLabel htmlFor={`edit-item-nome-${item.id}`}>Nome do item</FieldLabel>
                              <FieldInput
                                id={`edit-item-nome-${item.id}`}
                                value={editItemNome}
                                onChange={(e) => setEditItemNome(e.target.value)}
                                required
                              />
                            </FieldGroup>
                            <FieldGroup>
                              <FieldLabel htmlFor={`edit-item-tipo-${item.id}`}>Formato aceito</FieldLabel>
                              <FieldSelect
                                id={`edit-item-tipo-${item.id}`}
                                value={editItemTipo}
                                onChange={(e) => setEditItemTipo(e.target.value as DesempenhoPdiItemTipoArquivo)}
                              >
                                <option value="qualquer">{ROTULO_TIPO_ARQUIVO.qualquer}</option>
                                <option value="documento">{ROTULO_TIPO_ARQUIVO.documento}</option>
                                <option value="foto">{ROTULO_TIPO_ARQUIVO.foto}</option>
                                <option value="planilha">{ROTULO_TIPO_ARQUIVO.planilha}</option>
                              </FieldSelect>
                            </FieldGroup>
                            {editItemErro && <ErrorText>{editItemErro}</ErrorText>}
                            <div style={{ display: "flex", gap: "0.5rem" }}>
                              <PageButtonSm type="submit" disabled={editItemSalvando}>
                                {editItemSalvando ? "Salvando..." : "Salvar"}
                              </PageButtonSm>
                              <PageButtonSm
                                type="button"
                                $variant="outline"
                                onClick={() => setEditandoItemId(null)}
                              >
                                Cancelar
                              </PageButtonSm>
                            </div>
                          </FormStack>
                        ) : (
                          <SubItem>
                            <div>
                              {item.nome} <PageBadge $tone="muted">{ROTULO_TIPO_ARQUIVO[item.tipo_arquivo]}</PageBadge>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                              <PageButtonSm
                                type="button"
                                $variant="outline"
                                onClick={() => handleIniciarEdicaoItem(item)}
                              >
                                Editar
                              </PageButtonSm>
                              <PageButtonSm type="button" onClick={() => handleVerPendencias(item.id)}>
                                {pendenciasItemId === item.id ? "Ocultar pendências" : "Pendências"}
                              </PageButtonSm>
                              <PageButtonSm
                                type="button"
                                $variant="ghost"
                                onClick={() => setParaExcluirItem(item)}
                              >
                                Excluir
                              </PageButtonSm>
                            </div>
                          </SubItem>
                        )}

                        {pendenciasItemId === item.id && (
                          <SubLista>
                            {pendencias.length === 0 ? (
                              <EmptyText>Ninguém pendente neste item.</EmptyText>
                            ) : (
                              pendencias.map((p) => (
                                <PendenciaCard key={p.mentorado_id} $atrasado={p.status === "atrasado"}>
                                  <PendenciaIcone $atrasado={p.status === "atrasado"}>
                                    <AlertTriangle size={16} />
                                  </PendenciaIcone>
                                  <PendenciaTexto>
                                    <PendenciaNome>{p.mentorado_nome}</PendenciaNome> · mentor: {p.mentor_nome}
                                    {p.status === "atrasado" && (
                                      <PendenciaAtrasoRotulo>
                                        Entregue com atraso
                                        {p.enviado_em && ` em ${formatarData(p.enviado_em)}`}
                                      </PendenciaAtrasoRotulo>
                                    )}
                                  </PendenciaTexto>
                                </PendenciaCard>
                              ))
                            )}
                          </SubLista>
                        )}
                      </div>
                    ))}
                  </SubLista>

                  {adicionandoItemPastaId === pasta.id ? (
                    <FormStack onSubmit={(e) => handleCriarItem(e, pasta.id)} style={{ padding: "0 1rem 1rem" }}>
                      <FieldGroup>
                        <FieldLabel htmlFor={`novo-item-nome-${pasta.id}`}>Nome do item</FieldLabel>
                        <FieldInput
                          id={`novo-item-nome-${pasta.id}`}
                          placeholder="Ex.: Foto do encontro"
                          value={novoItemNome}
                          onChange={(e) => setNovoItemNome(e.target.value)}
                          required
                        />
                      </FieldGroup>
                      <FieldGroup>
                        <FieldLabel htmlFor={`novo-item-tipo-${pasta.id}`}>Formato aceito</FieldLabel>
                        <FieldSelect
                          id={`novo-item-tipo-${pasta.id}`}
                          value={novoItemTipo}
                          onChange={(e) => setNovoItemTipo(e.target.value as DesempenhoPdiItemTipoArquivo)}
                        >
                          <option value="qualquer">{ROTULO_TIPO_ARQUIVO.qualquer}</option>
                          <option value="documento">{ROTULO_TIPO_ARQUIVO.documento}</option>
                          <option value="foto">{ROTULO_TIPO_ARQUIVO.foto}</option>
                          <option value="planilha">{ROTULO_TIPO_ARQUIVO.planilha}</option>
                        </FieldSelect>
                      </FieldGroup>
                      {itemErroForm && <ErrorText>{itemErroForm}</ErrorText>}
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <PageButtonSm type="submit" disabled={itemSalvando}>
                          {itemSalvando ? "Adicionando..." : "Adicionar item"}
                        </PageButtonSm>
                        <PageButtonSm type="button" $variant="outline" onClick={() => setAdicionandoItemPastaId(null)}>
                          Cancelar
                        </PageButtonSm>
                      </div>
                    </FormStack>
                  ) : (
                    <div style={{ padding: "0 1rem 1rem" }}>
                      <PageButtonSm type="button" $variant="outline" onClick={() => abrirAdicionarItem(pasta.id)}>
                        <Plus size={14} />
                        Adicionar item
                      </PageButtonSm>
                    </div>
                  )}
              </ModalBody>
              <ModalFooter>
                <PageButton type="button" $variant="ghost" onClick={() => setParaExcluir(pasta)}>
                  Excluir pasta
                </PageButton>
                <PageButton type="button" $variant="outline" onClick={fecharEdicao}>
                  Fechar
                </PageButton>
              </ModalFooter>
            </ModalContent>
          </ModalOverlay>
        );
      })()}

      {modalAberto && (
        <ModalOverlay onClick={() => setModalAberto(false)}>
          <ModalContent $expandido={modalExpandido} onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>Nova pasta de PDI</ModalTitle>
              <div style={{ display: "flex", gap: "0.25rem" }}>
                <ModalClose
                  type="button"
                  onClick={() => setModalExpandido((v) => !v)}
                  aria-label={modalExpandido ? "Recolher" : "Expandir"}
                  title={modalExpandido ? "Recolher" : "Expandir"}
                >
                  {modalExpandido ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </ModalClose>
                <ModalClose type="button" onClick={() => setModalAberto(false)} aria-label="Fechar">
                  <X size={16} />
                </ModalClose>
              </div>
            </ModalHeader>
            <ModalBody>
              <FormStack onSubmit={handleCriar}>
                <FieldGroup>
                  <FieldLabel htmlFor="pdi-nome">Nome</FieldLabel>
                  <FieldInput
                    id="pdi-nome"
                    placeholder="Ex.: Encontro 3"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    required
                  />
                </FieldGroup>
                <FieldGroup>
                  <FieldLabel htmlFor="pdi-tipo">Tipo</FieldLabel>
                  <FieldSelect
                    id="pdi-tipo"
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value as DesempenhoPdiPastaTipo)}
                  >
                    <option value="encontro">{ROTULO_TIPO.encontro}</option>
                    <option value="inicial">{ROTULO_TIPO.inicial}</option>
                  </FieldSelect>
                </FieldGroup>
                <FieldGroup>
                  <FieldLabel htmlFor="pdi-prazo">Prazo</FieldLabel>
                  <FieldInput id="pdi-prazo" type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} required />
                </FieldGroup>

                <FieldGroup>
                  <FieldLabel>Documentos exigidos nesta pasta</FieldLabel>
                  {itensNovaPasta.length > 0 && (
                    <SubLista style={{ padding: 0 }}>
                      {itensNovaPasta.map((item, index) => (
                        <SubItem key={index}>
                          <div>
                            {item.nome} <PageBadge $tone="muted">{ROTULO_TIPO_ARQUIVO[item.tipo_arquivo]}</PageBadge>
                          </div>
                          <PageButtonSm type="button" $variant="ghost" onClick={() => removerItemDoBuilder(index)}>
                            Remover
                          </PageButtonSm>
                        </SubItem>
                      ))}
                    </SubLista>
                  )}
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "flex-end" }}>
                    <FieldInput
                      placeholder="Ex.: Foto do encontro"
                      value={builderItemNome}
                      onChange={(e) => setBuilderItemNome(e.target.value)}
                      style={{ flex: "1 1 12rem" }}
                    />
                    <FieldSelect
                      value={builderItemTipo}
                      onChange={(e) => setBuilderItemTipo(e.target.value as DesempenhoPdiItemTipoArquivo)}
                      style={{ flex: "0 1 12rem" }}
                    >
                      <option value="qualquer">{ROTULO_TIPO_ARQUIVO.qualquer}</option>
                      <option value="documento">{ROTULO_TIPO_ARQUIVO.documento}</option>
                      <option value="foto">{ROTULO_TIPO_ARQUIVO.foto}</option>
                      <option value="planilha">{ROTULO_TIPO_ARQUIVO.planilha}</option>
                    </FieldSelect>
                    <PageButtonSm type="button" $variant="outline" onClick={adicionarItemAoBuilder}>
                      <Plus size={14} />
                      Adicionar
                    </PageButtonSm>
                  </div>
                </FieldGroup>

                {erroForm && <ErrorText>{erroForm}</ErrorText>}
                <ModalFooter style={{ padding: 0 }}>
                  <PageButton type="button" $variant="ghost" onClick={() => setModalAberto(false)}>
                    Cancelar
                  </PageButton>
                  <PageButton type="submit" disabled={salvando}>
                    {salvando ? "Criando..." : "Criar pasta"}
                  </PageButton>
                </ModalFooter>
              </FormStack>
            </ModalBody>
          </ModalContent>
        </ModalOverlay>
      )}

      {preview && (
        <PreviewArquivoModal
          nomeArquivo={preview.envio.arquivo_nome}
          carregar={carregarPreview}
          onBaixar={() => baixarResultado(preview.mentoradoId, preview.envio)}
          onFechar={() => setPreview(null)}
        />
      )}

      {paraExcluir && (
        <ConfirmarModal
          titulo="Excluir pasta"
          mensagem={`Excluir a pasta "${paraExcluir.nome}"? Só é possível se ela não tiver mais nenhum item cadastrado.${erroExcluir ? ` ${erroExcluir}` : ""}`}
          onCancelar={() => {
            setParaExcluir(null);
            setErroExcluir("");
          }}
          onConfirmar={confirmarExclusao}
        />
      )}

      {paraExcluirItem && (
        <ConfirmarModal
          titulo="Excluir item"
          mensagem={`Excluir o item "${paraExcluirItem.nome}"? Só é possível se ainda não houver nenhum envio nele.${erroExcluirItem ? ` ${erroExcluirItem}` : ""}`}
          onCancelar={() => {
            setParaExcluirItem(null);
            setErroExcluirItem("");
          }}
          onConfirmar={confirmarExclusaoItem}
        />
      )}
    </PageCard>
  );
}
