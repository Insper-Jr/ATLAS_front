import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getGraficosEleicao } from "@/lib/sabatina";
import { paraDataUtc } from "@/lib/projetos";
import type { GraficosEleicao } from "@/types/sabatina";
import { theme } from "@/styles/theme";
import { ErrorText, PageButton } from "@/styles/page.styled";
import {
  BlocoGrafico,
  CaixaGrafico,
  GradeGraficos,
  Meta,
  PontoAoVivo,
  Secao,
  SecaoTitulo,
  TituloGrafico,
} from "./Sabatina.styled";
import { FUSO } from "@/lib/fuso";

/** Uma cor por candidato, na ordem da apuração. Branco é sempre cinza. */
const PALETA = ["#B91C1C", "#1D4ED8", "#047857", "#B45309", "#6D28D9", "#0E7490", "#BE185D", "#4D7C0F"];
const COR_BRANCO = "#9CA3AF";
const BRANCO = "branco";

/** Com que frequência a corrida ao vivo pergunta de novo ao backend. */
const INTERVALO_AO_VIVO_MS = 5_000;

type Serie = { chave: string; nome: string; cor: string };

function series(g: GraficosEleicao): Serie[] {
  return [
    ...g.parcial.candidatos.map((c, i) => ({
      chave: `c${c.candidato_id}`,
      nome: c.nome,
      cor: PALETA[i % PALETA.length],
    })),
    { chave: BRANCO, nome: "Em branco", cor: COR_BRANCO },
  ];
}

/** Datas da API vêm em UTC sem sufixo, como no resto do app. */
function hora(iso: string) {
  return paraDataUtc(iso).toLocaleTimeString("pt-BR", { timeZone: FUSO, hour: "2-digit", minute: "2-digit" });
}

/**
 * A corrida: pontos acumulados de cada candidato a cada voto que entrou.
 * Começa num zero comum (a abertura) pra todas as linhas saírem do mesmo
 * ponto. O eixo X é a ordem dos votos, com a hora no rótulo.
 */
function dadosCorrida(g: GraficosEleicao, lista: Serie[]) {
  const acumulado: Record<string, number> = Object.fromEntries(lista.map((s) => [s.chave, 0]));
  // O eixo é o NÚMERO do voto (1º, 2º, 3º...), não a hora: votos entram em
  // rajada no mesmo minuto e, por hora, o gráfico virava um degrau só no
  // canto. A hora de cada voto fica no balão.
  const pontos = [{ rotulo: "0", hora: g.aberta_em ? `abertura ${hora(g.aberta_em)}` : "abertura", ...acumulado }];
  g.linha_do_tempo.forEach((v, i) => {
    const chave = v.candidato_id === null ? BRANCO : `c${v.candidato_id}`;
    if (chave in acumulado) acumulado[chave] += v.peso;
    pontos.push({ rotulo: String(i + 1), hora: `${i + 1}º voto, ${hora(v.em)}`, ...acumulado });
  });
  return pontos;
}

function dadosPlacar(g: GraficosEleicao, lista: Serie[]) {
  const porChave = Object.fromEntries(g.parcial.candidatos.map((c) => [`c${c.candidato_id}`, c]));
  return lista.map((s) => {
    const linha = s.chave === BRANCO ? g.parcial.brancos : porChave[s.chave];
    return {
      nome: s.nome,
      cor: s.cor,
      pontos: linha?.ponderado ?? 0,
      votos: linha?.votos ?? 0,
      percentual: linha?.percentual ?? 0,
    };
  });
}

// Sem animação em barra e linha nenhuma: a corrida ao vivo re-renderiza a
// cada 5 s e a animação recomeçava do zero a cada atualização, deixando as
// barras finas na maior parte do tempo.
const eixo = { stroke: theme.colors.mutedForeground, fontSize: 12, tickLine: false } as const;

// ---------------------------------------------------------------- blocos

