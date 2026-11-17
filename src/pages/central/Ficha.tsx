import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { ArrowLeft, Check, Paperclip, Plus, Trash2, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  ROTULO_BLOCO,
  ROTULO_VIA,
  abrirAnexo,
  anexarArquivo,
  apagarAnexo,
  chipsDeStatus,
  codigoEGestao,
  decidirPertinencia,
  definirPerguntasRevisor,
  editarFicha,
  enviarParaRevisao,
  getFicha,
  getOpcoesCentral,
  marcarUso,
  pedirAjustes,
  publicarFicha,
  urlDoAnexo,
  type AnexoFicha,
  type Bloco,
  type EditarFichaPayload,
  type FichaCompleta,
  type ItemGaleria,
  type OpcoesCentral,
} from "@/lib/central";
import { camposFaltandoDoErro } from "@/lib/api";
import { formatarDataHora } from "@/lib/projetos";
import { MultiSelect } from "@/components/MultiSelect";
import { ConfirmarModal } from "@/components/ConfirmarModal";
import { ROTULO_POSICAO } from "@/utils/permissoes";
import { ErrorText, PageButton, PageButtonSm, PageLoadingBlock, PageStack } from "@/styles/page.styled";
import { FieldGroup, FieldInput, FieldLabel, FieldSelect, FieldTextarea } from "@/pages/Bancas.styled";
import {
  Acoes,
  AnexoCard,
  AnexosGrid,
  AvisoCaixa,
  BarraAcoes,
  BlocoCard,
  Blocos,
  CabecalhoFicha,
  CabecalhoFichaLinha,
  Chip,
  Documento,
  DocumentoGrid,
  DuasListas,
  GaleriaItemEdicao,
  GaleriaSlides,
  Historico,
  Indice,
  IndiceCreditos,
  Lightbox,
  Meta,
  Numeros,
  PassoLinha,
  PassosDoc,
  PerguntasRevisor,
  Resposta,
  RespostasGrid,
  SecaoAjuda,
  SecaoDoc,
  SecaoDocCorpo,
  SecaoDocTitulo,
  Tags,
  Texto,
  TituloFicha,
} from "./Central.styled";
import { IconeCategoria, LinhaDoTempo } from "./FichaCard";
import { BotoesItem, ListaTextos } from "./editores";

interface Form {
  titulo: string;
  tipos: string[];
  autores: string[];
  responsavel: string;
  setor: string;
  ferramenta: string;
  por_que_se_destacou: string;
  em_uma_frase: string;
  problema: string;
  passos: string[];
  /** Uma situação por linha. */
  funciona_bem: string;
  nao_ajuda: string;
  onde_aparece: string;
  galeria: ItemGaleriaForm[];
  blocos: Bloco[];
  respostas_revisor: string[];
  visao_autores: string[];
  pontos_atencao: string;
  revisar_em: string;
  apontada_diagnostico: boolean;
}

interface ItemGaleriaForm {
  anexo_id: number;
  titulo: string;
  descricao: string;
  pagina: string;
}

/** O bloco como vai para a API: a imagem só leva o id do anexo. */
function semAnexo(b: Bloco): Bloco {
  if (b.tipo === "imagem") return { tipo: "imagem", titulo: b.titulo, legenda: b.legenda, anexo_id: b.anexo_id };
  return { ...b };
}

function blocoNovo(tipo: Bloco["tipo"], primeiraImagem: number | null): Bloco | null {
  switch (tipo) {
    case "codigo":
      return { tipo, titulo: "", arquivo: "", texto: "", legenda: "" };
    case "numeros":
      return { tipo, titulo: "", itens: [["", ""]] };
    case "lista":
      return { tipo, titulo: "", itens: [""] };
    case "aviso":
      return { tipo, titulo: "Antes de tudo", texto: "" };
    case "texto":
      return { tipo, titulo: "", texto: "" };
    case "imagem":
      return primeiraImagem ? { tipo, titulo: "", legenda: "", anexo_id: primeiraImagem } : null;
  }
}

function linhas(texto: string): string[] {
  return texto
    .split("\n")
    .map((l) => l.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean);
}

const ROTULO_CAMPO: Record<string, string> = {
  em_uma_frase: "1. Em uma frase",
  problema: "2. Problema que resolveu",
  passos: "3. Como funciona",
  funciona_bem: "4. Quando usar (funciona bem)",
  perguntas_revisor: "7. Pontos para os autores responderem",
  visao_autores: "8. Como foi feito, na visão de quem fez",
};

const SECOES = [
  ["s1", "1. Em uma frase"],
  ["s2", "2. Problema que resolveu"],
  ["s3", "3. Como funciona"],
  ["s4", "4. Quando usar"],
  ["s5", "5. No projeto"],
  ["s6", "6. Por que virou referência"],
  ["s7", "7. Pontos para os autores"],
  ["s8", "8. Como foi feito"],
  ["s9", "9. Pontos de atenção"],
] as const;

function formDaFicha(f: FichaCompleta): Form {
  const respostas = [...f.visao_autores];
  while (respostas.length < f.perguntas_autores.length) respostas.push("");
  return {
    titulo: f.titulo,
    tipos: [...f.tipos],
    autores: f.autores.map((a) => String(a.id)),
    responsavel: f.responsavel_id ? String(f.responsavel_id) : "",
    setor: f.setor ?? "",
    ferramenta: f.ferramenta ?? "",
    por_que_se_destacou: f.por_que_se_destacou,
    em_uma_frase: f.em_uma_frase ?? "",
    problema: f.problema ?? "",
    passos: f.passos.length > 0 ? [...f.passos] : ["", "", ""],
    funciona_bem: f.funciona_bem.join("\n"),
    nao_ajuda: f.nao_ajuda.join("\n"),
    onde_aparece: f.onde_aparece ?? "",
    galeria: f.galeria.map((g) => ({ anexo_id: g.anexo_id, titulo: g.titulo, descricao: g.descricao, pagina: g.pagina })),
    blocos: f.blocos.map((b) => semAnexo(b)),
    respostas_revisor: f.perguntas_revisor.map((q) => q.resposta),
    visao_autores: respostas,
    pontos_atencao: f.pontos_atencao ?? "",
    revisar_em: f.revisar_em ?? "",
    apontada_diagnostico: f.apontada_diagnostico,
  };
}

/** Só o que mudou, no formato do PATCH. */
function diferencas(form: Form, ficha: FichaCompleta): EditarFichaPayload {
  const d: EditarFichaPayload = {};
  const texto = (v: string) => v.trim() || null;
  if (form.titulo.trim() !== ficha.titulo) d.titulo = form.titulo.trim();
  if (form.tipos.join(",") !== ficha.tipos.join(",")) d.tipos = form.tipos;
  if (form.autores.join(",") !== ficha.autores.map((a) => String(a.id)).join(",")) d.autores_ids = form.autores.map(Number);
  if ((form.responsavel || "") !== (ficha.responsavel_id ? String(ficha.responsavel_id) : "")) {
    d.responsavel_id = form.responsavel ? Number(form.responsavel) : null;
  }
  if (texto(form.setor) !== (ficha.setor ?? null)) d.setor = texto(form.setor);
  if (texto(form.ferramenta) !== (ficha.ferramenta ?? null)) d.ferramenta = texto(form.ferramenta);
  if (form.por_que_se_destacou.trim() !== ficha.por_que_se_destacou && form.por_que_se_destacou.trim()) {
    d.por_que_se_destacou = form.por_que_se_destacou.trim();
  }
  for (const campo of ["em_uma_frase", "problema", "onde_aparece", "pontos_atencao", "revisar_em"] as const) {
    if (texto(form[campo]) !== (ficha[campo] ?? null)) d[campo] = texto(form[campo]);
  }
  const passos = form.passos.map((p) => p.trim()).filter(Boolean);
  if (passos.join("\n") !== ficha.passos.join("\n")) d.passos = passos;
  for (const lista of ["funciona_bem", "nao_ajuda"] as const) {
    const itens = linhas(form[lista]);
    if (itens.join("\n") !== ficha[lista].join("\n")) d[lista] = itens;
  }
  const galeria = form.galeria.map((g) => ({ anexo_id: g.anexo_id, titulo: g.titulo.trim(), descricao: g.descricao.trim(), pagina: g.pagina.trim() }));
  const galeriaAtual = ficha.galeria.map((g) => ({ anexo_id: g.anexo_id, titulo: g.titulo, descricao: g.descricao, pagina: g.pagina }));
  if (JSON.stringify(galeria) !== JSON.stringify(galeriaAtual)) d.galeria = galeria;
  const blocos = form.blocos.map(semAnexo);
  if (JSON.stringify(blocos) !== JSON.stringify(ficha.blocos.map(semAnexo))) d.blocos = blocos;
  const respostasRevisor = form.respostas_revisor.map((r) => r.trim());
  if (respostasRevisor.join("\n") !== ficha.perguntas_revisor.map((q) => q.resposta.trim()).join("\n")) d.respostas_revisor = respostasRevisor;
  const respostas = form.visao_autores.map((r) => r.trim());
  if (respostas.join("\n") !== ficha.visao_autores.map((r) => r.trim()).join("\n")) d.visao_autores = respostas;
  if (form.apontada_diagnostico !== ficha.apontada_diagnostico) d.apontada_diagnostico = form.apontada_diagnostico;
  return d;
}

