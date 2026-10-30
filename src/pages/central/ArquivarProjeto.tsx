import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  ROTULO_USO_REFERENCIAS,
  enviarArquivamento,
  getOpcoesCentral,
  getProjetoCentral,
  getReferencias,
  getToolBox,
  type Arquivamento,
  type AtivoEncerramento,
  type Ficha,
  type MeuProjeto,
  type OpcoesCentral,
  type ProjetoReferencia,
  type UsoReferencias,
} from "@/lib/central";
import { MultiSelect } from "@/components/MultiSelect";
import { formatarDataHora } from "@/lib/projetos";
import { ROTULO_POSICAO } from "@/utils/permissoes";
import {
  ErrorText,
  PageButton,
  PageButtonSm,
  PageCard,
  PageCardContent,
  PageHeader,
  PageHeaderText,
  PageLoadingBlock,
  PageStack,
  PageSubtitle,
  PageTitle,
} from "@/styles/page.styled";
import {
  FieldGroup,
  FieldInput,
  FieldLabel,
  FieldSelect,
  FieldTextarea,
} from "@/pages/Bancas.styled";
import {
  Acoes,
  AvisoCaixa,
  BarraAcoes,
  FichaCard,
  ListaSimples,
  Meta,
  Opcao,
  Secao,
  SecaoAjuda,
  SecaoTitulo,
} from "./Central.styled";

interface AtivoForm {
  titulo: string;
  tipos: string[];
  autores: string[];
  porQue: string;
  escopo: string;
}

const ATIVO_VAZIO: AtivoForm = {
  titulo: "",
  tipos: [],
  autores: [],
  porQue: "",
  escopo: "",
};
const USOS: UsoReferencias[] = ["ficha", "projeto_referencia", "assistente"];

/**
 * O arquivamento de um projeto na Central: os ativos que se destacaram
 * (quantos forem, ou nenhum, dizendo por quê), a garantia do acervo e o
 * que o projeto usou da Central. Pode ser preenchido quantas vezes quiser e,
 * com a barreira ligada no backend, pelo menos uma antes de Finalizado.
 */
