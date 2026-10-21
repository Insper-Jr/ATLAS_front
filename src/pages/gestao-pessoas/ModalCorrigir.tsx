import { useEffect, useState, type FormEvent } from "react";
import { Clock, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getProjetos, formatarDataHora } from "@/lib/projetos";
import { hojeEmBrasilia } from "@/lib/fuso";
import { updateGpRegistro, type GpRegistro, type UpdateGpRegistroPayload } from "@/lib/gestao-pessoas";
import { ROTULO_CATEGORIA, rotuloDoTipo } from "@/lib/gp-rotulos";
import type { ProjetoResumo } from "@/types/projeto";
import { ErrorText, PageButton } from "@/styles/page.styled";
import { ModalBody, ModalClose, ModalFooter, ModalHeader, ModalOverlay, ModalTitle } from "@/styles/modal.styled";
import {
  FieldGroup,
  FieldInput,
  FieldLabel,
  FieldSelect,
  FieldTextarea,
  FormStack,
  WideModalContent,
} from "@/pages/Bancas.styled";
import { CamposGrid, CampoLargo, ModalSubtitulo, Nota } from "./GestaoPessoas.styled";
import type { GpContexto } from "./contexto";

/**
 * "Corrigir registro" (spec 5.7): só manda ao backend o que mudou, mais a
 * justificativa. O valor anterior fica guardado como ajuste; nada é apagado.
 * Tipos inativos da mesma categoria entram na lista (o registro pode ser
 * antigo).
 */
