import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Clock, Search, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getProjetosAtivos, type ProjetoAtivo } from "@/lib/monitoramento";
import { ROTULO_STATUS, formatarData } from "@/lib/projetos";
import { getUsuarios } from "@/lib/usuarios";
import type { UsuarioResumo } from "@/types/auth";
import type { StatusProjeto } from "@/types/projeto";
import {
  PageCard,
  PageCardHeader,
  PageCardTitle,
  PageCardContent,
  PageLoadingBlock,
  ErrorText,
} from "@/styles/page.styled";
import {
  BarraBusca,
  BotaoLimparBusca,
  BotaoAlternativa,
  CelulaDias,
  ConteudoCarregando,
  DataTable,
  EstadoLimpo,
  GrupoBotoes,
  HistBotaoAcoes,
  HistCelulaProjeto,
  HistCliente,
  HistControles,
  HistOrdenar,
  HistSegmentos,
  HistTags,
  LinkProjeto,
  Pilula,
  SemDado,
  TabelaRolagem,
  TableBody,
  TableCell,
  TableHead,
  TableHeadCell,
  TableRow,
  type TomPilula,
} from "./Monitoramento.styled";
import { useFiltroFrente } from "./FiltroFrente";
import { useFiltroStatus } from "./FiltroStatus";
import { AcoesRecentesModal } from "./AcoesRecentesModal";

/**
 * A tabela dos projetos EM CURSO, na aba Histórico — o "o que ainda está
 * aberto" ao lado do "o que já fechou".
 *
 * Não é uma aba: é um card autônomo, no mesmo modelo do Portfólio encerrado.
 * Tem o PRÓPRIO filtro de frente (independente do da outra tabela), além de
 * busca, segmento, ordenação e o modal de ações.
 */
type Segmento = "todos" | "execucao" | "pausados";

/** As etapas oferecidas no filtro de status desta tabela — todas menos
 *  `finalizado`, que nunca aparece aqui.
 *
 *  ⚠ Convive com os botões de segmento abaixo, e os dois NÃO brigam: o filtro
 *  de status escolhe o que é CARREGADO (vai na requisição), o segmento é um
 *  corte grosso dentro do que já veio. Como as contagens dos botões saem de
 *  `dados`, elas acompanham o filtro sozinhas — marcar "Ambientação" deixa
 *  "Pausados (0)", que é a verdade sobre o recorte na tela. */
const STATUS_EM_CURSO: StatusProjeto[] = [
  "vendido",
  "ambientacao",
  "em_andamento",
  "validacao_bancas",
  "envio_tep",
  "periodo_ajustes",
  "pausado",
];

const SEGMENTOS: { chave: Segmento; rotulo: string }[] = [
  { chave: "todos", rotulo: "Todos" },
  { chave: "execucao", rotulo: "Em execução" },
  { chave: "pausados", rotulo: "Pausados" },
];

function emExecucao(p: ProjetoAtivo): boolean {
  return p.status !== "vendido" && p.status !== "pausado";
}

type ColunaOrd = "nome" | "coordenador" | "status" | "dias_em_execucao" | "proxima_banca";
type Direcao = "asc" | "desc";

const DIR_INICIAL: Record<ColunaOrd, Direcao> = {
  nome: "asc",
  coordenador: "asc",
  status: "asc",
  dias_em_execucao: "desc",
  proxima_banca: "asc",
};

function tomStatus(p: ProjetoAtivo): TomPilula {
  return p.status === "pausado" ? "atencao" : "neutro";
}

function comparar(a: ProjetoAtivo, b: ProjetoAtivo, coluna: ColunaOrd): number {
  const texto = (x: string | null) => x ?? "";
  const nuloDepois = (av: unknown, bv: unknown) =>
    av == null && bv == null ? 0 : av == null ? 1 : bv == null ? -1 : null;

  switch (coluna) {
    case "nome":
      return a.nome.localeCompare(b.nome, "pt-BR");
    case "coordenador":
      return nuloDepois(a.coordenador, b.coordenador) ?? texto(a.coordenador).localeCompare(texto(b.coordenador), "pt-BR");
    case "status":
      return ROTULO_STATUS[a.status].localeCompare(ROTULO_STATUS[b.status], "pt-BR");
    case "dias_em_execucao":
      return nuloDepois(a.dias_em_execucao, b.dias_em_execucao) ?? (a.dias_em_execucao! - b.dias_em_execucao!);
    case "proxima_banca":
      return nuloDepois(a.proxima_banca, b.proxima_banca) ?? texto(a.proxima_banca).localeCompare(texto(b.proxima_banca));
  }
}

