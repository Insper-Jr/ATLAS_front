import { useEffect, useRef, useState, type FormEvent } from "react";
import { Paperclip, Trash2, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  anexarReferencia,
  apagarAnexoReferencia,
  criarReferencia,
  editarReferencia,
  getOpcoesCentral,
  gestoesAte,
  type OpcoesCentral,
  type ProjetoReferencia,
} from "@/lib/central";
import { PageButton, PageButtonSm } from "@/styles/page.styled";
import { ModalBody, ModalClose, ModalContent, ModalFooter, ModalHeader, ModalOverlay, ModalTitle } from "@/styles/modal.styled";
import { FieldGroup, FieldInput, FieldLabel, FieldSelect, FieldTextarea, FormErrorText, Required } from "@/pages/Bancas.styled";
import { Acoes, ListaSimples, SecaoAjuda } from "./Central.styled";

interface Props {
  referencia: ProjetoReferencia | null;
  onFechar: () => void;
  onSalvo: () => Promise<void> | void;
}

/** Criar ou editar um projeto de referência (quem gere a Central). As
 *  prévias só entram depois de salvo, porque precisam do id. */
export function ModalReferencia({ referencia, onFechar, onSalvo }: Props) {
  const { token } = useAuth();
  const [opcoes, setOpcoes] = useState<OpcoesCentral | null>(null);
  const [atual, setAtual] = useState<ProjetoReferencia | null>(referencia);
  const [projetoId, setProjetoId] = useState(referencia ? String(referencia.projeto_id) : "");
  const [pergunta, setPergunta] = useState(referencia?.pergunta_cliente ?? "");
  const [recomendacao, setRecomendacao] = useState(referencia?.recomendacao ?? "");
  const [porQue, setPorQue] = useState(referencia?.por_que_se_destacou ?? "");
  const [nota, setNota] = useState(referencia?.nota ?? "");
  const [link, setLink] = useState(referencia?.link_entregas ?? "");
  const [gestao, setGestao] = useState(referencia?.numero_gestao ? String(referencia.numero_gestao) : "");
  const [ativo, setAtivo] = useState(referencia?.ativo ?? true);
  const [legenda, setLegenda] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const arquivoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!token) return;
    let vivo = true;
    getOpcoesCentral(token)
      .then((o) => {
        if (!vivo) return;
        setOpcoes(o);
        // Nova referência nasce na gestão atual; editar mantém a gravada.
        setGestao((atual) => atual || (o.gestao_atual ? String(o.gestao_atual) : ""));
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, [token]);

  useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") onFechar();
    }
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [onFechar]);

  async function salvar(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    if (!atual && !projetoId) {
      setErro("Escolha o projeto.");
      return;
    }
    setErro("");
    setSalvando(true);
    try {
      const payload = {
        pergunta_cliente: pergunta,
        recomendacao,
        por_que_se_destacou: porQue,
        nota: nota || null,
        link_entregas: link || null,
        numero_gestao: gestao ? Number(gestao) : null,
        ativo,
      };
      const salva = atual
        ? await editarReferencia(atual.id, payload, token)
        : await criarReferencia({ projeto_id: Number(projetoId), ...payload }, token);
      setAtual(salva);
      if (!atual) {
        // Recém-criada: fica aberta para as prévias entrarem.
        setSalvando(false);
        return;
      }
      await onSalvo();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível salvar");
      setSalvando(false);
    }
  }

  async function anexar(arquivos: FileList | null) {
    if (!token || !atual || !arquivos) return;
    setSalvando(true);
    try {
      for (const arquivo of Array.from(arquivos)) {
        const anexo = await anexarReferencia(atual.id, arquivo, legenda, token);
        setAtual((a) => (a ? { ...a, anexos: [...a.anexos, anexo] } : a));
      }
      setLegenda("");
      if (arquivoRef.current) arquivoRef.current.value = "";
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível enviar a prévia");
    } finally {
      setSalvando(false);
    }
  }

  async function apagar(anexoId: number) {
    if (!token || !atual) return;
    try {
      await apagarAnexoReferencia(anexoId, token);
      setAtual((a) => (a ? { ...a, anexos: a.anexos.filter((x) => x.id !== anexoId) } : a));
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível apagar");
    }
  }

  return (
    <ModalOverlay onMouseDown={onFechar}>
      <ModalContent $expandido onMouseDown={(e) => e.stopPropagation()} style={{ maxWidth: "40rem" }}>
        <form onSubmit={salvar}>
          <ModalHeader>
            <ModalTitle>{atual ? `Projeto de referência: ${atual.projeto.nome}` : "Novo projeto de referência"}</ModalTitle>
            <ModalClose type="button" aria-label="Fechar" onClick={onFechar}>
              <X size={16} />
            </ModalClose>
          </ModalHeader>
          <ModalBody style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {!atual && (
              <FieldGroup>
                <FieldLabel htmlFor="ref-projeto">
                  Projeto<Required>*</Required>
                </FieldLabel>
                <FieldSelect id="ref-projeto" value={projetoId} onChange={(e) => setProjetoId(e.target.value)} pesquisavel>
                  <option value="">Escolha o projeto</option>
                  {(opcoes?.projetos ?? []).map((p) => (
                    <option key={p.id} value={String(p.id)}>
                      {p.nome}
                      {p.cliente ? ` · ${p.cliente}` : ""}
                    </option>
                  ))}
                </FieldSelect>
              </FieldGroup>
            )}
            <FieldGroup>
              <FieldLabel htmlFor="ref-pergunta">
                Pergunta do cliente<Required>*</Required>
              </FieldLabel>
              <FieldTextarea id="ref-pergunta" rows={2} value={pergunta} onChange={(e) => setPergunta(e.target.value)} placeholder="Ex.: Como lançar e escalar um app de saúde emocional no Brasil?" />
            </FieldGroup>
            <FieldGroup>
              <FieldLabel htmlFor="ref-recomendacao">
                Recomendação<Required>*</Required>
              </FieldLabel>
              <FieldTextarea id="ref-recomendacao" rows={2} value={recomendacao} onChange={(e) => setRecomendacao(e.target.value)} />
            </FieldGroup>
            <FieldGroup>
              <FieldLabel htmlFor="ref-porque">
                Por que se destacou<Required>*</Required>
              </FieldLabel>
              <FieldTextarea id="ref-porque" rows={3} value={porQue} onChange={(e) => setPorQue(e.target.value)} />
            </FieldGroup>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(14rem, 1fr))", gap: "1rem 0.75rem" }}>
              <FieldGroup>
                <FieldLabel htmlFor="ref-gestao">Gestão do projeto</FieldLabel>
                <FieldSelect id="ref-gestao" value={gestao} onChange={(e) => setGestao(e.target.value)}>
                  <option value="">Sem gestão</option>
                  {gestoesAte(opcoes?.gestao_atual ?? (gestao ? Number(gestao) : null)).map((n) => (
                    <option key={n} value={String(n)}>
                      {n}ª gestão
                    </option>
                  ))}
                </FieldSelect>
              </FieldGroup>
              <FieldGroup>
                <FieldLabel htmlFor="ref-nota">Nota ou selo (opcional)</FieldLabel>
                <FieldInput id="ref-nota" maxLength={200} value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ex.: Entre as 10 análises mais inovadoras do Diagnóstico" />
              </FieldGroup>
              <FieldGroup>
                <FieldLabel htmlFor="ref-link">Link das entregas (opcional)</FieldLabel>
                <FieldInput id="ref-link" maxLength={500} value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://" />
              </FieldGroup>
            </div>
            {atual && (
              <>
                <label style={{ display: "flex", gap: "0.375rem", alignItems: "center", fontSize: "0.8125rem" }}>
                  <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
                  Ativa (aparece na aba e conta na cobertura)
                </label>
                <FieldGroup>
                  <FieldLabel>Prévias (capa e páginas do deck)</FieldLabel>
                  {atual.anexos.length > 0 && (
                    <ListaSimples style={{ listStyle: "none", paddingLeft: 0 }}>
                      {atual.anexos.map((a) => (
                        <li key={a.id} style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                          <span>{a.legenda || a.nome}</span>
                          <PageButtonSm type="button" $variant="ghost" aria-label="Apagar prévia" onClick={() => apagar(a.id)}>
                            <Trash2 size={12} />
                          </PageButtonSm>
                        </li>
                      ))}
                    </ListaSimples>
                  )}
                  <Acoes>
                    <FieldInput aria-label="Legenda da prévia" maxLength={300} value={legenda} onChange={(e) => setLegenda(e.target.value)} placeholder="Legenda (ex.: Mapa de posicionamento)" style={{ flex: "1 1 14rem" }} />
                    <input ref={arquivoRef} type="file" multiple accept=".png,.jpg,.jpeg,.webp,.pdf" style={{ display: "none" }} onChange={(e) => anexar(e.target.files)} />
                    <PageButtonSm type="button" $variant="outline" disabled={salvando} onClick={() => arquivoRef.current?.click()}>
                      <Paperclip size={14} /> Enviar prévia
                    </PageButtonSm>
                  </Acoes>
                  <SecaoAjuda>Imagens ou PDF, até 20 MB cada.</SecaoAjuda>
                </FieldGroup>
              </>
            )}
            {erro && <FormErrorText>{erro}</FormErrorText>}
          </ModalBody>
          <ModalFooter>
            <PageButton type="button" $variant="outline" onClick={onFechar}>
              {atual && !referencia ? "Concluir" : "Cancelar"}
            </PageButton>
            <PageButton type="submit" disabled={salvando}>
              {salvando ? "Salvando…" : atual ? "Salvar" : "Criar e anexar prévias"}
            </PageButton>
          </ModalFooter>
        </form>
      </ModalContent>
    </ModalOverlay>
  );
}
