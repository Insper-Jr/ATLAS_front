import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Lock, Plus, Trash2, UserPen, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ROTULO_STATUS_BANCA, tomDoStatusBanca } from "@/lib/bancas";
import { ConfirmarModal } from "@/components/ConfirmarModal";
import { InfoDica } from "@/components/InfoDica";
import { ehDiretoriaDeProjetos } from "@/utils/permissoes";
import {
  confirmarEntregaEscopo,
  DIAS_REUNIAO,
  createEscopoProjeto,
  deleteEscopoProjeto,
  formatarData,
  formatarDataHora,
  formatarDataHoraBanca,
  marcarInicioAmbientacao,
  marcarKickoff,
  registrarJustificativaAtraso,
  updateEntregaPrevistaCliente,
  ROTULO_STATUS_ESCOPO,
  rotuloDiaSemana,
  listCalendariosParaEscolha,
  updateEscopoProjeto,
  updateDiaReuniaoPadrao,
  updateDiasAmbientacao,
  updateVagasAbertas,
} from "@/lib/projetos";
import type { CalendariosDaFrente } from "@/lib/projetos";
import { getCalendariosDaFrente, getSemestres } from "@/lib/calendario-academico";
import { getEscopos } from "@/lib/escopos";
import { NovoEscopoVendidoModal } from "./NovoEscopoVendidoModal";
import type { Escopo } from "@/types/banca";
import type { BancaDoEscopo, EscopoVendido, ProjetoCompleto } from "@/types/projeto";
import {
  PageStack,
  PageCard,
  PageCardHeader,
  PageCardTitle,
  PageCardContent,
  PageGrid,
  PageBadge,
  PageButton,
  PageButtonSm,
  EmptyText,
} from "@/styles/page.styled";
import {
  RemoverEscopoBotao,
  FieldGroup,
  FieldInput,
  FieldLabel,
  FieldSelect,
  FieldTextarea,
  FormErrorText,
  ModalOverlay,
  ModalHeader,
  ModalTitle,
  ModalClose,
  ModalBody,
  ModalFooter,
  WideModalContent,
  DatasGrid,
  DataItem,
  DataItemLargo,
  DataItemLabel,
  DataItemValor,
  DataItemMeta,
  DataItemDetalhe,
  DataItemCampo,
  DataItemEstado,
  DataTable,
  TableHead,
  TableHeadCell,
  TableBody,
  TableRow,
  TableCell,
  ProgressoWrap,
  ProgressoTrilha,
  ProgressoBarra,
  ProgressoTexto,
  Cadeado,
  EntregaCelula,
  EscopoNome,
  AtrasoCelula,
  JustificativaAtraso,
  FrenteBloco,
  FrenteCabecalho,
  BancaLinha,
  BancaEscopo,
  BancaData,
  EquipeSecao,
  EquipeSecaoTitulo,
  EquipeContagem,
  EquipeLinhaPessoa,
  EquipeAvatarLista,
} from "./Projetos.styled";
import { TabelaRolagem, SegmentedGroup, SegmentedButton } from "@/styles/shared.styled";
import { FotoCircular } from "@/components/Avatar";
import { corDaPessoa, iniciais } from "@/lib/avatar";
import { PendenciasProjeto } from "./PendenciasProjeto";
import { MinhasAcoesCard } from "./MinhasAcoesCard";
import { useProjeto } from "./ProjetoPage";
import { hojeEmBrasilia } from "@/lib/fuso";

export function ProjetoVisaoGeral() {
  /* Descrição, equipe e o botão de editar subiram para o cabeçalho fixo do
     projeto em 14/08/2026 — aqui sobrou o que é específico da Visão geral. */
  const { projeto, recarregar } = useProjeto();
  const { token } = useAuth();

  return (
    /* ⭐ **A página tinha quatro cards de mesmo peso, na ordem em que foram
       escritos.** Agora tem três zonas, na ordem em que se pergunta:

       1. **O que precisa de mim** — Pendências, e só quando há alguma.
       2. **Referência** — equipe e datas, lado a lado. É o "quem/quando"
          do projeto, e vem antes do trabalho vendido porque se pergunta
          antes dele.
       3. **O trabalho vendido** — os escopos e as bancas deles. É o assunto
          da aba, e ocupa a largura toda. */
    <PageStack>
      <PendenciasProjeto projeto={projeto} />
      {/* O que a gestão pediu pra MIM neste projeto (ações do Health Track).
          Só aparece quando existe alguma. */}
      <MinhasAcoesCard projetoId={projeto.id} />

      <PageGrid $columns={2}>
        <EquipeCard />
        <DatasCard projeto={projeto} token={token} recarregar={recarregar} />
      </PageGrid>

      <TabelaEscopos />

      {/* Uma banca por escopo, e o escopo é de uma frente — daí o recorte por
          frente, que é como a coordenação se organiza. Fica colado nos
          escopos porque é a mesma pergunta vista por outro corte. */}
      <BancasPorFrente />
    </PageStack>
  );
}

/* ------------------------------------------------------------------ */

/**
 * As seis datas do projeto.
 *
 * 📐 **Ordem por NARRATIVA, não por ordem de cadastro no banco.** Largada
 * (quando começa) → promessa e entrega (quando termina) → operação semanal →
 * metadado de auditoria por último, porque "Criado em" é a única data que
 * ninguém vem aqui procurar.
 *
 * As explicações permanentes viraram ícone "i": eram parágrafo fixo para todo
 * mundo, mesmo para quem já sabe como a tela funciona.
 */
function DatasCard({
  projeto,
  token,
  recarregar,
}: {
  projeto: ProjetoCompleto;
  token: string | null;
  recarregar: () => Promise<void>;
}) {
  return (
    <PageCard>
      <PageCardHeader>
        <PageCardTitle>Datas</PageCardTitle>
      </PageCardHeader>
      <PageCardContent>
        <DatasGrid>
          {/* Datas são AGENDADAS no Cronograma e só LIDAS aqui — a mesma data
              com duas portas de escrita foi o que se quis acabar. O KICKOFF é
              a exceção deliberada: é a única das seis sem regra de janela (não
              cai dentro nem fora de nada, não pede justificativa e não depende
              de banca), então nada se ganha em obrigar a ir ao calendário só
              para digitá-la. */}
          <DataEditavelKickoff projeto={projeto} token={token} recarregar={recarregar} />
          {/* Exceção do §5.3: por padrão a ambientação começa no próprio
              kickoff (linha acima), sem exceção — este item só existe pra
              quando, na prática, ela começou antes. Só o coordenador DESTE
              projeto ou a diretoria corrigem, nunca mais que os dias de
              ambientação abaixo, contados pra trás a partir do kickoff. */}
          <DataEditavelInicioAmbientacao projeto={projeto} token={token} recarregar={recarregar} />
          <DataEditavelDiasAmbientacao projeto={projeto} token={token} recarregar={recarregar} />

          {/* ⭐ A PROMESSA, ao lado do FATO. Duas datas de propósito: uma é o
              que foi combinado na venda, a outra o que de fato aconteceu
              (derivada do último escopo entregue). É a diferença entre elas
              que responde "entregamos no prazo?". */}
          <DataEditavelEntregaPrevista projeto={projeto} token={token} recarregar={recarregar} />
          <DataItem>
            {/* ⭐ **"Prometida" e "Entregue", não "prevista" e "ao cliente".**
                São dois campos distintos de propósito: um é o que foi
                COMBINADO na venda, o outro é o que ACONTECEU (derivado da
                entrega do último escopo). Com os nomes antigos a diferença
                dependia de ler o balão, e a dupla parecia repetição. Já foram
                um campo só, e a promessa era sobrescrita pela realidade na
                primeira entrega — aí some a medida de "entregamos no prazo?". */}
            <DataItemLabel>
              Entregue ao cliente
              <InfoDica rotulo="Sobre a entrega ao cliente">
                É a entrega do último escopo. Cada escopo tem a sua, registrada em{" "}
                <strong>Entrega</strong> no calendário do Cronograma.
              </InfoDica>
            </DataItemLabel>
            <DataItemValor>
              <span>{formatarData(projeto.data_entrega_cliente)}</span>
            </DataItemValor>
          </DataItem>

          <DataEditavelDiaReuniao projeto={projeto} token={token} recarregar={recarregar} />

          <DataEditavelCalendario projeto={projeto} token={token} recarregar={recarregar} />

          {/* Metadado de auditoria, não conteúdo do dia a dia: menor e por
              último, sem competir com as datas que alguém veio ler. */}
          <DataItemMeta>
            <DataItemLabel>Criado em</DataItemLabel>
            <DataItemValor>{formatarDataHora(projeto.criado_em)}</DataItemValor>
          </DataItemMeta>
        </DatasGrid>
      </PageCardContent>
    </PageCard>
  );
}