export function ModalCorrigir({
  contexto,
  registro,
  onFechar,
  onSalvo,
}: {
  contexto: GpContexto;
  registro: GpRegistro;
  onFechar: () => void;
  onSalvo: (avisosGerados: number) => void;
}) {
  const { token } = useAuth();
  const hoje = hojeEmBrasilia();
  const [tipoId, setTipoId] = useState(registro.tipo_id);
  const [pontos, setPontos] = useState(registro.pontos);
  const [data, setData] = useState(registro.data);
  const [projetoId, setProjetoId] = useState<number | null>(registro.projeto_id);
  const [observacao, setObservacao] = useState(registro.observacao);
  const [justificativa, setJustificativa] = useState("");
  const [projetos, setProjetos] = useState<ProjetoResumo[]>([]);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!token || registro.categoria !== "desempenho") return;
    getProjetos(token)
      .then(setProjetos)
      .catch(() => setProjetos([]));
  }, [token, registro.categoria]);

  useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") onFechar();
    }
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [onFechar]);

  const tiposDaCategoria = contexto.tipos
    .filter((t) => t.categoria === registro.categoria)
    .sort((a, b) => a.ordem - b.ordem);

  async function salvar(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    if (!justificativa.trim()) {
      setErro("Informe a justificativa da correção.");
      return;
    }
    if (!observacao.trim()) {
      setErro("A observação não pode ficar vazia.");
      return;
    }
    if (!Number.isInteger(pontos) || pontos === 0) {
      setErro("Os pontos devem ser diferentes de zero. Para remover o registro, use Retirar pontos.");
      return;
    }
    if (data > hoje) {
      setErro("A data da ocorrência não pode estar no futuro.");
      return;
    }
    const payload: UpdateGpRegistroPayload = { justificativa: justificativa.trim() };
    if (tipoId !== registro.tipo_id) payload.tipo_id = tipoId;
    if (pontos !== registro.pontos) payload.pontos = pontos;
    if (data !== registro.data) payload.data = data;
    if (projetoId !== registro.projeto_id) payload.projeto_id = projetoId;
    if (observacao.trim() !== registro.observacao) payload.observacao = observacao.trim();
    if (Object.keys(payload).length === 1) {
      setErro("Nenhum campo foi alterado.");
      return;
    }
    setSalvando(true);
    setErro("");
    try {
      const resposta = await updateGpRegistro(registro.id, payload, token);
      onSalvo(resposta.avisos_gerados);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao salvar a correção");
      setSalvando(false);
    }
  }

  return (
    <ModalOverlay onClick={onFechar} role="presentation">
      <WideModalContent onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="gp-corrigir-titulo">
        <ModalHeader>
          <div>
            <ModalTitle id="gp-corrigir-titulo">Corrigir registro</ModalTitle>
            <ModalSubtitulo>
              {registro.usuario_nome} · {ROTULO_CATEGORIA[registro.categoria]} · lançado em{" "}
              {formatarDataHora(registro.lancado_em)}
            </ModalSubtitulo>
          </div>
          <ModalClose type="button" aria-label="Fechar" onClick={onFechar}>
            <X size={18} />
          </ModalClose>
        </ModalHeader>
        <FormStack onSubmit={salvar}>
          <ModalBody>
            <CamposGrid>
              <CampoLargo as={FieldGroup}>
                <FieldLabel htmlFor="gp-cor-tipo">Tipo de ocorrência</FieldLabel>
                <FieldSelect id="gp-cor-tipo" value={tipoId} onChange={(e) => setTipoId(Number(e.target.value))}>
                  {tiposDaCategoria.map((t) => (
                    <option key={t.id} value={t.id}>
                      {rotuloDoTipo(t, false)}
                      {t.ativo ? "" : " (inativo)"}
                    </option>
                  ))}
                </FieldSelect>
              </CampoLargo>
              <FieldGroup>
                <FieldLabel htmlFor="gp-cor-pontos">Pontos</FieldLabel>
                <FieldInput
                  id="gp-cor-pontos"
                  type="number"
                  min={-20}
                  max={20}
                  value={pontos}
                  onChange={(e) => setPontos(Number(e.target.value))}
                  required
                />
                <ModalSubtitulo style={{ fontSize: "0.75rem" }}>Use valor negativo para ajustes de redução.</ModalSubtitulo>
              </FieldGroup>
              <FieldGroup>
                <FieldLabel htmlFor="gp-cor-data">Data da ocorrência</FieldLabel>
                <FieldInput
                  id="gp-cor-data"
                  type="date"
                  value={data}
                  max={hoje}
                  onChange={(e) => setData(e.target.value)}
                  required
                />
              </FieldGroup>
              {registro.categoria === "desempenho" && (
                <CampoLargo as={FieldGroup}>
                  <FieldLabel htmlFor="gp-cor-projeto">Projeto</FieldLabel>
                  <FieldSelect
                    id="gp-cor-projeto"
                    value={projetoId ?? ""}
                    pesquisavel
                    onChange={(e) => setProjetoId(e.target.value ? Number(e.target.value) : null)}
                  >
                    <option value="">Nenhum</option>
                    {registro.projeto_id && !projetos.some((p) => p.id === registro.projeto_id) && (
                      <option value={registro.projeto_id}>{registro.projeto_nome ?? `Projeto ${registro.projeto_id}`}</option>
                    )}
                    {projetos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nome}
                      </option>
                    ))}
                  </FieldSelect>
                </CampoLargo>
              )}
              <CampoLargo as={FieldGroup}>
                <FieldLabel htmlFor="gp-cor-observacao">Observação</FieldLabel>
                <FieldTextarea
                  id="gp-cor-observacao"
                  rows={3}
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  required
                />
              </CampoLargo>
              <CampoLargo as={FieldGroup}>
                <FieldLabel htmlFor="gp-cor-justificativa">Justificativa da correção</FieldLabel>
                <FieldTextarea
                  id="gp-cor-justificativa"
                  rows={2}
                  value={justificativa}
                  placeholder="Por que o registro está sendo alterado? O membro verá esta justificativa."
                  onChange={(e) => setJustificativa(e.target.value)}
                  required
                />
              </CampoLargo>
            </CamposGrid>
            <Nota style={{ marginTop: "1rem" }}>
              <Clock size={14} />
              O valor anterior fica guardado no histórico do registro. Nada é apagado.
            </Nota>
            {erro && <ErrorText style={{ marginTop: "0.75rem" }}>{erro}</ErrorText>}
          </ModalBody>
          <ModalFooter>
            <PageButton type="button" $variant="outline" onClick={onFechar} disabled={salvando}>
              Cancelar
            </PageButton>
            <PageButton type="submit" disabled={salvando}>
              {salvando ? "Salvando..." : "Salvar correção"}
            </PageButton>
          </ModalFooter>
        </FormStack>
      </WideModalContent>
    </ModalOverlay>
  );
}
