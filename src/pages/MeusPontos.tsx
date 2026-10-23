import { useCallback, useEffect, useMemo, useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { DIRETORIA } from "@/utils/permissoes";
import { formatarDataHora } from "@/lib/projetos";
import { getMeusPontos, type GpCategoria, type GpMeusPontos, type GpSituacao } from "@/lib/gestao-pessoas";
import {
  COR_CATEGORIA,
  COR_FAIXA,
  ROTULO_CAMPO_AJUSTE,
  ROTULO_CATEGORIA,
  ROTULO_FAIXA,
  TOM_FAIXA,
  corDosPontos,
  pontosComSinal,
} from "@/lib/gp-rotulos";
import { theme } from "@/styles/theme";
import {
  EmptyText,
  ErrorBlock,
  ErrorText,
  PageBadge,
  PageButton,
  PageCard,
  PageCardContent,
  PageCardHeader,
  PageCardTitle,
  PageHeader,
  PageHeaderText,
  PageLoadingBlock,
  PageStack,
  PageSubtitle,
  PageTitle,
} from "@/styles/page.styled";
import { DataTable, FieldInput, FieldSelect, TableBody, TableCell, TableHead, TableHeadCell, TableRow } from "@/pages/Bancas.styled";
import { TableScrollWrap } from "@/styles/shared.styled";
import {
  Ajustes,
  BarraFill,
  BarraTrilha,
  CaixaGrafico,
  Descricao,
  Filtros,
  Medidor,
  Pontos,
  ScoreCard,
  ScoreGrid,
  ScoreRodape,
  ScoreTopo,
  ScoreValor,
  TabelaEsmaecida,
} from "./gestao-pessoas/GestaoPessoas.styled";
import { formatarDia } from "./gestao-pessoas/calculos";

function ScoreCardMeu({ categoria, situacao }: { categoria: GpCategoria; situacao: GpSituacao }) {
  return (
    <ScoreCard>
      <ScoreTopo>
        Pontos por {ROTULO_CATEGORIA[categoria]}
        <PageBadge $tone={TOM_FAIXA[situacao.faixa]}>{ROTULO_FAIXA[situacao.faixa]}</PageBadge>
      </ScoreTopo>
      <ScoreValor $grande>
        {situacao.pontos}
        <small>/{situacao.limite}</small>
      </ScoreValor>
      <Medidor>
        <BarraTrilha role="progressbar" aria-valuemin={0} aria-valuemax={situacao.limite} aria-valuenow={situacao.pontos}>
          <BarraFill $percent={situacao.percentual} $cor={COR_FAIXA[situacao.faixa]} />
        </BarraTrilha>
      </Medidor>
      <ScoreRodape>
        <span>
          {situacao.pontos >= situacao.limite
            ? "Limite atingido"
            : `Restam ${situacao.restantes} ponto${situacao.restantes === 1 ? "" : "s"} para o limite`}
        </span>
        <span>{Math.round(situacao.percentual)}% do limite</span>
      </ScoreRodape>
    </ScoreCard>
  );
}

/**
 * "Meus Pontos" (spec 6): a pessoa vê a própria situação, a evolução na
 * gestão e os registros, sem ver quem lançou ou corrigiu (o backend já não
 * manda esses campos em `/me`).
 */
export function MeusPontos() {
  const { token, usuario } = useAuth();
  // Diretoria não pontua e não tem o item no menu; a URL digitada (ou
  // lembrada de outra conta, 2026-10-22) cai na home em vez de num erro.
  const ehDiretoria = !!usuario && DIRETORIA.includes(usuario.posicao);
  const [dados, setDados] = useState<GpMeusPontos | null>(null);
  const [erro, setErro] = useState("");
  const [categoria, setCategoria] = useState<GpCategoria | "">("");
  const [tipoId, setTipoId] = useState("");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");

  // Sem setState síncrono no efeito: o estado só muda quando a resposta chega.
  const carregar = useCallback(() => {
    if (!token || ehDiretoria) return;
    getMeusPontos(token)
      .then((d) => {
        setDados(d);
        setErro("");
      })
      .catch((err) => setErro(err instanceof Error ? err.message : "Erro ao carregar os seus pontos"));
  }, [token, ehDiretoria]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const tiposUsados = useMemo(() => {
    const mapa = new Map<number, string>();
    for (const r of dados?.registros ?? []) mapa.set(r.tipo_id, r.tipo_nome);
    return [...mapa.entries()].sort((a, b) => a[1].localeCompare(b[1], "pt-BR"));
  }, [dados]);

  const registros = useMemo(
    () =>
      (dados?.registros ?? [])
        .filter((r) => !categoria || r.categoria === categoria)
        .filter((r) => !tipoId || String(r.tipo_id) === tipoId)
        .filter((r) => !de || r.data >= de)
        .filter((r) => !ate || r.data <= ate)
        .sort((a, b) => b.data.localeCompare(a.data) || b.lancado_em.localeCompare(a.lancado_em)),
    [dados, categoria, tipoId, de, ate],
  );

  if (erro && !dados) {
    return (
      <ErrorBlock>
        <ErrorText>{erro}</ErrorText>
        <PageButton $variant="outline" onClick={carregar}>
          Tentar novamente
        </PageButton>
      </ErrorBlock>
    );
  }
  if (!dados) return <PageLoadingBlock />;

  const primeiroNome = usuario?.nome.trim().split(/\s+/)[0] ?? "";
  const tetoGrafico = Math.max(dados.limites.obrigacoes, dados.limites.desempenho) + 1;
  const evolucao = dados.evolucao.map((s) => ({ ...s, rotulo: formatarDia(s.semana).slice(0, 5) }));

  if (ehDiretoria) return <Navigate to="/projetos" replace />;

  return (
    <PageStack>
      <PageHeader>
        <PageHeaderText>
          <PageTitle>Olá, {primeiroNome}</PageTitle>
          <PageSubtitle>
            Sua pontuação na gestão {dados.semestre.nome}. As categorias têm limites independentes. Em caso de
            dúvida sobre um lançamento, fale com a Diretoria de Gestão de Pessoas.
          </PageSubtitle>
        </PageHeaderText>
      </PageHeader>

      <ScoreGrid>
        <ScoreCardMeu categoria="obrigacoes" situacao={dados.obrigacoes} />
        <ScoreCardMeu categoria="desempenho" situacao={dados.desempenho} />
      </ScoreGrid>

      <PageCard>
        <PageCardHeader>
          <PageCardTitle>Evolução na gestão</PageCardTitle>
        </PageCardHeader>
        <PageCardContent>
          <Descricao>Pontuação acumulada por semana. As linhas tracejadas mostram os limites.</Descricao>
          {evolucao.length === 0 ? (
            <EmptyText>A gestão ainda não começou.</EmptyText>
          ) : (
            <CaixaGrafico $altura="15rem">
              <ResponsiveContainer>
                <LineChart data={evolucao} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke={theme.colors.border} vertical={false} />
                  <XAxis dataKey="rotulo" stroke={theme.colors.mutedForeground} fontSize={12} tickLine={false} interval="preserveStartEnd" />
                  <YAxis
                    domain={[0, tetoGrafico]}
                    allowDecimals={false}
                    width={28}
                    stroke={theme.colors.mutedForeground}
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    cursor={{ stroke: theme.colors.border }}
                    labelFormatter={(_, carga) => `Semana de ${carga?.[0]?.payload?.rotulo ?? ""}`}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  <ReferenceLine
                    y={dados.limites.obrigacoes}
                    stroke={COR_CATEGORIA.obrigacoes}
                    strokeDasharray="5 4"
                    label={{ value: "Limite obrigações", fontSize: 11, fill: COR_CATEGORIA.obrigacoes, position: "insideTopRight" }}
                  />
                  <ReferenceLine
                    y={dados.limites.desempenho}
                    stroke={COR_CATEGORIA.desempenho}
                    strokeDasharray="5 4"
                    label={{ value: "Limite desempenho", fontSize: 11, fill: COR_CATEGORIA.desempenho, position: "insideBottomRight" }}
                  />
                  <Line type="stepAfter" dataKey="obrigacoes" name="Obrigações" stroke={COR_CATEGORIA.obrigacoes} strokeWidth={2} dot={false} isAnimationActive={false} />
                  <Line type="stepAfter" dataKey="desempenho" name="Desempenho" stroke={COR_CATEGORIA.desempenho} strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </CaixaGrafico>
          )}
        </PageCardContent>
      </PageCard>

      <PageCard>
        <PageCardHeader>
          <PageCardTitle>Meus registros</PageCardTitle>
        </PageCardHeader>
        <PageCardContent>
          <Filtros>
            <FieldSelect aria-label="Categoria" value={categoria} onChange={(e) => setCategoria(e.target.value as GpCategoria | "")}>
              <option value="">Todas as categorias</option>
              <option value="obrigacoes">{ROTULO_CATEGORIA.obrigacoes}</option>
              <option value="desempenho">{ROTULO_CATEGORIA.desempenho}</option>
            </FieldSelect>
            <FieldSelect aria-label="Tipo" value={tipoId} onChange={(e) => setTipoId(e.target.value)}>
              <option value="">Todos os tipos</option>
              {tiposUsados.map(([id, nome]) => (
                <option key={id} value={id}>
                  {nome}
                </option>
              ))}
            </FieldSelect>
            <FieldInput type="date" aria-label="De" value={de} onChange={(e) => setDe(e.target.value)} />
            <FieldInput type="date" aria-label="Até" value={ate} onChange={(e) => setAte(e.target.value)} />
          </Filtros>
          {registros.length === 0 ? (
            <EmptyText>Nenhum registro com esses filtros.</EmptyText>
          ) : (
            <TableScrollWrap>
              <DataTable>
                <TableHead>
                  <TableRow>
                    <TableHeadCell>Data</TableHeadCell>
                    <TableHeadCell>Categoria</TableHeadCell>
                    <TableHeadCell>Motivo</TableHeadCell>
                    <TableHeadCell style={{ textAlign: "right" }}>Pontos</TableHeadCell>
                    <TableHeadCell>Observação</TableHeadCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {registros.map((r) => {
                    const retirado = r.status === "anulado";
                    return (
                      <TabelaEsmaecida key={r.id} $esmaecido={retirado}>
                        <TableCell>{formatarDia(r.data)}</TableCell>
                        <TableCell>
                          <PageBadge $tone="muted">{ROTULO_CATEGORIA[r.categoria]}</PageBadge>
                        </TableCell>
                        <TableCell style={{ textDecoration: retirado ? "line-through" : undefined }}>{r.tipo_nome}</TableCell>
                        <TableCell style={{ textAlign: "right" }}>
                          <Pontos $cor={corDosPontos(r.pontos)} $riscado={retirado}>
                            {pontosComSinal(r.pontos)}
                          </Pontos>
                        </TableCell>
                        <TableCell>
                          {r.projeto_nome ? `Projeto ${r.projeto_nome} · ` : ""}
                          {r.observacao}
                          {r.ajustes.length > 0 && (
                            <Ajustes>
                              {r.ajustes.map((a) => (
                                <li key={a.id}>
                                  <strong>{ROTULO_CAMPO_AJUSTE[a.campo] ?? a.campo}:</strong> {a.antes || "(vazio)"} {"->"}{" "}
                                  {a.depois || "(vazio)"} · {formatarDataHora(a.em)}
                                  <br />
                                  {a.justificativa}
                                </li>
                              ))}
                            </Ajustes>
                          )}
                        </TableCell>
                      </TabelaEsmaecida>
                    );
                  })}
                </TableBody>
              </DataTable>
            </TableScrollWrap>
          )}
        </PageCardContent>
      </PageCard>
    </PageStack>
  );
}
