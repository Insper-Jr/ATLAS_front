import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  criarExMembro,
  editarExMembro,
  enviarFotoExMembro,
  removerFotoExMembro,
} from "@/lib/institucional";
import type { ExMembro, ExMembroPayload } from "@/types/institucional";
import {
  ModalBody,
  ModalClose,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  ModalTitle,
} from "@/styles/modal.styled";
import { PageButton } from "@/styles/page.styled";
import { FieldGroup, FieldInput, FieldLabel, FieldTextarea, FormErrorText, Required } from "@/pages/Bancas.styled";
import { FotoExMembro } from "./FotoExMembro";
import {
  CabecalhoIdiomas,
  CheckLinha,
  Dica,
  FormDuasColunas,
  FotoAcoes,
  FotoBloco,
  Idioma,
  Pilha,
} from "./Institucional.styled";

interface Props {
  /** `null` = novo cadastro. */
  exMembro: ExMembro | null;
  onSalvo: (salvo: ExMembro) => void;
  onFechar: () => void;
}

type Form = {
  nome: string;
  cargo_pt: string;
  cargo_en: string;
  area_pt: string;
  area_en: string;
  empresa: string;
  empresa_en: string;
  depoimento_pt: string;
  depoimento_en: string;
  linkedin: string;
  publicado: boolean;
};

const VAZIO: Form = {
  nome: "",
  cargo_pt: "",
  cargo_en: "",
  area_pt: "",
  area_en: "",
  empresa: "",
  empresa_en: "",
  depoimento_pt: "",
  depoimento_en: "",
  linkedin: "",
  publicado: true,
};

function deExMembro(m: ExMembro): Form {
  return {
    nome: m.nome,
    cargo_pt: m.cargo_pt,
    cargo_en: m.cargo_en ?? "",
    area_pt: m.area_pt ?? "",
    area_en: m.area_en ?? "",
    empresa: m.empresa,
    empresa_en: m.empresa_en ?? "",
    depoimento_pt: m.depoimento_pt ?? "",
    depoimento_en: m.depoimento_en ?? "",
    linkedin: m.linkedin ?? "",
    publicado: m.publicado,
  };
}

const ouNulo = (v: string) => (v.trim() ? v.trim() : null);

function paraPayload(f: Form): ExMembroPayload {
  return {
    nome: f.nome.trim(),
    cargo_pt: f.cargo_pt.trim(),
    cargo_en: ouNulo(f.cargo_en),
    area_pt: ouNulo(f.area_pt),
    area_en: ouNulo(f.area_en),
    empresa: f.empresa.trim(),
    empresa_en: ouNulo(f.empresa_en),
    depoimento_pt: ouNulo(f.depoimento_pt),
    depoimento_en: ouNulo(f.depoimento_en),
    linkedin: ouNulo(f.linkedin),
    publicado: f.publicado,
  };
}

/**
 * Cadastro/edição de um ex-membro do site. Duas colunas, PT e EN lado a
 * lado, porque o site é bilíngue e quem preenche costuma ter os dois textos
 * na mão; EN vazio não é erro — o site mostra o PT.
 *
 * A foto vai em chamada separada DEPOIS de salvar os dados (o backend só
 * aceita foto de registro que existe). Trocar a foto de um cadastro
 * existente também não espera o "Salvar": sobe na hora que o arquivo é
 * escolhido? Não — espera, pra "Cancelar" cancelar tudo mesmo.
 */
