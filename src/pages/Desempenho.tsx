import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";
import { formatNota, getAvaliacoes, getAvaliacoesNotas, getPerguntas, isPerguntaNota, tomDaNota } from "@/lib/avaliacoes";
import { getBancas, getBancasFrentes, getFrentes } from "@/lib/bancas";
import { paraDataUtc } from "@/lib/projetos";
import type {
  Avaliacao,
  AvaliacaoNota,
  Banca,
  BancaFrente,
  Desempenho as DesempenhoDados,
  Frente,
  Pergunta,
} from "@/types/banca";
import { DesempenhoChart, type FatiaDonut } from "@/components/DesempenhoChart";
import {
  PageStack,
  PageCard,
  PageCardHeader,
  PageCardTitle,
  PageCardContent,
  PageButton,
  PageBadge,
  PageLoadingBlock,
  ErrorBlock,
  ErrorText,
} from "@/styles/page.styled";
import {
  ListCardContent,
  ListScrollWrap,
  LIST_MAX_VISIVEIS,
  RowGroup,
  RowDot,
  RowLabel,
  RowMeta,
  EmptyText,
} from "@/styles/shared.styled";
import {
  GreetingHeader,
  GreetingTitle,
  GreetingSubtitle,
  ChartCaption,
  HistoricoRow,
  HistoricoVerLabel,
  ModalOverlay,
  ModalHeader,
  ModalTitle,
  ModalClose,
  ModalBody,
  ModalFooter,
  WideModalContent,
  DetailList,
  DetailRow,
  DetailTerm,
  DetailValue,
  SectionTitle,
  RespostaItem,
  RespostaPergunta,
  RespostaValor,
  ComentarioBlock,
} from "./Desempenho.styled";
import { FUSO, partesEmBrasilia } from "@/lib/fuso";

function saudacao(): string {
  const hora = partesEmBrasilia(new Date()).hora;
  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
}

function formatRespostaTexto(nota: AvaliacaoNota, pergunta?: Pergunta): string {
  if (pergunta && !isPerguntaNota(pergunta.tipo_resposta)) {
    return nota.resposta_texto?.trim() || "—";
  }
  if (nota.nota != null) return formatNota(nota.nota);
  return nota.resposta_texto?.trim() || "—";
}

/** `embutido`: renderizado como aba dentro de Bancas, não como página cheia
 *  — some o `PageStack`/saudação próprios (Bancas já tem os dela) e sobra só
 *  o conteúdo (gráfico + histórico). A rota solta `/dashboard` foi removida
 *  em 2026-10-21 (a pedido): só existia como fallback das guards de
 *  permissão, que agora mandam para `/projetos`. Hoje isto só vive como
 *  aba de Bancas. */
