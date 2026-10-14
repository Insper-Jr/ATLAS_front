import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Trash2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  aceitaInscricao,
  cancelarBanca,
  deleteBanca,
  getBanca,
  getBancasDoProjeto,
  getBancasFrentes,
  getEquipesProjeto,
  quemDecidiu,
  quemPodeAprovar,
  registrarAprovacaoBanca,
  registrarDescricaoCoordenador,
  ROTULO_STATUS_BANCA,
  tomDoStatusBanca,
} from "@/lib/bancas";
import { ehDiretoriaDeProjetos } from "@/utils/permissoes";
import { BancaFormModal } from "@/components/bancas/BancaFormModal";
import { createAvaliacao, getFormularioAtivo, submeterAvaliacao } from "@/lib/avaliacoes";
import { formatarDataHora } from "@/lib/projetos";
import { ConfirmarModal } from "@/components/ConfirmarModal";
import { AvaliadoresAgrupados } from "@/components/bancas/AvaliadoresAgrupados";
import { LocalEEntregaBloco } from "@/components/bancas/LocalEEntregaBloco";
import type {
  AprovacaoDaBanca,
  AvaliadorDaBanca,
  Banca,
  BancaDetalhes,
  BancaFrente,
  EquipeProjeto,
  Frente,
  ResultadoBanca,
  SessaoDeBanca,
} from "@/types/banca";
import type { UsuarioResumo } from "@/types/auth";
import {
  PageStack,
  PageCard,
  PageCardHeader,
  PageCardTitle,
  PageCardContent,
  PageBadge,
  PageButton,
  PageButtonSm,
  PageLoadingBlock,
  ErrorBlock,
  ErrorText,
  EmptyText,
} from "@/styles/page.styled";
import {
  ModalBody,
  ModalClose,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  ModalTitle,
} from "@/styles/modal.styled";
import {
  FieldGroup,
  FieldLabel,
  FieldTextarea,
  FormErrorText,
} from "@/pages/Bancas.styled";
import {
  AcoesLinha,
  Ajuda,
  AvisoReprovada,
  Campo,
  CampoRotulo,
  CampoValor,
  Colunas,
  Comentario,
  Lista,
  ListaNomes,
  MeuVoto,
  SecaoTitulo,
  Tentativa,
  TentativaMeta,
  TentativaNome,
  TentativaTopo,
} from "./ProjetoBanca.styled";
import { useProjeto } from "./ProjetoPage";

/** "Banca" na primeira, "2ª banca" da segunda em diante — numerar a primeira
 *  sugeriria que houve outra antes dela. */
function nomeDaTentativa(numero: number): string {
  return numero <= 1 ? "Banca" : `${numero}ª banca`;
}

function rotuloDoResultado(resultado: ResultadoBanca | null): string {
  if (resultado === "aprovada") return "Aprovada";
  if (resultado === "nao_aprovada") return "Não aprovada";
  return "Sem resultado";
}

function tomDaTentativa(s: SessaoDeBanca): "aprovada" | "reprovada" | "pendente" {
  if (s.resultado === "aprovada") return "aprovada";
  if (s.resultado === "nao_aprovada") return "reprovada";
  return "pendente";
}

/**
 * ⭐ A aba **Banca** do projeto — ver e AGIR sobre a banca num lugar só.
 *
 * ⚠ **O que ela resolve.** As informações da banca existiam espalhadas: a data
 * no cronograma, o resultado escondido num cadeado da Visão geral, os votos em
 * lugar nenhum, e a ficha completa só na tela `/bancas`, que é organizada por
 * ALOCAÇÃO: quem procurava "como foi a banca deste projeto" tinha de caçar a
 * banca certa numa lista de todas as bancas do semestre. Pior: para avaliar, o
 * avaliador precisava sair do projeto e encontrá-la lá.
 *
 * ⭐ **Mostra as TENTATIVAS, não só a atual.** Uma banca reprovada e remarcada
 * some da linha de `banca` (a coluna passa a descrever a 2ª). É aqui que a 1ª
 * continua existindo, com o veredito e os votos que a reprovaram.
 */