/* ------------------------------------------------------------------ */

/** Uma pessoa da equipe: avatar + nome.
 *
 *  ⚠ Fora do `EquipeCard` de propósito. Declarado dentro dele, seria um tipo
 *  de componente NOVO a cada render do card, e o React desmontaria e remontaria
 *  a linha inteira em vez de atualizá-la. */
function PessoaDaEquipe({ id, nome, foto }: { id: number; nome: string; foto: string | null }) {
  return (
    <EquipeLinhaPessoa>
      <EquipeAvatarLista $cor={corDaPessoa(id)}>
        {foto ? <FotoCircular src={foto} /> : iniciais(nome)}
      </EquipeAvatarLista>
      {nome}
    </EquipeLinhaPessoa>
  );
}

/**
 * A equipe do projeto, por extenso.
 *
 * ⭐ **Nasceu quando o cabeçalho encolheu.** Lá em cima a equipe virou uma
 * pilha de rostos — reconhecer quem está no projeto é instantâneo, e era isso
 * que o bloco de nomes fazia ocupando três linhas no topo de todas as abas.
 * Mas os nomes precisam existir em algum lugar legível, e o lugar é aqui: uma
 * aba só, com espaço, e onde já se vem conferir o cadastro.
 *
 * O teto de consultores aparece junto porque é o que responde "ainda cabe
 * gente?" — a pergunta que traz alguém a esta lista.
 */
function EquipeCard() {
  const { projeto, usuarios, abrirEdicao, recarregar } = useProjeto();
  const { usuario, token } = useAuth();
  const [alternandoVagas, setAlternandoVagas] = useState(false);
  // Mesma trava do lápis do cabeçalho: é o mesmo modal, e o front não pode
  // oferecer aqui uma porta que lá está fechada.
  const podeEditarEquipe = !!usuario?.permissoes.pode_editar_equipe;
  // ⭐ 2026-09-22 — a pedido: quem abre/fecha a declaração de interesse é
  // "diretoria de projetos, gerente, coordenador" (`require_lideranca` no
  // back) — gerência/diretoria já cai em `podeEditarEquipe`; falta somar
  // quem coordena ESTE projeto (coordenador não tem `pode_editar_equipe`).
  const souCoordenadorDoProjeto = projeto.equipe.some(
    (m) => m.usuario_id === usuario?.id && m.papel === "coordenador",
  );
  const podeAbrirFecharVagas = podeEditarEquipe || souCoordenadorDoProjeto;

  const nomeUsuario = (id: number) => usuarios.find((u) => u.id === id)?.nome ?? `Usuário ${id}`;
  const fotoUsuario = (id: number) => usuarios.find((u) => u.id === id)?.foto ?? null;
  const coordenadores = projeto.equipe.filter((m) => m.papel === "coordenador");
  const consultores = projeto.equipe.filter((m) => m.papel !== "coordenador");
  // Quem vendeu, à parte da equipe que executa: vender não ocupa vaga de
  // consultor nem entra na capacidade. Fica numa seção própria abaixo.
  const vendedores = projeto.vendedor_ids ?? [];
  // Teto cru — ver o comentário em `ProjetoPage.tsx`.
  const teto = projeto.max_consultores ?? 0;

  async function alternarVagasAbertas() {
    if (!token) return;
    setAlternandoVagas(true);
    try {
      await updateVagasAbertas(projeto.id, !projeto.vagas_abertas, token);
      await recarregar();
    } finally {
      setAlternandoVagas(false);
    }
  }

  return (
    <PageCard>
      <PageCardHeader>
        <PageCardTitle>Equipe</PageCardTitle>
        {/* ⭐ Editar a equipe a partir de onde ela É LIDA. Antes, para trocar
            um consultor, era preciso saber que o caminho passava por um menu
            no cabeçalho chamado "Editar projeto" — nada nesta lista dizia que
            ela era editável. */}
        {podeEditarEquipe && (
          <PageButtonSm type="button" $variant="outline" onClick={abrirEdicao}>
            <UserPen size={14} />
            Editar equipe
          </PageButtonSm>
        )}
      </PageCardHeader>
      <PageCardContent>
        <EquipeSecao>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            <PageBadge $tone={projeto.vagas_abertas ? "success" : "muted"}>
              Declaração de interesse: {projeto.vagas_abertas ? "aberta" : "fechada"}
            </PageBadge>
            {podeAbrirFecharVagas && (
              <PageButtonSm
                type="button"
                $variant="outline"
                disabled={alternandoVagas}
                onClick={alternarVagasAbertas}
                title={
                  projeto.vagas_abertas
                    ? "Tira o projeto de Vagas em Projetos."
                    : "Põe o projeto em Vagas em Projetos e avisa os consultores das frentes dele."
                }
              >
                {alternandoVagas ? "..." : projeto.vagas_abertas ? "Fechar vagas" : "Abrir vagas"}
              </PageButtonSm>
            )}
          </div>
        </EquipeSecao>
        <EquipeSecao>
          <EquipeSecaoTitulo>Coordenação</EquipeSecaoTitulo>
          {coordenadores.length === 0 ? (
            <EmptyText>Sem coordenador</EmptyText>
          ) : (
            coordenadores.map((m) => (
              <PessoaDaEquipe key={m.usuario_id} nome={nomeUsuario(m.usuario_id)} foto={fotoUsuario(m.usuario_id)} id={m.usuario_id} />
            ))
          )}
        </EquipeSecao>

        <EquipeSecao>
          <EquipeSecaoTitulo>
            Consultores
            {teto > 0 && (
              <EquipeContagem $cheio={consultores.length >= teto}>
                {consultores.length} de {teto}
              </EquipeContagem>
            )}
          </EquipeSecaoTitulo>
          {consultores.length === 0 ? (
            <EmptyText>Ninguém alocado</EmptyText>
          ) : (
            consultores.map((m) => (
              <PessoaDaEquipe
                key={`${m.usuario_id}-${m.entrou_em}`}
                nome={nomeUsuario(m.usuario_id)}
                foto={fotoUsuario(m.usuario_id)}
                id={m.usuario_id}
              />
            ))
          )}
        </EquipeSecao>

        {/* Só aparece quando alguém vendeu: a maioria dos projetos não tem
            vendedor registrado, e uma seção "Sem vendedor" fixa seria ruído.
            Quem vendeu não faz parte do time que entrega. Está aqui como
            registro comercial, e pode avaliar a banca deste projeto. */}
        {vendedores.length > 0 && (
          <EquipeSecao>
            <EquipeSecaoTitulo>Vendas</EquipeSecaoTitulo>
            {vendedores.map((id) => (
              <PessoaDaEquipe key={id} nome={nomeUsuario(id)} foto={fotoUsuario(id)} id={id} />
            ))}
          </EquipeSecao>
        )}
      </PageCardContent>
    </PageCard>
  );
}

/* ------------------------------------------------------------------ */

/**
 * Por que ESTA entrega está travada, os quatro degraus.
 *
 * Um texto único ("a entrega só libera depois da banca ser aprovada") deixa
 * quem lê sem próximo passo: marcar a banca, esperar os votos e marcar uma
 * segunda banca são ações diferentes, e o cadeado é o único lugar onde essa
 * diferença aparece na tela.
 */
