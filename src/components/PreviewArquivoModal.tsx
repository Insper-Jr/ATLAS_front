import { useEffect, useState } from "react";
import { Download, ExternalLink, X } from "lucide-react";
import { urlParaAbrir } from "@/lib/arquivos";
import styled from "styled-components";
import { theme } from "@/styles/theme";
import { ModalOverlay } from "@/styles/ModalOverlay";
import { ModalBody, ModalClose, ModalContent, ModalFooter, ModalHeader, ModalTitle } from "@/styles/modal.styled";
import { EmptyText, ErrorText, PageButton, PageLoadingBlock } from "@/styles/page.styled";

const Quadro = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 16rem;
  max-height: 70vh;
  overflow: auto;
  border-radius: ${theme.borderRadius.lg};
  background: ${theme.colors.muted};
`;

const Imagem = styled.img`
  max-width: 100%;
  max-height: 70vh;
  object-fit: contain;
`;

const Pdf = styled.iframe`
  width: 100%;
  height: 70vh;
  border: 0;
  background: ${theme.colors.background};
`;

/** A planilha renderizada como tabela (2026-11-17): uma aba por folha. */
const Planilha = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 70vh;

  .abas {
    display: flex;
    gap: 0.25rem;
    flex-wrap: wrap;
  }

  .abas button {
    border: 1px solid ${theme.colors.border};
    background: transparent;
    color: ${theme.colors.mutedForeground};
    border-radius: 999px;
    padding: 0.2rem 0.7rem;
    font-size: ${theme.fontSize.xs};
    cursor: pointer;
  }

  .abas button.ativa {
    background: ${theme.colors.foreground};
    color: ${theme.colors.background};
    border-color: ${theme.colors.foreground};
  }

  .rolagem {
    overflow: auto;
    border: 1px solid ${theme.colors.border};
    border-radius: ${theme.borderRadius.lg};
    max-height: 64vh;
  }

  table {
    border-collapse: collapse;
    font-size: ${theme.fontSize.xs};
    min-width: 100%;
  }

  td,
  th {
    border: 1px solid ${theme.colors.border};
    padding: 0.25rem 0.5rem;
    white-space: nowrap;
    max-width: 24rem;
    overflow: hidden;
    text-overflow: ellipsis;
    text-align: left;
    vertical-align: top;
  }

  th {
    position: sticky;
    top: 0;
    background: ${theme.colors.muted};
    color: ${theme.colors.mutedForeground};
    font-weight: ${theme.fontWeight.semibold};
    z-index: 1;
  }

  td:first-child,
  th:first-child {
    color: ${theme.colors.mutedForeground};
    background: ${theme.colors.muted};
    text-align: right;
    position: sticky;
    left: 0;
  }

  small {
    color: ${theme.colors.mutedForeground};
    font-size: ${theme.fontSize.xs};
  }
`;

/** O Word convertido em HTML simples (2026-11-17). */
const Documento = styled.div`
  max-height: 70vh;
  overflow: auto;
  padding: 1.25rem 1.5rem;
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.borderRadius.lg};
  background: ${theme.colors.background};
  font-size: ${theme.fontSize.sm};
  line-height: 1.55;

  h1,
  h2,
  h3 {
    margin: 1rem 0 0.5rem;
  }

  p {
    margin: 0 0 0.6rem;
  }

  table {
    border-collapse: collapse;
    margin: 0.5rem 0;
  }

  td,
  th {
    border: 1px solid ${theme.colors.border};
    padding: 0.25rem 0.5rem;
  }

  img {
    max-width: 100%;
  }
`;

type Tipo = "imagem" | "pdf" | "planilha" | "word" | "outro";

function tipoDoArquivo(nome: string, mime: string): Tipo {
  const ext = nome.toLowerCase().split(".").pop() ?? "";
  if (mime.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) return "imagem";
  if (mime === "application/pdf" || ext === "pdf") return "pdf";
  if (["xlsx", "xlsm", "xls", "csv"].includes(ext)) return "planilha";
  if (ext === "docx") return "word";
  return "outro";
}

type Folha = { nome: string; linhas: string[][] };

const MAX_LINHAS = 500;
const MAX_COLUNAS = 60;

async function lerPlanilha(buffer: ArrayBuffer): Promise<Folha[]> {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(buffer, { type: "array", cellDates: true });
  return wb.SheetNames.map((nome) => {
    const ws = wb.Sheets[nome];
    const linhas = (XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, raw: false, defval: "" }) as unknown[][])
      .slice(0, MAX_LINHAS)
      .map((l) => l.slice(0, MAX_COLUNAS).map((c) => (c == null ? "" : String(c))));
    return { nome, linhas };
  });
}

async function lerWord(buffer: ArrayBuffer): Promise<string> {
  const mammoth = await import("mammoth");
  const { value } = await mammoth.convertToHtml({ arrayBuffer: buffer });
  return value;
}