export function ExMembroModal({ exMembro, onSalvo, onFechar }: Props) {
  const { token } = useAuth();
  const [form, setForm] = useState<Form>(exMembro ? deExMembro(exMembro) : VAZIO);
  const [arquivoFoto, setArquivoFoto] = useState<File | null>(null);
  const [removerFoto, setRemoverFoto] = useState(false);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const inputFoto = useRef<HTMLInputElement>(null);

  // Object URL do preview local, derivado do arquivo; revogado quando troca
  // ou o modal fecha (senão a imagem fica presa na memória da aba).
  const preview = useMemo(() => (arquivoFoto ? URL.createObjectURL(arquivoFoto) : null), [arquivoFoto]);
  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !salvando) onFechar();
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [onFechar, salvando]);

  const campo = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  function escolherFoto(arquivo: File | undefined) {
    if (!arquivo) return;
    if (!arquivo.type.startsWith("image/")) {
      setErro("Escolha um arquivo de imagem (JPG ou PNG).");
      return;
    }
    setErro("");
    setArquivoFoto(arquivo);
    setRemoverFoto(false);
  }

  function tirarFoto() {
    setArquivoFoto(null);
    setRemoverFoto(Boolean(exMembro?.tem_foto));
    if (inputFoto.current) inputFoto.current.value = "";
  }

  const mostraFotoAtual = Boolean(exMembro?.tem_foto) && !removerFoto && !arquivoFoto;

  async function salvar(e: FormEvent) {
    e.preventDefault();
    if (!token || salvando) return;
    if (form.nome.trim().length < 2) return setErro("Informe o nome.");
    if (form.cargo_pt.trim().length < 2) return setErro("Informe o cargo em português.");
    if (!form.empresa.trim()) return setErro("Informe a empresa.");

    setSalvando(true);
    setErro("");
    try {
      const payload = paraPayload(form);
      let salvo = exMembro
        ? await editarExMembro(exMembro.id, payload, token)
        : await criarExMembro(payload, token);
      if (arquivoFoto) salvo = await enviarFotoExMembro(salvo.id, arquivoFoto, token);
      else if (removerFoto && exMembro?.tem_foto) salvo = await removerFotoExMembro(salvo.id, token);
      onSalvo(salvo);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <ModalOverlay onClick={() => !salvando && onFechar()} role="presentation">
      <ModalContent $expandido onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="ex-membro-titulo">
        <form onSubmit={salvar}>
          <ModalHeader>
            <ModalTitle id="ex-membro-titulo">{exMembro ? "Editar ex-membro" : "Novo ex-membro"}</ModalTitle>
            <ModalClose type="button" aria-label="Fechar" onClick={onFechar} disabled={salvando}>
              <X size={18} />
            </ModalClose>
          </ModalHeader>

          <ModalBody>
            <Pilha>
              <FotoBloco>
                <FotoExMembro
                  nome={form.nome || "?"}
                  fotoUrl={mostraFotoAtual ? exMembro?.foto_url : null}
                  tamanho={72}
                  previewUrl={preview}
                />
                <div>
                  <FotoAcoes>
                    <PageButton type="button" $variant="outline" onClick={() => inputFoto.current?.click()} disabled={salvando}>
                      {mostraFotoAtual || arquivoFoto ? "Trocar foto" : "Adicionar foto"}
                    </PageButton>
                    {(mostraFotoAtual || arquivoFoto) && (
                      <PageButton type="button" $variant="ghost" onClick={tirarFoto} disabled={salvando}>
                        Remover
                      </PageButton>
                    )}
                  </FotoAcoes>
                  <Dica>JPG ou PNG, qualquer tamanho: o servidor redimensiona. Sem foto, o site mostra as iniciais.</Dica>
                  <input
                    ref={inputFoto}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => escolherFoto(e.target.files?.[0])}
                  />
                </div>
              </FotoBloco>

              <FieldGroup>
                <FieldLabel htmlFor="exm-nome">
                  Nome completo<Required>*</Required>
                </FieldLabel>
                <FieldInput id="exm-nome" value={form.nome} onChange={(e) => campo("nome", e.target.value)} placeholder="Ex.: Maria Fernanda Melo" />
              </FieldGroup>

              <CabecalhoIdiomas>
                <Idioma>Português</Idioma>
                <Idioma>
                  English<small>opcional — vazio, o site mostra o PT</small>
                </Idioma>
              </CabecalhoIdiomas>

              <FormDuasColunas>
                <FieldGroup>
                  <FieldLabel htmlFor="exm-cargo-pt">
                    Cargo<Required>*</Required>
                  </FieldLabel>
                  <FieldInput id="exm-cargo-pt" value={form.cargo_pt} onChange={(e) => campo("cargo_pt", e.target.value)} placeholder="Ex.: Associate Consultant" />
                </FieldGroup>
                <FieldGroup>
                  <FieldLabel htmlFor="exm-cargo-en">Role</FieldLabel>
                  <FieldInput id="exm-cargo-en" value={form.cargo_en} onChange={(e) => campo("cargo_en", e.target.value)} placeholder="Ex.: Associate Consultant" />
                </FieldGroup>
              </FormDuasColunas>

              <FormDuasColunas>
                <FieldGroup>
                  <FieldLabel htmlFor="exm-area-pt">Área (opcional)</FieldLabel>
                  <FieldInput id="exm-area-pt" value={form.area_pt} onChange={(e) => campo("area_pt", e.target.value)} placeholder="Ex.: Investment Banking" />
                </FieldGroup>
                <FieldGroup>
                  <FieldLabel htmlFor="exm-area-en">Area</FieldLabel>
                  <FieldInput id="exm-area-en" value={form.area_en} onChange={(e) => campo("area_en", e.target.value)} placeholder="Ex.: Investment Banking" />
                </FieldGroup>
              </FormDuasColunas>

              <FormDuasColunas>
                <FieldGroup>
                  <FieldLabel htmlFor="exm-empresa">
                    Empresa<Required>*</Required>
                  </FieldLabel>
                  <FieldInput id="exm-empresa" value={form.empresa} onChange={(e) => campo("empresa", e.target.value)} placeholder="Ex.: Bain & Company" />
                </FieldGroup>
                <FieldGroup>
                  <FieldLabel htmlFor="exm-empresa-en">Company (só se o nome muda em inglês)</FieldLabel>
                  <FieldInput id="exm-empresa-en" value={form.empresa_en} onChange={(e) => campo("empresa_en", e.target.value)} placeholder="Ex.: Entrepreneurship" />
                </FieldGroup>
              </FormDuasColunas>

              <FormDuasColunas>
                <FieldGroup>
                  <FieldLabel htmlFor="exm-dep-pt">Depoimento (opcional)</FieldLabel>
                  <FieldTextarea id="exm-dep-pt" rows={6} value={form.depoimento_pt} onChange={(e) => campo("depoimento_pt", e.target.value)} placeholder="O que a Insper Jr representou na trajetória…" />
                </FieldGroup>
                <FieldGroup>
                  <FieldLabel htmlFor="exm-dep-en">Testimonial</FieldLabel>
                  <FieldTextarea id="exm-dep-en" rows={6} value={form.depoimento_en} onChange={(e) => campo("depoimento_en", e.target.value)} placeholder="Translation of the testimonial…" />
                </FieldGroup>
              </FormDuasColunas>

              <FormDuasColunas>
                <FieldGroup>
                  <FieldLabel htmlFor="exm-linkedin">LinkedIn (opcional)</FieldLabel>
                  <FieldInput id="exm-linkedin" value={form.linkedin} onChange={(e) => campo("linkedin", e.target.value)} placeholder="linkedin.com/in/perfil" />
                </FieldGroup>
                <FieldGroup>
                  <FieldLabel>Visibilidade</FieldLabel>
                  <CheckLinha>
                    <input type="checkbox" checked={form.publicado} onChange={(e) => campo("publicado", e.target.checked)} />
                    Publicado no site
                  </CheckLinha>
                </FieldGroup>
              </FormDuasColunas>

              {erro && <FormErrorText role="alert">{erro}</FormErrorText>}
            </Pilha>
          </ModalBody>

          <ModalFooter>
            <PageButton type="button" $variant="ghost" onClick={onFechar} disabled={salvando}>
              Cancelar
            </PageButton>
            <PageButton type="submit" disabled={salvando}>
              {salvando ? "Salvando…" : "Salvar"}
            </PageButton>
          </ModalFooter>
        </form>
      </ModalContent>
    </ModalOverlay>
  );
}
