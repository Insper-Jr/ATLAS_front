import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Download } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAuth } from "@/context/AuthContext";
import { diasEntre, hojeEmBrasilia, somarDias } from "@/lib/fuso";
import { getGpGestoes, getGpRegistros, type GpCategoria, type GpGestao, type GpRegistro } from "@/lib/gestao-pessoas";
import { ROTULO_CATEGORIA } from "@/lib/gp-rotulos";
import { theme } from "@/styles/theme";
import {
  EmptyText,
  ErrorText,
  PageButtonSm,
  PageCard,
  PageCardContent,
  PageCardHeader,
  PageCardTitle,
} from "@/styles/page.styled";
import { DataTable, FieldInput, FieldSelect, TableBody, TableCell, TableHead, TableHeadCell, TableRow } from "@/pages/Bancas.styled";
import { KpiCard, KpiGrid, KpiRotulo, KpiTexto, KpiValor } from "@/pages/monitoramento/Monitoramento.styled";
import { SegmentedButton, SegmentedGroup, TableScrollWrap } from "@/styles/shared.styled";
import {
  CabecalhoControles,
  CaixaGrafico,
  Descricao,
  Filtros,
  GradeDois,
  Insight,
  Insights,
  Nota,
  Variacao,
} from "./GestaoPessoas.styled";
import { useGestaoPessoas } from "./contexto";
import { baixarCsv, gerarCsv, numeroPt } from "./csv";
import {
  estatisticas,
  formatarDia,
  formatarVariacao,
  mesesDoSemestre,
  mesLongo,
  normalTeorica,
  periodoDoFiltro,
  registrosAtivosNoPeriodo,
  semanasDoPeriodo,
  serieTempo,
  somaPontos,
  valorDoBucket,
  variacao,
  type ChavePeriodo,
  type Granularidade,
  type MetricaTempo,
} from "./calculos";

const eixo = { stroke: theme.colors.mutedForeground, fontSize: 12, tickLine: false } as const;

type Grupo = "todos" | "compontos" | "alerta";
type PresetComparacao = "meses" | "metades" | "custom";
type MetricaComparacao = "total" | "ocorr" | "membro" | "semana";
type MetricaDistribuicao = "total" | "media" | "ocorr" | "prox";

/**
 * Aba "Análises" (spec 5.1): tudo calculado no front a partir de
 * `GET /registros` da gestão atual (e da anterior, pra comparação) e do
 * resumo. O histograma e as médias usam pontos do PERÍODO filtrado; a
 * situação de alerta usa o acumulado da gestão.
 */
