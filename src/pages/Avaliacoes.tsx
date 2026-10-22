import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { AlertTriangle, NotebookPen, Plus, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  createNovaVersaoFormulario,
  formatNota,
  getAvaliacoes,
  getAvaliacoesNotas,
  getFormularioAtivo,
  getFormularioParaEditar,
  getNotasPorPergunta,
  isPerguntaNota,
  tomDaNota,
} from "@/lib/avaliacoes";
import { NotaEscala, NotaEscalaGrupo } from "@/components/NotaEscala";
import { DescricaoQuote } from "@/styles/shared.styled";
import { Th, useOrdenacao, type Colunas } from "@/components/tabela/ordenacao";
import {
  definirPrazoAvaliacaoBanca,
  getEscopos,
  getFrentes,
} from "@/lib/bancas";
import { getHistoricoBancas } from "@/lib/historico";
import {
  getBancas,
  getBancasFrentes,
  getCandidaturas,
  getCargaBancas,
  type CargaBancaDeUsuario,
  type FiltroCargaBancas,
} from "@/lib/bancas";
import { DashboardBancas } from "./DashboardBancas";
import { nomeEscopo, nomeUsuario } from "@/lib/nucleo";
import { getSemestres } from "@/lib/semestres";
import { paraDataUtc } from "@/lib/projetos";
import { getUsuarios } from "@/lib/usuarios";
import type {
  Avaliacao,
  AvaliacaoNota,
  Banca,
  BancaFrente,
  Candidatura,
  Escopo,
  Frente,
  FormularioAtivo,
  HistoricoBanca,
  NotaPorPergunta,
  PerguntaNovaVersao,
  Semestre,
} from "@/types/banca";
import type { UsuarioResumo } from "@/types/auth";
import {
  PageStack,
  PageCard,
  PageCardHeader,
  PageCardTitle,
  PageCardContent,
  PageBadge,
  PageButton,
  PageButtonSm,
  PageLoadingBlock,
  ErrorBlock,
  ErrorText,
  EmptyText,
} from "@/styles/page.styled";
import {
  ListaExpansivel,
  PendenciaCard,
  PendenciaFaltamRotulo,
  PendenciaIcone,
  PendenciaNome,
  PendenciaTexto,
  PessoaContexto,
  PessoaHeader,
  PessoaResumo,
  SubItem,
  SubItemMeta,
  SubLista,
} from "@/pages/avaliacao-desempenho/painel/Painel.styled";
import {
  PageHeaderRow,
  PageHeaderText,
  PageHeading,
  PageSubheading,
  DataTable,
  TableHead,
  TableHeadCell,
  TableBody,
  TableRow,
  NameCell,
  TableCell,
  ActionsCell,
  NotaCell,
  TableScrollWrap,
  LIST_MAX_VISIVEIS,
  FiltersRow,
  FormHint,
  CardActions,
  ModalOverlay,
  ModalHeader,
  ModalTitle,
  ModalClose,
  ModalBody,
  ModalFooter,
  WideModalContent,
  FormStack,
  FieldGroup,
  FieldLabel,
  FieldInput,
  FieldTextarea,
  FieldSelect,
  FormErrorText,
  PerguntaEditorList,
  PerguntaEditorRow,
  PerguntaSecao,
  PerguntaSecaoTitulo,
  PerguntaSecaoVazia,
  PerguntaGrupoFrente,
  RemoveButton,
  MoveButton,
  MoveButtonGroup,
  FormularioResumo,
  FormularioResumoItem,
  FormularioResumoValor,
  FormularioResumoLabel,
  PreviewToggleRow,
  SectionTitle,
  NotaFinalDestaque,
  DescricaoIndicador,
  DetailList,
  DetailRow,
  DetailTerm,
  DetailValue,
  FormularioModalContent,
} from "./Avaliacoes.styled";
import { FUSO } from "@/lib/fuso";

/** "aprovada" | "nao_aprovada" | `null` (aconteceu, ainda esperando decisão
 *  de diretoria ou gerente da frente — ver `use_cases/banca/aprovar_banca.py`). */
function rotuloResultado(resultado: HistoricoBanca["resultado"]): string {
  if (resultado === "aprovada") return "Aprovada";
  if (resultado === "nao_aprovada") return "Não aprovada";
  return "Aguardando decisão";
}

function tomResultado(resultado: HistoricoBanca["resultado"]): "success" | "danger" | "muted" {
  if (resultado === "aprovada") return "success";
  if (resultado === "nao_aprovada") return "danger";
  return "muted";
}

interface PerguntaEditavel {
  /** Da pergunta original — carregado só pra ida e volta com o backend (o
   *  editor não exibe nem deixa mexer nele). Presente = "é esta pergunta,
   *  só editada", o que faz o backend atualizar em vez de duplicar; ausente
   *  (linha criada por "Adicionar pergunta") = pergunta nova de verdade. */
  id?: number;
  texto: string;
  tipo_resposta: "nota" | "texto";
  escopo_id: number | null;
}

/** As perguntas de um formulário na forma que o editor manipula: ordenadas
 *  por `ordem` e sem o campo que o editor não mexe (a ordem vira a posição
 *  na lista). `id` viaja escondido — ver o comentário em `PerguntaEditavel`. */
function paraEditaveis(formulario: FormularioAtivo | null): PerguntaEditavel[] {
  return (formulario?.perguntas ?? [])
    .slice()
    .sort((a, b) => a.ordem - b.ordem)
    .map((p) => ({
      id: p.id,
      texto: p.texto,
      tipo_resposta: p.tipo_resposta,
      escopo_id: p.escopo_id,
    }));
}

