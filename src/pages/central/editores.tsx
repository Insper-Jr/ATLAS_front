import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, Paperclip, Plus, Trash2, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  atualizarConteudo,
  editarLegendaArquivoConteudo,
  enviarArquivoConteudo,
  restaurarConteudo,
  type ArquivoConteudo,
  type ChaveConteudo,
  type Conteudo,
  type Ficha,
} from "@/lib/central";
import { mover, useMiniatura } from "./editores-util";
import { MultiSelect } from "@/components/MultiSelect";
import { PageButton, PageButtonSm } from "@/styles/page.styled";
import {
  ModalBody,
  ModalClose,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  ModalTitle,
} from "@/styles/modal.styled";
import {
  FieldGroup,
  FieldInput,
  FieldLabel,
  FieldTextarea,
  FormErrorText,
} from "@/pages/Bancas.styled";
import {
  Acoes,
  FichaCard,
  GradeMiniaturas,
  Meta,
  Miniatura,
  SecaoAjuda,
} from "./Central.styled";

/* ------------------------------------------------------------------ */
/* Peças compartilhadas pelos editores das vitrines                     */
/* ------------------------------------------------------------------ */

export function Campo({
  rotulo,
  children,
  ajuda,
}: {
  rotulo: string;
  children: ReactNode;
  ajuda?: string;
}) {
  return (
    <FieldGroup>
      <FieldLabel>{rotulo}</FieldLabel>
      {children}
      {ajuda && <SecaoAjuda>{ajuda}</SecaoAjuda>}
    </FieldGroup>
  );
}

export function Texto({
  rotulo,
  valor,
  onChange,
  placeholder,
  ajuda,
}: {
  rotulo: string;
  valor: string;
  onChange: (v: string) => void;
  placeholder?: string;
  ajuda?: string;
}) {
  return (
    <Campo rotulo={rotulo} ajuda={ajuda}>
      <FieldInput
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </Campo>
  );
}

export function TextoLongo({
  rotulo,
  valor,
  onChange,
  linhas = 2,
  placeholder,
  ajuda,
}: {
  rotulo: string;
  valor: string;
  onChange: (v: string) => void;
  linhas?: number;
  placeholder?: string;
  ajuda?: string;
}) {
  return (
    <Campo rotulo={rotulo} ajuda={ajuda}>
      <FieldTextarea
        rows={linhas}
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </Campo>
  );
}

export function Numero({
  rotulo,
  valor,
  onChange,
  placeholder,
}: {
  rotulo: string;
  valor: number | null;
  onChange: (v: number | null) => void;
  placeholder?: string;
}) {
  return (
    <Campo rotulo={rotulo}>
      <FieldInput
        type="number"
        min={1}
        value={valor ?? ""}
        onChange={(e) =>
          onChange(e.target.value ? Number(e.target.value) : null)
        }
        placeholder={placeholder}
      />
    </Campo>
  );
}

/** Lista de textos curtos: um campo por linha, com adicionar, remover e reordenar. */
export function ListaTextos({
  rotulo,
  itens,
  onChange,
  placeholder,
  ajuda,
}: {
  rotulo: string;
  itens: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  ajuda?: string;
}) {
  return (
    <Campo rotulo={rotulo} ajuda={ajuda}>
      <div
        style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}
      >
        {itens.map((item, i) => (
          <div
            key={i}
            style={{ display: "flex", gap: "0.375rem", alignItems: "center" }}
          >
            <FieldInput
              value={item}
              onChange={(e) =>
                onChange(itens.map((x, j) => (j === i ? e.target.value : x)))
              }
              placeholder={placeholder}
              style={{ flex: 1 }}
            />
            <BotoesItem
              onSubir={() => onChange(mover(itens, i, -1))}
              onDescer={() => onChange(mover(itens, i, 1))}
              onRemover={() => onChange(itens.filter((_, j) => j !== i))}
            />
          </div>
        ))}
        <div>
          <PageButtonSm
            type="button"
            $variant="outline"
            onClick={() => onChange([...itens, ""])}
          >
            <Plus size={14} /> Adicionar
          </PageButtonSm>
        </div>
      </div>
    </Campo>
  );
}

