import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Archive,
  AlertTriangle,
  ArrowDownNarrowWide,
  ArrowUpNarrowWide,
  ArrowRight,
  CheckSquare,
  ChevronDown,
  LayoutGrid,
  KanbanSquare,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getFrentes } from "@/lib/bancas";
import {
  arquivarProjeto,
  CORES_STATUS,
  deletarProjetoPermanente,
  formatarDataHoraBanca,
  getProjetos,
  mudarStatus,
  ordemStatus,
  ROTULO_STATUS,
} from "@/lib/projetos";
import { getUsuarios } from "@/lib/usuarios";
import { getProjetosComVaga, getSolicitacoesRecebidas } from "@/lib/vagas";
import { ProjetoKanbanBoard } from "@/components/kanban/ProjetoKanbanBoard";
import { Ponto } from "@/components/kanban/Kanban.styled";
import { ConfirmarModal } from "@/components/ConfirmarModal";
import { tonsDaColuna } from "@/lib/colunas-tarefa";
import type { UsuarioResumo } from "@/types/auth";
import type { Frente } from "@/types/banca";
import type { ProjetoResumo, StatusProjeto } from "@/types/projeto";
import { pode, podeFiltrarPorFrente, rotuloProjetos } from "@/utils/permissoes";
import {
  PageStack,
  PageButton,
  PageBadge,
  PageLoadingBlock,
  ErrorBlock,
  ErrorText,
  EmptyText,
} from "@/styles/page.styled";
import {
  PageHeaderRow,
  PageHeaderText,
  PageHeading,
  PageSubheading,
  CardGrid,
  ProjetoCard,
  CardTitle,
  TagRow,
  FrenteTag,
  StatusPilula,
  CardEquipe,
  CardAlerta,
  FiltersRow,
  FrenteFilterWrap,
  FrenteFilterButton,
  FrenteFilterPanel,
  FrenteFilterFooter,
  FrenteFilterDivisor,
  FrenteFilterSecao,
  FrenteFilterOpcao,
  CheckboxLabel,
  ViewToggleRow,
  ViewToggleBtn,
  VagasSelo,
  PendenteDot,
  FormErrorText,
  SelecaoBarra,
  SelecaoCheckboxWrap,
  SelecaoContagem,
} from "./Projetos.styled";

type ModoVisualizacao = "lista" | "kanban" | "arquivados";

