import { useMemo, useState } from "react";
import { AlertTriangle, Clock, TrendingDown, Users } from "lucide-react";
import { semestreAtual } from "@/lib/semestres";
import { nomeEscopo, nomeUsuario } from "@/lib/nucleo";
import { paraDataUtc } from "@/lib/projetos";
import type {
  Avaliacao,
  Banca,
  BancaFrente,
  Candidatura,
  Escopo,
  Frente,
  HistoricoBanca,
  Semestre,
} from "@/types/banca";
import type { UsuarioResumo } from "@/types/auth";
import { DesempenhoChart, type FatiaDonut } from "@/components/DesempenhoChart";
import { MotivoDesabilitado } from "@/components/MotivoDesabilitado";
import { PresencaBancas } from "./PresencaBancas";
import { Th, useOrdenacao, type Colunas } from "@/components/tabela/ordenacao";
import {
  PageCard,
  PageCardHeader,
  PageCardTitle,
  PageCardContent,
  PageBadge,
  EmptyText,
} from "@/styles/page.styled";
import {
  TopGrid,
  ListCardContent,
  ListScrollWrap,
  LIST_MAX_VISIVEIS,
} from "@/styles/shared.styled";
import {
  CardHeaderRow,
  FilterGroup,
  FilterLabel,
  FieldSelect,
  DataTable,
  TableHead,
  TableBody,
  TableRow,
  NameCell,
  TableCell,
  NotaCell,
  TableScrollWrap,
} from "./Nucleo.styled";
import {
  KpiGrid,
  KpiCard,
  KpiIcone,
  KpiTexto,
  KpiRotulo,
  KpiValor,
  KpiNota,
  InsightLinha,
  InsightTexto,
  InsightNome,
  InsightMeta,
  InsightAcoes,
} from "./DashboardBancas.styled";
import { FUSO } from "@/lib/fuso";

/** Quem avalia tem 7 dias corridos a partir da banca realizada (2026-09-09).
 *  Espelha `PRAZO_AVALIACAO_DIAS` em `src/utils/avaliacoes_pendentes.py`. */
const PRAZO_AVALIACAO_DIAS = 7;

const DIA_MS = 24 * 60 * 60 * 1000;

type DistribuicaoModo = "frentes" | "escopos";
type ResultadosModo = "coordenador" | "escopo" | "frente";

interface ResultadoAgregado {
  id: number;
  nome: string;
  bancas: number;
  notaMedia: number | null;
}

/** As colunas ordenáveis da tabela de resultados. */
const COLUNAS_RESULTADO: Colunas<ResultadoAgregado> = {
  nome: { valor: (r) => r.nome, inicial: "asc" },
  bancas: { valor: (r) => r.bancas, inicial: "desc" },
  nota: { valor: (r) => r.notaMedia, inicial: "desc" },
};

interface Props {
  bancas: Banca[];
  candidaturas: Candidatura[];
  avaliacoes: Avaliacao[];
  usuarios: UsuarioResumo[];
  escopos: Escopo[];
  frentes: Frente[];
  bancasFrentes: BancaFrente[];
  historico: HistoricoBanca[];
  semestres: Semestre[];
}

function formatNota(nota: number | null): string {
  if (nota == null) return "—";
  return nota.toFixed(1);
}

function agregarNotas(
  mapa: Map<number, { bancas: number; soma: number; comNota: number }>,
  id: number,
  nota: number | null,
) {
  const cur = mapa.get(id) ?? { bancas: 0, soma: 0, comNota: 0 };
  cur.bancas += 1;
  if (nota != null) {
    cur.soma += nota;
    cur.comNota += 1;
  }
  mapa.set(id, cur);
}

function mapaParaResultados(
  mapa: Map<number, { bancas: number; soma: number; comNota: number }>,
  nomeDe: (id: number) => string,
): ResultadoAgregado[] {
  return Array.from(mapa.entries())
    .map(([id, dados]) => ({
      id,
      nome: nomeDe(id),
      bancas: dados.bancas,
      notaMedia: dados.comNota > 0 ? dados.soma / dados.comNota : null,
    }))
    .sort((a, b) => b.bancas - a.bancas);
}