export function BotoesItem({
  onSubir,
  onDescer,
  onRemover,
}: {
  onSubir?: () => void;
  onDescer?: () => void;
  onRemover: () => void;
}) {
  return (
    <span style={{ display: "inline-flex", gap: "0.125rem", flex: "0 0 auto" }}>
      {onSubir && (
        <PageButtonSm
          type="button"
          $variant="ghost"
          aria-label="Subir"
          onClick={onSubir}
        >
          <ArrowUp size={14} />
        </PageButtonSm>
      )}
      {onDescer && (
        <PageButtonSm
          type="button"
          $variant="ghost"
          aria-label="Descer"
          onClick={onDescer}
        >
          <ArrowDown size={14} />
        </PageButtonSm>
      )}
      <PageButtonSm
        type="button"
        $variant="ghost"
        aria-label="Remover"
        onClick={onRemover}
      >
        <Trash2 size={14} />
      </PageButtonSm>
    </span>
  );
}

/** Um bloco de item (um escopo, uma aula, um curso) com cabeçalho e botões. */
export function Bloco({
  titulo,
  children,
  onSubir,
  onDescer,
  onRemover,
  aberto = true,
}: {
  titulo: string;
  children: ReactNode;
  onSubir?: () => void;
  onDescer?: () => void;
  onRemover: () => void;
  aberto?: boolean;
}) {
  const [mostrar, setMostrar] = useState(aberto);
  return (
    <FichaCard style={{ gap: "0.5rem" }}>
      <Meta style={{ justifyContent: "space-between", alignItems: "center" }}>
        <button
          type="button"
          onClick={() => setMostrar((m) => !m)}
          style={{
            all: "unset",
            cursor: "pointer",
            fontWeight: 600,
            color: "var(--atlas-foreground)",
          }}
        >
          {mostrar ? "▾" : "▸"} {titulo || "Sem título"}
        </button>
        <BotoesItem
          onSubir={onSubir}
          onDescer={onDescer}
          onRemover={onRemover}
        />
      </Meta>
      {mostrar && (
        <div
          style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
        >
          {children}
        </div>
      )}
    </FichaCard>
  );
}

/** Escolhe fichas publicadas pelo nome (guarda os ids). */
export function SeletorFichas({
  rotulo,
  ids,
  onChange,
  fichas,
}: {
  rotulo: string;
  ids: number[];
  onChange: (ids: number[]) => void;
  fichas: Ficha[];
}) {
  return (
    <Campo rotulo={rotulo}>
      <MultiSelect
        valores={ids.map(String)}
        onChange={(v) => onChange(v.map(Number))}
        opcoes={fichas.map((f) => ({
          value: String(f.id),
          label: `${f.codigo} · ${f.titulo}`,
        }))}
        rotuloVazio="Nenhuma ficha relacionada"
        resumo={(n) => `${n} fichas`}
        aria-label={rotulo}
        pesquisavel
      />
    </Campo>
  );
}

/** Tamanho legível de um arquivo. */
function tamanhoLegivel(bytes: number): string {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  if (bytes >= 1_000) return `${Math.round(bytes / 1_000)} KB`;
  return `${bytes} B`;
}

/**
 * Um arquivo só (o Playbook, a aula completa), enviado direto daqui
 * (2026-10-30, a pedido: acabou a lista separada de arquivos em que a
 * pessoa enviava tudo e depois escolhia pelo nome). O arquivo novo entra
 * em `arquivos` e vira o valor do campo na hora.
 */
