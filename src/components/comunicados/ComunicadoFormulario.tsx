import { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { useAuth } from "@/context/AuthContext";
import { getBancas, type FiltroCargaBancas } from "@/lib/bancas";
import {
  ASSUNTO_MAX,
  MENSAGEM_MAX,
  enviarComunicado,
  getDestinatariosComunicado,
  type DestinatarioComunicado,
  type FiltroComunicado,
  type SegmentoComunicado,
} from "@/lib/comunicados";
import { getLotes } from "@/lib/desempenho-lotes";
import { getPosicoesPermissoes } from "@/lib/posicoes-permissoes";
import { paraDataUtc } from "@/lib/projetos";
import { getUsuarios } from "@/lib/usuarios";
import type { PosicaoPermissao, UsuarioResumo } from "@/types/auth";
import type { Banca } from "@/types/banca";
import type { DesempenhoLote } from "@/types/desempenho";
import { theme } from "@/styles/theme";
import {
  FieldContador,
  FieldGroup,
  FieldHint,
  FieldInput,
  FieldLabel,
  FieldLabelRow,
  FieldSelect,
  FieldTextarea,
  FormErrorText,
  FormStack,
} from "@/pages/Bancas.styled";
import { EmptyText, PageButton } from "@/styles/page.styled";

const ROTULO_SEGMENTO: Record<SegmentoComunicado, string> = {
  zero_bancas: "Quem está com 0 bancas",
  bancas_acima_de: "Quem tem N ou mais bancas",
  pendentes_do_lote: "Quem ainda não respondeu um formulário de desempenho",
  inscritos_da_banca: "Inscritos numa banca",
  por_posicao: "Por posição",
  todos: "Todo mundo ativo",
  manual: "Pessoas escolhidas à mão",
};

const ROTULO_FILTRO_BANCAS: Record<FiltroCargaBancas, string> = {
  todas: "Já atendidas + futuras",
  realizadas: "Só já atendidas",
  futuras: "Só futuras",
};

const Lista = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xs};
  max-height: 14rem;
  overflow-y: auto;
  padding: ${theme.spacing.sm};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.borderRadius.md};
  background: ${theme.colors.muted};
`;

const Linha = styled.label<{ $apagada?: boolean }>`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  font-size: ${theme.fontSize.sm};
  color: ${({ $apagada }) => ($apagada ? theme.colors.mutedForeground : theme.colors.foreground)};
  text-decoration: ${({ $apagada }) => ($apagada ? "line-through" : "none")};
  cursor: pointer;
`;

const LinhaMeta = styled.span`
  margin-left: auto;
  font-size: ${theme.fontSize.xs};
  color: ${theme.colors.mutedForeground};
  white-space: nowrap;
`;

const Chips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.sm};
`;

