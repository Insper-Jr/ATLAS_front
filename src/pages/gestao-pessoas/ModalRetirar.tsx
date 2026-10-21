import { useEffect, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { retirarGpRegistro, type GpRegistro } from "@/lib/gestao-pessoas";
import { pontosComSinal } from "@/lib/gp-rotulos";
import { ErrorText, PageButton } from "@/styles/page.styled";
import {
  ModalBody,
  ModalClose,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  ModalTitle,
} from "@/styles/modal.styled";
import { FieldGroup, FieldLabel, FieldTextarea, FormStack } from "@/pages/Bancas.styled";
import { ModalSubtitulo } from "./GestaoPessoas.styled";
import { formatarDia } from "./calculos";

/** "Retirar pontos" (spec 5.8): o registro vira "Retirado" e deixa de contar. */
export function ModalRetirar({
  registro,
  onFechar,
  onSalvo,
}: {
  registro: GpRegistro;
  onFechar: () => void;
  onSalvo: (avisosGerados: number) => void;
}) {
  const { token } = useAuth();
  const [justificativa, setJustificativa] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") onFechar();
    }
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [onFechar]);

  async function retirar(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    if (!justificativa.trim()) {
      setErro("Informe a justificativa.");
      return;
    }
    setSalvando(true);
    setErro("");
    try {
      const resposta = await retirarGpRegistro(registro.id, justificativa.trim(), token);
      onSalvo(resposta.avisos_gerados);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao retirar os pontos");
      setSalvando(false);
    }
  }

  return (
    <ModalOverlay onClick={onFechar} role="presentation">
      <ModalContent onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="gp-retirar-titulo">
        <ModalHeader>
          <div>
            <ModalTitle id="gp-retirar-titulo">Retirar pontos</ModalTitle>
            <ModalSubtitulo>
              {registro.usuario_nome} · {registro.tipo_nome} · {pontosComSinal(registro.pontos)} pts em{" "}
              {formatarDia(registro.data)}
            </ModalSubtitulo>
          </div>
          <ModalClose type="button" aria-label="Fechar" onClick={onFechar}>
            <X size={18} />
          </ModalClose>
        </ModalHeader>
        <FormStack onSubmit={retirar}>
          <ModalBody>
            <ModalSubtitulo style={{ margin: "0 0 1rem" }}>
              Os pontos deixam de contar para o limite, mas o registro continua no histórico como "Retirado".
            </ModalSubtitulo>
            <FieldGroup>
              <FieldLabel htmlFor="gp-ret-justificativa">Justificativa</FieldLabel>
              <FieldTextarea
                id="gp-ret-justificativa"
                rows={3}
                value={justificativa}
                autoFocus
                onChange={(e) => setJustificativa(e.target.value)}
                required
              />
            </FieldGroup>
            {erro && <ErrorText style={{ marginTop: "0.75rem" }}>{erro}</ErrorText>}
          </ModalBody>
          <ModalFooter>
            <PageButton type="button" $variant="outline" onClick={onFechar} disabled={salvando}>
              Cancelar
            </PageButton>
            <PageButton type="submit" disabled={salvando}>
              {salvando ? "Retirando..." : `Retirar ${pontosComSinal(registro.pontos)} pts`}
            </PageButton>
          </ModalFooter>
        </FormStack>
      </ModalContent>
    </ModalOverlay>
  );
}