export function CampoArquivo({
  rotulo,
  chave,
  valor,
  onChange,
  arquivos,
  onArquivos,
  aceita,
  ajuda,
}: {
  rotulo: string;
  chave: ChaveConteudo;
  valor: number | null;
  onChange: (id: number | null) => void;
  arquivos: ArquivoConteudo[];
  onArquivos: (a: ArquivoConteudo[]) => void;
  aceita: string;
  ajuda?: string;
}) {
  const { token } = useAuth();
  const ref = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const atual = arquivos.find((a) => a.id === valor) ?? null;

  async function enviar(lista: FileList | null) {
    const arquivo = lista?.[0];
    if (!token || !arquivo) return;
    setEnviando(true);
    setErro("");
    try {
      const novo = await enviarArquivoConteudo(chave, arquivo, "", token);
      onArquivos([...arquivos, novo]);
      onChange(novo.id);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível enviar");
    } finally {
      setEnviando(false);
      if (ref.current) ref.current.value = "";
    }
  }

  return (
    <Campo rotulo={rotulo} ajuda={ajuda}>
      <Acoes>
        {atual ? (
          <span style={{ fontSize: "0.875rem" }}>
            <Paperclip size={12} style={{ verticalAlign: "-2px" }} /> {atual.nome}
            <span style={{ color: "var(--atlas-muted-foreground)" }}> · {tamanhoLegivel(atual.tamanho)}</span>
          </span>
        ) : (
          <SecaoAjuda>Nenhum arquivo enviado.</SecaoAjuda>
        )}
        <input
          ref={ref}
          type="file"
          accept={aceita}
          style={{ display: "none" }}
          onChange={(e) => enviar(e.target.files)}
        />
        <PageButtonSm
          type="button"
          $variant="outline"
          disabled={enviando}
          onClick={() => ref.current?.click()}
        >
          {enviando ? "Enviando…" : atual ? "Trocar arquivo" : "Enviar arquivo"}
        </PageButtonSm>
        {atual && (
          <PageButtonSm type="button" $variant="ghost" onClick={() => onChange(null)}>
            <Trash2 size={14} /> Remover
          </PageButtonSm>
        )}
      </Acoes>
      {erro && <FormErrorText>{erro}</FormErrorText>}
    </Campo>
  );
}

/** Miniatura de uma imagem protegida, com a legenda editável embaixo. */
function MiniaturaEditavel({
  arquivo,
  onLegenda,
  onSubir,
  onDescer,
  onRemover,
}: {
  arquivo: ArquivoConteudo;
  onLegenda: (legenda: string) => void;
  onSubir?: () => void;
  onDescer?: () => void;
  onRemover: () => void;
}) {
  const { token } = useAuth();
  const url = useMiniatura(arquivo, token);
  const [legenda, setLegenda] = useState(arquivo.legenda ?? "");
  return (
    <Miniatura>
      <div className="imagem">{url ? <img src={url} alt={arquivo.legenda ?? arquivo.nome} /> : <span>…</span>}</div>
      <FieldInput
        aria-label={`Legenda de ${arquivo.nome}`}
        maxLength={300}
        value={legenda}
        placeholder="Legenda (opcional)"
        onChange={(e) => setLegenda(e.target.value)}
        onBlur={() => {
          if (legenda.trim() !== (arquivo.legenda ?? "")) onLegenda(legenda);
        }}
      />
      <div className="acoes">
        <BotoesItem onSubir={onSubir} onDescer={onDescer} onRemover={onRemover} />
      </div>
    </Miniatura>
  );
}

/**
 * As imagens de um item (as prévias de uma aula), enviadas direto daqui.
 * Cada uma mostra a miniatura, a legenda editável e os botões de ordem.
 */
