import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  enviarGpAviso,
  getGpPreviaAviso,
  type GpCategoria,
  type GpMembroResumo,
  type GpPreviaAviso,
} from "@/lib/gestao-pessoas";
import { ROTULO_CATEGORIA, ROTULO_FAIXA, TOM_FAIXA } from "@/lib/gp-rotulos";
import { EmptyText, ErrorText, PageBadge, PageButton } from "@/styles/page.styled";
import { ModalBody, ModalClose, ModalFooter, ModalHeader, ModalOverlay, ModalTitle } from "@/styles/modal.styled";
import { FieldGroup, FieldLabel, FieldSelect, WideModalContent } from "@/pages/Bancas.styled";
import { ModalSubtitulo, Nota } from "./GestaoPessoas.styled";

/**
 * Envio manual do aviso (fora da regra automática): mostra a prévia
 * renderizada pelo backend com os dados reais do membro e pede confirmação.
 * Não mexe no estado de alerta automático.
 */
export function ModalAviso({
  membro,
  onFechar,
  onEnviado,
}: {
  membro: GpMembroResumo;
  onFechar: () => void;
  onEnviado: () => void;
}) {
  const { token } = useAuth();
  const [categoria, setCategoria] = useState<GpCategoria>(
    membro.obrigacoes.faixa !== "ok" || membro.desempenho.faixa === "ok" ? "obrigacoes" : "desempenho",
  );
  const [previa, setPrevia] = useState<GpPreviaAviso | null>(null);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!token) return;
    let vivo = true;
    setPrevia(null);
    getGpPreviaAviso(membro.usuario_id, categoria, token)
      .then((p) => vivo && setPrevia(p))
      .catch((err) => vivo && setErro(err instanceof Error ? err.message : "Erro ao montar a prévia"));
    return () => {
      vivo = false;
    };
  }, [token, membro.usuario_id, categoria]);

  useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") onFechar();
    }
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [onFechar]);

  async function enviar() {
    if (!token) return;
    setEnviando(true);
    setErro("");
    try {
      await enviarGpAviso(membro.usuario_id, categoria, token);
      onEnviado();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao enviar o aviso");
      setEnviando(false);
    }
  }

  const situacao = previa?.situacao ?? membro[categoria];

  return (
    <ModalOverlay onClick={onFechar} role="presentation">
      <WideModalContent onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="gp-aviso-titulo">
        <ModalHeader>
          <div>
            <ModalTitle id="gp-aviso-titulo">Enviar aviso</ModalTitle>
            <ModalSubtitulo>
              {previa ? `Destinatários: ${previa.destinatarios.join(", ")}` : `Destinatário: ${membro.email}`}
            </ModalSubtitulo>
          </div>
          <ModalClose type="button" aria-label="Fechar" onClick={onFechar}>
            <X size={18} />
          </ModalClose>
        </ModalHeader>
        <ModalBody style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <FieldGroup>
            <FieldLabel htmlFor="gp-aviso-categoria">Categoria</FieldLabel>
            <FieldSelect
              id="gp-aviso-categoria"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value as GpCategoria)}
            >
              <option value="obrigacoes">{ROTULO_CATEGORIA.obrigacoes}</option>
              <option value="desempenho">{ROTULO_CATEGORIA.desempenho}</option>
            </FieldSelect>
          </FieldGroup>
          {erro && <ErrorText>{erro}</ErrorText>}
          {!previa && !erro && <EmptyText>Montando a prévia...</EmptyText>}
          {previa && (
            <>
              <div>
                <strong style={{ fontSize: "0.875rem" }}>{previa.assunto}</strong>
                <p style={{ margin: "0.5rem 0 0", fontSize: "0.875rem", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                  {previa.corpo}
                </p>
              </div>
              <Nota>
                Situação atual de {membro.nome}:{" "}
                <PageBadge $tone={TOM_FAIXA[situacao.faixa]}>{ROTULO_FAIXA[situacao.faixa]}</PageBadge> ({situacao.pontos}/
                {situacao.limite}). O e-mail vai para uma pessoa real.
              </Nota>
            </>
          )}
        </ModalBody>
        <ModalFooter>
          <PageButton type="button" $variant="outline" onClick={onFechar} disabled={enviando}>
            Cancelar
          </PageButton>
          <PageButton type="button" onClick={enviar} disabled={enviando || !previa}>
            {enviando ? "Enviando..." : "Confirmar envio"}
          </PageButton>
        </ModalFooter>
      </WideModalContent>
    </ModalOverlay>
  );
}