function Miniatura({ anexo }: { anexo: AnexoFicha }) {
  const url = anexo.imagem ? urlDoAnexo(anexo) : null;
  if (!anexo.imagem) return <span>{anexo.nome.split(".").pop()?.toUpperCase() ?? "Arquivo"}</span>;
  if (!url) return <span>…</span>;
  return <img src={url} alt={anexo.legenda ?? anexo.nome} />;
}

/** Um bloco opcional em leitura (plano, 1.5). */
function BlocoLeitura({ bloco, onAmpliar }: { bloco: Bloco; onAmpliar: (item: ItemGaleria) => void }) {
  if (bloco.tipo === "aviso") {
    return (
      <AvisoCaixa $tom="atencao">
        {bloco.titulo && <strong>{bloco.titulo}. </strong>}
        {bloco.texto}
      </AvisoCaixa>
    );
  }
  if (bloco.tipo === "codigo") {
    return (
      <BlocoCard>
        <h4>
          {bloco.titulo}
          {bloco.arquivo && <code className="arquivo">{bloco.arquivo}</code>}
        </h4>
        <pre>{bloco.texto}</pre>
        {bloco.legenda && <span className="legenda">{bloco.legenda}</span>}
      </BlocoCard>
    );
  }
  if (bloco.tipo === "numeros") {
    return (
      <BlocoCard>
        {bloco.titulo && <h4>{bloco.titulo}</h4>}
        <Numeros>
          {bloco.itens.map(([rotulo, valor], i) => (
            <div key={i}>
              <b className={valor.length > 18 ? "longo" : undefined}>{valor}</b>
              <span>{rotulo}</span>
            </div>
          ))}
        </Numeros>
      </BlocoCard>
    );
  }
  if (bloco.tipo === "lista") {
    return (
      <BlocoCard>
        {bloco.titulo && <h4>{bloco.titulo}</h4>}
        <ul>
          {bloco.itens.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </BlocoCard>
    );
  }
  if (bloco.tipo === "imagem") {
    if (!bloco.anexo) return null;
    const anexo = bloco.anexo;
    const item: ItemGaleria = { anexo_id: bloco.anexo_id, titulo: bloco.titulo, descricao: bloco.legenda, pagina: "", anexo };
    return (
      <BlocoCard>
        {bloco.titulo && <h4>{bloco.titulo}</h4>}
        <figure>
          <button type="button" onClick={() => onAmpliar(item)} aria-label={`Ampliar ${bloco.titulo || anexo.nome}`}>
            <Miniatura anexo={anexo} />
          </button>
          {bloco.legenda && <figcaption>{bloco.legenda}</figcaption>}
        </figure>
      </BlocoCard>
    );
  }
  return (
    <BlocoCard>
      {bloco.titulo && <h4>{bloco.titulo}</h4>}
      <Texto>{bloco.texto}</Texto>
    </BlocoCard>
  );
}

function moverItem<T>(lista: T[], i: number, delta: number): T[] {
  const j = i + delta;
  if (j < 0 || j >= lista.length) return lista;
  const nova = [...lista];
  [nova[i], nova[j]] = [nova[j], nova[i]];
  return nova;
}

/** Um bloco opcional em edição: os campos do tipo dele. */
function BlocoEdicao({
  bloco,
  imagens,
  onChange,
  onSubir,
  onDescer,
  onRemover,
}: {
  bloco: Bloco;
  imagens: AnexoFicha[];
  onChange: (b: Bloco) => void;
  onSubir?: () => void;
  onDescer?: () => void;
  onRemover: () => void;
}) {
  const mono = { fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace", fontSize: "0.8rem" };
  return (
    <BlocoCard>
      <h4>
        <Chip>{ROTULO_BLOCO[bloco.tipo]}</Chip>
        <span style={{ marginLeft: "auto" }}>
          <BotoesItem onSubir={onSubir} onDescer={onDescer} onRemover={onRemover} />
        </span>
      </h4>
      <FieldInput aria-label="Título do bloco" maxLength={200} value={bloco.titulo} onChange={(e) => onChange({ ...bloco, titulo: e.target.value })} placeholder="Título" />
      {bloco.tipo === "codigo" && (
        <>
          <FieldInput aria-label="Nome do arquivo" maxLength={120} value={bloco.arquivo} onChange={(e) => onChange({ ...bloco, arquivo: e.target.value })} placeholder="Nome do arquivo (ex.: montecarlo.py)" style={mono} />
          <FieldTextarea aria-label="Código" rows={6} value={bloco.texto} onChange={(e) => onChange({ ...bloco, texto: e.target.value })} placeholder="O trecho de código" style={mono} />
          <FieldInput aria-label="Legenda do código" maxLength={300} value={bloco.legenda} onChange={(e) => onChange({ ...bloco, legenda: e.target.value })} placeholder="Legenda (o que o trecho faz)" />
        </>
      )}
      {(bloco.tipo === "aviso" || bloco.tipo === "texto") && (
        <FieldTextarea aria-label="Texto do bloco" rows={3} value={bloco.texto} onChange={(e) => onChange({ ...bloco, texto: e.target.value })} placeholder={bloco.tipo === "aviso" ? "O que precisa ser dito antes de tudo" : "Texto"} />
      )}
      {bloco.tipo === "lista" && <ListaTextos rotulo="Itens" itens={bloco.itens} onChange={(itens) => onChange({ ...bloco, itens })} placeholder="Um item" />}
      {bloco.tipo === "numeros" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
          {bloco.itens.map(([rotulo, valor], i) => (
            <PassoLinha key={i}>
              <FieldInput aria-label={`Rótulo ${i + 1}`} value={rotulo} onChange={(e) => onChange({ ...bloco, itens: bloco.itens.map((x, j) => (j === i ? ([e.target.value, x[1]] as [string, string]) : x)) })} placeholder="Rótulo (ex.: Probabilidade de VPL positivo)" />
              <FieldInput aria-label={`Valor ${i + 1}`} value={valor} onChange={(e) => onChange({ ...bloco, itens: bloco.itens.map((x, j) => (j === i ? ([x[0], e.target.value] as [string, string]) : x)) })} placeholder="Valor (ex.: 59,76%)" style={{ maxWidth: "11rem" }} />
              <BotoesItem onSubir={() => onChange({ ...bloco, itens: moverItem(bloco.itens, i, -1) })} onDescer={() => onChange({ ...bloco, itens: moverItem(bloco.itens, i, 1) })} onRemover={() => onChange({ ...bloco, itens: bloco.itens.filter((_, j) => j !== i) })} />
            </PassoLinha>
          ))}
          <div>
            <PageButtonSm type="button" $variant="outline" onClick={() => onChange({ ...bloco, itens: [...bloco.itens, ["", ""]] })}>
              <Plus size={14} /> Adicionar número
            </PageButtonSm>
          </div>
        </div>
      )}
      {bloco.tipo === "imagem" && (
        <div style={{ display: "grid", gridTemplateColumns: "8rem minmax(0, 1fr)", gap: "0.75rem", alignItems: "start" }}>
          <div style={{ aspectRatio: "16 / 9", borderRadius: "0.5rem", overflow: "hidden", background: "var(--atlas-muted)" }}>
            {(() => {
              const anexo = imagens.find((a) => a.id === bloco.anexo_id);
              return anexo ? <Miniatura anexo={anexo} /> : <span>Imagem apagada</span>;
            })()}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <FieldSelect aria-label="Imagem anexada" value={String(bloco.anexo_id)} onChange={(e) => onChange({ ...bloco, anexo_id: Number(e.target.value) })}>
              {imagens.map((a) => (
                <option key={a.id} value={String(a.id)}>
                  {a.legenda || a.nome}
                </option>
              ))}
            </FieldSelect>
            <FieldInput aria-label="Legenda da imagem" maxLength={300} value={bloco.legenda} onChange={(e) => onChange({ ...bloco, legenda: e.target.value })} placeholder="Legenda" />
          </div>
        </div>
      )}
    </BlocoCard>
  );
}

/** A imagem da galeria ampliada por cima da página, como na Capacitação:
 *  Esc, o X ou clicar fora fecham. */
function Ampliada({ item, onFechar }: { item: ItemGaleria; onFechar: () => void }) {
  const url = urlDoAnexo(item.anexo);
  useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") onFechar();
    }
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [onFechar]);
  const legenda = [item.titulo, item.descricao].filter(Boolean).join(". ") + (item.pagina ? ` · ${item.pagina}` : "");
  return (
    <Lightbox role="dialog" aria-label={legenda || item.anexo.nome} onMouseDown={onFechar}>
      <button type="button" className="fechar" aria-label="Fechar" onClick={onFechar}>
        <X size={20} />
      </button>
      <figure onMouseDown={(e) => e.stopPropagation()}>
        {url ? <img src={url} alt={legenda || item.anexo.nome} /> : <span>…</span>}
        <figcaption>{legenda || item.anexo.nome}</figcaption>
      </figure>
    </Lightbox>
  );
}