export function AnalisesCategoria({ categoria }: { categoria: GpCategoria }) {
  const { token } = useAuth();
  const { resumo, nucleos, versao } = useGestaoPessoas();
  const semestre = resumo.semestre;
  const limite = resumo.limites[categoria];
  const hoje = hojeEmBrasilia();

  const [registros, setRegistros] = useState<GpRegistro[] | null>(null);
  const [anterior, setAnterior] = useState<{ gestao: GpGestao; registros: GpRegistro[] } | null>(null);
  const [erro, setErro] = useState("");

  const [periodo, setPeriodo] = useState<ChavePeriodo>("semestre");
  const [customDe, setCustomDe] = useState(semestre.inicio.slice(0, 10));
  const [customAte, setCustomAte] = useState(hoje);
  const [nucleoId, setNucleoId] = useState("");
  const [grupo, setGrupo] = useState<Grupo>("todos");

  const [gran, setGran] = useState<Granularidade>("semana");
  const [metricaTempo, setMetricaTempo] = useState<MetricaTempo>("total");
  const [comparar, setComparar] = useState(true);

  const meses = useMemo(() => mesesDoSemestre(semestre.inicio, semestre.fim), [semestre.inicio, semestre.fim]);
  const [preset, setPreset] = useState<PresetComparacao>("meses");
  const [metricaComp, setMetricaComp] = useState<MetricaComparacao>("total");
  const [compA, setCompA] = useState({ de: meses[0] ?? semestre.inicio.slice(0, 10), ate: somarDias(meses[1] ?? hoje, -1) });
  const [compB, setCompB] = useState({ de: meses[1] ?? semestre.inicio.slice(0, 10), ate: somarDias(meses[2] ?? somarDias(hoje, 1), -1) });

  const [agrupar, setAgrupar] = useState<"nucleo" | "projeto">("nucleo");
  const [modoDistribuicao, setModoDistribuicao] = useState<"grafico" | "tabela">("grafico");
  const [metricaDist, setMetricaDist] = useState<MetricaDistribuicao>("total");

  useEffect(() => {
    if (!token) return;
    let vivo = true;
    Promise.all([getGpRegistros(token, { semestre_id: semestre.id }), getGpGestoes(token)])
      .then(async ([atuais, gestoes]) => {
        if (!vivo) return;
        setErro("");
        setRegistros(atuais);
        const ant = gestoes
          .filter((g) => g.inicio < semestre.inicio)
          .sort((a, b) => b.inicio.localeCompare(a.inicio))[0];
        if (ant) {
          const antRegistros = await getGpRegistros(token, { semestre_id: ant.id });
          if (vivo) setAnterior({ gestao: ant, registros: antRegistros });
        } else {
          setAnterior(null);
        }
      })
      .catch((err) => vivo && setErro(err instanceof Error ? err.message : "Erro ao carregar as análises"));
    return () => {
      vivo = false;
    };
  }, [token, semestre.id, semestre.inicio, versao]);

  const per = periodoDoFiltro(periodo, semestre, { de: customDe, ate: customAte });

  const membrosPorId = useMemo(() => new Map(resumo.membros.map((m) => [m.usuario_id, m])), [resumo.membros]);
  const ativosDoNucleo = useMemo(
    () => resumo.membros.filter((m) => m.ativo && (!nucleoId || m.nucleo_ids.includes(Number(nucleoId)))),
    [resumo.membros, nucleoId],
  );

  // Registros ativos da categoria, no núcleo filtrado (todas as datas:
  // cada card recorta o período que precisa).
  const regsCategoria = useMemo(
    () =>
      (registros ?? []).filter(
        (r) =>
          r.categoria === categoria &&
          (!nucleoId || (membrosPorId.get(r.usuario_id)?.nucleo_ids ?? []).includes(Number(nucleoId))),
      ),
    [registros, categoria, nucleoId, membrosPorId],
  );
  const regsPeriodo = useMemo(() => registrosAtivosNoPeriodo(regsCategoria, per.de, per.ate), [regsCategoria, per.de, per.ate]);

  /* ---------------- Card 1: distribuição ---------------- */
  const amostra = useMemo(() => {
    const porMembro = new Map<number, number>();
    for (const r of regsPeriodo) porMembro.set(r.usuario_id, (porMembro.get(r.usuario_id) ?? 0) + r.pontos);
    return ativosDoNucleo
      .map((m) => ({ membro: m, p: porMembro.get(m.usuario_id) ?? 0, f: m[categoria].faixa }))
      .filter((v) => (grupo === "compontos" ? v.p > 0 : grupo === "alerta" ? v.f !== "ok" : true));
  }, [ativosDoNucleo, regsPeriodo, categoria, grupo]);

  const stats = useMemo(() => estatisticas(amostra.map((v) => v.p)), [amostra]);
  const pctProximos = amostra.length ? (amostra.filter((v) => v.f === "proximo").length / amostra.length) * 100 : 0;
  const pctLimite = amostra.length ? (amostra.filter((v) => v.f === "limite").length / amostra.length) * 100 : 0;
  const curvaOk = stats.n >= 10 && stats.desvio > 0;

  const histograma = useMemo(() => {
    const valores = amostra.map((v) => v.p);
    const minP = Math.min(0, ...valores);
    const maxP = Math.max(limite, 1, ...valores);
    const contagem = new Map<number, number>();
    for (const v of valores) contagem.set(v, (contagem.get(v) ?? 0) + 1);
    const pontos: { x: number; membros: number | null; normal?: number }[] = [];
    for (let x = minP; x <= maxP + 0.0001; x += 0.5) {
      const inteiro = Number.isInteger(x);
      pontos.push({
        x,
        membros: inteiro ? (contagem.get(x) ?? 0) : null,
        normal: curvaOk ? Number(normalTeorica(x, stats.n, stats.media, stats.desvio).toFixed(2)) : undefined,
      });
    }
    return { pontos, minP, maxP };
  }, [amostra, limite, curvaOk, stats]);

  /* ---------------- Card 2: ao longo do tempo ---------------- */
  const buckets = useMemo(() => serieTempo(regsCategoria, per.de, per.ate, gran), [regsCategoria, per.de, per.ate, gran]);
  const ativosContagem = ativosDoNucleo.length;
  const comparando = comparar && !!anterior;

  const serie = useMemo(() => {
    const desloc = anterior ? diasEntre(anterior.gestao.inicio.slice(0, 10), semestre.inicio.slice(0, 10)) : 0;
    const antRegs = anterior
      ? anterior.registros.filter(
          (r) =>
            r.categoria === categoria &&
            r.status === "ativo" &&
            (!nucleoId || (membrosPorId.get(r.usuario_id)?.nucleo_ids ?? []).includes(Number(nucleoId))),
        )
      : [];
    return buckets.map((b) => {
      let anteriorValor: number | null = null;
      let tituloAnterior = "";
      if (anterior) {
        const de = somarDias(b.inicio, -desloc);
        const ate = somarDias(b.fim, -desloc);
        if (de <= anterior.gestao.fim.slice(0, 10)) {
          const dentro = antRegs.filter((r) => r.data >= de && r.data <= ate);
          anteriorValor = valorDoBucket(
            { ...b, pontos: somaPontos(dentro), ocorrencias: dentro.length },
            metricaTempo,
            ativosContagem,
          );
          tituloAnterior = `${formatarDia(de)} a ${formatarDia(ate)}`;
        }
      }
      return {
        rotulo: b.rotulo,
        titulo: b.titulo,
        atual: valorDoBucket(b, metricaTempo, ativosContagem),
        anterior: anteriorValor,
        tituloAnterior,
        ocorrencias: b.ocorrencias,
      };
    });
  }, [buckets, anterior, semestre.inicio, categoria, nucleoId, membrosPorId, metricaTempo, ativosContagem]);

  const insights = useMemo(() => {
    if (buckets.length === 0) return [];
    const unidade = gran === "semana" ? "Semana" : "Mês";
    const lista: { rotulo: string; valor: string }[] = [];
    const maisPontos = [...buckets].sort((a, b) => b.pontos - a.pontos)[0];
    lista.push({ rotulo: `${unidade} com mais pontos`, valor: `${maisPontos.titulo.replace(/^Semana \d+, de /, "")} · ${maisPontos.pontos}` });
    const menosOcorr = [...buckets].sort((a, b) => a.ocorrencias - b.ocorrencias)[0];
    lista.push({ rotulo: `${unidade} com menos ocorrências`, valor: `${menosOcorr.titulo.replace(/^Semana \d+, de /, "")} · ${menosOcorr.ocorrencias}` });
    const totalOcorr = buckets.reduce((t, b) => t + b.ocorrencias, 0);
    if (totalOcorr > 0) {
      const top = [...buckets].sort((a, b) => b.ocorrencias - a.ocorrencias).slice(0, Math.min(3, buckets.length));
      const parte = (top.reduce((t, b) => t + b.ocorrencias, 0) / totalOcorr) * 100;
      lista.push({
        rotulo: "Concentração",
        valor: `${Math.round(parte)}% das ocorrências em ${top.length} ${gran === "semana" ? "semana(s)" : "mês(es)"}`,
      });
    }
    const meio = Math.floor(buckets.length / 2);
    const media = (lista2: typeof buckets) => (lista2.length ? lista2.reduce((t, b) => t + b.pontos, 0) / lista2.length : 0);
    const primeira = media(buckets.slice(0, meio));
    const segunda = media(buckets.slice(meio));
    lista.push({
      rotulo: "Tendência no período",
      valor: primeira === 0 ? "sem base na primeira metade" : `${formatarVariacao(primeira, segunda)} na segunda metade`,
    });
    if (comparando && anterior) {
      const totalAtual = serie.reduce((t, s) => t + s.atual, 0);
      const totalAnterior = serie.reduce((t, s) => t + (s.anterior ?? 0), 0);
      lista.push({
        rotulo: `Comparado à gestão ${anterior.gestao.nome}`,
        valor: totalAnterior === 0 ? "sem pontos na anterior" : `${formatarVariacao(totalAnterior, totalAtual)} no mesmo trecho`,
      });
    }
    return lista;
  }, [buckets, gran, comparando, anterior, serie]);

  /* ---------------- Card 3: comparação entre períodos ---------------- */
  const periodosComparacao = useMemo(() => {
    if (preset === "metades") {
      const inicio = semestre.inicio.slice(0, 10);
      const fim = semestre.fim.slice(0, 10);
      const meioDias = Math.floor(diasEntre(inicio, fim) / 2);
      const meio = somarDias(inicio, meioDias);
      return {
        a: { de: inicio, ate: meio, rotulo: "1ª metade" },
        b: { de: somarDias(meio, 1), ate: fim, rotulo: "2ª metade" },
      };
    }
    if (preset === "custom") {
      return {
        a: { ...compA, rotulo: `${formatarDia(compA.de)} a ${formatarDia(compA.ate)}` },
        b: { ...compB, rotulo: `${formatarDia(compB.de)} a ${formatarDia(compB.ate)}` },
      };
    }
    // Mês anterior x mês atual, dentro dos meses da gestão.
    const mesHoje = `${hoje.slice(0, 7)}-01`;
    const indice = meses.indexOf(mesHoje);
    const atualIdx = indice >= 1 ? indice : Math.max(1, meses.length - 1);
    const mesB = meses[atualIdx] ?? mesHoje;
    const mesA = meses[atualIdx - 1] ?? somarDias(mesB, -1).slice(0, 7) + "-01";
    const fimDe = (m: string) => somarDias(`${somarDias(m, 32).slice(0, 7)}-01`, -1);
    return {
      a: { de: mesA, ate: fimDe(mesA), rotulo: mesLongo(mesA) },
      b: { de: mesB, ate: fimDe(mesB), rotulo: mesLongo(mesB) },
    };
  }, [preset, semestre.inicio, semestre.fim, compA, compB, meses, hoje]);

  const comparacao = useMemo(() => {
    function medir(p: { de: string; ate: string }) {
      const regs = registrosAtivosNoPeriodo(regsCategoria, p.de, p.ate);
      const pontos = somaPontos(regs);
      return {
        pontos,
        ocorrencias: regs.length,
        porMembro: ativosContagem ? pontos / ativosContagem : 0,
        porSemana: pontos / semanasDoPeriodo(p.de, p.ate),
      };
    }
    return { a: medir(periodosComparacao.a), b: medir(periodosComparacao.b) };
  }, [regsCategoria, periodosComparacao, ativosContagem]);

  const valorComp = (m: typeof comparacao.a) =>
    metricaComp === "total" ? m.pontos : metricaComp === "ocorr" ? m.ocorrencias : metricaComp === "membro" ? m.porMembro : m.porSemana;

  /* ---------------- Card 4: distribuição por núcleo ou projeto ---------------- */
  const agrupamento = categoria === "desempenho" ? agrupar : "nucleo";
  const distribuicao = useMemo(() => {
    if (agrupamento === "nucleo") {
      // Quem está em dois núcleos conta nos dois; "Sem núcleo" é quem não
      // está em nenhum.
      const grupos = [...nucleos.map((n) => ({ id: n.id, nome: n.nome })), { id: null, nome: "Sem núcleo" }];
      return grupos
        .map((g) => {
          const membros = ativosDoNucleo.filter((m) =>
            g.id === null ? m.nucleo_ids.length === 0 : m.nucleo_ids.includes(g.id),
          );
          const ids = new Set(membros.map((m) => m.usuario_id));
          const regs = regsPeriodo.filter((r) => ids.has(r.usuario_id));
          const total = somaPontos(regs);
          const emAlerta = membros.filter((m) => m[categoria].faixa !== "ok").length;
          return {
            nome: g.nome,
            membros: membros.length,
            total,
            media: membros.length ? total / membros.length : 0,
            ocorrencias: regs.length,
            pctAlerta: membros.length ? (emAlerta / membros.length) * 100 : null,
          };
        })
        .filter((g) => g.membros > 0 || g.ocorrencias > 0);
    }
    const porProjeto = new Map<string, GpRegistro[]>();
    for (const r of regsPeriodo) {
      if (!r.projeto_nome) continue;
      porProjeto.set(r.projeto_nome, [...(porProjeto.get(r.projeto_nome) ?? []), r]);
    }
    return [...porProjeto.entries()].map(([nome, regs]) => {
      const membros = new Set(regs.map((r) => r.usuario_id)).size;
      const total = somaPontos(regs);
      return { nome, membros, total, media: membros ? total / membros : 0, ocorrencias: regs.length, pctAlerta: null };
    });
  }, [agrupamento, nucleos, ativosDoNucleo, regsPeriodo, categoria]);

  const metricaDistEfetiva: MetricaDistribuicao = agrupamento === "projeto" && metricaDist === "prox" ? "total" : metricaDist;
  const valorDist = (d: (typeof distribuicao)[number]) =>
    metricaDistEfetiva === "total"
      ? d.total
      : metricaDistEfetiva === "media"
        ? Number(d.media.toFixed(2))
        : metricaDistEfetiva === "ocorr"
          ? d.ocorrencias
          : Number((d.pctAlerta ?? 0).toFixed(1));

  function exportarDistribuicao() {
    if (agrupamento === "nucleo") {
      baixarCsv(
        "analise-por-nucleo",
        gerarCsv(
          ["nucleo", "membros", "pontuacao_total", "media", "ocorrencias", "pct_em_alerta"],
          distribuicao.map((d) => [d.nome, d.membros, d.total, d.media.toFixed(2), d.ocorrencias, (d.pctAlerta ?? 0).toFixed(1)]),
        ),
      );
    } else {
      baixarCsv(
        "analise-por-projeto",
        gerarCsv(
          ["projeto", "membros_envolvidos", "pontuacao_total", "media", "ocorrencias"],
          distribuicao.map((d) => [d.nome, d.membros, d.total, d.media.toFixed(2), d.ocorrencias]),
        ),
      );
    }
  }

  if (erro) return <ErrorText>{erro}</ErrorText>;
  if (!registros) return <EmptyText>Carregando análises...</EmptyText>;

  const rotuloMetricaTempo = metricaTempo === "total" ? "Pontos" : metricaTempo === "ocorr" ? "Ocorrências" : "Pontos por membro ativo";

  return (
    <>
      <PageCard>
        <PageCardContent>
          <Filtros style={{ marginBottom: 0 }}>
            <FieldSelect aria-label="Período" value={periodo} onChange={(e) => setPeriodo(e.target.value as ChavePeriodo)}>
              <option value="semestre">Gestão atual</option>
              <option value="semana">Última semana</option>
              <option value="mes">Último mês</option>
              <option value="trimestre">Último trimestre</option>
              <option value="custom">Intervalo personalizado</option>
            </FieldSelect>
            {periodo === "custom" && (
              <>
                <FieldInput type="date" aria-label="Início" value={customDe} onChange={(e) => setCustomDe(e.target.value)} />
                <FieldInput type="date" aria-label="Fim" value={customAte} onChange={(e) => setCustomAte(e.target.value)} />
              </>
            )}
            <FieldSelect aria-label="Núcleo" value={nucleoId} onChange={(e) => setNucleoId(e.target.value)}>
              <option value="">Todos os núcleos</option>
              {nucleos.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.nome}
                </option>
              ))}
            </FieldSelect>
            <FieldSelect aria-label="Grupo" value={grupo} onChange={(e) => setGrupo(e.target.value as Grupo)}>
              <option value="todos">Todos os membros ativos</option>
              <option value="compontos">Somente membros com pontos</option>
              <option value="alerta">Somente em alerta ou no limite</option>
            </FieldSelect>
          </Filtros>
        </PageCardContent>
      </PageCard>

      {/* Card 1 */}
      <PageCard>
        <PageCardHeader>
          <PageCardTitle>Distribuição de pontos</PageCardTitle>
        </PageCardHeader>
        <PageCardContent>
          <Descricao>
            Histograma com a pontuação observada de cada membro no período ({per.rotulo}). A curva normal
            teórica, ajustada à média e ao desvio-padrão reais, aparece sobreposta quando há pelo menos 10
            membros e variação nos dados.
          </Descricao>
          <KpiGrid style={{ marginBottom: theme.spacing.md }}>
            {[
              ["Membros na amostra", String(stats.n)],
              ["Média", numeroPt(stats.media, 2)],
              ["Mediana", numeroPt(stats.mediana, 1)],
              ["Desvio-padrão", numeroPt(stats.desvio, 2)],
              ["Acima da média", `${Math.round(stats.acimaDaMedia)}%`],
              ["Próximos ao limite", `${Math.round(pctProximos)}%`],
              ["No limite", `${Math.round(pctLimite)}%`],
            ].map(([rotulo, valor]) => (
              <KpiCard key={rotulo}>
                <KpiTexto>
                  <KpiValor>{valor}</KpiValor>
                  <KpiRotulo>{rotulo}</KpiRotulo>
                </KpiTexto>
              </KpiCard>
            ))}
          </KpiGrid>
          {!curvaOk && (
            <Nota style={{ marginBottom: theme.spacing.md }}>
              <AlertTriangle size={14} />
              Amostra insuficiente para ajustar a curva normal ({stats.n} membro(s)
              {stats.n >= 10 ? ", sem variação" : ""}). O histograma mostra só os dados observados.
            </Nota>
          )}
          <CaixaGrafico>
            <ResponsiveContainer>
              <ComposedChart data={histograma.pontos} margin={{ top: 24, right: 16, bottom: 4, left: 0 }}>
                <CartesianGrid stroke={theme.colors.border} vertical={false} />
                <XAxis
                  dataKey="x"
                  type="number"
                  domain={[histograma.minP - 0.5, histograma.maxP + 0.5]}
                  allowDecimals={false}
                  tickCount={histograma.maxP - histograma.minP + 1}
                  {...eixo}
                  label={{ value: "Pontos no período", position: "insideBottom", offset: -2, fontSize: 12 }}
                />
                <YAxis allowDecimals={false} width={32} {...eixo} axisLine={false} />
                <Tooltip
                  cursor={{ fill: theme.colors.muted }}
                  labelFormatter={(x) => `${x} ponto(s)`}
                  formatter={(valor, nome) =>
                    nome === "Membros (observado)"
                      ? [`${valor} membro(s) · ${stats.n ? Math.round((Number(valor) / stats.n) * 100) : 0}%`, nome]
                      : [`${valor} membros`, nome]
                  }
                />
                <ReferenceLine
                  x={limite}
                  stroke={theme.colors.destructive}
                  strokeDasharray="4 4"
                  label={{ value: `Limite ${limite}`, fill: theme.colors.destructive, fontSize: 12, position: "insideTopRight" }}
                />
                <Bar dataKey="membros" name="Membros (observado)" fill={theme.colors.primary} isAnimationActive={false} />
                {curvaOk && (
                  <Line
                    dataKey="normal"
                    name="Curva normal teórica"
                    type="monotone"
                    stroke={theme.colors.info}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </CaixaGrafico>
        </PageCardContent>
      </PageCard>

      {/* Card 2 */}
      <PageCard>
        <PageCardHeader>
          <PageCardTitle>Pontos ao longo do tempo</PageCardTitle>
          <CabecalhoControles>
            <SegmentedGroup role="group" aria-label="Granularidade">
              <SegmentedButton type="button" $ativo={gran === "semana"} aria-pressed={gran === "semana"} onClick={() => setGran("semana")}>
                Semanas
              </SegmentedButton>
              <SegmentedButton type="button" $ativo={gran === "mes"} aria-pressed={gran === "mes"} onClick={() => setGran("mes")}>
                Meses
              </SegmentedButton>
            </SegmentedGroup>
            <FieldSelect
              aria-label="Métrica"
              value={metricaTempo}
              style={{ width: "auto", minWidth: "12rem" }}
              onChange={(e) => setMetricaTempo(e.target.value as MetricaTempo)}
            >
              <option value="total">Total de pontos</option>
              <option value="ocorr">Número de ocorrências</option>
              <option value="membro">Pontos por membro ativo</option>
            </FieldSelect>
            {anterior && (
              <SegmentedGroup role="group" aria-label="Comparação">
                <SegmentedButton type="button" $ativo={!comparar} aria-pressed={!comparar} onClick={() => setComparar(false)}>
                  Só esta gestão
                </SegmentedButton>
                <SegmentedButton type="button" $ativo={comparar} aria-pressed={comparar} onClick={() => setComparar(true)}>
                  Comparar com {anterior.gestao.nome}
                </SegmentedButton>
              </SegmentedGroup>
            )}
          </CabecalhoControles>
        </PageCardHeader>
        <PageCardContent>
          <Descricao>
            Mesmo período e núcleo do filtro acima.{" "}
            {comparando && anterior
              ? `A linha tracejada é a gestão ${anterior.gestao.nome} no mesmo trecho da gestão (semana 1 com semana 1). `
              : ""}
            "Pontos por membro ativo" corrige a variação no número de membros.
          </Descricao>
          {insights.length > 0 && (
            <Insights>
              {insights.map((i) => (
                <Insight key={i.rotulo}>
                  <span>{i.rotulo}</span>
                  <strong>{i.valor}</strong>
                </Insight>
              ))}
            </Insights>
          )}
          {serie.length === 0 ? (
            <EmptyText>Nenhum dado no período.</EmptyText>
          ) : (
            <CaixaGrafico>
              <ResponsiveContainer>
                <LineChart data={serie} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke={theme.colors.border} vertical={false} />
                  <XAxis dataKey="rotulo" {...eixo} />
                  <YAxis width={36} {...eixo} axisLine={false} allowDecimals={metricaTempo === "membro"} />
                  <Tooltip
                    cursor={{ stroke: theme.colors.border }}
                    labelFormatter={(_, carga) => carga?.[0]?.payload?.titulo ?? ""}
                    formatter={(valor, nome, item) => {
                      const extra =
                        nome !== `Gestão ${semestre.nome}` && item?.payload?.tituloAnterior
                          ? ` (${item.payload.tituloAnterior})`
                          : "";
                      return [`${valor}${extra}`, String(nome)];
                    }}
                  />
                  {comparando && <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />}
                  <Line
                    dataKey="atual"
                    name={`Gestão ${semestre.nome}`}
                    type="monotone"
                    stroke={theme.colors.primary}
                    strokeWidth={2}
                    dot={{ r: 3, fill: theme.colors.primary }}
                    isAnimationActive={false}
                  />
                  {comparando && anterior && (
                    <Line
                      dataKey="anterior"
                      name={`Gestão ${anterior.gestao.nome}`}
                      type="monotone"
                      stroke={theme.colors.mutedForeground}
                      strokeDasharray="5 4"
                      strokeWidth={2}
                      dot={false}
                      connectNulls={false}
                      isAnimationActive={false}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </CaixaGrafico>
          )}
          <Descricao style={{ marginTop: theme.spacing.sm, marginBottom: 0 }}>
            Eixo vertical: {rotuloMetricaTempo}. Membros ativos considerados: {ativosContagem}.
          </Descricao>
        </PageCardContent>
      </PageCard>

      <GradeDois>
        {/* Card 3 */}
        <PageCard>
          <PageCardHeader>
            <PageCardTitle>Comparação entre períodos</PageCardTitle>
          </PageCardHeader>
          <PageCardContent>
            <Descricao>
              {periodosComparacao.a.rotulo} versus {periodosComparacao.b.rotulo}
              {nucleoId ? `, ${nucleos.find((n) => String(n.id) === nucleoId)?.nome ?? ""}` : ""}. Variação positiva
              indica mais pontos no segundo período.
            </Descricao>
            <Filtros>
              <FieldSelect aria-label="Períodos" value={preset} onChange={(e) => setPreset(e.target.value as PresetComparacao)}>
                <option value="meses">Mês anterior x mês atual</option>
                <option value="metades">1ª metade x 2ª metade</option>
                <option value="custom">Intervalos personalizados</option>
              </FieldSelect>
              <FieldSelect aria-label="Métrica" value={metricaComp} onChange={(e) => setMetricaComp(e.target.value as MetricaComparacao)}>
                <option value="total">Total de pontos</option>
                <option value="ocorr">Ocorrências</option>
                <option value="membro">Pontos por membro ativo</option>
                <option value="semana">Pontos por semana</option>
              </FieldSelect>
            </Filtros>
            {preset === "custom" && (
              <Filtros>
                <FieldInput type="date" aria-label="Início de A" value={compA.de} onChange={(e) => setCompA({ ...compA, de: e.target.value })} />
                <FieldInput type="date" aria-label="Fim de A" value={compA.ate} onChange={(e) => setCompA({ ...compA, ate: e.target.value })} />
                <FieldInput type="date" aria-label="Início de B" value={compB.de} onChange={(e) => setCompB({ ...compB, de: e.target.value })} />
                <FieldInput type="date" aria-label="Fim de B" value={compB.ate} onChange={(e) => setCompB({ ...compB, ate: e.target.value })} />
              </Filtros>
            )}
            <CaixaGrafico $altura="14rem">
              <ResponsiveContainer>
                <BarChart
                  data={[
                    {
                      nome: ROTULO_CATEGORIA[categoria],
                      a: Number(valorComp(comparacao.a).toFixed(2)),
                      b: Number(valorComp(comparacao.b).toFixed(2)),
                    },
                  ]}
                  margin={{ top: 8, right: 16, bottom: 0, left: 0 }}
                >
                  <CartesianGrid stroke={theme.colors.border} vertical={false} />
                  <XAxis dataKey="nome" {...eixo} />
                  <YAxis width={36} {...eixo} axisLine={false} />
                  <Tooltip cursor={{ fill: theme.colors.muted }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="a" name={`A · ${periodosComparacao.a.rotulo}`} fill={theme.colors.mutedForeground} isAnimationActive={false} />
                  <Bar dataKey="b" name={`B · ${periodosComparacao.b.rotulo}`} fill={theme.colors.primary} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </CaixaGrafico>
            <TableScrollWrap>
              <DataTable>
                <TableHead>
                  <TableRow>
                    <TableHeadCell>Métrica</TableHeadCell>
                    <TableHeadCell>A</TableHeadCell>
                    <TableHeadCell>B</TableHeadCell>
                    <TableHeadCell>Variação</TableHeadCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(
                    [
                      ["Pontos", comparacao.a.pontos, comparacao.b.pontos, 0],
                      ["Ocorrências", comparacao.a.ocorrencias, comparacao.b.ocorrencias, 0],
                      ["Pts/membro", comparacao.a.porMembro, comparacao.b.porMembro, 2],
                      ["Pts/semana", comparacao.a.porSemana, comparacao.b.porSemana, 2],
                    ] as [string, number, number, number][]
                  ).map(([rotulo, a, b, casas]) => (
                    <TableRow key={rotulo}>
                      <TableCell>{rotulo}</TableCell>
                      <TableCell>{numeroPt(a, casas)}</TableCell>
                      <TableCell>{numeroPt(b, casas)}</TableCell>
                      <TableCell>
                        <Variacao $sinal={variacao(a, b) ?? 0}>{formatarVariacao(a, b)}</Variacao>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </DataTable>
            </TableScrollWrap>
          </PageCardContent>
        </PageCard>

        {/* Card 4 */}
        <PageCard>
          <PageCardHeader>
            <PageCardTitle>Distribuição por {agrupamento === "nucleo" ? "núcleo" : "projeto"}</PageCardTitle>
            <CabecalhoControles>
              {categoria === "desempenho" && (
                <FieldSelect
                  aria-label="Agrupar por"
                  value={agrupar}
                  style={{ width: "auto", minWidth: "9rem" }}
                  onChange={(e) => setAgrupar(e.target.value as "nucleo" | "projeto")}
                >
                  <option value="nucleo">Por núcleo</option>
                  <option value="projeto">Por projeto</option>
                </FieldSelect>
              )}
              <SegmentedGroup role="group" aria-label="Modo">
                <SegmentedButton
                  type="button"
                  $ativo={modoDistribuicao === "grafico"}
                  aria-pressed={modoDistribuicao === "grafico"}
                  onClick={() => setModoDistribuicao("grafico")}
                >
                  Gráfico
                </SegmentedButton>
                <SegmentedButton
                  type="button"
                  $ativo={modoDistribuicao === "tabela"}
                  aria-pressed={modoDistribuicao === "tabela"}
                  onClick={() => setModoDistribuicao("tabela")}
                >
                  Tabela
                </SegmentedButton>
              </SegmentedGroup>
            </CabecalhoControles>
          </PageCardHeader>
          <PageCardContent>
            <Descricao>Período: {per.rotulo}. A situação de alerta considera o acumulado da gestão.</Descricao>
            {modoDistribuicao === "grafico" ? (
              <>
                <Filtros>
                  <FieldSelect aria-label="Métrica" value={metricaDistEfetiva} onChange={(e) => setMetricaDist(e.target.value as MetricaDistribuicao)}>
                    <option value="total">Pontuação total</option>
                    <option value="media">Média por membro</option>
                    <option value="ocorr">Número de ocorrências</option>
                    {agrupamento === "nucleo" && <option value="prox">% próximos ou no limite</option>}
                  </FieldSelect>
                </Filtros>
                {distribuicao.length === 0 ? (
                  <EmptyText>Nenhum dado no período.</EmptyText>
                ) : (
                  <CaixaGrafico $altura={`${Math.max(10, distribuicao.length * 2 + 3)}rem`}>
                    <ResponsiveContainer>
                      <BarChart
                        data={distribuicao.map((d) => ({ ...d, valor: valorDist(d) }))}
                        layout="vertical"
                        margin={{ top: 4, right: 16, bottom: 0, left: 4 }}
                      >
                        <CartesianGrid stroke={theme.colors.border} horizontal={false} />
                        <XAxis type="number" {...eixo} axisLine={false} allowDecimals={metricaDistEfetiva !== "total" && metricaDistEfetiva !== "ocorr"} />
                        <YAxis type="category" dataKey="nome" width={120} {...eixo} axisLine={false} />
                        <Tooltip
                          cursor={{ fill: theme.colors.muted }}
                          formatter={(valor, _nome, item) => {
                            const d = item?.payload as (typeof distribuicao)[number] | undefined;
                            if (!d) return [String(valor), ""];
                            const linhas = [
                              `${agrupamento === "nucleo" ? "Membros" : "Membros envolvidos"}: ${d.membros}`,
                              `Total: ${d.total} pts`,
                              `Média: ${numeroPt(d.media, 2)}`,
                              `Ocorrências: ${d.ocorrencias}`,
                            ];
                            if (d.pctAlerta !== null) linhas.push(`Em alerta: ${numeroPt(d.pctAlerta, 1)}%`);
                            return [linhas.join(" · "), ""];
                          }}
                        />
                        <Bar dataKey="valor" fill={theme.colors.primary} maxBarSize={42} radius={[0, 4, 4, 0]} isAnimationActive={false} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CaixaGrafico>
                )}
              </>
            ) : (
              <>
                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: theme.spacing.sm }}>
                  <PageButtonSm type="button" $variant="outline" onClick={exportarDistribuicao}>
                    <Download size={14} />
                    Exportar CSV
                  </PageButtonSm>
                </div>
                <TableScrollWrap>
                  <DataTable>
                    <TableHead>
                      <TableRow>
                        <TableHeadCell>{agrupamento === "nucleo" ? "Núcleo" : "Projeto"}</TableHeadCell>
                        <TableHeadCell>{agrupamento === "nucleo" ? "Membros" : "Membros envolvidos"}</TableHeadCell>
                        <TableHeadCell>Pontuação total</TableHeadCell>
                        <TableHeadCell>Média por membro</TableHeadCell>
                        <TableHeadCell>Ocorrências</TableHeadCell>
                        {agrupamento === "nucleo" && <TableHeadCell>% em alerta</TableHeadCell>}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {distribuicao.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6}>
                            <EmptyText>Nenhum dado no período.</EmptyText>
                          </TableCell>
                        </TableRow>
                      )}
                      {distribuicao.map((d) => (
                        <TableRow key={d.nome}>
                          <TableCell>{d.nome}</TableCell>
                          <TableCell>{d.membros}</TableCell>
                          <TableCell>{d.total}</TableCell>
                          <TableCell>{numeroPt(d.media, 2)}</TableCell>
                          <TableCell>{d.ocorrencias}</TableCell>
                          {agrupamento === "nucleo" && <TableCell>{numeroPt(d.pctAlerta ?? 0, 1)}%</TableCell>}
                        </TableRow>
                      ))}
                    </TableBody>
                  </DataTable>
                </TableScrollWrap>
              </>
            )}
          </PageCardContent>
        </PageCard>
      </GradeDois>
    </>
  );
}