export function Desempenho({ embutido = false }: { embutido?: boolean } = {}) {
  const { usuario, token } = useAuth();
  const [dados, setDados] = useState<DesempenhoDados | null>(null);
  const [bancas, setBancas] = useState<Banca[]>([]);
  const [bancasFrentes, setBancasFrentes] = useState<BancaFrente[]>([]);
  const [frentes, setFrentes] = useState<Frente[]>([]);
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [avaliacoesNotas, setAvaliacoesNotas] = useState<AvaliacaoNota[]>([]);
  const [perguntas, setPerguntas] = useState<Pergunta[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [avaliacaoSelecionada, setAvaliacaoSelecionada] = useState<{
    avaliacao: Avaliacao;
    banca: Banca;
  } | null>(null);

  async function buscar() {
    if (!usuario || !token) return;
    setCarregando(true);
    setErro("");
    try {
      const [desempenho, bancasResp, bancasFrentesResp, frentesResp, avaliacoesResp, notasResp, perguntasResp] =
        await Promise.all([
          apiFetch<DesempenhoDados>(`/usuarios/${usuario.id}/desempenho`, { token }),
          getBancas(token),
          getBancasFrentes(token),
          getFrentes(token),
          getAvaliacoes(token),
          getAvaliacoesNotas(token),
          getPerguntas(token),
        ]);
      setDados(desempenho);
      setBancas(bancasResp);
      setBancasFrentes(bancasFrentesResp);
      setFrentes(frentesResp);
      setAvaliacoes(avaliacoesResp);
      setAvaliacoesNotas(notasResp);
      setPerguntas(perguntasResp);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao carregar desempenho");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    buscar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario, token]);

  if (erro) {
    return (
      <ErrorBlock>
        <ErrorText>Não foi possível carregar o desempenho: {erro}</ErrorText>
        <PageButton $variant="outline" onClick={buscar}>
          Tentar novamente
        </PageButton>
      </ErrorBlock>
    );
  }

  if (carregando || !dados) return <PageLoadingBlock />;

  const bancasPorId = new Map(bancas.map((b) => [b.id, b]));
  const perguntasPorId = new Map(perguntas.map((p) => [p.id, p]));

  const avaliacoesSubmetidas = avaliacoes
    .filter((a) => a.avaliador_id === usuario?.id && a.status === "submetida")
    .map((a) => ({ avaliacao: a, banca: bancasPorId.get(a.banca_id) }))
    .filter((item): item is { avaliacao: Avaliacao; banca: Banca } => !!item.banca)
    // Da mais recente para a mais antiga. Sem data no fim: uma banca
    // avaliada sempre tem data na prática, mas o tipo não garante, e a
    // ordenação não pode depender de "na prática".
    .sort((a, b) => {
      if (!a.banca.data_hora) return b.banca.data_hora ? 1 : 0;
      if (!b.banca.data_hora) return -1;
      return new Date(b.banca.data_hora).getTime() - new Date(a.banca.data_hora).getTime();
    });

  const avaliacoesDoSemestre = avaliacoesSubmetidas.filter((item) => item.banca.semestre_id === dados.semestre_id);

  const pontosPorFrente = new Map<string, { valor: number; itens: string[] }>();
  for (const { banca } of avaliacoesDoSemestre) {
    const frentesDaBanca = bancasFrentes.filter((bf) => bf.banca_id === banca.id);
    const peso = frentesDaBanca.length > 0 ? 1 / frentesDaBanca.length : 0;
    for (const bf of frentesDaBanca) {
      const nome = frentes.find((f) => f.id === bf.frente_id)?.nome ?? "—";
      const atual = pontosPorFrente.get(nome) ?? { valor: 0, itens: [] };
      atual.valor += peso;
      atual.itens.push(banca.nome_projeto);
      pontosPorFrente.set(nome, atual);
    }
  }
  const fatias: FatiaDonut[] = Array.from(pontosPorFrente.entries()).map(([nome, { valor, itens }]) => ({
    nome,
    valor: Math.round(valor * 10) / 10,
    itens,
  }));

  const primeiroNome = usuario?.nome.split(" ")[0];

  const conteudo = (
    <>
      {/* "Últimas bancas atendidas" saiu daqui — era só as 3 primeiras linhas
          do Histórico de avaliações logo abaixo (a mesma lista, já ordenada
          da mais recente pra mais antiga), repetidas num card à parte. */}
      <PageCard>
        <PageCardHeader>
          <PageCardTitle>Porcentagem de bancas atendidas — {dados.semestre_nome}</PageCardTitle>
        </PageCardHeader>
        <PageCardContent>
          <DesempenhoChart fatias={fatias} percentual={dados.percentual} />
          <ChartCaption>
            {dados.bancas_atendidas} de {dados.total_bancas_realizadas} bancas no semestre
          </ChartCaption>
        </PageCardContent>
      </PageCard>

      <PageCard>
        <PageCardHeader>
          <PageCardTitle>Histórico de avaliações</PageCardTitle>
        </PageCardHeader>
        <ListCardContent>
          {avaliacoesSubmetidas.length === 0 && <EmptyText>Nenhuma avaliação enviada ainda.</EmptyText>}
          {avaliacoesSubmetidas.length > 0 && (
            <ListScrollWrap $scrollable={avaliacoesSubmetidas.length > LIST_MAX_VISIVEIS}>
              {avaliacoesSubmetidas.map(({ avaliacao, banca }) => (
                <HistoricoRow
                  key={avaliacao.id}
                  type="button"
                  onClick={() => setAvaliacaoSelecionada({ avaliacao, banca })}
                  aria-label={`Ver formulário enviado para ${banca.nome_projeto}`}
                >
                  <RowGroup>
                    <RowDot aria-hidden />
                    <RowMeta>
                      {banca.data_hora ? paraDataUtc(banca.data_hora).toLocaleDateString("pt-BR", { timeZone: FUSO }) : "Sem data"}
                    </RowMeta>
                    <RowLabel>{banca.nome_projeto}</RowLabel>
                  </RowGroup>
                  <HistoricoVerLabel>Ver respostas</HistoricoVerLabel>
                </HistoricoRow>
              ))}
            </ListScrollWrap>
          )}
        </ListCardContent>
      </PageCard>

      {avaliacaoSelecionada && (
        <VerMinhaAvaliacaoModal
          avaliacao={avaliacaoSelecionada.avaliacao}
          banca={avaliacaoSelecionada.banca}
          notas={avaliacoesNotas.filter((n) => n.avaliacao_id === avaliacaoSelecionada.avaliacao.id)}
          perguntasPorId={perguntasPorId}
          onClose={() => setAvaliacaoSelecionada(null)}
        />
      )}
    </>
  );

  if (embutido) return conteudo;

  return (
    <PageStack>
      <GreetingHeader>
        <GreetingTitle>
          {saudacao()}
          {primeiroNome ? `, ${primeiroNome}!` : "!"}
        </GreetingTitle>
        <GreetingSubtitle>Confira seu desempenho em {dados.semestre_nome}.</GreetingSubtitle>
      </GreetingHeader>
      {conteudo}
    </PageStack>
  );
}

function VerMinhaAvaliacaoModal({
  avaliacao,
  banca,
  notas,
  perguntasPorId,
  onClose,
}: {
  avaliacao: Avaliacao;
  banca: Banca;
  notas: AvaliacaoNota[];
  perguntasPorId: Map<number, Pergunta>;
  onClose: () => void;
}) {
  const respostasOrdenadas = notas
    .map((nota) => ({
      nota,
      pergunta: perguntasPorId.get(nota.pergunta_id),
    }))
    .sort((a, b) => (a.pergunta?.ordem ?? a.nota.pergunta_id) - (b.pergunta?.ordem ?? b.nota.pergunta_id));

  return (
    <ModalOverlay onClick={onClose} role="presentation">
      <WideModalContent onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="minha-avaliacao-titulo">
        <ModalHeader>
          <ModalTitle id="minha-avaliacao-titulo">Meu formulário, {banca.nome_projeto}</ModalTitle>
          <ModalClose type="button" aria-label="Fechar" onClick={onClose}>
            <X size={18} />
          </ModalClose>
        </ModalHeader>
        <ModalBody>
          <DetailList>
            <DetailRow>
              <DetailTerm>Projeto</DetailTerm>
              <DetailValue>{banca.nome_projeto}</DetailValue>
            </DetailRow>
            <DetailRow>
              <DetailTerm>Data da banca</DetailTerm>
              <DetailValue>
                {banca.data_hora ? paraDataUtc(banca.data_hora).toLocaleDateString("pt-BR", { timeZone: FUSO }) : "Sem data"}
              </DetailValue>
            </DetailRow>
            {avaliacao.submetida_em && (
              <DetailRow>
                <DetailTerm>Enviado em</DetailTerm>
                {/* ⚠ `submetida_em` é gravado com `datetime.now()` no
                    backend, que no servidor devolve UTC — cru, `new Date`
                    lia a string sem fuso como se já fosse local e mostrava
                    o horário de Greenwich como se fosse daqui. `paraDataUtc`
                    (mesma conversão de `banca.data_hora` acima) força a
                    leitura como UTC antes de formatar. */}
                <DetailValue>{paraDataUtc(avaliacao.submetida_em).toLocaleString("pt-BR", { timeZone: FUSO })}</DetailValue>
              </DetailRow>
            )}
          </DetailList>

          <SectionTitle>Suas respostas</SectionTitle>
          {respostasOrdenadas.length === 0 && <EmptyText>Nenhuma resposta registrada.</EmptyText>}
          {respostasOrdenadas.map(({ nota, pergunta }) => (
            <RespostaItem key={nota.id}>
              <RespostaPergunta>{pergunta?.texto ?? `Pergunta ${nota.pergunta_id}`}</RespostaPergunta>
              <RespostaValor>
                {/* Mesmo badge colorido do Dashboard Bancas (2026-09-15, a
                    pedido): antes a nota aqui era só texto puro, sem cor
                    nenhuma — as duas telas mostram o mesmo dado de jeitos
                    diferentes. */}
                {nota.nota != null ? (
                  <PageBadge $tone={tomDaNota(nota.nota)}>{formatNota(nota.nota)}</PageBadge>
                ) : (
                  formatRespostaTexto(nota, pergunta)
                )}
              </RespostaValor>
            </RespostaItem>
          ))}

          {avaliacao.comentario_feedback && (
            <>
              <SectionTitle>Comentário adicional</SectionTitle>
              <ComentarioBlock>{avaliacao.comentario_feedback}</ComentarioBlock>
            </>
          )}
        </ModalBody>
        <ModalFooter>
          <PageButton $variant="outline" type="button" onClick={onClose}>
            Fechar
          </PageButton>
        </ModalFooter>
      </WideModalContent>
    </ModalOverlay>
  );
}