export function Avaliacoes() {
  const { usuario, token } = useAuth();
  const [historico, setHistorico] = useState<HistoricoBanca[]>([]);
  const [formulario, setFormulario] = useState<FormularioAtivo | null>(null);
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [avaliacoesNotas, setAvaliacoesNotas] = useState<AvaliacaoNota[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioResumo[]>([]);
  const [escopos, setEscopos] = useState<Escopo[]>([]);
  const [frentes, setFrentes] = useState<Frente[]>([]);
  const [semestres, setSemestres] = useState<Semestre[]>([]);
  // Só o dashboard usa estes três: os cards de baixo vivem do histórico.
  const [bancas, setBancas] = useState<Banca[]>([]);
  const [candidaturas, setCandidaturas] = useState<Candidatura[]>([]);
  const [bancasFrentes, setBancasFrentes] = useState<BancaFrente[]>([]);
  const [cargaBancas, setCargaBancas] = useState<CargaBancaDeUsuario[]>([]);
  const [filtroCargaBancas, setFiltroCargaBancas] = useState<FiltroCargaBancas>("todas");
  const [erroCargaBancas, setErroCargaBancas] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const [filtroSemestre, setFiltroSemestre] = useState("");
  const [filtroCoordenador, setFiltroCoordenador] = useState("");
  const [filtroConsultor, setFiltroConsultor] = useState("");
  const [filtroEscopo, setFiltroEscopo] = useState("");
  const [filtroResultado, setFiltroResultado] = useState("");

  const [bancaDetalhe, setBancaDetalhe] = useState<HistoricoBanca | null>(null);
  const [editarFormulario, setEditarFormulario] = useState(false);

  // O formulário de banca saiu das caixas de cargo: volta a ser da diretoria.
  const podeEditarFormulario = !!usuario?.permissoes.pode_ver_dashboard_bancas;

  async function buscar() {
    if (!token) return;
    setCarregando(true);
    setErro("");
    try {
      const [historicoResp, formularioResp, avaliacoesResp, notasResp, usuariosResp, escoposResp, frentesResp, semestresResp, bancasResp, candidaturasResp, bancasFrentesResp] =
        await Promise.all([
          getHistoricoBancas(token),
          getFormularioAtivo(token).catch(() => null),
          getAvaliacoes(token),
          getAvaliacoesNotas(token),
          getUsuarios(token),
          getEscopos(token),
          getFrentes(token),
          getSemestres(token),
          getBancas(token),
          getCandidaturas(token),
          getBancasFrentes(token),
        ]);
      setHistorico(historicoResp);
      setFormulario(formularioResp);
      setAvaliacoes(avaliacoesResp);
      setAvaliacoesNotas(notasResp);
      setUsuarios(usuariosResp);
      setEscopos(escoposResp);
      setFrentes(frentesResp);
      setSemestres(semestresResp);
      setBancas(bancasResp);
      setCandidaturas(candidaturasResp);
      setBancasFrentes(bancasFrentesResp);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao carregar avaliações");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    buscar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  /* Separado do `buscar()` de cima: trocar o recorte (já atendidas/futuras/
     todas) não deveria recarregar histórico, avaliações e o resto da tela —
     só esta tabela. */
  useEffect(() => {
    if (!token) return;
    setErroCargaBancas("");
    getCargaBancas(token, filtroCargaBancas)
      .then(setCargaBancas)
      .catch((err) => setErroCargaBancas(err instanceof Error ? err.message : "Erro ao carregar a carga de bancas"));
  }, [token, filtroCargaBancas]);

  /* As listas dos filtros, na ordem em que se PROCURA nelas. O estado cru
     guarda a ordem que o backend devolveu, que não é ordem nenhuma, e o
     dashboard logo acima depende dessas mesmas listas — por isso a ordenação
     mora aqui, em cópias, e não no `setUsuarios`/`setEscopos`. */
  const usuariosOrdenados = useMemo(
    () => usuarios.slice().sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
    [usuarios],
  );
  const escoposOrdenados = useMemo(
    () => escopos.slice().sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
    [escopos],
  );
  /* Semestre não é alfabético: a ordem que serve é a do calendário, com o
     mais recente primeiro — é nele que se filtra quase sempre. */
  const semestresOrdenados = useMemo(
    () => semestres.slice().sort((a, b) => b.inicio.localeCompare(a.inicio)),
    [semestres],
  );

  const historicoFiltrado = useMemo(() => {
    return historico
      .filter((b) => {
        if (filtroSemestre && String(b.semestre_id) !== filtroSemestre) return false;
        if (filtroCoordenador && String(b.coordenador_id) !== filtroCoordenador) return false;
        if (filtroEscopo && String(b.escopo_id) !== filtroEscopo) return false;
        if (filtroResultado === "sem_resultado" ? b.resultado !== null : filtroResultado && b.resultado !== filtroResultado) {
          return false;
        }
        if (filtroConsultor) {
          const avaliou = avaliacoes.some(
            (a) => a.banca_id === b.id && a.avaliador_id === Number(filtroConsultor) && a.status === "submetida",
          );
          if (!avaliou) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.data_hora).getTime() - new Date(a.data_hora).getTime());
  }, [historico, filtroSemestre, filtroCoordenador, filtroConsultor, filtroEscopo, filtroResultado, avaliacoes]);

  /* Coordenador e escopo saem de OUTRAS listas (o histórico traz só o id), e
     é o nome exibido que precisa ordenar — por isso as colunas dependem
     delas em vez de serem constantes de módulo. */
  const colunas = useMemo(
    (): Colunas<HistoricoBanca> => ({
      projeto: { valor: (b) => b.nome_projeto, inicial: "asc" },
      data: { valor: (b) => b.data_hora, inicial: "desc" },
      coordenador: { valor: (b) => nomeUsuario(usuarios, b.coordenador_id), inicial: "asc" },
      escopo: { valor: (b) => b.escopos.join(", ") || nomeEscopo(escopos, b.escopo_id), inicial: "asc" },
      semestre: { valor: (b) => b.semestre_nome, inicial: "desc" },
      nota: { valor: (b) => b.nota_final, inicial: "desc" },
      resultado: {
        valor: (b) => (b.resultado === "aprovada" ? 2 : b.resultado === "nao_aprovada" ? 0 : 1),
        inicial: "desc",
      },
    }),
    [usuarios, escopos],
  );
  // Sem coluna inicial: a lista já vem da mais recente para a mais antiga.
  const { itens: bancasOrdenadas, ordem, ordenarPor } = useOrdenacao(historicoFiltrado, colunas);

  if (!usuario?.permissoes.pode_ver_dashboard_bancas) {
    return <Navigate to="/projetos" replace />;
  }

  if (erro) {
    return (
      <ErrorBlock>
        <ErrorText>Não foi possível carregar as avaliações: {erro}</ErrorText>
        <PageButton $variant="outline" onClick={buscar}>
          Tentar novamente
        </PageButton>
      </ErrorBlock>
    );
  }

  if (carregando) return <PageLoadingBlock />;

  return (
    <PageStack>
      <PageHeaderRow>
        <PageHeaderText>
          <PageHeading>Dashboard Bancas</PageHeading>
          <PageSubheading>
            Os números da área, a presença de cada membro e as notas das bancas realizadas.
          </PageSubheading>
        </PageHeaderText>
      </PageHeaderRow>

      <DashboardBancas
        bancas={bancas}
        candidaturas={candidaturas}
        avaliacoes={avaliacoes}
        usuarios={usuarios}
        escopos={escopos}
        frentes={frentes}
        bancasFrentes={bancasFrentes}
        historico={historico}
        semestres={semestres}
      />

      {/* Mesmo dado que o push automático usa pra rodízio — antes só existia
          dentro do cálculo dele, sem tela nenhuma pra conferir quem está
          sobrecarregado. Já vem ordenado do backend, carga maior primeiro. */}
      <PageCard>
        <PageCardHeader>
          <PageCardTitle>Carga de bancas por pessoa</PageCardTitle>
        </PageCardHeader>
        <PageCardContent>
          <FiltersRow>
            <FieldSelect
              value={filtroCargaBancas}
              onChange={(e) => setFiltroCargaBancas(e.target.value as FiltroCargaBancas)}
              style={{ width: "12rem" }}
            >
              <option value="todas">Já atendidas + futuras</option>
              <option value="realizadas">Só já atendidas</option>
              <option value="futuras">Só futuras</option>
            </FieldSelect>
          </FiltersRow>
          {erroCargaBancas ? (
            <ErrorText>{erroCargaBancas}</ErrorText>
          ) : cargaBancas.length === 0 ? (
            <EmptyText>Ninguém com banca neste recorte ainda.</EmptyText>
          ) : (
            <TableScrollWrap $scrollable={cargaBancas.length > LIST_MAX_VISIVEIS} $min="24rem">
              <DataTable>
                <TableHead>
                  <TableRow>
                    <TableHeadCell>Pessoa</TableHeadCell>
                    <TableHeadCell>Cargo</TableHeadCell>
                    <TableHeadCell>Bancas</TableHeadCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {cargaBancas.map((linha) => (
                    <TableRow key={linha.usuario_id}>
                      <NameCell>{linha.nome}</NameCell>
                      <TableCell style={{ textTransform: "capitalize" }}>{linha.posicao}</TableCell>
                      <TableCell>{linha.quantidade_bancas}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </DataTable>
            </TableScrollWrap>
          )}
        </PageCardContent>
      </PageCard>

      <PageCard>
        <PageCardHeader>
          <PageCardTitle>Bancas realizadas</PageCardTitle>
        </PageCardHeader>
        <PageCardContent>
          <FiltersRow>
            <FieldSelect value={filtroSemestre} onChange={(e) => setFiltroSemestre(e.target.value)} style={{ width: "10rem" }} pesquisavel>
              <option value="">Todos os semestres</option>
              {semestresOrdenados.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nome}
                </option>
              ))}
            </FieldSelect>
            <FieldSelect value={filtroCoordenador} onChange={(e) => setFiltroCoordenador(e.target.value)} style={{ width: "10rem" }} pesquisavel>
              <option value="">Todos os coordenadores</option>
              {usuariosOrdenados.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome}
                </option>
              ))}
            </FieldSelect>
            <FieldSelect value={filtroConsultor} onChange={(e) => setFiltroConsultor(e.target.value)} style={{ width: "10rem" }} pesquisavel>
              <option value="">Todos os avaliadores</option>
              {usuariosOrdenados.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome}
                </option>
              ))}
            </FieldSelect>
            <FieldSelect value={filtroEscopo} onChange={(e) => setFiltroEscopo(e.target.value)} style={{ width: "10rem" }} pesquisavel>
              <option value="">Todos os escopos</option>
              {escoposOrdenados.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nome}
                </option>
              ))}
            </FieldSelect>
            <FieldSelect
              value={filtroResultado}
              onChange={(e) => setFiltroResultado(e.target.value)}
              style={{ width: "10rem" }}
            >
              <option value="">Todos os resultados</option>
              <option value="aprovada">Aprovada</option>
              <option value="nao_aprovada">Não aprovada</option>
              <option value="sem_resultado">Aguardando decisão</option>
            </FieldSelect>
          </FiltersRow>

          {historicoFiltrado.length === 0 && <EmptyText>Nenhuma banca encontrada com os filtros selecionados.</EmptyText>}
          {historicoFiltrado.length > 0 && (
            <TableScrollWrap $scrollable={historicoFiltrado.length > LIST_MAX_VISIVEIS} $min="56rem">
            <DataTable>
              <TableHead>
                <TableRow>
                  <Th coluna="projeto" ordem={ordem} onOrdenar={ordenarPor}>
                    Projeto
                  </Th>
                  <Th coluna="data" ordem={ordem} onOrdenar={ordenarPor}>
                    Data
                  </Th>
                  <Th coluna="coordenador" ordem={ordem} onOrdenar={ordenarPor}>
                    Coordenador
                  </Th>
                  <Th coluna="escopo" ordem={ordem} onOrdenar={ordenarPor}>
                    Escopo
                  </Th>
                  <Th coluna="semestre" ordem={ordem} onOrdenar={ordenarPor}>
                    Semestre
                  </Th>
                  <Th coluna="nota" ordem={ordem} onOrdenar={ordenarPor}>
                    Nota
                  </Th>
                  <Th coluna="resultado" ordem={ordem} onOrdenar={ordenarPor}>
                    Resultado
                  </Th>
                  <TableHeadCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {bancasOrdenadas.map((banca) => (
                  <TableRow key={banca.id}>
                    <NameCell>
                      {banca.nome_projeto}
                      {banca.descricao_coordenador && (
                        <DescricaoIndicador title="Coordenador registrou descrição">
                          <NotebookPen size={13} aria-hidden="true" />
                        </DescricaoIndicador>
                      )}
                    </NameCell>
                    <TableCell>{paraDataUtc(banca.data_hora).toLocaleDateString("pt-BR", { timeZone: FUSO })}</TableCell>
                    <TableCell>{nomeUsuario(usuarios, banca.coordenador_id)}</TableCell>
                    <TableCell>{banca.escopos.join(", ") || nomeEscopo(escopos, banca.escopo_id)}</TableCell>
                    <TableCell>{banca.semestre_nome ?? "—"}</TableCell>
                    <NotaCell>{formatNota(banca.nota_final)}</NotaCell>
                    <TableCell>
                      <PageBadge $tone={tomResultado(banca.resultado)}>
                        {rotuloResultado(banca.resultado)}
                      </PageBadge>
                    </TableCell>
                    <ActionsCell>
                      <PageButtonSm $variant="outline" type="button" onClick={() => setBancaDetalhe(banca)}>
                        Ver avaliações
                      </PageButtonSm>
                    </ActionsCell>
                  </TableRow>
                ))}
              </TableBody>
            </DataTable>
            </TableScrollWrap>
          )}
        </PageCardContent>
      </PageCard>

      <PageCard>
        <PageCardHeader>
          <PageCardTitle>Formulário padrão de avaliação</PageCardTitle>
        </PageCardHeader>
        <PageCardContent>
          {formulario ? (
            <FormularioResumo>
              <FormularioResumoItem>
                <FormularioResumoValor>{formulario.perguntas.length}</FormularioResumoValor>
                <FormularioResumoLabel>Perguntas cadastradas</FormularioResumoLabel>
              </FormularioResumoItem>
              <FormularioResumoItem>
                <FormularioResumoValor>
                  {new Set(formulario.perguntas.map((p) => p.escopo_id).filter((id) => id != null)).size}
                </FormularioResumoValor>
                <FormularioResumoLabel>Escopos com pergunta própria</FormularioResumoLabel>
              </FormularioResumoItem>
              <FormularioResumoItem>
                <FormularioResumoValor>
                  {escopos.length -
                    new Set(formulario.perguntas.map((p) => p.escopo_id).filter((id) => id != null)).size}
                </FormularioResumoValor>
                <FormularioResumoLabel>Escopos ainda sem pergunta</FormularioResumoLabel>
              </FormularioResumoItem>
            </FormularioResumo>
          ) : (
            <EmptyText>Nenhum formulário ativo configurado no momento.</EmptyText>
          )}
          {podeEditarFormulario && (
            <CardActions>
              <PageButton type="button" onClick={() => setEditarFormulario(true)}>
                Editar formulário
              </PageButton>
            </CardActions>
          )}
        </PageCardContent>
      </PageCard>

      {bancaDetalhe && token && (
        <VerAvaliacoesModal
          banca={bancaDetalhe}
          usuarios={usuarios}
          candidaturas={candidaturas}
          avaliacoes={avaliacoes}
          avaliacoesNotas={avaliacoesNotas}
          token={token}
          onClose={() => setBancaDetalhe(null)}
          onPrazoMudou={(patch) => {
            setHistorico((atual) => atual.map((b) => (b.id === bancaDetalhe.id ? { ...b, ...patch } : b)));
            setBancaDetalhe((atual) => (atual ? { ...atual, ...patch } : atual));
          }}
        />
      )}

      {editarFormulario && token && (
        <EditarFormularioModal
          formulario={formulario}
          escopos={escopos}
          frentes={frentes}
          token={token}
          onClose={() => setEditarFormulario(false)}
          onSalvo={(novo) => {
            setFormulario(novo);
            setEditarFormulario(false);
          }}
        />
      )}
    </PageStack>
  );
}

