import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Clock, Download, Folder } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { formatarDataHora } from "@/lib/projetos";
import {
  getGpAvisos,
  getGpGestoes,
  getGpRegistros,
  getGpResumo,
  rotuloNucleos,
  type GpAviso,
  type GpCategoria,
  type GpGestao,
  type GpRegistro,
  type GpResumo,
} from "@/lib/gestao-pessoas";
import { ROTULO_CATEGORIA, ROTULO_FAIXA, TOM_FAIXA, corDosPontos, pontosComSinal } from "@/lib/gp-rotulos";
import { normalizarTexto } from "@/lib/nucleo";
import { theme } from "@/styles/theme";
import {
  EmptyText,
  ErrorText,
  PageBadge,
  PageButtonSm,
  PageCard,
  PageCardContent,
  PageCardHeader,
  PageCardTitle,
} from "@/styles/page.styled";
import { DataTable, FieldSelect, TableBody, TableCell, TableHead, TableHeadCell, TableRow } from "@/pages/Bancas.styled";
import { TableScrollWrap } from "@/styles/shared.styled";
import {
  Busca,
  CabecalhoControles,
  Descricao,
  DiaCabecalho,
  Filtros,
  GestaoCard,
  GestaoCardMeta,
  GestaoCardTitulo,
  GestoesGrid,
  LinhaClicavel,
  NomeComNucleo,
  Pontos,
  RegistroDireita,
  RegistroLinha,
  RegistroTexto,
  SubAba,
  SubAbas,
} from "./GestaoPessoas.styled";
import { useGestaoPessoas } from "./contexto";
import { baixarCsv, gerarCsv } from "./csv";
import { formatarDia } from "./calculos";

type Aba = "gestoes" | "historico" | "avisos";

const DIAS_DA_SEMANA = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

/** "Segunda-feira, 5 de outubro de 2026". */
function diaPorExtenso(dia: string): string {
  const [a, m, d] = dia.split("-").map(Number);
  const semana = DIAS_DA_SEMANA[new Date(Date.UTC(a, m - 1, d)).getUTCDay()];
  return `${semana}, ${d} de ${MESES[m - 1]} de ${a}`;
}

/**
 * "Histórico e Relatórios" (spec 5.3): as gestões como pastas, o histórico
 * da gestão atual agrupado por dia e os avisos enviados. Cada aba exporta
 * CSV (separador `;`).
 */
