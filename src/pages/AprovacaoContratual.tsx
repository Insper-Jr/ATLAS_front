import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useLogoInsperJr } from "@/lib/logo-insper-jr";
import { getAprovacao, getTextoAprovacao, responderAprovacao, urlArquivoAprovacao } from "@/lib/contratos";
import type { AprovacaoPublica } from "@/types/contratos";
import { ROTULO_TIPO_DOCUMENTO } from "@/types/contratos";
import { PageButton, PageButtonSm, ErrorText, PageLoadingBlock } from "@/styles/page.styled";
import { FieldGroup, FieldLabel, FieldTextarea } from "./Bancas.styled";
import { ListaRemoverBotao } from "./projetos/ProjetoContratos.styled";
import {
  AprovacaoWrapper,
  AprovacaoHeader,
  AprovacaoLogo,
  AprovacaoTitulo,
  AprovacaoCorpo,
  VisualizadorPdf,
  AprovacaoPainel,
  AprovacaoAcoes,
  AprovacaoCentro,
  TextoDocumentoTitulo,
  TextoDocumentoBloco,
  BotaoCitarFlutuante,
  TrechosCitadosLista,
  TrechoCitadoLinha,
} from "./AprovacaoContratual.styled";

const MAXIMO_TRECHOS = 20;

/**
 * ⭐ 2026-09-18 — a tela pública de aprovação (§ Contratos), sem login: quem
 * recebe o link (o representante do cliente) vê o PDF gerado e decide
 * aprovar ou pedir ajuste.
 *
 * ⭐ 2026-09-20 — citar um trecho é por SELEÇÃO de texto, não digitação: o
 * PDF num `<iframe>` não expõe seleção pro JavaScript da página (é um
 * documento à parte, renderizado pelo navegador), então o texto também vai
 * em blocos HTML normais — só ali dá pra selecionar e o botão flutuante
 * "Citar este trecho" aparece perto da seleção.
 *
 * Precisa estar registrada como rota PÚBLICA no `App.tsx`, acima do
 * `PrivateRoute` — é o destino do link que vai no WhatsApp/e-mail, e quem
 * abre não tem conta no ATLAS.
 */