/** Comparecimento de um conjunto de bancas: só as realizadas HÁ MAIS DE
 *  {@link PRAZO_AVALIACAO_DIAS} DIAS entram na conta — dentro do prazo de
 *  graça pra enviar a avaliação, ainda ninguém "faltou" de verdade, é só
 *  o formulário que acabou de abrir (mesma régua da tabela "Presença por
 *  membro", `PresencaBancas.tsx`, 2026-09-23). Presença = compareceu **E**
 *  enviou a avaliação daquela banca. */
function comparecimento(
  bancas: Banca[],
  candidaturas: Candidatura[],
  avaliacoes: Avaliacao[],
  agora: number,
) {
  const realizadas = new Set(
    bancas
      .filter((b) => b.realizado_em && agora - paraDataUtc(b.realizado_em).getTime() >= PRAZO_AVALIACAO_DIAS * DIA_MS)
      .map((b) => b.id),
  );
  const avaliou = new Set(
    avaliacoes
      .filter((a) => a.status === "submetida")
      .map((a) => `${a.banca_id}:${a.avaliador_id}`),
  );
  const inscritos = candidaturas.filter((c) => realizadas.has(c.banca_id));
  const presentes = inscritos.filter(
    (c) => c.confirmado && avaliou.has(`${c.banca_id}:${c.usuario_id}`),
  ).length;
  return {
    inscritos: inscritos.length,
    presentes,
    percentual: inscritos.length > 0 ? Math.round((presentes / inscritos.length) * 100) : null,
  };
}

/**
 * Dashboard Bancas, a visão da diretoria sobre a área.
 *
 * Junta o que era a tela Núcleo (distribuição e resultados) com o que só
 * existia no banco e ninguém via: presença por membro e as bancas que estão
 * prestes a dar errado.
 *
 * A lista "últimas realizadas" do Núcleo não veio junto: a tela que hospeda
 * este bloco já tem "Bancas realizadas", com filtro e nota por banca.
 *
 * Só a diretoria chega aqui. As listas pessoais, "o que EU preciso
 * avaliar", ficaram na aba Alocação de propósito: elas são a fila de tarefa
 * de cada um, não indicador de área, e trancá-las aqui deixaria consultor e
 * coordenador sem ver o próprio prazo.
 */
