import { lazy, Suspense, useEffect, useMemo, useState, type ReactNode } from "react";
import { Activity, AlertTriangle, ChevronRight, Flag, FolderKanban, Target } from "lucide-react";
import { ConteudoPaginado, POR_PAGINA, Paginacao, usePaginacao } from "./Paginacao";
import { useAuth } from "@/context/AuthContext";
import {
  getVisaoGeral,
  ROTULO_ATENCAO,
  type TipoAtencao,
  type VisaoGeral,
} from "@/lib/monitoramento";
import { paraDataUtc } from "@/lib/projetos";
// `formatarData`/`formatarDataHora` saíram no merge de propósito: os dois
// únicos lugares que formatavam data crua aqui (o sparkline de entregas e a
// lista antiga de bancas) viraram `LinhaEntregas` e `diaDaSemana`/`horaDaBanca`.

// Sob demanda: o recharts pesa ~450KB num bundle que já está acima do limite
// de aviso do Vite, e os gráficos só existem dentro do monitoramento.
const PizzaEtapas = lazy(() => import("./PizzaEtapas"));
const LinhaEntregas = lazy(() => import("./LinhaEntregas"));
import {
  PageStack,
  PageCard,
  PageCardHeader,
  PageCardTitle,
  PageCardContent,
  PageButton,
  PageLoadingBlock,
  ErrorBlock,
  ErrorText,
  EmptyText,
} from "@/styles/page.styled";
import {
  AtencaoDias,
  AtencaoLinha,
  AtencaoLista,
  AtencaoSecao,
  AtencaoSecaoTitulo,
  AtencaoSecaoTopo,
  AtencaoTexto,
  AtencaoVerTodos,
  BarraFiltros,
  BotaoAlternativa,
  CardLargura,
  CelulaDias,
  ConteudoCarregando,
  ControlesGrafico,
  DataTable,
  GrupoBotoes,
  ItemDestaque,
  ItemTexto,
  KpiCard,
  KpiGrid,
  KpiIcone,
  KpiNota,
  KpiRotulo,
  KpiTexto,
  KpiValor,
  LinhaItem,
  LinkProjeto,
  ListaSimples,
  PainelGrid,
  RotuloColuna,
  SemDado,
  TabelaRolagem,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  type NivelSeveridade,
} from "./Monitoramento.styled";
import { Th, useOrdenacao, type Colunas } from "@/components/tabela/ordenacao";
import { useFiltroFrente } from "./FiltroFrente";
import { useFiltroEscopo } from "./FiltroEscopo";
import { useFiltroStatus } from "./FiltroStatus";
import { FUSO, partesEmBrasilia } from "@/lib/fuso";

/** Pra "voltar" do projeto cair de novo aqui — Visão geral é a rota índice
 *  de Monitoramento, então o destino é a pasta sem sub-rota. */
const VOLTAR_PARA_AQUI = { voltarPara: "/monitoramento", voltarRotulo: "Voltar para Monitoramento" };

/** Quantos itens cada grupo de "Atenção agora" mostra antes de oferecer o
 *  atalho para o filtro. Quatro cabe sem empurrar os grupos seguintes para
 *  fora da tela e já dá amostra do que há ali dentro. */
const ITENS_POR_GRUPO = 4;

type LinhaJanela = VisaoGeral["janela"]["por_projeto"][number];

/** A janela inteira do projeto: o que foi vendido mais o que a diretoria
 *  autorizou depois. É contra ela que o consumo é medido — quem ganhou 10
 *  dias tem 10 dias a mais para gastar. */
function janelaTotal(p: LinhaJanela): number {
  return p.dias_vendidos + p.dias_ajustados;
}

const COLUNAS_JANELA: Colunas<LinhaJanela> = {
  projeto: { valor: (p) => p.projeto_nome, inicial: "asc" },
  janela: { valor: janelaTotal, inicial: "desc" },
  escopo: { valor: (p) => p.escopo_alem_do_vendido, inicial: "asc" },
  alem: { valor: (p) => p.dias_de_atraso, inicial: "desc" },
  parados: { valor: (p) => p.dias_parados, inicial: "desc" },
};