function motivoDaTrava(banca: BancaDoEscopo | null): string {
  if (!banca) return "Este escopo ainda não tem banca marcada, marque-a no Cronograma.";
  if (!banca.realizado_em) return "A banca deste escopo ainda não foi realizada.";
  if (banca.resultado === "nao_aprovada")
    return "A banca não foi aprovada, é preciso marcar uma nova banca antes de entregar ao cliente.";
  if (!banca.resultado)
    return "A banca aconteceu, mas ainda não tem resultado: a entrega libera quando os avaliadores votarem.";
  return "A entrega só é liberada depois da banca do escopo ser aprovada.";
}

/**
 * A tabela do escopo · status · dias usados · banca · entrega.
 *
 * O cadeado na entrega é conveniência de UI, quem barra de verdade é
 * `RegistrarEntregaEscopoUseCase` no backend, que devolve 422 enquanto a
 * banca do escopo não estiver aprovada.
 */
function TabelaEscopos() {
  const { projeto, frentes, recarregar } = useProjeto();
  const { usuario, token } = useAuth();
  /** o escopo cujo atraso está sendo justificado. */
  const [justificando, setJustificando] = useState<{
    escopoId: number;
    nome: string;
    dias: number;
  } | null>(null);
  /**
   * Quem escreve o porquê do atraso: coordenação, gerência e diretoria.
   *
   * Espelha o `require_lideranca` da rota, consultor vê o atraso mas não
   * responde por ele. O front só ESCONDE; quem decide é o backend.
   */
  const podeJustificar = !!usuario && usuario.posicao !== "consultor";
  // marcar kickoff e data de entrega é dos QUATRO perfis, a
  // responsabilidade é do coordenador, mas o acesso não é exclusivo dele.
  // (O backend usa só `exigir_acesso_ao_projeto` aqui; o front não pode ser
  // mais restrito que ele, ou esconde um botão que a pessoa tem direito de ver.)
  const podeConduzir = !!usuario?.permissoes.pode_marcar_kickoff;
  /**
   * ⭐ Confirmar a entrega é de VÍNCULO, não de cargo: o coordenador DESTE
   * projeto ou a diretoria. Um coordenador de outro projeto tem a mesma
   * posição e não confirma este — por isso a comparação é com
   * `projeto.coordenador_id`, e não com `usuario.posicao`.
   *
   * (O front só esconde o botão; quem recusa é o use case, que checa a equipe.)
   */
  const podeConfirmar =
    !!usuario && (ehDiretoriaDeProjetos(usuario) || usuario.id === projeto.coordenador_id);

  /**
   * ⭐ Mexer na LISTA de escopos vendidos: acrescentar e remover (§4).
   *
   * São exatamente dois (2026-08-31): o coordenador DESTE projeto — é ele quem
   * descobre que faltou um escopo ou que um entrou em duplicidade — e a
   * diretoria de projetos. A gerência de frente, que entrava junto da
   * diretoria, deixou de entrar.
   *
   * ⚠ `coordenador_ids` e não `coordenador_id`: o singular é o primeiro da
   * lista, mantido só para telas antigas, e um projeto pode ter mais de um
   * coordenador. O front só ESCONDE — quem recusa é `exigir_pode_editar_escopos`.
   */
  const podeEditarEscopos =
    !!usuario &&
    (ehDiretoriaDeProjetos(usuario) || projeto.coordenador_ids.includes(usuario.id));

  const [adicionandoEscopo, setAdicionandoEscopo] = useState(false);
  const [escopoParaRemover, setEscopoParaRemover] = useState<EscopoVendido | null>(null);
  /** O catálogo só é buscado quando o modal abre — quem não edita não paga. */
  const [catalogo, setCatalogo] = useState<Escopo[]>([]);
  /** Os calendários escolhíveis, pela mesma régua do catálogo: só quando o
   *  modal abre. É deles que sai o campo obrigatório do §5.4. */
  const [calendariosParaEscolha, setCalendariosParaEscolha] = useState<CalendariosDaFrente[]>([]);
  /** `frentes` do contexto são TODAS; o escopo só pode ser de uma do projeto,
   *  e o backend recusa o resto (`validar_escopo_vendido`). */
  const frentesDoProjeto = useMemo(
    () => frentes.filter((f) => projeto.frente_ids.includes(f.id)),
    [frentes, projeto.frente_ids],
  );

  useEffect(() => {
    if (!adicionandoEscopo || !token || catalogo.length > 0) return;
    getEscopos(token)
      .then(setCatalogo)
      .catch(() => setCatalogo([]));
  }, [adicionandoEscopo, token, catalogo.length]);

  // ⚠ Lista vazia em caso de falha, e NÃO um erro na tela: sem as opções o
  // seletor do modal fica desabilitado e o envio é barrado ali mesmo, com a
  // mensagem do próprio campo. Um erro aqui apareceria antes de a pessoa ter
  // sequer aberto o modal.
  useEffect(() => {
    if (!adicionandoEscopo || !token || calendariosParaEscolha.length > 0) return;
    listCalendariosParaEscolha(token)
      .then(setCalendariosParaEscolha)
      .catch(() => setCalendariosParaEscolha([]));
  }, [adicionandoEscopo, token, calendariosParaEscolha.length]);

  async function adicionarEscopo(dados: Parameters<typeof createEscopoProjeto>[1]) {
    if (!token) return;
    // O erro sobe: o modal mostra e continua aberto, com o que foi digitado.
    await createEscopoProjeto(projeto.id, dados, token);
    setAdicionandoEscopo(false);
    await recarregar();
  }

  async function removerEscopo() {
    if (!token || !escopoParaRemover) return;
    // O erro SOBE: o `ConfirmarModal` mostra a recusa do backend (escopo com
    // banca marcada, por exemplo) e continua aberto. Tratar aqui seria fechar
    // o modal e reescrever a mensagem num lugar mais longe da ação.
    await deleteEscopoProjeto(escopoParaRemover.id, token);
    setEscopoParaRemover(null);
    await recarregar();
  }

  // A única escrita daqui é a JUSTIFICATIVA DO ATRASO, e ela é
  // exceção pelo mesmo motivo que o resto não é: datas de escopo, banca e
  // entrega, se agendam no Cronograma, onde dá para ver o dia contra a janela
  // e o calendário do Insper. Já o "por que estourou" não é data nenhuma; é a
  // resposta ao número que ESTA tabela mostra, e mandar a pessoa para outra
  // tela para escrevê-la é o que fazia ninguém escrever.

  return (
    <PageCard>
      <PageCardHeader>
        {/* ⭐ A legenda de quatro parágrafos que ficava sempre visível embaixo
            da tabela virou UM ícone aqui. Ela explica um mecanismo (como os
            dias são contados, o que é correção, quando o status muda), não um
            dado — é exatamente o tipo de texto que se lê uma vez e nunca
            mais, e que agora só aparece pra quem tem a dúvida. */}
        <PageCardTitle>
          Escopos vendidos
          <InfoDica rotulo="Como esta tabela funciona">
            Um escopo começa a contar na <strong>reunião inicial</strong> dele — marque-a no{" "}
            <strong>Cronograma</strong>, escolhendo o escopo e clicando no dia. A banca não
            precisa estar marcada antes; é ela que precisa caber na janela que a reunião abre.
            <br />
            <br />
            "Dias usados" conta até a banca ser realizada — feriados e recessos do calendário do
            Insper não entram, e por isso Dias usados e Atraso falam do mesmo estouro.
            <br />
            <br />O que se pinta depois da banca é <strong>correção</strong>: tem coluna própria e
            não consome dias vendidos.
            <br />
            <br />
            Marcar a entrega no Cronograma não muda o status — o escopo vira{" "}
            <strong>Entregue</strong> quando alguém clica em <em>Confirmar entrega</em> aqui nesta
            tabela.
          </InfoDica>
        </PageCardTitle>
        {podeEditarEscopos && (
          <PageButtonSm type="button" onClick={() => setAdicionandoEscopo(true)}>
            <Plus size={14} aria-hidden />
            Adicionar escopo
          </PageButtonSm>
        )}
      </PageCardHeader>
      <PageCardContent>
        {projeto.escopos.length === 0 ? (
          <EmptyText>Nenhum escopo cadastrado neste projeto.</EmptyText>
        ) : (
          <>
            {/* 7 colunas, três delas com dica de rodapé: é a tabela mais larga
                da página do projeto. A 8ª (a lixeira) só existe para quem edita
                escopos, e por isso a largura mínima cresce só para essa pessoa
                — do contrário a tabela ganharia rolagem lateral para todo mundo
                por causa de uma coluna que a maioria não vê. */}
            <TabelaRolagem $min={podeEditarEscopos ? "60rem" : "56rem"}>
              <DataTable>
                <TableHead>
                  <TableRow>
                    <TableHeadCell>Escopo</TableHeadCell>
                    <TableHeadCell>Status</TableHeadCell>
                    <TableHeadCell>Dias usados</TableHeadCell>
                    <TableHeadCell>
                      Atraso
                      <InfoDica rotulo="Sobre a coluna Atraso">
                        Dias úteis além da janela do escopo.
                      </InfoDica>
                    </TableHeadCell>
                    <TableHeadCell>
                      Correções
                      <InfoDica rotulo="Sobre a coluna Correções">
                        Dias úteis pintados depois da banca — não consomem dias vendidos.
                      </InfoDica>
                    </TableHeadCell>
                    <TableHeadCell>Banca</TableHeadCell>
                    <TableHeadCell>Entrega</TableHeadCell>
                    {/* Sem rótulo: a coluna é só a lixeira, e "Ações" sobre um
                        ícone único é uma palavra que não informa nada. */}
                    {podeEditarEscopos && <TableHeadCell aria-label="Remover" />}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {projeto.escopos.map((escopo) => {
                    // A barra mede contra a JANELA (vendidos + ajustados):
                    // quem ganhou 10 dias tem 10 dias a mais para gastar, senão a
                    // autorização não teria efeito nenhum na tela.
                    const janela = escopo.dias_uteis_vendidos + escopo.dias_uteis_ajustados;
                    const percentual = janela > 0 ? (escopo.consumidos / janela) * 100 : 0;
                    const banca = escopo.banca;
                    return (
                      <TableRow key={escopo.id}>
                        <TableCell>
                          <EscopoNome>
                            <strong>{escopo.nome}</strong>
                            {escopo.data_inicio && (
                              <small>desde {formatarData(escopo.data_inicio)}</small>
                            )}
                          </EscopoNome>
                        </TableCell>

                        <TableCell>
                          <PageBadge
                            $tone={
                              escopo.status === "entregue"
                                ? "success"
                                : escopo.status === "em_andamento"
                                  ? "default"
                                  : "muted"
                            }
                          >
                            {ROTULO_STATUS_ESCOPO[escopo.status]}
                          </PageBadge>
                        </TableCell>

                        <TableCell>
                          <ProgressoWrap>
                            <ProgressoTrilha>
                              <ProgressoBarra
                                $percentual={percentual}
                                $estourou={escopo.estourou}
                              />
                            </ProgressoTrilha>
                            <ProgressoTexto $estourou={escopo.estourou}>
                              {escopo.consumidos}/{janela}
                              {escopo.estourou && ` (+${Math.abs(escopo.restantes)})`}
                            </ProgressoTexto>
                            {/* Vendidos e ajustados NUNCA aparecem somados num
                                número só: a diferença entre ter vendido 30 e ter
                                vendido 20 e precisado de mais 10 é a informação
                                inteira. A barra usa a soma; o texto, a separação. */}
                            <small>
                              {escopo.dias_uteis_vendidos} vendidos
                              {escopo.dias_uteis_ajustados !== 0 &&
                                (escopo.dias_uteis_ajustados > 0
                                  ? ` · ${escopo.dias_uteis_ajustados} ajustados`
                                  : ` · ${Math.abs(escopo.dias_uteis_ajustados)} a menos`)}
                            </small>
                          </ProgressoWrap>
                        </TableCell>

                        <TableCell>
                          {escopo.atraso > 0 ? (
                            <AtrasoCelula>
                              <PageBadge $tone="danger">
                                {escopo.atraso} {escopo.atraso === 1 ? "dia" : "dias"}
                              </PageBadge>
                              {/* o número diz QUANTO; só a nota diz POR
                                  QUÊ, e é ela que a diretoria lê no Monitoramento.
                                  Pedir aqui é pedir a quem está conduzindo o
                                  escopo, enquanto o motivo ainda está fresco. */}
                              {escopo.justificativa_atraso ? (
                                <JustificativaAtraso
                                  title={`${escopo.justificativa_atraso.registrado_por ?? "alguém"} em ${formatarData(escopo.justificativa_atraso.registrado_em)}`}
                                >
                                  {escopo.justificativa_atraso.texto}
                                </JustificativaAtraso>
                              ) : podeJustificar ? (
                                <PageButtonSm
                                  type="button"
                                  $variant="outline"
                                  onClick={() =>
                                    setJustificando({
                                      escopoId: escopo.id,
                                      nome: escopo.nome,
                                      dias: escopo.atraso,
                                    })
                                  }
                                >
                                  Justificar atraso
                                </PageButtonSm>
                              ) : (
                                // Consultor vê o atraso, mas não escreve a nota
                                // (o backend cobra `require_lideranca`).
                                <EmptyText>Sem justificativa</EmptyText>
                              )}
                            </AtrasoCelula>
                          ) : (
                            <EmptyText>—</EmptyText>
                          )}
                        </TableCell>

                        <TableCell>
                          {escopo.correcoes > 0 ? (
                            <PageBadge $tone="muted">
                              {escopo.correcoes} {escopo.correcoes === 1 ? "dia" : "dias"}
                            </PageBadge>
                          ) : (
                            <EmptyText>—</EmptyText>
                          )}
                        </TableCell>

                        <TableCell>
                          {banca ? (
                            <PageBadge $tone={tomDoStatusBanca(banca.status)}>
                              {banca.data_hora ? formatarDataHoraBanca(banca.data_hora) : "—"} ·{" "}
                              {ROTULO_STATUS_BANCA[banca.status]}
                            </PageBadge>
                          ) : (
                            <EmptyText>—</EmptyText>
                          )}
                        </TableCell>

                        <TableCell>
                          {escopo.data_entrega_real || escopo.entrega_liberada ? (
                            <CelulaEntrega
                              escopo={escopo}
                              projetoId={projeto.id}
                              podeConfirmar={podeConfirmar}
                              podeConduzir={podeConduzir}
                              onConfirmou={recarregar}
                            />
                          ) : (
                            <Cadeado title={motivoDaTrava(escopo.banca)}>
                              <Lock size={12} />
                              travada
                            </Cadeado>
                          )}
                        </TableCell>

                        {podeEditarEscopos && (
                          <TableCell>
                            {/* O backend recusa escopo com banca marcada; aqui
                                o botão já sai desabilitado dizendo por quê, em
                                vez de deixar clicar e devolver 422. */}
                            <RemoverEscopoBotao
                              type="button"
                              disabled={!!banca}
                              aria-label={`Remover o escopo ${escopo.nome}`}
                              title={
                                banca
                                  ? "Escopo com banca marcada não pode ser removido"
                                  : "Remover escopo"
                              }
                              onClick={() => setEscopoParaRemover(escopo)}
                            >
                              <Trash2 size={14} />
                            </RemoverEscopoBotao>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </DataTable>
            </TabelaRolagem>
          </>
        )}
      </PageCardContent>

      {adicionandoEscopo && (
        <NovoEscopoVendidoModal
          catalogo={catalogo}
          calendarios={calendariosParaEscolha}
          frentes={frentesDoProjeto}
          jaVendidos={projeto.escopos}
          onCancelar={() => setAdicionandoEscopo(false)}
          onCriar={adicionarEscopo}
        />
      )}

      {escopoParaRemover && (
        <ConfirmarModal
          titulo="Remover escopo"
          mensagem={
            <>
              O escopo <strong>{escopoParaRemover.nome}</strong> sai deste projeto, e com
              ele as etapas pintadas no cronograma dele. As reuniões já registradas não
              somem — voltam a ser reuniões gerais do projeto.
            </>
          }
          rotuloConfirmar="Remover"
          onCancelar={() => setEscopoParaRemover(null)}
          onConfirmar={removerEscopo}
        />
      )}

      {justificando && token && (
        <JustificarAtrasoEscopoModal
          escopoId={justificando.escopoId}
          nome={justificando.nome}
          dias={justificando.dias}
          projetoId={projeto.id}
          token={token}
          onFechar={() => setJustificando(null)}
          onSalvo={async () => {
            setJustificando(null);
            // Recarrega o projeto: a nota volta no escopo e a célula troca o
            // botão pelo texto, sem a pessoa precisar dar F5 para acreditar.
            await recarregar();
          }}
        />
      )}
    </PageCard>
  );
}

/**
 * A célula "Entrega" de um escopo cuja banca já aprovou.
 *
 * ⭐ **A data não entrega o escopo — a confirmação entrega.** As duas coisas já
 * foram uma só: marcar o dia no Cronograma virava o status na tabela. Só que
 * marcar um dia é gesto de calendário (corrigível, clicável por engano) e o
 * status "Entregue" é lido como uma afirmação sobre o cliente.
 *
 * ⚠ **Mas confirmar não exige ter marcado antes.** Exigir mandava a pessoa ao
 * Cronograma, de volta para cá e a um segundo clique — dois gestos em duas
 * telas para um fato só, e o botão nem aparecia enquanto isso. Quando não há
 * data, o próprio modal pergunta o dia. O Cronograma continua sendo o caminho
 * de quem quer VER a data contra a janela antes de cravá-la.
 *
 * 🔒 O botão só aparece para o coordenador do projeto e para a diretoria — e a
 * confirmação não tem volta pela interface, por isso passa por um modal.
 */
function CelulaEntrega({
  escopo,
  projetoId,
  podeConfirmar,
  podeConduzir,
  onConfirmou,
}: {
  escopo: EscopoVendido;
  projetoId: number;
  podeConfirmar: boolean;
  podeConduzir: boolean;
  onConfirmou: () => Promise<void> | void;
}) {
  const { token } = useAuth();
  const [confirmando, setConfirmando] = useState(false);
  // Sugerido, não cravado: a entrega quase nunca é no dia em que alguém lembra
  // de registrá-la, mas hoje é o palpite certo na maioria das vezes.
  const [dia, setDia] = useState(() => hojeEmBrasilia());

  const data = escopo.data_entrega_real ? formatarData(escopo.data_entrega_real) : null;

  if (escopo.entrega_confirmada_em) {
    return (
      <EntregaCelula>
        {data}
        <small title={`Confirmada em ${formatarDataHora(escopo.entrega_confirmada_em)}`}>
          ✓ confirmada
          {escopo.entrega_confirmada_por && ` por ${escopo.entrega_confirmada_por}`}
        </small>
      </EntregaCelula>
    );
  }

  return (
    <EntregaCelula>
      {data}
      {podeConfirmar ? (
        <PageButtonSm type="button" $variant="outline" onClick={() => setConfirmando(true)}>
          Confirmar entrega
        </PageButtonSm>
      ) : data ? (
        // Quem não confirma ainda precisa saber por que a linha não diz
        // "Entregue" — senão a data parece não ter surtido efeito.
        <small>aguardando confirmação</small>
      ) : podeConduzir ? (
        <PageButtonSm as={Link} to={`/projetos/${projetoId}/cronograma`} $variant="outline">
          Marcar no Cronograma
        </PageButtonSm>
      ) : (
        <EmptyText>liberada</EmptyText>
      )}

      {confirmando && token && (
        <ConfirmarModal
          titulo="Confirmar a entrega deste escopo"
          rotuloConfirmar="Confirmar entrega"
          rotuloProcessando="Confirmando…"
          mensagem={
            <>
              <p>
                Isto marca <strong>{escopo.nome}</strong> como{" "}
                <strong>entregue ao cliente</strong>
                {data ? ` em ${data}.` : "."}
              </p>
              {!data && (
                <FieldGroup>
                  <FieldLabel htmlFor="dia-entrega">Dia da entrega</FieldLabel>
                  <FieldInput
                    id="dia-entrega"
                    type="date"
                    value={dia}
                    onChange={(e) => setDia(e.target.value)}
                  />
                </FieldGroup>
              )}
              <p>
                O status passa a valer para a diretoria e para o Monitoramento, e não há
                como desfazer pela plataforma. Confirme só depois de a entrega ter
                acontecido de fato.
              </p>
            </>
          }
          onCancelar={() => setConfirmando(false)}
          onConfirmar={async () => {
            // Manda o dia só quando não existe data: mudar entrega registrada é
            // do §13 (diretoria + justificativa) e tem porta própria.
            await confirmarEntregaEscopo(escopo.id, token, data ? undefined : dia);
            setConfirmando(false);
            // Recarrega para a linha trocar o botão pelo "✓ confirmada" e o
            // status do escopo (e, se foi o último, o do projeto) virar junto.
            await onConfirmou();
          }}
        />
      )}
    </EntregaCelula>
  );
}

/**
 * §7.4/§10: por que este escopo passou da janela.
 *
 * Escreve na MESMA tabela que a nota da diretoria (`projeto_justificativa_atraso`),
 * com `motivo_tipo: "escopo"`, o que a faz aparecer no Histórico do projeto
 * e na aba Atrasos do Monitoramento sem nenhuma fiação nova.
 *
 * Não é um campo editável: cada envio cria uma nota nova, e a anterior
 * continua no Histórico. É registro, não formulário, foi assim que o 
 * definiu, e apagar o que se disse antes tiraria justamente a leitura de como
 * a explicação mudou ao longo do atraso.
 */
function JustificarAtrasoEscopoModal({
  escopoId,
  nome,
  dias,
  projetoId,
  token,
  onFechar,
  onSalvo,
}: {
  escopoId: number;
  nome: string;
  dias: number;
  projetoId: number;
  token: string;
  onFechar: () => void;
  onSalvo: () => void | Promise<void>;
}) {
  const [texto, setTexto] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  async function salvar() {
    setErro("");
    setSalvando(true);
    try {
      await registrarJustificativaAtraso(projetoId, texto.trim(), token, escopoId, "escopo");
      await onSalvo();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível salvar a justificativa");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <ModalOverlay onClick={onFechar} role="presentation">
      <WideModalContent
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="justificar-atraso-titulo"
      >
        <ModalHeader>
          <ModalTitle id="justificar-atraso-titulo">Justificar o atraso</ModalTitle>
          <ModalClose type="button" aria-label="Fechar" onClick={onFechar}>
            <X size={18} />
          </ModalClose>
        </ModalHeader>
        <ModalBody>
          <p>
            <strong>{nome}</strong> passou <strong>{dias} {dias === 1 ? "dia útil" : "dias úteis"}</strong>{" "}
            além da janela vendida. Explique o motivo, a nota fica no Histórico do
            projeto e a diretoria a lê no Monitoramento.
          </p>
          <FieldTextarea
            rows={4}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Ex.: o cliente atrasou o envio dos documentos e a equipe ficou parada duas semanas."
          />
          {erro && <FormErrorText>{erro}</FormErrorText>}
        </ModalBody>
        <ModalFooter>
          <PageButton type="button" $variant="ghost" onClick={onFechar}>
            Cancelar
          </PageButton>
          <PageButton type="button" disabled={salvando || !texto.trim()} onClick={salvar}>
            {salvando ? "Salvando..." : "Salvar"}
          </PageButton>
        </ModalFooter>
      </WideModalContent>
    </ModalOverlay>
  );
}

/* ------------------------------------------------------------------ */

/**
 * As bancas do projeto, uma seção por frente.
 *
 * "Cada escopo tem a sua própria banca" e cada escopo pertence a uma
 * frente, então um projeto sinérgico de Business + Direito tem a banca de
 * Análise Mercadológica **em Business** e a de Revisão Contratual **em
 * Direito**, com composições e pisos diferentes. A tabela de escopos mostra
 * a banca como uma coluna no meio de dias e entrega; aqui o recorte é o que
 * a coordenação usa para se organizar: o que cada frente tem pela frente.
 *
 * Frente que o projeto contempla mas ainda não tem escopo aparece assim
 * mesmo, vazia, é informação, não erro: alguém vendeu a frente e ainda não
 * cadastrou o escopo dela.
 */
function BancasPorFrente() {
  const { projeto, frentes } = useProjeto();
  const { usuario } = useAuth();

  const nomeFrente = (id: number) => frentes.find((f) => f.id === id)?.nome ?? `Frente ${id}`;

  // marcar/remarcar banca é de liderança, o backend usa
  // `require_lideranca` e cobra justificativa da diretoria na remarcação.
  const podeMarcar = !!usuario?.permissoes.pode_definir_cronograma;

  // A ordem é a das frentes do projeto; escopo de uma frente que saiu do
  // projeto ainda aparece, senão a banca dele sumiria da tela sem aviso.
  const idsDeEscopo = [...new Set(projeto.escopos.map((e) => e.frente_id))];
  const frenteIds = [
    ...projeto.frente_ids,
    ...idsDeEscopo.filter((id) => !projeto.frente_ids.includes(id)),
  ];

  return (
    <PageCard>
      <PageCardHeader>
        <PageCardTitle>
          Bancas por escopo
          {/* A legenda que ficava sempre visível no rodapé: explica um
              mecanismo (uma banca pode cobrir vários escopos), não um dado —
              lê-se uma vez e nunca mais. */}
          <InfoDica rotulo="Como as bancas se relacionam com os escopos">
            Cada escopo tem no máximo uma banca, mas <strong>uma banca pode avaliar vários
            escopos</strong> do projeto — quem marca escolhe quais, no <strong>Cronograma</strong>.
            <br />
            <br />A banca herda as frentes dos escopos que cobre, e são elas que definem a
            composição exigida e quem pode ser escalado.
            <br />
            <br />A data é a mesma que aparece em Bancas e no Cronograma: um registro só, lido de
            três lugares.
          </InfoDica>
        </PageCardTitle>
      </PageCardHeader>
      <PageCardContent>
        {frenteIds.length === 0 ? (
          <EmptyText>Este projeto não tem frentes cadastradas.</EmptyText>
        ) : (
          frenteIds.map((frenteId) => {
            const escoposDaFrente = projeto.escopos.filter((e) => e.frente_id === frenteId);
            /* ⚠ Conta banca COM DATA, não banca que existe.
               O backend cria a linha da banca junto do escopo, ainda sem data
               (`status: nao_marcada`) — então `filter(e => e.banca)` dizia
               "1 de 1 banca marcada" na mesma tela em que a linha de baixo
               dizia "Não marcada". Marcar uma banca é dar data a ela. */
            const marcadas = escoposDaFrente.filter((e) => e.banca?.data_hora).length;
            return (
              <FrenteBloco key={frenteId}>
                <FrenteCabecalho>
                  <h3>{nomeFrente(frenteId)}</h3>
                  <small>
                    {escoposDaFrente.length === 0
                      ? "sem escopo cadastrado"
                      : `${marcadas} de ${escoposDaFrente.length} ${
                          escoposDaFrente.length === 1 ? "banca marcada" : "bancas marcadas"
                        }`}
                  </small>
                </FrenteCabecalho>

                {escoposDaFrente.length === 0 ? (
                  <EmptyText>
                    A frente foi vendida, mas ainda não há escopo cadastrado nela — e é o escopo que
                    tem banca.
                  </EmptyText>
                ) : (
                  escoposDaFrente.map((escopo) => {
                    const banca = escopo.banca;
                    const temData = !!banca?.data_hora;
                    return (
                      <BancaLinha key={escopo.id}>
                        <BancaEscopo>
                          {escopo.nome}
                          {/* Sem esta linha, a mesma data repetida em dois
                              escopos pareceria cadastro duplicado, e não é:
                              é uma banca só avaliando os dois. */}
                          {banca && banca.escopo_ids.length > 1 && (
                            <small>
                              mesma banca de{" "}
                              {projeto.escopos
                                .filter((e) => e.id !== escopo.id && banca.escopo_ids.includes(e.id))
                                .map((e) => e.nome)
                                .join(", ")}
                            </small>
                          )}
                        </BancaEscopo>

                        {/* ⚠ Data OU status, nunca os dois. Sem data, "sem
                            data" ao lado de "Não marcada" dizia a mesma coisa
                            duas vezes; com data, o status é o que a data não
                            conta (realizada, aprovada). */}
                        {temData ? (
                          <>
                            <BancaData>{formatarDataHora(banca!.data_hora!)}</BancaData>
                            <PageBadge $tone={tomDoStatusBanca(banca!.status)}>
                              {ROTULO_STATUS_BANCA[banca!.status]}
                            </PageBadge>
                          </>
                        ) : (
                          <PageBadge $tone="muted">não marcada</PageBadge>
                        )}

                        {podeMarcar && (
                          /* A data da banca é agendada no Cronograma, onde dá
                             para ver se ela cai dentro da janela do escopo —
                             que é a regra que a governa. */
                          <PageButtonSm
                            as={Link}
                            to={`/projetos/${projeto.id}/cronograma`}
                            $variant="outline"
                          >
                            {temData ? "Remarcar" : "Marcar no Cronograma"}
                          </PageButtonSm>
                        )}
                      </BancaLinha>
                    );
                  })
                )}
              </FrenteBloco>
            );
          })
        )}
      </PageCardContent>
    </PageCard>
  );
}

/* ------------------------------------------------------------------ */

/* O MarcarBancaModal que morava aqui virou `./MarcarBancaModal.tsx`, usado
   pelo Cronograma: a banca passou a ser marcada clicando no dia, onde dá para
   ver se ela cai dentro da janela do escopo. Esta tela só a exibe. */

/* ------------------------------------------------------------------ */

/**
 * O kickoff, editável aqui **e** marcável no calendário.
 *
 * A exceção às outras datas do projeto: sem janela para respeitar, sem
 * justificativa, sem gate de diretoria. Digitar direto é o caminho curto de
 * quem só quer corrigir um dia; o calendário continua sendo o caminho de quem
 * está montando o cronograma e quer ver a ambientação nascer dali.
 */
function DataEditavelKickoff({
  projeto,
  token,
  recarregar,
}: {
  projeto: ProjetoCompleto;
  token: string | null;
  recarregar: () => Promise<void>;
}) {
  const { usuario } = useAuth();
  // Mesma permissão do backend (`require_pode_marcar_kickoff` em
  // `routers/projetos.py`), sem esse gate o botão aparecia pra qualquer um,
  // que só descobria que não podia depois de preencher e salvar (403).
  const podeEditar = !!usuario?.permissoes.pode_marcar_kickoff;
  const [editando, setEditando] = useState(false);
  const [data, setData] = useState(projeto.data_kickoff?.slice(0, 10) ?? "");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  async function salvar() {
    if (!token || !data) return;
    setSalvando(true);
    setErro("");
    try {
      await marcarKickoff(projeto.id, data, token);
      setEditando(false);
      await recarregar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao salvar a data");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <DataItem>
      <DataItemLabel>Kickoff</DataItemLabel>
      <DataItemValor>
        {editando ? (
          <>
            <FieldInput
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              aria-label="Kickoff"
            />
            <PageButtonSm type="button" disabled={salvando || !data} onClick={salvar}>
              {salvando ? "Salvando…" : "Salvar"}
            </PageButtonSm>
            <PageButtonSm
              type="button"
              $variant="ghost"
              onClick={() => {
                setEditando(false);
                setData(projeto.data_kickoff?.slice(0, 10) ?? "");
                setErro("");
              }}
            >
              Cancelar
            </PageButtonSm>
          </>
        ) : (
          <>
            <span>{formatarData(projeto.data_kickoff)}</span>
            {podeEditar && (
              <PageButtonSm type="button" $variant="ghost" onClick={() => setEditando(true)}>
                {projeto.data_kickoff ? "Alterar" : "Marcar"}
              </PageButtonSm>
            )}
          </>
        )}
      </DataItemValor>
      {erro && <FormErrorText>{erro}</FormErrorText>}
    </DataItem>
  );
}

/* ------------------------------------------------------------------ */

/**
 * A exceção do §5.3: por padrão a ambientação começa no próprio kickoff,
 * sem exceção — este item só aparece com algo pra dizer quando o time, na
 * prática, já estava em campo antes do kickoff formal e o coordenador
 * corrige o registro.
 *
 * ⭐ Vínculo com o projeto, não cargo: mesmo idioma de `podeConfirmar`
 * (confirmar entrega, mais abaixo) — só o coordenador DESTE projeto ou a
 * diretoria editam. O backend recusa o resto (`UpdateInicioAmbientacaoUseCase`),
 * o front só esconde o botão.
 */
function DataEditavelInicioAmbientacao({
  projeto,
  token,
  recarregar,
}: {
  projeto: ProjetoCompleto;
  token: string | null;
  recarregar: () => Promise<void>;
}) {
  const { usuario } = useAuth();
  const podeEditar =
    !!usuario && (ehDiretoriaDeProjetos(usuario) || usuario.id === projeto.coordenador_id);
  const [editando, setEditando] = useState(false);
  const [data, setData] = useState(projeto.data_inicio_ambientacao?.slice(0, 10) ?? "");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  // Sem kickoff não há do que antecipar — a correção é sempre relativa a ele.
  if (!projeto.data_kickoff) return null;

  const antecipada = !!projeto.data_inicio_ambientacao;

  async function salvar() {
    if (!token) return;
    setSalvando(true);
    setErro("");
    try {
      // Campo vazio = limpar a correção, volta a contar do kickoff.
      await marcarInicioAmbientacao(projeto.id, data || null, token);
      setEditando(false);
      await recarregar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao salvar o início da ambientação");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <DataItem>
      <DataItemLabel>
        Início da ambientação
        <InfoDica rotulo="Sobre o início da ambientação">
          Por padrão começa no próprio kickoff. Só o coordenador do projeto ou a diretoria podem
          antecipar — quando o time já estava em campo antes do kickoff formal — e no máximo{" "}
          {projeto.dias_ambientacao} dias úteis antes dele, pra não deixar o kickoff de fora da
          própria janela que ele abre.
        </InfoDica>
      </DataItemLabel>
      <DataItemValor>
        {editando ? (
          <>
            <FieldInput
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              aria-label="Início da ambientação"
            />
            <PageButtonSm type="button" disabled={salvando} onClick={salvar}>
              {salvando ? "Salvando…" : "Salvar"}
            </PageButtonSm>
            {antecipada && (
              <PageButtonSm
                type="button"
                $variant="ghost"
                disabled={salvando}
                onClick={() => setData("")}
              >
                Usar o kickoff
              </PageButtonSm>
            )}
            <PageButtonSm
              type="button"
              $variant="ghost"
              onClick={() => {
                setEditando(false);
                setData(projeto.data_inicio_ambientacao?.slice(0, 10) ?? "");
                setErro("");
              }}
            >
              Cancelar
            </PageButtonSm>
          </>
        ) : (
          <>
            <span>
              {antecipada ? formatarData(projeto.data_inicio_ambientacao) : "No kickoff"}
              {antecipada && <DataItemDetalhe> · antecipada pelo coordenador</DataItemDetalhe>}
            </span>
            {podeEditar && (
              <PageButtonSm type="button" $variant="ghost" onClick={() => setEditando(true)}>
                {antecipada ? "Alterar" : "Editar"}
              </PageButtonSm>
            )}
          </>
        )}
      </DataItemValor>
      {erro && <FormErrorText>{erro}</FormErrorText>}
    </DataItem>
  );
}

/* ------------------------------------------------------------------ */

/**
 * ⭐ A data que foi PROMETIDA ao cliente na venda.
 *
 * ⚠ **Não é a "Entrega ao cliente" logo acima.** Aquela é derivada — a entrega
 * do último escopo, ou seja, o que de fato aconteceu — e por isso não se
 * edita. Esta é o combinado, e não muda quando o trabalho anda.
 *
 * As duas já viveram no mesmo campo, e foi um bug: a promessa era sobrescrita
 * pela realidade no primeiro reagendamento, e ninguém mais sabia se a data na
 * tela era o que se prometeu ou o que se cumpriu.
 *
 * Vazio é estado normal: nem toda venda fecha com data combinada.
 */
function DataEditavelEntregaPrevista({
  projeto,
  token,
  recarregar,
}: {
  projeto: ProjetoCompleto;
  token: string | null;
  recarregar: () => Promise<void>;
}) {
  const { usuario } = useAuth();
  // Mesma permissão do backend (`require_pode_editar_equipe`).
  const podeEditar = !!usuario?.permissoes.pode_editar_equipe;
  const [editando, setEditando] = useState(false);
  const [data, setData] = useState(projeto.data_entrega_prevista_cliente?.slice(0, 10) ?? "");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  async function salvar() {
    if (!token) return;
    setSalvando(true);
    setErro("");
    try {
      // String vazia limpa a promessa — venda que ainda não fechou data.
      await updateEntregaPrevistaCliente(projeto.id, data || null, token);
      setEditando(false);
      await recarregar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao salvar a data");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <DataItem>
      <DataItemLabel>Prometida ao cliente</DataItemLabel>
      <DataItemValor>
        {editando ? (
          <>
            <FieldInput
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              aria-label="Data prometida ao cliente"
            />
            <PageButtonSm type="button" disabled={salvando} onClick={salvar}>
              {salvando ? "Salvando…" : "Salvar"}
            </PageButtonSm>
            <PageButtonSm
              type="button"
              $variant="ghost"
              onClick={() => {
                setEditando(false);
                setData(projeto.data_entrega_prevista_cliente?.slice(0, 10) ?? "");
                setErro("");
              }}
            >
              Cancelar
            </PageButtonSm>
          </>
        ) : (
          <>
            <span>{formatarData(projeto.data_entrega_prevista_cliente)}</span>
            {podeEditar && (
              <PageButtonSm type="button" $variant="ghost" onClick={() => setEditando(true)}>
                {projeto.data_entrega_prevista_cliente ? "Alterar" : "Definir"}
              </PageButtonSm>
            )}
          </>
        )}
      </DataItemValor>
      {erro && <FormErrorText>{erro}</FormErrorText>}
    </DataItem>
  );
}

/* ------------------------------------------------------------------ */

function DataEditavelDiasAmbientacao({
  projeto,
  token,
  recarregar,
}: {
  projeto: ProjetoCompleto;
  token: string | null;
  recarregar: () => Promise<void>;
}) {
  const { usuario } = useAuth();
  const podeEditar = !!usuario?.permissoes.pode_editar_equipe;
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(String(projeto.dias_ambientacao));
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  async function salvar() {
    if (!token) return;
    const numero = Number(valor);
    if (!Number.isInteger(numero) || numero < 0 || numero > 60) {
      setErro("Informe um número de dias úteis entre 0 e 60.");
      return;
    }
    setSalvando(true);
    setErro("");
    try {
      await updateDiasAmbientacao(projeto.id, numero, token);
      setEditando(false);
      await recarregar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao salvar os dias de ambientação");
    } finally {
      setSalvando(false);
    }
  }

  // A única etapa do ciclo que sai sozinha: tem data de fim calculável,
  // as outras dependem de alguém decidir. A data vem pronta do backend,
  // o front não conta dia útil.
  const emContagem = projeto.status === "ambientacao" && projeto.fim_ambientacao;

  return (
    <DataItem>
      <DataItemLabel>
        Dias de ambientação
        <InfoDica rotulo="Sobre os dias de ambientação">
          Ao fim deles o projeto passa para <strong>Em andamento</strong> sozinho, sem precisar
          de ninguém clicar em nada.
        </InfoDica>
      </DataItemLabel>
      <DataItemValor>
        {editando ? (
          <>
            <FieldInput
              type="number"
              min={0}
              max={60}
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              aria-label="Dias de ambientação"
            />
            <PageButtonSm type="button" disabled={salvando} onClick={salvar}>
              {salvando ? "Salvando…" : "Salvar"}
            </PageButtonSm>
            <PageButtonSm
              type="button"
              $variant="ghost"
              onClick={() => {
                setEditando(false);
                setValor(String(projeto.dias_ambientacao));
                setErro("");
              }}
            >
              Cancelar
            </PageButtonSm>
          </>
        ) : (
          <>
            <span>
              {projeto.dias_ambientacao} dias úteis
              {/* A data calculada some junto do valor, e não como parágrafo
                  fixo embaixo — ela só existe enquanto o projeto está NESTA
                  etapa, então acompanhar o valor é onde ela faz sentido. */}
              {emContagem && (
                <DataItemDetalhe> · até {formatarData(projeto.fim_ambientacao)}</DataItemDetalhe>
              )}
            </span>
            {podeEditar && (
              <PageButtonSm type="button" $variant="ghost" onClick={() => setEditando(true)}>
                Alterar
              </PageButtonSm>
            )}
          </>
        )}
      </DataItemValor>
      {erro && <FormErrorText>{erro}</FormErrorText>}
    </DataItem>
  );
}

/* ------------------------------------------------------------------ */

/**
 * O dia da reunião semanal, como botões que salvam no clique.
 *
 * ⭐ **Eram quatro cliques**: "Alterar" → abrir o dropdown → escolher o dia →
 * "Salvar". Para um campo com CINCO valores possíveis e nenhuma consequência
 * pesada (é o dia em que o time combina de se ver, não uma data de entrega),
 * o formulário custava mais do que o dado vale. Agora é um clique.
 *
 * 📐 **Reclicar o dia ativo limpa o campo.** É o que substitui a opção "Sem dia
 * definido" do dropdown: um sexto botão "Sem dia" ao lado dos cinco daria a
 * mesma largura para "não sei" e para cada dia da semana, e "não sei" não é
 * uma escolha do mesmo peso. O `title` de cada botão avisa do gesto.
 */
/**
 * O calendário acadêmico de cada ESCOPO vendido — a base em que os dias dele
 * são contados (janela, atraso, cinza do cronograma).
 *
 * ⭐ **Uma linha por escopo, e não uma do projeto.** Até 2026-08-31 isto era um
 * campo único (`projeto.calendario`), opcional, e não funcionava por dois
 * motivos que se somavam: um projeto sinérgico tem escopos em frentes
 * diferentes e um campo só não representa os dois; e a linha desaparecia nas
 * frentes de calendário único, então a maioria dos projetos nunca era
 * perguntada — os 22 em produção estavam todos sem escolha, e a plataforma
 * contava a união dos dias de todas as frentes.
 *
 * Por isso a linha aparece SEMPRE, mesmo quando há uma opção só: ela diz qual
 * calendário está valendo. O select fica desabilitado quando não há o que
 * escolher, em vez de sumir.
 */
function DataEditavelCalendario({
  projeto,
  token,
  recarregar,
}: {
  projeto: ProjetoCompleto;
  token: string | null;
  recarregar: () => Promise<void>;
}) {
  const { usuario } = useAuth();
  const podeEditar = !!usuario?.permissoes.pode_editar_equipe;
  const [calendarios, setCalendarios] = useState<CalendariosDaFrente[]>([]);
  /** Qual escopo está sendo gravado agora — desabilita só a linha dele. */
  const [salvando, setSalvando] = useState<number | null>(null);
  /** Confirmação que some sozinha. O efeito da troca acontece em OUTRA aba
   *  (o cronograma), então sem isto a tela não dá sinal nenhum de ter salvo. */
  const [salvo, setSalvo] = useState<number | null>(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let cancelado = false;
    async function carregar() {
      if (!token) return;
      try {
        const resposta = await listCalendariosParaEscolha(token);
        if (!cancelado) setCalendarios(resposta);
      } catch {
        // Silencioso de propósito: sem os calendários a linha vira leitura, e
        // o escopo segue no que já estava. Não é erro que peça a atenção de
        // quem só veio ler a visão geral.
      }
    }
    carregar();
    return () => {
      cancelado = true;
    };
  }, [token]);

  useEffect(() => {
    if (salvo === null) return;
    const id = setTimeout(() => setSalvo(null), 2500);
    return () => clearTimeout(id);
  }, [salvo]);

  const escopos = projeto.escopos ?? [];

  function opcoesDe(frenteId: number) {
    return calendarios.find((c) => c.frente_id === frenteId)?.calendarios ?? [];
  }

  async function escolher(escopoId: number, valor: string) {
    if (!token || salvando !== null) return;
    setSalvando(escopoId);
    setErro("");
    setSalvo(null);
    try {
      await updateEscopoProjeto(escopoId, { calendario: valor === "" ? null : valor }, token);
      await recarregar();
      setSalvo(escopoId);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao salvar o calendário");
    } finally {
      setSalvando(null);
    }
  }

  if (escopos.length === 0) return null;

  return (
    <DataItemLargo>
      <DataItemLabel as="span">Calendário acadêmico</DataItemLabel>
      <DataItemValor>
        {escopos.map((escopo) => {
          const opcoes = opcoesDe(escopo.frente_id);
          const rotulo =
            opcoes.find((o) => o.valor === escopo.calendario)?.rotulo ??
            escopo.calendario ??
            "—";
          return (
            <DataItemCampo key={escopo.id}>
              <span>{escopo.nome}</span>
              {podeEditar ? (
                <FieldSelect
                  value={escopo.calendario ?? ""}
                  disabled={salvando !== null || opcoes.length <= 1}
                  aria-label={`Calendário de ${escopo.nome}`}
                  onChange={(e: { target: { value: string } }) =>
                    escolher(escopo.id, e.target.value)
                  }
                >
                  {opcoes.length === 0 && <option value="">{rotulo}</option>}
                  {opcoes.map((opcao) => (
                    <option key={opcao.rotulo} value={opcao.valor ?? ""}>
                      {opcao.rotulo}
                    </option>
                  ))}
                </FieldSelect>
              ) : (
                <span>{rotulo}</span>
              )}
              {salvando === escopo.id && <DataItemEstado>Salvando…</DataItemEstado>}
              {salvo === escopo.id && salvando === null && (
                <DataItemEstado $ok role="status">
                  <Check size={13} aria-hidden />
                  Salvo
                </DataItemEstado>
              )}
            </DataItemCampo>
          );
        })}
      </DataItemValor>
      {erro && <FormErrorText>{erro}</FormErrorText>}
    </DataItemLargo>
  );
}


function DataEditavelDiaReuniao({
  projeto,
  token,
  recarregar,
}: {
  projeto: ProjetoCompleto;
  token: string | null;
  recarregar: () => Promise<void>;
}) {
  const { usuario } = useAuth();
  const podeEditar = !!usuario?.permissoes.pode_editar_equipe;
  /** O dia que está sendo gravado agora — desabilita a linha inteira e marca
   *  qual botão está esperando resposta. */
  const [salvando, setSalvando] = useState<number | null>(null);
  const [erro, setErro] = useState("");

  async function escolher(dia: number) {
    if (!token || salvando !== null) return;
    // Reclicar o dia que já vale limpa: é o "sem dia definido".
    const destino = projeto.dia_reuniao_padrao === dia ? null : dia;
    setSalvando(dia);
    setErro("");
    try {
      await updateDiaReuniaoPadrao(projeto.id, destino, token);
      await recarregar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao salvar o dia da reunião");
    } finally {
      setSalvando(null);
    }
  }

  return (
    <DataItemLargo>
      <DataItemLabel>Reunião semanal</DataItemLabel>
      <DataItemValor>
        {podeEditar ? (
          <SegmentedGroup role="group" aria-label="Dia padrão da reunião semanal" $semQuebra>
            {DIAS_REUNIAO.map((dia) => {
              const ativo = projeto.dia_reuniao_padrao === dia.valor;
              return (
                <SegmentedButton
                  key={dia.valor}
                  type="button"
                  $ativo={ativo}
                  aria-pressed={ativo}
                  disabled={salvando !== null}
                  title={ativo ? `${dia.rotulo} — clique para limpar` : dia.rotulo}
                  onClick={() => escolher(dia.valor)}
                >
                  {salvando === dia.valor ? "…" : dia.rotulo.slice(0, 3)}
                </SegmentedButton>
              );
            })}
          </SegmentedGroup>
        ) : (
          <span>{rotuloDiaSemana(projeto.dia_reuniao_padrao)}</span>
        )}
      </DataItemValor>
      {erro && <FormErrorText>{erro}</FormErrorText>}
    </DataItemLargo>
  );
}

/* ------------------------------------------------------------------ */
