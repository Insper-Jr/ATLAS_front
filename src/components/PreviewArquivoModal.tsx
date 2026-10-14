import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
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

type Tipo = "imagem" | "pdf" | "outro";

function tipoDoArquivo(nome: string, mime: string): Tipo {
  const ext = nome.toLowerCase().split(".").pop() ?? "";
  if (mime.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) return "imagem";
  if (mime === "application/pdf" || ext === "pdf") return "pdf";
  return "outro";
}

/**
 * Prévia de um arquivo sem baixar (2026-10-13, a pedido). Imagem e PDF
 * abrem aqui mesmo; planilha e documento do Word o navegador não mostra,
 * então o modal avisa e deixa só o botão de baixar.
 *
 * `carregar` busca o arquivo com o token e devolve o Blob: a API exige
 * Authorization, então não dá pra apontar um `<img src>` direto pra URL.
 * O objeto é liberado quando o modal fecha.
 */
export function PreviewArquivoModal({
  nomeArquivo,
  carregar,
  onBaixar,
  onFechar,
}: {
  nomeArquivo: string;
  carregar: () => Promise<Blob>;
  onBaixar: () => void;
  onFechar: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [tipo, setTipo] = useState<Tipo>("outro");
  const [erro, setErro] = useState("");

  useEffect(() => {
    let ativo = true;
    let criada: string | null = null;
    carregar()
      .then((blob) => {
        if (!ativo) return;
        criada = URL.createObjectURL(blob);
        setTipo(tipoDoArquivo(nomeArquivo, blob.type));
        setUrl(criada);
      })
      .catch((err: unknown) => {
        if (ativo) setErro(err instanceof Error ? err.message : "Não foi possível abrir o arquivo");
      });
    return () => {
      ativo = false;
      if (criada) URL.revokeObjectURL(criada);
    };
  }, [carregar, nomeArquivo]);

  useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") onFechar();
    }
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [onFechar]);

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
          ) : !url ? (
            <PageLoadingBlock />
          ) : tipo === "imagem" ? (
            <Quadro>
              <Imagem src={url} alt={nomeArquivo} />
            </Quadro>
          ) : tipo === "pdf" ? (
            <Pdf src={url} title={nomeArquivo} />
          ) : (
            <Quadro>
              <EmptyText>Planilha e documento do Word não têm prévia no navegador. Baixe pra abrir.</EmptyText>
            </Quadro>
          )}
        </ModalBody>
        <ModalFooter>
          <PageButton type="button" $variant="outline" onClick={onFechar}>
            Fechar
          </PageButton>
          <PageButton type="button" onClick={onBaixar}>
            <Download size={14} />
            Baixar
          </PageButton>
        </ModalFooter>
      </ModalContent>
    </ModalOverlay>
  );
}