/** "seg 11", o dia da semana é o que a pessoa usa para se localizar numa
 *  agenda de 7 dias; a data completa não acrescenta nada nessa janela. */
function diaDaSemana(iso: string): string {
  const d = paraDataUtc(iso);
  const dia = d.toLocaleDateString("pt-BR", { timeZone: FUSO, weekday: "short" }).replace(".", "");
  return `${dia} ${partesEmBrasilia(d).dia}`;
}

function horaDaBanca(iso: string): string {
  return paraDataUtc(iso).toLocaleTimeString("pt-BR", { timeZone: FUSO, hour: "2-digit", minute: "2-digit" });
}

/** Itens sem contagem de dias (kickoff não marcado, sem reunião na semana) não
 *  são menos importantes, só não têm magnitude. Ficam no degrau do meio em
 *  vez de fingir gravidade que não foi medida. */
function nivelAtencao(dias: number | null): NivelSeveridade {
  if (dias == null) return "media";
  if (dias > 10) return "critica";
  if (dias > 3) return "media";
  return "leve";
}

export function VisaoGeralAba() {
  const { token } = useAuth();
  const { frenteId, seletor: seletorFrente } = useFiltroFrente();
  const { escopoId, seletor: seletorEscopo } = useFiltroEscopo(frenteId);
  const { status, seletor: seletorStatus } = useFiltroStatus();
  const seletor = (
    <BarraFiltros>
      {seletorFrente}
      {seletorEscopo}
      {seletorStatus}
    </BarraFiltros>
  );
  const [dados, setDados] = useState<VisaoGeral | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  async function carregar() {
    if (!token) return;
    setCarregando(true);
    setErro("");
    try {
      setDados(await getVisaoGeral(token, frenteId, escopoId, status));
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao carregar o monitoramento");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, frenteId, escopoId, status]);

  if (erro) {
    return (
      <PageStack>
        {seletor}
        <ErrorBlock>
          <ErrorText>{erro}</ErrorText>
          <PageButton $variant="outline" onClick={carregar}>
            Tentar novamente
          </PageButton>
        </ErrorBlock>
      </PageStack>
    );
  }

  // ⭐ `!dados`, e NÃO `carregando || !dados`: o bloco de carregamento é só da
  // PRIMEIRA carga, quando ainda não há o que mostrar. Numa recarga por
  // filtro, o conteúdo antigo fica na tela esmaecido até o novo chegar.
  //
  // Com `carregando` aqui, o slot trocava de `<ConteudoVisaoGeral>` para
  // `<PageStack>` a cada clique num filtro. Tipo diferente no mesmo lugar faz
  // o React DESMONTAR a árvore inteira — inclusive a barra de filtros —, e o
  // seletor de status voltava fechado no meio da seleção: dava para marcar uma
  // caixinha, nunca duas.
  if (!dados) {
    return (
      <PageStack>
        {seletor}
        <PageLoadingBlock />
      </PageStack>
    );
  }

  return (
    <ConteudoCarregando $carregando={carregando}>
      <ConteudoVisaoGeral dados={dados} seletor={seletor} />
    </ConteudoCarregando>
  );
}

/**
 * O corpo da aba, montado só quando `dados` já chegou.
 *
 * Separado do componente de cima por causa dos `usePaginacao`: lá em cima há dois
 * `return` cedo (erro e carregando), e hook depois deles seria hook
 * condicional, a contagem muda entre renders e o React desalinha o estado.
 */
function ConteudoVisaoGeral({ dados, seletor }: { dados: VisaoGeral; seletor: ReactNode }) {
  const [motivoPedido, setMotivoPedido] = useState<TipoAtencao | "">("");

  /* Quantos itens de cada motivo, na ordem de `ROTULO_ATENCAO`, do que o time
     controla para o que depende de terceiro. Só entram os que têm item. */
  const motivosPresentes = useMemo(() => {
    const contagem = new Map<TipoAtencao, number>();
    for (const i of dados.atencao_agora) {
      contagem.set(i.tipo, (contagem.get(i.tipo) ?? 0) + 1);
    }
    return (Object.keys(ROTULO_ATENCAO) as TipoAtencao[])
      .filter((t) => contagem.has(t))
      .map((t) => [t, contagem.get(t)!] as const);
  }, [dados.atencao_agora]);

  /* O motivo é DERIVADO, não guardado cru. Trocar a frente troca os dados, e
     o motivo escolhido pode não existir mais no recorte novo, aí o card
     ficaria vazio exibindo um filtro que sumiu da lista. Voltar para "todos"
     quando isso acontece é o mesmo cuidado do clamp de página em
     `usePaginacao`. */
  const motivo = motivosPresentes.some(([t]) => t === motivoPedido) ? motivoPedido : "";

  const filtrados = useMemo(
    () => (motivo ? dados.atencao_agora.filter((i) => i.tipo === motivo) : dados.atencao_agora),
    [dados.atencao_agora, motivo],
  );

  // Estes três crescem com o tamanho do núcleo e não têm teto no backend.
  // Motivo → itens, na ordem em que o backend já ordenou (pior primeiro).
  const grupos = useMemo(() => {
    const mapa = new Map<string, typeof filtrados>();
    for (const item of filtrados) {
      const lista = mapa.get(item.tipo) ?? [];
      lista.push(item);
      mapa.set(item.tipo, lista);
    }
    // Grupo menor primeiro: um caso isolado é mais acionável que vinte, e a
    // pilha de vinte não pode empurrar o item único para fora da vista.
    return [...mapa.entries()].sort((a, b) => a[1].length - b[1].length);
  }, [filtrados]);
  const bancas = usePaginacao(dados.bancas_proximas, POR_PAGINA);
  const parados = usePaginacao(dados.tempo_parado, POR_PAGINA);
  // A janela do escopo, por projeto: dias ajustados, atraso e dias
  // parados. Só entram os projetos com algum número diferente de zero —
  // listar o portfólio inteiro com três zeros esconderia os que importam.
  /* Só quem tem algo a mostrar. Listar o portfólio inteiro com todas as
     colunas em travessão esconderia os que importam. */
  const comJanela = (dados.janela?.por_projeto ?? []).filter(
    (p) => p.dias_ajustados || p.dias_de_atraso || p.dias_parados,
  );
  /* Ordena antes de paginar: ordenar depois reorganizaria só a página aberta
     e o pior caso de uma coluna continuaria escondido na página 2.

     Abre pelo maior tempo além do vendido — a coluna "Janela" ao lado é o
     tamanho contra o qual esse número se lê. */
  const {
    itens: janelaOrdenada,
    ordem: ordemJanela,
    ordenarPor: ordenarJanela,
  } = useOrdenacao(comJanela, COLUNAS_JANELA, "alem");
  const janela = usePaginacao(janelaOrdenada, POR_PAGINA);

  return (
    <PageStack>
      {seletor}
      {/* ⭐ **Quatro caixas, não cinco, e cada uma responde a uma pergunta.**
          Havia "0% Atrasados" e "100% Placar da gestão" lado a lado: desde que
          o pilar de ENTREGA saiu do cálculo (2026-08-12), o único motivo de
          atraso é a banca — que é exatamente o que o placar mede. Os dois
          somavam 100 sempre, e o comentário que jurava o contrário ficou para
          trás. Ficou o placar, que é o número que o §7.1 pede por nome.

          ⚠ E o "29" ganhou nota: a tela mostrava 29, 21 e 26 em lugares
          diferentes sem dizer que 26 é o denominador de tudo. */}
      <KpiGrid>
        <KpiCard>
          <KpiIcone aria-hidden>
            <FolderKanban size={18} />
          </KpiIcone>
          <KpiTexto>
            <KpiValor>{dados.kpis.total}</KpiValor>
            <KpiRotulo>Projetos</KpiRotulo>
            <KpiNota>
              {dados.placar_gestao.total_ativos} em curso
              {dados.kpis.pausados > 0 && ` · ${dados.kpis.pausados} pausado${dados.kpis.pausados > 1 ? "s" : ""}`}
              {dados.kpis.finalizados > 0 && ` · ${dados.kpis.finalizados} finalizado${dados.kpis.finalizados > 1 ? "s" : ""}`}
            </KpiNota>
          </KpiTexto>
        </KpiCard>
        <KpiCard>
          <KpiIcone aria-hidden>
            <Activity size={18} />
          </KpiIcone>
          <KpiTexto>
            <KpiValor>{dados.kpis.em_execucao}</KpiValor>
            <KpiRotulo>Em execução</KpiRotulo>
            <KpiNota>ambientação, andamento e bancas</KpiNota>
          </KpiTexto>
        </KpiCard>
        <KpiCard>
          <KpiIcone aria-hidden>
            <Flag size={18} />
          </KpiIcone>
          <KpiTexto>
            <KpiValor>{dados.kpis.perto_de_finalizar}</KpiValor>
            <KpiRotulo>Perto de finalizar</KpiRotulo>
            <KpiNota>TEP e período de ajustes</KpiNota>
          </KpiTexto>
        </KpiCard>
        <KpiCard>
          <KpiIcone $destaque={dados.kpis.atrasados > 0 ? "alerta" : undefined} aria-hidden>
            <AlertTriangle size={18} />
          </KpiIcone>
          {/* Percentual como valor grande, contagem na nota, mesmo formato do
              placar ao lado. Os dois medem a MESMA população (`em_curso`), mas
              coisas diferentes: o placar só olha banca, este olha qualquer
              motivo. `100 - placar` não dá este número, e é por isso que os
              rótulos precisam ser explícitos. */}
          <KpiTexto>
            <KpiValor $destaque={dados.kpis.atrasados > 0 ? "alerta" : undefined}>
              {dados.atrasados_gestao.percentual}%
            </KpiValor>
            <KpiRotulo>Atrasados</KpiRotulo>
            <KpiNota>
              {dados.atrasados_gestao.atrasados}/{dados.atrasados_gestao.total_ativos} com algum
              atraso
            </KpiNota>
          </KpiTexto>
        </KpiCard>
        <KpiCard>
          {/* O placar da gestão: só as bancas contam, a entrega ao cliente
              depende da agenda dele e é acompanhada à parte. */}
          <KpiIcone $destaque={dados.placar_gestao.percentual >= 80 ? "ok" : "alerta"} aria-hidden>
            <Target size={18} />
          </KpiIcone>
          <KpiTexto>
            <KpiValor $destaque={dados.placar_gestao.percentual >= 80 ? "ok" : "alerta"}>
              {dados.placar_gestao.percentual}%
            </KpiValor>
            <KpiRotulo>Placar da gestão</KpiRotulo>
            <KpiNota>
              {dados.placar_gestao.no_prazo}/{dados.placar_gestao.total_ativos} sem banca vencida
            </KpiNota>
          </KpiTexto>
        </KpiCard>
      </KpiGrid>

      <PainelGrid>
        <PageCard>
          <PageCardHeader>
            <PageCardTitle>Projetos por etapa</PageCardTitle>
          </PageCardHeader>
          <PageCardContent>
            {/* Sob demanda: o recharts pesa ~450KB e só é usado aqui e na
                Alocação, quem abre o login não tem por que pagar por ele. */}
            <Suspense fallback={<PageLoadingBlock />}>
              <PizzaEtapas etapas={dados.por_etapa} />
            </Suspense>
          </PageCardContent>
        </PageCard>

        <PageCard>
          <PageCardHeader>
            <PageCardTitle>
              Entregas na gestão · {dados.entregas.total_escopos} escopos
            </PageCardTitle>
          </PageCardHeader>
          <PageCardContent>
            {dados.entregas.tendencia.length === 0 ? (
              <EmptyText>Nenhuma entrega registrada.</EmptyText>
            ) : (
              <Suspense fallback={<PageLoadingBlock />}>
                <LinhaEntregas meses={dados.entregas.tendencia} />
              </Suspense>
            )}
          </PageCardContent>
        </PageCard>

        <PageCard>
          <PageCardHeader>
            <PageCardTitle>Bancas nos próximos 7 dias</PageCardTitle>
          </PageCardHeader>
          <PageCardContent>
            {dados.bancas_proximas.length === 0 ? (
              <EmptyText>Nenhuma banca agendada para a próxima semana.</EmptyText>
            ) : (
              <>
                <ConteudoPaginado estado={bancas}>
                  <ListaSimples>
                    {bancas.visiveis.map((b) => (
                      <li key={b.banca_id}>
                        {/* A linha inteira é o link, não só o nome: numa agenda
                            o alvo útil é o compromisso todo, e um trecho
                            clicável no meio do texto é difícil de acertar. */}
                        <LinhaItem to={`/bancas?banca=${b.banca_id}`}>
                          <ItemDestaque>
                            <strong>{diaDaSemana(b.data_hora)}</strong>
                            <span>{horaDaBanca(b.data_hora)}</span>
                          </ItemDestaque>
                          <ItemTexto>
                            <strong>{b.projeto_nome}</strong>
                            <span>{b.escopo}</span>
                          </ItemTexto>
                          <ChevronRight size={15} aria-hidden="true" />
                        </LinhaItem>
                      </li>
                    ))}
                  </ListaSimples>
                </ConteudoPaginado>
                {/* A janela de 7 dias limita o período, não a quantidade: um
                    núcleo grande pode ter 25 bancas numa semana de validação. */}
                <Paginacao estado={bancas} />
              </>
            )}
          </PageCardContent>
        </PageCard>

        <PageCard>
          <PageCardHeader>
            <PageCardTitle>Tempo parado entre escopos</PageCardTitle>
          </PageCardHeader>
          <PageCardContent>
            {dados.tempo_parado.length === 0 ? (
              <EmptyText>Nenhum vão entre escopos.</EmptyText>
            ) : (
              <>
                <ConteudoPaginado estado={parados}>
                  <ListaSimples>
                    {parados.visiveis.map((p) => (
                      // A chave é o PAR, não o projeto: um projeto de três
                      // escopos tem dois vãos, e chavear pelo projeto os
                      // colapsaria em um.
                      <li key={`${p.projeto_id}-${p.escopo_entregue}-${p.escopo_seguinte ?? ""}`}>
                        {/* Vai direto para o CRONOGRAMA, não para a visão geral
                            do projeto: o que destrava um projeto parado é dar
                            `data_inicio` ao próximo escopo, e é lá que isso se
                            faz. Cair na visão geral obrigaria mais um clique
                            justo em quem veio resolver. */}
                        <LinhaItem to={`/projetos/${p.projeto_id}/cronograma`} state={VOLTAR_PARA_AQUI}>
                          {/* Os dias vêm para a esquerda, no lugar que a agenda
                              de bancas usa para a data: é o número que ordena a
                              lista, então é por ele que o olho desce. */}
                          <ItemDestaque>
                            <strong>{p.dias_parado}</strong>
                            <span>{p.dias_parado === 1 ? "dia" : "dias"}</span>
                          </ItemDestaque>
                          <ItemTexto>
                            <strong>{p.projeto_nome}</strong>
                            {/* O vão inteiro, não só o lado de trás: "de
                                onde saiu" e "para onde foi". Sem o segundo
                                nome, um vão FECHADO (o próximo já começou)
                                ficava indistinguível de um aberto. */}
                            <span>
                              {p.aberto
                                ? `entregou ${p.escopo_entregue} · ninguém começou o próximo`
                                : `${p.escopo_entregue} → ${p.escopo_seguinte}`}
                            </span>
                          </ItemTexto>
                          <ChevronRight size={15} aria-hidden="true" />
                        </LinhaItem>
                      </li>
                    ))}
                  </ListaSimples>
                </ConteudoPaginado>
                <Paginacao estado={parados} />
              </>
            )}
          </PageCardContent>
        </PageCard>

        {/* Os números da janela do escopo, o placar que a Visão geral
            do projeto mostra por escopo, aqui somado por projeto.

            "Dias parados" NÃO é o card acima: aquele conta os dias corridos
            entre a entrega de um escopo e o começo do próximo; este conta os
            dias ÚTEIS EM BRANCO do cronograma inteiro desde o kickoff, dia
            sem etapa, reunião, banca ou entrega. Um responde "está entre
            escopos?", o outro "está andando?". */}
        {/* ⚠ **A palavra "atraso" não aparece neste card.** Ela tem dono: na
            aba Atrasos, "atrasado" é banca vencida. O número daqui é outro —
            dias consumidos além do vendido — e chamá-lo de atraso fazia esta
            tela dizer "0 atrasados" no topo e "19 em atraso" no meio.

            ⚠ **Não há total.** "352 parados na gestão" somava dias de projetos
            diferentes: não existe pergunta cuja resposta seja esse número.
            Cada projeto tem o seu, e é por projeto que se age. */}
        <CardLargura>
          <PageCardHeader>
            <PageCardTitle>Tempo dos escopos</PageCardTitle>
          </PageCardHeader>
          <PageCardContent>
            {comJanela.length === 0 ? (
              <EmptyText>
                Nenhum projeto passou dos dias vendidos, ganhou dias ajustados ou tem dia útil
                em branco no cronograma.
              </EmptyText>
            ) : (
              <>
                {/* Tabela, e não uma frase por projeto. São TRÊS medidas
                    independentes: espremidas numa linha de texto miúdo
                    separada por "·", cada projeto mostrava um subconjunto
                    diferente em posição diferente, e não dava para comparar
                    dois projetos nem achar o pior de uma medida. Em colunas,
                    cada número tem lugar fixo e a coluna se lê de cima a
                    baixo — e o cabeçalho ordena, como no resto do painel. */}
                <TabelaRolagem $min="44rem">
                  <DataTable>
                    <TableHead>
                      <TableRow>
                        <Th coluna="projeto" ordem={ordemJanela} onOrdenar={ordenarJanela}>
                          Projeto
                        </Th>
                        {/* ⚠ Os rótulos anteriores eram jargão de quem
                            construiu a tela: "Janela", "Além do vendido",
                            "Sem planejamento" — nenhum dizia de QUE coisa
                            falava nem em que unidade.

                            A unidade fica na segunda linha, apagada: ela é a
                            MESMA em três colunas, e escrita por extenso em
                            todas elas o cabeçalho pesava mais que os dados.
                            Continua escrita porque "12" não diz se são dias
                            corridos ou úteis, e a régua desta tela é o
                            calendário do Insper. */}
                        <Th coluna="janela" ordem={ordemJanela} onOrdenar={ordenarJanela}>
                          <RotuloColuna>
                            Vendidos
                            <small>dias úteis</small>
                          </RotuloColuna>
                        </Th>
                        <Th coluna="escopo" ordem={ordemJanela} onOrdenar={ordenarJanela}>
                          <RotuloColuna>
                            Escopo que passou
                            <small>do que foi vendido</small>
                          </RotuloColuna>
                        </Th>
                        <Th coluna="alem" ordem={ordemJanela} onOrdenar={ordenarJanela}>
                          <RotuloColuna>
                            Acima do vendido
                            <small>dias úteis</small>
                          </RotuloColuna>
                        </Th>
                        <Th coluna="parados" ordem={ordemJanela} onOrdenar={ordenarJanela}>
                          <RotuloColuna>
                            Sem nada no cronograma
                            <small>dias úteis</small>
                          </RotuloColuna>
                        </Th>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {janela.visiveis.map((p) => {
                        const outros = p.escopos_alem_do_vendido - 1;
                        return (
                          <TableRow key={p.projeto_id}>
                            <TableCell>
                              <LinkProjeto to={`/projetos/${p.projeto_id}/cronograma`} state={VOLTAR_PARA_AQUI}>
                                {p.projeto_nome}
                              </LinkProjeto>
                            </TableCell>
                            {/* Vendidos e ajustados nunca somados num número
                                só: a diferença entre ter vendido 30 e ter
                                vendido 20 e precisado de mais 10 é a
                                informação inteira. */}
                            <TableCell>
                              <CelulaDias>
                                {p.dias_vendidos}
                                {p.dias_ajustados > 0 && <small>+{p.dias_ajustados} ajustados</small>}
                              </CelulaDias>
                            </TableCell>
                            {/* ⭐ O NOME, não só a contagem. "2 de 3" dizia que
                                havia problema e não dizia onde; com o nome, a
                                linha vira o endereço da conversa. É o escopo
                                que mais passou — o mesmo de que vem o número
                                da coluna ao lado, então os dois falam da mesma
                                coisa.

                                ⚠ E a sobra é dita por EXTENSO. "+2 de 3" era
                                aritmética sem substantivo: não dava para saber
                                se contava escopo, dia ou projeto. "e mais 2
                                escopos" responde sozinho.

                                Sem tom de alerta: quem carrega a gravidade é o
                                número ao lado. Nome de escopo pintado de
                                vermelho em toda linha vira ruído e rouba o
                                destaque da coluna que mede. */}
                            <TableCell>
                              {p.escopo_alem_do_vendido ? (
                                <CelulaDias>
                                  {p.escopo_alem_do_vendido}
                                  {outros > 0 && (
                                    <small>
                                      e mais {outros} {outros === 1 ? "escopo" : "escopos"}
                                    </small>
                                  )}
                                </CelulaDias>
                              ) : (
                                <SemDado>—</SemDado>
                              )}
                            </TableCell>
                            {/* Zero vira travessão: a coluna passa a mostrar só
                                onde há algo, e o que sobra salta à vista. */}
                            <TableCell>
                              {p.dias_de_atraso ? (
                                <CelulaDias $tom="alerta">{p.dias_de_atraso}</CelulaDias>
                              ) : (
                                <SemDado>—</SemDado>
                              )}
                            </TableCell>
                            <TableCell>
                              {p.dias_parados ? (
                                <CelulaDias $tom="atencao">{p.dias_parados}</CelulaDias>
                              ) : (
                                <SemDado>—</SemDado>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </DataTable>
                </TabelaRolagem>
                <Paginacao estado={janela} />
              </>
            )}
          </PageCardContent>
        </CardLargura>
      </PainelGrid>

      {/* ⚠ Havia aqui um card "Pedidos de dias de ajuste", o MESMO componente
          da aba Aprovações. Saiu: pedido pendente é uma decisão esperando
          pessoa, e a fila de decisões tem uma aba inteira dedicada a ela desde
          que Aprovações passou a existir. Duplicá-lo aqui obrigava a manter
          dois lugares em sincronia, e este ignorava os dois seletores do topo
          — o mesmo pedido aparecia mesmo com a frente filtrada. */}

      <PageCard>
        <PageCardHeader>
          <PageCardTitle>
            Atenção agora ({filtrados.length}
            {motivo && ` de ${dados.atencao_agora.length}`})
          </PageCardTitle>
        </PageCardHeader>
        <PageCardContent>
          {dados.atencao_agora.length === 0 ? (
            <EmptyText>Nada pedindo ação no momento.</EmptyText>
          ) : (
            <>
              {/* ⭐ O filtro é um SEGMENTADO, não um `select`.
                  São no máximo cinco opções e a contagem de cada uma é a
                  informação mais útil do card: dentro de um `select` ela só
                  aparecia depois de abrir a lista, e a pessoa tinha de abrir
                  para descobrir se valia a pena filtrar. Aberto, o card já
                  responde "o que tem hoje e quanto de cada" antes do
                  primeiro clique.

                  As opções saem do que EXISTE hoje, não de uma lista fixa:
                  oferecer "Kickoff" quando nenhum projeto está sem kickoff
                  devolve card vazio e a impressão de que quebrou. */}
              <ControlesGrafico>
                <GrupoBotoes role="group" aria-label="Filtrar por motivo">
                  <BotaoAlternativa
                    type="button"
                    $ativo={motivo === ""}
                    aria-pressed={motivo === ""}
                    onClick={() => setMotivoPedido("")}
                  >
                    Todos ({dados.atencao_agora.length})
                  </BotaoAlternativa>
                  {motivosPresentes.map(([tipo, n]) => (
                    <BotaoAlternativa
                      key={tipo}
                      type="button"
                      $ativo={motivo === tipo}
                      aria-pressed={motivo === tipo}
                      onClick={() => setMotivoPedido(tipo)}
                    >
                      {ROTULO_ATENCAO[tipo]} ({n})
                    </BotaoAlternativa>
                  ))}
                </GrupoBotoes>
              </ControlesGrafico>

              {/* ⭐ **Agrupado por motivo, não uma linha por projeto.**
                  Numa quinta-feira típica a lista abria com 20 cópias exatas de
                  "sem reunião registrada esta semana" — o mesmo texto, o mesmo
                  ponto colorido, mudando só o nome do projeto. Card que repete
                  a mesma frase vinte vezes deixa de ser lido.

                  ⚠ Mas o grupo não fica mais FECHADO atrás de um `<details>`:
                  com tudo recolhido, descobrir o que havia exigia abrir um por
                  um. Cada grupo mostra as primeiras linhas direto e, quando
                  passa disso, oferece "mostrar as outras N" — que troca o
                  filtro acima em vez de expandir aqui, para a lista longa abrir
                  com o card inteiro para ela. */}
              {grupos.map(([tipo, itens]) => {
                const visiveis = motivo ? itens : itens.slice(0, ITENS_POR_GRUPO);
                const restantes = itens.length - visiveis.length;
                return (
                  <AtencaoSecao key={tipo}>
                    <AtencaoSecaoTopo>
                      <AtencaoSecaoTitulo>
                        {ROTULO_ATENCAO[tipo as TipoAtencao] ?? tipo} · {itens.length}
                      </AtencaoSecaoTitulo>
                      {restantes > 0 && (
                        <AtencaoVerTodos
                          type="button"
                          onClick={() => setMotivoPedido(tipo as TipoAtencao)}
                        >
                          mostrar as outras {restantes}
                        </AtencaoVerTodos>
                      )}
                    </AtencaoSecaoTopo>
                    <AtencaoLista>
                      {visiveis.map((item, i) => (
                        <li key={`${item.projeto_id}-${i}`}>
                          {/* A cor do ponto carrega a gravidade: sem ela uma
                              lista de 15 itens grita igual e a diretoria não
                              sabe por onde começar. O tempo repete a cor à
                              direita, porque cor sozinha não é informação. */}
                          <AtencaoLinha
                            to={`/projetos/${item.projeto_id}`}
                            state={VOLTAR_PARA_AQUI}
                            $nivel={nivelAtencao(item.dias)}
                          >
                            <AtencaoTexto>
                              <strong>{item.projeto_nome}</strong>
                              {/* O motivo vem pronto e específico do backend,
                                  §7.1 é explícito que não pode ser rótulo
                                  genérico. */}
                              <span>{item.motivo}</span>
                            </AtencaoTexto>
                            {item.dias != null && (
                              <AtencaoDias $nivel={nivelAtencao(item.dias)}>
                                há {item.dias} {item.dias === 1 ? "dia" : "dias"}
                              </AtencaoDias>
                            )}
                          </AtencaoLinha>
                        </li>
                      ))}
                    </AtencaoLista>
                  </AtencaoSecao>
                );
              })}
            </>
          )}
        </PageCardContent>
      </PageCard>
    </PageStack>
  );
}
