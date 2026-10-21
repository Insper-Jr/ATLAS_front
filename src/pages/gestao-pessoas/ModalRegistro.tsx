import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AlertTriangle, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getProjetos } from "@/lib/projetos";
import { hojeEmBrasilia } from "@/lib/fuso";
import { calcularFaixa, createGpRegistro, type GpCategoria, type GpMembroResumo } from "@/lib/gestao-pessoas";
import { ROTULO_CATEGORIA, ROTULO_FAIXA, TOM_FAIXA, rotuloDoTipo } from "@/lib/gp-rotulos";
import type { ProjetoResumo } from "@/types/projeto";
import { ErrorText, PageBadge, PageButton } from "@/styles/page.styled";
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
import { CamposGrid, CampoLargo, Checkbox, ModalSubtitulo, Nota, Revisao } from "./GestaoPessoas.styled";
import { formatarDia } from "./calculos";
import type { GpContexto } from "./contexto";

/**
 * "Registrar pontos" (spec 5.5): formulário, depois revisão, depois grava.
 * A prévia "atual -> novo" só soma quando a data cai dentro da gestão; fora
 * dela o registro é guardado mas não conta.
 */
export function ModalRegistro({
  contexto,
  categoriaInicial,
  membroFixo,
  onFechar,
  onSalvo,
}: {
  contexto: GpContexto;
  categoriaInicial: GpCategoria;
  membroFixo: GpMembroResumo | null;
  onFechar: () => void;
  onSalvo: (avisosGerados: number) => void;
}) {
  const { token } = useAuth();
  const { resumo, tipos } = contexto;
  const hoje = hojeEmBrasilia();

  const [etapa, setEtapa] = useState<"form" | "revisao">("form");
  const [usuarioId, setUsuarioId] = useState<number | null>(membroFixo?.usuario_id ?? null);
  const [categoria, setCategoria] = useState<GpCategoria>(categoriaInicial);
  const [tipoId, setTipoId] = useState<number | null>(null);
  const [quantidade, setQuantidade] = useState(1);
  const [data, setData] = useState(hoje);
  const [reducao, setReducao] = useState(false);
  const [projetoId, setProjetoId] = useState<number | null>(null);
  const [observacao, setObservacao] = useState("");
  const [projetos, setProjetos] = useState<ProjetoResumo[]>([]);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!token) return;
    getProjetos(token)
      .then(setProjetos)
      .catch(() => setProjetos([]));
  }, [token]);

  // Esc fecha, como nos outros modais.
  useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") onFechar();
    }
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [onFechar]);

  const membrosAtivos = useMemo(() => resumo.membros.filter((m) => m.ativo), [resumo.membros]);
  const membro = resumo.membros.find((m) => m.usuario_id === usuarioId) ?? membroFixo ?? null;
  const tiposDaCategoria = tipos.filter((t) => t.ativo && t.categoria === categoria).sort((a, b) => a.ordem - b.ordem);
  const tipo = tiposDaCategoria.find((t) => t.id === tipoId) ?? null;

  // Projetos que o membro integra; se não está em nenhum, oferece todos.
  const projetosDoMembro = useMemo(() => {
    if (!membro) return projetos;
    const dele = projetos.filter(
      (p) => p.coordenador_ids.includes(membro.usuario_id) || p.consultor_ids.includes(membro.usuario_id),
    );
    return dele.length > 0 ? dele : projetos;
  }, [projetos, membro]);

  function trocarCategoria(nova: GpCategoria) {
    setCategoria(nova);
    setTipoId(null);
    setQuantidade(1);
    setProjetoId(null);
  }

  function escolherTipo(valor: string) {
    const id = valor ? Number(valor) : null;
    setTipoId(id);
    const escolhido = tiposDaCategoria.find((t) => t.id === id);
    if (escolhido) setQuantidade(escolhido.pontos);
  }

  const limite = resumo.limites[categoria];
  const atual = membro ? membro[categoria].pontos : 0;
  const valor = reducao ? -quantidade : quantidade;
  const dentroDaGestao = data >= resumo.semestre.inicio.slice(0, 10) && data <= resumo.semestre.fim.slice(0, 10);
  const novo = dentroDaGestao ? atual + valor : atual;
  const faixaAtual = calcularFaixa(atual, limite, resumo.alerta);
  const faixaNova = calcularFaixa(novo, limite, resumo.alerta);
  const sobeDeFaixa = ["ok", "proximo", "limite"].indexOf(faixaNova) > ["ok", "proximo", "limite"].indexOf(faixaAtual);

  function revisar(e: FormEvent) {
    e.preventDefault();
    if (!membro || !tipo) {
      setErro("Selecione o membro e o tipo de ocorrência.");
      return;
    }
    if (!Number.isInteger(quantidade) || quantidade < 1) {
      setErro("Informe uma quantidade de pontos maior que zero.");
      return;
    }
    if (!observacao.trim()) {
      setErro("A observação é obrigatória.");
      return;
    }
    if (data > hoje) {
      setErro("A data da ocorrência não pode estar no futuro.");
      return;
    }
    if (reducao && dentroDaGestao && novo < 0) {
      setErro(`A redução deixaria ${membro.nome} com pontuação negativa (atual: ${atual}).`);
      return;
    }
    setErro("");
    setEtapa("revisao");
  }

  async function confirmar() {
    if (!token || !membro || !tipo) return;
    setSalvando(true);
    setErro("");
    try {
      const resposta = await createGpRegistro(
        {
          usuario_id: membro.usuario_id,
          tipo_id: tipo.id,
          pontos: valor,
          data,
          projeto_id: categoria === "desempenho" ? projetoId : null,
          observacao: observacao.trim(),
        },
        token,
      );
      onSalvo(resposta.avisos_gerados);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao salvar o registro");
      setSalvando(false);
    }
  }

  const projetoNome = projetos.find((p) => p.id === projetoId)?.nome ?? null;

  return (
    <ModalOverlay onClick={onFechar} role="presentation">
      <WideModalContent onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="gp-registro-titulo">
        <ModalHeader>
          <div>
            <ModalTitle id="gp-registro-titulo">{etapa === "form" ? "Registrar pontos" : "Confirmar registro"}</ModalTitle>
            <ModalSubtitulo>Revise os dados antes de confirmar. O membro recebe um aviso no sino.</ModalSubtitulo>
          </div>
          <ModalClose type="button" aria-label="Fechar" onClick={onFechar}>
            <X size={18} />
          </ModalClose>
        </ModalHeader>

        {etapa === "form" ? (
          <FormStack onSubmit={revisar}>
            <ModalBody>
              <CamposGrid>
                <FieldGroup>
                  <FieldLabel htmlFor="gp-reg-membro">Membro</FieldLabel>
                  <FieldSelect
                    id="gp-reg-membro"
                    value={usuarioId ?? ""}
                    disabled={!!membroFixo}
                    pesquisavel
                    onChange={(e) => setUsuarioId(e.target.value ? Number(e.target.value) : null)}
                  >
                    <option value="">Selecione</option>
                    {(membroFixo && !membrosAtivos.some((m) => m.usuario_id === membroFixo.usuario_id)
                      ? [membroFixo, ...membrosAtivos]
                      : membrosAtivos
                    ).map((m) => (
                      <option key={m.usuario_id} value={m.usuario_id}>
                        {m.nome}
                        {m.nucleo_nomes.length > 0 ? ` (${m.nucleo_nomes.join(", ")})` : ""}
                      </option>
                    ))}
                  </FieldSelect>
                </FieldGroup>
                <FieldGroup>
                  <FieldLabel htmlFor="gp-reg-categoria">Categoria</FieldLabel>
                  <FieldSelect
                    id="gp-reg-categoria"
                    value={categoria}
                    onChange={(e) => trocarCategoria(e.target.value as GpCategoria)}
                  >
                    <option value="obrigacoes">{ROTULO_CATEGORIA.obrigacoes}</option>
                    <option value="desempenho">{ROTULO_CATEGORIA.desempenho}</option>
                  </FieldSelect>
                </FieldGroup>
                <FieldGroup>
                  <FieldLabel htmlFor="gp-reg-tipo">Tipo de ocorrência</FieldLabel>
                  <FieldSelect id="gp-reg-tipo" value={tipoId ?? ""} onChange={(e) => escolherTipo(e.target.value)}>
                    <option value="">Selecione</option>
                    {tiposDaCategoria.map((t) => (
                      <option key={t.id} value={t.id}>
                        {rotuloDoTipo(t, false)}
                      </option>
                    ))}
                  </FieldSelect>
                </FieldGroup>
                <FieldGroup>
                  <FieldLabel htmlFor="gp-reg-quantidade">Quantidade de pontos</FieldLabel>
                  <FieldInput
                    id="gp-reg-quantidade"
                    type="number"
                    min={1}
                    max={20}
                    value={quantidade}
                    onChange={(e) => setQuantidade(Number(e.target.value))}
                    required
                  />
                </FieldGroup>
                <FieldGroup>
                  <FieldLabel htmlFor="gp-reg-data">Data da ocorrência</FieldLabel>
                  <FieldInput
                    id="gp-reg-data"
                    type="date"
                    value={data}
                    max={hoje}
                    onChange={(e) => setData(e.target.value)}
                    required
                  />
                </FieldGroup>
                <FieldGroup style={{ justifyContent: "flex-end" }}>
                  <Checkbox>
                    <input type="checkbox" checked={reducao} onChange={(e) => setReducao(e.target.checked)} />
                    Ajuste de redução (subtrai os pontos do acumulado)
                  </Checkbox>
                </FieldGroup>
                {categoria === "desempenho" && (
                  <CampoLargo as={FieldGroup}>
                    <FieldLabel htmlFor="gp-reg-projeto">Projeto (opcional)</FieldLabel>
                    <FieldSelect
                      id="gp-reg-projeto"
                      value={projetoId ?? ""}
                      pesquisavel
                      onChange={(e) => setProjetoId(e.target.value ? Number(e.target.value) : null)}
                    >
                      <option value="">Nenhum</option>
                      {projetosDoMembro.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nome}
                        </option>
                      ))}
                    </FieldSelect>
                  </CampoLargo>
                )}
                <CampoLargo as={FieldGroup}>
                  <FieldLabel htmlFor="gp-reg-observacao">Observação</FieldLabel>
                  <FieldTextarea
                    id="gp-reg-observacao"
                    rows={3}
                    value={observacao}
                    placeholder="Descreva a ocorrência. O membro verá este texto."
                    onChange={(e) => setObservacao(e.target.value)}
                    required
                  />
                </CampoLargo>
              </CamposGrid>
              {erro && <ErrorText style={{ marginTop: "0.75rem" }}>{erro}</ErrorText>}
            </ModalBody>
            <ModalFooter>
              <PageButton type="button" $variant="outline" onClick={onFechar}>
                Cancelar
              </PageButton>
              <PageButton type="submit">Revisar registro</PageButton>
            </ModalFooter>
          </FormStack>
        ) : (
          <>
            <ModalBody>
              <Revisao>
                <dt>Membro</dt>
                <dd>
                  {membro?.nome}
                  {membro && membro.nucleo_nomes.length > 0 ? ` (${membro.nucleo_nomes.join(", ")})` : ""}
                </dd>
                <dt>Categoria</dt>
                <dd>{ROTULO_CATEGORIA[categoria]}</dd>
                <dt>Ocorrência</dt>
                <dd>{tipo?.nome}</dd>
                <dt>Pontos</dt>
                <dd>
                  {valor > 0 ? `+${valor}` : valor}
                  {reducao ? " (ajuste de redução)" : ""}
                </dd>
                <dt>Data</dt>
                <dd>
                  {formatarDia(data)}
                  {!dentroDaGestao ? " (fora da gestão atual: não altera a pontuação)" : ""}
                </dd>
                {categoria === "desempenho" && projetoNome && (
                  <>
                    <dt>Projeto</dt>
                    <dd>{projetoNome}</dd>
                  </>
                )}
                <dt>Observação</dt>
                <dd>{observacao.trim()}</dd>
                <dt>Pontuação</dt>
                <dd>
                  {atual}/{limite} {"->"} <strong>{novo}/{limite}</strong>{" "}
                  {faixaNova !== faixaAtual && <PageBadge $tone={TOM_FAIXA[faixaNova]}>{ROTULO_FAIXA[faixaNova]}</PageBadge>}
                </dd>
              </Revisao>
              {sobeDeFaixa && (
                <Nota style={{ marginTop: "1rem" }}>
                  <AlertTriangle size={14} />
                  Este registro coloca o membro na situação "{ROTULO_FAIXA[faixaNova]}". Um aviso será gerado
                  automaticamente.
                </Nota>
              )}
              {erro && <ErrorText style={{ marginTop: "0.75rem" }}>{erro}</ErrorText>}
            </ModalBody>
            <ModalFooter>
              <PageButton type="button" $variant="outline" onClick={() => setEtapa("form")} disabled={salvando}>
                Voltar e editar
              </PageButton>
              <PageButton type="button" onClick={confirmar} disabled={salvando}>
                {salvando ? "Salvando..." : "Confirmar registro"}
              </PageButton>
            </ModalFooter>
          </>
        )}
      </WideModalContent>
    </ModalOverlay>
  );
}
