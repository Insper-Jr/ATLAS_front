import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useAuth } from "@/context/AuthContext";
import { ConfirmarModal } from "@/components/ConfirmarModal";
import { MultiSelect } from "@/components/MultiSelect";
import { getUsuarios } from "@/lib/usuarios";
import { formatarDataHora } from "@/lib/projetos";
import { ROTULO_POSICAO } from "@/utils/permissoes";
import {
  abrirEleicao,
  apagarEleicao,
  atualizarPesos,
  criarEleicao,
  editarEleicao,
  fecharEleicao,
  getEleicoes,
  getPesos,
} from "@/lib/sabatina";
import { CorridaAoVivo, GraficosResultado } from "./GraficosEleicao";
import type { UsuarioResumo } from "@/types/auth";
import type { Eleicao, EleicaoPayload, SabatinaPeso } from "@/types/sabatina";
import { FieldGroup, FieldInput, FieldLabel, FormErrorText } from "@/pages/Bancas.styled";
import {
  EmptyText,
  ErrorText,
  PageBadge,
  PageButton,
  PageButtonSm,
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
import {
  Acoes,
  Aviso,
  Barra,
  BarraPreenchida,
  CabecalhoEleicao,
  Chip,
  Chips,
  FormLinha,
  FormNova,
  Intro,
  LinhaCandidato,
  LinkAcao,
  Lista,
  Meta,
  NomeCandidato,
  NumerosCandidato,
  PesoInput,
  Secao,
  SecaoTitulo,
  TabelaSimples,
  TituloEleicao,
  Veredito,
} from "./Sabatina.styled";

const ROTULO_STATUS: Record<Eleicao["status"], { texto: string; tom: "default" | "success" | "muted" | "warning" | "danger" }> = {
  rascunho: { texto: "Rascunho", tom: "muted" },
  aberta: { texto: "Aberta", tom: "warning" },
  fechada: { texto: "Fechada", tom: "default" },
};

const ORDEM_STATUS: Record<Eleicao["status"], number> = { aberta: 0, rascunho: 1, fechada: 2 };

/**
 * Configuração de Sabatina (2026-10-05): quem tem a caixa
 * `pode_acessar_configuracoes_sabatina` (a diretoria, de saída). Peso do
 * voto por posição (vale pra toda eleição que abrir depois), montagem de
 * eleições, abrir/fechar e a apuração. O resultado só aparece depois de
 * fechar; enquanto aberta, a tela mostra quem ainda não votou.
 *
 * Pra não virar um paredão: pesos recolhidos por padrão, e das eleições
 * fechadas só a mais recente abre com o resultado, as outras ficam numa
 * linha até alguém expandir.
 */
export function SabatinaConfig() {
  const { token } = useAuth();
  const [pesos, setPesos] = useState<SabatinaPeso[] | null>(null);
  const [eleicoes, setEleicoes] = useState<Eleicao[] | null>(null);
  const [usuarios, setUsuarios] = useState<UsuarioResumo[]>([]);
  const [erro, setErro] = useState("");
  const [novaAberta, setNovaAberta] = useState(false);

  const carregar = useCallback(async () => {
    if (!token) return;
    try {
      const [p, e, u] = await Promise.all([getPesos(token), getEleicoes(token), getUsuarios(token)]);
      setPesos(p);
      setEleicoes(e);
      setUsuarios(u);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao carregar");
    }
  }, [token]);

  // Carga inicial inline (não via `carregar`): a regra `set-state-in-effect`
  // só aceita setState dentro do callback da promise.
  useEffect(() => {
    if (!token) return;
    Promise.all([getPesos(token), getEleicoes(token), getUsuarios(token)])
      .then(([p, e, u]) => {
        setPesos(p);
        setEleicoes(e);
        setUsuarios(u);
      })
      .catch((err) => setErro(err instanceof Error ? err.message : "Erro ao carregar"));
  }, [token]);

  const rotuloPosicao = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const p of pesos ?? []) mapa.set(p.posicao, p.nome);
    return (posicao: string | null | undefined) =>
      posicao ? (ROTULO_POSICAO[posicao] ?? mapa.get(posicao) ?? posicao) : "";
  }, [pesos]);

  const ativos = useMemo(() => usuarios.filter((u) => u.status === "ativo" && u.ativo), [usuarios]);

  if ((pesos === null || eleicoes === null) && !erro) return <PageLoadingBlock />;

  const ordenadas = [...(eleicoes ?? [])].sort(
    (a, b) => ORDEM_STATUS[a.status] - ORDEM_STATUS[b.status] || b.id - a.id,
  );
  const fechadaMaisRecente = ordenadas.find((e) => e.status === "fechada")?.id;

  return (
    <PageStack>
      <PageHeader>
        <PageHeaderText>
          <PageTitle>Configuração de Sabatina</PageTitle>
          <PageSubtitle>Monte a eleição, abra a votação para a empresa inteira e feche para apurar.</PageSubtitle>
        </PageHeaderText>
        <PageButton type="button" onClick={() => setNovaAberta((v) => !v)}>
          {novaAberta ? "Cancelar" : "Nova eleição"}
        </PageButton>
      </PageHeader>

      {erro && <ErrorText>{erro}</ErrorText>}

      {novaAberta && token && (
        <PageCard>
          <PageCardHeader>
            <PageCardTitle>Nova eleição</PageCardTitle>
          </PageCardHeader>
          <PageCardContent>
            <FormEleicao
              ativos={ativos}
              rotuloPosicao={rotuloPosicao}
              onSalvar={async (dados) => {
                await criarEleicao(dados, token);
                setNovaAberta(false);
                await carregar();
              }}
              onCancelar={() => setNovaAberta(false)}
            />
          </PageCardContent>
        </PageCard>
      )}

      <Lista>
        {ordenadas.length === 0 && (
          <PageCard>
            <PageCardContent>
              <EmptyText>Nenhuma eleição ainda. Comece por "Nova eleição".</EmptyText>
            </PageCardContent>
          </PageCard>
        )}
        {ordenadas.map((e) => (
          <CardEleicao
            key={e.id}
            eleicao={e}
            token={token}
            ativos={ativos}
            rotuloPosicao={rotuloPosicao}
            recolhidaInicial={e.status === "fechada" && e.id !== fechadaMaisRecente}
            onMudou={carregar}
          />
        ))}
      </Lista>

      {pesos && token && <CardPesos pesos={pesos} token={token} onSalvo={setPesos} />}
    </PageStack>
  );
}