/**
 * A ficha aberta como documento: cabeçalho com o ícone da categoria, índice lateral e as
 * oito seções numeradas. Para quem está com ela, as seções viram campos.
 * As ações de cada papel vêm prontas do backend em `permissoes`.
 */
export function Ficha() {
  const { id } = useParams();
  const fichaId = Number(id);
  const { token } = useAuth();
  const location = useLocation();
  // De onde a pessoa veio (Tool Box, Minhas indicações, Painel...): quem
  // abre a ficha passa a rota em `state.de`; sem isso, volta à Tool Box.
  const voltarPara = (location.state as { de?: string } | null)?.de ?? "/central/toolbox";
  const [ficha, setFicha] = useState<FichaCompleta | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [opcoes, setOpcoes] = useState<OpcoesCentral | null>(null);
  const [erro, setErro] = useState("");
  const [faltando, setFaltando] = useState<string[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [devolvendo, setDevolvendo] = useState(false);
  const [pedindoAjustes, setPedindoAjustes] = useState(false);
  const [ajustes, setAjustes] = useState("");
  const [confirmandoPublicacao, setConfirmandoPublicacao] = useState(false);
  // "Usei no meu projeto" pede confirmação: sem ela, o clique distraído conta como uso.
  const [confirmandoUso, setConfirmandoUso] = useState(false);
  const [projetoUso, setProjetoUso] = useState("");
  const [legenda, setLegenda] = useState("");
  const arquivoRef = useRef<HTMLInputElement>(null);
  const [ampliada, setAmpliada] = useState<ItemGaleria | null>(null);
  // O revisor edita as perguntas num bloco próprio, salvo na hora (não faz
  // parte do formulário dos autores).
  const [perguntas, setPerguntas] = useState<string[] | null>(null);
  const [tipoNovoBloco, setTipoNovoBloco] = useState<Bloco["tipo"]>("aviso");

  const carregar = useCallback(async () => {
    if (!token || !fichaId) return;
    try {
      const f = await getFicha(fichaId, token);
      setFicha(f);
      setForm(formDaFicha(f));
      setErro("");
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao carregar a ficha");
    }
  }, [token, fichaId]);

  useEffect(() => {
    async function aoAbrir() {
      await carregar();
    }
    aoAbrir();
  }, [carregar]);

  const editando = !!ficha?.permissoes.editar;

  useEffect(() => {
    if (!token || !ficha) return;
    if (!editando && ficha.status !== "publicada") return;
    if (opcoes) return;
    getOpcoesCentral(token)
      .then(setOpcoes)
      .catch(() => {});
  }, [token, ficha, editando, opcoes]);

  const membros = useMemo(
    () =>
      (opcoes?.membros ?? []).map((m) => ({
        value: String(m.id),
        label: `${m.nome} · ${ROTULO_POSICAO[m.posicao as keyof typeof ROTULO_POSICAO] ?? m.posicao}`,
      })),
    [opcoes],
  );
  // As categorias ativas, mais as que a ficha já usa (uma desativada continua escolhida).
  const categorias = useMemo(() => {
    const ativas = (opcoes?.categorias ?? []).filter((c) => c.ativa).map((c) => ({ value: c.chave, label: c.nome }));
    for (const c of ficha?.categorias ?? []) {
      if (!ativas.some((a) => a.value === c.chave)) ativas.push({ value: c.chave, label: c.nome });
    }
    return ativas;
  }, [opcoes, ficha]);

  function campo<K extends keyof Form>(chave: K, valor: Form[K]) {
    setForm((atual) => (atual ? { ...atual, [chave]: valor } : atual));
  }

  async function salvar(): Promise<FichaCompleta | null> {
    if (!token || !ficha || !form) return null;
    const mudancas = diferencas(form, ficha);
    if (Object.keys(mudancas).length === 0) return ficha;
    const salva = await editarFicha(ficha.id, mudancas, token);
    setFicha(salva);
    setForm(formDaFicha(salva));
    return salva;
  }

  async function aoSalvar() {
    setSalvando(true);
    setErro("");
    try {
      await salvar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível salvar");
    } finally {
      setSalvando(false);
    }
  }

  async function aoEnviar() {
    if (!token || !ficha) return;
    setSalvando(true);
    setErro("");
    setFaltando([]);
    try {
      await salvar();
      const enviada = await enviarParaRevisao(ficha.id, token);
      setFicha(enviada);
      setForm(formDaFicha(enviada));
    } catch (err) {
      setFaltando(camposFaltandoDoErro(err) ?? []);
      setErro(err instanceof Error ? err.message : "Não foi possível enviar");
    } finally {
      setSalvando(false);
    }
  }

  async function aoDecidir(aprovar: boolean) {
    if (!token || !ficha) return;
    if (!aprovar && motivo.trim().length < 3) {
      setErro("Diga em uma linha por que não vale uma ficha.");
      return;
    }
    setSalvando(true);
    setErro("");
    try {
      const decidida = await decidirPertinencia(ficha.id, aprovar, aprovar ? null : motivo.trim(), token);
      setFicha(decidida);
      setForm(formDaFicha(decidida));
      setDevolvendo(false);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível decidir");
    } finally {
      setSalvando(false);
    }
  }

  async function aoPedirAjustes() {
    if (!token || !ficha) return;
    if (ajustes.trim().length < 5) {
      setErro("Diga o que precisa ser ajustado.");
      return;
    }
    setSalvando(true);
    setErro("");
    try {
      const f = await pedirAjustes(ficha.id, ajustes.trim(), token);
      setFicha(f);
      setForm(formDaFicha(f));
      setPedindoAjustes(false);
      setAjustes("");
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível pedir ajustes");
    } finally {
      setSalvando(false);
    }
  }

  async function aoPublicar() {
    if (!token || !ficha) return;
    const f = await publicarFicha(ficha.id, token);
    setFicha(f);
    setForm(formDaFicha(f));
    setConfirmandoPublicacao(false);
  }

  async function aoMarcarUso() {
    if (!token || !ficha) return;
    const f = await marcarUso(ficha.id, projetoUso ? Number(projetoUso) : null, token);
    setFicha(f);
    setConfirmandoUso(false);
  }

  async function aoSalvarPerguntas() {
    if (!token || !ficha || perguntas === null) return;
    setSalvando(true);
    setErro("");
    try {
      const f = await definirPerguntasRevisor(ficha.id, perguntas.map((q) => q.trim()).filter(Boolean), token);
      setFicha(f);
      setForm(formDaFicha(f));
      setPerguntas(null);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível salvar as perguntas");
    } finally {
      setSalvando(false);
    }
  }

  async function aoAnexar(arquivos: FileList | null) {
    if (!token || !ficha || !arquivos || arquivos.length === 0) return;
    setSalvando(true);
    setErro("");
    try {
      // O que foi digitado até aqui vai junto, senão a recarga apagaria.
      await salvar();
      for (const arquivo of Array.from(arquivos)) {
        await anexarArquivo(ficha.id, arquivo, legenda, token);
      }
      setLegenda("");
      if (arquivoRef.current) arquivoRef.current.value = "";
      // Imagem nova entra na galeria na hora, com a legenda como título;
      // quem edita ajusta a frase e a página e salva.
      const f = await getFicha(ficha.id, token);
      const conhecidas = new Set(ficha.anexos.map((a) => a.id));
      const novas = f.anexos.filter((a) => a.imagem && !conhecidas.has(a.id) && !f.galeria.some((g) => g.anexo_id === a.id));
      const base = formDaFicha(f);
      setFicha(f);
      setForm({ ...base, galeria: [...base.galeria, ...novas.map((a) => ({ anexo_id: a.id, titulo: a.legenda ?? "", descricao: "", pagina: "" }))] });
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível anexar");
    } finally {
      setSalvando(false);
    }
  }

  async function aoApagarAnexo(anexo: AnexoFicha) {
    if (!token) return;
    try {
      await apagarAnexo(anexo.id, token);
      await carregar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível apagar");
    }
  }

  if (erro && !ficha) {
    return (
      <PageStack>
        <PageButtonSm as={Link} to="/central/toolbox" $variant="ghost">
          <ArrowLeft size={14} /> Voltar para a Tool Box
        </PageButtonSm>
        <ErrorText>{erro}</ErrorText>
      </PageStack>
    );
  }
  if (!ficha || !form) return <PageLoadingBlock />;

  const p = ficha.permissoes;
  const falta = (c: string) => faltando.includes(c);
  const marca = (c: string) => (falta(c) ? { borderColor: "var(--atlas-destructive)" } : undefined);
  const naGaleria = new Set(form.galeria.map((g) => g.anexo_id));
  // Imagens anexadas que ainda não viraram slide da galeria.
  const imagensSobrando = ficha.anexos.filter((a) => a.imagem && !naGaleria.has(a.id));
  // Na leitura, a grade de anexos mostra só o que não está na galeria.
  const anexosForaDaGaleria = ficha.anexos.filter((a) => !ficha.galeria.some((g) => g.anexo_id === a.id));
  const faltam = editando ? form.respostas_revisor.filter((r) => !r.trim()).length : ficha.faltam_respostas;
  // O fluxo com o nome de quem fez cada passo (1.6). Quem enviou à revisão
  // só está no histórico.
  const enviouRevisao = [...(ficha.historico ?? [])].reverse().find((h) => h.acao === "enviou_revisao");
  const fluxo: [string, string][] = [
    [
      "Indicada",
      ficha.indicacoes.length > 1
        ? `${ficha.indicacoes.length} indicações: ${ficha.indicacoes.map((i) => i.usuario_nome ?? "alguém").join(", ")}`
        : `${ficha.indicado_por_nome ?? "alguém"}, ${ROTULO_VIA[ficha.indicado_via]}`,
    ],
    [
      "Aprovada",
      ficha.status === "aguardando_gerente" ? "aguardando o gerente" : ficha.status === "devolvida" ? `devolvida por ${ficha.decidido_por_nome ?? "gerente"}` : (ficha.decidido_por_nome ?? "gerente da frente"),
    ],
    [
      "Autores",
      ficha.status === "com_autores" || ficha.status === "ajustes_pedidos"
        ? "escrevendo"
        : enviouRevisao
          ? `enviada por ${enviouRevisao.usuario_nome ?? "autores"}`
          : ficha.status === "aguardando_gerente" || ficha.status === "devolvida"
            ? "ainda não"
            : "escreveram",
    ],
    [
      "Publicação",
      ficha.status === "publicada" ? (ficha.publicado_por_nome ?? "diretor de projetos") : ficha.status === "revisao_final" ? "em revisão pelo diretor" : "ainda não",
    ],
  ];
  function itemGaleria(i: number, mudanca: Partial<ItemGaleriaForm>) {
    campo(
      "galeria",
      form!.galeria.map((g, j) => (j === i ? { ...g, ...mudanca } : g)),
    );
  }
  const meta = [
    ficha.projeto_nome ? `${ficha.projeto_nome}${ficha.cliente ? ` · ${ficha.cliente}` : ""}` : null,
    [ficha.frente_nome ?? "Transversal", ficha.escopo_nome].filter(Boolean).join(" · "),
    ficha.ferramenta,
    ficha.setor ? `Setor: ${ficha.setor}` : null,
    ficha.revisar_em ? `Revisar em ${ficha.revisar_em}` : null,
  ].filter(Boolean) as string[];

  return (
    <PageStack>
      <div>
        <PageButtonSm as={Link} to={voltarPara} $variant="ghost">
          <ArrowLeft size={14} /> {voltarPara === "/central/toolbox" ? "Tool Box" : "Voltar"}
        </PageButtonSm>
      </div>

      <CabecalhoFicha>
        <CabecalhoFichaLinha>
          <IconeCategoria ficha={ficha} grande />
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "0.625rem" }}>
            <Tags>
              <span style={{ fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.06em", color: "var(--atlas-muted-foreground)", fontVariantNumeric: "tabular-nums" }}>
                REF {codigoEGestao(ficha)}
              </span>
              {ficha.categorias.map((c) => (
                <Chip key={c.chave}>{c.nome}</Chip>
              ))}
              {ficha.apontada_diagnostico && <Chip $tom="primario">Também apontada pelo Diagnóstico</Chip>}
              {chipsDeStatus(ficha).map((c) => (
                <Chip key={c.texto} $tom={c.tom}>
                  {c.texto}
                </Chip>
              ))}
            </Tags>
            {editando ? (
              <FieldInput maxLength={200} value={form.titulo} onChange={(e) => campo("titulo", e.target.value)} aria-label="Título" style={{ fontSize: "1.125rem", fontWeight: 600 }} />
            ) : (
              <TituloFicha>{ficha.titulo}</TituloFicha>
            )}
            {!editando && (
              <Texto style={{ fontSize: "1rem", opacity: 0.85 }} $vazio={!ficha.em_uma_frase}>
                {ficha.em_uma_frase || "Ainda sem a frase de abertura."}
              </Texto>
            )}
            <Meta>
              {meta.map((m) => (
                <span key={m}>{m}</span>
              ))}
            </Meta>
          </div>
          {(p.marcar_uso || ficha.anexos.length > 0) && (
            <div style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", gap: "0.5rem", alignItems: "flex-end" }}>
              {ficha.anexos.length > 0 && (
                <PageButton as="a" href="#s5" $variant="outline">
                  <Paperclip size={16} aria-hidden="true" />
                  Abrir arquivos
                </PageButton>
              )}
              {p.marcar_uso && (
              <PageButton type="button" disabled={salvando} onClick={() => setConfirmandoUso(true)}>
                <Check size={16} aria-hidden="true" />
                Usei no meu projeto
              </PageButton>
              )}
              {p.marcar_uso && (
                <FieldSelect aria-label="Em qual projeto" value={projetoUso} onChange={(e) => setProjetoUso(e.target.value)} pesquisavel>
                  <option value="">Sem projeto específico</option>
                  {(opcoes?.projetos ?? []).map((pr) => (
                    <option key={pr.id} value={String(pr.id)}>
                      {pr.nome}
                    </option>
                  ))}
                </FieldSelect>
              )}
              {p.marcar_uso && (
                <span style={{ fontSize: "0.75rem", color: "var(--atlas-muted-foreground)" }}>
                  {ficha.usos > 0 ? `${ficha.usos} uso${ficha.usos === 1 ? "" : "s"} registrado${ficha.usos === 1 ? "" : "s"}` : "ainda sem usos"}
                </span>
              )}
            </div>
          )}
        </CabecalhoFichaLinha>
        <LinhaDoTempo ficha={ficha} />
        <Meta>
          <span>
            Indicada {ROTULO_VIA[ficha.indicado_via]} por {ficha.indicado_por_nome} em {formatarDataHora(ficha.indicado_em)}
          </span>
          {ficha.responsavel_nome && <span>Responsável por garantir a escrita: {ficha.responsavel_nome}</span>}
        </Meta>
        {erro && <ErrorText>{erro}</ErrorText>}
        {ficha.status === "ajustes_pedidos" && ficha.revisao_comentario && (
          <AvisoCaixa $tom="atencao">
            <strong>O diretor pediu ajustes:</strong> {ficha.revisao_comentario}
          </AvisoCaixa>
        )}
        {ficha.juntada_em ? (
          <AvisoCaixa>
            <strong>Juntada por {ficha.decidido_por_nome}:</strong> esta indicação entrou na ficha{" "}
            <Link to={`/central/fichas/${ficha.juntada_em.id}`} state={{ de: location.pathname }}>
              {ficha.juntada_em.codigo} · {ficha.juntada_em.titulo}
            </Link>
            , com a justificativa e os autores.
          </AvisoCaixa>
        ) : (
          ficha.status === "devolvida" &&
          ficha.decisao_comentario && (
            <AvisoCaixa>
              <strong>Devolvida por {ficha.decidido_por_nome}:</strong> {ficha.decisao_comentario}
            </AvisoCaixa>
          )
        )}
        {p.decidir && (
          <AvisoCaixa>
            <strong>Decida só a pertinência.</strong> O texto da ficha é revisado depois pelo diretor.
            {devolvendo && (
              <FieldTextarea
                autoFocus
                rows={2}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Por que não vale uma ficha (vai para quem indicou)"
                style={{ marginTop: "0.5rem" }}
              />
            )}
            <Acoes style={{ marginTop: "0.5rem", justifyContent: "flex-end" }}>
              {devolvendo ? (
                <>
                  <PageButtonSm type="button" $variant="ghost" onClick={() => setDevolvendo(false)}>
                    Cancelar
                  </PageButtonSm>
                  <PageButtonSm type="button" $variant="outline" disabled={salvando} onClick={() => aoDecidir(false)}>
                    Confirmar devolução
                  </PageButtonSm>
                </>
              ) : (
                <>
                  <PageButtonSm type="button" $variant="outline" disabled={salvando} onClick={() => setDevolvendo(true)}>
                    Não vale uma ficha
                  </PageButtonSm>
                  <PageButtonSm type="button" disabled={salvando} onClick={() => aoDecidir(true)}>
                    Vale ter uma ficha
                  </PageButtonSm>
                </>
              )}
            </Acoes>
          </AvisoCaixa>
        )}
      </CabecalhoFicha>

      <DocumentoGrid>
        <Indice aria-label="Seções da ficha">
          {SECOES.map(([ancora, rotulo]) => (
            <a key={ancora} href={`#${ancora}`}>
              {rotulo}
            </a>
          ))}
          <IndiceCreditos>
            <span style={{ fontSize: "0.6875rem", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>Créditos</span>
            <span>
              <b>Autores</b>
              {ficha.autores.length > 0 ? ficha.autores.map((a) => a.nome).join(", ") : "A confirmar pelo coordenador"}
            </span>
            {(ficha.coordenacao?.length ?? 0) > 0 && (
              <span>
                <b>Coordenação</b>
                {ficha.coordenacao!.join(", ")}
              </span>
            )}
            {(ficha.equipe?.length ?? 0) > 0 && (
              <span>
                <b>Equipe do projeto</b>
                {ficha.equipe!.join(", ")}
              </span>
            )}
            {ficha.responsavel_nome && (
              <span>
                <b>Responsável pela escrita</b>
                {ficha.responsavel_nome}
              </span>
            )}
            <span style={{ fontSize: "0.6875rem", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginTop: "0.25rem" }}>Fluxo</span>
            {fluxo.map(([etapa, quem]) => (
              <span key={etapa}>
                <b>{etapa}</b>
                {quem}
              </span>
            ))}
          </IndiceCreditos>
        </Indice>

        <Documento>
          {editando && (
            <SecaoDoc>
              <SecaoDocTitulo>
                <i aria-hidden="true">0</i>Identificação
              </SecaoDocTitulo>
              <SecaoDocCorpo>
                <SecaoAjuda>Vem da indicação. O coordenador confirma os autores; o resto raramente muda.</SecaoAjuda>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(14rem, 1fr))", gap: "0.75rem" }}>
                  <FieldGroup>
                    <FieldLabel>Categoria</FieldLabel>
                    <MultiSelect valores={form.tipos} onChange={(v) => campo("tipos", v)} opcoes={categorias} rotuloVazio="Escolha a categoria" resumo={(n) => `${n} categorias`} aria-label="Categoria" />
                  </FieldGroup>
                  <FieldGroup>
                    <FieldLabel>Autores</FieldLabel>
                    <MultiSelect valores={form.autores} onChange={(v) => campo("autores", v)} opcoes={membros} rotuloVazio="Consultores que desenvolveram" resumo={(n) => `${n} autores`} aria-label="Autores" pesquisavel />
                  </FieldGroup>
                  <FieldGroup>
                    <FieldLabel>Responsável pela escrita</FieldLabel>
                    <FieldSelect value={form.responsavel} onChange={(e) => campo("responsavel", e.target.value)} pesquisavel>
                      <option value="">Ninguém definido</option>
                      {membros.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </FieldSelect>
                  </FieldGroup>
                  <FieldGroup>
                    <FieldLabel>Ferramenta ou fonte</FieldLabel>
                    <FieldInput maxLength={200} value={form.ferramenta} onChange={(e) => campo("ferramenta", e.target.value)} placeholder="Ex.: SEMrush" />
                  </FieldGroup>
                  <FieldGroup>
                    <FieldLabel>Setor</FieldLabel>
                    <FieldInput maxLength={200} value={form.setor} onChange={(e) => campo("setor", e.target.value)} placeholder="Ex.: saúde digital B2B" />
                  </FieldGroup>
                  <FieldGroup>
                    <FieldLabel>Revisar em</FieldLabel>
                    <FieldInput maxLength={20} value={form.revisar_em} onChange={(e) => campo("revisar_em", e.target.value)} placeholder="Ex.: 2027.2" />
                  </FieldGroup>
                </div>
                <FieldGroup>
                  <FieldLabel>Por que se destacou</FieldLabel>
                  <FieldTextarea rows={2} value={form.por_que_se_destacou} onChange={(e) => campo("por_que_se_destacou", e.target.value)} />
                </FieldGroup>
                <label style={{ display: "flex", alignItems: "center", gap: "0.375rem", fontSize: "0.8125rem" }}>
                  <input type="checkbox" checked={form.apontada_diagnostico} onChange={(e) => campo("apontada_diagnostico", e.target.checked)} />
                  Também apontada pelo Diagnóstico do Acervo
                </label>
              </SecaoDocCorpo>
            </SecaoDoc>
          )}

          <SecaoDoc id="s1">
            <SecaoDocTitulo>
              <i aria-hidden="true">1</i>Em uma frase
            </SecaoDocTitulo>
            <SecaoDocCorpo>
              <SecaoAjuda>O que é e para que serve. É o texto do card na Tool Box.</SecaoAjuda>
              {editando ? (
                <FieldTextarea rows={2} value={form.em_uma_frase} onChange={(e) => campo("em_uma_frase", e.target.value)} style={marca("em_uma_frase")} />
              ) : (
                <Texto style={{ fontSize: "1rem" }} $vazio={!ficha.em_uma_frase}>
                  {ficha.em_uma_frase || "Ainda não escrito."}
                </Texto>
              )}
            </SecaoDocCorpo>
          </SecaoDoc>

          <SecaoDoc id="s2">
            <SecaoDocTitulo>
              <i aria-hidden="true">2</i>Problema que resolveu
            </SecaoDocTitulo>
            <SecaoDocCorpo>
              <SecaoAjuda>Qual era a pergunta ou a dificuldade do cliente, e por que as abordagens usuais não bastavam.</SecaoAjuda>
              {editando ? (
                <FieldTextarea rows={4} value={form.problema} onChange={(e) => campo("problema", e.target.value)} style={marca("problema")} />
              ) : (
                <Texto $vazio={!ficha.problema}>{ficha.problema || "Ainda não escrito."}</Texto>
              )}
            </SecaoDocCorpo>
          </SecaoDoc>

          <SecaoDoc id="s3">
            <SecaoDocTitulo>
              <i aria-hidden="true">3</i>Como funciona
            </SecaoDocTitulo>
            <SecaoDocCorpo>
              <SecaoAjuda>Passo a passo do que foi feito, na ordem. Cada passo começando por um verbo. Os blocos opcionais (aviso, código, números, lista, imagem) complementam os passos.</SecaoAjuda>
              {!editando && token && ficha.blocos.some((b) => b.tipo === "aviso") && (
                <Blocos>
                  {ficha.blocos.filter((b) => b.tipo === "aviso").map((b, i) => (
                    <BlocoLeitura key={`aviso-${i}`} bloco={b} onAmpliar={setAmpliada} />
                  ))}
                </Blocos>
              )}
              {editando ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                  {form.passos.map((passo, i) => (
                    <PassoLinha key={i}>
                      <span style={{ width: "1.5rem", fontSize: "0.75rem", color: "var(--atlas-muted-foreground)" }}>{i + 1}.</span>
                      <FieldInput value={passo} onChange={(e) => campo("passos", form.passos.map((x, j) => (j === i ? e.target.value : x)))} placeholder={`Passo ${i + 1}`} style={marca("passos")} />
                      <PageButtonSm type="button" $variant="ghost" aria-label="Remover passo" onClick={() => campo("passos", form.passos.filter((_, j) => j !== i))}>
                        <Trash2 size={14} />
                      </PageButtonSm>
                    </PassoLinha>
                  ))}
                  <div>
                    <PageButtonSm type="button" $variant="outline" onClick={() => campo("passos", [...form.passos, ""])}>
                      Adicionar passo
                    </PageButtonSm>
                  </div>
                </div>
              ) : ficha.passos.length > 0 ? (
                <PassosDoc>
                  {ficha.passos.map((passo, i) => (
                    <li key={i}>
                      <i aria-hidden="true">{i + 1}</i>
                      <span>{passo}</span>
                    </li>
                  ))}
                </PassosDoc>
              ) : (
                <Texto $vazio>Ainda não escrito.</Texto>
              )}
              {!editando && token && ficha.blocos.some((b) => b.tipo !== "aviso") && (
                <Blocos>
                  {ficha.blocos.filter((b) => b.tipo !== "aviso").map((b, i) => (
                    <BlocoLeitura key={`${b.tipo}-${i}`} bloco={b} onAmpliar={setAmpliada} />
                  ))}
                </Blocos>
              )}
              {editando && token && (
                <Blocos>
                  {form.blocos.map((b, i) => (
                    <BlocoEdicao
                      key={i}
                      bloco={b}
                      imagens={ficha.anexos.filter((a) => a.imagem)}
                      onChange={(novo) => campo("blocos", form.blocos.map((x, j) => (j === i ? novo : x)))}
                      onSubir={i > 0 ? () => campo("blocos", moverItem(form.blocos, i, -1)) : undefined}
                      onDescer={i < form.blocos.length - 1 ? () => campo("blocos", moverItem(form.blocos, i, 1)) : undefined}
                      onRemover={() => campo("blocos", form.blocos.filter((_, j) => j !== i))}
                    />
                  ))}
                  <Acoes>
                    <FieldSelect aria-label="Tipo do bloco novo" value={tipoNovoBloco} onChange={(e) => setTipoNovoBloco(e.target.value as Bloco["tipo"])} style={{ maxWidth: "18rem" }}>
                      {(Object.keys(ROTULO_BLOCO) as Bloco["tipo"][]).map((t) => (
                        <option key={t} value={t}>
                          {ROTULO_BLOCO[t]}
                        </option>
                      ))}
                    </FieldSelect>
                    <PageButtonSm
                      type="button"
                      $variant="outline"
                      onClick={() => {
                        const novo = blocoNovo(tipoNovoBloco, ficha.anexos.find((a) => a.imagem)?.id ?? null);
                        if (!novo) {
                          setErro("Anexe uma imagem na seção 5 antes de criar um bloco de imagem.");
                          return;
                        }
                        campo("blocos", [...form.blocos, novo]);
                      }}
                    >
                      <Plus size={14} /> Adicionar bloco
                    </PageButtonSm>
                  </Acoes>
                </Blocos>
              )}
            </SecaoDocCorpo>
          </SecaoDoc>

          <SecaoDoc id="s4">
            <SecaoDocTitulo>
              <i aria-hidden="true">4</i>Quando usar
            </SecaoDocTitulo>
            <SecaoDocCorpo>
              <SecaoAjuda>Em que situações essa ferramenta funciona bem e em quais não ajuda. Uma situação por linha.</SecaoAjuda>
              {editando ? (
                <DuasListas>
                  <div>
                    <Chip $tom="ok">Funciona bem</Chip>
                    <FieldTextarea rows={4} value={form.funciona_bem} onChange={(e) => campo("funciona_bem", e.target.value)} placeholder={"Mercados novos, sem dado oficial de tamanho\nComparar o posicionamento digital de concorrentes"} style={marca("funciona_bem")} />
                  </div>
                  <div>
                    <Chip>Não ajuda</Chip>
                    <FieldTextarea rows={4} value={form.nao_ajuda} onChange={(e) => campo("nao_ajuda", e.target.value)} placeholder="Nichos em que o comprador não pesquisa online" />
                  </div>
                </DuasListas>
              ) : ficha.funciona_bem.length + ficha.nao_ajuda.length > 0 ? (
                <DuasListas>
                  <div>
                    <Chip $tom="ok">Funciona bem</Chip>
                    {ficha.funciona_bem.length > 0 ? (
                      <ul>
                        {ficha.funciona_bem.map((t) => (
                          <li key={t}>{t}</li>
                        ))}
                      </ul>
                    ) : (
                      <Texto $vazio>Ainda não escrito.</Texto>
                    )}
                  </div>
                  {ficha.nao_ajuda.length > 0 && (
                    <div>
                      <Chip>Não ajuda</Chip>
                      <ul>
                        {ficha.nao_ajuda.map((t) => (
                          <li key={t}>{t}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </DuasListas>
              ) : (
                <Texto $vazio>Ainda não escrito.</Texto>
              )}
            </SecaoDocCorpo>
          </SecaoDoc>

          <SecaoDoc id="s5">
            <SecaoDocTitulo>
              <i aria-hidden="true">5</i>No projeto
              {ficha.galeria.length > 0 && (
                <Chip style={{ marginLeft: "auto" }}>
                  {ficha.galeria.length} slide{ficha.galeria.length === 1 ? "" : "s"}
                </Chip>
              )}
            </SecaoDocTitulo>
            <SecaoDocCorpo>
              <SecaoAjuda>Os slides ou páginas em que foi aplicada, com um título, uma frase e a página. Anexe o print e ele vira um slide da galeria.</SecaoAjuda>
              {editando ? (
                <FieldInput maxLength={120} value={form.onde_aparece} onChange={(e) => campo("onde_aparece", e.target.value)} placeholder="Resumo para o cabeçalho (ex.: slides 54 a 60 e 99 a 103)" />
              ) : (
                ficha.onde_aparece && <Texto>{ficha.onde_aparece}</Texto>
              )}
              {!editando && ficha.galeria.length > 0 && token && (
                <GaleriaSlides>
                  {ficha.galeria.map((g) => (
                    <figure key={g.anexo_id}>
                      <button type="button" className="abrir" onClick={() => setAmpliada(g)} aria-label={`Ampliar ${g.titulo || g.anexo.nome}`}>
                        <Miniatura anexo={g.anexo} />
                      </button>
                      <figcaption>
                        {g.titulo && <b>{g.titulo}. </b>}
                        {g.descricao}
                        {g.pagina && <span style={{ whiteSpace: "nowrap" }}> · {g.pagina}</span>}
                      </figcaption>
                    </figure>
                  ))}
                </GaleriaSlides>
              )}
              {!editando && ficha.galeria.length === 0 && !ficha.onde_aparece && <Texto $vazio>Ainda sem slides.</Texto>}
              {editando && token && (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {form.galeria.map((g, i) => {
                    const anexo = ficha.anexos.find((a) => a.id === g.anexo_id);
                    return (
                      <GaleriaItemEdicao key={g.anexo_id}>
                        <div className="miniatura">{anexo ? <Miniatura anexo={anexo} /> : <span>Anexo apagado</span>}</div>
                        <div className="campos">
                          <FieldInput aria-label="Título do slide" maxLength={120} value={g.titulo} onChange={(e) => itemGaleria(i, { titulo: e.target.value })} placeholder="Título (ex.: Mapa competitivo)" />
                          <FieldInput aria-label="Página ou slide" maxLength={40} value={g.pagina} onChange={(e) => itemGaleria(i, { pagina: e.target.value })} placeholder="slide 57" />
                          <FieldInput aria-label="Descrição do slide" maxLength={300} value={g.descricao} onChange={(e) => itemGaleria(i, { descricao: e.target.value })} placeholder="Uma frase sobre o que o slide mostra" />
                        </div>
                        <PageButtonSm type="button" $variant="ghost" aria-label="Tirar da galeria" onClick={() => campo("galeria", form.galeria.filter((_, j) => j !== i))}>
                          <Trash2 size={14} />
                        </PageButtonSm>
                      </GaleriaItemEdicao>
                    );
                  })}
                  {imagensSobrando.length > 0 && (
                    <Acoes>
                      <SecaoAjuda>Imagens anexadas fora da galeria:</SecaoAjuda>
                      {imagensSobrando.map((a) => (
                        <PageButtonSm key={a.id} type="button" $variant="outline" onClick={() => campo("galeria", [...form.galeria, { anexo_id: a.id, titulo: a.legenda ?? "", descricao: "", pagina: "" }])}>
                          Usar {a.nome}
                        </PageButtonSm>
                      ))}
                    </Acoes>
                  )}
                </div>
              )}
              {anexosForaDaGaleria.length > 0 && token && (
                <AnexosGrid>
                  {anexosForaDaGaleria.map((a) => (
                    <AnexoCard key={a.id}>
                      <button type="button" className="abrir" onClick={() => abrirAnexo(a)}>
                        <Miniatura anexo={a} />
                      </button>
                      <figcaption>
                        {a.legenda || a.nome}
                        {editando && (
                          <PageButtonSm type="button" $variant="ghost" style={{ marginLeft: "0.25rem" }} aria-label="Apagar anexo" onClick={() => aoApagarAnexo(a)}>
                            <Trash2 size={12} />
                          </PageButtonSm>
                        )}
                      </figcaption>
                    </AnexoCard>
                  ))}
                </AnexosGrid>
              )}
              {editando && (
                <Acoes>
                  <FieldInput aria-label="Legenda do anexo" maxLength={300} value={legenda} onChange={(e) => setLegenda(e.target.value)} placeholder="Legenda (ex.: Os três critérios de corte · slide 56)" style={{ flex: "1 1 16rem" }} />
                  <input ref={arquivoRef} type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.webp,.xlsx,.xls,.csv,.pptx,.ppt,.docx,.doc,.py,.ipynb" style={{ display: "none" }} onChange={(e) => aoAnexar(e.target.files)} />
                  <PageButtonSm type="button" $variant="outline" disabled={salvando} onClick={() => arquivoRef.current?.click()}>
                    <Paperclip size={14} /> Anexar imagens ou documentos
                  </PageButtonSm>
                  <SecaoAjuda>Prints de slides, PDF, planilha ou apresentação · até 20 MB por arquivo. Uma imagem nova entra na galeria.</SecaoAjuda>
                </Acoes>
              )}
            </SecaoDocCorpo>
          </SecaoDoc>

          <SecaoDoc id="s6">
            <SecaoDocTitulo>
              <i aria-hidden="true">6</i>Por que virou referência
              {ficha.indicacoes.length > 1 && (
                <Chip style={{ marginLeft: "auto" }}>
                  {ficha.indicacoes.length} indicações
                </Chip>
              )}
            </SecaoDocTitulo>
            <SecaoDocCorpo>
              <SecaoAjuda>
                A justificativa de cada indicação. O mesmo ativo pode ser indicado pelo coordenador, pela banca e pelo gerente; o gerente junta as repetidas aqui.
                {editando && " A primeira é o campo \"Por que se destacou\" da identificação."}
              </SecaoAjuda>
              <RespostasGrid>
                {ficha.indicacoes.map((ind, i) => (
                  <Resposta key={`${ind.origem_ficha_id ?? "propria"}-${i}`}>
                    <b>
                      {ind.usuario_nome ?? "Alguém"}, {ROTULO_VIA[ind.via]}
                      {ind.em ? ` · ${formatarDataHora(ind.em)}` : ""}
                    </b>
                    <p>{ind.justificativa || "Sem justificativa."}</p>
                  </Resposta>
                ))}
              </RespostasGrid>
            </SecaoDocCorpo>
          </SecaoDoc>

          <SecaoDoc id="s7">
            <SecaoDocTitulo>
              <i aria-hidden="true">7</i>Pontos para os autores responderem
              {ficha.perguntas_revisor.length > 0 && (
                <Chip $tom={faltam > 0 ? "atencao" : "ok"} style={{ marginLeft: "auto" }}>
                  {faltam > 0 ? `Faltam ${faltam}` : "Todas respondidas"}
                </Chip>
              )}
            </SecaoDocTitulo>
            <SecaoDocCorpo>
              <SecaoAjuda>
                Perguntas específicas do revisor sobre a ficha, para os autores responderem.
                {ficha.perguntas_obrigatorias ? " Só dá para enviar ao diretor com todas respondidas." : " As respostas em aberto não travam o envio ao diretor."}
              </SecaoAjuda>
              {ficha.perguntas_revisor.length > 0 ? (
                <PerguntasRevisor>
                  {ficha.perguntas_revisor.map((q, i) => (
                    <li key={q.pergunta}>
                      <i aria-hidden="true">{i + 1}</i>
                      <div>
                        <p>
                          <b>{q.pergunta}</b>
                        </p>
                        {editando ? (
                          <FieldTextarea rows={2} value={form.respostas_revisor[i] ?? ""} onChange={(e) => campo("respostas_revisor", form.respostas_revisor.map((x, j) => (j === i ? e.target.value : x)))} placeholder="Resposta dos autores…" style={marca("perguntas_revisor")} />
                        ) : q.resposta ? (
                          <p className="resposta">{q.resposta}</p>
                        ) : (
                          <p className="pendente">Sem resposta ainda.</p>
                        )}
                      </div>
                    </li>
                  ))}
                </PerguntasRevisor>
              ) : (
                !p.perguntar && <Texto $vazio>O revisor não deixou perguntas.</Texto>
              )}
              {p.perguntar && perguntas === null && (
                <div>
                  <PageButtonSm type="button" $variant="outline" onClick={() => setPerguntas(ficha.perguntas_revisor.length > 0 ? ficha.perguntas_revisor.map((q) => q.pergunta) : [""])}>
                    {ficha.perguntas_revisor.length > 0 ? "Editar as perguntas" : "Deixar perguntas para os autores"}
                  </PageButtonSm>
                </div>
              )}
              {p.perguntar && perguntas !== null && (
                <AvisoCaixa>
                  <strong>Perguntas para os autores.</strong> Uma por linha, específica sobre a ficha (ex.: "De onde vieram os limites de 40 mil e 60%?"). Tirar uma pergunta apaga a resposta dela.
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem", marginTop: "0.5rem" }}>
                    {perguntas.map((q, i) => (
                      <PassoLinha key={i}>
                        <span style={{ width: "1.5rem", fontSize: "0.75rem", color: "var(--atlas-muted-foreground)" }}>{i + 1}.</span>
                        <FieldInput maxLength={500} value={q} onChange={(e) => setPerguntas(perguntas.map((x, j) => (j === i ? e.target.value : x)))} placeholder={`Pergunta ${i + 1}`} />
                        <PageButtonSm type="button" $variant="ghost" aria-label="Remover pergunta" onClick={() => setPerguntas(perguntas.filter((_, j) => j !== i))}>
                          <Trash2 size={14} />
                        </PageButtonSm>
                      </PassoLinha>
                    ))}
                  </div>
                  <Acoes style={{ marginTop: "0.5rem", justifyContent: "flex-end" }}>
                    <PageButtonSm type="button" $variant="outline" onClick={() => setPerguntas([...perguntas, ""])}>
                      Adicionar pergunta
                    </PageButtonSm>
                    <PageButtonSm type="button" $variant="ghost" onClick={() => setPerguntas(null)}>
                      Cancelar
                    </PageButtonSm>
                    <PageButtonSm type="button" disabled={salvando} onClick={aoSalvarPerguntas}>
                      Salvar perguntas
                    </PageButtonSm>
                  </Acoes>
                </AvisoCaixa>
              )}
            </SecaoDocCorpo>
          </SecaoDoc>

          <SecaoDoc id="s8">
            <SecaoDocTitulo $destaque>
              <i aria-hidden="true">8</i>Como foi feito, na visão de quem fez
            </SecaoDocTitulo>
            <SecaoDocCorpo>
              <SecaoAjuda>A parte mais importante da ficha e a única que só os autores conseguem escrever. As cinco respostas são obrigatórias.</SecaoAjuda>
              {editando ? (
                ficha.perguntas_autores.map((pergunta, i) => (
                  <FieldGroup key={pergunta}>
                    <FieldLabel>
                      {i + 1}. {pergunta}
                    </FieldLabel>
                    <FieldTextarea rows={2} value={form.visao_autores[i] ?? ""} onChange={(e) => campo("visao_autores", form.visao_autores.map((x, j) => (j === i ? e.target.value : x)))} placeholder="Resposta dos autores…" style={marca("visao_autores")} />
                  </FieldGroup>
                ))
              ) : (
                <RespostasGrid>
                  {ficha.perguntas_autores.map((pergunta, i) => (
                    <Resposta key={pergunta}>
                      <b>{pergunta}</b>
                      <p style={{ opacity: ficha.visao_autores[i] ? 1 : 0.6, fontStyle: ficha.visao_autores[i] ? "normal" : "italic" }}>{ficha.visao_autores[i] || "Resposta dos autores…"}</p>
                    </Resposta>
                  ))}
                </RespostasGrid>
              )}
            </SecaoDocCorpo>
          </SecaoDoc>

          <SecaoDoc id="s9">
            <SecaoDocTitulo>
              <i aria-hidden="true">9</i>Pontos de atenção
            </SecaoDocTitulo>
            <SecaoDocCorpo>
              <SecaoAjuda>Limitações, premissas frágeis ou erros que outro projeto deve evitar ao reaproveitar.</SecaoAjuda>
              {editando ? (
                <FieldTextarea rows={3} value={form.pontos_atencao} onChange={(e) => campo("pontos_atencao", e.target.value)} />
              ) : (
                <Texto $vazio={!ficha.pontos_atencao}>{ficha.pontos_atencao || "Nenhum registrado."}</Texto>
              )}
            </SecaoDocCorpo>
          </SecaoDoc>

          {(ficha.historico?.length ?? 0) > 0 && (
            <SecaoDoc>
              <SecaoDocTitulo>
                <i aria-hidden="true">·</i>Histórico
              </SecaoDocTitulo>
              <SecaoDocCorpo>
                <Historico>
                  {ficha.historico!.map((h) => (
                    <li key={h.id}>
                      {formatarDataHora(h.em)} · <strong>{h.usuario_nome ?? "ATLAS"}</strong> {h.detalhe ?? h.acao}
                    </li>
                  ))}
                </Historico>
              </SecaoDocCorpo>
            </SecaoDoc>
          )}

          {(editando || p.enviar_revisao || p.publicar || p.pedir_ajustes) && (
            <BarraAcoes style={{ margin: "0.5rem -2.25rem -1.5rem", borderRadius: "0 0 1.25rem 1.25rem" }}>
              {faltando.length > 0 ? (
                <p style={{ color: "var(--atlas-destructive)" }}>Falta preencher: {faltando.map((c) => ROTULO_CAMPO[c] ?? c).join("; ")}.</p>
              ) : faltam > 0 && editando && !ficha.perguntas_obrigatorias ? (
                <p>
                  Faltam {faltam} resposta{faltam === 1 ? "" : "s"} ao revisor. Dá para enviar mesmo assim, mas vale responder antes.
                </p>
              ) : ficha.responsavel_id && editando ? (
                <p>{ficha.responsavel_nome} é responsável por garantir que os autores escrevam. Prazo: 1 semana após a aprovação do gerente.</p>
              ) : (
                <p />
              )}
              {pedindoAjustes && (
                <FieldTextarea autoFocus rows={2} value={ajustes} onChange={(e) => setAjustes(e.target.value)} placeholder="O que precisa ser ajustado (vai para o coordenador e os autores)" style={{ flex: "1 1 100%" }} />
              )}
              {editando && (
                <PageButton type="button" $variant="outline" disabled={salvando} onClick={aoSalvar}>
                  Salvar
                </PageButton>
              )}
              {p.enviar_revisao && (
                <PageButton type="button" disabled={salvando} onClick={aoEnviar}>
                  Enviar para o diretor
                </PageButton>
              )}
              {p.pedir_ajustes &&
                (pedindoAjustes ? (
                  <>
                    <PageButton type="button" $variant="ghost" onClick={() => setPedindoAjustes(false)}>
                      Cancelar
                    </PageButton>
                    <PageButton type="button" $variant="outline" disabled={salvando} onClick={aoPedirAjustes}>
                      Enviar pedido de ajustes
                    </PageButton>
                  </>
                ) : (
                  <PageButton type="button" $variant="outline" disabled={salvando} onClick={() => setPedindoAjustes(true)}>
                    Pedir ajustes
                  </PageButton>
                ))}
              {p.publicar && !pedindoAjustes && (
                <PageButton type="button" disabled={salvando} onClick={() => setConfirmandoPublicacao(true)}>
                  Publicar
                </PageButton>
              )}
            </BarraAcoes>
          )}
        </Documento>
      </DocumentoGrid>

      {ampliada && token && <Ampliada item={ampliada} onFechar={() => setAmpliada(null)} />}
      {confirmandoUso && (
        <ConfirmarModal
          titulo="Registrar o uso"
          mensagem={`Marcar que você usou "${ficha.titulo}"${projetoUso ? " nesse projeto" : ""}? Conta nos destaques e no painel, e vale uma vez por pessoa e projeto.`}
          rotuloConfirmar="Sim, usei"
          rotuloProcessando="Registrando…"
          onCancelar={() => setConfirmandoUso(false)}
          onConfirmar={aoMarcarUso}
        />
      )}
      {confirmandoPublicacao && (
        <ConfirmarModal
          titulo="Publicar a ficha"
          mensagem={`Publicar "${ficha.titulo}"? Ela passa a aparecer na Tool Box para toda a empresa e conta nos destaques da gestão.`}
          rotuloConfirmar="Publicar"
          rotuloProcessando="Publicando…"
          onCancelar={() => setConfirmandoPublicacao(false)}
          onConfirmar={aoPublicar}
        />
      )}
    </PageStack>
  );
}