function Tabela({ folhas }: { folhas: Folha[] }) {
  const [ativa, setAtiva] = useState(0);
  const folha = folhas[ativa] ?? folhas[0];
  if (!folha) return <EmptyText>A planilha está vazia.</EmptyText>;
  const colunas = folha.linhas.reduce((m, l) => Math.max(m, l.length), 0);
  return (
    <Planilha>
      {folhas.length > 1 && (
        <div className="abas">
          {folhas.map((f, i) => (
            <button key={f.nome} type="button" className={i === ativa ? "ativa" : ""} onClick={() => setAtiva(i)}>
              {f.nome}
            </button>
          ))}
        </div>
      )}
      <div className="rolagem">
        <table>
          <thead>
            <tr>
              <th />
              {Array.from({ length: colunas }, (_, i) => (
                <th key={i}>{colunaLetra(i)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {folha.linhas.map((l, i) => (
              <tr key={i}>
                <td>{i + 1}</td>
                {Array.from({ length: colunas }, (_, j) => (
                  <td key={j} title={l[j] ?? ""}>
                    {l[j] ?? ""}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {folha.linhas.length >= MAX_LINHAS && <small>Mostrando as primeiras {MAX_LINHAS} linhas. Baixe para ver tudo.</small>}
    </Planilha>
  );
}

function colunaLetra(i: number): string {
  let s = "";
  let n = i;
  do {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return s;
}

/**
 * Prévia de um arquivo sem baixar (2026-10-13, a pedido). Imagem e PDF
 * abrem direto; planilha (xlsx, xls, csv) vira tabela por folha e Word
 * (docx) vira texto, os dois lidos no navegador (2026-11-17, a pedido:
 * "por que o botão baixa na máquina se dá para abrir?").
 *
 * Dois jeitos de chegar ao arquivo: `url`, um link já assinado (os módulos
 * no armazenamento único), que vai direto no `<img>`/`<iframe>` ou é lido
 * com fetch; ou `carregar`, que busca com o token e devolve o Blob, para as
 * rotas que ainda exigem Authorization. O objeto do blob é liberado quando
 * o modal fecha.
 */
export function PreviewArquivoModal({
  nomeArquivo,
  url: urlPronta,
  carregar,
  onBaixar,
  onFechar,
}: {
  nomeArquivo: string;
  url?: string;
  carregar?: () => Promise<Blob>;
  onBaixar: () => void;
  onFechar: () => void;
}) {
  const tipoInicial = tipoDoArquivo(nomeArquivo, "");
  const [url, setUrl] = useState<string | null>(urlPronta && (tipoInicial === "imagem" || tipoInicial === "pdf") ? urlPronta : null);
  const [tipo, setTipo] = useState<Tipo>(tipoInicial);
  const [folhas, setFolhas] = useState<Folha[] | null>(null);
  const [html, setHtml] = useState<string | null>(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let ativo = true;
    let criada: string | null = null;
    const t = tipoDoArquivo(nomeArquivo, "");
    const precisaLer = t === "planilha" || t === "word";

    async function buscarBytes(): Promise<ArrayBuffer> {
      if (carregar) return (await carregar()).arrayBuffer();
      if (!urlPronta) throw new Error("Sem arquivo para abrir");
      const r = await fetch(urlPronta);
      if (!r.ok) throw new Error("Não foi possível abrir o arquivo");
      return r.arrayBuffer();
    }

    async function rodar() {
      if (precisaLer) {
        const bytes = await buscarBytes();
        if (!ativo) return;
        if (t === "planilha") setFolhas(await lerPlanilha(bytes));
        else setHtml(await lerWord(bytes));
        return;
      }
      if (urlPronta || !carregar) return;
      const blob = await carregar();
      if (!ativo) return;
      criada = URL.createObjectURL(blob);
      setTipo(tipoDoArquivo(nomeArquivo, blob.type));
      setUrl(criada);
    }

    rodar().catch((err: unknown) => {
      if (ativo) setErro(err instanceof Error ? err.message : "Não foi possível abrir o arquivo");
    });
    return () => {
      ativo = false;
      if (criada) URL.revokeObjectURL(criada);
    };
  }, [carregar, nomeArquivo, urlPronta]);

  useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") onFechar();
    }
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [onFechar]);

  const pronto = tipo === "planilha" ? folhas !== null : tipo === "word" ? html !== null : tipo === "outro" ? true : url !== null;

  return (
    <ModalOverlay onClick={onFechar} role="presentation">
      <ModalContent $expandido onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="preview-titulo">
        <ModalHeader>
          <ModalTitle id="preview-titulo">{nomeArquivo}</ModalTitle>
          <ModalClose type="button" aria-label="Fechar" onClick={onFechar}>
            <X size={18} />
          </ModalClose>
        </ModalHeader>
        <ModalBody>
          {erro ? (
            <ErrorText>{erro}</ErrorText>
          ) : !pronto ? (
            <PageLoadingBlock />
          ) : tipo === "imagem" && url ? (
            <Quadro>
              <Imagem src={url} alt={nomeArquivo} />
            </Quadro>
          ) : tipo === "pdf" && url ? (
            <Pdf src={url} title={nomeArquivo} />
          ) : tipo === "planilha" && folhas ? (
            <Tabela folhas={folhas} />
          ) : tipo === "word" && html !== null ? (
            <Documento dangerouslySetInnerHTML={{ __html: html }} />
          ) : (
            <Quadro>
              <EmptyText>Este tipo de arquivo não tem prévia no navegador. Baixe pra abrir.</EmptyText>
            </Quadro>
          )}
        </ModalBody>
        <ModalFooter>
          <PageButton type="button" $variant="outline" onClick={onFechar}>
            Fechar
          </PageButton>
          {urlPronta && (tipo === "planilha" || tipo === "word") && (
            <PageButton type="button" $variant="outline" onClick={() => window.open(urlParaAbrir(urlPronta, nomeArquivo), "_blank", "noopener")}>
              <ExternalLink size={14} />
              Abrir completo
            </PageButton>
          )}
          <PageButton type="button" onClick={onBaixar}>
            <Download size={14} />
            Baixar
          </PageButton>
        </ModalFooter>
      </ModalContent>
    </ModalOverlay>
  );
}