// ---------------------------------------------------------------- pesos

function CardPesos({
  pesos,
  token,
  onSalvo,
}: {
  pesos: SabatinaPeso[];
  token: string;
  onSalvo: (p: SabatinaPeso[]) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [valores, setValores] = useState<Record<string, string>>(() =>
    Object.fromEntries(pesos.map((p) => [p.posicao, String(p.peso)])),
  );
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [salvo, setSalvo] = useState(false);

  const mudou = pesos.some((p) => String(p.peso) !== (valores[p.posicao] ?? ""));

  async function salvar() {
    setSalvando(true);
    setErro("");
    try {
      const novos = await atualizarPesos(
        pesos.map((p) => ({ posicao: p.posicao, peso: Number(valores[p.posicao] ?? p.peso) })),
        token,
      );
      onSalvo(novos);
      setValores(Object.fromEntries(novos.map((p) => [p.posicao, String(p.peso)])));
      setSalvo(true);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível salvar os pesos");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <PageCard>
      <PageCardHeader>
        <PageCardTitle>Peso do voto por posição</PageCardTitle>
        <LinkAcao type="button" onClick={() => setAberto((v) => !v)}>
          {aberto ? "esconder" : "mostrar"}
        </LinkAcao>
      </PageCardHeader>
      {aberto && (
        <PageCardContent>
          <Intro>
            Vale para toda eleição aberta daqui em diante. O voto guarda o peso do momento em que foi dado, então
            mudar aqui não reescreve eleição passada. Quem acumula um cargo extra (ex.: consultor e BDR) vota com o
            maior dos dois pesos.
          </Intro>
          <TabelaSimples style={{ marginTop: "0.75rem" }}>
            <thead>
              <tr>
                <th>Posição</th>
                <th className="num">Peso</th>
              </tr>
            </thead>
            <tbody>
              {pesos.map((p) => (
                <tr key={p.posicao}>
                  <td>{ROTULO_POSICAO[p.posicao] ?? p.nome}</td>
                  <td className="num">
                    <PesoInput
                      type="number"
                      min={0}
                      max={10}
                      value={valores[p.posicao] ?? ""}
                      aria-label={`Peso de ${p.nome}`}
                      onChange={(e) => {
                        setValores((v) => ({ ...v, [p.posicao]: e.target.value }));
                        setSalvo(false);
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </TabelaSimples>
          <Acoes>
            <PageButton type="button" disabled={!mudou || salvando} onClick={salvar}>
              {salvando ? "Salvando..." : "Salvar pesos"}
            </PageButton>
            {salvo && !mudou && <Meta>Pesos salvos.</Meta>}
          </Acoes>
          {erro && <ErrorText>{erro}</ErrorText>}
        </PageCardContent>
      )}
    </PageCard>
  );
}

// ---------------------------------------------------------------- formulário (nova / editar)

function FormEleicao({
  inicial,
  ativos,
  rotuloPosicao,
  onSalvar,
  onCancelar,
}: {
  inicial?: Eleicao;
  ativos: UsuarioResumo[];
  rotuloPosicao: (p: string | null | undefined) => string;
  onSalvar: (dados: EleicaoPayload) => Promise<void>;
  onCancelar: () => void;
}) {
  const [nome, setNome] = useState(inicial?.nome ?? "");
  const [percentual, setPercentual] = useState(String(inicial?.percentual_aprovacao ?? 50));
  const [candidatos, setCandidatos] = useState<string[]>(
    inicial?.candidatos.map((c) => String(c.usuario_id)) ?? [],
  );
  // Quem vota: todos os ativos (o padrão) ou uma escolha da diretoria.
  const [todosVotam, setTodosVotam] = useState((inicial?.eleitores_ids ?? []).length === 0);
  const [eleitores, setEleitores] = useState<string[]>(inicial?.eleitores_ids.map(String) ?? []);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  // Candidato antigo que saiu da empresa continua na lista pra edição não
  // apagá-lo por acidente.
  const opcoes = useMemo(() => {
    const base = ativos.map((u) => ({ value: String(u.id), label: `${u.nome} (${rotuloPosicao(u.posicao)})` }));
    const ids = new Set(base.map((o) => o.value));
    for (const c of inicial?.candidatos ?? []) {
      if (!ids.has(String(c.usuario_id))) base.push({ value: String(c.usuario_id), label: c.nome });
    }
    return base.sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
  }, [ativos, inicial, rotuloPosicao]);

  // Quem pode votar: os ativos que não concorrem.
  const opcoesEleitores = useMemo(() => {
    const concorrem = new Set(candidatos);
    return ativos
      .filter((u) => !concorrem.has(String(u.id)))
      .map((u) => ({ value: String(u.id), label: `${u.nome} (${rotuloPosicao(u.posicao)})` }))
      .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
  }, [ativos, candidatos, rotuloPosicao]);
  const eleitoresValidos = useMemo(() => {
    const possiveis = new Set(opcoesEleitores.map((o) => o.value));
    return eleitores.filter((id) => possiveis.has(id));
  }, [eleitores, opcoesEleitores]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const pct = Number(percentual);
    if (!nome.trim()) return setErro("Dê um nome à eleição (ex.: Diretoria de Projetos).");
    if (!Number.isInteger(pct) || pct < 1 || pct > 100) return setErro("O percentual precisa ser um inteiro entre 1 e 100.");
    if (candidatos.length === 0) return setErro("Escolha pelo menos um candidato.");
    if (!todosVotam && eleitoresValidos.length === 0) return setErro("Escolha quem vota, ou marque que todos votam.");
    setSalvando(true);
    setErro("");
    try {
      await onSalvar({
        nome: nome.trim(),
        percentual_aprovacao: pct,
        candidato_ids: candidatos.map(Number),
        eleitores_ids: todosVotam ? [] : eleitoresValidos.map(Number),
      });
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível salvar");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <FormNova onSubmit={handleSubmit}>
      <FormLinha>
        <FieldGroup>
          <FieldLabel htmlFor="sab-nome">Nome da eleição</FieldLabel>
          <FieldInput
            id="sab-nome"
            value={nome}
            placeholder="Ex.: Diretoria de Projetos 2027"
            maxLength={150}
            onChange={(e) => setNome(e.target.value)}
          />
        </FieldGroup>
        <FieldGroup>
          <FieldLabel htmlFor="sab-pct">Percentual para eleger (%)</FieldLabel>
          <FieldInput
            id="sab-pct"
            type="number"
            min={1}
            max={100}
            value={percentual}
            onChange={(e) => setPercentual(e.target.value)}
          />
          <Meta>Eleito quem passa deste percentual dos votos ponderados dados (brancos contam no total).</Meta>
        </FieldGroup>
      </FormLinha>
      <FieldGroup>
        <FieldLabel>Candidatos</FieldLabel>
        <MultiSelect
          valores={candidatos}
          onChange={setCandidatos}
          opcoes={opcoes}
          rotuloVazio="Escolha entre os membros"
          resumo={(n) => `${n} candidatos`}
          pesquisavel
          aria-label="Candidatos"
        />
        <Meta>Quem concorre não vota nesta eleição.</Meta>
      </FieldGroup>
      <FieldGroup>
        <FieldLabel>Quem vota</FieldLabel>
        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
          <input type="checkbox" checked={todosVotam} onChange={(e) => setTodosVotam(e.target.checked)} />
          Todos os membros ativos (menos os candidatos)
        </label>
        {!todosVotam && (
          <>
            <MultiSelect
              valores={eleitoresValidos}
              onChange={setEleitores}
              opcoes={opcoesEleitores}
              rotuloVazio="Escolha quem recebe a cédula"
              resumo={(n) => `${n} de ${opcoesEleitores.length} votam`}
              pesquisavel
              aria-label="Quem vota"
            />
            <Meta>
              <LinkAcao type="button" onClick={() => setEleitores(opcoesEleitores.map((o) => o.value))}>
                marcar todos
              </LinkAcao>
              {" · "}
              <LinkAcao type="button" onClick={() => setEleitores([])}>
                limpar
              </LinkAcao>
              {" · "}marque todos e desmarque quem não vota, ou monte a lista do zero. A lista é congelada ao abrir.
            </Meta>
          </>
        )}
      </FieldGroup>
      {erro && <FormErrorText>{erro}</FormErrorText>}
      <Acoes style={{ marginTop: 0 }}>
        <PageButton type="submit" disabled={salvando}>
          {salvando ? "Salvando..." : inicial ? "Salvar alterações" : "Salvar rascunho"}
        </PageButton>
        <PageButton type="button" $variant="outline" onClick={onCancelar} disabled={salvando}>
          Cancelar
        </PageButton>
      </Acoes>
    </FormNova>
  );
}

// ---------------------------------------------------------------- card de uma eleição

type Confirmacao = "abrir" | "fechar" | "apagar";

function CardEleicao({
  eleicao,
  token,
  ativos,
  rotuloPosicao,
  recolhidaInicial,
  onMudou,
}: {
  eleicao: Eleicao;
  token: string | null;
  ativos: UsuarioResumo[];
  rotuloPosicao: (p: string | null | undefined) => string;
  recolhidaInicial: boolean;
  onMudou: () => Promise<void>;
}) {
  const [expandida, setExpandida] = useState(!recolhidaInicial);
  const [editando, setEditando] = useState(false);
  const [confirmando, setConfirmando] = useState<Confirmacao | null>(null);
  const [mostrarPendentes, setMostrarPendentes] = useState(false);

  const status = ROTULO_STATUS[eleicao.status];
  const pct = eleicao.percentual_aprovacao;

  async function executar(acao: Confirmacao) {
    if (!token) return;
    const fn = acao === "abrir" ? abrirEleicao : acao === "fechar" ? fecharEleicao : apagarEleicao;
    await fn(eleicao.id, token);
    await onMudou();
    setConfirmando(null);
  }

  const cabecalho = (
    <CabecalhoEleicao>
      <TituloEleicao>
        {eleicao.nome}
        <PageBadge $tone={status.tom}>{status.texto}</PageBadge>
      </TituloEleicao>
      <Meta>
        Elege com mais de {pct}% dos votos
        {eleicao.aberta_em && ` · aberta em ${formatarDataHora(eleicao.aberta_em)}`}
        {eleicao.fechada_em && ` · fechada em ${formatarDataHora(eleicao.fechada_em)}`}
        {eleicao.status === "fechada" && (
          <>
            {" · "}
            <LinkAcao type="button" onClick={() => setExpandida((v) => !v)}>
              {expandida ? "recolher" : "ver resultado"}
            </LinkAcao>
          </>
        )}
      </Meta>
    </CabecalhoEleicao>
  );

  // Excluir uma eleição que já tem votos (aberta ou fechada) pede o nome
  // digitado; rascunho não tem nada a perder, confirma direto.
  const modalExcluir = confirmando === "apagar" && (
    <ConfirmarModal
      titulo="Excluir eleição"
      mensagem={
        eleicao.status === "rascunho"
          ? `Excluir o rascunho "${eleicao.nome}"? Ele ainda não foi aberto, então nenhum voto se perde.`
          : `Excluir "${eleicao.nome}" para sempre? Os ${eleicao.total_votos} votos registrados e o resultado são apagados junto. Essa ação não pode ser desfeita.`
      }
      confirmacaoTexto={eleicao.status === "rascunho" ? undefined : eleicao.nome}
      rotuloConfirmar="Excluir"
      rotuloProcessando="Excluindo…"
      onConfirmar={() => executar("apagar")}
      onCancelar={() => setConfirmando(null)}
    />
  );

  if (!expandida) {
    return (
      <PageCard>
        <PageCardContent>
          {cabecalho}
          <Acoes style={{ marginTop: "0.5rem" }}>
            <PageButtonSm type="button" $variant="ghost" onClick={() => setConfirmando("apagar")}>
              Excluir
            </PageButtonSm>
          </Acoes>
          {modalExcluir}
        </PageCardContent>
      </PageCard>
    );
  }

  return (
    <PageCard>
      <PageCardContent>
        {cabecalho}

        {editando && token ? (
          <Secao>
            <FormEleicao
              inicial={eleicao}
              ativos={ativos}
              rotuloPosicao={rotuloPosicao}
              onSalvar={async (dados) => {
                await editarEleicao(eleicao.id, dados, token);
                setEditando(false);
                await onMudou();
              }}
              onCancelar={() => setEditando(false)}
            />
          </Secao>
        ) : (
          <>
            <Secao>
              <SecaoTitulo>Candidatos</SecaoTitulo>
              <Chips>
                {eleicao.candidatos.map((c) => (
                  <Chip key={c.id}>
                    {c.nome}
                    {c.posicao && <Meta>· {rotuloPosicao(c.posicao)}</Meta>}
                  </Chip>
                ))}
              </Chips>
            </Secao>
            {eleicao.status === "rascunho" && (
              <Secao>
                <SecaoTitulo>Quem vota</SecaoTitulo>
                {eleicao.eleitores_ids.length === 0 ? (
                  <Meta>Todos os membros ativos, menos os candidatos.</Meta>
                ) : (
                  <Chips>
                    {eleicao.eleitores_ids.map((id) => {
                      const u = ativos.find((a) => a.id === id);
                      return (
                        <Chip key={id}>
                          {u?.nome ?? `Usuário ${id}`}
                          {u?.posicao && <Meta>· {rotuloPosicao(u.posicao)}</Meta>}
                        </Chip>
                      );
                    })}
                  </Chips>
                )}
              </Secao>
            )}
          </>
        )}

        {eleicao.status !== "rascunho" && (
          <Secao>
            <SecaoTitulo>Participação</SecaoTitulo>
            <Aviso>
              <strong>{eleicao.total_votos}</strong> de {eleicao.total_eleitores} votaram
              {eleicao.total_votos >= eleicao.total_eleitores ? (
                " · todo mundo votou"
              ) : eleicao.status === "fechada" ? (
                <>
                  {" · "}
                  <LinkAcao type="button" onClick={() => setMostrarPendentes((v) => !v)}>
                    {mostrarPendentes ? "esconder" : "ver"} quem faltou ({eleicao.pendentes.length})
                  </LinkAcao>
                </>
              ) : (
                // Enquanto aberta, o backend não manda quem falta: a lista
                // mudando ao lado da corrida entregaria o voto de cada um.
                " · quem falta aparece quando a votação fechar"
              )}
            </Aviso>
            {mostrarPendentes && eleicao.status === "fechada" && (
              <Chips>
                {eleicao.pendentes.map((p) => (
                  <Chip key={p.usuario_id}>
                    {p.nome}
                    {p.posicao && <Meta>· {rotuloPosicao(p.posicao)}</Meta>}
                  </Chip>
                ))}
              </Chips>
            )}
          </Secao>
        )}

        {eleicao.status === "aberta" && <CorridaAoVivo eleicaoId={eleicao.id} token={token} />}

        {eleicao.status === "fechada" && eleicao.resultado && <Resultado eleicao={eleicao} />}

        {eleicao.status === "fechada" && (
          <GraficosResultado eleicaoId={eleicao.id} token={token} rotuloPosicao={rotuloPosicao} />
        )}

        {!editando && (
          <Acoes>
            {eleicao.status === "rascunho" && (
              <>
                <PageButton type="button" onClick={() => setConfirmando("abrir")}>
                  Abrir votação
                </PageButton>
                <PageButton type="button" $variant="outline" onClick={() => setEditando(true)}>
                  Editar
                </PageButton>
              </>
            )}
            {eleicao.status === "aberta" && (
              <PageButton type="button" onClick={() => setConfirmando("fechar")}>
                Fechar votação e apurar
              </PageButton>
            )}
            <PageButtonSm type="button" $variant="ghost" onClick={() => setConfirmando("apagar")}>
              Excluir
            </PageButtonSm>
          </Acoes>
        )}
        {confirmando === "abrir" && (
          <ConfirmarModal
            titulo="Abrir votação"
            mensagem={
              eleicao.eleitores_ids.length === 0
                ? `Abrir "${eleicao.nome}" agora? A cédula aparece para todos os membros ativos (menos os candidatos) e a lista de candidatos não muda mais.`
                : `Abrir "${eleicao.nome}" agora? A cédula aparece só para as ${eleicao.eleitores_ids.length} pessoas escolhidas e as listas de candidatos e de quem vota não mudam mais.`
            }
            rotuloConfirmar="Abrir votação"
            rotuloProcessando="Abrindo…"
            onConfirmar={() => executar("abrir")}
            onCancelar={() => setConfirmando(null)}
          />
        )}
        {confirmando === "fechar" && (
          <ConfirmarModal
            titulo="Fechar votação e apurar"
            mensagem={`Fechar "${eleicao.nome}" agora? ${eleicao.total_votos} de ${eleicao.total_eleitores} votaram. Ninguém mais vota depois disso e o resultado sai na hora.`}
            rotuloConfirmar="Fechar e apurar"
            rotuloProcessando="Apurando…"
            onConfirmar={() => executar("fechar")}
            onCancelar={() => setConfirmando(null)}
          />
        )}
        {modalExcluir}
      </PageCardContent>
    </PageCard>
  );
}

// ---------------------------------------------------------------- resultado

function Resultado({ eleicao }: { eleicao: Eleicao }) {
  const r = eleicao.resultado!;
  const eleito = r.candidatos.find((c) => c.eleito);
  return (
    <Secao>
      <SecaoTitulo>Resultado</SecaoTitulo>
      {r.situacao === "eleito" && eleito ? (
        <Veredito $tom="eleito">
          Eleito(a): {eleito.nome}
          <small>
            {eleito.percentual}% dos votos ponderados · precisava passar de {r.percentual_aprovacao}%
          </small>
        </Veredito>
      ) : r.situacao === "sem_votos" ? (
        <Veredito $tom="vazio">Sem votos registrados</Veredito>
      ) : (
        <Veredito $tom="ninguem">
          Ninguém eleito
          <small>nenhum candidato passou de {r.percentual_aprovacao}% dos votos ponderados</small>
        </Veredito>
      )}

      <Lista style={{ gap: "0.5rem" }}>
        {r.candidatos.map((c) => (
          <LinhaCandidato key={c.candidato_id} $eleito={c.eleito}>
            <NomeCandidato>
              {c.nome}
              {c.eleito ? (
                <PageBadge $tone="success">Eleito(a)</PageBadge>
              ) : (
                <PageBadge $tone="danger">Não eleito(a)</PageBadge>
              )}
            </NomeCandidato>
            <NumerosCandidato>
              <strong>{c.percentual}%</strong> · {c.ponderado} pts · {c.votos} {c.votos === 1 ? "voto" : "votos"}
            </NumerosCandidato>
            <Barra>
              <BarraPreenchida $pct={c.percentual} $tom={c.eleito ? "eleito" : "normal"} />
            </Barra>
          </LinhaCandidato>
        ))}
        <LinhaCandidato $eleito={false}>
          <NomeCandidato>Em branco</NomeCandidato>
          <NumerosCandidato>
            <strong>{r.brancos.percentual}%</strong> · {r.brancos.ponderado} pts · {r.brancos.votos}{" "}
            {r.brancos.votos === 1 ? "voto" : "votos"}
          </NumerosCandidato>
          <Barra>
            <BarraPreenchida $pct={r.brancos.percentual} $tom="branco" />
          </Barra>
        </LinhaCandidato>
      </Lista>
      <Meta>
        {r.total_votos} {r.total_votos === 1 ? "voto" : "votos"} válidos somando {r.total_ponderado} pontos (voto
        ponderado pela posição de quem votou).
      </Meta>
    </Secao>
  );
}