function Placar({ dados }: { dados: ReturnType<typeof dadosPlacar> }) {
  return (
    <BlocoGrafico>
      <TituloGrafico>Pontos por candidato</TituloGrafico>
      <CaixaGrafico $altura={`${Math.max(8, dados.length * 2.2)}rem`}>
        <ResponsiveContainer>
          <BarChart data={dados} layout="vertical" margin={{ top: 4, right: 24, bottom: 0, left: 4 }}>
            <CartesianGrid stroke={theme.colors.border} horizontal={false} />
            <XAxis type="number" allowDecimals={false} {...eixo} axisLine={false} />
            <YAxis type="category" dataKey="nome" width={150} {...eixo} axisLine={false} />
            <Tooltip
              cursor={{ fill: theme.colors.muted }}
              formatter={(valor, _nome, item) => {
                const p = item?.payload as { votos: number; percentual: number } | undefined;
                return [`${valor} pts · ${p?.votos ?? 0} voto(s) · ${p?.percentual ?? 0}%`, "Total"];
              }}
            />
            <Bar dataKey="pontos" name="pontos" radius={[0, 4, 4, 0]} isAnimationActive={false}>
              {dados.map((d) => (
                <Cell key={d.nome} fill={d.cor} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CaixaGrafico>
    </BlocoGrafico>
  );
}

function Corrida({ g, lista }: { g: GraficosEleicao; lista: Serie[] }) {
  const dados = useMemo(() => dadosCorrida(g, lista), [g, lista]);
  return (
    <BlocoGrafico>
      <TituloGrafico>Corrida: pontos acumulados a cada voto</TituloGrafico>
      <CaixaGrafico>
        <ResponsiveContainer>
          <LineChart data={dados} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid stroke={theme.colors.border} vertical={false} />
            <XAxis dataKey="rotulo" {...eixo} minTickGap={16} label={{ value: "votos", position: "insideBottomRight", offset: -4, fontSize: 11, fill: theme.colors.mutedForeground }} />
            <YAxis allowDecimals={false} width={28} {...eixo} axisLine={false} />
            <Tooltip
              cursor={{ stroke: theme.colors.border }}
              labelFormatter={(_, carga) => (carga?.[0]?.payload as { hora?: string } | undefined)?.hora ?? ""}
              formatter={(valor, nome) => [`${valor} pts`, nome]}
            />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
            {lista.map((s) => (
              <Line
                key={s.chave}
                type="linear"
                dataKey={s.chave}
                name={s.nome}
                stroke={s.cor}
                strokeWidth={2}
                dot={{ r: 2.5 }}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CaixaGrafico>
    </BlocoGrafico>
  );
}

function Fatias({ dados }: { dados: ReturnType<typeof dadosPlacar> }) {
  const comVoto = dados.filter((d) => d.pontos > 0);
  return (
    <BlocoGrafico>
      <TituloGrafico>Divisão dos pontos</TituloGrafico>
      <CaixaGrafico>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={comVoto}
              dataKey="pontos"
              nameKey="nome"
              innerRadius="55%"
              outerRadius="85%"
              paddingAngle={2}
              startAngle={90}
              endAngle={-270}
              isAnimationActive={false}
            >
              {comVoto.map((d) => (
                <Cell key={d.nome} fill={d.cor} />
              ))}
            </Pie>
            <Tooltip formatter={(valor) => [`${valor} pts`, ""]} />
            {/* O percentual vai na legenda, não solto em volta da rosca: com
                um candidato só o rótulo externo caía em cima da legenda. */}
            <Legend
              iconType="circle"
              wrapperStyle={{ fontSize: 12 }}
              formatter={(nome: string) => {
                const d = comVoto.find((x) => x.nome === nome);
                return d ? `${nome} · ${d.percentual}%` : nome;
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </CaixaGrafico>
    </BlocoGrafico>
  );
}

function Participacao({
  g,
  rotuloPosicao,
}: {
  g: GraficosEleicao;
  rotuloPosicao: (p: string | null | undefined) => string;
}) {
  const dados = g.por_posicao.map((f) => ({
    posicao: f.posicao === "sem_posicao" ? "Sem posição" : rotuloPosicao(f.posicao),
    votaram: f.votaram,
    faltam: f.total - f.votaram,
  }));
  return (
    <BlocoGrafico>
      <TituloGrafico>Participação por posição</TituloGrafico>
      {/* Rótulos de posição quebram em até 3 linhas ("Candidato(a) a Diretoria
          de Projetos"), então cada linha precisa de ~3rem; os 4rem extras são
          o eixo X e a legenda, que antes comiam a altura das barras. */}
      <CaixaGrafico $altura={`${Math.max(10, dados.length * 3 + 4)}rem`}>
        <ResponsiveContainer>
          <BarChart data={dados} layout="vertical" margin={{ top: 4, right: 24, bottom: 0, left: 4 }}>
            <CartesianGrid stroke={theme.colors.border} horizontal={false} />
            <XAxis type="number" allowDecimals={false} {...eixo} axisLine={false} />
            <YAxis type="category" dataKey="posicao" width={150} interval={0} {...eixo} axisLine={false} />
            <Tooltip cursor={{ fill: theme.colors.muted }} />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="votaram" name="Votaram" stackId="p" fill={theme.colors.success} isAnimationActive={false} />
            <Bar
              dataKey="faltam"
              name="Faltam"
              stackId="p"
              fill={`color-mix(in srgb, ${theme.colors.mutedForeground} 40%, ${theme.colors.card})`}
              radius={[0, 4, 4, 0]}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </CaixaGrafico>
    </BlocoGrafico>
  );
}

// ---------------------------------------------------------------- telas

/**
 * Enquanto a eleição está aberta: o placar e a corrida, atualizados a cada
 * 5 s. Só a diretoria vê, e vê agregado: o voto é anônimo até pra ela.
 */
export function CorridaAoVivo({ eleicaoId, token }: { eleicaoId: number; token: string | null }) {
  const [g, setG] = useState<GraficosEleicao | null>(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!token) return;
    let vivo = true;
    const buscar = () =>
      getGraficosEleicao(eleicaoId, token)
        .then((dados) => {
          if (vivo) setG(dados);
        })
        .catch((err) => {
          if (vivo) setErro(err instanceof Error ? err.message : "Não foi possível carregar a corrida");
        });
    buscar();
    const timer = setInterval(buscar, INTERVALO_AO_VIVO_MS);
    return () => {
      vivo = false;
      clearInterval(timer);
    };
  }, [eleicaoId, token]);

  const lista = useMemo(() => (g ? series(g) : []), [g]);

  return (
    <Secao>
      <SecaoTitulo>
        <PontoAoVivo />
        Corrida em tempo real
      </SecaoTitulo>
      <Meta>
        Só a diretoria vê esta corrida, e só os totais: o voto é anônimo. Atualiza sozinha a cada 5 segundos.
      </Meta>
      {erro && <ErrorText>{erro}</ErrorText>}
      {g && (
        <GradeGraficos>
          <Placar dados={dadosPlacar(g, lista)} />
          <Corrida g={g} lista={lista} />
        </GradeGraficos>
      )}
    </Secao>
  );
}

/**
 * Depois da apuração: um botão gera os gráficos extras (a divisão dos
 * pontos, o placar, a participação por posição e a corrida completa).
 * Carrega só quando pedido, o resultado em si já está na tela.
 */
export function GraficosResultado({
  eleicaoId,
  token,
  rotuloPosicao,
}: {
  eleicaoId: number;
  token: string | null;
  rotuloPosicao: (p: string | null | undefined) => string;
}) {
  const [g, setG] = useState<GraficosEleicao | null>(null);
  const [mostrar, setMostrar] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  async function gerar() {
    if (!token) return;
    if (mostrar) return setMostrar(false);
    if (!g) {
      setCarregando(true);
      try {
        setG(await getGraficosEleicao(eleicaoId, token));
      } catch (err) {
        setErro(err instanceof Error ? err.message : "Não foi possível gerar os gráficos");
        return;
      } finally {
        setCarregando(false);
      }
    }
    setMostrar(true);
  }

  const lista = useMemo(() => (g ? series(g) : []), [g]);
  const placar = useMemo(() => (g ? dadosPlacar(g, lista) : []), [g, lista]);

  return (
    <Secao>
      <div>
        <PageButton type="button" $variant="outline" onClick={gerar} disabled={carregando}>
          {carregando ? "Gerando…" : mostrar ? "Esconder gráficos" : "Gerar gráficos do resultado"}
        </PageButton>
      </div>
      {erro && <ErrorText>{erro}</ErrorText>}
      {mostrar && g && (
        <GradeGraficos>
          <Fatias dados={placar} />
          <Placar dados={placar} />
          <Participacao g={g} rotuloPosicao={rotuloPosicao} />
          <Corrida g={g} lista={lista} />
        </GradeGraficos>
      )}
    </Secao>
  );
}
