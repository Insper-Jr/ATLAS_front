import { useEffect, useMemo, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getOpcoesCentral, indicarFicha, type FichaCompleta, type OpcoesCentral } from "@/lib/central";
import { MultiSelect } from "@/components/MultiSelect";
import { ROTULO_POSICAO } from "@/utils/permissoes";
import { PageButton } from "@/styles/page.styled";
import { ModalBody, ModalClose, ModalContent, ModalFooter, ModalHeader, ModalOverlay, ModalTitle } from "@/styles/modal.styled";
import {
  FieldGroup,
  FieldInput,
  FieldLabel,
  FieldSelect,
  FieldTextarea,
  FormErrorText,
  Required,
} from "@/pages/Bancas.styled";
import { SecaoAjuda } from "./Central.styled";

interface Props {
  onFechar: () => void;
  onIndicada: (ficha: FichaCompleta) => Promise<void> | void;
}

const OUTRO = "__outro__";

/**
 * "Nova indicação": o que está sendo indicado, tipo, projeto, frente,
 * escopo, autores e por que se destacou. O gerente da frente decide a
 * pertinência; gerente da própria frente e quem gere a Central pulam essa
 * etapa (regra do backend).
 */
export function ModalIndicacao({ onFechar, onIndicada }: Props) {
  const { token } = useAuth();
  const [opcoes, setOpcoes] = useState<OpcoesCentral | null>(null);
  const [titulo, setTitulo] = useState("");
  const [tipos, setTipos] = useState<string[]>(["metodologia"]);
  const [projetoId, setProjetoId] = useState<string>("");
  const [projetoTexto, setProjetoTexto] = useState("");
  const [frenteId, setFrenteId] = useState<string>("");
  const [escopoId, setEscopoId] = useState<string>("");
  const [escopoTexto, setEscopoTexto] = useState("");
  const [autores, setAutores] = useState<string[]>([]);
  const [porQue, setPorQue] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!token) return;
    let vivo = true;
    getOpcoesCentral(token)
      .then((o) => {
        if (!vivo) return;
        setOpcoes(o);
        if (o.frentes.length > 0) setFrenteId(String(o.frentes[0].id));
      })
      .catch((err) => vivo && setErro(err instanceof Error ? err.message : "Erro ao carregar as opções"));
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

  const escoposDaFrente = useMemo(
    () => (opcoes?.escopos ?? []).filter((e) => (frenteId ? String(e.frente_id) === frenteId : true)),
    [opcoes, frenteId],
  );
  const categorias = useMemo(
    () => (opcoes?.categorias ?? []).filter((c) => c.ativa).map((c) => ({ value: c.chave, label: c.nome })),
    [opcoes],
  );

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    if (titulo.trim().length < 3) {
      setErro("Diga o que você está indicando.");
      return;
    }
    if (tipos.length === 0) {
      setErro("Escolha pelo menos uma categoria.");
      return;
    }
    if (porQue.trim().length < 10) {
      setErro("Conte em até duas linhas por que se destacou.");
      return;
    }
    setErro("");
    setSalvando(true);
    try {
      const ficha = await indicarFicha(
        {
          titulo: titulo.trim(),
          tipos,
          por_que_se_destacou: porQue.trim(),
          frente_id: frenteId ? Number(frenteId) : null,
          escopo_id: escopoId && escopoId !== OUTRO ? Number(escopoId) : null,
          escopo_texto: escopoId === OUTRO ? escopoTexto.trim() || null : null,
          projeto_id: projetoId && projetoId !== OUTRO ? Number(projetoId) : null,
          projeto_texto: projetoId === OUTRO ? projetoTexto.trim() || null : null,
          autores_ids: autores.map(Number),
          via: "avulsa",
        },
        token,
      );
      await onIndicada(ficha);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível enviar a indicação");
      setSalvando(false);
    }
  }

  return (
    <ModalOverlay onMouseDown={onFechar}>
      <ModalContent $expandido onMouseDown={(e) => e.stopPropagation()} style={{ maxWidth: "40rem" }}>
        <form onSubmit={enviar}>
          <ModalHeader>
            <div>
              <ModalTitle>Nova indicação</ModalTitle>
              <SecaoAjuda style={{ marginTop: "0.25rem" }}>
                O gerente da frente decide se vale ter uma ficha. Depois, os autores escrevem como fizeram e o
                diretor revisa.
              </SecaoAjuda>
            </div>
            <ModalClose type="button" aria-label="Fechar" onClick={onFechar}>
              <X size={16} />
            </ModalClose>
          </ModalHeader>

          <ModalBody style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <FieldGroup>
              <FieldLabel htmlFor="ind-titulo">
                O que você está indicando<Required>*</Required>
              </FieldLabel>
              <FieldInput
                id="ind-titulo"
                autoFocus
                maxLength={200}
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ex.: matriz de forças dispersas entre concorrentes"
              />
            </FieldGroup>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(14rem, 1fr))", gap: "1rem 0.75rem" }}>
              <FieldGroup>
                <FieldLabel>
                  Categoria<Required>*</Required>
                </FieldLabel>
                <MultiSelect
                  valores={tipos}
                  onChange={setTipos}
                  opcoes={categorias}
                  rotuloVazio="Escolha a categoria"
                  resumo={(n) => `${n} categorias`}
                  aria-label="Categoria da indicação"
                />
              </FieldGroup>
              <FieldGroup>
                <FieldLabel htmlFor="ind-projeto">Projeto</FieldLabel>
                <FieldSelect id="ind-projeto" value={projetoId} onChange={(e) => setProjetoId(e.target.value)} pesquisavel>
                  <option value="">Sem projeto</option>
                  {(opcoes?.projetos ?? []).map((p) => (
                    <option key={p.id} value={String(p.id)}>
                      {p.nome}
                      {p.cliente ? ` · ${p.cliente}` : ""}
                    </option>
                  ))}
                  <option value={OUTRO}>Outro (escrever o nome)</option>
                </FieldSelect>
                {projetoId === OUTRO && (
                  <FieldInput
                    aria-label="Nome do projeto"
                    maxLength={120}
                    value={projetoTexto}
                    onChange={(e) => setProjetoTexto(e.target.value)}
                    placeholder="Ex.: Trancoso I (45ª)"
                    style={{ marginTop: "0.375rem" }}
                  />
                )}
              </FieldGroup>
              <FieldGroup>
                <FieldLabel htmlFor="ind-frente">Frente</FieldLabel>
                <FieldSelect
                  id="ind-frente"
                  value={frenteId}
                  onChange={(e) => {
                    setFrenteId(e.target.value);
                    setEscopoId("");
                  }}
                >
                  {(opcoes?.frentes ?? []).map((f) => (
                    <option key={f.id} value={String(f.id)}>
                      {f.nome}
                    </option>
                  ))}
                  <option value="">Transversal (vale para todas)</option>
                </FieldSelect>
              </FieldGroup>
              <FieldGroup>
                <FieldLabel htmlFor="ind-escopo">Escopo</FieldLabel>
                <FieldSelect id="ind-escopo" value={escopoId} onChange={(e) => setEscopoId(e.target.value)}>
                  <option value="">Sem escopo</option>
                  {escoposDaFrente.map((e) => (
                    <option key={e.id} value={String(e.id)}>
                      {e.nome}
                    </option>
                  ))}
                  <option value={OUTRO}>Outro (escrever)</option>
                </FieldSelect>
                {escopoId === OUTRO && (
                  <FieldInput
                    aria-label="Nome do escopo"
                    maxLength={120}
                    value={escopoTexto}
                    onChange={(e) => setEscopoTexto(e.target.value)}
                    placeholder="Ex.: Retomada mercadológica"
                    style={{ marginTop: "0.375rem" }}
                  />
                )}
              </FieldGroup>
            </div>

            <FieldGroup>
              <FieldLabel>Autores</FieldLabel>
              <MultiSelect
                valores={autores}
                onChange={setAutores}
                opcoes={(opcoes?.membros ?? []).map((m) => ({
                  value: String(m.id),
                  label: `${m.nome} · ${ROTULO_POSICAO[m.posicao as keyof typeof ROTULO_POSICAO] ?? m.posicao}`,
                }))}
                rotuloVazio="Consultores que desenvolveram"
                resumo={(n) => `${n} autores`}
                aria-label="Autores"
                pesquisavel
              />
              <SecaoAjuda>Pode deixar em branco: o coordenador confirma os autores depois.</SecaoAjuda>
            </FieldGroup>

            <FieldGroup>
              <FieldLabel htmlFor="ind-porque">
                Por que se destacou<Required>*</Required>
              </FieldLabel>
              <FieldTextarea
                id="ind-porque"
                rows={3}
                value={porQue}
                onChange={(e) => setPorQue(e.target.value)}
                placeholder="Em até duas linhas: o que essa peça resolve e por que outros projetos deveriam conhecê-la"
              />
            </FieldGroup>

            {erro && <FormErrorText>{erro}</FormErrorText>}
          </ModalBody>

          <ModalFooter>
            <PageButton type="button" $variant="outline" onClick={onFechar}>
              Cancelar
            </PageButton>
            <PageButton type="submit" disabled={salvando || !opcoes}>
              {salvando ? "Enviando…" : "Enviar para o gerente"}
            </PageButton>
          </ModalFooter>
        </form>
      </ModalContent>
    </ModalOverlay>
  );
}