export function CampoImagens({
  rotulo,
  chave,
  ids,
  onChange,
  arquivos,
  onArquivos,
  ajuda,
}: {
  rotulo: string;
  chave: ChaveConteudo;
  ids: number[];
  onChange: (ids: number[]) => void;
  arquivos: ArquivoConteudo[];
  onArquivos: (a: ArquivoConteudo[]) => void;
  ajuda?: string;
}) {
  const { token } = useAuth();
  const ref = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const escolhidas = ids
    .map((id) => arquivos.find((a) => a.id === id))
    .filter((a): a is ArquivoConteudo => !!a);

  async function enviar(lista: FileList | null) {
    if (!token || !lista || lista.length === 0) return;
    setEnviando(true);
    setErro("");
    try {
      const novos: ArquivoConteudo[] = [];
      for (const arquivo of Array.from(lista)) novos.push(await enviarArquivoConteudo(chave, arquivo, "", token));
      onArquivos([...arquivos, ...novos]);
      onChange([...ids, ...novos.map((n) => n.id)]);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível enviar");
    } finally {
      setEnviando(false);
      if (ref.current) ref.current.value = "";
    }
  }

  async function legendar(arquivo: ArquivoConteudo, legenda: string) {
    if (!token) return;
    try {
      const atualizado = await editarLegendaArquivoConteudo(arquivo.id, legenda, token);
      onArquivos(arquivos.map((a) => (a.id === arquivo.id ? atualizado : a)));
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível salvar a legenda");
    }
  }

  return (
    <Campo rotulo={rotulo} ajuda={ajuda}>
      {escolhidas.length > 0 && (
        <GradeMiniaturas>
          {escolhidas.map((a, i) => (
            <MiniaturaEditavel
              key={a.id}
              arquivo={a}
              onLegenda={(l) => legendar(a, l)}
              onSubir={() => onChange(mover(ids, i, -1))}
              onDescer={() => onChange(mover(ids, i, 1))}
              onRemover={() => onChange(ids.filter((id) => id !== a.id))}
            />
          ))}
        </GradeMiniaturas>
      )}
      <Acoes>
        <input
          ref={ref}
          type="file"
          multiple
          accept=".png,.jpg,.jpeg,.webp"
          style={{ display: "none" }}
          onChange={(e) => enviar(e.target.files)}
        />
        <PageButtonSm
          type="button"
          $variant="outline"
          disabled={enviando}
          onClick={() => ref.current?.click()}
        >
          <Paperclip size={14} /> {enviando ? "Enviando…" : "Enviar imagens"}
        </PageButtonSm>
      </Acoes>
      {erro && <FormErrorText>{erro}</FormErrorText>}
    </Campo>
  );
}

/**
 * A casca do editor de uma vitrine: modal largo, rodapé com salvar,
 * cancelar e restaurar o padrão. Cada vitrine passa os campos como filhos
 * e o `dados` já editado.
 */
export function ModalEditor<T>({
  chave,
  titulo,
  conteudo,
  dados,
  onFechar,
  onSalvo,
  children,
}: {
  chave: ChaveConteudo;
  titulo: string;
  conteudo: Conteudo<T>;
  dados: T;
  onFechar: () => void;
  onSalvo: (novo: Conteudo<T>) => void;
  children: ReactNode;
}) {
  const { token } = useAuth();
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") onFechar();
    }
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [onFechar]);

  async function salvar() {
    if (!token) return;
    setSalvando(true);
    setErro("");
    try {
      onSalvo(await atualizarConteudo<T>(chave, dados, token));
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível salvar");
      setSalvando(false);
    }
  }

  async function restaurar() {
    if (!token) return;
    if (
      !window.confirm(
        "Voltar ao conteúdo padrão? O que foi editado nesta vitrine será perdido.",
      )
    )
      return;
    setSalvando(true);
    try {
      onSalvo(await restaurarConteudo<T>(chave, token));
    } catch (err) {
      setErro(
        err instanceof Error ? err.message : "Não foi possível restaurar",
      );
      setSalvando(false);
    }
  }

  return (
    <ModalOverlay onMouseDown={onFechar}>
      <ModalContent
        $expandido
        onMouseDown={(e) => e.stopPropagation()}
        style={{ maxWidth: "64rem" }}
      >
        <ModalHeader>
          <ModalTitle>Editar {titulo}</ModalTitle>
          <ModalClose type="button" aria-label="Fechar" onClick={onFechar}>
            <X size={16} />
          </ModalClose>
        </ModalHeader>
        <ModalBody
          style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
        >
          {children}
          {erro && <FormErrorText>{erro}</FormErrorText>}
        </ModalBody>
        <ModalFooter>
          {!conteudo.padrao && (
            <PageButton
              type="button"
              $variant="ghost"
              disabled={salvando}
              onClick={restaurar}
            >
              Restaurar o padrão
            </PageButton>
          )}
          <PageButton type="button" $variant="outline" onClick={onFechar}>
            Cancelar
          </PageButton>
          <PageButton type="button" disabled={salvando} onClick={salvar}>
            {salvando ? "Salvando…" : "Salvar"}
          </PageButton>
        </ModalFooter>
      </ModalContent>
    </ModalOverlay>
  );
}