export function ProjetoBanca() {
  const { projeto, usuarios, frentes, somenteLeitura } = useProjeto();
  const { token } = useAuth();
  const [bancas, setBancas] = useState<BancaDetalhes[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const carregar = useCallback(async () => {
    if (!token) return;
    setErro("");
    try {
      setBancas(await getBancasDoProjeto(projeto.id, token));
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao carregar as bancas");
    } finally {
      setCarregando(false);
    }
  }, [token, projeto.id]);

  /**
   * ⭐ Atualiza só a banca decidida, sem recarregar a ficha inteira do
   * projeto — `registrarAprovacaoBanca` já devolve a situação pronta
   * (resultado + as duas assinaturas), então não há por que buscar de novo.
   */
  const handleAprovacaoDecidida = useCallback(
    (bancaId: number, situacao: AprovacaoDaBanca) => {
      setBancas((atual) =>
        atual.map((b) => (b.id === bancaId ? { ...b, resultado: situacao.resultado, aprovacao: situacao } : b)),
      );
    },
    [],
  );

  useEffect(() => {
    carregar();
  }, [carregar]);

  if (carregando) return <PageLoadingBlock />;

  if (erro && bancas.length === 0) {
    return (
      <ErrorBlock>
        <ErrorText>{erro}</ErrorText>
        <PageButton $variant="outline" onClick={carregar}>
          Tentar novamente
        </PageButton>
      </ErrorBlock>
    );
  }

  if (bancas.length === 0) {
    return (
      <PageCard>
        <PageCardContent>
          <EmptyText>
            Nenhuma banca marcada para os escopos deste projeto. A banca é marcada na aba{" "}
            <strong>Cronograma</strong>, clicando no dia.
          </EmptyText>
        </PageCardContent>
      </PageCard>
    );
  }

  return (
    <PageStack>
      {bancas.map((banca) => (
        <FichaDaBanca
          key={banca.id}
          banca={banca}
          projetoId={projeto.id}
          equipeIds={[...projeto.coordenador_ids, ...projeto.consultor_ids]}
          usuarios={usuarios}
          frentes={frentes}
          somenteLeitura={somenteLeitura}
          onMudou={carregar}
          onAprovacaoDecidida={handleAprovacaoDecidida}
        />
      ))}
    </PageStack>
  );
}

function FichaDaBanca({
  banca,
  projetoId,
  equipeIds,
  usuarios,
  frentes,
  somenteLeitura,
  onMudou,
  onAprovacaoDecidida,
}: {
  banca: BancaDetalhes;
  projetoId: number;
  /** Coordenação + consultores do projeto — quem pode registrar local e
   *  anexar a entrega (o backend cobra o mesmo em `pessoas_do_projeto_da_banca`). */
  equipeIds: number[];
  usuarios: UsuarioResumo[];
  frentes: Frente[];
  somenteLeitura: boolean;
  onMudou: () => Promise<void>;
  onAprovacaoDecidida: (bancaId: number, situacao: AprovacaoDaBanca) => void;
}) {
  const { usuario, token } = useAuth();
  const [cancelando, setCancelando] = useState(false);
  const [editando, setEditando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  const podeRegistrar = !!usuario?.permissoes.pode_definir_cronograma;
  /**
   * ⭐ Cancelar a banca (2026-09-04, a pedido). Não existe mais "Registrar
   * realização": `data_hora` passar sozinho já marca a banca como realizada
   * e dispara as avaliações — cancelar é a única saída manual que resta.
   * Reservada a gerência e diretoria de projetos, a MESMA permissão que o
   * backend cobra em `POST /bancas/{id}/cancelar` (`require_gestao`), e não
   * a de quem conduz o projeto (`podeRegistrar` acima): tirar a banca da
   * rotina automática é decisão de gestão do calendário, não do dia a dia
   * do projeto.
   */
  const podeCancelar = ehDiretoriaDeProjetos(usuario) || usuario?.posicao === "gerente";
  /**
   * Editar a banca sem sair do projeto.
   *
   * O botão existia só na tela `/bancas`, que é organizada por ALOCAÇÃO: quem
   * queria trocar a data ou os consultores da banca DESTE projeto tinha de
   * achá-la numa lista de todas as bancas do semestre.
   *
   * A permissão é a mesma que o backend cobra em `PATCH /bancas/{id}`
   * (`require_pode_definir_cronograma` + acesso ao projeto), e o corte por
   * status é o de `podeGerenciarBanca`: banca já realizada não se edita — o
   * que ela virou está no resultado, não na data.
   */
  const podeEditar = podeRegistrar && !somenteLeitura && aceitaInscricao(banca.status);
  const eu = banca.avaliadores.find((a) => a.usuario_id === usuario?.id);
  // O mesmo nome no título do card e na confirmação de exclusão: quem clicou
  // no lixo precisa reconhecer no modal exatamente o que estava olhando.
  const nomeDaBanca = banca.escopos.join(" + ") || banca.nome_projeto;

  return (
    <PageCard>
      <PageCardHeader>
        <PageCardTitle>{nomeDaBanca}</PageCardTitle>
        <PageBadge $tone={tomDoStatusBanca(banca.status)}>
          {ROTULO_STATUS_BANCA[banca.status]}
        </PageBadge>
        {/* O veredito ao lado do status: "realizada" e "aprovada" são coisas
            diferentes, e é a segunda que libera a entrega ao cliente (§5.5). */}
        <PageBadge
          $tone={
            banca.resultado === "aprovada"
              ? "success"
              : banca.resultado === "nao_aprovada"
                ? "danger"
                : "muted"
          }
        >
          {rotuloDoResultado(banca.resultado)}
        </PageBadge>
        {/* A saída pra "isto não vai acontecer" — só quem decide calendário
            (não a coordenação, que é quem normalmente mexe nesta ficha).
            ⭐ 2026-09-05: continua disponível mesmo já realizada — o
            imprevisto de última hora (deu problema, não rolou de verdade,
            mas o relógio já tinha marcado sozinho) também se desfaz por
            aqui. Só some depois de cancelada de fato. */}
        {podeCancelar && !banca.cancelada_em && (
          <PageButtonSm $variant="outline" type="button" onClick={() => setCancelando(true)}>
            Cancelar banca
          </PageButtonSm>
        )}
        {/* ⚠ Os dois num filho SÓ do cabeçalho, e não lado a lado soltos: o
            `PageCardHeader` distribui os filhos com `space-between`, então
            cada botão solto era empurrado para longe do vizinho. Agrupados,
            andam juntos e ficam separados só pelo gap desta linha.

            Excluir mora ao lado de editar e sob a MESMA permissão: as duas
            desfazem a marcação, e uma banca que se pode remarcar é uma banca
            que se pode apagar. Só o ícone porque o rótulo já está no modal. */}
        {podeEditar && (
          <AcoesLinha>
            <PageButtonSm $variant="outline" type="button" onClick={() => setEditando(true)}>
              Editar banca
            </PageButtonSm>
            <PageButtonSm
              $variant="outline"
              type="button"
              aria-label={`Excluir a banca ${nomeDaBanca}`}
              title="Excluir banca"
              onClick={() => setExcluindo(true)}
            >
              <Trash2 size={14} />
            </PageButtonSm>
          </AcoesLinha>
        )}
      </PageCardHeader>

      <PageCardContent>
        {/* ⚠ Primeiro de tudo quando reprovou: é a informação que muda o que a
            pessoa faz a seguir, e ela não pode estar no fim da página. */}
        {banca.resultado === "nao_aprovada" && (
          <AvisoReprovada>
            <AlertTriangle size={18} />
            <span>
              <strong>Esta banca não foi aprovada.</strong> A entrega ao cliente segue travada até
              que uma nova banca aconteça e aprove.{" "}
              <Link to={`/projetos/${projetoId}/cronograma`}>
                Marque a próxima banca no Cronograma
              </Link>
              {". "}A tentativa reprovada fica registrada abaixo.
            </span>
          </AvisoReprovada>
        )}

        <Colunas>
          <Campo>
            <CampoRotulo>Data</CampoRotulo>
            <CampoValor>{formatarDataHora(banca.data_hora)}</CampoValor>
          </Campo>
          <Campo>
            <CampoRotulo>Realizada em</CampoRotulo>
            <CampoValor>
              {banca.realizado_em ? formatarDataHora(banca.realizado_em) : "ainda não aconteceu"}
            </CampoValor>
          </Campo>
          {/* Só aparece na banca cancelada — não é um campo vazio de sempre,
              é a exceção. */}
          {banca.cancelada_em && (
            <Campo>
              <CampoRotulo>Cancelada em</CampoRotulo>
              <CampoValor>{formatarDataHora(banca.cancelada_em)}</CampoValor>
            </Campo>
          )}
          <Campo>
            <CampoRotulo>Frentes</CampoRotulo>
            <CampoValor>{banca.frentes.join(", ") || "—"}</CampoValor>
          </Campo>
          {/* "Nota final" saiu daqui junto com a seção de Avaliações
              (2026-09-10) — é resultado de avaliação, e isso é só no
              Dashboard de Bancas. O veredito (aprovada/reprovada), que é o
              que libera a entrega ao cliente, continua no cabeçalho. */}
        </Colunas>

        <LocalEEntregaBloco
          banca={banca}
          podeMexer={
            !banca.cancelada_em &&
            (ehDiretoriaDeProjetos(usuario) ||
              (!somenteLeitura &&
                !!usuario &&
                (equipeIds.includes(usuario.id) || usuario.id === banca.coordenador_id)))
          }
          token={token}
          onMudou={onMudou}
        />

        {/* A avaliação de quem está lendo, sem sair do projeto. */}
        {eu && (
          <MeuVotoBloco
            banca={banca}
            eu={eu}
            token={token}
            onEnviou={onMudou}
          />
        )}

        <SecaoTitulo>Quem participou</SecaoTitulo>
        <Colunas>
          <Campo>
            <CampoRotulo>Coordenação</CampoRotulo>
            <CampoValor>{banca.coordenador}</CampoValor>
          </Campo>
          <Campo>
            <CampoRotulo>Equipe do projeto</CampoRotulo>
            {banca.membros.length ? (
              <ListaNomes>
                {banca.membros.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ListaNomes>
            ) : (
              <CampoValor>—</CampoValor>
            )}
          </Campo>
        </Colunas>

        {/* Avaliadores separados por (liderança | membro) × frente da banca.
            O piso de cada bloco tem de ser gente DAQUELA frente; completar
            acima dele, até o teto da banca, é "tanto faz a frente". */}
        <Campo style={{ marginTop: "0.75rem" }}>
          <CampoRotulo>Avaliadores escalados</CampoRotulo>
          {banca.avaliadores.length === 0 ? (
            <CampoValor>ninguém escalado</CampoValor>
          ) : (
            <AvaliadoresAgrupados
              avaliadores={banca.avaliadores}
              frentesDaBanca={banca.frentes_da_banca}
              composicao={banca.composicao}
              realizadoEm={banca.realizado_em}
              podeVerAvaliou={!!usuario?.permissoes.pode_ver_dashboard_bancas}
            />
          )}
        </Campo>

        <SecaoTitulo>Aprovação</SecaoTitulo>
        <AprovacaoBloco
          banca={banca}
          token={token}
          onDecidiu={(situacao) => onAprovacaoDecidida(banca.id, situacao)}
        />

        {banca.sessoes.length > 1 && (
          <>
            <SecaoTitulo>Tentativas</SecaoTitulo>
            <Ajuda>
              A banca reprovada ou cancelada não some do registro: cada tentativa fica aqui com o
              que aconteceu com ela.
            </Ajuda>
            <Lista>
              {banca.sessoes.map((s) => (
                <Tentativa key={s.id} $tom={tomDaTentativa(s)}>
                  <TentativaTopo>
                    <TentativaNome>{nomeDaTentativa(s.numero)}</TentativaNome>
                    <TentativaMeta>{formatarDataHora(s.data_hora)}</TentativaMeta>
                    <TentativaMeta>· {s.cancelada_em ? "Cancelada" : rotuloDoResultado(s.resultado)}</TentativaMeta>
                  </TentativaTopo>
                  <TentativaMeta>
                    {s.cancelada_em
                      ? `Cancelada em ${formatarDataHora(s.cancelada_em)} e marcada de novo`
                      : s.realizado_em
                        ? `Realizada em ${formatarDataHora(s.realizado_em)}`
                        : "Ainda não aconteceu"}
                  </TentativaMeta>
                </Tentativa>
              ))}
            </Lista>
          </>
        )}

        {/* Nada de "Avaliações" aqui (2026-09-10, a pedido): a nota e o
            comentário de cada avaliador vivem SÓ no Dashboard de Bancas.
            Nesta aba, quem lê vê e envia A SUA em `MeuVotoBloco` acima, e
            mais nada. O backend também não manda mais `avaliacoes`/
            `nota_final` pra quem não tem o dashboard. */}

        <SecaoTitulo>Relato da coordenação</SecaoTitulo>
        <RelatoDaCoordenacao banca={banca} token={token} onSalvou={onMudou} />
      </PageCardContent>

      {cancelando && token && (
        <ConfirmarModal
          titulo="Cancelar banca"
          mensagem={
            banca.realizado_em
              ? `Cancelar a banca "${nomeDaBanca}"? Ela já tinha sido marcada como realizada, mas isto desfaz: volta a "não aconteceu", e a avaliação de desempenho de finalização que abriu sozinha é fechada (ou apagada, se ninguém ainda respondeu nada). Use só pra imprevisto de última hora — se ela realmente aconteceu, isto não é o botão certo.`
              : `Cancelar a banca "${nomeDaBanca}"? Ela não vai acontecer, e não abrirá sozinha a avaliação de banca nem a de desempenho de finalização.`
          }
          rotuloConfirmar="Cancelar banca"
          rotuloProcessando="Cancelando…"
          onCancelar={() => setCancelando(false)}
          onConfirmar={async () => {
            await cancelarBanca(banca.id, token);
            setCancelando(false);
            await onMudou();
          }}
        />
      )}

      {editando && token && (
        <EditarBancaModal
          bancaId={banca.id}
          usuarios={usuarios}
          frentes={frentes}
          token={token}
          ehDiretor={ehDiretoriaDeProjetos(usuario)}
          onFechar={() => setEditando(false)}
          onSalvou={async () => {
            setEditando(false);
            await onMudou();
          }}
        />
      )}

      {/* Mesma redação da tela de Bancas: é a mesma exclusão, pela mesma rota
          (`DELETE /bancas/{id}`), só alcançada de outro lugar. */}
      {excluindo && token && (
        <ConfirmarModal
          titulo="Excluir banca"
          mensagem={`Excluir a banca "${nomeDaBanca}"? Esta ação não pode ser desfeita.`}
          onCancelar={() => setExcluindo(false)}
          onConfirmar={async () => {
            await deleteBanca(banca.id, token);
            setExcluindo(false);
            await onMudou();
          }}
        />
      )}
    </PageCard>
  );
}

/**
 * Busca o que o formulário de banca exige e a aba não tem, e então o abre.
 *
 * ⚠ **A ficha da aba não serve para editar.** `BancaDetalhes` traz nomes
 * resolvidos (é o que a leitura precisa); o formulário mexe em ids —
 * `escopo_id`, `piso_minimo_override`, os vínculos de `equipe_projeto` e
 * `banca_frente`. Daí as quatro chamadas aqui.
 *
 * Elas acontecem no CLIQUE, não na montagem da aba: são listagens do núcleo
 * inteiro que só interessam a quem vai editar, e quase todo mundo que abre a
 * aba vem ler.
 */
function EditarBancaModal({
  bancaId,
  usuarios,
  frentes,
  token,
  ehDiretor,
  onFechar,
  onSalvou,
}: {
  bancaId: number;
  usuarios: UsuarioResumo[];
  frentes: Frente[];
  token: string;
  ehDiretor: boolean;
  onFechar: () => void;
  onSalvou: () => Promise<void>;
}) {
  const [carregado, setCarregado] = useState<{
    banca: Banca;
    equipesProjeto: EquipeProjeto[];
    bancasFrentes: BancaFrente[];
  } | null>(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let ativo = true;
    Promise.all([
      getBanca(bancaId, token),
      getEquipesProjeto(token),
      getBancasFrentes(token),
    ])
      .then(([banca, equipesProjeto, bancasFrentes]) => {
        if (ativo) setCarregado({ banca, equipesProjeto, bancasFrentes });
      })
      .catch((err: unknown) => {
        if (ativo) setErro(err instanceof Error ? err.message : "Erro ao abrir a edição da banca");
      });
    return () => {
      ativo = false;
    };
  }, [bancaId, token]);

  if (carregado) {
    const { banca, ...listas } = carregado;
    return (
      <BancaFormModal
        banca={banca}
        dados={{ usuarios, frentes, ...listas }}
        token={token}
        ehDiretor={ehDiretor}
        onClose={onFechar}
        onSalvo={onSalvou}
      />
    );
  }

  // Enquanto as listas não chegam a caixa já aparece: sem ela o clique no
  // botão não devolveria nada por um instante, e a pessoa clicaria de novo.
  return (
    <ModalOverlay onClick={onFechar} role="presentation">
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>Editar banca</ModalTitle>
          <ModalClose type="button" aria-label="Fechar" onClick={onFechar}>
            ×
          </ModalClose>
        </ModalHeader>
        <ModalBody>
          {erro ? <FormErrorText>{erro}</FormErrorText> : <EmptyText>Carregando…</EmptyText>}
          {erro && (
            <AcoesLinha>
              <PageButton type="button" $variant="outline" onClick={onFechar}>
                Fechar
              </PageButton>
            </AcoesLinha>
          )}
        </ModalBody>
      </ModalContent>
    </ModalOverlay>
  );
}

/**
 * ⭐ O feedback do usuário logado, dado de dentro do projeto.
 *
 * ⚠ **Comentário, sem as notas por critério.** O formulário completo (Bloco
 * 1, notas de 1 a 5 por critério, escopo avaliado) continua em `/bancas`.
 * Quem aprova a banca é diretoria + gerente da frente (ver `AprovacaoBloco`
 * abaixo), não o avaliador — esta avaliação é só pedagógica.
 */
function chaveRascunhoComentario(bancaId: number, usuarioId: number) {
  return `banca-comentario-rascunho-${bancaId}-${usuarioId}`;
}

function MeuVotoBloco({
  banca,
  eu,
  token,
  onEnviou,
}: {
  banca: BancaDetalhes;
  eu: AvaliadorDaBanca;
  token: string | null;
  onEnviou: () => Promise<void>;
}) {
  const { usuario } = useAuth();
  // ⚠ Puro estado de componente sumia ao sair da tela e voltar: navegar pra
  // outra página desmonta este bloco, e o que a pessoa tinha escrito ia
  // embora sem nunca ter sido enviado. Espelha no localStorage, mesma ideia
  // do rascunho de `AvaliacaoDesempenho.tsx`.
  const chaveRascunho = usuario ? chaveRascunhoComentario(banca.id, usuario.id) : null;
  const [comentario, setComentario] = useState(() => {
    if (!chaveRascunho) return "";
    try {
      return localStorage.getItem(chaveRascunho) ?? "";
    } catch {
      return "";
    }
  });
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  function atualizarComentario(valor: string) {
    setComentario(valor);
    if (!chaveRascunho) return;
    try {
      if (valor) {
        localStorage.setItem(chaveRascunho, valor);
      } else {
        localStorage.removeItem(chaveRascunho);
      }
    } catch {
      // Modo privado ou quota cheia: perde a persistência, não a tela.
    }
  }

  if (eu.ja_enviou) {
    return (
      <MeuVoto>
        <SecaoTitulo>Sua avaliação</SecaoTitulo>
        {eu.comentario_feedback ? (
          <Comentario>{eu.comentario_feedback}</Comentario>
        ) : (
          <Ajuda>Enviada sem comentário.</Ajuda>
        )}
        <Ajuda>Avaliação enviada. Ela não pode mais ser alterada.</Ajuda>
      </MeuVoto>
    );
  }

  if (!banca.realizado_em) {
    return (
      <MeuVoto>
        <SecaoTitulo>Sua avaliação</SecaoTitulo>
        <Ajuda>
          Você está escalado para esta banca. A avaliação abre quando alguém registrar que ela
          aconteceu.
        </Ajuda>
      </MeuVoto>
    );
  }

  async function enviar() {
    if (!token) return;
    // ⭐ 2026-09-23 — a pedido: comentário passou a ser obrigatório.
    if (!comentario.trim()) {
      setErro("Escreva um comentário antes de enviar.");
      return;
    }
    setEnviando(true);
    setErro("");
    try {
      // Reaproveita o rascunho que a pessoa já tenha aberto na tela de Bancas:
      // criar um segundo deixaria duas linhas do mesmo avaliador na sessão.
      let avaliacaoId = eu.avaliacao_id;
      if (!avaliacaoId) {
        const formulario = await getFormularioAtivo(token);
        const criada = await createAvaliacao(
          { banca_id: banca.id, formulario_id: formulario.id },
          token,
        );
        avaliacaoId = criada.id;
      }
      await submeterAvaliacao(avaliacaoId, comentario.trim() || null, token);
      if (chaveRascunho) {
        try {
          localStorage.removeItem(chaveRascunho);
        } catch {
          // Sem localStorage: nada a limpar.
        }
      }
      await onEnviou();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível enviar a avaliação");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <MeuVoto>
      <SecaoTitulo>Sua avaliação</SecaoTitulo>
      <FieldGroup>
        <FieldLabel htmlFor={`comentario-${banca.id}`}>Comentário</FieldLabel>
        <FieldTextarea
          id={`comentario-${banca.id}`}
          rows={3}
          value={comentario}
          onChange={(e) => atualizarComentario(e.target.value)}
          placeholder="O que o grupo precisa saber sobre esta avaliação"
          required
        />
      </FieldGroup>
      {erro && <FormErrorText>{erro}</FormErrorText>}
      <AcoesLinha>
        <PageButton type="button" disabled={enviando} onClick={enviar}>
          {enviando ? "Enviando..." : "Enviar avaliação"}
        </PageButton>
        <Ajuda>
          Para dar as notas por critério, use o formulário completo na tela de{" "}
          <Link to="/bancas">Bancas</Link>.
        </Ajuda>
      </AcoesLinha>
    </MeuVoto>
  );
}

/**
 * ⭐ A decisão de diretoria de projetos OU gerente da frente (§5.5, §8) — o
 * que substitui o voto dos avaliadores.
 *
 * ⭐ **Qualquer um decide sozinho.** Não é preciso diretoria e gerente
 * concordarem: o primeiro que aprovar ou reprovar já fecha o resultado.
 *
 * ⚠ **O recorte de "pode decidir" aqui é grosso de propósito.** O botão
 * aparece para quem é diretoria de projetos ou tem posição de gerente; se a
 * pessoa não for gerente responsável por NENHUMA frente desta banca
 * específica, o backend recusa com uma mensagem clara.
 */
function AprovacaoBloco({
  banca,
  token,
  onDecidiu,
}: {
  banca: BancaDetalhes;
  token: string | null;
  /** Recebe a situação que o backend acabou de gravar (resultado + as
   *  assinaturas), para o chamador atualizar o estado local sem recarregar. */
  onDecidiu: (situacao: AprovacaoDaBanca) => void;
}) {
  const { usuario } = useAuth();
  const [decidindo, setDecidindo] = useState<"aprovar" | "reprovar" | null>(null);

  const { aprovacao } = banca;
  const decidido = quemDecidiu(aprovacao);
  const podeDecidir =
    !banca.resultado &&
    !!banca.realizado_em &&
    (ehDiretoriaDeProjetos(usuario) || usuario?.posicao === "gerente");

  // Erros aparecem dentro do próprio `ConfirmarModal` (ele os captura e
  // mostra sem fechar) — não precisa de um segundo estado de erro aqui.
  async function confirmar(aprovado: boolean) {
    if (!token) return;
    const situacao = await registrarAprovacaoBanca(banca.id, aprovado, null, token);
    setDecidindo(null);
    onDecidiu(situacao);
  }

  return (
    <>
      {decidido ? (
        <Ajuda>
          {banca.resultado === "aprovada" ? "Aprovada" : "Não aprovada"} por {decidido.nome}, {decidido.papel}.
        </Ajuda>
      ) : !banca.realizado_em ? (
        <Ajuda>A decisão abre quando alguém registrar que a banca aconteceu.</Ajuda>
      ) : (
        <Ajuda>Pode aprovar: {quemPodeAprovar(aprovacao)}.</Ajuda>
      )}

      {podeDecidir && (
        <AcoesLinha>
          <PageButtonSm type="button" onClick={() => setDecidindo("aprovar")}>
            Aprovar banca
          </PageButtonSm>
          <PageButtonSm $variant="outline" type="button" onClick={() => setDecidindo("reprovar")}>
            Reprovar banca
          </PageButtonSm>
        </AcoesLinha>
      )}

      {decidindo && (
        <ConfirmarModal
          titulo={decidindo === "aprovar" ? "Aprovar banca" : "Reprovar banca"}
          rotuloConfirmar={decidindo === "aprovar" ? "Aprovar" : "Reprovar"}
          rotuloProcessando="Salvando…"
          mensagem="Sua decisão sozinha já fecha o resultado da banca, sem esperar mais ninguém."
          onCancelar={() => setDecidindo(null)}
          onConfirmar={() => confirmar(decidindo === "aprovar")}
        />
      )}
    </>
  );
}

/**
 * ⭐ O relato da coordenação, escrito aqui mesmo.
 *
 * O coordenador NÃO avalia a própria banca (§8: "ninguém avalia o próprio
 * grupo") — este texto livre é o lugar dele, e é a única coisa que ele registra
 * sobre a banca. Estava só na tela `/bancas`, longe do projeto de que fala.
 *
 * ⚠ Quem escreve é o coordenador da BANCA, e o backend cobra isso
 * (`RegistrarDescricaoCoordenadorUseCase`). A tela esconde o formulário de
 * quem não é — mostrar um campo que devolve 403 no salvar é pior que não
 * mostrar.
 */
function RelatoDaCoordenacao({
  banca,
  token,
  onSalvou,
}: {
  banca: BancaDetalhes;
  token: string | null;
  onSalvou: () => Promise<void>;
}) {
  const { usuario } = useAuth();
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(banca.descricao_coordenador ?? "");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  // ⚠ `coordenador_ids` (plural) e não `coordenador_id`: o projeto pode ter
  // mais de um coordenador (2026-08-20), e o singular é só o primeiro.
  const souCoordenador = !!usuario && banca.coordenador_ids.includes(usuario.id);
  // Só depois que a banca aconteceu: relatar o que ainda não ocorreu não faz
  // sentido, e o backend recusa.
  const podeEscrever = souCoordenador && !!banca.realizado_em;

  async function salvar() {
    if (!token) return;
    setSalvando(true);
    setErro("");
    try {
      await registrarDescricaoCoordenador(banca.id, texto.trim(), token);
      setEditando(false);
      await onSalvou();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível salvar o relato");
    } finally {
      setSalvando(false);
    }
  }

  if (editando) {
    return (
      <>
        <FieldGroup>
          <FieldLabel htmlFor={`relato-${banca.id}`}>
            Como foi a banca, na visão da coordenação
          </FieldLabel>
          <FieldTextarea
            id={`relato-${banca.id}`}
            rows={4}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="O que os avaliadores apontaram, o que o grupo precisa ajustar…"
          />
        </FieldGroup>
        {erro && <FormErrorText>{erro}</FormErrorText>}
        <AcoesLinha>
          <PageButton type="button" disabled={salvando} onClick={salvar}>
            {salvando ? "Salvando..." : "Salvar relato"}
          </PageButton>
          <PageButton
            type="button"
            $variant="ghost"
            onClick={() => {
              setTexto(banca.descricao_coordenador ?? "");
              setEditando(false);
              setErro("");
            }}
          >
            Cancelar
          </PageButton>
        </AcoesLinha>
      </>
    );
  }

  return (
    <>
      {banca.descricao_coordenador ? (
        <Comentario>{banca.descricao_coordenador}</Comentario>
      ) : (
        <EmptyText>
          {podeEscrever
            ? "Nada escrito ainda."
            : "Nada escrito. O relato é registrado pela coordenação depois que a banca acontece."}
        </EmptyText>
      )}
      {podeEscrever && (
        <AcoesLinha>
          <PageButtonSm $variant="outline" type="button" onClick={() => setEditando(true)}>
            {banca.descricao_coordenador ? "Editar relato" : "Escrever relato"}
          </PageButtonSm>
        </AcoesLinha>
      )}
    </>
  );
}
