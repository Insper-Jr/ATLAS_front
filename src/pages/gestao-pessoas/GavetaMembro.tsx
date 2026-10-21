import { useEffect, useState } from "react";
import { Mail, Plus, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { formatarDataHora } from "@/lib/projetos";
import { getGpRegistros, rotuloNucleos, type GpGestao, type GpMembroResumo, type GpRegistro, type GpSituacao } from "@/lib/gestao-pessoas";
import {
  COR_CATEGORIA,
  COR_FAIXA,
  ROTULO_CAMPO_AJUSTE,
  ROTULO_CATEGORIA,
  ROTULO_FAIXA,
  ROTULO_ORIGEM,
  TOM_FAIXA,
  corDosPontos,
  pontosComSinal,
} from "@/lib/gp-rotulos";
import { theme } from "@/styles/theme";
import { EmptyText, ErrorText, PageBadge, PageButton, PageButtonSm } from "@/styles/page.styled";
import { ModalClose, ModalHeader, ModalTitle } from "@/styles/modal.styled";
import {
  Acoes,
  Ajustes,
  BarraFill,
  BarraTrilha,
  GavetaCorpo,
  GavetaOverlay,
  GavetaPainel,
  GavetaSubtitulo,
  Medidor,
  Nota,
  ScoreCard,
  ScoreGrid,
  ScoreTopo,
  ScoreValor,
  Timeline,
  TimelineAcoes,
  TimelineCorpo,
  TimelineItem,
  TimelineMeta,
  TimelinePonto,
  TimelineTitulo,
} from "./GestaoPessoas.styled";
import { formatarDia } from "./calculos";
import { ModalAviso } from "./ModalAviso";
import type { GpContexto } from "./contexto";

export function ScoreCardCategoria({ titulo, situacao }: { titulo: string; situacao: GpSituacao }) {
  return (
    <ScoreCard>
      <ScoreTopo>
        {titulo}
        <PageBadge $tone={TOM_FAIXA[situacao.faixa]}>{ROTULO_FAIXA[situacao.faixa]}</PageBadge>
      </ScoreTopo>
      <ScoreValor>
        {situacao.pontos}
        <small>/{situacao.limite}</small>
      </ScoreValor>
      <Medidor>
        <BarraTrilha>
          <BarraFill $percent={situacao.percentual} $cor={COR_FAIXA[situacao.faixa]} />
        </BarraTrilha>
      </Medidor>
    </ScoreCard>
  );
}

/**
 * A gaveta do membro (spec 5.6): situação nas duas categorias, botões de
 * lançamento e a linha do tempo de registros. Aberta de uma gestão
 * encerrada, vira consulta (sem lançar, corrigir ou retirar).
 */
export function GavetaMembro({
  contexto,
  membroInicial,
  gestao,
  onFechar,
}: {
  contexto: GpContexto;
  membroInicial: GpMembroResumo;
  gestao: GpGestao | null;
  onFechar: () => void;
}) {
  const { token } = useAuth();
  const consulta = !!gestao && !gestao.atual;
  // Na gestão atual o resumo recarrega a cada lançamento; a gaveta lê a
  // versão nova do membro em vez de ficar com o snapshot de quando abriu.
  const membro = consulta
    ? membroInicial
    : (contexto.resumo.membros.find((m) => m.usuario_id === membroInicial.usuario_id) ?? membroInicial);
  const [registros, setRegistros] = useState<GpRegistro[] | null>(null);
  const [erro, setErro] = useState("");
  const [modalAviso, setModalAviso] = useState(false);

  useEffect(() => {
    if (!token) return;
    let vivo = true;
    getGpRegistros(token, { usuario_id: membro.usuario_id, semestre_id: consulta ? gestao?.id : null })
      .then((lista) => vivo && setRegistros(lista))
      .catch((err) => vivo && setErro(err instanceof Error ? err.message : "Erro ao carregar os registros"));
    return () => {
      vivo = false;
    };
  }, [token, membro.usuario_id, consulta, gestao?.id, contexto.versao]);

  useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape" && !modalAviso) onFechar();
    }
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [onFechar, modalAviso]);

  // O modal de aviso fica FORA da gaveta: dentro dela, o clique no véu dele
  // subiria até o véu da gaveta e fecharia os dois.
  return (
    <>
    <GavetaOverlay onClick={onFechar} role="presentation">
      <GavetaPainel onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="gp-gaveta-titulo">
        <ModalHeader>
          <div>
            <ModalTitle id="gp-gaveta-titulo">{membro.nome}</ModalTitle>
            <GavetaSubtitulo>
              {membro.email} · {rotuloNucleos(membro)} · {membro.posicao} ·{" "}
              {membro.ativo ? "Ativo" : "Desativado"}
            </GavetaSubtitulo>
          </div>
          <ModalClose type="button" aria-label="Fechar" onClick={onFechar}>
            <X size={18} />
          </ModalClose>
        </ModalHeader>

        <GavetaCorpo>
          <ScoreGrid>
            <ScoreCardCategoria titulo={ROTULO_CATEGORIA.obrigacoes} situacao={membro.obrigacoes} />
            <ScoreCardCategoria titulo={ROTULO_CATEGORIA.desempenho} situacao={membro.desempenho} />
          </ScoreGrid>

          {consulta && gestao && (
            <Nota>
              Pontos da gestão {gestao.nome} ({formatarDia(gestao.inicio.slice(0, 10))} a{" "}
              {formatarDia(gestao.fim.slice(0, 10))}), apenas para consulta.
            </Nota>
          )}

          {!consulta && (
            <Acoes>
              {membro.ativo && (
                <>
                  <PageButton type="button" onClick={() => contexto.abrirRegistro("obrigacoes", membro)}>
                    <Plus size={14} />
                    Obrigações
                  </PageButton>
                  <PageButton type="button" $variant="outline" onClick={() => contexto.abrirRegistro("desempenho", membro)}>
                    <Plus size={14} />
                    Desempenho
                  </PageButton>
                </>
              )}
              <PageButton type="button" $variant="ghost" onClick={() => setModalAviso(true)}>
                <Mail size={14} />
                Enviar aviso
              </PageButton>
            </Acoes>
          )}

          <div>
            <ScoreTopo style={{ marginBottom: theme.spacing.sm }}>Linha do tempo</ScoreTopo>
            {erro && <ErrorText>{erro}</ErrorText>}
            {!registros && !erro && <EmptyText>Carregando...</EmptyText>}
            {registros && registros.length === 0 && <EmptyText>Nenhum registro.</EmptyText>}
            {registros && registros.length > 0 && (
              <Timeline>
                {registros.map((r) => {
                  const retirado = r.status === "anulado";
                  return (
                    <TimelineItem key={r.id} $esmaecido={retirado}>
                      <TimelinePonto $cor={retirado ? theme.colors.mutedForeground : COR_CATEGORIA[r.categoria]} />
                      <TimelineCorpo>
                        <TimelineTitulo>
                          <strong className={retirado ? "riscado" : undefined}>{r.tipo_nome}</strong>
                          <span style={{ color: corDosPontos(r.pontos), fontWeight: 600 }}>{pontosComSinal(r.pontos)}</span>
                          <PageBadge $tone="muted">{ROTULO_CATEGORIA[r.categoria]}</PageBadge>
                          {retirado && <PageBadge $tone="muted">Retirado</PageBadge>}
                          {!retirado && r.ajustes.length > 0 && <PageBadge $tone="success">Corrigido</PageBadge>}
                          {!consulta && !retirado && (
                            <TimelineAcoes>
                              <PageButtonSm type="button" $variant="ghost" onClick={() => contexto.corrigir(r)}>
                                Corrigir
                              </PageButtonSm>
                              <PageButtonSm type="button" $variant="ghost" onClick={() => contexto.retirar(r)}>
                                Retirar
                              </PageButtonSm>
                            </TimelineAcoes>
                          )}
                        </TimelineTitulo>
                        <TimelineMeta>
                          {formatarDia(r.data)}
                          {r.projeto_nome ? ` · Projeto ${r.projeto_nome}` : ""} · {r.observacao}
                        </TimelineMeta>
                        <TimelineMeta>
                          {r.origem === "manual"
                            ? `Lançado por ${r.lancado_por_nome ?? "diretoria"} em ${formatarDataHora(r.lancado_em)}`
                            : `${ROTULO_ORIGEM[r.origem]}, em ${formatarDataHora(r.lancado_em)}`}
                        </TimelineMeta>
                        {r.ajustes.length > 0 && (
                          <Ajustes>
                            {r.ajustes.map((a) => (
                              <li key={a.id}>
                                <strong>{ROTULO_CAMPO_AJUSTE[a.campo] ?? a.campo}:</strong> {a.antes || "(vazio)"} {"->"}{" "}
                                {a.depois || "(vazio)"} · {a.por_nome ?? "diretoria"}, {formatarDataHora(a.em)}
                                <br />
                                {a.justificativa}
                              </li>
                            ))}
                          </Ajustes>
                        )}
                      </TimelineCorpo>
                    </TimelineItem>
                  );
                })}
              </Timeline>
            )}
          </div>
        </GavetaCorpo>
      </GavetaPainel>
    </GavetaOverlay>

    {modalAviso && (
      <ModalAviso membro={membro} onFechar={() => setModalAviso(false)} onEnviado={() => setModalAviso(false)} />
    )}
    </>
  );
}