export function ProjetosAtivosTabela() {
  const { token } = useAuth();
  const { frenteId, seletor } = useFiltroFrente();
  // Sem `finalizado`: esta tabela é, por definição, o que ainda está ABERTO —
  // o backend recorta os finalizados de qualquer jeito, e oferecer uma opção
  // que sempre devolve tabela vazia parece bug. Quem quer os encerrados tem a
  // tabela irmã, o Portfólio encerrado, logo abaixo nesta mesma página.
  const { status, seletor: seletorStatus } = useFiltroStatus(STATUS_EM_CURSO);
  const [segmento, setSegmento] = useState<Segmento>("todos");
  const [busca, setBusca] = useState("");
  const [ordem, setOrdem] = useState<{ coluna: ColunaOrd; dir: Direcao }>({
    coluna: "dias_em_execucao",
    dir: "desc",
  });
  const [dados, setDados] = useState<ProjetoAtivo[] | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [acoesDe, setAcoesDe] = useState<ProjetoAtivo | null>(null);
  const [usuarios, setUsuarios] = useState<UsuarioResumo[]>([]);

  useEffect(() => {
    if (!token) return;
    getUsuarios(token)
      .then(setUsuarios)
      .catch(() => setUsuarios([]));
  }, [token]);

  const nomeDoUsuario = (id: number) =>
    usuarios.find((u) => u.id === id)?.nome ?? `Usuário ${id}`;

  useEffect(() => {
    if (!token) return;
    let vivo = true;
    setCarregando(true);
    setErro("");
    getProjetosAtivos(token, frenteId, status)
      .then((r) => {
        if (vivo) setDados(r);
      })
      .catch((e) => {
        if (vivo) setErro(e instanceof Error ? e.message : "Erro ao carregar os projetos ativos");
      })
      .finally(() => {
        if (vivo) setCarregando(false);
      });
    return () => {
      vivo = false;
    };
  }, [token, frenteId, status]);

  const contagem = useMemo(() => {
    const lista = dados ?? [];
    return {
      todos: lista.length,
      execucao: lista.filter(emExecucao).length,
      pausados: lista.filter((p) => p.status === "pausado").length,
    };
  }, [dados]);

  const ordenados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const filtrados = (dados ?? []).filter((p) => {
      if (segmento === "execucao" && !emExecucao(p)) return false;
      if (segmento === "pausados" && p.status !== "pausado") return false;
      if (!termo) return true;
      return `${p.nome} ${p.cliente ?? ""} ${p.coordenador ?? ""}`.toLowerCase().includes(termo);
    });
    const dir = ordem.dir === "asc" ? 1 : -1;
    return filtrados.sort((a, b) => comparar(a, b, ordem.coluna) * dir);
  }, [dados, segmento, busca, ordem]);

  function ordenarPor(coluna: ColunaOrd) {
    setOrdem((atual) =>
      atual.coluna === coluna
        ? { coluna, dir: atual.dir === "asc" ? "desc" : "asc" }
        : { coluna, dir: DIR_INICIAL[coluna] },
    );
  }

  function Th({ coluna, children }: { coluna: ColunaOrd; children: ReactNode }) {
    const ativo = ordem.coluna === coluna;
    return (
      <TableHeadCell aria-sort={ativo ? (ordem.dir === "asc" ? "ascending" : "descending") : "none"}>
        <HistOrdenar type="button" $ativo={ativo} onClick={() => ordenarPor(coluna)}>
          {children}
          {ativo && (
            <span className="seta" aria-hidden="true">
              {ordem.dir === "asc" ? "↑" : "↓"}
            </span>
          )}
        </HistOrdenar>
      </TableHeadCell>
    );
  }

  return (
    <PageCard>
      <PageCardHeader>
        <PageCardTitle>Projetos em curso{dados ? ` (${contagem.todos})` : ""}</PageCardTitle>
      </PageCardHeader>
      <PageCardContent>
        {erro ? (
          <ErrorText>{erro}</ErrorText>
        ) : (
          <>
            <HistControles>
              <HistSegmentos>
                {seletor}
                {seletorStatus}
                <GrupoBotoes role="group" aria-label="Filtrar por situação">
                  {SEGMENTOS.map((s) => (
                    <BotaoAlternativa
                      key={s.chave}
                      type="button"
                      $ativo={segmento === s.chave}
                      aria-pressed={segmento === s.chave}
                      onClick={() => setSegmento(s.chave)}
                    >
                      {s.rotulo} ({contagem[s.chave]})
                    </BotaoAlternativa>
                  ))}
                </GrupoBotoes>
              </HistSegmentos>

              <BarraBusca>
                <Search size={15} aria-hidden="true" />
                <input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar projeto ou cliente"
                  aria-label="Buscar projeto, cliente ou coordenador"
                />
                {busca && (
                  <BotaoLimparBusca type="button" onClick={() => setBusca("")} aria-label="Limpar busca">
                    <X size={14} />
                  </BotaoLimparBusca>
                )}
              </BarraBusca>
            </HistControles>

            {/* `!dados` e não `carregando || !dados`: o bloco de carregamento é
                só da primeira carga. Trocar um filtro mantém a tabela antiga na
                tela, esmaecida — o seletor de status fica na barra acima, e
                apagar o conteúdo a cada clique fazia a página inteira piscar
                enquanto a pessoa ainda estava marcando as etapas. */}
            <ConteudoCarregando $carregando={carregando}>
            {!dados ? (
              <PageLoadingBlock />
            ) : ordenados.length === 0 ? (
              <EstadoLimpo>
                <strong>Nenhum projeto em curso</strong>
                <span>
                  {busca ? `Nada casa com "${busca}" neste filtro.` : "Não há projetos ativos na sua visão."}
                </span>
              </EstadoLimpo>
            ) : (
              <TabelaRolagem $min="56rem" $max="32rem">
                <DataTable>
                  <TableHead>
                    <TableRow>
                      <Th coluna="nome">Projeto</Th>
                      <TableHeadCell>Frentes</TableHeadCell>
                      <Th coluna="coordenador">Coordenador</Th>
                      <Th coluna="status">Status</Th>
                      <Th coluna="dias_em_execucao">Em execução</Th>
                      <Th coluna="proxima_banca">Próxima banca</Th>
                      <TableHeadCell>Atividade</TableHeadCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {ordenados.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>
                          <HistCelulaProjeto>
                            <LinkProjeto to={`/projetos/${p.id}`}>{p.nome}</LinkProjeto>
                            <HistCliente>{p.cliente ?? "Sem cliente definido"}</HistCliente>
                          </HistCelulaProjeto>
                        </TableCell>
                        <TableCell>
                          {p.frentes.length > 0 ? (
                            <HistTags>
                              {p.frentes.map((f) => (
                                <Pilula key={f} $tom="neutro">
                                  {f}
                                </Pilula>
                              ))}
                            </HistTags>
                          ) : (
                            <SemDado>—</SemDado>
                          )}
                        </TableCell>
                        <TableCell>{p.coordenador ?? <SemDado>—</SemDado>}</TableCell>
                        <TableCell>
                          <Pilula $tom={tomStatus(p)}>{ROTULO_STATUS[p.status]}</Pilula>
                        </TableCell>
                        <TableCell>
                          {p.kickoff_pendente ? (
                            <Pilula $tom="atencao">Kickoff pendente</Pilula>
                          ) : p.dias_em_execucao == null ? (
                            // Projeto do atalho sem kickoff: não é pendência, mas também não há de onde contar.
                            <SemDado>sem kickoff</SemDado>
                          ) : (
                            <CelulaDias>
                              {p.dias_em_execucao}
                              <small>{p.dias_em_execucao === 1 ? "dia" : "dias"}</small>
                            </CelulaDias>
                          )}
                        </TableCell>
                        <TableCell>
                          {p.proxima_banca ? (
                            <CelulaDias>{formatarData(p.proxima_banca)}</CelulaDias>
                          ) : (
                            <SemDado>—</SemDado>
                          )}
                        </TableCell>
                        <TableCell>
                          <HistBotaoAcoes
                            type="button"
                            onClick={() => setAcoesDe(p)}
                            title={`Ver ações recentes de ${p.nome}`}
                          >
                            <Clock size={13} aria-hidden="true" />
                            Ações
                          </HistBotaoAcoes>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </DataTable>
              </TabelaRolagem>
            )}
            </ConteudoCarregando>
          </>
        )}
      </PageCardContent>

      {acoesDe && (
        <AcoesRecentesModal
          projetoId={acoesDe.id}
          projetoNome={acoesDe.nome}
          nomeDoUsuario={nomeDoUsuario}
          onClose={() => setAcoesDe(null)}
        />
      )}
    </PageCard>
  );
}