export function ArquivarProjeto() {
  const { id } = useParams();
  const projetoId = Number(id);
  const { token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // De onde a pessoa veio: a página do projeto, o kanban ou "Meus projetos".
  const voltarPara =
    (location.state as { de?: string } | null)?.de ?? "/central/projetos";
  const rotuloVoltar = voltarPara.startsWith("/projetos/")
    ? "Voltar ao projeto"
    : voltarPara === "/projetos"
      ? "Voltar aos projetos"
      : "Meus projetos";
  const [projeto, setProjeto] = useState<
    (MeuProjeto & { arquivamentos: Arquivamento[] }) | null
  >(null);
  const [garantiaRotulo, setGarantiaRotulo] = useState("");
  const [opcoes, setOpcoes] = useState<OpcoesCentral | null>(null);
  const [fichasPublicadas, setFichasPublicadas] = useState<Ficha[]>([]);
  const [referencias, setReferencias] = useState<ProjetoReferencia[]>([]);
  const [ativos, setAtivos] = useState<AtivoForm[]>([{ ...ATIVO_VAZIO }]);
  const [semAtivos, setSemAtivos] = useState(false);
  const [semAtivosMotivo, setSemAtivosMotivo] = useState("");
  const [garantia, setGarantia] = useState<"" | "sim" | "nao">("");
  const [usos, setUsos] = useState<UsoReferencias[]>([]);
  const [referenciaFichas, setReferenciaFichas] = useState<string[]>([]);
  const [referenciaProjetos, setReferenciaProjetos] = useState<string[]>([]);
  const [observacao, setObservacao] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  // Já houve um arquivamento: o formulário só abre depois que a pessoa confirma que quer outro.
  const [confirmouOutro, setConfirmouOutro] = useState(false);

  useEffect(() => {
    if (!token || !projetoId) return;
    let vivo = true;
    Promise.all([
      getProjetoCentral(projetoId, token),
      getOpcoesCentral(token),
      getToolBox(token),
      getReferencias(token),
    ])
      .then(([p, o, toolbox, refs]) => {
        if (!vivo) return;
        setProjeto(p);
        setGarantiaRotulo(p.checklist[0] ?? "");
        setOpcoes(o);
        setFichasPublicadas(
          toolbox.fichas.filter((f) => f.status === "publicada"),
        );
        setReferencias(refs);
      })
      .catch(
        (err) =>
          vivo &&
          setErro(err instanceof Error ? err.message : "Erro ao carregar"),
      );
    return () => {
      vivo = false;
    };
  }, [token, projetoId]);

  const membros = useMemo(
    () =>
      (opcoes?.membros ?? []).map((m) => ({
        value: String(m.id),
        label: `${m.nome} · ${ROTULO_POSICAO[m.posicao as keyof typeof ROTULO_POSICAO] ?? m.posicao}`,
      })),
    [opcoes],
  );
  const categorias = useMemo(
    () =>
      (opcoes?.categorias ?? [])
        .filter((c) => c.ativa)
        .map((c) => ({ value: c.chave, label: c.nome })),
    [opcoes],
  );

  function mudarAtivo(i: number, campo: Partial<AtivoForm>) {
    setAtivos((atual) =>
      atual.map((a, j) => (j === i ? { ...a, ...campo } : a)),
    );
  }

  function usarPreIndicacao(f: Ficha) {
    setSemAtivos(false);
    setAtivos((atual) => {
      const vazio = atual.findIndex((a) => !a.titulo.trim());
      const novo: AtivoForm = {
        titulo: f.titulo,
        tipos: f.tipos,
        autores: f.autores.map((a) => String(a.id)),
        porQue: f.por_que_se_destacou,
        escopo: f.escopo_id ? String(f.escopo_id) : "",
      };
      if (vazio >= 0) return atual.map((a, j) => (j === vazio ? novo : a));
      return [...atual, novo];
    });
  }

  function alternarUso(u: UsoReferencias) {
    setUsos((atual) =>
      atual.includes(u) ? atual.filter((x) => x !== u) : [...atual, u],
    );
  }

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!token || !projeto) return;
    const preenchidos = semAtivos
      ? []
      : ativos.filter((a) => a.titulo.trim() || a.porQue.trim());
    if (!semAtivos && preenchidos.length === 0) {
      setErro("Indique pelo menos um ativo ou marque que nenhum se destacou.");
      return;
    }
    if (semAtivos && semAtivosMotivo.trim().length < 5) {
      setErro("Diga em uma linha por que nenhum ativo se destacou.");
      return;
    }
    for (const a of preenchidos) {
      if (
        a.titulo.trim().length < 3 ||
        a.porQue.trim().length < 10 ||
        a.tipos.length === 0
      ) {
        setErro("Cada ativo precisa de nome, categoria e justificativa.");
        return;
      }
    }
    if (!semAtivos && garantia !== "sim") {
      setErro(
        garantia === "nao"
          ? "Salve os entregáveis como arquivo e registre os autores antes de arquivar."
          : "Responda se os entregáveis estão salvos e os autores registrados.",
      );
      return;
    }
    setErro("");
    setEnviando(true);
    try {
      const payload: AtivoEncerramento[] = preenchidos.map((a) => ({
        titulo: a.titulo.trim(),
        tipos: a.tipos,
        por_que_se_destacou: a.porQue.trim(),
        autores_ids: a.autores.map(Number),
        escopo_id: a.escopo ? Number(a.escopo) : null,
      }));
      await enviarArquivamento(
        projeto.id,
        {
          ativos: payload,
          sem_ativos_motivo: semAtivos ? semAtivosMotivo.trim() : null,
          checklist: semAtivos ? [] : [true],
          usos: semAtivos ? [] : usos,
          referencia_ficha_ids:
            !semAtivos && usos.includes("ficha")
              ? referenciaFichas.map(Number)
              : [],
          referencia_projeto_ids:
            !semAtivos && usos.includes("projeto_referencia")
              ? referenciaProjetos.map(Number)
              : [],
          observacao: observacao.trim() || null,
        },
        token,
      );
      navigate(voltarPara);
    } catch (err) {
      setErro(
        err instanceof Error
          ? err.message
          : "Não foi possível enviar o arquivamento",
      );
      setEnviando(false);
    }
  }

  if (erro && !projeto) {
    return (
      <PageStack>
        <PageButtonSm as={Link} to={voltarPara} $variant="ghost">
          <ArrowLeft size={14} /> {rotuloVoltar}
        </PageButtonSm>
        <ErrorText>{erro}</ErrorText>
      </PageStack>
    );
  }
  if (!projeto) return <PageLoadingBlock />;

  const anterior = projeto.arquivamento;
  const mostrarFormulario =
    projeto.pode_arquivar && (!anterior || confirmouOutro);

  return (
    <PageStack>
      <div>
        <PageButtonSm as={Link} to={voltarPara} $variant="ghost">
          <ArrowLeft size={14} /> {rotuloVoltar}
        </PageButtonSm>
      </div>
      <PageHeader>
        <PageHeaderText>
          <PageTitle>Arquivar na Central</PageTitle>
          <PageSubtitle>
            {projeto.nome}
            {projeto.cliente ? ` · ${projeto.cliente}` : ""}. Registre o que
            deste projeto deve ficar para os próximos. Pode ser preenchido a
            qualquer hora, quantas vezes quiser
            {projeto.exige_arquivamento
              ? ", e pelo menos uma antes de o projeto ir para Finalizado."
              : "."}
          </PageSubtitle>
        </PageHeaderText>
      </PageHeader>

      {!projeto.pode_arquivar && (
        <AvisoCaixa $tom="atencao">
          Só o coordenador do projeto, o gerente da frente ou quem gere a
          Central preenche o arquivamento.
        </AvisoCaixa>
      )}

      {projeto.pode_arquivar && anterior && !confirmouOutro && (
        <AvisoCaixa $tom="atencao">
          <strong>Este projeto já tem um arquivamento</strong>, enviado em{" "}
          {formatarDataHora(anterior.enviado_em)}
          {projeto.arquivamentos.length > 1
            ? ` (${projeto.arquivamentos.length} no total)`
            : ""}
          . Quer mesmo preencher outro?
          <Acoes style={{ marginTop: "0.75rem" }}>
            <PageButtonSm type="button" onClick={() => setConfirmouOutro(true)}>
              Sim, preencher outro
            </PageButtonSm>
            <PageButtonSm as={Link} to={voltarPara} $variant="ghost">
              Não, voltar
            </PageButtonSm>
          </Acoes>
        </AvisoCaixa>
      )}

      {mostrarFormulario && (
        <form onSubmit={enviar}>
          <PageCard>
            <PageCardContent>
              <Secao>
                <SecaoTitulo>1. Ativos que se destacaram</SecaoTitulo>
                <SecaoAjuda>
                  Metodologias, ferramentas, fontes ou entregáveis deste projeto
                  que outros deveriam conhecer. Cada um vira uma indicação para
                  o gerente da frente.
                </SecaoAjuda>
                {projeto.pre_indicacoes_banca.length > 0 && (
                  <AvisoCaixa>
                    <strong>Pré-indicação da banca.</strong> O avaliador já
                    apontou:
                    <ListaSimples style={{ marginTop: "0.375rem" }}>
                      {projeto.pre_indicacoes_banca.map((f) => (
                        <li key={f.id}>
                          <Link to={`/central/fichas/${f.id}`}>{f.titulo}</Link>{" "}
                          · indicada por {f.indicado_por_nome} · "
                          {f.por_que_se_destacou}"{" "}
                          <PageButtonSm
                            type="button"
                            $variant="ghost"
                            onClick={() => usarPreIndicacao(f)}
                          >
                            Usar como base
                          </PageButtonSm>
                        </li>
                      ))}
                    </ListaSimples>
                    <SecaoAjuda style={{ marginTop: "0.375rem" }}>
                      Ela já está na fila do gerente. Use como base só se quiser
                      completar autores e escopo numa nova indicação.
                    </SecaoAjuda>
                  </AvisoCaixa>
                )}
                <Opcao>
                  <input
                    type="checkbox"
                    checked={semAtivos}
                    onChange={(e) => {
                      setSemAtivos(e.target.checked);
                      setErro("");
                    }}
                  />
                  <span>Acho que nenhum ativo se destacou neste projeto</span>
                </Opcao>
                {semAtivos ? (
                  <FieldGroup>
                    <FieldLabel>Por quê?</FieldLabel>
                    <FieldTextarea
                      rows={2}
                      value={semAtivosMotivo}
                      onChange={(e) => setSemAtivosMotivo(e.target.value)}
                      placeholder="Em uma linha: por que nada deste projeto vale uma ficha"
                    />
                  </FieldGroup>
                ) : (
                  <>
                    {ativos.map((a, i) => (
                      <FichaCard key={i} style={{ gap: "1rem" }}>
                        <Meta style={{ justifyContent: "space-between" }}>
                          <strong>Ativo {i + 1}</strong>
                          {ativos.length > 1 && (
                            <PageButtonSm
                              type="button"
                              $variant="ghost"
                              aria-label="Remover ativo"
                              onClick={() =>
                                setAtivos((atual) =>
                                  atual.filter((_, j) => j !== i),
                                )
                              }
                            >
                              <Trash2 size={14} />
                            </PageButtonSm>
                          )}
                        </Meta>
                        <FieldGroup>
                          <FieldLabel>O que se destacou</FieldLabel>
                          <FieldInput
                            maxLength={200}
                            value={a.titulo}
                            onChange={(e) =>
                              mudarAtivo(i, { titulo: e.target.value })
                            }
                            placeholder="Ex.: matriz de forças dispersas entre concorrentes"
                          />
                        </FieldGroup>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns:
                              "repeat(auto-fit, minmax(14rem, 1fr))",
                            gap: "1rem 0.75rem",
                          }}
                        >
                          <FieldGroup>
                            <FieldLabel>Categoria</FieldLabel>
                            <MultiSelect
                              valores={a.tipos}
                              onChange={(v) => mudarAtivo(i, { tipos: v })}
                              opcoes={categorias}
                              rotuloVazio="Escolha a categoria"
                              resumo={(n) => `${n} categorias`}
                              aria-label={`Categoria do ativo ${i + 1}`}
                            />
                          </FieldGroup>
                          <FieldGroup>
                            <FieldLabel>Escopo</FieldLabel>
                            <FieldSelect
                              value={a.escopo}
                              onChange={(e) =>
                                mudarAtivo(i, { escopo: e.target.value })
                              }
                            >
                              <option value="">Sem escopo</option>
                              {projeto.escopos
                                .filter((e) => e.id)
                                .map((e) => (
                                  <option key={e.id} value={String(e.id)}>
                                    {e.nome}
                                  </option>
                                ))}
                            </FieldSelect>
                          </FieldGroup>
                          <FieldGroup>
                            <FieldLabel>Autores</FieldLabel>
                            <MultiSelect
                              valores={a.autores}
                              onChange={(v) => mudarAtivo(i, { autores: v })}
                              opcoes={membros}
                              rotuloVazio="Consultores que desenvolveram"
                              resumo={(n) => `${n} autores`}
                              aria-label={`Autores do ativo ${i + 1}`}
                              pesquisavel
                            />
                          </FieldGroup>
                        </div>
                        <FieldGroup>
                          <FieldLabel>Justificativa</FieldLabel>
                          <FieldTextarea
                            rows={2}
                            value={a.porQue}
                            onChange={(e) =>
                              mudarAtivo(i, { porQue: e.target.value })
                            }
                            placeholder="Por que se destacou, em até 2 linhas"
                          />
                        </FieldGroup>
                      </FichaCard>
                    ))}
                    <div>
                      <PageButtonSm
                        type="button"
                        $variant="outline"
                        onClick={() =>
                          setAtivos((atual) => [...atual, { ...ATIVO_VAZIO }])
                        }
                      >
                        <Plus size={14} /> Adicionar ativo
                      </PageButtonSm>
                    </div>
                  </>
                )}
              </Secao>

              {/* Sem ativos não há o que garantir nem o que contar: o motivo basta. */}
              {!semAtivos && (
                <>
                  <Secao>
                    <SecaoTitulo>2. Garantia do acervo</SecaoTitulo>
                    <SecaoAjuda>{garantiaRotulo}?</SecaoAjuda>
                    <div role="radiogroup" aria-label="Garantia do acervo">
                      <Opcao>
                        <input
                          type="radio"
                          name="garantia"
                          checked={garantia === "sim"}
                          onChange={() => setGarantia("sim")}
                        />
                        <span>Sim, garanto</span>
                      </Opcao>
                      <Opcao>
                        <input
                          type="radio"
                          name="garantia"
                          checked={garantia === "nao"}
                          onChange={() => setGarantia("nao")}
                        />
                        <span>Não</span>
                      </Opcao>
                    </div>
                    {garantia === "nao" && (
                      <AvisoCaixa $tom="atencao">
                        Sem isso o arquivamento não é concluído. Salve os
                        entregáveis finais como arquivo (não só como link) e
                        registre os autores, depois volte aqui.
                      </AvisoCaixa>
                    )}
                  </Secao>

                  <Secao>
                    <SecaoTitulo>3. Uso de referências</SecaoTitulo>
                    <SecaoAjuda>
                      O que este projeto usou da Central? Marque tudo que se
                      aplica; deixe em branco se não usou nada.
                    </SecaoAjuda>
                    <div>
                      {USOS.map((u) => (
                        <Opcao key={u}>
                          <input
                            type="checkbox"
                            checked={usos.includes(u)}
                            onChange={() => alternarUso(u)}
                          />
                          <span>{ROTULO_USO_REFERENCIAS[u]}</span>
                        </Opcao>
                      ))}
                    </div>
                    {usos.includes("ficha") && (
                      <FieldGroup>
                        <FieldLabel>Quais fichas?</FieldLabel>
                        <MultiSelect
                          valores={referenciaFichas}
                          onChange={setReferenciaFichas}
                          opcoes={fichasPublicadas.map((f) => ({
                            value: String(f.id),
                            label: `${f.codigo} · ${f.titulo}`,
                          }))}
                          rotuloVazio="Escolha as fichas usadas"
                          resumo={(n) => `${n} fichas`}
                          aria-label="Fichas usadas"
                          pesquisavel
                        />
                      </FieldGroup>
                    )}
                    {usos.includes("projeto_referencia") && (
                      <FieldGroup>
                        <FieldLabel>Quais projetos de referência?</FieldLabel>
                        <MultiSelect
                          valores={referenciaProjetos}
                          onChange={setReferenciaProjetos}
                          opcoes={referencias.map((r) => ({
                            value: String(r.id),
                            label: r.projeto.nome,
                          }))}
                          rotuloVazio="Escolha os projetos usados"
                          resumo={(n) => `${n} projetos`}
                          aria-label="Projetos de referência usados"
                          pesquisavel
                        />
                      </FieldGroup>
                    )}
                    <FieldGroup style={{ marginTop: "0.5rem" }}>
                      <FieldLabel>Observação (opcional)</FieldLabel>
                      <FieldTextarea
                        rows={2}
                        value={observacao}
                        onChange={(e) => setObservacao(e.target.value)}
                        placeholder="O que mais vale registrar sobre o projeto"
                      />
                    </FieldGroup>
                  </Secao>
                </>
              )}
              {erro && (
                <ErrorText style={{ marginTop: "0.75rem" }}>{erro}</ErrorText>
              )}
            </PageCardContent>
            <BarraAcoes>
              <p />
              <Acoes>
                <PageButton type="submit" disabled={enviando}>
                  {enviando
                    ? "Enviando…"
                    : semAtivos
                      ? "Arquivar sem indicações"
                      : "Arquivar e enviar ao gerente"}
                </PageButton>
              </Acoes>
            </BarraAcoes>
          </PageCard>
        </form>
      )}
    </PageStack>
  );
}
