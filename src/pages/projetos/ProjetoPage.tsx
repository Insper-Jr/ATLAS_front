import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate, useOutletContext, useParams } from "react-router-dom";
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  Download,
  ExternalLink,
  MoreHorizontal,
  Pause as PauseIcon,
  Pencil,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getFrentes } from "@/lib/bancas";
import { getSolicitacoesRecebidas } from "@/lib/vagas";
import {
  baixarAnexoProposta,
  arquivarProjeto,
  CORES_STATUS,
  deletarProjetoPermanente,
  desarquivarProjeto,
  destinosValidos,
  formatarData,
  getProjeto,
  mudarStatus,
  podePausar,
  ROTULO_STATUS,
  STATUS_ORDEM,
} from "@/lib/projetos";
import { getUsuarios } from "@/lib/usuarios";
import type { UsuarioResumo } from "@/types/auth";
import type { Frente } from "@/types/banca";
import type { ProjetoCompleto, StatusProjeto } from "@/types/projeto";
import { Ponto } from "@/components/kanban/Kanban.styled";
import { FotoCircular } from "@/components/Avatar";
import { corDaPessoa, iniciais } from "@/lib/avatar";
import { pode } from "@/utils/permissoes";
import { ConfirmarModal } from "@/components/ConfirmarModal";
import { EditarProjetoModal } from "./EditarProjetoModal";
import {
  PageButtonSm,
  PageLoadingBlock,
  ErrorBlock,
  ErrorText,
  PageButton,
} from "@/styles/page.styled";
import {
  PageHeaderText,
  PageHeading,
  FormErrorText,
  ProjetoShell,
  ShellHeader,
  VoltarLink,
  StatusRow,
  FrenteTag,
  AvisoBanner,
  AvisoLink,
  TabBar,
  TabLink,
  PipelineTrilha,
  PipelineEtapa,
  PipelinePonto,
  PipelineConector,
  PausadoAviso,
  AcoesWrap,
  AcoesBotao,
  AcoesMenu,
  AcoesItem,
  AcoesDivisor,
  IdentidadeLinha,
  MetaLinha,
  MetaSeparador,
  EquipePilha,
  EquipeAvatarPequeno,
  EquipeMais,
  PropostaLink,
  PropostaBotao,
} from "./Projetos.styled";

/** O que o shell entrega para as abas. */
export interface ProjetoContexto {
  projeto: ProjetoCompleto;
  usuarios: UsuarioResumo[];
  frentes: Frente[];
  recarregar: () => Promise<void>;
  /**
   * Abre o modal de edição do cadastro — o MESMO que o menu de ações do
   * cabeçalho abre.
   *
   * ⚠ Existe para a aba não montar um segundo modal de equipe. Uma tela com
   * duas portas para editar a mesma coisa acaba com as duas divergindo: foi o
   * que já aconteceu quando nome, descrição e equipe tinham um botão cada.
   */
  abrirEdicao: () => void;
  /** `true` quando a pessoa enxerga o projeto SÓ por tê-lo vendido.
   *
   *  As abas usam para esconder os próprios botões de ação — o cabeçalho já
   *  cuida dos dele. Ver o comentário em `somenteLeitura` no componente. */
  somenteLeitura: boolean;
}

export function useProjeto() {
  return useOutletContext<ProjetoContexto>();
}

/**
 * O shell da página do projeto. As abas são **sub-rotas**, não estado
 * local: é isso que deixa uma notificação abrir direto em
 * `/projetos/42/tarefas`.
 */
/** O que uma tela de origem manda pra dizer pra onde "voltar" aponta —
 *  ver `voltarDoLocation` logo abaixo. */
interface VoltarState {
  voltarPara?: string;
  voltarRotulo?: string;
}

/**
 * De onde "Voltar" deveria levar.
 *
 * Sem isto o link era fixo em `/projetos`, então quem chegava aqui a partir
 * do board macro de Tarefas ou Cronogramas gerais (Monitoramento) e clicava
 * em Voltar caía na listagem de projetos, perdendo o filtro/aba de onde
 * tinha vindo, em vez de voltar pra lá. Quem navega passa `state` com o
 * destino (`TarefasGeraisAba`, `CronogramasGeraisAba`); sem `state`, o
 * padrão de sempre continua sendo a listagem.
 */
