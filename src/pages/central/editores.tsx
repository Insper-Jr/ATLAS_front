import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, Paperclip, Plus, Trash2, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  apagarArquivoConteudo,
  atualizarConteudo,
  enviarArquivoConteudo,
  restaurarConteudo,
  type ArquivoConteudo,
  type ChaveConteudo,
  type Conteudo,
  type Ficha,
} from "@/lib/central";
import { mover } from "./editores-util";
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
  FieldSelect,
  FieldTextarea,
  FormErrorText,
} from "@/pages/Bancas.styled";
import {
  Acoes,
  FichaCard,
  ListaSimples,
  Meta,
  SecaoAjuda,
  SecaoTitulo,
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

/** Escolhe um arquivo já enviado pelo nome (guarda o id). */
export function SeletorArquivo({
  rotulo,
  valor,
  onChange,
  arquivos,
  apenasImagens = false,
}: {
  rotulo: string;
  valor: number | null;
  onChange: (id: number | null) => void;
  arquivos: ArquivoConteudo[];
  apenasImagens?: boolean;
}) {
  const lista = arquivos.filter((a) => !apenasImagens || a.imagem);
  return (
    <Campo rotulo={rotulo}>
      <FieldSelect
        value={valor ? String(valor) : ""}
        onChange={(e) =>
          onChange(e.target.value ? Number(e.target.value) : null)
        }
      >
        <option value="">Nenhum</option>
        {lista.map((a) => (
          <option key={a.id} value={String(a.id)}>
            {a.legenda ? `${a.legenda} (${a.nome})` : a.nome}
          </option>
        ))}
      </FieldSelect>
    </Campo>
  );
}

/** Escolhe várias imagens já enviadas (guarda os ids). */
export function SeletorImagens({
  rotulo,
  ids,
  onChange,
  arquivos,
}: {
  rotulo: string;
  ids: number[];
  onChange: (ids: number[]) => void;
  arquivos: ArquivoConteudo[];
}) {
  const imagens = arquivos.filter((a) => a.imagem);
  return (
    <Campo
      rotulo={rotulo}
      ajuda={
        imagens.length === 0
          ? "Envie as imagens na seção Arquivos, acima."
          : undefined
      }
    >
      <MultiSelect
        valores={ids.map(String)}
        onChange={(v) => onChange(v.map(Number))}
        opcoes={imagens.map((a) => ({
          value: String(a.id),
          label: a.legenda ? `${a.legenda} (${a.nome})` : a.nome,
        }))}
        rotuloVazio="Nenhuma prévia"
        resumo={(n) => `${n} prévias`}
        aria-label={rotulo}
      />
    </Campo>
  );
}

/** Os arquivos da vitrine: enviar, legendar e apagar. */
export function ArquivosVitrine({
  chave,
  arquivos,
  onChange,
  aceita,
  ajuda,
}: {
  chave: ChaveConteudo;
  arquivos: ArquivoConteudo[];
  onChange: (a: ArquivoConteudo[]) => void;
  aceita: string;
  ajuda: string;
}) {
  const { token } = useAuth();
  const [legenda, setLegenda] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  async function enviar(lista: FileList | null) {
    if (!token || !lista) return;
    setEnviando(true);
    setErro("");
    try {
      const novos: ArquivoConteudo[] = [];
      for (const arquivo of Array.from(lista))
        novos.push(await enviarArquivoConteudo(chave, arquivo, legenda, token));
      onChange([...arquivos, ...novos]);
      setLegenda("");
      if (ref.current) ref.current.value = "";
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível enviar");
    } finally {
      setEnviando(false);
    }
  }

  async function apagar(id: number) {
    if (!token) return;
    try {
      await apagarArquivoConteudo(id, token);
      onChange(arquivos.filter((a) => a.id !== id));
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível apagar");
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
      <SecaoTitulo style={{ fontSize: "0.875rem" }}>Arquivos</SecaoTitulo>
      <SecaoAjuda>{ajuda}</SecaoAjuda>
      {arquivos.length > 0 && (
        <ListaSimples style={{ listStyle: "none", paddingLeft: 0 }}>
          {arquivos.map((a) => (
            <li
              key={a.id}
              style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}
            >
              <span>
                {a.legenda ? `${a.legenda} · ` : ""}
                {a.nome}
              </span>
              <PageButtonSm
                type="button"
                $variant="ghost"
                aria-label="Apagar arquivo"
                onClick={() => apagar(a.id)}
              >
                <Trash2 size={12} />
              </PageButtonSm>
            </li>
          ))}
        </ListaSimples>
      )}
      <Acoes>
        <FieldInput
          aria-label="Legenda"
          maxLength={300}
          value={legenda}
          onChange={(e) => setLegenda(e.target.value)}
          placeholder="Legenda do próximo arquivo (opcional)"
          style={{ flex: "1 1 14rem" }}
        />
        <input
          ref={ref}
          type="file"
          multiple
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
          <Paperclip size={14} /> {enviando ? "Enviando…" : "Enviar arquivo"}
        </PageButtonSm>
      </Acoes>
      {erro && <FormErrorText>{erro}</FormErrorText>}
    </div>
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