/**
 * A janela de avaliação da banca, sucinta: abriu na realização, fecha 7
 * dias depois. Abrir/fechar na mão é pontual (2026-10-06, a pedido): a
 * diretoria reabre por exceção pra quem esqueceu, ou fecha antes; "voltar
 * ao automático" tira a exceção.
 */
function JanelaAvaliacao({
  banca,
  token,
  onMudou,
}: {
  banca: HistoricoBanca;
  token: string;
  onMudou: (patch: PatchPrazo) => void;
}) {
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  async function definir(override: "aberto" | "fechado" | null) {
    setSalvando(true);
    setErro("");
    try {
      const r = await definirPrazoAvaliacaoBanca(banca.id, override, token);
      onMudou({
        prazo_avaliacao_override: r.prazo_avaliacao_override,
        prazo_avaliacao: r.prazo_avaliacao,
        avaliacao_aberta: r.avaliacao_aberta,
      });
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível alterar");
    } finally {
      setSalvando(false);
    }
  }

  if (!banca.realizado_em) return <>banca ainda não realizada</>;

  const fmt = (iso: string) =>
    paraDataUtc(iso).toLocaleString("pt-BR", { timeZone: FUSO, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const override = banca.prazo_avaliacao_override;

  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.5rem" }}>
      <span>
        abriu {fmt(banca.realizado_em)}
        {banca.prazo_avaliacao && ` · fecha ${fmt(banca.prazo_avaliacao)}`}
      </span>
      <PageBadge $tone={banca.avaliacao_aberta ? "success" : "muted"}>
        {override === "aberto"
          ? "Aberta manualmente"
          : override === "fechado"
            ? "Fechada manualmente"
            : banca.avaliacao_aberta
              ? "Aberta"
              : "Encerrada"}
      </PageBadge>
      {override !== "aberto" && (
        <PageButtonSm type="button" $variant="outline" disabled={salvando} onClick={() => definir("aberto")}>
          Abrir manualmente
        </PageButtonSm>
      )}
      {override !== "fechado" && banca.avaliacao_aberta && (
        <PageButtonSm type="button" $variant="outline" disabled={salvando} onClick={() => definir("fechado")}>
          Fechar
        </PageButtonSm>
      )}
      {override !== null && (
        <PageButtonSm type="button" $variant="ghost" disabled={salvando} onClick={() => definir(null)}>
          Voltar ao automático
        </PageButtonSm>
      )}
      {erro && <span style={{ color: "var(--destructive, #c00)", fontSize: "0.8rem" }}>{erro}</span>}
    </div>
  );
}

type PatchPrazo = Pick<HistoricoBanca, "prazo_avaliacao_override" | "prazo_avaliacao" | "avaliacao_aberta">;

function VerAvaliacoesModal({
  banca,
  usuarios,
  candidaturas,
  avaliacoes,
  avaliacoesNotas,
  token,
  onClose,
  onPrazoMudou,
}: {
  banca: HistoricoBanca;
  usuarios: UsuarioResumo[];
  candidaturas: Candidatura[];
  avaliacoes: Avaliacao[];
  avaliacoesNotas: AvaliacaoNota[];
  token: string;
  onPrazoMudou: (patch: PatchPrazo) => void;
  onClose: () => void;
}) {
  const [medias, setMedias] = useState<NotaPorPergunta[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [avaliadorExpandido, setAvaliadorExpandido] = useState<number | null>(null);
  const [mostrarPendencias, setMostrarPendencias] = useState(false);

  useEffect(() => {
    getNotasPorPergunta(banca.id, token)
      .then(setMedias)
      .finally(() => setCarregando(false));
  }, [banca.id, token]);

  const avaliacoesSubmetidas = avaliacoes.filter((a) => a.banca_id === banca.id && a.status === "submetida");

  // Quem foi escalado e confirmou presença, mas ainda não enviou a
  // avaliação desta banca — a pergunta que "ver avaliações" não respondia
  // antes: dava pra ver quem JÁ enviou, não quem falta (2026-09-23, a
  // pedido, mesmo botão "Pendências" que já existe na Avaliação de
  // Desempenho). Cálculo 100% client-side: `candidaturas` e `avaliacoes` já
  // chegam carregadas na página, sem endpoint novo.
  const avaliadoresQueEnviaram = new Set(avaliacoesSubmetidas.map((a) => a.avaliador_id));
  const pendentes = candidaturas.filter(
    (c) => c.banca_id === banca.id && c.confirmado && !avaliadoresQueEnviaram.has(c.usuario_id),
  );

  // pergunta_id -> texto do critério, resolvido pelo backend em `medias`
  // (mesma ordem do formulário). É o que faltava pra cada nota individual
  // saber de qual critério ela é.
  const labelPorPergunta = new Map(
    medias.map((m) => [m.pergunta_id, m.texto ?? `Pergunta ${m.pergunta_id}`] as const),
  );

  return (
    <ModalOverlay onClick={onClose} role="presentation">
      <WideModalContent onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="avaliacoes-banca-titulo">
        <ModalHeader>
          <ModalTitle id="avaliacoes-banca-titulo">Avaliações, {banca.nome_projeto}</ModalTitle>
          <ModalClose type="button" aria-label="Fechar" onClick={onClose}>
            <X size={18} />
          </ModalClose>
        </ModalHeader>
        <ModalBody>
          <DetailList>
            <DetailRow>
              <DetailTerm>Data</DetailTerm>
              <DetailValue>{paraDataUtc(banca.data_hora).toLocaleDateString("pt-BR", { timeZone: FUSO })}</DetailValue>
            </DetailRow>
            <DetailRow>
              <DetailTerm>Coordenador</DetailTerm>
              <DetailValue>{nomeUsuario(usuarios, banca.coordenador_id)}</DetailValue>
            </DetailRow>
            <DetailRow>
              <DetailTerm>Semestre</DetailTerm>
              <DetailValue>{banca.semestre_nome ?? "—"}</DetailValue>
            </DetailRow>
            <DetailRow>
              <DetailTerm>Avaliação</DetailTerm>
              <DetailValue>
                <JanelaAvaliacao banca={banca} token={token} onMudou={onPrazoMudou} />
              </DetailValue>
            </DetailRow>
          </DetailList>

          <NotaFinalDestaque>
            Nota final: <strong>{formatNota(banca.nota_final)}</strong>
          </NotaFinalDestaque>

          <SectionTitle>Descrição do coordenador</SectionTitle>
          {banca.descricao_coordenador ? (
            <DescricaoQuote>{banca.descricao_coordenador}</DescricaoQuote>
          ) : (
            <EmptyText>O coordenador ainda não registrou uma descrição desta banca.</EmptyText>
          )}

          <SectionTitle>Médias por critério</SectionTitle>
          {carregando && <EmptyText>Carregando médias...</EmptyText>}
          {!carregando && medias.length === 0 && <EmptyText>Sem notas registradas.</EmptyText>}
          {!carregando && medias.length > 0 && (
            <DetailList>
              {medias.map((m) => (
                <DetailRow key={m.pergunta_id}>
                  <DetailTerm>{m.texto ?? `Pergunta ${m.pergunta_id}`}</DetailTerm>
                  <DetailValue>{formatNota(m.media)}</DetailValue>
                </DetailRow>
              ))}
            </DetailList>
          )}

          <SectionTitle>Avaliações individuais ({avaliacoesSubmetidas.length})</SectionTitle>
          <PreviewToggleRow>
            <PageButtonSm
              type="button"
              $variant="outline"
              onClick={() => setMostrarPendencias((v) => !v)}
            >
              {mostrarPendencias ? "Ocultar pendências" : `Pendências (${pendentes.length})`}
            </PageButtonSm>
          </PreviewToggleRow>
          {mostrarPendencias && (
            <SubLista>
              {pendentes.length === 0 ? (
                <EmptyText>Todo mundo escalado já enviou a avaliação.</EmptyText>
              ) : (
                pendentes.map((c) => (
                  <PendenciaCard key={c.id}>
                    <PendenciaIcone>
                      <AlertTriangle size={16} />
                    </PendenciaIcone>
                    <PendenciaTexto>
                      <PendenciaNome>{nomeUsuario(usuarios, c.usuario_id)}</PendenciaNome>{" "}
                      <PendenciaFaltamRotulo>ainda não enviou a avaliação</PendenciaFaltamRotulo>
                    </PendenciaTexto>
                  </PendenciaCard>
                ))
              )}
            </SubLista>
          )}
          {avaliacoesSubmetidas.length === 0 && <EmptyText>Nenhuma avaliação submetida.</EmptyText>}
          {avaliacoesSubmetidas.length > 0 && (
            <ListaExpansivel>
              {avaliacoesSubmetidas.map((av) => {
                const notas = avaliacoesNotas.filter((n) => n.avaliacao_id === av.id);
                const valores = notas.map((n) => n.nota).filter((v): v is number => v != null);
                const media = valores.length ? valores.reduce((s, v) => s + v, 0) / valores.length : null;
                const aberto = avaliadorExpandido === av.id;
                return (
                  <div key={av.id}>
                    <PessoaHeader
                      type="button"
                      onClick={() => setAvaliadorExpandido((atual) => (atual === av.id ? null : av.id))}
                    >
                      <span>
                        {nomeUsuario(usuarios, av.avaliador_id)}{" "}
                        {av.submetida_em && (
                          <PessoaContexto>
                            {/* `submetida_em` é UTC cru do backend — ver o
                                comentário em Desempenho.tsx. */}
                            ({paraDataUtc(av.submetida_em).toLocaleDateString("pt-BR", { timeZone: FUSO })})
                          </PessoaContexto>
                        )}
                      </span>
                      <PessoaResumo>
                        {notas.length} {notas.length === 1 ? "critério" : "critérios"}
                        {media != null && (
                          <>
                            {" · média "}
                            <PageBadge $tone={tomDaNota(media)}>
                              {formatNota(media)}
                            </PageBadge>
                          </>
                        )}
                      </PessoaResumo>
                    </PessoaHeader>
                    {aberto && (
                      <SubLista>
                        {notas.map((n) => (
                          <SubItem key={n.id}>
                            <span>{labelPorPergunta.get(n.pergunta_id) ?? `Pergunta ${n.pergunta_id}`}</span>
                            <SubItemMeta>
                              {n.nota != null ? (
                                <PageBadge $tone={tomDaNota(n.nota)}>
                                  {formatNota(n.nota)}
                                </PageBadge>
                              ) : (
                                n.resposta_texto || "—"
                              )}
                            </SubItemMeta>
                          </SubItem>
                        ))}
                        {av.comentario_feedback && (
                          <SubItem>
                            <span>Comentário</span>
                            <SubItemMeta>{av.comentario_feedback}</SubItemMeta>
                          </SubItem>
                        )}
                      </SubLista>
                    )}
                  </div>
                );
              })}
            </ListaExpansivel>
          )}
        </ModalBody>
        <ModalFooter>
          <PageButton $variant="outline" type="button" onClick={onClose}>
            Fechar
          </PageButton>
        </ModalFooter>
      </WideModalContent>
    </ModalOverlay>
  );
}

/** Seção "Geral" (Bloco 1/3, sem escopo) mais uma por escopo do catálogo,
 *  agrupadas por frente. Escopo sem pergunta ainda (ex.: Simulação e
 *  Otimização de Processos) aparece do mesmo jeito, com a seção vazia e o
 *  botão de adicionar, a diretoria cadastra as dela quando quiser. */
function agruparPorFrente(escopos: Escopo[], frentes: Frente[]) {
  const porFrente = new Map<number, Escopo[]>();
  for (const escopo of escopos) {
    if (escopo.frente_id == null) continue;
    const lista = porFrente.get(escopo.frente_id) ?? [];
    lista.push(escopo);
    porFrente.set(escopo.frente_id, lista);
  }
  return frentes
    .slice()
    .sort((a, b) => a.nome.localeCompare(b.nome))
    .map((frente) => ({
      frente,
      escopos: (porFrente.get(frente.id) ?? []).slice().sort((a, b) => a.nome.localeCompare(b.nome)),
    }))
    .filter((grupo) => grupo.escopos.length > 0);
}

function EditarFormularioModal({
  formulario,
  escopos,
  frentes,
  token,
  onClose,
  onSalvo,
}: {
  formulario: FormularioAtivo | null;
  escopos: Escopo[];
  frentes: Frente[];
  token: string;
  onClose: () => void;
  onSalvo: (formulario: FormularioAtivo) => void;
}) {
  const [perguntas, setPerguntas] = useState<PerguntaEditavel[]>(() =>
    paraEditaveis(formulario),
  );
  // ⚠ O seed do editor NÃO é a versão ativa direto: se ela estiver vazia
  // (alguém publicou uma versão curta e desativou a boa — sem merge), o
  // editor abriria em branco e republicar apagaria tudo. `/para-editar`
  // devolve a última versão COM conteúdo. Enquanto ela não chega, mostra o
  // que veio no prop.
  const [carregandoBase, setCarregandoBase] = useState(true);
  const [baseCount, setBaseCount] = useState(formulario?.perguntas.length ?? 0);
  const [confirmandoReducao, setConfirmandoReducao] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [previsualizando, setPrevisualizando] = useState(false);

  useEffect(() => {
    let vivo = true;
    getFormularioParaEditar(token)
      .then((base) => {
        if (!vivo) return;
        setPerguntas(paraEditaveis(base));
        setBaseCount(base.perguntas.length);
      })
      .catch(() => {
        /* sem base recuperável: fica com o seed do prop */
      })
      .finally(() => {
        if (vivo) setCarregandoBase(false);
      });
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const gruposPorFrente = useMemo(() => agruparPorFrente(escopos, frentes), [escopos, frentes]);

  function atualizar(index: number, campo: "texto" | "tipo_resposta", valor: string) {
    setPerguntas((lista) =>
      lista.map((p, i) => (i === index ? { ...p, [campo]: valor } : p)),
    );
  }

  function adicionar(escopoId: number | null) {
    setConfirmandoReducao(false);
    setErro("");
    setPerguntas((lista) => [...lista, { texto: "", tipo_resposta: "nota", escopo_id: escopoId }]);
  }

  function remover(index: number) {
    setConfirmandoReducao(false);
    setErro("");
    setPerguntas((lista) => lista.filter((_, i) => i !== index));
  }

  /** Reordena dentro do mesmo escopo (a ordem só importa entre perguntas do
   *  mesmo bloco. Geral e cada escopo são exibidos e reagrupados por tipo
   *  separadamente na hora da avaliação). */
  function mover(escopoId: number | null, posicaoNaSecao: number, direcao: -1 | 1) {
    setPerguntas((lista) => {
      const indicesDaSecao = lista
        .map((_, i) => i)
        .filter((i) => lista[i].escopo_id === escopoId);
      const alvoPos = posicaoNaSecao + direcao;
      if (alvoPos < 0 || alvoPos >= indicesDaSecao.length) return lista;
      const i1 = indicesDaSecao[posicaoNaSecao];
      const i2 = indicesDaSecao[alvoPos];
      const nova = lista.slice();
      [nova[i1], nova[i2]] = [nova[i2], nova[i1]];
      return nova;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validas = perguntas.filter((p) => p.texto.trim());
    if (validas.length === 0) {
      setErro("Adicione ao menos uma pergunta.");
      return;
    }
    // ⚠ "Publicar nova versão" REESCREVE o formulário inteiro (sem merge).
    // Se a nova lista tem menos perguntas que a atual, alguém pode estar
    // publicando por cima do que outra pessoa acabou de salvar. Um segundo
    // clique confirma.
    if (validas.length < baseCount && !confirmandoReducao) {
      setConfirmandoReducao(true);
      setErro(
        `A versão atual tem ${baseCount} perguntas; esta teria ${validas.length}. ` +
          `Publicar vai REMOVER ${baseCount - validas.length}. Clique em "Publicar" de novo para confirmar.`,
      );
      return;
    }
    setSalvando(true);
    setErro("");
    try {
      const novo = await createNovaVersaoFormulario(
        validas.map(
          (p, i): PerguntaNovaVersao => ({
            id: p.id,
            texto: p.texto.trim(),
            ordem: i + 1,
            tipo_resposta: p.tipo_resposta,
            escopo_id: p.escopo_id,
          }),
        ),
        token,
      );
      onSalvo(novo);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao salvar formulário");
    } finally {
      setSalvando(false);
    }
  }

  function renderSecao(titulo: string, escopoId: number | null) {
    const linhas = perguntas
      .map((p, index) => ({ ...p, index }))
      .filter((p) => p.escopo_id === escopoId);

    return (
      <PerguntaSecao key={escopoId ?? "geral"}>
        <PerguntaSecaoTitulo>{titulo}</PerguntaSecaoTitulo>
        {linhas.length === 0 && <PerguntaSecaoVazia>Nenhuma pergunta ainda.</PerguntaSecaoVazia>}
        <PerguntaEditorList>
          {linhas.map(({ index, texto, tipo_resposta }, posicao) => (
            <PerguntaEditorRow key={index}>
              <FieldInput
                value={texto}
                onChange={(e) => atualizar(index, "texto", e.target.value)}
                placeholder="Texto da pergunta"
                required
              />
              <FieldSelect
                value={tipo_resposta}
                onChange={(e) => atualizar(index, "tipo_resposta", e.target.value)}
                aria-label="Tipo da pergunta"
              >
                <option value="nota">Nota, escala de 1 a 5</option>
                <option value="texto">Texto</option>
              </FieldSelect>
              <MoveButtonGroup>
                <MoveButton
                  type="button"
                  aria-label="Mover para cima"
                  disabled={posicao === 0}
                  onClick={() => mover(escopoId, posicao, -1)}
                >
                  ▲
                </MoveButton>
                <MoveButton
                  type="button"
                  aria-label="Mover para baixo"
                  disabled={posicao === linhas.length - 1}
                  onClick={() => mover(escopoId, posicao, 1)}
                >
                  ▼
                </MoveButton>
              </MoveButtonGroup>
              <RemoveButton type="button" onClick={() => remover(index)}>
                Remover
              </RemoveButton>
            </PerguntaEditorRow>
          ))}
        </PerguntaEditorList>
        <PageButtonSm type="button" $variant="outline" onClick={() => adicionar(escopoId)}>
          <Plus size={14} />
          Adicionar pergunta
        </PageButtonSm>
      </PerguntaSecao>
    );
  }

  /** Mesma seção, mas como quem vai preencher a avaliação vai ver, os
   *  componentes reais do formulário (NotaEscala) desabilitados, sem os
   *  controles de edição. */
  function renderSecaoPreview(titulo: string, escopoId: number | null) {
    const linhas = perguntas.filter((p) => p.escopo_id === escopoId && p.texto.trim());
    const notas = linhas.filter((p) => isPerguntaNota(p.tipo_resposta));
    const textos = linhas.filter((p) => !isPerguntaNota(p.tipo_resposta));

    return (
      <PerguntaSecao key={escopoId ?? "geral"}>
        <PerguntaSecaoTitulo>{titulo}</PerguntaSecaoTitulo>
        {linhas.length === 0 && <PerguntaSecaoVazia>Nenhuma pergunta ainda.</PerguntaSecaoVazia>}
        {notas.length > 0 && (
          <NotaEscalaGrupo>
            {notas.map((p, i) => (
              <NotaEscala key={i} label={p.texto} value={null} disabled />
            ))}
          </NotaEscalaGrupo>
        )}
        {textos.map((p, i) => (
          <FieldGroup key={i}>
            <FieldLabel>{p.texto}</FieldLabel>
            <FieldTextarea disabled placeholder="Resposta em texto" />
          </FieldGroup>
        ))}
      </PerguntaSecao>
    );
  }

  return (
    <ModalOverlay onClick={onClose} role="presentation">
      <FormularioModalContent
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="editar-form-titulo"
      >
        <ModalHeader>
          <ModalTitle id="editar-form-titulo">Editar formulário padrão</ModalTitle>
          <ModalClose type="button" aria-label="Fechar" onClick={onClose}>
            <X size={18} />
          </ModalClose>
        </ModalHeader>
        <FormStack onSubmit={handleSubmit}>
          <ModalBody>
            <FormHint>
              Uma nova versão será criada para o semestre atual. Bancas já avaliadas mantêm o formulário anterior.
              As perguntas "Geral" aparecem em toda avaliação; as de um escopo só aparecem quando a banca
              avaliada é daquele escopo.
            </FormHint>

            <PreviewToggleRow>
              <PageButtonSm type="button" $variant="outline" onClick={() => setPrevisualizando((v) => !v)}>
                {previsualizando ? "Voltar a editar" : "Pré-visualizar"}
              </PageButtonSm>
            </PreviewToggleRow>

            {previsualizando ? (
              <>
                {renderSecaoPreview("Geral (informações iniciais e avaliação final)", null)}
                {gruposPorFrente.map(({ frente, escopos: escoposDaFrente }) => (
                  <PerguntaGrupoFrente key={frente.id}>
                    <SectionTitle>{frente.nome}</SectionTitle>
                    {escoposDaFrente.map((escopo) => renderSecaoPreview(escopo.nome, escopo.id))}
                  </PerguntaGrupoFrente>
                ))}
              </>
            ) : (
              <>
                {renderSecao("Geral (informações iniciais e avaliação final)", null)}
                {gruposPorFrente.map(({ frente, escopos: escoposDaFrente }) => (
                  <PerguntaGrupoFrente key={frente.id}>
                    <SectionTitle>{frente.nome}</SectionTitle>
                    {escoposDaFrente.map((escopo) => renderSecao(escopo.nome, escopo.id))}
                  </PerguntaGrupoFrente>
                ))}
              </>
            )}

            {erro && <FormErrorText>{erro}</FormErrorText>}
          </ModalBody>
          <ModalFooter>
            <PageButton $variant="outline" type="button" onClick={onClose}>
              Cancelar
            </PageButton>
            <PageButton
              type="submit"
              disabled={salvando || previsualizando || carregandoBase}
            >
              {salvando
                ? "Salvando..."
                : carregandoBase
                  ? "Carregando..."
                  : confirmandoReducao
                    ? "Publicar mesmo assim"
                    : "Publicar nova versão"}
            </PageButton>
          </ModalFooter>
        </FormStack>
      </FormularioModalContent>
    </ModalOverlay>
  );
}