export function DashboardBancas({
  bancas,
  candidaturas,
  avaliacoes,
  usuarios,
  escopos,
  frentes,
  bancasFrentes,
  historico,
  semestres,
}: Props) {
  // Congelado na montagem: "faltam 3 dias" não pode mudar porque um filtro
  // acima re-renderizou a tela.
  const [agora] = useState(() => Date.now());
  const [distribuicaoModo, setDistribuicaoModo] = useState<DistribuicaoModo>("frentes");
  const [distribuicaoFrenteId, setDistribuicaoFrenteId] = useState<string>("");
  const [resultadosModo, setResultadosModo] = useState<ResultadosModo>("coordenador");

  /** Sem escolha explícita, cai na primeira frente, derivado, não estado
   *  espelhado, para não sincronizar dentro de efeito. */
  const frenteAtivaId = distribuicaoFrenteId || (frentes.length > 0 ? String(frentes[0].id) : "");

  const semestre = useMemo(() => semestreAtual(semestres), [semestres]);
  const semestreNome = semestre?.nome ?? "semestre atual";

  const historicoSemestre = useMemo(() => {
    if (!semestre) return historico;
    return historico.filter((b) => b.semestre_id === semestre.id);
  }, [historico, semestre]);

  const bancasSemestre = useMemo(() => {
    if (!semestre) return bancas;
    return bancas.filter((b) => b.semestre_id === semestre.id);
  }, [bancas, semestre]);

  /* --------------------------------------------------------------- */
  /* Indicadores                                                       */
  /* --------------------------------------------------------------- */

  const presencaNucleo = useMemo(() => {
    const atual = comparecimento(bancasSemestre, candidaturas, avaliacoes, agora);

    // O semestre anterior é o de maior início antes do atual, não "id - 1",
    // que quebraria se um semestre fosse cadastrado fora de ordem.
    const anterior = semestre
      ? semestres
          .filter((s) => new Date(s.inicio) < new Date(semestre.inicio))
          .sort((a, b) => new Date(b.inicio).getTime() - new Date(a.inicio).getTime())[0]
      : undefined;
    const anteriorDados = anterior
      ? comparecimento(
          bancas.filter((b) => b.semestre_id === anterior.id),
          candidaturas,
          avaliacoes,
          agora,
        )
      : null;

    return {
      ...atual,
      anteriorNome: anterior?.nome ?? null,
      delta:
        atual.percentual != null && anteriorDados?.percentual != null
          ? atual.percentual - anteriorDados.percentual
          : null,
    };
  }, [bancasSemestre, bancas, candidaturas, avaliacoes, semestre, semestres, agora]);

  const abaixoDoMinimo = useMemo(
    () => bancasSemestre.filter((b) => b.realizado_em && b.alocados < b.piso_minimo),
    [bancasSemestre],
  );

  /** Ainda vai acontecer e não fechou composição, dá tempo de agir. */
  const emRisco = useMemo(() => {
    return bancasSemestre
      .filter(
        // ⚠ `b.data_hora &&` primeiro: "em risco" é sobre banca que vai
        // acontecer e está sem gente. Sem data não há prazo correndo — e o
        // `paraDataUtc(null)` devolvia Invalid Date, cujo `getTime()` é NaN,
        // e `NaN > agora` é falso: a banca sumia da lista por acidente, não
        // por decisão.
        (b): b is typeof b & { data_hora: string } =>
          !!b.data_hora &&
          !b.realizado_em &&
          b.alocados < b.piso_minimo &&
          paraDataUtc(b.data_hora).getTime() > agora,
      )
      .map((b) => ({
        banca: b,
        diasRestantes: Math.ceil((paraDataUtc(b.data_hora).getTime() - agora) / DIA_MS),
        faltam: b.piso_minimo - b.alocados,
      }))
      .sort((a, b) => a.diasRestantes - b.diasRestantes);
  }, [bancasSemestre, agora]);

  /**
   * Avaliações pendentes de TODO o núcleo, agrupadas por banca.
   *
   * A regra é a mesma do backend (`calcular_avaliacoes_pendentes`): quem foi
   * alocado numa banca já realizada e não submeteu, deve. O prazo conta de
   * `realizado_em`, não da data marcada, banca que aconteceu atrasada não
   * encurta o prazo de quem avalia.
   */
  const avaliacoesVencendo = useMemo(() => {
    // ⚠ Chave `banca:avaliador` dos DOIS lados. A versão anterior montava o
    // Set com `banca:avaliador:sessao` mas consultava com `banca:usuario` —
    // nunca casava, e TODO candidato contava como pendente (uma banca 100%
    // avaliada aparecia como "12 não avaliaram"). O dashboard não tem a
    // sessão corrente por banca (o tipo `Banca` não traz), então aqui é
    // "enviou alguma avaliação desta banca = feito"; a distinção de sessão
    // do §9 fica só no backend (`calcular_avaliacoes_pendentes`), que a tela
    // de cobrança e o lembrete usam.
    const submetidas = new Set(
      avaliacoes
        .filter((a) => a.status === "submetida")
        .map((a) => `${a.banca_id}:${a.avaliador_id}`),
    );

    return bancasSemestre
      .filter((b) => b.realizado_em)
      .map((b) => {
        const pendentes = candidaturas.filter(
          (c) => c.banca_id === b.id && !submetidas.has(`${b.id}:${c.usuario_id}`),
        );
        const prazo = paraDataUtc(b.realizado_em!).getTime() + PRAZO_AVALIACAO_DIAS * DIA_MS;
        return { banca: b, pendentes, prazo, vencido: agora > prazo };
      })
      .filter((item) => item.pendentes.length > 0)
      .sort((a, b) => a.prazo - b.prazo);
  }, [bancasSemestre, candidaturas, avaliacoes, agora]);

  const totalVencidas = avaliacoesVencendo.filter((a) => a.vencido).length;

  /* --------------------------------------------------------------- */
  /* Distribuição e resultados (o que era o Núcleo)                    */
  /* --------------------------------------------------------------- */

  const fatias: FatiaDonut[] = useMemo(() => {
    if (distribuicaoModo === "frentes") {
      // Pontos (peso fracionado pra banca sinérgica) e itens (nomes pro
      // balão de hover) andam juntos, senão precisaria varrer as bancas de
      // novo só pra saber quem está em cada fatia.
      const pontosPorFrente = new Map<string, { valor: number; itens: string[] }>();
      function somar(nome: string, peso: number, nomeBanca: string) {
        const atual = pontosPorFrente.get(nome) ?? { valor: 0, itens: [] };
        atual.valor += peso;
        atual.itens.push(nomeBanca);
        pontosPorFrente.set(nome, atual);
      }
      for (const banca of historicoSemestre) {
        const frentesDaBanca = bancasFrentes.filter((bf) => bf.banca_id === banca.id);
        const peso = frentesDaBanca.length > 0 ? 1 / frentesDaBanca.length : 0;
        if (frentesDaBanca.length === 0) {
          somar("Sem frente", 1, banca.nome_projeto);
          continue;
        }
        for (const bf of frentesDaBanca) {
          const nome = frentes.find((f) => f.id === bf.frente_id)?.nome ?? "—";
          somar(nome, peso, banca.nome_projeto);
        }
      }
      return Array.from(pontosPorFrente.entries()).map(([nome, { valor, itens }]) => ({
        nome,
        valor: Math.round(valor * 10) / 10,
        itens,
      }));
    }

    const frenteId = Number(frenteAtivaId);
    if (!frenteId) return [];

    const pontosPorEscopo = new Map<string, { valor: number; itens: string[] }>();
    for (const banca of historicoSemestre) {
      const pertence = bancasFrentes.some((bf) => bf.banca_id === banca.id && bf.frente_id === frenteId);
      if (!pertence) continue;
      const nome = nomeEscopo(escopos, banca.escopo_id);
      const atual = pontosPorEscopo.get(nome) ?? { valor: 0, itens: [] };
      atual.valor += 1;
      atual.itens.push(banca.nome_projeto);
      pontosPorEscopo.set(nome, atual);
    }
    return Array.from(pontosPorEscopo.entries()).map(([nome, { valor, itens }]) => ({ nome, valor, itens }));
  }, [historicoSemestre, bancasFrentes, frentes, escopos, distribuicaoModo, frenteAtivaId]);

  const totalDistribuicao = useMemo(() => {
    if (distribuicaoModo === "frentes") return historicoSemestre.length;
    const frenteId = Number(frenteAtivaId);
    if (!frenteId) return 0;
    return historicoSemestre.filter((b) =>
      bancasFrentes.some((bf) => bf.banca_id === b.id && bf.frente_id === frenteId),
    ).length;
  }, [historicoSemestre, bancasFrentes, distribuicaoModo, frenteAtivaId]);

  const resultados = useMemo((): ResultadoAgregado[] => {
    if (resultadosModo === "coordenador") {
      const mapa = new Map<number, { bancas: number; soma: number; comNota: number }>();
      for (const banca of historicoSemestre) {
        agregarNotas(mapa, banca.coordenador_id, banca.nota_final);
      }
      return mapaParaResultados(mapa, (id) => nomeUsuario(usuarios, id));
    }

    if (resultadosModo === "escopo") {
      const mapa = new Map<number, { bancas: number; soma: number; comNota: number }>();
      for (const banca of historicoSemestre) {
        agregarNotas(mapa, banca.escopo_id, banca.nota_final);
      }
      return mapaParaResultados(mapa, (id) => nomeEscopo(escopos, id));
    }

    const mapa = new Map<number, { bancas: number; soma: number; comNota: number }>();
    for (const banca of historicoSemestre) {
      const frentesIds = bancasFrentes.filter((bf) => bf.banca_id === banca.id).map((bf) => bf.frente_id);
      const ids = frentesIds.length > 0 ? frentesIds : [0];
      for (const frenteId of ids) {
        agregarNotas(mapa, frenteId, banca.nota_final);
      }
    }
    return mapaParaResultados(mapa, (id) =>
      id === 0 ? "Sem frente" : (frentes.find((f) => f.id === id)?.nome ?? "—"),
    );
  }, [historicoSemestre, usuarios, escopos, frentes, bancasFrentes, resultadosModo]);

  // Abre como a tabela sempre abriu: quem tem mais bancas primeiro.
  const {
    itens: resultadosOrdenados,
    ordem: ordemResultados,
    ordenarPor,
  } = useOrdenacao(resultados, COLUNAS_RESULTADO, "bancas");

  /* "do projeto" reforça de que lado da banca a pessoa está: ela é quem
     coordena o trabalho avaliado, não quem senta na mesa para avaliar — a
     mesma confusão que a coluna de nota ao lado precisa desfazer. */
  const rotuloResultados =
    resultadosModo === "coordenador"
      ? "Coordenador do projeto"
      : resultadosModo === "escopo"
        ? "Escopo"
        : "Frente";

  const frenteSelecionadaNome = frentes.find((f) => f.id === Number(frenteAtivaId))?.nome;

  return (
    <>
      <KpiGrid>
        <KpiCard>
          <KpiIcone aria-hidden>
            <Users size={18} />
          </KpiIcone>
          <KpiTexto>
            <KpiRotulo>Comparecimento do núcleo</KpiRotulo>
            <KpiValor>
              {presencaNucleo.percentual == null ? "—" : `${presencaNucleo.percentual}%`}
            </KpiValor>
            <KpiNota>
              {presencaNucleo.percentual == null
                ? "Nenhuma banca realizada ainda"
                : `${presencaNucleo.presentes} de ${presencaNucleo.inscritos} presenças`}
              {presencaNucleo.delta != null && presencaNucleo.anteriorNome
                ? ` · ${presencaNucleo.delta >= 0 ? "+" : ""}${presencaNucleo.delta} p.p. vs ${presencaNucleo.anteriorNome}`
                : ""}
            </KpiNota>
          </KpiTexto>
        </KpiCard>

        <KpiCard>
          <KpiIcone $tone={emRisco.length > 0 ? "atencao" : "neutro"} aria-hidden>
            <AlertTriangle size={18} />
          </KpiIcone>
          <KpiTexto>
            <KpiRotulo>Bancas em risco</KpiRotulo>
            <KpiValor>{emRisco.length}</KpiValor>
            <KpiNota>
              {emRisco.length === 0
                ? "Todas as próximas fecharam composição"
                : "Ainda sem o mínimo de avaliadores"}
            </KpiNota>
          </KpiTexto>
        </KpiCard>

        <KpiCard>
          <KpiIcone $tone={totalVencidas > 0 ? "risco" : "neutro"} aria-hidden>
            <Clock size={18} />
          </KpiIcone>
          <KpiTexto>
            <KpiRotulo>Avaliações vencendo</KpiRotulo>
            <KpiValor>{avaliacoesVencendo.length}</KpiValor>
            <KpiNota>
              {avaliacoesVencendo.length === 0
                ? "Nada pendente"
                : `${totalVencidas} com prazo já vencido`}
            </KpiNota>
          </KpiTexto>
        </KpiCard>

        <KpiCard>
          <KpiIcone $tone={abaixoDoMinimo.length > 0 ? "atencao" : "neutro"} aria-hidden>
            <TrendingDown size={18} />
          </KpiIcone>
          <KpiTexto>
            <KpiRotulo>Feitas abaixo do mínimo</KpiRotulo>
            <KpiValor>{abaixoDoMinimo.length}</KpiValor>
            <KpiNota>
              {abaixoDoMinimo.length === 0
                ? "Nenhuma exceção usada"
                : `de ${bancasSemestre.filter((b) => b.realizado_em).length} realizadas`}
            </KpiNota>
          </KpiTexto>
        </KpiCard>
      </KpiGrid>

      <TopGrid>
        <PageCard>
          <PageCardHeader>
            <CardHeaderRow>
              <PageCardTitle>Distribuição de bancas, {semestreNome}</PageCardTitle>
              <FilterGroup>
                <FilterLabel htmlFor="dist-modo">Ver por</FilterLabel>
                <FieldSelect
                  id="dist-modo"
                  value={distribuicaoModo}
                  onChange={(e) => setDistribuicaoModo(e.target.value as DistribuicaoModo)}
                >
                  <option value="frentes">Frentes</option>
                  <option value="escopos">Escopos de uma frente</option>
                </FieldSelect>
                {distribuicaoModo === "escopos" && (
                  <>
                    <FilterLabel htmlFor="dist-frente">Frente</FilterLabel>
                    <FieldSelect
                      id="dist-frente"
                      value={frenteAtivaId}
                      onChange={(e) => setDistribuicaoFrenteId(e.target.value)}
                    >
                      {frentes.length === 0 && <option value="">Nenhuma frente</option>}
                      {frentes.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.nome}
                        </option>
                      ))}
                    </FieldSelect>
                  </>
                )}
              </FilterGroup>
            </CardHeaderRow>
          </PageCardHeader>
          <PageCardContent>
            {distribuicaoModo === "escopos" && !frenteAtivaId ? (
              <EmptyText>Selecione uma frente para ver a distribuição por escopos.</EmptyText>
            ) : fatias.length === 0 ? (
              <EmptyText>Nenhuma banca para exibir neste recorte.</EmptyText>
            ) : (
              <DesempenhoChart
                fatias={fatias}
                valorCentral={String(totalDistribuicao)}
                ariaLabel={
                  distribuicaoModo === "frentes"
                    ? `${totalDistribuicao} bancas realizadas no semestre`
                    : `${totalDistribuicao} bancas na frente ${frenteSelecionadaNome ?? ""}`
                }
              />
            )}
          </PageCardContent>
        </PageCard>

        <PageCard>
          <PageCardHeader>
            <CardHeaderRow>
              <PageCardTitle>Resultados, {semestreNome}</PageCardTitle>
              <FilterGroup>
                <FilterLabel htmlFor="res-modo">Ver por</FilterLabel>
                <FieldSelect
                  id="res-modo"
                  value={resultadosModo}
                  onChange={(e) => setResultadosModo(e.target.value as ResultadosModo)}
                >
                  <option value="coordenador">Coordenador</option>
                  <option value="escopo">Escopo</option>
                  <option value="frente">Frente</option>
                </FieldSelect>
              </FilterGroup>
            </CardHeaderRow>
          </PageCardHeader>
          <PageCardContent>
            {resultados.length === 0 && <EmptyText>Nenhum resultado neste semestre.</EmptyText>}
            {resultados.length > 0 && (
              <TableScrollWrap $scrollable={resultados.length > LIST_MAX_VISIVEIS} $min="30rem">
                <DataTable>
                  <TableHead>
                    <TableRow>
                      <Th coluna="nome" ordem={ordemResultados} onOrdenar={ordenarPor}>
                        {rotuloResultados}
                      </Th>
                      <Th coluna="bancas" ordem={ordemResultados} onOrdenar={ordenarPor}>
                        Bancas
                      </Th>
                      {/* ⭐ "Recebida" é a palavra que carrega a coluna inteira.
                          Sem ela, "Ana Souza — 3,4" tem duas leituras opostas e
                          plausíveis: a nota que as bancas DELA tiraram, ou a
                          nota que ela COSTUMA DAR quando avalia. É a primeira —
                          o agrupamento é por `banca.coordenador_id`, e quem
                          avaliou não entra nesta tabela em lugar nenhum. */}
                      <Th coluna="nota" ordem={ordemResultados} onOrdenar={ordenarPor}>
                        Nota média recebida
                      </Th>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {resultadosOrdenados.map((item) => (
                      <TableRow key={`${resultadosModo}-${item.id}`}>
                        <NameCell>{item.nome}</NameCell>
                        <TableCell>{item.bancas}</TableCell>
                        <NotaCell>{formatNota(item.notaMedia)}</NotaCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </DataTable>
              </TableScrollWrap>
            )}
          </PageCardContent>
        </PageCard>
      </TopGrid>

      <TopGrid>
        <PageCard>
          <PageCardHeader>
            <PageCardTitle>Bancas em risco de não fechar</PageCardTitle>
            <PageBadge $tone={emRisco.length > 0 ? "warning" : "muted"}>{emRisco.length}</PageBadge>
          </PageCardHeader>
          <ListCardContent>
            {emRisco.length === 0 ? (
              <EmptyText>Nenhuma banca futura está sem o mínimo de avaliadores.</EmptyText>
            ) : (
              <ListScrollWrap $scrollable={emRisco.length > LIST_MAX_VISIVEIS}>
                {emRisco.map(({ banca, diasRestantes, faltam }) => (
                  <InsightLinha key={banca.id}>
                    <InsightTexto>
                      <InsightNome>{banca.nome_projeto}</InsightNome>
                      <InsightMeta>
                        {banca.data_hora
                          ? paraDataUtc(banca.data_hora).toLocaleDateString("pt-BR", { timeZone: FUSO })
                          : "Sem data"}{" "}
                        ·{" "}
                        {banca.alocados}/{banca.piso_minimo} do mínimo · faltam {faltam}
                      </InsightMeta>
                    </InsightTexto>
                    <InsightAcoes>
                      <PageBadge $tone={diasRestantes <= 3 ? "danger" : "warning"}>
                        {diasRestantes <= 1 ? "amanhã" : `em ${diasRestantes} dias`}
                      </PageBadge>
                    </InsightAcoes>
                  </InsightLinha>
                ))}
              </ListScrollWrap>
            )}
          </ListCardContent>
        </PageCard>

        <PageCard>
          <PageCardHeader>
            <PageCardTitle>Avaliações vencendo</PageCardTitle>
            <PageBadge $tone={totalVencidas > 0 ? "danger" : "muted"}>
              {avaliacoesVencendo.length}
            </PageBadge>
          </PageCardHeader>
          <ListCardContent>
            {avaliacoesVencendo.length === 0 ? (
              <EmptyText>Todo mundo avaliou as bancas que assistiu.</EmptyText>
            ) : (
              <ListScrollWrap $scrollable={avaliacoesVencendo.length > LIST_MAX_VISIVEIS}>
                {avaliacoesVencendo.map(({ banca, pendentes, prazo, vencido }) => (
                  <InsightLinha key={banca.id}>
                    <MotivoDesabilitado
                      motivo={
                        <>
                          <strong>Falta avaliar:</strong>
                          {pendentes.map((p) => (
                            <div key={p.id}>{nomeUsuario(usuarios, p.usuario_id)}</div>
                          ))}
                        </>
                      }
                    >
                      <InsightTexto>
                        <InsightNome>{banca.nome_projeto}</InsightNome>
                        <InsightMeta>
                          {pendentes.length} {pendentes.length === 1 ? "pessoa não avaliou" : "pessoas não avaliaram"} ·
                          prazo {new Date(prazo).toLocaleDateString("pt-BR", { timeZone: FUSO })}
                        </InsightMeta>
                      </InsightTexto>
                    </MotivoDesabilitado>
                    <InsightAcoes>
                      <PageBadge $tone={vencido ? "danger" : "warning"}>
                        {vencido ? "Vencido" : "No prazo"}
                      </PageBadge>
                    </InsightAcoes>
                  </InsightLinha>
                ))}
              </ListScrollWrap>
            )}
          </ListCardContent>
        </PageCard>
      </TopGrid>

      <PresencaBancas
        usuarios={usuarios}
        candidaturas={candidaturas}
        bancas={bancasSemestre}
        avaliacoes={avaliacoes}
      />

    </>
  );
}