export function ProjetosList() {
  const { usuario, token } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [projetos, setProjetos] = useState<ProjetoResumo[]>([]);
  const [frentes, setFrentes] = useState<Frente[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioResumo[]>([]);
  const [frentesSelecionadas, setFrentesSelecionadas] = useState<number[]>([]);
  const [filtroAberto, setFiltroAberto] = useState(false);
  // Independente do modo "Arquivados": dá pra misturar os arquivados na
  // lista/kanban geral também, pra quem quer comparar lado a lado com os
  // ativos sem trocar de aba.
  const [mostrarArquivados, setMostrarArquivados] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  // O kanban é a visão prioritária de Projetos, a lista é a segunda opção,
  // pra quem quer conferir/ordenar em texto corrido, e "Arquivados" é a
  // MESMA lista, só que com outro recorte de conteúdo (não é uma página
  // separada, ver `projetosVisiveis` abaixo). Guardado na URL (não só em
  // estado local) pra "voltar" de dentro de um projeto devolver pro modo de
  // onde a pessoa veio, em vez de sempre resetar pro kanban.
  const [modo, setModoState] = useState<ModoVisualizacao>(
    searchParams.get("modo") === "lista"
      ? "lista"
      : searchParams.get("modo") === "arquivados"
        ? "arquivados"
        : "kanban",
  );
  function setModo(novoModo: ModoVisualizacao) {
    setModoState(novoModo);
    setSearchParams(novoModo === "kanban" ? {} : { modo: novoModo }, { replace: true });
    setSelecaoAtiva(false);
    setSelecionados(new Set());
  }

  function alternarSelecao(id: number) {
    setSelecionados((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  async function arquivarSelecionados() {
    if (!token || selecionados.size === 0) return;
    setProcessandoMassa(true);
    setErroMassa("");
    try {
      await Promise.all([...selecionados].map((id) => arquivarProjeto(id, token)));
      setSelecionados(new Set());
      setSelecaoAtiva(false);
      await carregar();
    } catch (err) {
      setErroMassa(err instanceof Error ? err.message : "Erro ao arquivar os projetos selecionados");
    } finally {
      setProcessandoMassa(false);
    }
  }

  async function excluirSelecionados() {
    if (!token || selecionados.size === 0) return;
    setProcessandoMassa(true);
    try {
      await Promise.all([...selecionados].map((id) => deletarProjetoPermanente(id, token)));
      setSelecionados(new Set());
      setSelecaoAtiva(false);
      setConfirmandoExclusaoMassa(false);
      await carregar();
    } catch (err) {
      setProcessandoMassa(false);
      throw err;
    }
  }
  const [avisoKanban, setAvisoKanban] = useState("");
  const [ordemAsc, setOrdemAsc] = useState(true);
  const [vagasAbertas, setVagasAbertas] = useState<number | null>(null);
  const [projetosComPendencia, setProjetosComPendencia] = useState<Set<number>>(new Set());
  const filtroRef = useRef<HTMLDivElement>(null);

  // Seleção em massa: só existe em Lista (pra arquivar vários) e em
  // Arquivados (pra apagar vários) — no Kanban o card já é a superfície de
  // arrasto, e emprestar o clique dele pra seleção ambiguaria os dois gestos.
  const [selecaoAtiva, setSelecaoAtiva] = useState(false);
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set());
  const [processandoMassa, setProcessandoMassa] = useState(false);
  const [erroMassa, setErroMassa] = useState("");
  const [confirmandoExclusaoMassa, setConfirmandoExclusaoMassa] = useState(false);

  const podeFiltrar = podeFiltrarPorFrente(usuario);
  const podeCriar = !!usuario?.permissoes.pode_criar_projeto;
  const podeArrastarKanban = pode(usuario, "mover_projeto_kanban");
  const podeArquivar = pode(usuario, "arquivar_projeto");

  async function carregar() {
    if (!token) return;
    setCarregando(true);
    setErro("");
    try {
      // O recorte de visão é do backend: `GET /projetos` já vem filtrado pelo
      // token. O filtro por frente(s), aqui, é só um refinamento no cliente —
      // pra permitir marcar várias frentes de uma vez, um projeto sinérgico
      // aparece assim que QUALQUER uma das suas frentes estiver marcada.
      const [projetosResp, frentesResp, usuariosResp] = await Promise.all([
        // `frente_id` não vai mais pro backend, o filtro de frente(s) virou
        // um refinamento no cliente (ver `projetosVisiveis` abaixo), pra
        // suportar marcar várias de uma vez. Arquivados sempre vêm junto
        // (quando a permissão existe), a aba "Arquivados" e o checkbox
        // "Mostrar" só filtram em cima do mesmo dado já carregado, sem
        // precisar de uma nova busca a cada troca.
        getProjetos(token, null, podeArquivar),
        getFrentes(token),
        getUsuarios(token),
      ]);
      setProjetos(projetosResp);
      setFrentes(frentesResp);
      setUsuarios(usuariosResp);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao carregar projetos");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Só a contagem, pro botão "Vagas abertas" — a lista completa (com
  // impedimento, coordenador, etc.) só é buscada dentro de /vagas.
  //
  // ⚠ `vagas_disponiveis`, nunca `projetos.length` (2026-09-05, corrigido a
  // pedido): `projetos` traz todo projeto aberto, cheio ou não, e de
  // qualquer frente — contar o array dizia "20 vagas" quando a soma real,
  // só das frentes do usuário, era 4. `vagas_disponiveis` já vem somado e
  // recortado do backend.
  useEffect(() => {
    if (!token) return;
    let ativo = true;
    getProjetosComVaga(token)
      .then((r) => {
        if (ativo) setVagasAbertas(r.vagas_disponiveis);
      })
      .catch(() => {
        // Contagem é só um adorno do botão — sem ela, o botão continua
        // levando pra /vagas normalmente.
      });
    return () => {
      ativo = false;
    };
  }, [token]);

  // A bolinha vermelha no card (§7.3): só marca projeto que ESTA pessoa pode
  // responder — o endpoint já vem escopado assim (coordenador do projeto,
  // gerência ou diretoria), então não precisa checar permissão de novo aqui.
  useEffect(() => {
    if (!token) return;
    let ativo = true;
    getSolicitacoesRecebidas(token)
      .then((r) => {
        if (ativo) {
          setProjetosComPendencia(
            new Set(r.filter((s) => s.status === "pendente").map((s) => s.projeto_id)),
          );
        }
      })
      .catch(() => {});
    return () => {
      ativo = false;
    };
  }, [token]);

  useEffect(() => {
    if (!filtroAberto) return;
    function aoClicarFora(e: MouseEvent) {
      if (filtroRef.current && !filtroRef.current.contains(e.target as Node)) {
        setFiltroAberto(false);
      }
    }
    document.addEventListener("mousedown", aoClicarFora);
    return () => document.removeEventListener("mousedown", aoClicarFora);
  }, [filtroAberto]);

  const nomeFrente = (id: number) => frentes.find((f) => f.id === id)?.nome ?? `Frente ${id}`;
  const nomeUsuario = (id: number) => usuarios.find((u) => u.id === id)?.nome ?? `Usuário ${id}`;

  function alternarFrente(id: number) {
    setFrentesSelecionadas((atual) =>
      atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id],
    );
  }

  /**
   * Otimista, igual ao kanban de tarefas: o card já pula de coluna antes da
   * resposta do PATCH. A fonte da verdade nunca é o arrasto local — o status
   * final vem da resposta, e uma recusa recarrega a lista do servidor.
   */
  async function moverStatus(projetoId: number, statusNovo: StatusProjeto) {
    if (!token) return;
    const anterior = projetos;
    setProjetos((lista) => lista.map((p) => (p.id === projetoId ? { ...p, status: statusNovo } : p)));
    setAvisoKanban("");
    try {
      // ⭐ O status que vale é o que o backend DEVOLVE, não o que se pediu.
      // Arrastar para Ambientação com a janela já vencida (kickoff antigo)
      // faz `encerrar_ambientacao` virar para Em andamento na mesma
      // requisição — o §4 chama isso de a única transição automática. Fixando
      // o palpite otimista, o card ficava parado em Ambientação enquanto o
      // banco já dizia Em andamento, e o arrasto seguinte mandava
      // `em_andamento` sobre `em_andamento` e voltava 422.
      const resposta = await mudarStatus(projetoId, statusNovo, token);
      if (resposta.status !== statusNovo) {
        setProjetos((lista) =>
          lista.map((p) => (p.id === projetoId ? { ...p, status: resposta.status } : p)),
        );
      }
    } catch (err) {
      setAvisoKanban(err instanceof Error ? err.message : "Erro ao mudar o status do projeto");
      // Volta pro retrato anterior NA HORA (o card não pode ficar na coluna
      // errada enquanto a rede responde) e, logo depois, recarrega do
      // servidor.
      //
      // ⭐ O recarregar é o que fecha o buraco: a recusa mais comum é
      // justamente a tela estar atrasada — outra pessoa mexeu, ou a virada
      // automática de Ambientação correu por baixo. Nesses casos `anterior`
      // TAMBÉM está velho, e voltar pra ele deixa o card na mesma coluna
      // errada, pronto pra ser arrastado de novo e recusado de novo. Foi esse
      // laço que apareceu no teste do MEDICINA II.
      setProjetos(anterior);
      carregar();
    }
  }

  // "Arquivados" é a MESMA tela de Lista, só trocando o recorte de conteúdo
  //, nunca uma rota/página à parte. Fora dela, o checkbox "Mostrar"
  // é quem decide se os arquivados aparecem misturados aos ativos.
  // ⚠ 2026-09-21 — a pedido: "Contrato em elaboração" não é venda de
  // verdade ainda, e a diretora não quer esses projetos aparecendo na lista
  // geral (kanban ou tabela) — eles ficam só na aba Contratos
  // (`ContratosPainel.tsx`) até o contrato ser assinado e o projeto virar
  // "Vendido" de verdade, quando entram aqui como qualquer outro.
  //
  // Institucional (Agro etc.) fica fora pra SEMPRE, mesmo depois de
  // "vendido" — não é entrega de consultoria, misturar poluiria a lista
  // geral (a aba Contratos é o lugar dele).
  const projetosVisiveis =
    modo === "arquivados"
      ? projetos.filter((p) => p.arquivado_em && !p.institucional)
      : projetos.filter(
          (p) =>
            (mostrarArquivados || !p.arquivado_em) &&
            p.status !== "contrato_em_elaboracao" &&
            !p.institucional,
        );

  const projetosFiltrados =
    frentesSelecionadas.length === 0
      ? projetosVisiveis
      : projetosVisiveis.filter((p) => p.frente_ids.some((id) => frentesSelecionadas.includes(id)));

  // Ordena pela mesma fila de fases do kanban (`ordemStatus`), não por nome —
  // é a etapa do ciclo de vida que a diretoria quer varrer em ordem, com a
  // direção (crescente/decrescente) escolhida ao lado.
  const projetosOrdenados = [...projetosFiltrados].sort((a, b) => {
    const diferenca = ordemStatus(a.status) - ordemStatus(b.status);
    return ordemAsc ? diferenca : -diferenca;
  });

  if (erro) {
    return (
      <ErrorBlock>
        <ErrorText>Não foi possível carregar os projetos: {erro}</ErrorText>
        <PageButton $variant="outline" onClick={carregar}>
          Tentar novamente
        </PageButton>
      </ErrorBlock>
    );
  }

  // Só bloqueia a tela na PRIMEIRA carga (sem dado nenhum ainda). Reconsultas
  // disparadas por um filtro (ex.: "Mostrar arquivados") mantêm a lista atual
  // visível enquanto busca, sem isso, cada clique piscava a tela inteira
  // pra um spinner, parecendo um reload em vez de uma atualização.
  if (carregando && projetos.length === 0) return <PageLoadingBlock />;

  const pendentes = projetosFiltrados.filter((p) => p.kickoff_pendente).length;
  const mostrarSecaoOrdem = modo !== "kanban";
  const mostrarSecaoArquivados = podeArquivar && modo !== "arquivados";

  return (
    <PageStack>
      <PageHeaderRow>
        <PageHeaderText>
          <PageHeading>{rotuloProjetos(usuario)}</PageHeading>
          <PageSubheading>
            {projetosFiltrados.length} {projetosFiltrados.length === 1 ? "projeto" : "projetos"}
            {pendentes > 0 && ` · ${pendentes} com kickoff pendente`}
          </PageSubheading>
          {!!vagasAbertas && (
            <VagasSelo
              to="/vagas"
              state={{ voltarPara: `/projetos?modo=${modo}`, voltarRotulo: "Voltar para Projetos" }}
            >
              {vagasAbertas} {vagasAbertas === 1 ? "vaga aberta" : "vagas abertas"}
              <ArrowRight size={12} />
            </VagasSelo>
          )}
        </PageHeaderText>

        <FiltersRow>
          <ViewToggleRow role="tablist" aria-label="Modo de visualização">
            <ViewToggleBtn
              type="button"
              role="tab"
              aria-selected={modo === "kanban"}
              $ativo={modo === "kanban"}
              onClick={() => setModo("kanban")}
            >
              <KanbanSquare size={14} />
              Kanban
            </ViewToggleBtn>
            <ViewToggleBtn
              type="button"
              role="tab"
              aria-selected={modo === "lista"}
              $ativo={modo === "lista"}
              onClick={() => setModo("lista")}
            >
              <LayoutGrid size={14} />
              Lista
            </ViewToggleBtn>
            {/* Arquivados é a MESMA tela de Lista, troca só o recorte
                de conteúdo (`projetosVisiveis`), não a rota nem o
                componente. */}
            {podeArquivar && (
              <ViewToggleBtn
                type="button"
                role="tab"
                aria-selected={modo === "arquivados"}
                $ativo={modo === "arquivados"}
                onClick={() => setModo("arquivados")}
              >
                <Archive size={14} />
                Arquivados
              </ViewToggleBtn>
            )}
          </ViewToggleRow>
          <FrenteFilterWrap ref={filtroRef}>
            <FrenteFilterButton
              type="button"
              aria-haspopup="listbox"
              aria-expanded={filtroAberto}
              onClick={() => setFiltroAberto((aberto) => !aberto)}
            >
              Filtros
              <ChevronDown size={14} />
            </FrenteFilterButton>
            {filtroAberto && (
              <FrenteFilterPanel role="listbox" aria-label="Filtros">
                {podeFiltrar && (
                  <>
                    <FrenteFilterSecao>Frentes</FrenteFilterSecao>
                    {frentes.map((frente) => (
                      <CheckboxLabel key={frente.id}>
                        <input
                          type="checkbox"
                          checked={frentesSelecionadas.includes(frente.id)}
                          onChange={() => alternarFrente(frente.id)}
                        />
                        {frente.nome}
                      </CheckboxLabel>
                    ))}
                    {frentesSelecionadas.length > 0 && (
                      <FrenteFilterFooter type="button" onClick={() => setFrentesSelecionadas([])}>
                        Limpar seleção
                      </FrenteFilterFooter>
                    )}
                    {(mostrarSecaoOrdem || mostrarSecaoArquivados) && <FrenteFilterDivisor />}
                  </>
                )}

                {/* Ordem só faz sentido em Lista/Arquivados, no Kanban quem
                    organiza os cards é a coluna (status), não uma fila
                    crescente/decrescente. */}
                {mostrarSecaoOrdem && (
                  <>
                    <FrenteFilterSecao>Ordem</FrenteFilterSecao>
                    <FrenteFilterOpcao type="button" onClick={() => setOrdemAsc((atual) => !atual)}>
                      {ordemAsc ? <ArrowDownNarrowWide size={14} /> : <ArrowUpNarrowWide size={14} />}
                      {ordemAsc ? "Início → Fim" : "Fim → Início"}
                    </FrenteFilterOpcao>
                    {mostrarSecaoArquivados && <FrenteFilterDivisor />}
                  </>
                )}

                {/* Já dentro da aba Arquivados o checkbox não faz sentido —
                    o recorte ali JÁ é só arquivados. */}
                {mostrarSecaoArquivados && (
                  <>
                    <FrenteFilterSecao>Arquivados</FrenteFilterSecao>
                    <CheckboxLabel>
                      <input
                        type="checkbox"
                        checked={mostrarArquivados}
                        onChange={(e) => setMostrarArquivados(e.target.checked)}
                      />
                      Mostrar
                    </CheckboxLabel>
                  </>
                )}
              </FrenteFilterPanel>
            )}
          </FrenteFilterWrap>
          {/* 2026-09-23, a pedido: atalho que pula direto pra "vendido".
              O fluxo normal é abrir o Contrato de Prestação na aba Contratos
              e deixar ele levar o projeto a "vendido" sozinho quando
              assinado; isto aqui é pra quando esse fluxo não é viável, não o
              caminho ideal. Desde 2026-10-13 quem vê é a caixa
              `pode_criar_projeto_atalho` (nasce só na diretoria de
              projetos), não mais o cargo. `podeCriar` junto porque a rota
              `/projetos/novo` continua exigindo `pode_criar_projeto`. */}
          {podeCriar && usuario?.permissoes.pode_criar_projeto_atalho && (
            <PageButton
              as={Link}
              to="/projetos/novo"
              // ⭐ 2026-09-23 — `/projetos/novo` também é aberto pelo fluxo
              // NORMAL (assistente de Novo Contrato → "Projeto de entrega
              // novo") — sem este estado marcando a origem, a tela não tinha
              // como saber se devia avisar do atalho/pular pra "Vendido" só
              // porque quem está logada é diretora de projetos.
              state={{ atalho: true }}
              $variant="outline"
              title='Atalho — cria o projeto já como "Vendido", sem passar pelo Contrato de Prestação. O fluxo ideal é abrir o contrato na aba Contratos.'
            >
              + Novo projeto (atalho)
            </PageButton>
          )}
          {podeArquivar && (
            <PageButton
              type="button"
              $variant="outline"
              onClick={() => {
                // Seleção só existe em Lista/Arquivados (ver comentário nos
                // states lá em cima) — vindo do Kanban, que é o modo padrão,
                // o clique já troca de visão em vez de fazer a pessoa
                // procurar o botão "Lista" primeiro pra só então achar este.
                if (modo === "kanban") setModo("lista");
                setSelecaoAtiva((atual) => (modo === "kanban" ? true : !atual));
                setSelecionados(new Set());
                setErroMassa("");
              }}
            >
              <CheckSquare size={16} />
              {selecaoAtiva ? "Cancelar seleção" : "Selecionar"}
            </PageButton>
          )}
        </FiltersRow>
      </PageHeaderRow>

      {selecaoAtiva && selecionados.size > 0 && (
        <SelecaoBarra>
          <SelecaoContagem>
            {selecionados.size} {selecionados.size === 1 ? "selecionado" : "selecionados"}
          </SelecaoContagem>
          {modo === "arquivados" ? (
            <PageButton
              type="button"
              $variant="outline"
              disabled={processandoMassa}
              onClick={() => setConfirmandoExclusaoMassa(true)}
            >
              Apagar para sempre
            </PageButton>
          ) : (
            <PageButton type="button" disabled={processandoMassa} onClick={arquivarSelecionados}>
              {processandoMassa ? "Arquivando…" : "Arquivar selecionados"}
            </PageButton>
          )}
        </SelecaoBarra>
      )}
      {erroMassa && <FormErrorText>{erroMassa}</FormErrorText>}

      {projetosFiltrados.length === 0 ? (
        modo !== "arquivados" && frentesSelecionadas.length === 0 && !podeCriar ? (
          /* Quem não está em projeto nenhum via só uma frase e um beco sem
             saída, e tela vazia sem explicação parece defeito. Agora ela diz
             o que fazer e leva para lá. São ~28 pessoas hoje. */
          <EmptyText>
            Você ainda não está em nenhum projeto.{" "}
            <Link
              to="/vagas"
              state={{ voltarPara: `/projetos?modo=${modo}`, voltarRotulo: "Voltar para Projetos" }}
            >
              Veja os projetos com vaga
            </Link>{" "}
            e peça para entrar em um,
            quem responde é o coordenador.
          </EmptyText>
        ) : (
          <EmptyText>
            {modo === "arquivados" ? (
              "Nenhum projeto arquivado."
            ) : frentesSelecionadas.length > 0 ? (
              "Nenhum projeto nas frentes selecionadas."
            ) : (
              <>
                Nenhum projeto ainda. Todo projeto começa por um contrato — veja a{" "}
                <Link to="/contratos">aba Contratos</Link>.
              </>
            )}
          </EmptyText>
        )
      ) : modo === "kanban" ? (
        <>
          {avisoKanban && <FormErrorText>{avisoKanban}</FormErrorText>}
          <ProjetoKanbanBoard
            projetos={projetosOrdenados}
            podeArrastar={podeArrastarKanban}
            nomeFrente={nomeFrente}
            onMover={moverStatus}
            projetosComPendencia={projetosComPendencia}
          />
        </>
      ) : (
        <CardGrid>
          {projetosOrdenados.map((projeto) => {
            const tonsStatus = tonsDaColuna(CORES_STATUS[projeto.status]);
            return (
              <ProjetoCard
                key={projeto.id}
                to={`/projetos/${projeto.id}`}
                $comSelecao={selecaoAtiva}
                // Este card só renderiza fora do Kanban (que já é o padrão
                // pra onde "Voltar" cai sem state nenhum), aqui é sempre
                // preciso dizer explicitamente o modo de onde se veio.
                state={{ voltarPara: `/projetos?modo=${modo}`, voltarRotulo: "Voltar para projetos" }}
                // Em modo de seleção o clique no card marca/desmarca em vez
                // de navegar — replicar o gesto de "abrir o projeto" enquanto
                // se está escolhendo vários seria surpreendente.
                onClick={(e) => {
                  if (!selecaoAtiva) return;
                  e.preventDefault();
                  alternarSelecao(projeto.id);
                }}
              >
                {selecaoAtiva && (
                  <SelecaoCheckboxWrap>
                    <input
                      type="checkbox"
                      checked={selecionados.has(projeto.id)}
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => alternarSelecao(projeto.id)}
                      aria-label={`Selecionar ${projeto.nome}`}
                    />
                  </SelecaoCheckboxWrap>
                )}
                {projetosComPendencia.has(projeto.id) && (
                  <PendenteDot title="Pedido de entrada pendente" />
                )}
                <div>
                  <CardTitle>{projeto.nome}</CardTitle>
                </div>

                <TagRow>
                  {projeto.frente_ids.map((id) => (
                    <FrenteTag key={id}>{nomeFrente(id)}</FrenteTag>
                  ))}
                  {projeto.sinergico && <FrenteTag>sinérgico</FrenteTag>}
                </TagRow>

                <div>
                  {/* Mesma cor por fase do kanban de projetos (`CORES_STATUS`) —
                      pra a etapa não parecer outra coisa entre as duas visões.
                      Borda arredondada igual à `FrenteTag` ao lado, não a
                      borda do cabeçalho de coluna do kanban. */}
                  <StatusPilula $cor={tonsStatus}>
                    <Ponto $cor={tonsStatus.ponto} />
                    {ROTULO_STATUS[projeto.status]}
                  </StatusPilula>
                  {/* Redundante dentro da própria aba Arquivados, lá TODO
                      card já é arquivado. */}
                  {projeto.arquivado_em && modo !== "arquivados" && (
                    <PageBadge $tone="muted">Arquivado</PageBadge>
                  )}
                </div>

                <CardEquipe>
                  <strong>Coord:</strong>{" "}
                  {projeto.coordenador_id ? nomeUsuario(projeto.coordenador_id) : "—"}
                  <br />
                  <strong>Cons:</strong>{" "}
                  {projeto.consultor_ids.length > 0
                    ? projeto.consultor_ids.map(nomeUsuario).join(", ")
                    : "—"}
                  {projeto.proxima_banca && (
                    <>
                      <br />
                      <strong>Próxima banca:</strong> {formatarDataHoraBanca(projeto.proxima_banca)}
                    </>
                  )}
                </CardEquipe>

                {projeto.kickoff_pendente && (
                  <CardAlerta>
                    <AlertTriangle size={14} />
                    Kickoff pendente
                  </CardAlerta>
                )}
              </ProjetoCard>
            );
          })}
        </CardGrid>
      )}

      {confirmandoExclusaoMassa && (
        <ConfirmarModal
          titulo="Apagar projetos para sempre"
          mensagem={
            <>
              <p>
                {selecionados.size} {selecionados.size === 1 ? "projeto" : "projetos"} arquivado
                {selecionados.size === 1 ? "" : "s"} vão ser apagados, com tarefas, bancas,
                avaliações, cronograma, comentários e histórico de cada um.{" "}
                <strong>Não há como desfazer.</strong>
              </p>
              <ul>
                {[...selecionados].map((id) => (
                  <li key={id}>{projetos.find((p) => p.id === id)?.nome ?? `Projeto ${id}`}</li>
                ))}
              </ul>
            </>
          }
          // Digitar o nome de cada projeto não escala pra um lote — a trava
          // aqui é digitar a palavra, o que ainda obriga a ler a lista acima
          // antes de confirmar em massa.
          confirmacaoTexto="APAGAR"
          rotuloConfirmar="Apagar para sempre"
          rotuloProcessando="Apagando…"
          onCancelar={() => setConfirmandoExclusaoMassa(false)}
          onConfirmar={excluirSelecionados}
        />
      )}
    </PageStack>
  );
}