const Acoes = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${theme.spacing.sm};
`;

function dataCurta(iso: string | null): string {
  if (!iso) return "sem data";
  return paraDataUtc(iso).toLocaleDateString("pt-BR");
}

/**
 * O formulário do comunicado manual da aba Comunicados (Sistema): escolher
 * quem recebe, escrever assunto e mensagem, conferir a lista e mandar. Sai
 * pelo sino e por e-mail, igual a qualquer notificação.
 *
 * A prévia e o envio batem na mesma regra do backend; desmarcar alguém na
 * lista vira `excluir_ids`.
 */
export function ComunicadoFormulario({ onEnviado }: { onEnviado: (enviados: number) => void }) {
  const { token } = useAuth();

  const [segmento, setSegmento] = useState<SegmentoComunicado>("zero_bancas");
  const [filtroBancas, setFiltroBancas] = useState<FiltroCargaBancas>("todas");
  const [minimoBancas, setMinimoBancas] = useState<string>("3");
  const [loteId, setLoteId] = useState<number | null>(null);
  const [bancaId, setBancaId] = useState<number | null>(null);
  const [soConfirmados, setSoConfirmados] = useState(false);
  const [posicoes, setPosicoes] = useState<string[]>([]);
  const [usuarioIds, setUsuarioIds] = useState<number[]>([]);
  const [buscaPessoa, setBuscaPessoa] = useState("");
  const [excluidos, setExcluidos] = useState<Set<number>>(new Set());
  const [assunto, setAssunto] = useState("");
  const [mensagem, setMensagem] = useState("");

  const [catalogo, setCatalogo] = useState<PosicaoPermissao[]>([]);
  const [pessoas, setPessoas] = useState<UsuarioResumo[]>([]);
  const [lotes, setLotes] = useState<DesempenhoLote[]>([]);
  const [bancas, setBancas] = useState<Banca[]>([]);
  const [previa, setPrevia] = useState<{ rotulo: string; destinatarios: DestinatarioComunicado[] } | null>(null);
  const [previaErro, setPreviaErro] = useState("");
  const [previaCarregando, setPreviaCarregando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");


  const filtro = useMemo<FiltroComunicado>(() => {
    const minimo = Number.parseInt(minimoBancas, 10);
    return {
      segmento,
      filtro_bancas: filtroBancas,
      minimo_bancas: Number.isFinite(minimo) && minimo >= 1 ? minimo : null,
      lote_id: loteId,
      banca_id: bancaId,
      so_confirmados: soConfirmados,
      posicoes,
      usuario_ids: usuarioIds,
    };
  }, [segmento, filtroBancas, minimoBancas, loteId, bancaId, soConfirmados, posicoes, usuarioIds]);

  // Listas de apoio: só carregam quando o segmento pede, e uma vez só.
  useEffect(() => {
    if (!token) return;
    if (segmento === "por_posicao" && catalogo.length === 0) {
      getPosicoesPermissoes(token).then(setCatalogo).catch(() => setCatalogo([]));
    }
    if (segmento === "manual" && pessoas.length === 0) {
      getUsuarios(token)
        .then((lista) => setPessoas(lista.filter((u) => u.ativo)))
        .catch(() => setPessoas([]));
    }
    if (segmento === "pendentes_do_lote" && lotes.length === 0) {
      getLotes(token, false)
        .then((lista) =>
          // Abertos primeiro, depois do mais recente pro mais antigo.
          setLotes(
            [...lista].sort((a, b) =>
              a.aberto === b.aberto ? b.data_fim.localeCompare(a.data_fim) : a.aberto ? -1 : 1,
            ),
          ),
        )
        .catch(() => setLotes([]));
    }
    if (segmento === "inscritos_da_banca" && bancas.length === 0) {
      getBancas(token)
        .then((lista) =>
          setBancas(
            lista
              .filter((b) => !b.cancelada_em)
              .sort((a, b) => (b.data_hora ?? "").localeCompare(a.data_hora ?? "")),
          ),
        )
        .catch(() => setBancas([]));
    }
  }, [segmento, token, catalogo.length, pessoas.length, lotes.length, bancas.length]);

  // O recorte ainda não dá pra resolver (falta o mínimo, a posição, a
  // pessoa, o lote, a banca). Derivado, não estado.
  const incompleto =
    (segmento === "bancas_acima_de" && filtro.minimo_bancas == null) ||
    (segmento === "pendentes_do_lote" && loteId == null) ||
    (segmento === "inscritos_da_banca" && bancaId == null) ||
    (segmento === "por_posicao" && posicoes.length === 0) ||
    (segmento === "manual" && usuarioIds.length === 0);

  // Prévia a cada mudança de filtro, com uma pausa curta pra não bater no
  // backend a cada tecla no "mínimo de bancas". O "carregando" entra dentro
  // do timer, junto com o fetch, pra não haver setState síncrono no efeito.
  useEffect(() => {
    if (!token || incompleto) return;
    let ativo = true;
    const timer = window.setTimeout(() => {
      setPreviaCarregando(true);
      getDestinatariosComunicado(filtro, token)
        .then((r) => {
          if (!ativo) return;
          setPrevia(r);
          setPreviaErro("");
        })
        .catch((err: unknown) => {
          if (!ativo) return;
          setPrevia(null);
          setPreviaErro(err instanceof Error ? err.message : "Erro ao montar a lista");
        })
        .finally(() => {
          if (ativo) setPreviaCarregando(false);
        });
    }, 300);
    return () => {
      ativo = false;
      window.clearTimeout(timer);
    };
  }, [filtro, token, incompleto]);

  // Trocar o recorte zera quem foi desmarcado: a lista é outra.
  function trocarSegmento(novo: SegmentoComunicado) {
    setSegmento(novo);
    setExcluidos(new Set());
  }

  const nomePosicao = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const p of catalogo) mapa.set(p.posicao, p.nome);
    return mapa;
  }, [catalogo]);

  const previaVisivel = incompleto ? null : previa;
  const destinatariosFinais = (previaVisivel?.destinatarios ?? []).filter((d) => !excluidos.has(d.usuario_id));

  const pessoasVisiveis = useMemo(() => {
    const termo = buscaPessoa.trim().toLowerCase();
    const base = termo ? pessoas.filter((u) => u.nome.toLowerCase().includes(termo)) : pessoas;
    return [...base].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [pessoas, buscaPessoa]);

  function alternarExcluido(id: number) {
    setExcluidos((atual) => {
      const prox = new Set(atual);
      if (prox.has(id)) prox.delete(id);
      else prox.add(id);
      return prox;
    });
  }

  function alternarPosicao(slug: string) {
    setPosicoes((atual) => (atual.includes(slug) ? atual.filter((p) => p !== slug) : [...atual, slug]));
  }

  function alternarPessoa(id: number) {
    setUsuarioIds((atual) => (atual.includes(id) ? atual.filter((p) => p !== id) : [...atual, id]));
  }

  async function handleEnviar(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    if (!assunto.trim() || !mensagem.trim()) {
      setErro("Preencha assunto e mensagem.");
      return;
    }
    if (destinatariosFinais.length === 0) {
      setErro("Ninguém na lista pra receber.");
      return;
    }
    setEnviando(true);
    setErro("");
    try {
      const r = await enviarComunicado(
        { ...filtro, excluir_ids: [...excluidos], assunto: assunto.trim(), mensagem: mensagem.trim() },
        token,
      );
      onEnviado(r.enviados);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao enviar o comunicado");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <FormStack onSubmit={handleEnviar}>
      <FieldGroup>
        <FieldLabel htmlFor="comunicado-segmento">Quem recebe</FieldLabel>
        <FieldSelect
          id="comunicado-segmento"
          value={segmento}
          onChange={(e) => trocarSegmento(e.target.value as SegmentoComunicado)}
        >
          {(Object.keys(ROTULO_SEGMENTO) as SegmentoComunicado[]).map((s) => (
            <option key={s} value={s}>
              {ROTULO_SEGMENTO[s]}
            </option>
          ))}
        </FieldSelect>
      </FieldGroup>

      {(segmento === "zero_bancas" || segmento === "bancas_acima_de") && (
        <FieldGroup>
          <FieldLabel htmlFor="comunicado-filtro-bancas">Contando quais bancas</FieldLabel>
          <FieldSelect
            id="comunicado-filtro-bancas"
            value={filtroBancas}
            onChange={(e) => setFiltroBancas(e.target.value as FiltroCargaBancas)}
          >
            {(Object.keys(ROTULO_FILTRO_BANCAS) as FiltroCargaBancas[]).map((f) => (
              <option key={f} value={f}>
                {ROTULO_FILTRO_BANCAS[f]}
              </option>
            ))}
          </FieldSelect>
          <FieldHint>O mesmo recorte da tabela "Carga de bancas por pessoa". Cancelada não conta.</FieldHint>
        </FieldGroup>
      )}

      {segmento === "bancas_acima_de" && (
        <FieldGroup>
          <FieldLabel htmlFor="comunicado-minimo">Mínimo de bancas</FieldLabel>
          <FieldInput
            id="comunicado-minimo"
            type="number"
            min={1}
            value={minimoBancas}
            onChange={(e) => setMinimoBancas(e.target.value)}
            style={{ width: "8rem" }}
          />
        </FieldGroup>
      )}

      {segmento === "pendentes_do_lote" && (
        <FieldGroup>
          <FieldLabel htmlFor="comunicado-lote">Formulário de desempenho</FieldLabel>
          <FieldSelect
            id="comunicado-lote"
            value={loteId ?? ""}
            onChange={(e) => {
              setLoteId(e.target.value ? Number(e.target.value) : null);
              setExcluidos(new Set());
            }}
          >
            <option value="">Escolha um formulário</option>
            {lotes.map((l) => (
              <option key={l.id} value={l.id}>
                {l.nome}
                {l.aberto ? " (aberto)" : ""}
              </option>
            ))}
          </FieldSelect>
        </FieldGroup>
      )}

      {segmento === "inscritos_da_banca" && (
        <FieldGroup>
          <FieldLabel htmlFor="comunicado-banca">Banca</FieldLabel>
          <FieldSelect
            id="comunicado-banca"
            value={bancaId ?? ""}
            onChange={(e) => {
              setBancaId(e.target.value ? Number(e.target.value) : null);
              setExcluidos(new Set());
            }}
          >
            <option value="">Escolha uma banca</option>
            {bancas.map((b) => (
              <option key={b.id} value={b.id}>
                {b.nome_projeto} · {dataCurta(b.data_hora)}
              </option>
            ))}
          </FieldSelect>
        </FieldGroup>
      )}

      {segmento === "inscritos_da_banca" && (
        <FieldGroup>
          <Linha>
            <input type="checkbox" checked={soConfirmados} onChange={(e) => setSoConfirmados(e.target.checked)} />
            Só quem confirmou presença
          </Linha>
        </FieldGroup>
      )}

      {segmento === "por_posicao" && (
        <FieldGroup>
          <FieldLabel>Posições</FieldLabel>
          {catalogo.length === 0 ? (
            <EmptyText>Carregando posições...</EmptyText>
          ) : (
            <Chips>
              {catalogo.map((p) => (
                <Linha key={p.posicao}>
                  <input
                    type="checkbox"
                    checked={posicoes.includes(p.posicao)}
                    onChange={() => alternarPosicao(p.posicao)}
                  />
                  {p.nome}
                </Linha>
              ))}
            </Chips>
          )}
          <FieldHint>Vale a posição principal ou o cargo extra, igual às permissões.</FieldHint>
        </FieldGroup>
      )}

      {segmento === "manual" && (
        <FieldGroup>
          <FieldLabelRow>
            <FieldLabel htmlFor="comunicado-busca">Pessoas</FieldLabel>
            <FieldContador>{usuarioIds.length} escolhida(s)</FieldContador>
          </FieldLabelRow>
          <FieldInput
            id="comunicado-busca"
            type="search"
            placeholder="Buscar por nome"
            value={buscaPessoa}
            onChange={(e) => setBuscaPessoa(e.target.value)}
          />
          {pessoas.length === 0 ? (
            <EmptyText>Carregando pessoas...</EmptyText>
          ) : (
            <Lista>
              {pessoasVisiveis.map((u) => (
                <Linha key={u.id}>
                  <input type="checkbox" checked={usuarioIds.includes(u.id)} onChange={() => alternarPessoa(u.id)} />
                  {u.nome}
                  <LinhaMeta>{nomePosicao.get(u.posicao) ?? u.posicao}</LinhaMeta>
                </Linha>
              ))}
              {pessoasVisiveis.length === 0 && <EmptyText>Ninguém com esse nome.</EmptyText>}
            </Lista>
          )}
        </FieldGroup>
      )}

      {/* Escolhendo à mão, a seleção acima já é a lista: repetir embaixo só
          duplicava as mesmas pessoas (2026-10-12). Nos outros recortes a lista
          mostra quem o filtro achou e deixa desmarcar. */}
      {segmento === "manual" ? (
        previaErro && !incompleto ? <FormErrorText>{previaErro}</FormErrorText> : null
      ) : (
        <FieldGroup>
          <FieldLabelRow>
            <FieldLabel>Lista de destinatários</FieldLabel>
            <FieldContador>
              {previaCarregando
                ? "Montando..."
                : previaVisivel
                  ? `${destinatariosFinais.length} de ${previaVisivel.destinatarios.length}`
                  : ""}
            </FieldContador>
          </FieldLabelRow>
          {previaErro && !incompleto ? (
            <FormErrorText>{previaErro}</FormErrorText>
          ) : !previaVisivel ? (
            <EmptyText>Complete o recorte acima pra ver quem recebe.</EmptyText>
          ) : previaVisivel.destinatarios.length === 0 ? (
            <EmptyText>Ninguém neste recorte.</EmptyText>
          ) : (
            <>
              <FieldHint>{previaVisivel.rotulo}. Desmarque quem não deve receber.</FieldHint>
              <Lista>
                {previaVisivel.destinatarios.map((d) => (
                  <Linha key={d.usuario_id} $apagada={excluidos.has(d.usuario_id)}>
                    <input
                      type="checkbox"
                      checked={!excluidos.has(d.usuario_id)}
                      onChange={() => alternarExcluido(d.usuario_id)}
                    />
                    {d.nome}
                    <LinhaMeta>
                      {d.detalhe ? `${d.detalhe} · ` : ""}
                      {d.email}
                    </LinhaMeta>
                  </Linha>
                ))}
              </Lista>
            </>
          )}
        </FieldGroup>
      )}

      <FieldGroup>
        <FieldLabelRow>
          <FieldLabel htmlFor="comunicado-assunto">Assunto</FieldLabel>
          <FieldContador>
            {assunto.length}/{ASSUNTO_MAX}
          </FieldContador>
        </FieldLabelRow>
        <FieldInput
          id="comunicado-assunto"
          value={assunto}
          maxLength={ASSUNTO_MAX}
          onChange={(e) => setAssunto(e.target.value)}
          required
        />
        <FieldHint>Vira o título no sino e o assunto do e-mail, com o prefixo [ATLAS].</FieldHint>
      </FieldGroup>

      <FieldGroup>
        <FieldLabelRow>
          <FieldLabel htmlFor="comunicado-mensagem">Mensagem</FieldLabel>
          <FieldContador>
            {mensagem.length}/{MENSAGEM_MAX}
          </FieldContador>
        </FieldLabelRow>
        <FieldTextarea
          id="comunicado-mensagem"
          value={mensagem}
          maxLength={MENSAGEM_MAX}
          rows={6}
          onChange={(e) => setMensagem(e.target.value)}
          required
        />
        <FieldHint>Texto puro, com quebra de linha. O e-mail termina com "Enviado por" e o seu nome.</FieldHint>
      </FieldGroup>

      {erro && <FormErrorText>{erro}</FormErrorText>}

      <Acoes>
        <PageButton type="submit" disabled={enviando || previaCarregando || destinatariosFinais.length === 0}>
          {enviando
            ? "Enviando..."
            : `Enviar para ${destinatariosFinais.length} ${destinatariosFinais.length === 1 ? "pessoa" : "pessoas"}`}
        </PageButton>
      </Acoes>
    </FormStack>
  );
}
