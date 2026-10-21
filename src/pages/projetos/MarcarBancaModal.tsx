import { useState } from "react";
import { X } from "lucide-react";
import {
  ModalBody,
  ModalClose,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  ModalTitle,
} from "@/styles/modal.styled";
import { PageButton } from "@/styles/page.styled";
import { formatarData } from "@/lib/projetos";
import { solicitarExcecaoChoque, solicitarForaJanela, solicitarRemarcacao } from "@/lib/bancas";
import { useAuth } from "@/context/AuthContext";
import {
  AvisoBanner,
  EscopoOpcao,
  EscopoPicker,
  FieldGroup,
  FieldInput,
  FieldLabel,
  FormErrorText,
} from "./Projetos.styled";
import { instanteDeBrasilia } from "@/lib/fuso";

/** Abaixo desta folga, o texto do modal avisa que os avaliadores já estão
 *  escalados. Não muda mais o fluxo — TODA remarcação por quem não é da
 *  diretoria passa por pedido (2026-09-10) —, é só contexto para quem lê. */
const FOLGA_LIVRE_DIAS_UTEIS = 5;

/** O mínimo que o seletor de cobertura precisa saber de cada escopo. */
export interface EscopoCobrivel {
  id: number;
  nome: string;
  frente_id: number;
  status: string;
  /** A banca que já cobre este escopo, se houver. */
  bancaId?: number | null;
}

interface Props {
  nomeEscopo: string;
  /** Os escopos do projeto, a banca pode cobrir mais de um. */
  escoposDoProjeto: EscopoCobrivel[];
  /** O id do escopo em foco (entra na cobertura sempre). */
  escopoId: number;
  /** A banca atual deste escopo, para saber quais outros já são dela. */
  bancaAtualId?: number | null;
  nomeFrente: (id: number) => string;
  /** O dia clicado no calendário, em `yyyy-MM-dd`. */
  dia: string;
  /** A banca já tem data, então isto é uma REMARCAÇÃO, não a primeira. */
  jaTemData: boolean;
  /** O último dia da janela do escopo; fora dela só a diretoria marca. */
  fimJanela: string | null;
  /** Dias úteis até a banca ATUAL acontecer. `null` quando ela não tem data. */
  folgaAtual: number | null;
  ehDiretor: boolean;
  onCancelar: () => void;
  /** Se rejeitar, a mensagem do backend aparece no próprio formulário. */
  onConfirmar: (
    justificativa: string,
    horario: string,
    escopoIds: number[],
  ) => Promise<void> | void;
}

/**
 * A banca marcada pelo calendário, "uma data só": escreve na MESMA
 * linha que a tela de Bancas lê, sem espelho nem sincronização.
 *
 * **É o único bloqueio duro do cronograma.** Pintar etapa além da janela é
 * livre e só avisa; marcar banca fora dela não passa sem autorização, e
 * a tela barra antes de enviar quando dá pra prever (em cima da hora), em
 * vez de deixar o 422 explicar depois.
 *
 * A justificativa é exigida em dois casos, e por motivos diferentes:
 *
 * - a data cai **fora da janela** do escopo — exige um pedido aprovado pela
 *   diretoria (§13), em ato separado; nem ela marca sozinha;
 * - é uma **remarcação** (a banca já tem data) — remarcar nunca é silencioso,
 *   e desde 2026-09-10 quem não é da diretoria não remarca sozinho: o botão
 *   vira "Pedir remarcação à diretoria", e a aprovação é que remarca.
 *
 * Quem decide de verdade continua sendo o backend: se ele recusar por fora da
 * janela, o botão de pedir autorização aparece aqui embaixo.
 */