function voltarDoLocation(state: unknown): { to: string; rotulo: string } {
  const voltar = (state ?? {}) as VoltarState;
  if (voltar.voltarPara) {
    return { to: voltar.voltarPara, rotulo: voltar.voltarRotulo ?? "Voltar" };
  }
  return { to: "/projetos", rotulo: "Voltar para projetos" };
}


export function ProjetoPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { usuario, token } = useAuth();
  const projetoId = Number(id);
  /**
   * Capturado só na ENTRADA no projeto (quando `id` muda), não a cada
   * navegação. As abas internas (Cronograma, Tarefas...) trocam de rota sem
   * levar `state`, recalcular a cada `location` perderia o destino assim
   * que a pessoa clicasse em outra aba dentro do mesmo projeto.
   */
  const [voltar, setVoltar] = useState(() => voltarDoLocation(location.state));
  useEffect(() => {
    setVoltar(voltarDoLocation(location.state));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const [projeto, setProjeto] = useState<ProjetoCompleto | null>(null);
  const [usuarios, setUsuarios] = useState<UsuarioResumo[]>([]);
  const [frentes, setFrentes] = useState<Frente[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [erroStatus, setErroStatus] = useState("");
  const [mudandoStatus, setMudandoStatus] = useState(false);
  const [arquivando, setArquivando] = useState(false);
  const [confirmandoArquivamento, setConfirmandoArquivamento] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const [editandoProjeto, setEditandoProjeto] = useState(false);
  const [baixandoAnexo, setBaixandoAnexo] = useState(false);
  const [pedidosPendentes, setPedidosPendentes] = useState(0);

  const carregar = useCallback(async () => {
    if (!token || !projetoId) return;
    setErro("");
    try {
      const [projetoResp, usuariosResp, frentesResp] = await Promise.all([
        getProjeto(projetoId, token),
        getUsuarios(token),
        getFrentes(token),
      ]);
      setProjeto(projetoResp);
      setUsuarios(usuariosResp);
      setFrentes(frentesResp);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao carregar o projeto");
    } finally {
      setCarregando(false);
    }
  }, [projetoId, token]);

  // Revalida a cada troca de aba, e não só na montagem.
  //
  // As abas são SUB-ROTAS: o shell não remonta ao ir do Cronograma para a
  // Visão geral, então o `projeto` continuava o da primeira visita, a banca
  // que acabara de ser marcada no calendário aparecia como "não marcada" ali,
  // e os dias do escopo ficavam em "não iniciado". Como só o Cronograma
  // escreve datas hoje, revalidar na navegação é o que mantém as duas telas
  // contando a mesma história.
  //
  // Em silêncio: `carregando` já nasce `true`, e ligá-lo de novo a cada aba
  // faria a página piscar num spinner a cada clique.
  useEffect(() => {
    carregar();
  }, [carregar, location.pathname]);

  // Aviso de pedido de entrada pendente (§7.3), o endpoint já vem escopado
  // a quem PODE responder (coordenador, gerência ou diretoria), então some
  // sozinho pra quem não tem nada a fazer aqui.
  useEffect(() => {
    if (!token || !projetoId) return;
    let ativo = true;
    getSolicitacoesRecebidas(token)
      .then((r) => {
        if (!ativo) return;
        setPedidosPendentes(
          r.filter((s) => s.projeto_id === projetoId && s.status === "pendente").length,
        );
      })
      .catch(() => {});
    return () => {
      ativo = false;
    };
  }, [token, projetoId]);

  // Visitante da banca só tem uma aba. Um link antigo, o botão de voltar ou
  // a rota-raiz do projeto o deixariam na Visão geral, que dispara chamadas
  // que ele não pode fazer, quebrando a tela em erro em vez de dizer o que há.
  useEffect(() => {
    if (!projeto?.apenas_banca) return;
    if (location.pathname !== `/projetos/${projeto.id}/banca`) {
      navigate(`/projetos/${projeto.id}/banca`, { replace: true });
    }
  }, [projeto, location.pathname, navigate]);

  async function aplicarStatus(statusNovo: string) {
    if (!token || !projeto) return;
    setMudandoStatus(true);
    setErroStatus("");
    try {
      await mudarStatus(projeto.id, statusNovo, token);
      await carregar();
    } catch (err) {
      setErroStatus(err instanceof Error ? err.message : "Erro ao mudar o status");
    } finally {
      setMudandoStatus(false);
    }
  }

  async function confirmarArquivamento() {
    if (!token || !projeto) return;
    const arquivado = Boolean(projeto.arquivado_em);
    setArquivando(true);
    try {
      if (arquivado) await desarquivarProjeto(projeto.id, token);
      else await arquivarProjeto(projeto.id, token);
      setConfirmandoArquivamento(false);
      await carregar();
    } catch (err) {
      setArquivando(false);
      throw err;
    }
  }

  async function confirmarExclusao() {
    if (!token || !projeto) return;
    setExcluindo(true);
    try {
      await deletarProjetoPermanente(projeto.id, token);
      navigate("/projetos", { replace: true });
    } catch (err) {
      setExcluindo(false);
      throw err;
    }
  }



  if (erro) {
    return (
      <ErrorBlock>
        <ErrorText>Não foi possível abrir o projeto: {erro}</ErrorText>
        <PageButton $variant="outline" onClick={() => carregar()}>
          Tentar novamente
        </PageButton>
      </ErrorBlock>
    );
  }

  if (carregando || !projeto) return <PageLoadingBlock />;

  const nomeFrente = (frenteId: number) =>
    frentes.find((f) => f.id === frenteId)?.nome ?? `Frente ${frenteId}`;

  async function baixarProposta() {
    if (!token || !projeto?.anexo_proposta_nome) return;
    setBaixandoAnexo(true);
    setErroStatus("");
    try {
      await baixarAnexoProposta(projeto.id, projeto.anexo_proposta_nome, token);
    } catch (err) {
      // Erro LOCAL e dispensável, não o `erro` de página: um download que
      // falha (ex: arquivo perdido no servidor) não pode trocar a tela
      // inteira pelo "Não foi possível abrir o projeto" quando o projeto
      // carregou normal.
      setErroStatus(err instanceof Error ? err.message : "Erro ao baixar a proposta");
    } finally {
      setBaixandoAnexo(false);
    }
  }

  const nomeUsuario = (id: number) => usuarios.find((u) => u.id === id)?.nome ?? `Usuário ${id}`;
  const fotoUsuario = (id: number) => usuarios.find((u) => u.id === id)?.foto ?? null;
  const coordenadores = projeto.equipe.filter((m) => m.papel === "coordenador");
  const consultores = projeto.equipe.filter((m) => m.papel !== "coordenador");
  // ⚠ O teto CRU, e não um `Math.max` com quem já está alocado.
  //
  // Havia um helper que devolvia `max(teto, alocados)`, e com ele o Atlas Tech
  // — 5 consultores num projeto de teto 3 — se descrevia como "5/5". O número
  // ficava sempre coerente e por isso nunca denunciava nada. Aqui a conta é
  // literal: quantos estão sobre quantos cabem. Se algum dia voltar a divergir,
  // aparece "5/3" na tela, que é a intenção.
  //
  // O estado divergente não deve existir: as três vias de entrada validam o
  // teto, e a migration `c4f7d20a91e5` acertou os projetos legados, que ficaram
  // com teto 3 pelo `server_default` da migration que criou a coluna.
  const teto = projeto.max_consultores ?? 0;

  // ⭐ **Quem só enxerga o projeto por tê-lo VENDIDO não age nele.**
  //
  // As permissões da plataforma são globais por posição, não por projeto: um
  // consultor-vendedor tem `pode_criar_tarefa` em qualquer projeto que
  // enxergue. Sem este corte, a tela ofereceria botões que a API responde com
  // 403 — o backend já barra (`exigir_acesso_ao_projeto`), isto é só para não
  // prometer o que vai falhar.
  //
  // Vale a `&&` em cada permissão, e não um `return` cedo: ele continua vendo
  // a ficha inteira e todas as abas. O que some são as AÇÕES.
  const somenteLeitura = projeto.somente_leitura;

  const podeMudarStatus = !somenteLeitura && pode(usuario, "mudar_status_projeto");
  const podeArquivar = !somenteLeitura && pode(usuario, "arquivar_projeto");
  const podeExcluir = !somenteLeitura && pode(usuario, "apagar_projeto_permanente");
  // Quem vendeu o projeto edita os campos descritivos (nome, cliente,
  // descrição, link e PDF da proposta) mesmo sem estar na equipe. O resto
  // do projeto segue leitura para ele.
  const ehVendedorDesteProjeto = !!usuario && projeto.vendedor_ids.includes(usuario.id);
  const podeEditarTudo = !somenteLeitura && !!usuario?.permissoes.pode_editar_equipe;
  // Abre o modal "Editar projeto". O vendedor entra no modo enxuto.
  const podeEditarProjeto = podeEditarTudo || ehVendedorDesteProjeto;
  const temKickoff = !!projeto.data_kickoff;
  // ⭐ 2026-09-21 — a pedido: nada nas abas (Visão geral, Cronograma, Banca,
  // Tarefas, Histórico) vale antes de o projeto ser VENDIDO — não tem
  // equipe, não tem escopo, não tem cronograma pra mostrar ainda, só o
  // Contrato de Prestação sendo preenchido (que já tem sua própria página,
  // fora daqui). As abas liberam sozinhas assim que ele assina.
  const aindaEmElaboracao = projeto.status === "contrato_em_elaboracao";

  /**
   * As etapas para onde ESTE projeto pode ir agora — livre entre as ativas,
   * nos dois sentidos, não só a vizinha.
   *
   * A trilha usa isto para saber quais pontos respondem ao clique; os demais
   * ela desenha como marcador. Vendido só libera Ambientação, e só com uma
   * data de kickoff marcada. Pausado não tem destino aqui: sai pelo Retomar.
   */
  const destinosDaEtapa = new Set(destinosValidos(projeto.status, temKickoff, projeto.criado_pelo_atalho));

  /**
   * A equipe na pilha de rostos: coordenação primeiro, consultores depois.
   *
   * O limite existe para a pilha não empurrar a proposta para a linha de
   * baixo num projeto grande — o excedente vira "+N", e o `title` continua
   * carregando todo mundo.
   */
  const MAX_AVATARES = 5;
  const equipeOrdenada = [...coordenadores, ...consultores];
  const equipeVisivel = equipeOrdenada.slice(0, MAX_AVATARES);
  const equipeExcedente = equipeOrdenada.length - equipeVisivel.length;
  const equipeTitulo = [
    coordenadores.length > 0
      ? `Coordenação: ${coordenadores.map((m) => nomeUsuario(m.usuario_id)).join(", ")}`
      : "Sem coordenador",
    consultores.length > 0
      ? `Consultores: ${consultores.map((m) => nomeUsuario(m.usuario_id)).join(", ")}`
      : "Ninguém alocado",
  ].join(" · ");

  const contexto: ProjetoContexto = {
    projeto,
    usuarios,
    frentes,
    recarregar: carregar,
    abrirEdicao: () => setEditandoProjeto(true),
    somenteLeitura,
  };

  return (
    <ProjetoShell>
      {/* ⭐ **O cabeçalho era sete blocos empilhados** — nome com lápis, dois
          links de proposta, cliente, tags, parágrafo de descrição, equipe com
          um avatar e um nome por pessoa, e uma fileira de botões de etapa —
          repetidos no topo das CINCO abas. Passava da metade da tela antes de
          o conteúdo da aba começar.

          Agora são três linhas com papéis distintos: **quem é** (nome, tags,
          ações), **contexto** (cliente, equipe, proposta) e **onde está** (a
          trilha de etapas). A descrição, que era o item mais longo do topo e o
          menos consultado, desceu inteira para um card na Visão geral. */}
      <ShellHeader>
        <PageHeaderText>
          <VoltarLink to={voltar.to}>
            <ArrowLeft size={14} />
            {voltar.rotulo}
          </VoltarLink>

          <IdentidadeLinha>
            <PageHeading>{projeto.nome}</PageHeading>
            {projeto.frente_ids.map((frenteId) => (
              <FrenteTag key={frenteId}>{nomeFrente(frenteId)}</FrenteTag>
            ))}
            {projeto.sinergico && <FrenteTag>sinérgico</FrenteTag>}
            {projeto.arquivado_em && <FrenteTag>arquivado</FrenteTag>}

            <MenuAcoesProjeto
              podeEditar={podeEditarProjeto}
              podeArquivar={podeArquivar}
              podeExcluir={podeExcluir}
              arquivado={!!projeto.arquivado_em}
              ocupado={arquivando || excluindo}
              onEditar={() => setEditandoProjeto(true)}
              onArquivar={() => setConfirmandoArquivamento(true)}
              onExcluir={() => setConfirmandoExclusao(true)}
            />
          </IdentidadeLinha>

          <MetaLinha>
            {projeto.cliente && <span>{projeto.cliente}</span>}

            {/* A equipe inteira numa pilha de rostos. Quem precisa dos nomes
                tem o `title` aqui e a lista completa na Visão geral. */}
            {equipeVisivel.length > 0 && (
              <>
                {projeto.cliente && <MetaSeparador>·</MetaSeparador>}
                <EquipePilha title={equipeTitulo}>
                  {equipeVisivel.map((m) => (
                    <EquipeAvatarPequeno key={m.usuario_id} $cor={corDaPessoa(m.usuario_id)}>
                      {fotoUsuario(m.usuario_id) ? (
                        <FotoCircular src={fotoUsuario(m.usuario_id)!} />
                      ) : (
                        iniciais(nomeUsuario(m.usuario_id))
                      )}
                    </EquipeAvatarPequeno>
                  ))}
                  {equipeExcedente > 0 && <EquipeMais $cor="">+{equipeExcedente}</EquipeMais>}
                </EquipePilha>
                {teto > 0 && (
                  <span title={`${consultores.length} de ${teto} consultores`}>
                    {consultores.length}/{teto}
                  </span>
                )}
              </>
            )}

            {/* ⚠ O rótulo é VERBO + "proposta", não "Proposta" sozinho: um
                substantivo ao lado de um botão não diz o que o clique faz. */}
            {projeto.link_proposta && (
              <>
                <MetaSeparador>·</MetaSeparador>
                <PropostaLink href={projeto.link_proposta} target="_blank" rel="noreferrer">
                  <ExternalLink size={13} />
                  Abrir proposta
                </PropostaLink>
              </>
            )}
            {projeto.anexo_proposta_nome && (
              <>
                <MetaSeparador>·</MetaSeparador>
                <PropostaBotao type="button" onClick={baixarProposta} disabled={baixandoAnexo}>
                  <Download size={13} />
                  {baixandoAnexo ? "Baixando…" : "Baixar proposta"}
                </PropostaBotao>
              </>
            )}
          </MetaLinha>

          <PipelineEtapas
            statusAtual={projeto.status}
            destinos={destinosDaEtapa}
            podePausar={podePausar(projeto.status) && podeMudarStatus}
            ocupado={mudandoStatus}
            onSelecionar={aplicarStatus}
          />
        </PageHeaderText>
      </ShellHeader>

      {erroStatus && <FormErrorText>{erroStatus}</FormErrorText>}

      {!aindaEmElaboracao && pedidosPendentes > 0 && (
        <AvisoBanner>
          {pedidosPendentes} {pedidosPendentes === 1 ? "pedido de entrada" : "pedidos de entrada"}{" "}
          aguardando resposta.{" "}
          <AvisoLink
            to="/vagas?aba=solicitacoes"
            state={{ voltarPara: `/projetos/${projeto.id}`, voltarRotulo: `Voltar para ${projeto.nome}` }}
          >
            Responder
          </AvisoLink>
        </AvisoBanner>
      )}

      {projeto.kickoff_pendente && (
        <AvisoBanner>
          Kickoff pendente, combine a data com o cliente e marque na aba Visão geral.
        </AvisoBanner>
      )}

      {/* Estado que o  não prevê mais: marcar o kickoff JÁ move para
          Ambientação. Sobra só quem foi marcado antes dessa regra existir —
          por isso o texto explica o que fazer, em vez de descrever um passo
          normal do fluxo. */}
      {projeto.status === "vendido" && projeto.data_kickoff && (
        <AvisoBanner>
          Kickoff marcado para {formatarData(projeto.data_kickoff)}, mas o projeto ainda está em
          Vendido, marcações feitas antes da regra atual pararam aqui. Escolha "Ambientação" no
          seletor de etapa para acertar.
        </AvisoBanner>
      )}

      {aindaEmElaboracao ? (
        <AvisoBanner>
          Este projeto ainda não foi vendido — as abas liberam depois da assinatura do Contrato de
          Prestação de Serviços.
        </AvisoBanner>
      ) : (
        <>
          {/* ⭐ Visitante da banca: quem foi ESCALADO para avaliar entra aqui para
              votar, mas o §3 não lhe dá visão do projeto. Mostrar as outras abas
              seria oferecer cinco portas e abrir uma — as quatro restantes
              devolvem 404. */}
          <TabBar>
            {projeto.apenas_banca ? (
              <TabLink to={`/projetos/${projeto.id}/banca`}>Banca</TabLink>
            ) : (
              <>
                <TabLink to={`/projetos/${projeto.id}`} end>
                  Visão geral
                </TabLink>
                <TabLink to={`/projetos/${projeto.id}/cronograma`}>Cronograma</TabLink>
                {/* Depois do Cronograma: é lá que a banca é marcada, e daqui se vê
                    como ela foi. Antes de Tarefas porque a banca é marco do projeto,
                    não rotina de execução. */}
                <TabLink to={`/projetos/${projeto.id}/banca`}>Banca</TabLink>
                <TabLink to={`/projetos/${projeto.id}/tarefas`}>Tarefas</TabLink>
                <TabLink to={`/projetos/${projeto.id}/historico`}>Histórico</TabLink>
              </>
            )}
          </TabBar>

          <Outlet context={contexto} />
        </>
      )}

      {editandoProjeto && token && (
        <EditarProjetoModal
          projeto={projeto}
          usuarios={usuarios}
          frentes={frentes}
          token={token}
          soMetadados={!podeEditarTudo}
          onClose={() => setEditandoProjeto(false)}
          onSalvo={async () => {
            setEditandoProjeto(false);
            await carregar();
          }}
        />
      )}

      {confirmandoArquivamento && (
        <ConfirmarModal
          titulo={projeto.arquivado_em ? "Desarquivar projeto" : "Arquivar projeto"}
          mensagem={
            projeto.arquivado_em
              ? "Desarquivar este projeto? Ele volta a aparecer nas listagens normais."
              : "Arquivar este projeto? Ele some das listagens normais, mas nada é apagado, dá pra desarquivar depois."
          }
          rotuloConfirmar={projeto.arquivado_em ? "Desarquivar" : "Arquivar"}
          onCancelar={() => setConfirmandoArquivamento(false)}
          onConfirmar={confirmarArquivamento}
        />
      )}

      {confirmandoExclusao && (
        <ConfirmarModal
          titulo="Apagar projeto para sempre"
          mensagem={
            <>
              <p>
                Tarefas, bancas, avaliações, cronograma, comentários e histórico deste projeto são
                apagados junto. <strong>Não há como desfazer.</strong>
              </p>
              <p>Arquivar já tira o projeto das listagens sem apagar nada — considere antes.</p>
            </>
          }
          /* O nome do projeto digitado à mão: é o que obriga a diretoria a
             conferir QUAL projeto está prestes a sumir. */
          confirmacaoTexto={projeto.nome}
          rotuloConfirmar="Apagar para sempre"
          rotuloProcessando="Apagando…"
          onCancelar={() => setConfirmandoExclusao(false)}
          onConfirmar={confirmarExclusao}
        />
      )}
    </ProjetoShell>
  );
}

/* ------------------------------------------------------------------ */

/**
 * O funil do projeto como uma trilha percorrida.
 *
 * ⭐ **A terceira forma deste controle.** Foi dropdown (dois cliques, destinos
 * escondidos) e foi fileira de botões — e a fileira ficou pior, porque
 * `destinosValidos` libera o trânsito entre todas as etapas ativas: eram sete
 * botões mais Pausar mais Arquivar no topo de todas as abas.
 *
 * 📐 **A pergunta certa não era "para onde mover".** Quem abre um projeto quer
 * saber **em que ponto ele está**, e isso um funil desenhado responde de
 * relance. Mover deixa de ser um formulário e vira o gesto óbvio: clicar
 * adiante avança, clicar atrás volta.
 *
 * ⚠ **Etapa inalcançável não é botão desabilitado, é `span`.** Um botão morto
 * com tooltip promete um controle que não existe, e no celular a tooltip nem
 * aparece. Aqui ela simplesmente não é clicável, e o ponto vazado já diz que
 * ainda não chegou lá.
 */
function PipelineEtapas({
  statusAtual,
  destinos,
  podePausar: mostrarPausar,
  ocupado,
  onSelecionar,
}: {
  statusAtual: StatusProjeto;
  /** As etapas que aceitam clique agora (vem de `destinosValidos`). */
  destinos: Set<StatusProjeto>;
  mostrarPausar?: boolean;
  podePausar: boolean;
  ocupado: boolean;
  onSelecionar: (chave: string) => void;
}) {
  const pausado = statusAtual === "pausado";
  // Pausado não é ponto do funil: a trilha continua mostrando onde o projeto
  // parou, esmaecida, e o estado real vem na faixa ao lado.
  const indiceAtual = STATUS_ORDEM.indexOf(statusAtual);

  return (
    <StatusRow>
      <PipelineTrilha role="group" aria-label="Etapa do projeto" $esmaecida={pausado}>
        {STATUS_ORDEM.map((status, i) => {
          const estado = i < indiceAtual ? "feito" : i === indiceAtual ? "atual" : "futuro";
          const clicavel = destinos.has(status);
          const cor = CORES_STATUS[status];
          return (
            <Fragment key={status}>
              {i > 0 && <PipelineConector aria-hidden $percorrido={i <= indiceAtual} />}
              <PipelineEtapa
                as={clicavel ? "button" : "span"}
                type={clicavel ? "button" : undefined}
                $estado={estado}
                $cor={cor}
                $clicavel={clicavel}
                disabled={clicavel ? ocupado : undefined}
                aria-current={estado === "atual" ? "step" : undefined}
                title={clicavel ? `Mover para ${ROTULO_STATUS[status]}` : ROTULO_STATUS[status]}
                onClick={clicavel ? () => onSelecionar(status) : undefined}
              >
                <PipelinePonto $estado={estado} $cor={cor} />
                {ROTULO_STATUS[status]}
              </PipelineEtapa>
            </Fragment>
          );
        })}
      </PipelineTrilha>

      {pausado ? (
        <PausadoAviso>
          <Ponto $cor={CORES_STATUS.pausado} />
          Pausado
          <PageButtonSm
            type="button"
            $variant="outline"
            disabled={ocupado}
            onClick={() => onSelecionar("retomar")}
          >
            Retomar
          </PageButtonSm>
        </PausadoAviso>
      ) : (
        mostrarPausar && (
          <PageButtonSm
            type="button"
            $variant="ghost"
            disabled={ocupado}
            title="Pausar o projeto — a contagem de dias para"
            onClick={() => onSelecionar("pausado")}
          >
            <PauseIcon size={13} />
            Pausar
          </PageButtonSm>
        )
      )}
    </StatusRow>
  );
}

/* ------------------------------------------------------------------ */

/**
 * Editar, arquivar e apagar — as três ações de ciclo de vida do CADASTRO.
 *
 * ⭐ **Eram três botões fixos no cabeçalho.** Editar já era um lápis solto ao
 * lado do nome; arquivar e apagar ficavam à direita, do mesmo tamanho da troca
 * de etapa. Nenhuma das três se faz com frequência — apagar, no limite, uma
 * vez na vida do projeto — e as três juntas pesavam mais que o controle que se
 * usa toda semana.
 *
 * ⚠ Apagar fica depois de um divisor e em vermelho, e continua atrás do
 * `ConfirmarModal` que exige digitar o nome do projeto.
 */
function MenuAcoesProjeto({
  podeEditar,
  podeArquivar,
  podeExcluir,
  arquivado,
  ocupado,
  onEditar,
  onArquivar,
  onExcluir,
}: {
  podeEditar: boolean;
  podeArquivar: boolean;
  podeExcluir: boolean;
  arquivado: boolean;
  ocupado: boolean;
  onEditar: () => void;
  onArquivar: () => void;
  onExcluir: () => void;
}) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    function aoClicarFora(evento: MouseEvent) {
      if (ref.current && !ref.current.contains(evento.target as Node)) setAberto(false);
    }
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === "Escape") setAberto(false);
    }
    document.addEventListener("mousedown", aoClicarFora);
    document.addEventListener("keydown", aoTeclar);
    return () => {
      document.removeEventListener("mousedown", aoClicarFora);
      document.removeEventListener("keydown", aoTeclar);
    };
  }, [aberto]);

  // ⚠ 2026-09-18, a pedido — o "..." é o ÚLTIMO item de `IdentidadeLinha`
  // (nome + tags + menu, `flex-wrap`), então no celular ele às vezes cai
  // sozinho bem perto da margem ESQUERDA da tela (as tags ocuparam a linha
  // de cima). `AcoesMenu` abre ancorado por `right: 0` — cresce pra
  // ESQUERDA a partir do botão — e sem espaço à esquerda ele estourava a
  // viewport; como `index.css` trava `overflow-x: clip` de propósito (nada
  // pode vazar a ponto de precisar de zoom out), o menu ficava com as
  // opções literalmente fora da tela, sem como rolar até elas. Aqui só
  // mede depois de aberto e, se estourou, troca a ancoragem de `right`
  // para um `left` fixo que mantém tudo dentro da viewport.
  useLayoutEffect(() => {
    if (!aberto) return;
    const menu = menuRef.current;
    const wrap = ref.current;
    if (!menu || !wrap) return;
    menu.style.left = "";
    menu.style.right = "0";
    const margem = 8;
    const rect = menu.getBoundingClientRect();
    if (rect.left < margem) {
      const wrapRect = wrap.getBoundingClientRect();
      menu.style.left = `${margem - wrapRect.left}px`;
      menu.style.right = "auto";
    }
  }, [aberto]);

  // Apagar só existe para projeto arquivado — arquivar é o passo anterior
  // obrigatório, e um menu com um item morto não ajuda ninguém.
  const mostrarExcluir = podeExcluir && arquivado;
  if (!podeEditar && !podeArquivar && !mostrarExcluir) return null;

  return (
    <AcoesWrap ref={ref}>
      <AcoesBotao
        type="button"
        aria-label="Ações do projeto"
        aria-expanded={aberto}
        aria-haspopup="menu"
        onClick={() => setAberto((v) => !v)}
      >
        <MoreHorizontal size={16} />
      </AcoesBotao>

      {aberto && (
        <AcoesMenu ref={menuRef} role="menu">
          {podeEditar && (
            <AcoesItem
              type="button"
              role="menuitem"
              onClick={() => {
                setAberto(false);
                onEditar();
              }}
            >
              <Pencil size={14} />
              Editar projeto
            </AcoesItem>
          )}
          {podeArquivar && (
            <AcoesItem
              type="button"
              role="menuitem"
              disabled={ocupado}
              onClick={() => {
                setAberto(false);
                onArquivar();
              }}
            >
              {arquivado ? <ArchiveRestore size={14} /> : <Archive size={14} />}
              {arquivado ? "Desarquivar" : "Arquivar"}
            </AcoesItem>
          )}
          {mostrarExcluir && (
            <>
              <AcoesDivisor />
              <AcoesItem
                type="button"
                role="menuitem"
                $perigo
                disabled={ocupado}
                onClick={() => {
                  setAberto(false);
                  onExcluir();
                }}
              >
                <Trash2 size={14} />
                Apagar para sempre
              </AcoesItem>
            </>
          )}
        </AcoesMenu>
      )}
    </AcoesWrap>
  );
}
