import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { ArrowLeft, Check, Paperclip, Trash2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  ROTULO_VIA,
  abrirAnexo,
  anexarArquivo,
  apagarAnexo,
  decidirPertinencia,
  editarFicha,
  enviarParaRevisao,
  getFicha,
  getOpcoesCentral,
  marcarUso,
  pedirAjustes,
  publicarFicha,
  urlDoAnexo,
  type AnexoFicha,
  type EditarFichaPayload,
  type FichaCompleta,
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
  CabecalhoFicha,
  CabecalhoFichaLinha,
  Chip,
  Documento,
  DocumentoGrid,
  Historico,
  Indice,
  IndiceCreditos,
  Meta,
  PassoLinha,
  PassosDoc,
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
  quando_usar: string;
  onde_aparece: string;
  visao_autores: string[];
  pontos_atencao: string;
  revisar_em: string;
  apontada_diagnostico: boolean;
}

const ROTULO_CAMPO: Record<string, string> = {
  em_uma_frase: "1. Em uma frase",
  problema: "2. Problema que resolveu",
  passos: "3. Como funciona",
  quando_usar: "4. Quando usar",
  visao_autores: "6. Como foi feito, na visão de quem fez",
};

const SECOES = [
  ["s1", "1. Em uma frase"],
  ["s2", "2. Problema que resolveu"],
  ["s3", "3. Como funciona"],
  ["s4", "4. Quando usar"],
  ["s5", "5. Onde aparece no projeto"],
  ["s6", "6. Como foi feito"],
  ["s7", "7. Pontos de atenção"],
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
    quando_usar: f.quando_usar ?? "",
    onde_aparece: f.onde_aparece ?? "",
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
  for (const campo of ["em_uma_frase", "problema", "quando_usar", "onde_aparece", "pontos_atencao", "revisar_em"] as const) {
    if (texto(form[campo]) !== (ficha[campo] ?? null)) d[campo] = texto(form[campo]);
  }
  const passos = form.passos.map((p) => p.trim()).filter(Boolean);
  if (passos.join("\n") !== ficha.passos.join("\n")) d.passos = passos;
  const respostas = form.visao_autores.map((r) => r.trim());
  if (respostas.join("\n") !== ficha.visao_autores.map((r) => r.trim()).join("\n")) d.visao_autores = respostas;
  if (form.apontada_diagnostico !== ficha.apontada_diagnostico) d.apontada_diagnostico = form.apontada_diagnostico;
  return d;
}

function Miniatura({ anexo, token }: { anexo: AnexoFicha; token: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!anexo.imagem) return;
    let vivo = true;
    let criado: string | null = null;
    urlDoAnexo(anexo, token)
      .then((u) => {
        criado = u;
        if (vivo) setUrl(u);
      })
      .catch(() => {});
    return () => {
      vivo = false;
      if (criado) URL.revokeObjectURL(criado);
    };
  }, [anexo, token]);
  if (!anexo.imagem) return <span>{anexo.nome.split(".").pop()?.toUpperCase() ?? "Arquivo"}</span>;
  if (!url) return <span>…</span>;
  return <img src={url} alt={anexo.legenda ?? anexo.nome} />;
}