export function MarcarBancaModal({
  nomeEscopo,
  escoposDoProjeto,
  escopoId,
  bancaAtualId,
  nomeFrente,
  dia,
  jaTemData,
  fimJanela,
  folgaAtual,
  ehDiretor,
  onCancelar,
  onConfirmar,
}: Props) {
  const [justificativa, setJustificativa] = useState("");
  /**
   * Os OUTROS escopos que esta banca passa a cobrir.
   *
   * Vive aqui, e não numa tela à parte, porque a cobertura muda o que a data
   * significa: uma banca que cobre dois escopos precisa caber na janela dos
   * dois, e a composição exigida passa a somar as frentes dos dois.
   */
  const { token } = useAuth();
  const [cobertos, setCobertos] = useState<number[]>(
    escoposDoProjeto.filter((e) => e.id !== escopoId && e.bancaId && e.bancaId === bancaAtualId)
      .map((e) => e.id),
  );
  // 14h é o horário padrão das bancas; editável porque a trava de choque de
  // horário do  compara data E hora, sem o campo, duas bancas do mesmo dia
  // colidiriam sempre.
  const [horario, setHorario] = useState("14:00");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  /**
   * ⭐ Ligado quando o backend recusa por CHOQUE de horário (§8).
   *
   * ⚠ Reagir à recusa, e não antecipá-la: o front não tem a lista de bancas de
   * todos os projetos — só o backend sabe se aquele horário está ocupado. Sem
   * isto, a pessoa lia "a exceção é da diretoria" e não tinha o que fazer, que
   * é exatamente o beco que este fluxo fecha.
   */
  const [choque, setChoque] = useState(false);
  const [pedindo, setPedindo] = useState(false);
  const [pedido, setPedido] = useState(false);
  /**
   * ⭐ Ligado quando o backend recusa por estar FORA DA JANELA sem
   * autorização (§13).
   *
   * ⚠ Reagir à recusa, e não bloquear de antemão: marcar fora da janela não
   * é mais um atalho de diretor — nem ela marca sozinha, precisa de um
   * pedido aprovado separadamente (`fora_janela`). O front não sabe se já
   * existe uma autorização aprovada para este par (escopo, data); quem sabe
   * é o backend, então a tentativa de marcar é que revela se falta pedir.
   */
  const [foraJanelaNegada, setForaJanelaNegada] = useState(false);
  const [pedindoJanela, setPedindoJanela] = useState(false);
  const [pedidoJanela, setPedidoJanela] = useState(false);
  /** ⭐ 2026-09-10: o pedido de remarcação (§13). Diferente de `foraJanelaNegada`,
   *  este não reage a um 422 — a regra é conhecida no cliente (é remarcação e
   *  quem edita não é diretoria), então o botão já nasce sendo "Pedir
   *  remarcação à diretoria". */
  const [pedindoRemarcacao, setPedindoRemarcacao] = useState(false);
  const [pedidoRemarcacao, setPedidoRemarcacao] = useState(false);

  const foraDaJanela = !!fimJanela && dia > fimJanela;
  const emCimaDaHora =
    jaTemData && folgaAtual !== null && folgaAtual <= FOLGA_LIVRE_DIAS_UTEIS;
  // `choque` só é conhecido depois de uma tentativa recusada pelo backend
  // (não dá pra prever colisão de horário no cliente), por isso entra aqui
  // e não em `foraDaJanela`/`jaTemData`: sem ele, marcar uma banca NOVA
  // dentro da janela nunca mostrava o campo de justificativa, e o botão
  // "Pedir exceção à diretoria" ficava desabilitado para sempre, sem
  // nenhum jeito de escrever o motivo que ele mesmo pede para preencher.
  const exigeJustificativa = jaTemData || foraDaJanela || choque;
  // ⭐ 2026-09-10: TODA remarcação por quem não é da diretoria passa por um
  // pedido — dentro da janela, com folga, em cima da hora, tanto faz. O
  // backend rejeita a marcação direta; aqui a gente já oferece o caminho
  // certo (o botão vira "Pedir remarcação à diretoria") em vez de deixar o
  // 422 explicar depois.
  const precisaPedirRemarcacao = jaTemData && !ehDiretor;

  const candidatos = escoposDoProjeto.filter(
    (e) => e.id === escopoId || e.status !== "cancelado",
  );
  // Escopo preso a OUTRA banca não pode ser juntado: como cada escopo tem no
  // máximo uma, juntá-lo aqui apagaria em silêncio a data que já estava nele.
  const travado = (e: EscopoCobrivel) =>
    e.id !== escopoId && !!e.bancaId && e.bancaId !== bancaAtualId;
  const frentesEnvolvidas = [
    ...new Set(
      candidatos
        .filter((e) => e.id === escopoId || cobertos.includes(e.id))
        .map((e) => e.frente_id),
    ),
  ];

  async function enviar() {
    setErro("");
    setEnviando(true);
    try {
      await onConfirmar(justificativa.trim(), horario, [
        ...new Set([escopoId, ...cobertos]),
      ]);
    } catch (err) {
      const mensagem = err instanceof Error ? err.message : "Não foi possível marcar a banca";
      setErro(mensagem);
      // A mensagem do backend é a única pista de QUAL regra barrou — não há
      // código de erro por regra. Casar pelo texto é frágil de propósito: uma
      // mudança de texto some com o botão, não abre um caminho errado.
      setChoque(mensagem.includes("Já existe uma banca marcada para este horário"));
      setForaJanelaNegada(mensagem.includes("exige autorização da diretoria"));
    } finally {
      setEnviando(false);
    }
  }

  async function pedirExcecao() {
    if (!token) return;
    setPedindo(true);
    setErro("");
    try {
      await solicitarExcecaoChoque(
        {
          projeto_escopo_id: escopoId,
          // ⚠ **Exatamente a mesma conversão que a MARCAÇÃO usa**
          // (`ProjetoCronograma.confirmarBanca`). A exceção é aprovada para um
          // instante específico, e o backend casa pedido e marcação por
          // `data_hora` EXATA: um formato diferente aqui e a exceção aprovada
          // nunca destrava a marcação que ela deveria destravar.
          //
          // Era o que acontecia: este lado mandava a hora local crua e o outro
          // mandava UTC. No Brasil (-03:00) são 3h de diferença — o pedido ia
          // para a fila da diretoria apontando um horário em que não havia
          // choque nenhum, e o botão que existe para destravar o beco não
          // destravava nada.
          data_hora_pretendida: instanteDeBrasilia(dia, horario),
          justificativa: justificativa.trim(),
        },
        token,
      );
      setPedido(true);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível enviar o pedido");
    } finally {
      setPedindo(false);
    }
  }

  async function pedirAutorizacaoJanela() {
    if (!token) return;
    setPedindoJanela(true);
    setErro("");
    try {
      await solicitarForaJanela(
        {
          projeto_escopo_id: escopoId,
          // Mesma conversão de `pedirExcecao`: a autorização é aprovada para
          // um instante específico, e o backend casa pedido e marcação por
          // `data_hora` EXATA.
          data_hora_pretendida: instanteDeBrasilia(dia, horario),
          justificativa: justificativa.trim(),
        },
        token,
      );
      setPedidoJanela(true);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível enviar o pedido");
    } finally {
      setPedindoJanela(false);
    }
  }

  async function pedirRemarcacao() {
    if (!token) return;
    setPedindoRemarcacao(true);
    setErro("");
    try {
      await solicitarRemarcacao(
        {
          projeto_escopo_id: escopoId,
          // Mesma conversão de `pedirAutorizacaoJanela`: a aprovação remarca a
          // banca por `data_hora` EXATA.
          data_hora_pretendida: instanteDeBrasilia(dia, horario),
          justificativa: justificativa.trim(),
        },
        token,
      );
      setPedidoRemarcacao(true);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível enviar o pedido");
    } finally {
      setPedindoRemarcacao(false);
    }
  }

  return (
    <ModalOverlay onClick={onCancelar}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>{jaTemData ? "Remarcar banca" : "Marcar banca"}</ModalTitle>
          <ModalClose type="button" onClick={onCancelar} aria-label="Fechar">
            <X size={16} />
          </ModalClose>
        </ModalHeader>

        <ModalBody>
          <p>
            <strong>{nomeEscopo}</strong>, banca em {formatarData(dia)}.
          </p>

          {foraDaJanela && (
            <p>
              Esta data está <strong>fora da janela</strong> do escopo, que termina
              em {formatarData(fimJanela)}. Marcar aqui exige autorização da
              diretoria — os dias além da janela entram como atraso do
              projeto.
            </p>
          )}

          {emCimaDaHora && (
            <p>
              A banca atual acontece em{" "}
              <strong>
                {folgaAtual} {folgaAtual === 1 ? "dia útil" : "dias úteis"}
              </strong>{" "}
              e os avaliadores já estão escalados.{" "}
              {ehDiretor
                ? "A remarcação fica registrada com a justificativa."
                : "Quem estava escalado é avisado da mudança."}
            </p>
          )}

          {precisaPedirRemarcacao && !pedidoRemarcacao && (
            <p>
              Remarcar uma banca que já tem data é <strong>decisão da diretoria</strong>.
              Escreva abaixo por que a data precisa mudar — é o que ela vai ler
              para decidir. Se autorizar, a banca é remarcada nesta data
              automaticamente e quem estava escalado é avisado.
            </p>
          )}

          {candidatos.length > 1 && (
            <FieldGroup>
              <FieldLabel as="span">Escopos nesta banca</FieldLabel>
              <EscopoPicker>
                {candidatos.map((e) => (
                  <EscopoOpcao key={e.id} $bloqueado={travado(e)}>
                    <input
                      type="checkbox"
                      checked={e.id === escopoId || cobertos.includes(e.id)}
                      // O escopo de onde a banca está sendo marcada entra
                      // sempre, desmarcá-lo deixaria a ação sem sentido.
                      disabled={travado(e) || e.id === escopoId}
                      onChange={() =>
                        setCobertos((atuais) =>
                          atuais.includes(e.id)
                            ? atuais.filter((x) => x !== e.id)
                            : [...atuais, e.id],
                        )
                      }
                    />
                    <span>{e.nome}</span>
                    <small>{travado(e) ? "já tem banca própria" : nomeFrente(e.frente_id)}</small>
                  </EscopoOpcao>
                ))}
              </EscopoPicker>
            </FieldGroup>
          )}

          {frentesEnvolvidas.length > 1 && (
            <p>
              Esta banca vai cobrir {frentesEnvolvidas.map(nomeFrente).join(" e ")}, a composição
              exigida passa a somar as duas frentes.
            </p>
          )}

          <FieldGroup>
            <FieldLabel htmlFor="horario-banca">Horário</FieldLabel>
            <FieldInput
              id="horario-banca"
              type="time"
              value={horario}
              onChange={(e) => setHorario(e.target.value)}
            />
          </FieldGroup>

          {exigeJustificativa && !pedidoRemarcacao && (
            <FieldGroup>
              <FieldLabel htmlFor="justificativa-banca">Justificativa</FieldLabel>
              <FieldInput
                as="textarea"
                id="justificativa-banca"
                rows={3}
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
              />
            </FieldGroup>
          )}

          {erro && <FormErrorText>{erro}</FormErrorText>}

          {/* A saída para o choque: pedir, sem sair do modal nem perder o que
              já foi preenchido. A justificativa é a mesma do formulário — o
              motivo de querer aquele horário é o que a diretoria vai ler. */}
          {choque && !pedido && (
            <FieldGroup>
              <AvisoBanner>
                Você pode pedir uma exceção à diretoria para marcar mesmo assim. Explique acima
                por que este horário é necessário — é o que ela vai ler para decidir.
              </AvisoBanner>
              <PageButton
                type="button"
                $variant="outline"
                disabled={pedindo || !justificativa.trim()}
                onClick={pedirExcecao}
              >
                {pedindo ? "Enviando pedido..." : "Pedir exceção à diretoria"}
              </PageButton>
            </FieldGroup>
          )}
          {pedido && (
            <AvisoBanner>
              Pedido enviado. A diretoria decide na aba <strong>Monitoramento → Aprovações</strong>;
              se liberar, volte aqui para marcar a banca neste horário.
            </AvisoBanner>
          )}

          {/* A saída para fora da janela: pedir autorização sem sair do
              modal. A justificativa é a mesma do formulário — o motivo de
              precisar dessa data é o que a diretoria vai ler para decidir. */}
          {foraJanelaNegada && !pedidoJanela && (
            <FieldGroup>
              <AvisoBanner>
                Você pode pedir autorização à diretoria para marcar mesmo fora da janela.
                Explique acima por que — é o que ela vai ler para decidir. Se ela
                autorizar, a banca é marcada nesta data automaticamente.
              </AvisoBanner>
              <PageButton
                type="button"
                $variant="outline"
                disabled={pedindoJanela || !justificativa.trim()}
                onClick={pedirAutorizacaoJanela}
              >
                {pedindoJanela ? "Enviando pedido..." : "Pedir autorização à diretoria"}
              </PageButton>
            </FieldGroup>
          )}
          {pedidoJanela && (
            /* ⭐ Nada de "volte aqui para marcar": autorizar já MARCA a banca
               (`DecidirForaJanelaUseCase`). A frase antiga mandava a pessoa
               repetir um gesto que, feito depois, só devolveria "nada mudou" —
               e, pior, sugeria que a banca ficaria por conta dela quando na
               verdade a decisão da diretoria fecha o ciclo sozinha.

               ⚠ Isto vale só para a janela. O pedido de CHOQUE acima continua
               dizendo "volte aqui", porque lá a aprovação de fato só libera. */
            <AvisoBanner>
              Pedido enviado. A diretoria decide na aba <strong>Monitoramento → Aprovações</strong>;
              se autorizar, a banca já é marcada nesta data — você não precisa voltar aqui.
            </AvisoBanner>
          )}

          {pedidoRemarcacao && (
            <AvisoBanner>
              Pedido de remarcação enviado. A diretoria decide na aba{" "}
              <strong>Monitoramento → Aprovações</strong>; se autorizar, a banca já é remarcada
              para esta data e quem estava escalado é avisado — você não precisa voltar aqui.
            </AvisoBanner>
          )}
        </ModalBody>

        <ModalFooter>
          <PageButton type="button" $variant="ghost" onClick={onCancelar}>
            {pedidoRemarcacao ? "Fechar" : "Cancelar"}
          </PageButton>
          {precisaPedirRemarcacao ? (
            !pedidoRemarcacao && (
              <PageButton
                type="button"
                disabled={pedindoRemarcacao || !horario || !justificativa.trim()}
                onClick={pedirRemarcacao}
              >
                {pedindoRemarcacao ? "Enviando pedido..." : "Pedir remarcação à diretoria"}
              </PageButton>
            )
          ) : (
            <PageButton
              type="button"
              disabled={
                enviando || !horario || (exigeJustificativa && !justificativa.trim())
              }
              onClick={enviar}
            >
              {jaTemData ? "Remarcar" : "Marcar"}
            </PageButton>
          )}
        </ModalFooter>
      </ModalContent>
    </ModalOverlay>
  );
}