export function AprovacaoContratual() {
  const insperJrLogo = useLogoInsperJr("horizontal");
  const { token = "" } = useParams<{ token: string }>();
  const [info, setInfo] = useState<AprovacaoPublica | null>(null);
  const [paragrafos, setParagrafos] = useState<string[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [respondido, setRespondido] = useState<"aprovado" | "alteracao" | null>(null);

  const [modo, setModo] = useState<"nenhum" | "alteracao">("nenhum");
  const [texto, setTexto] = useState("");
  const [trechos, setTrechos] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);

  const textoRef = useRef<HTMLDivElement>(null);
  const [botaoCitar, setBotaoCitar] = useState<{ x: number; y: number; texto: string } | null>(null);

  useEffect(() => {
    Promise.all([getAprovacao(token), getTextoAprovacao(token)])
      .then(([aprovacao, { paragrafos: p }]) => {
        setInfo(aprovacao);
        setParagrafos(p);
      })
      .catch((err) => setErro(err instanceof Error ? err.message : "Link inválido"))
      .finally(() => setCarregando(false));
  }, [token]);

  // Só escuta seleção enquanto a caixa de citar trechos está aberta — fora
  // dela, selecionar texto da página (pra copiar algo, por exemplo) não deve
  // fazer um botão flutuante aparecer do nada.
  useEffect(() => {
    if (modo !== "alteracao") return;

    function aoSelecionar() {
      const selecao = window.getSelection();
      const texto = selecao?.toString().trim() ?? "";
      if (!selecao || !texto || selecao.rangeCount === 0 || !textoRef.current?.contains(selecao.anchorNode)) {
        setBotaoCitar(null);
        return;
      }
      const rect = selecao.getRangeAt(0).getBoundingClientRect();
      setBotaoCitar({ x: rect.left + rect.width / 2, y: rect.top - 8, texto });
    }

    document.addEventListener("selectionchange", aoSelecionar);
    return () => document.removeEventListener("selectionchange", aoSelecionar);
  }, [modo]);

  function citarTrechoSelecionado() {
    if (!botaoCitar) return;
    if (trechos.length < MAXIMO_TRECHOS && !trechos.includes(botaoCitar.texto)) {
      setTrechos((atuais) => [...atuais, botaoCitar.texto]);
    }
    window.getSelection()?.removeAllRanges();
    setBotaoCitar(null);
  }

  async function handleAprovar() {
    setEnviando(true);
    setErro("");
    try {
      await responderAprovacao(token, { acao: "aprovar" });
      setRespondido("aprovado");
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao registrar aprovação");
    } finally {
      setEnviando(false);
    }
  }

  async function handleSolicitarAlteracao() {
    if (!texto.trim()) {
      setErro("Descreva o que precisa ser ajustado.");
      return;
    }
    setEnviando(true);
    setErro("");
    try {
      await responderAprovacao(token, { acao: "alteracao", texto: texto.trim(), trechos });
      setRespondido("alteracao");
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao enviar o pedido de alteração");
    } finally {
      setEnviando(false);
    }
  }

  if (carregando) return <PageLoadingBlock />;

  if (erro && !info) {
    return (
      <AprovacaoWrapper>
        <AprovacaoCentro>
          <ErrorText>{erro}</ErrorText>
        </AprovacaoCentro>
      </AprovacaoWrapper>
    );
  }

  if (!info) return null;

  const jaRespondido = info.usado || respondido !== null;

  return (
    <AprovacaoWrapper>
      <AprovacaoHeader>
        <AprovacaoLogo src={insperJrLogo} alt="Insper Jr." />
        <AprovacaoTitulo>
          <h1>{info.nome_projeto}</h1>
          <span>{ROTULO_TIPO_DOCUMENTO[info.tipo_documento]}</span>
        </AprovacaoTitulo>
      </AprovacaoHeader>

      <AprovacaoCorpo>
        <VisualizadorPdf src={urlArquivoAprovacao(token)} title="Documento para aprovação" />

        {jaRespondido ? (
          <AprovacaoPainel>
            {respondido === "aprovado" ? (
              <p>Documento aprovado. Obrigado! A Insper Jr já foi avisada.</p>
            ) : respondido === "alteracao" ? (
              <p>Pedido de alteração enviado. A Insper Jr vai revisar e enviar uma nova versão em breve.</p>
            ) : (
              <p>Este link já foi usado — a resposta já foi registrada anteriormente.</p>
            )}
          </AprovacaoPainel>
        ) : (
          <AprovacaoPainel>
            {erro && <ErrorText>{erro}</ErrorText>}

            {modo === "nenhum" ? (
              <AprovacaoAcoes>
                <PageButton type="button" disabled={enviando} onClick={handleAprovar}>
                  {enviando ? "Enviando..." : "Aprovar documento"}
                </PageButton>
                <PageButton type="button" $variant="outline" onClick={() => setModo("alteracao")}>
                  Solicitar alteração
                </PageButton>
              </AprovacaoAcoes>
            ) : (
              <>
                <FieldGroup>
                  <FieldLabel htmlFor="texto-alteracao">O que precisa ser ajustado?</FieldLabel>
                  <FieldTextarea
                    id="texto-alteracao"
                    rows={4}
                    value={texto}
                    onChange={(e) => setTexto(e.target.value)}
                    autoFocus
                  />
                </FieldGroup>

                <FieldGroup>
                  <TextoDocumentoTitulo>Selecione um trecho abaixo pra citar (opcional)</TextoDocumentoTitulo>
                  <TextoDocumentoBloco ref={textoRef}>
                    {paragrafos.map((p, i) => (
                      <p key={i}>{p}</p>
                    ))}
                  </TextoDocumentoBloco>

                  {trechos.length > 0 && (
                    <TrechosCitadosLista>
                      {trechos.map((trecho, i) => (
                        <TrechoCitadoLinha key={i}>
                          <blockquote>{trecho}</blockquote>
                          <ListaRemoverBotao
                            type="button"
                            aria-label="Remover trecho citado"
                            onClick={() => setTrechos((atuais) => atuais.filter((_, j) => j !== i))}
                          >
                            ×
                          </ListaRemoverBotao>
                        </TrechoCitadoLinha>
                      ))}
                    </TrechosCitadosLista>
                  )}
                </FieldGroup>

                <AprovacaoAcoes>
                  <PageButtonSm type="button" $variant="outline" onClick={() => setModo("nenhum")} disabled={enviando}>
                    Voltar
                  </PageButtonSm>
                  <PageButton type="button" disabled={enviando} onClick={handleSolicitarAlteracao}>
                    {enviando ? "Enviando..." : "Enviar pedido de alteração"}
                  </PageButton>
                </AprovacaoAcoes>
              </>
            )}
          </AprovacaoPainel>
        )}
      </AprovacaoCorpo>

      {botaoCitar && (
        <BotaoCitarFlutuante
          type="button"
          style={{ left: botaoCitar.x, top: botaoCitar.y, transform: "translate(-50%, -100%)" }}
          // `onMouseDown` (não `onClick`): o `mouseup` da seleção dispara
          // ANTES do click, e um clique comum já teria desfeito a seleção
          // (e escondido este botão) no momento em que o `onClick` rodasse.
          onMouseDown={(e) => {
            e.preventDefault();
            citarTrechoSelecionado();
          }}
        >
          + Citar este trecho
        </BotaoCitarFlutuante>
      )}
    </AprovacaoWrapper>
  );
}