/**
 * A ficha aberta como documento: cabeçalho com o ícone da categoria, índice lateral e as
 * sete seções numeradas. Para quem está com ela, as seções viram campos.
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

  async function aoAnexar(arquivos: FileList | null) {
    if (!token || !ficha || !arquivos || arquivos.length === 0) return;
    setSalvando(true);
    setErro("");
    try {
      for (const arquivo of Array.from(arquivos)) {
        await anexarArquivo(ficha.id, arquivo, legenda, token);
      }
      setLegenda("");
      if (arquivoRef.current) arquivoRef.current.value = "";
      await carregar();
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
              {ficha.categorias.map((c) => (
                <Chip key={c.chave}>{c.nome}</Chip>
              ))}
              {ficha.apontada_diagnostico && <Chip $tom="primario">Apontada pelo Diagnóstico</Chip>}
              <Chip $tom={ficha.status === "publicada" ? "ok" : ficha.status === "devolvida" ? "neutro" : "atencao"}>{ficha.status_rotulo}</Chip>
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
          {p.marcar_uso && (
            <div style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", gap: "0.5rem", alignItems: "flex-end" }}>
              <PageButton type="button" disabled={salvando} onClick={() => setConfirmandoUso(true)}>
                <Check size={16} aria-hidden="true" />
                Usei no meu projeto
              </PageButton>
              <FieldSelect aria-label="Em qual projeto" value={projetoUso} onChange={(e) => setProjetoUso(e.target.value)} pesquisavel>
                <option value="">Sem projeto específico</option>
                {(opcoes?.projetos ?? []).map((pr) => (
                  <option key={pr.id} value={String(pr.id)}>
                    {pr.nome}
                  </option>
                ))}
              </FieldSelect>
              <span style={{ fontSize: "0.75rem", color: "var(--atlas-muted-foreground)" }}>
                {ficha.usos > 0 ? `${ficha.usos} uso${ficha.usos === 1 ? "" : "s"} registrado${ficha.usos === 1 ? "" : "s"}` : "ainda sem usos"}
              </span>
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
        {ficha.status === "devolvida" && ficha.decisao_comentario && (
          <AvisoCaixa>
            <strong>Devolvida por {ficha.decidido_por_nome}:</strong> {ficha.decisao_comentario}
          </AvisoCaixa>
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
            {ficha.responsavel_nome && (
              <span>
                <b>Responsável</b>
                {ficha.responsavel_nome}
              </span>
            )}
            <span>
              <b>Indicada por</b>
              {ficha.indicado_por_nome}, {ROTULO_VIA[ficha.indicado_via]}
            </span>
            {ficha.publicado_por_nome && (
              <span>
                <b>Publicada por</b>
                {ficha.publicado_por_nome}
              </span>
            )}
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
              <SecaoAjuda>Passo a passo do que foi feito, na ordem. Cada passo começando por um verbo.</SecaoAjuda>
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
            </SecaoDocCorpo>
          </SecaoDoc>

          <SecaoDoc id="s4">
            <SecaoDocTitulo>
              <i aria-hidden="true">4</i>Quando usar
            </SecaoDocTitulo>
            <SecaoDocCorpo>
              <SecaoAjuda>Em que tipo de projeto, setor ou situação essa ferramenta faz sentido.</SecaoAjuda>
              {editando ? (
                <FieldTextarea rows={3} value={form.quando_usar} onChange={(e) => campo("quando_usar", e.target.value)} style={marca("quando_usar")} />
              ) : (
                <Texto $vazio={!ficha.quando_usar}>{ficha.quando_usar || "Ainda não escrito."}</Texto>
              )}
            </SecaoDocCorpo>
          </SecaoDoc>

          <SecaoDoc id="s5">
            <SecaoDocTitulo>
              <i aria-hidden="true">5</i>Onde aparece no projeto
            </SecaoDocTitulo>
            <SecaoDocCorpo>
              <SecaoAjuda>Páginas do deck ou abas da planilha em que foi aplicada. Anexe prints dos slides, a planilha ou o documento.</SecaoAjuda>
              {editando ? (
                <FieldTextarea rows={2} value={form.onde_aparece} onChange={(e) => campo("onde_aparece", e.target.value)} placeholder="Ex.: slides 54 a 60 e 99 a 103" />
              ) : (
                <Texto $vazio={!ficha.onde_aparece}>{ficha.onde_aparece || "Não informado."}</Texto>
              )}
              {ficha.anexos.length > 0 && token && (
                <AnexosGrid>
                  {ficha.anexos.map((a) => (
                    <AnexoCard key={a.id}>
                      <button type="button" className="abrir" onClick={() => abrirAnexo(a, token).catch(() => setErro("Não foi possível abrir o anexo"))}>
                        <Miniatura anexo={a} token={token} />
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
                  <SecaoAjuda>Prints de slides, PDF, planilha ou apresentação · até 20 MB por arquivo</SecaoAjuda>
                </Acoes>
              )}
            </SecaoDocCorpo>
          </SecaoDoc>

          <SecaoDoc id="s6">
            <SecaoDocTitulo $destaque>
              <i aria-hidden="true">6</i>Como foi feito, na visão de quem fez
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

          <SecaoDoc id="s7">
            <SecaoDocTitulo>
              <i aria-hidden="true">7</i>Pontos de atenção
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