export function HistoricoRelatorios() {
  const { token } = useAuth();
  const contexto = useGestaoPessoas();
  const { resumo, nucleos, abrirMembro, corrigir, retirar, versao } = contexto;
  const [aba, setAba] = useState<Aba>("gestoes");

  const [gestoes, setGestoes] = useState<GpGestao[] | null>(null);
  const [gestaoAberta, setGestaoAberta] = useState<GpGestao | null>(null);
  const [resumoGestao, setResumoGestao] = useState<GpResumo | null>(null);
  const [registros, setRegistros] = useState<GpRegistro[] | null>(null);
  const [avisos, setAvisos] = useState<GpAviso[] | null>(null);
  const [erro, setErro] = useState("");

  const [busca, setBusca] = useState("");
  const [nucleoId, setNucleoId] = useState("");
  const [categoria, setCategoria] = useState<GpCategoria | "">("");

  useEffect(() => {
    if (!token) return;
    let vivo = true;
    Promise.all([getGpGestoes(token), getGpRegistros(token, { semestre_id: resumo.semestre.id }), getGpAvisos(token)])
      .then(([g, r, a]) => {
        if (!vivo) return;
        setErro("");
        setGestoes(g);
        setRegistros(r);
        setAvisos(a);
      })
      .catch((err) => vivo && setErro(err instanceof Error ? err.message : "Erro ao carregar o histórico"));
    return () => {
      vivo = false;
    };
  }, [token, resumo.semestre.id, versao]);

  // O resumo da gestão zera em `abrirGestao`, não aqui: setState síncrono
  // num efeito dispara render em cascata.
  useEffect(() => {
    if (!token || !gestaoAberta) return;
    let vivo = true;
    getGpResumo(token, gestaoAberta.id)
      .then((r) => vivo && setResumoGestao(r))
      .catch((err) => vivo && setErro(err instanceof Error ? err.message : "Erro ao carregar a gestão"));
    return () => {
      vivo = false;
    };
  }, [token, gestaoAberta, versao]);

  function abrirGestao(gestao: GpGestao | null) {
    setResumoGestao(null);
    setGestaoAberta(gestao);
  }

  const membrosPorId = useMemo(() => new Map(resumo.membros.map((m) => [m.usuario_id, m])), [resumo.membros]);
  const termo = normalizarTexto(busca.trim());

  const filtroNucleo = (
    <FieldSelect aria-label="Núcleo" value={nucleoId} onChange={(e) => setNucleoId(e.target.value)}>
      <option value="">Todos os núcleos</option>
      {nucleos.map((n) => (
        <option key={n.id} value={n.id}>
          {n.nome}
        </option>
      ))}
    </FieldSelect>
  );

  /* ---------------- Gestões ---------------- */
  const membrosDaGestao = useMemo(() => {
    if (!resumoGestao) return [];
    return resumoGestao.membros
      .filter((m) => !nucleoId || m.nucleo_ids.includes(Number(nucleoId)))
      .filter((m) => !termo || normalizarTexto(m.nome).includes(termo) || normalizarTexto(m.email).includes(termo))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [resumoGestao, nucleoId, termo]);

  function exportarGestao() {
    if (!gestaoAberta) return;
    baixarCsv(
      `gestao-${gestaoAberta.nome}`,
      gerarCsv(
        ["membro", "email", "nucleos", "pontos_obrigacoes", "pontos_desempenho", "registros"],
        membrosDaGestao.map((m) => [m.nome, m.email, m.nucleo_nomes.join(" / "), m.obrigacoes.pontos, m.desempenho.pontos, m.registros]),
      ),
    );
  }

  /* ---------------- Histórico ---------------- */
  const registrosFiltrados = useMemo(() => {
    return (registros ?? [])
      .filter((r) => !categoria || r.categoria === categoria)
      .filter((r) => !nucleoId || (membrosPorId.get(r.usuario_id)?.nucleo_ids ?? []).includes(Number(nucleoId)))
      .filter(
        (r) =>
          !termo ||
          normalizarTexto(r.usuario_nome).includes(termo) ||
          normalizarTexto(r.tipo_nome).includes(termo) ||
          normalizarTexto(r.observacao).includes(termo),
      )
      .sort((a, b) => b.data.localeCompare(a.data) || b.lancado_em.localeCompare(a.lancado_em));
  }, [registros, categoria, nucleoId, termo, membrosPorId]);

  const porDia = useMemo(() => {
    const grupos: { dia: string; itens: GpRegistro[] }[] = [];
    for (const r of registrosFiltrados) {
      const ultimo = grupos[grupos.length - 1];
      if (ultimo && ultimo.dia === r.data) ultimo.itens.push(r);
      else grupos.push({ dia: r.data, itens: [r] });
    }
    return grupos;
  }, [registrosFiltrados]);

  function exportarHistorico() {
    baixarCsv(
      `historico-gestao-${resumo.semestre.nome}`,
      gerarCsv(
        ["data", "membro", "email", "nucleos", "categoria", "ocorrencia", "pontos", "projeto", "observacao", "responsavel", "lancado_em", "situacao"],
        registrosFiltrados.map((r) => {
          const m = membrosPorId.get(r.usuario_id);
          return [
            r.data,
            r.usuario_nome,
            m?.email ?? "",
            m?.nucleo_nomes.join(" / ") ?? "",
            ROTULO_CATEGORIA[r.categoria],
            r.tipo_nome,
            r.pontos,
            r.projeto_nome ?? "",
            r.observacao,
            r.origem === "manual" ? (r.lancado_por_nome ?? "") : "Automático",
            r.lancado_em,
            r.status === "ativo" ? "Ativo" : "Retirado",
          ];
        }),
      ),
    );
  }

  /* ---------------- Avisos ---------------- */
  function exportarAvisos() {
    baixarCsv(
      "avisos-gestao-pessoas",
      gerarCsv(
        ["data_hora", "membro", "email", "categoria", "situacao", "pontuacao", "limite", "origem", "copia_diretoria"],
        (avisos ?? []).map((a) => [
          a.enviado_em,
          a.usuario_nome,
          a.usuario_email,
          ROTULO_CATEGORIA[a.categoria],
          ROTULO_FAIXA[a.faixa],
          a.pontuacao,
          a.limite,
          a.origem === "automatico" ? "Automático" : "Manual",
          a.copia_diretoria ? "Sim" : "Não",
        ]),
      ),
    );
  }

  return (
    <>
      <SubAbas role="tablist" aria-label="Histórico e Relatórios">
        <SubAba type="button" role="tab" aria-selected={aba === "gestoes"} $ativa={aba === "gestoes"} onClick={() => setAba("gestoes")}>
          Gestões
        </SubAba>
        <SubAba type="button" role="tab" aria-selected={aba === "historico"} $ativa={aba === "historico"} onClick={() => setAba("historico")}>
          Histórico da gestão {resumo.semestre.nome}
        </SubAba>
        <SubAba type="button" role="tab" aria-selected={aba === "avisos"} $ativa={aba === "avisos"} onClick={() => setAba("avisos")}>
          Avisos
        </SubAba>
      </SubAbas>

      {erro && <ErrorText>{erro}</ErrorText>}

      {aba === "gestoes" && !gestaoAberta && (
        <PageCard>
          <PageCardHeader>
            <PageCardTitle>Gestões</PageCardTitle>
          </PageCardHeader>
          <PageCardContent>
            <Descricao>Pontos de cada gestão. Registros retirados continuam visíveis e não contam para o limite.</Descricao>
            {!gestoes ? (
              <EmptyText>Carregando...</EmptyText>
            ) : gestoes.length === 0 ? (
              <EmptyText>Nenhuma gestão cadastrada.</EmptyText>
            ) : (
              <GestoesGrid>
                {gestoes.map((g) => (
                  <GestaoCard key={g.id} type="button" $atual={g.atual} onClick={() => abrirGestao(g)}>
                    <GestaoCardTitulo>
                      <Folder size={16} />
                      Gestão {g.nome}
                      {g.atual && <PageBadge $tone="default">Atual</PageBadge>}
                    </GestaoCardTitulo>
                    <GestaoCardMeta>
                      {formatarDia(g.inicio.slice(0, 10))} a {formatarDia(g.fim.slice(0, 10))}
                    </GestaoCardMeta>
                    <GestaoCardMeta>
                      {g.pontos_obrigacoes} pts obrigações · {g.pontos_desempenho} pts desempenho · {g.membros} membro(s)
                    </GestaoCardMeta>
                  </GestaoCard>
                ))}
              </GestoesGrid>
            )}
          </PageCardContent>
        </PageCard>
      )}

      {aba === "gestoes" && gestaoAberta && (
        <PageCard>
          <PageCardHeader>
            <CabecalhoControles>
              <PageButtonSm type="button" $variant="ghost" onClick={() => abrirGestao(null)}>
                <ArrowLeft size={14} />
                Todas as gestões
              </PageButtonSm>
              <PageCardTitle>
                Gestão {gestaoAberta.nome} ({resumoGestao?.membros.length ?? 0} membros)
              </PageCardTitle>
              <PageBadge $tone={gestaoAberta.atual ? "default" : "muted"}>{gestaoAberta.atual ? "Atual" : "Encerrada"}</PageBadge>
            </CabecalhoControles>
            <PageButtonSm type="button" $variant="outline" onClick={exportarGestao} disabled={!resumoGestao}>
              <Download size={14} />
              Exportar CSV
            </PageButtonSm>
          </PageCardHeader>
          <PageCardContent>
            <Descricao>
              {formatarDia(gestaoAberta.inicio.slice(0, 10))} a {formatarDia(gestaoAberta.fim.slice(0, 10))} ·{" "}
              {gestaoAberta.pontos_obrigacoes} pts por obrigações e {gestaoAberta.pontos_desempenho} pts por desempenho.
              Clique em um membro para ver os registros dele nesta gestão.
            </Descricao>
            <Filtros>
              <Busca type="search" placeholder="Buscar por nome..." aria-label="Buscar por nome" value={busca} onChange={(e) => setBusca(e.target.value)} />
              {filtroNucleo}
            </Filtros>
            {!resumoGestao ? (
              <EmptyText>Carregando...</EmptyText>
            ) : membrosDaGestao.length === 0 ? (
              <EmptyText>Nenhum membro encontrado.</EmptyText>
            ) : (
              <TableScrollWrap>
                <DataTable>
                  <TableHead>
                    <TableRow>
                      <TableHeadCell>Membro</TableHeadCell>
                      <TableHeadCell>Obrigações</TableHeadCell>
                      <TableHeadCell>Desempenho</TableHeadCell>
                      <TableHeadCell>Registros</TableHeadCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {membrosDaGestao.map((m) => (
                      <LinhaClicavel
                        key={m.usuario_id}
                        role="button"
                        tabIndex={0}
                        style={{ opacity: m.ativo ? 1 : 0.6 }}
                        onClick={() => abrirMembro(m, gestaoAberta)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            abrirMembro(m, gestaoAberta);
                          }
                        }}
                      >
                        <TableCell>
                          <NomeComNucleo>
                            <strong>
                              {m.nome}
                              {!m.ativo && " (desativado)"}
                            </strong>
                            <span>{rotuloNucleos(m)}</span>
                          </NomeComNucleo>
                        </TableCell>
                        <TableCell>{m.obrigacoes.pontos} pts</TableCell>
                        <TableCell>{m.desempenho.pontos} pts</TableCell>
                        <TableCell>{m.registros} registro(s)</TableCell>
                      </LinhaClicavel>
                    ))}
                  </TableBody>
                </DataTable>
              </TableScrollWrap>
            )}
          </PageCardContent>
        </PageCard>
      )}

      {aba === "historico" && (
        <PageCard>
          <PageCardHeader>
            <CabecalhoControles>
              <Clock size={16} color={theme.colors.mutedForeground} />
              <PageCardTitle>Histórico por data ({registrosFiltrados.length})</PageCardTitle>
              <PageBadge $tone="default">Gestão {resumo.semestre.nome}</PageBadge>
            </CabecalhoControles>
            <PageButtonSm type="button" $variant="outline" onClick={exportarHistorico} disabled={!registros}>
              <Download size={14} />
              Exportar CSV
            </PageButtonSm>
          </PageCardHeader>
          <PageCardContent>
            <Descricao>
              Todos os lançamentos da gestão atual, do mais recente para o mais antigo. Clique em um registro para
              abrir o histórico do membro.
            </Descricao>
            <Filtros>
              <Busca
                type="search"
                placeholder="Buscar por membro, tipo ou observação..."
                aria-label="Buscar"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
              {filtroNucleo}
              <FieldSelect aria-label="Categoria" value={categoria} onChange={(e) => setCategoria(e.target.value as GpCategoria | "")}>
                <option value="">Todas as categorias</option>
                <option value="obrigacoes">{ROTULO_CATEGORIA.obrigacoes}</option>
                <option value="desempenho">{ROTULO_CATEGORIA.desempenho}</option>
              </FieldSelect>
            </Filtros>
            {!registros ? (
              <EmptyText>Carregando...</EmptyText>
            ) : porDia.length === 0 ? (
              <EmptyText>Nenhum registro com esses filtros.</EmptyText>
            ) : (
              porDia.map((grupo) => (
                <div key={grupo.dia}>
                  <DiaCabecalho>
                    {diaPorExtenso(grupo.dia)} · {grupo.itens.length} registro(s)
                  </DiaCabecalho>
                  {grupo.itens.map((r) => {
                    const m = membrosPorId.get(r.usuario_id);
                    const retirado = r.status === "anulado";
                    return (
                      <RegistroLinha key={r.id} $esmaecido={retirado}>
                        <RegistroTexto type="button" onClick={() => m && abrirMembro(m)} disabled={!m}>
                          <strong>
                            {r.usuario_nome} ({ROTULO_CATEGORIA[r.categoria]}
                            {m && m.nucleo_nomes.length > 0 ? ` · ${m.nucleo_nomes.join(", ")}` : ""})
                          </strong>
                          <span>
                            <span className={retirado ? "riscado" : undefined}>{r.tipo_nome}</span>
                            {r.projeto_nome ? ` · Projeto ${r.projeto_nome}` : ""} · {r.observacao}
                          </span>
                        </RegistroTexto>
                        <RegistroDireita>
                          <Pontos $cor={corDosPontos(r.pontos)} $riscado={retirado}>
                            {pontosComSinal(r.pontos)}
                          </Pontos>
                          {retirado && <PageBadge $tone="muted">Retirado</PageBadge>}
                          {!retirado && r.ajustes.length > 0 && <PageBadge $tone="success">Corrigido</PageBadge>}
                          <span>{r.origem === "manual" ? (r.lancado_por_nome ?? "") : "Automático"}</span>
                          {!retirado && (
                            <>
                              <PageButtonSm type="button" $variant="ghost" onClick={() => corrigir(r)}>
                                Corrigir
                              </PageButtonSm>
                              <PageButtonSm type="button" $variant="ghost" onClick={() => retirar(r)}>
                                Retirar
                              </PageButtonSm>
                            </>
                          )}
                        </RegistroDireita>
                      </RegistroLinha>
                    );
                  })}
                </div>
              ))
            )}
          </PageCardContent>
        </PageCard>
      )}

      {aba === "avisos" && (
        <PageCard>
          <PageCardHeader>
            <PageCardTitle>Avisos enviados ({avisos?.length ?? 0})</PageCardTitle>
            <PageButtonSm type="button" $variant="outline" onClick={exportarAvisos} disabled={!avisos}>
              <Download size={14} />
              Exportar CSV
            </PageButtonSm>
          </PageCardHeader>
          <PageCardContent>
            {!avisos ? (
              <EmptyText>Carregando...</EmptyText>
            ) : avisos.length === 0 ? (
              <EmptyText>Nenhum aviso registrado.</EmptyText>
            ) : (
              <TableScrollWrap>
                <DataTable>
                  <TableHead>
                    <TableRow>
                      <TableHeadCell>Data e hora</TableHeadCell>
                      <TableHeadCell>Membro</TableHeadCell>
                      <TableHeadCell>Categoria</TableHeadCell>
                      <TableHeadCell>Situação</TableHeadCell>
                      <TableHeadCell>Pontuação</TableHeadCell>
                      <TableHeadCell>Origem</TableHeadCell>
                      <TableHeadCell>Cópia</TableHeadCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {avisos.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell>{formatarDataHora(a.enviado_em)}</TableCell>
                        <TableCell>
                          <NomeComNucleo>
                            <strong>{a.usuario_nome}</strong>
                            <span>{a.usuario_email}</span>
                          </NomeComNucleo>
                        </TableCell>
                        <TableCell>
                          <PageBadge $tone="muted">{ROTULO_CATEGORIA[a.categoria]}</PageBadge>
                        </TableCell>
                        <TableCell>
                          <PageBadge $tone={TOM_FAIXA[a.faixa]}>{ROTULO_FAIXA[a.faixa]}</PageBadge>
                        </TableCell>
                        <TableCell>
                          {a.pontuacao}/{a.limite}
                        </TableCell>
                        <TableCell>
                          {a.origem === "automatico" ? "Automático" : `Manual${a.enviado_por_nome ? ` (${a.enviado_por_nome})` : ""}`}
                        </TableCell>
                        <TableCell>{a.copia_diretoria ? "Diretoria" : "Não"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </DataTable>
              </TableScrollWrap>
            )}
          </PageCardContent>
        </PageCard>
      )}
    </>
  );
}
