import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Plus, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  createPosicaoPermissao,
  deletePosicaoPermissao,
  getPosicoesPermissoes,
  updatePosicaoPermissao,
} from "@/lib/posicoes-permissoes";
import { createEscopo, deleteEscopo, getEscopos, updateEscopo } from "@/lib/escopos";
import { createFrente, deleteFrente, getFrentes, updateFrente } from "@/lib/frentes";
import { normalizarTexto } from "@/lib/nucleo";
import { CODIGO_ULTIMO_ADMINISTRADOR, codigoDoErro } from "@/lib/api";
import { SituacoesCargaCard } from "./config/SituacoesCargaCard";
import { HealthTrackRegraCard } from "./config/HealthTrackRegraCard";
import { HealthTrackPilaresCard } from "./config/HealthTrackPilaresCard";
import { HealthTrackPersistenciaCard } from "./config/HealthTrackPersistenciaCard";
import { ComposicaoBancaCard } from "./config/ComposicaoBancaCard";
import { GestaoSemestralCard } from "./config/GestaoSemestralCard";
import { ConfirmarModal } from "@/components/ConfirmarModal";
import { AlertModal } from "@/components/AlertModal";
import type { Escopo, Frente } from "@/types/banca";
import type { Permissoes, PosicaoPermissao } from "@/types/auth";
import {
  PageStack,
  PageCard,
  PageCardHeader,
  PageCardTitle,
  PageCardContent,
  PageButton,
  PageButtonSm,
  PageLoadingBlock,
  ErrorBlock,
  ErrorText,
  EmptyText,
} from "@/styles/page.styled";
import {
  PageHeaderRow,
  PageHeaderText,
  PageHeading,
  PageSubheading,
  DataTable,
  TableHead,
  TableHeadCell,
  TableBody,
  TableRow,
  NameCell,
  TableCell,
  ActionsCell,
  CardHeaderActions,
  PermissaoBadge,
  FormStack,
  FieldGroup,
  FieldLabel,
  FieldInput,
  FieldSelect,
  FormErrorText,
  ModalOverlay,
  ModalHeader,
  ModalTitle,
  ModalClose,
  ModalBody,
  ModalFooter,
  WideModalContent,
  PermissoesGrid,
  PermissaoItem,
  PermissaoTexto,
  PermissaoTitulo,
  PermissaoDesc,
  SecaoGrupo,
  SecaoCabecalho,
  SecaoTitulo,
  SecaoDescricao,
  GrupoFrenteTitulo,
} from "./Config.styled";
import { LIST_MAX_VISIVEIS, TableScrollWrap } from "@/styles/shared.styled";

// Fonte única dos rótulos: alimenta as caixas do modal de edição E as tags da
// tabela. Cada título é verbo + objeto, para a tag dizer sozinha o que a posição
// pode fazer, sem depender de abrir o modal para descobrir.
const PERMISSOES = [
  {
    campo: "pode_criar_projeto" as const,
    titulo: "Criar projeto e alocar equipe",
    descricao:
      "Abrir um projeto novo e escolher coordenador e consultores na criação.",
  },
  {
    campo: "pode_criar_projeto_atalho" as const,
    titulo: "Criar projeto pelo atalho (nasce Vendido)",
    descricao:
      "O botão \"+ Novo projeto (atalho)\" em Projetos: o projeto nasce direto como Vendido, sem passar pelo Contrato de Prestação, e dias de ambientação e máximo de consultores ficam opcionais (em branco valem 5 e 3, editáveis depois na Visão geral). Serve pra criar um projeto só pra gerar a banca dele. Precisa também de \"Criar projeto e alocar equipe\". Nasce marcada só pra diretoria de projetos.",
  },
  {
    campo: "pode_editar_equipe" as const,
    titulo: "Editar a equipe de um projeto",
    descricao:
      "Trocar o coordenador e adicionar ou remover consultores de um projeto que já existe.",
  },
  {
    campo: "pode_gerir_membros" as const,
    titulo: "Gerir membros (posição e status)",
    descricao:
      "Abrir a página Membros: cadastrar pessoas e mudar a posição, o status e as frentes de cada uma.",
  },
  {
    campo: "pode_marcar_kickoff" as const,
    titulo: "Marcar kickoff e data de entrega",
    descricao: "Registrar a data de kickoff do projeto e a data de entrega ao cliente.",
  },
  {
    campo: "pode_definir_cronograma" as const,
    titulo: "Definir cronograma por escopo (etapas, banca)",
    descricao:
      "Criar e mover etapas e marcos, definir o cronograma de um escopo e agendar as bancas.",
  },
  {
    campo: "pode_criar_tarefa" as const,
    titulo: "Criar tarefa",
    descricao: "Abrir tarefas novas no quadro de um projeto.",
  },
  {
    campo: "pode_mover_editar_tarefa" as const,
    titulo: "Mover e editar tarefa",
    descricao:
      "Arrastar tarefas entre colunas e editar título, responsável, prazo e descrição.",
  },
  {
    campo: "pode_ver_proprios_projetos" as const,
    titulo: "Ver os próprios projetos",
    descricao:
      "Enxergar a lista de projetos. O que aparece continua limitado pelo recorte de visão: coordenador e consultor só veem onde estão alocados.",
  },
  {
    campo: "pode_ver_monitoramento" as const,
    titulo: "Monitoramento e alocação",
    descricao:
      "Abrir o Monitoramento: visão geral, execução, alocação de pessoas e atrasos.",
  },
  // As 3 abaixo não estão na tabela do , nasceram travadas só por posição
  // (diretor, ou diretor+gerente) e viraram caixa configurável a pedido
  // explícito do usuário, pro mesmo motivo das 10: dar pra delegar sem
  // precisar tornar alguém "diretor" inteiro.
  {
    campo: "pode_administrar_desempenho" as const,
    titulo: "Administrar Avaliação de Desempenho",
    descricao:
      "Abrir o painel de Avaliação de Desempenho: lotes, avaliadores, avaliados, relatório, mentoria e PDI.",
  },
  {
    campo: "pode_editar_formularios_desempenho" as const,
    titulo: "Editar formulários de Avaliação de Desempenho",
    descricao:
      "Mudar as seções e critérios dos formulários, afeta o que todo mundo é avaliado, não só a rotina de administrar.",
  },
  {
    campo: "pode_ver_dashboard_bancas" as const,
    titulo: "Ver o Dashboard Bancas",
    descricao:
      "Abrir o Dashboard Bancas: notas por pergunta, histórico de bancas e a edição dos formulários de banca. Não inclui os formulários da Avaliação de Desempenho, que são outra permissão.",
  },
  {
    campo: "pode_administrar_configuracoes" as const,
    titulo: "Administrar Configurações",
    descricao:
      "O catálogo desta tela: frentes, escopos, combinações e semestres. Editar permissões e mexer nos calendários base são outras permissões, à parte desta.",
  },
  {
    campo: "pode_administrar_permissoes" as const,
    titulo: "Editar as permissões das posições",
    descricao:
      "Marcar e desmarcar as caixas desta seção, para qualquer posição, inclusive a sua. É a mais sensível de todas: quem a tem pode conceder a si mesmo qualquer outra.",
  },
  {
    campo: "pode_gerir_calendarios_base" as const,
    titulo: "Gerir os calendários base",
    descricao:
      "Abrir Calendários base: dias não letivos do semestre, importação do PDF do Insper e o nome dos calendários de cada frente. Muda o cálculo de dias úteis de todos os projetos.",
  },
  {
    campo: "pode_ver_historico_projetos" as const,
    titulo: "Ver o histórico de projetos",
    descricao:
      "A aba Histórico do Monitoramento: o portfólio já encerrado, finalizado ou arquivado. Só leitura.",
  },
  {
    campo: "pode_ver_tarefas_gerais" as const,
    titulo: "Ver o board geral de tarefas",
    descricao:
      "A aba Tarefas do Monitoramento: as tarefas de todos os projetos num quadro só. Só leitura.",
  },
  {
    campo: "pode_ver_cronogramas_gerais" as const,
    titulo: "Ver o board geral de cronogramas",
    descricao:
      "A aba Cronogramas do Monitoramento: os cronogramas de todos os projetos lado a lado. Só leitura.",
  },
  {
    campo: "pode_configurar_colunas" as const,
    titulo: "Configurar as colunas do kanban",
    descricao:
      "Criar, renomear, reordenar e apagar coluna do quadro de tarefas de um projeto. Diferente de criar e mover tarefa, que são outras permissões: esta redesenha o fluxo do quadro.",
  },
  {
    campo: "pode_aprovar_pedidos" as const,
    titulo: "Responder a fila de Aprovações",
    descricao:
      "Decidir pedido de dias de ajuste, exceção de choque de horário e banca fora da janela. Não cobre a fila inteira: atraso sem justificativa é escrito por quem conduz o projeto, e pedido de entrada é respondido por quem o coordena.",
  },
  {
    campo: "pode_ver_todos_projetos" as const,
    titulo: "Ver todos os projetos, de qualquer frente",
    descricao:
      "A única permissão que muda QUAIS projetos aparecem; as outras só abrem funcionalidade, sem tocar nisso. Sem esta, coordenador e consultor sempre ficam limitados aos projetos em que já estão alocados, mesmo com todo o resto marcado.",
  },
  {
    campo: "pode_responsavel_por_vendas" as const,
    titulo: "Ser responsável por vendas",
    descricao:
      "Quem tem esta caixa aparece na lista \"quem vendeu o projeto\" do cadastro de projeto.",
  },
  {
    campo: "pode_coordenar_vendas" as const,
    titulo: "Coordenar as vendas",
    descricao:
      "Continua contando como liderança — vai à banca, soma no total — mas não cobre o mínimo de liderança nem de membros da frente em que está cadastrado.",
  },
  {
    campo: "pode_aprovar_contrato_internamente" as const,
    titulo: "Aprovar contratos internamente",
    descricao:
      "A revisão jurídica de verdade: fecha a etapa de revisão interna e libera o documento pra ser exportado e mandado ao cliente.",
  },
  {
    campo: "pode_acessar_configuracoes_sabatina" as const,
    titulo: "Ver configurações de sabatina",
    descricao:
      "Abre a aba Configuração de Sabatina: peso do voto por posição, montar, abrir, fechar e excluir eleições, a corrida em tempo real e a apuração. Votar não depende disto, e ninguém vê em quem cada pessoa votou.",
  },
  {
    campo: "pode_acessar_arquivo_contratos" as const,
    titulo: "Acessar o arquivo de contratos",
    descricao:
      "Abre o Arquivo de Contratos (botão na página Contratos): a pasta compartilhada com os contratos assinados por gestão e projeto, mais o que for importado. Quem entra vê, baixa, importa, renomeia, move e apaga.",
  },
  {
    campo: "pode_acessar_institucional" as const,
    titulo: "Acessar o Institucional",
    descricao:
      "Abre a aba Institucional: o que aparece no site da Insper Jr — hoje, os ex-membros em destaque (cadastrar, editar, ordenar, ocultar, remover e trocar foto). Quem visita o site vê sem login; esta caixa é só para editar.",
  },
  {
    campo: "pode_enviar_comunicados" as const,
    titulo: "Enviar comunicados",
    descricao:
      "Mandar um aviso (sino + e-mail) pra um recorte de pessoas: quem está com 0 bancas ou com muitas, quem ainda não respondeu um formulário de desempenho, os inscritos de uma banca, uma posição inteira, todo mundo ou pessoas escolhidas à mão. Abre a aba Comunicados (em Sistema), com o histórico do que já foi enviado.",
  },
  {
    campo: "pode_editar_identidade_institucional" as const,
    titulo: "Editar identidade institucional",
    descricao:
      "Abre a aba Identidade Institucional (quem assina PELA Insper Jr nos documentos jurídicos) — antes só diretoria de projetos, agora delegável.",
  },
  {
    campo: "pode_elaborar_contratos_proprios" as const,
    titulo: "Acessar e elaborar contratos de projetos vendidos por ela",
    descricao:
      "Abre a aba Contratos com todos os documentos visíveis, mas só elabora (abre, preenche, confirma, gera, edita o texto pós-confirmação, marca como assinado) os documentos jurídicos dos projetos em que a própria pessoa consta como vendedora. No assistente \"+ Novo Contrato\", só aparecem os projetos que ela vendeu.",
  },
  {
    campo: "pode_elaborar_qualquer_contrato" as const,
    titulo: "Acessar e elaborar qualquer contrato",
    descricao:
      "Mesma coisa que a caixa acima, sem o recorte por vendedor — elabora o documento jurídico de qualquer projeto, igual diretoria.",
  },
  {
    campo: "pode_ver_health_track" as const,
    titulo: "Ver o Health Track",
    descricao:
      "A página Health Track (Gestão): o mapa da carteira com a cor de cada pilar e o status geral de cada projeto, o painel de cada um, e a regra e os pilares nesta tela. Nasce só na diretoria de projetos; coordenador e consultor não veem. Preencher as cores continua restrito à diretoria de projetos e à gerência da frente, e editar regra e pilares, à diretoria de projetos.",
  },
];

type CampoPermissao = (typeof PERMISSOES)[number]["campo"];

/**
 * As caixas em ordem alfabética de título.
 *
 * A ordem de declaração conta a HISTÓRIA delas (as 10 do briefing, depois as
 * extensões, depois as de 2026-09-02), que é útil para quem lê o arquivo e
 * inútil para quem procura uma caixa na tela: são vinte e uma, e sem ordem
 * a busca vira leitura linha a linha.
 */
const PERMISSOES_ORDENADAS = [...PERMISSOES].sort((a, b) =>
  a.titulo.localeCompare(b.titulo, "pt-BR"),
);

function permissoesDaPosicao(posicao: PosicaoPermissao) {
  return PERMISSOES_ORDENADAS.filter((p) => posicao[p.campo]);
}

export function Config() {
  const { usuario, token } = useAuth();
  const [frentes, setFrentes] = useState<Frente[]>([]);
  const [escopos, setEscopos] = useState<Escopo[]>([]);
  const [posicoes, setPosicoes] = useState<PosicaoPermissao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const [modalFrente, setModalFrente] = useState<Frente | "novo" | null>(null);
  const [modalEscopo, setModalEscopo] = useState<Escopo | "novo" | null>(null);
  const [modalPosicao, setModalPosicao] = useState<PosicaoPermissao | null>(null);
  const [modalNovoCargo, setModalNovoCargo] = useState(false);

  const [paraExcluir, setParaExcluir] = useState<
    | { tipo: "frente"; item: Frente }
    | { tipo: "escopo"; item: Escopo }
    | { tipo: "cargo"; item: PosicaoPermissao }
    | null
  >(null);

  async function confirmarExclusao() {
    if (!token || !paraExcluir) return;
    if (paraExcluir.tipo === "frente") await deleteFrente(paraExcluir.item.id, token);
    else if (paraExcluir.tipo === "escopo") await deleteEscopo(paraExcluir.item.id, token);
    else await deletePosicaoPermissao(paraExcluir.item.posicao, token);
    setParaExcluir(null);
    buscar();
  }

  async function buscar() {
    if (!token) return;
    setCarregando(true);
    setErro("");
    try {
      const [frentesResp, escoposResp, posicoesResp] = await Promise.all([
        getFrentes(token),
        getEscopos(token),
        getPosicoesPermissoes(token),
      ]);
      setFrentes(frentesResp.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")));
      setEscopos(escoposResp.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")));
      setPosicoes(posicoesResp);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao carregar configurações");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    buscar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Núcleo e Configurações ficaram fora da tabela das 10, mas viraram
  // caixa própria (`pode_administrar_configuracoes`) a pedido explícito do
  // usuário, inclusive pra editar as permissões de qualquer posição, que é
  // a ação mais sensível daqui: quem tem a caixa concede a mesma caixa (ou
  // qualquer outra) a outra posição. Só quem já tem a permissão consegue
  // distribuí-la, então não dá pra se auto-conceder do zero.
  if (!usuario?.permissoes.pode_administrar_configuracoes) {
    return <Navigate to="/dashboard" replace />;
  }

  // Caixa própria desde 2026-09-02: quem administra o catálogo desta tela não
  // necessariamente decide quem pode o quê na plataforma.
  const podeEditarPermissoes = usuario.permissoes.pode_administrar_permissoes;

  if (erro) {
    return (
      <ErrorBlock>
        <ErrorText>Não foi possível carregar as configurações: {erro}</ErrorText>
        <PageButton $variant="outline" onClick={buscar}>
          Tentar novamente
        </PageButton>
      </ErrorBlock>
    );
  }

  if (carregando || !token) return <PageLoadingBlock />;

  return (
    <PageStack>
      <PageHeaderRow>
        <PageHeaderText>
          <PageHeading>Configurações</PageHeading>
          <PageSubheading>
            O semestre em curso, a estrutura de frentes e escopos, as regras que a plataforma
            aplica sozinha e o acesso de cada posição.
          </PageSubheading>
        </PageHeaderText>
      </PageHeaderRow>

      {/* Os cards estão agrupados por assunto, e não na ordem em que foram
          sendo construídos. A ordem dos grupos segue a dependência: o semestre
          e os cadastros vêm primeiro porque o resto os referencia (escopo
          aponta pra frente, banca conta o piso da frente), as regras
          automáticas depois, e o acesso por último, é o único grupo que não
          fala de operação, e sim de quem entra onde. */}
      <SecaoGrupo>
        <SecaoCabecalho>
          <SecaoTitulo>Ciclo e estrutura</SecaoTitulo>
          <SecaoDescricao>
            O semestre em curso e os cadastros que o resto da plataforma referencia.
          </SecaoDescricao>
        </SecaoCabecalho>

        <GestaoSemestralCard />

        <PageCard>
          <PageCardHeader>
            <CardHeaderActions>
              <PageCardTitle>Frentes</PageCardTitle>
              <PageButtonSm type="button" onClick={() => setModalFrente("novo")}>
                <Plus size={14} />
                Adicionar
              </PageButtonSm>
            </CardHeaderActions>
          </PageCardHeader>
          <PageCardContent>
            {frentes.length === 0 && <EmptyText>Nenhuma frente cadastrada.</EmptyText>}
            {frentes.length > 0 && (
              <TableScrollWrap $scrollable={frentes.length > LIST_MAX_VISIVEIS} $min="30rem">
                <DataTable>
                  <TableHead>
                    <TableRow>
                      <TableHeadCell>Nome</TableHeadCell>
                      <TableHeadCell />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {frentes.map((frente) => (
                      <TableRow key={frente.id}>
                        {/* ⚠ A coluna "Piso mínimo por banca" saiu em
                            2026-09-01: o número virou só o PADRÃO de combinação
                            não configurada, e mostrá-lo aqui fazia parecer que
                            editá-lo mudava as bancas — quem manda é a matriz,
                            em "Composição por combinação de frentes". */}
                        <NameCell>{frente.nome}</NameCell>
                        <ActionsCell>
                          <PageButtonSm $variant="outline" type="button" onClick={() => setModalFrente(frente)}>
                            Editar
                          </PageButtonSm>
                          <PageButtonSm
                            $variant="outline"
                            type="button"
                            onClick={() => setParaExcluir({ tipo: "frente", item: frente })}
                          >
                            Excluir
                          </PageButtonSm>
                        </ActionsCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </DataTable>
              </TableScrollWrap>
            )}
          </PageCardContent>
        </PageCard>

        {/* Logo abaixo de Frentes: todo escopo aponta para uma frente, então a
            lista de cima é o vocabulário do select daqui. */}
        <PageCard>
          <PageCardHeader>
            <CardHeaderActions>
              <PageCardTitle>Escopos</PageCardTitle>
              <PageButtonSm type="button" onClick={() => setModalEscopo("novo")}>
                <Plus size={14} />
                Adicionar
              </PageButtonSm>
            </CardHeaderActions>
          </PageCardHeader>
          <PageCardContent>
            {escopos.length === 0 && <EmptyText>Nenhum escopo cadastrado.</EmptyText>}
            {escopos.length > 0 && (
              <TabelaEscopos
                itens={escopos}
                frentes={frentes}
                onEditar={setModalEscopo}
                onExcluir={(item) => setParaExcluir({ tipo: "escopo", item })}
              />
            )}
          </PageCardContent>
        </PageCard>
      </SecaoGrupo>

      <SecaoGrupo>
        <SecaoCabecalho>
          <SecaoTitulo>Regras de operação</SecaoTitulo>
          <SecaoDescricao>
            Os números que a plataforma aplica sozinha ao montar bancas e ao ler a carga de cada
            pessoa.
          </SecaoDescricao>
        </SecaoCabecalho>

        {/* ⚠ O card "Configurações de banca" saiu daqui em 2026-09-01. Ele
            editava `vagas_por_banca` e `lideranca_minima_por_frente`, e com a
            matriz por combinação existindo eram TRÊS lugares configurando a
            mesma coisa — a diretoria mexia num e não via efeito, porque quem
            manda é a matriz. O teto migrou para o card abaixo; o mínimo de
            liderança virou só o padrão de combinação não configurada, e se
            edita por lá. */}
        <ComposicaoBancaCard />

        <SituacoesCargaCard />

        {usuario.permissoes.pode_ver_health_track && (
          <>
            <HealthTrackRegraCard />

            <HealthTrackPilaresCard />

            <HealthTrackPersistenciaCard />
          </>
        )}
      </SecaoGrupo>

      <SecaoGrupo>
        <SecaoCabecalho>
          <SecaoTitulo>Acesso</SecaoTitulo>
          <SecaoDescricao>Quem pode fazer o quê na plataforma, por posição.</SecaoDescricao>
        </SecaoCabecalho>

        <PageCard>
          <PageCardHeader>
            <CardHeaderActions>
              <PageCardTitle>Permissões por posição</PageCardTitle>
              {podeEditarPermissoes && (
                <PageButtonSm type="button" onClick={() => setModalNovoCargo(true)}>
                  <Plus size={14} />
                  Criar cargo
                </PageButtonSm>
              )}
            </CardHeaderActions>
          </PageCardHeader>
          <PageCardContent>
            {!podeEditarPermissoes && (
              <EmptyText style={{ fontSize: "0.7rem" }}>
                Editar as caixas exige a permissão "Editar as permissões das posições", que
                não vem junto com administrar Configurações, e impede auto-concessão de acesso.
              </EmptyText>
            )}
            <TableScrollWrap $scrollable={posicoes.length > LIST_MAX_VISIVEIS} $min="30rem">
              <DataTable>
                <TableHead>
                  <TableRow>
                    <TableHeadCell>Posição</TableHeadCell>
                    <TableHeadCell>Permissões</TableHeadCell>
                    <TableHeadCell />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {posicoes.map((posicao) => (
                    <TableRow key={posicao.posicao}>
                      <NameCell>{posicao.nome}</NameCell>
                      <TableCell>
                        {permissoesDaPosicao(posicao).length === 0 && "—"}
                        {permissoesDaPosicao(posicao).map((p) => (
                          <PermissaoBadge key={p.campo} title={p.descricao}>
                            {p.titulo}
                          </PermissaoBadge>
                        ))}
                      </TableCell>
                      <ActionsCell>
                        {podeEditarPermissoes && (
                          <PageButtonSm $variant="outline" type="button" onClick={() => setModalPosicao(posicao)}>
                            Editar
                          </PageButtonSm>
                        )}
                      </ActionsCell>
                    </TableRow>
                  ))}
                </TableBody>
              </DataTable>
            </TableScrollWrap>
          </PageCardContent>
        </PageCard>
      </SecaoGrupo>

      {modalFrente && (
        <ModalFrente
          frente={modalFrente === "novo" ? null : modalFrente}
          onClose={() => setModalFrente(null)}
          onSalvar={async (nome, pisoBanca) => {
            if (modalFrente === "novo") await createFrente({ nome, piso_banca: pisoBanca }, token);
            else await updateFrente(modalFrente.id, { nome, piso_banca: pisoBanca }, token);
            setModalFrente(null);
            buscar();
          }}
        />
      )}

      {modalEscopo && (
        <ModalEscopo
          escopo={modalEscopo === "novo" ? null : modalEscopo}
          frentes={frentes}
          onClose={() => setModalEscopo(null)}
          onSalvar={async (nome, frenteId) => {
            if (modalEscopo === "novo") await createEscopo(nome, frenteId, token);
            else await updateEscopo(modalEscopo.id, nome, frenteId, token);
            setModalEscopo(null);
            buscar();
          }}
        />
      )}

      {modalPosicao && (
        <ModalPosicaoPermissao
          posicao={modalPosicao}
          onClose={() => setModalPosicao(null)}
          onSalvar={async (dados) => {
            await updatePosicaoPermissao(modalPosicao.posicao, dados, token);
            setModalPosicao(null);
            buscar();
          }}
          onExcluir={() => {
            setModalPosicao(null);
            setParaExcluir({ tipo: "cargo", item: modalPosicao });
          }}
        />
      )}

      {modalNovoCargo && (
        <ModalNovoCargo
          onClose={() => setModalNovoCargo(false)}
          onSalvar={async (nome, sobreponivel) => {
            await createPosicaoPermissao(nome, sobreponivel, token);
            setModalNovoCargo(false);
            buscar();
          }}
        />
      )}

      {paraExcluir && (
        <ConfirmarModal
          titulo="Excluir"
          mensagem={
            paraExcluir.tipo === "frente"
              ? `Excluir a frente "${paraExcluir.item.nome}"?`
              : paraExcluir.tipo === "escopo"
                ? `Excluir o escopo "${paraExcluir.item.nome}"?`
                : `Excluir o cargo "${paraExcluir.item.nome}"? Quem estiver nele precisa ser movido para outro cargo antes — a exclusão é recusada enquanto alguém ainda estiver aqui.`
          }
          onCancelar={() => setParaExcluir(null)}
          onConfirmar={confirmarExclusao}
        />
      )}
    </PageStack>
  );
}

function TabelaEscopos({
  itens,
  frentes,
  onEditar,
  onExcluir,
}: {
  itens: Escopo[];
  frentes: Frente[];
  onEditar: (item: Escopo) => void;
  onExcluir: (item: Escopo) => void;
}) {
  // Um grupo por frente, na ordem em que elas aparecem em Frentes (acima
  // desta lista), e "Sem frente" por último — é a exceção, não a regra.
  const grupos: { nome: string; itens: Escopo[] }[] = [
    ...frentes.map((f) => ({
      nome: f.nome,
      itens: itens.filter((e) => e.frente_id === f.id),
    })),
    { nome: "Sem frente", itens: itens.filter((e) => e.frente_id === null) },
  ].filter((g) => g.itens.length > 0);

  return (
    <TableScrollWrap $scrollable={itens.length > LIST_MAX_VISIVEIS}>
      {grupos.map((grupo) => (
        <div key={grupo.nome}>
          <GrupoFrenteTitulo>{grupo.nome}</GrupoFrenteTitulo>
          <DataTable>
            <TableHead>
              <TableRow>
                <TableHeadCell>Nome</TableHeadCell>
                <TableHeadCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {grupo.itens.map((item) => (
                <TableRow key={item.id}>
                  <NameCell>{item.nome}</NameCell>
                  <ActionsCell>
                    <PageButtonSm $variant="outline" type="button" onClick={() => onEditar(item)}>
                      Editar
                    </PageButtonSm>
                    <PageButtonSm $variant="outline" type="button" onClick={() => onExcluir(item)}>
                      Excluir
                    </PageButtonSm>
                  </ActionsCell>
                </TableRow>
              ))}
            </TableBody>
          </DataTable>
        </div>
      ))}
    </TableScrollWrap>
  );
}

function ModalEscopo({
  escopo,
  frentes,
  onClose,
  onSalvar,
}: {
  /** `null` = criando um escopo novo. */
  escopo: Escopo | null;
  frentes: Frente[];
  onClose: () => void;
  onSalvar: (nome: string, frenteId: number | null) => Promise<void>;
}) {
  const [nome, setNome] = useState(escopo?.nome ?? "");
  const [frenteId, setFrenteId] = useState<string>(
    escopo?.frente_id ? String(escopo.frente_id) : "",
  );
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return;
    setSalvando(true);
    setErro("");
    try {
      await onSalvar(nome.trim(), frenteId ? Number(frenteId) : null);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <ModalOverlay onClick={onClose} role="presentation">
      <WideModalContent onClick={(e) => e.stopPropagation()} role="dialog">
        <ModalHeader>
          <ModalTitle>{escopo ? "Editar escopo" : "Novo escopo"}</ModalTitle>
          <ModalClose type="button" aria-label="Fechar" onClick={onClose}>
            <X size={18} />
          </ModalClose>
        </ModalHeader>
        <FormStack onSubmit={handleSubmit}>
          <ModalBody>
            <FieldGroup>
              <FieldLabel htmlFor="escopo-nome">Nome</FieldLabel>
              <FieldInput id="escopo-nome" value={nome} onChange={(e) => setNome(e.target.value)} required autoFocus />
            </FieldGroup>
            <FieldGroup>
              <FieldLabel htmlFor="escopo-frente">Frente</FieldLabel>
              <FieldSelect id="escopo-frente" value={frenteId} onChange={(e) => setFrenteId(e.target.value)}>
                <option value="">Sem frente</option>
                {frentes.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nome}
                  </option>
                ))}
              </FieldSelect>
            </FieldGroup>
            {erro && <FormErrorText>{erro}</FormErrorText>}
          </ModalBody>
          <ModalFooter>
            <PageButton $variant="outline" type="button" onClick={onClose}>
              Cancelar
            </PageButton>
            <PageButton type="submit" disabled={salvando}>
              {salvando ? "Salvando..." : "Salvar"}
            </PageButton>
          </ModalFooter>
        </FormStack>
      </WideModalContent>
    </ModalOverlay>
  );
}

function ModalFrente({
  frente,
  onClose,
  onSalvar,
}: {
  /** `null` = criando uma frente nova. */
  frente: Frente | null;
  onClose: () => void;
  onSalvar: (nome: string, pisoBanca: number) => Promise<void>;
}) {
  const [nome, setNome] = useState(frente?.nome ?? "");
  const [pisoBanca, setPisoBanca] = useState(String(frente?.piso_banca ?? 1));
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return;
    const piso = Number(pisoBanca);
    if (!Number.isFinite(piso) || piso < 0) {
      setErro("Informe um piso mínimo válido.");
      return;
    }
    setSalvando(true);
    setErro("");
    try {
      await onSalvar(nome.trim(), piso);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <ModalOverlay onClick={onClose} role="presentation">
      <WideModalContent onClick={(e) => e.stopPropagation()} role="dialog">
        <ModalHeader>
          <ModalTitle>{frente ? "Editar frente" : "Nova frente"}</ModalTitle>
          <ModalClose type="button" aria-label="Fechar" onClick={onClose}>
            <X size={18} />
          </ModalClose>
        </ModalHeader>
        <FormStack onSubmit={handleSubmit}>
          <ModalBody>
            <FieldGroup>
              <FieldLabel htmlFor="nome-frente">Nome</FieldLabel>
              <FieldInput id="nome-frente" value={nome} onChange={(e) => setNome(e.target.value)} required autoFocus />
            </FieldGroup>
            <FieldGroup>
              <FieldLabel htmlFor="piso-frente">Piso mínimo por banca</FieldLabel>
              <FieldInput
                id="piso-frente"
                type="number"
                min={0}
                value={pisoBanca}
                onChange={(e) => setPisoBanca(e.target.value)}
                required
              />
              {/* ⚠ Desde 2026-09-01 este número é o PADRÃO, não a palavra
                  final: a combinação de frentes que alguém configurou em
                  "Composição por combinação de frentes" manda nele. Sem esta
                  linha, mexer aqui e não ver efeito nenhum na banca parecia
                  bug — e o motivo é que aquela combinação já tem número
                  próprio. */}
              <EmptyText style={{ fontSize: "0.7rem" }}>
                Vale nas combinações de frentes que ninguém configurou ainda. Onde há
                regra própria, quem manda é ela, definida em "Composição por combinação de
                frentes".
              </EmptyText>
            </FieldGroup>
            {erro && <FormErrorText>{erro}</FormErrorText>}
          </ModalBody>
          <ModalFooter>
            <PageButton $variant="outline" type="button" onClick={onClose}>
              Cancelar
            </PageButton>
            <PageButton type="submit" disabled={salvando}>
              {salvando ? "Salvando..." : "Salvar"}
            </PageButton>
          </ModalFooter>
        </FormStack>
      </WideModalContent>
    </ModalOverlay>
  );
}

function ModalNovoCargo({
  onClose,
  onSalvar,
}: {
  onClose: () => void;
  onSalvar: (nome: string, sobreponivel: boolean) => Promise<void>;
}) {
  const [nome, setNome] = useState("");
  const [sobreponivel, setSobreponivel] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return;
    setSalvando(true);
    setErro("");
    try {
      await onSalvar(nome.trim(), sobreponivel);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao criar o cargo");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <ModalOverlay onClick={onClose} role="presentation">
      <WideModalContent onClick={(e) => e.stopPropagation()} role="dialog">
        <ModalHeader>
          <ModalTitle>Novo cargo</ModalTitle>
          <ModalClose type="button" aria-label="Fechar" onClick={onClose}>
            <X size={18} />
          </ModalClose>
        </ModalHeader>
        <FormStack onSubmit={handleSubmit}>
          <ModalBody>
            <FieldGroup>
              <FieldLabel htmlFor="cargo-nome">Nome</FieldLabel>
              <FieldInput
                id="cargo-nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex.: Vendas"
                required
                autoFocus
              />
              {/* Nasce sem nenhuma caixa marcada — quem criou define o acesso
                  logo em seguida, em "Editar", igual qualquer outra posição.
                  Não entra em nenhuma regra de identidade hardcoded (mentor,
                  composição de banca, portfólio inteiro): só as caixas desta
                  tela valem para um cargo novo. */}
              <EmptyText style={{ fontSize: "0.7rem" }}>
                O cargo nasce sem nenhuma permissão marcada — depois de criar, use
                "Editar" na linha dele para escolher o que ele pode fazer.
              </EmptyText>
            </FieldGroup>
            <FieldGroup>
              <FieldLabel>Pode ser cargo extra?</FieldLabel>
              <PermissoesGrid>
                <PermissaoItem>
                  <input
                    type="checkbox"
                    checked={sobreponivel}
                    onChange={() => setSobreponivel((v) => !v)}
                  />
                  <PermissaoTexto>
                    <PermissaoTitulo>Sobreponível</PermissaoTitulo>
                    <PermissaoDesc>
                      Se marcado, este cargo pode ser dado como uma SEGUNDA posição pra
                      qualquer pessoa, além do cargo principal dela — soma as permissões das
                      duas, não substitui (ex.: um(a) consultor(a) que também é BDR). Não
                      marcar se este cargo só faz sentido como posição principal de alguém
                      (ex.: consultor).
                    </PermissaoDesc>
                  </PermissaoTexto>
                </PermissaoItem>
              </PermissoesGrid>
            </FieldGroup>
            {erro && <FormErrorText>{erro}</FormErrorText>}
          </ModalBody>
          <ModalFooter>
            <PageButton $variant="outline" type="button" onClick={onClose}>
              Cancelar
            </PageButton>
            <PageButton type="submit" disabled={salvando}>
              {salvando ? "Criando..." : "Criar"}
            </PageButton>
          </ModalFooter>
        </FormStack>
      </WideModalContent>
    </ModalOverlay>
  );
}

/** As caixas do formulário, na ordem em que aparecem, derivadas de
 *  `PERMISSOES` para uma permissão nova não nascer faltando no modal. */
function permissoesDe(posicao: PosicaoPermissao): Record<CampoPermissao, boolean> {
  return Object.fromEntries(
    PERMISSOES.map((p) => [p.campo, posicao[p.campo]]),
  ) as Record<CampoPermissao, boolean>;
}

function ModalPosicaoPermissao({
  posicao,
  onClose,
  onSalvar,
  onExcluir,
}: {
  posicao: PosicaoPermissao;
  onClose: () => void;
  onSalvar: (
    dados: Partial<Permissoes> & { nome?: string; sobreponivel?: boolean },
  ) => Promise<void>;
  onExcluir: () => void;
}) {
  const [nome, setNome] = useState(posicao.nome);
  const [sobreponivel, setSobreponivel] = useState(posicao.sobreponivel);
  const [permissoes, setPermissoes] = useState(permissoesDe(posicao));
  /** A caixa que está esperando confirmação para ser desmarcada. */
  const [campoPendente, setCampoPendente] = useState<CampoPermissao | null>(null);
  /** A recusa do servidor por ser a última porta. Aviso próprio, e não o
   *  texto de erro do rodapé: quem chegou aqui já passou por uma confirmação
   *  dizendo que isso poderia acontecer, e precisa entender que NADA foi
   *  salvo — um texto pequeno embaixo do formulário some no meio da lista. */
  const [recusaUltimaPorta, setRecusaUltimaPorta] = useState(false);
  const [busca, setBusca] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  /* Casa com o título E com a descrição: metade das caixas se procura pelo
     nome da tela que elas abrem ("calendário", "kanban", "histórico"), e esse
     nome só aparece na descrição. */
  const termo = normalizarTexto(busca.trim());
  const visiveis = termo
    ? PERMISSOES_ORDENADAS.filter((p) =>
        normalizarTexto(`${p.titulo} ${p.descricao}`).includes(termo),
      )
    : PERMISSOES_ORDENADAS;

  /* O que está marcado não pode sumir atrás de um filtro sem aviso: salvar
     envia o objeto inteiro, e quem filtrasse e salvasse acharia que só mexeu
     no que via. */
  const marcadasEscondidas = termo
    ? PERMISSOES_ORDENADAS.filter((p) => permissoes[p.campo] && !visiveis.includes(p)).length
    : 0;

  function togglePermissao(campo: keyof typeof permissoes) {
    setPermissoes((p) => ({ ...p, [campo]: !p[campo] }));
  }

  /* Desmarcar ESTA caixa é a única mudança daqui que pode fechar a porta por
     onde se desfaz a mudança. Um "tem certeza?" não bastaria: quem está
     varrendo a lista clica no automático, então o aviso diz o que acontece e
     o que fazer antes. O backend recusa de qualquer jeito se for a última
     porta (`ultimo_administrador_de_permissoes`); isto é para a pessoa não
     chegar lá sem saber. */
  const desligandoAdministracao =
    campoPendente === "pode_administrar_permissoes" &&
    permissoes.pode_administrar_permissoes;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setErro("");
    try {
      // Só manda `nome` quando de fato mudou — cargo padrão nem mostra o
      // campo editável, então `nome` aqui nunca diverge do original pra ele.
      const nomeMudou = !posicao.e_padrao && nome.trim() !== posicao.nome;
      await onSalvar({
        ...permissoes,
        sobreponivel,
        ...(nomeMudou ? { nome: nome.trim() } : {}),
      });
    } catch (err) {
      /* A recusa de última porta é a única que precisa MEXER na tela: o
         backend não gravou, mas o checkbox local já está desmarcado, e deixá-lo
         assim faria a tela mostrar um estado que não existe no servidor. */
      if (codigoDoErro(err) === CODIGO_ULTIMO_ADMINISTRADOR) {
        setPermissoes((atual) => ({ ...atual, pode_administrar_permissoes: true }));
        setRecusaUltimaPorta(true);
        return;
      }
      setErro(err instanceof Error ? err.message : "Erro ao salvar permissões");
    } finally {
      setSalvando(false);
    }
  }

  return (
    /* Os avisos são IRMÃOS do overlay, não filhos. Aninhados, todo clique
       dentro deles subia até o `onClick={onClose}` do overlay de fora e
       fechava a tela inteira — inclusive o clique em "Cancelar". */
    <>
      <ModalOverlay onClick={onClose} role="presentation">
        <WideModalContent onClick={(e) => e.stopPropagation()} role="dialog">
          <ModalHeader>
            <ModalTitle>Editar permissões, {posicao.nome}</ModalTitle>
            <ModalClose type="button" aria-label="Fechar" onClick={onClose}>
              <X size={18} />
            </ModalClose>
          </ModalHeader>
          <FormStack onSubmit={handleSubmit}>
            <ModalBody>
              <FieldGroup>
                <FieldLabel htmlFor="cargo-nome-edicao">Nome do cargo</FieldLabel>
                <FieldInput
                  id="cargo-nome-edicao"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  disabled={posicao.e_padrao}
                  required
                />
                {posicao.e_padrao && (
                  <EmptyText style={{ fontSize: "0.7rem" }}>
                    Os 6 cargos padrão da plataforma não podem ser renomeados.
                  </EmptyText>
                )}
              </FieldGroup>
              <FieldGroup>
                <FieldLabel>Pode ser cargo extra?</FieldLabel>
                <PermissoesGrid>
                  <PermissaoItem>
                    <input
                      type="checkbox"
                      checked={sobreponivel}
                      onChange={() => setSobreponivel((v) => !v)}
                    />
                    <PermissaoTexto>
                      <PermissaoTitulo>Sobreponível</PermissaoTitulo>
                      <PermissaoDesc>
                        Se marcado, este cargo pode ser dado como uma SEGUNDA posição pra
                        qualquer pessoa, além do cargo principal dela — soma as permissões
                        das duas, não substitui.
                      </PermissaoDesc>
                    </PermissaoTexto>
                  </PermissaoItem>
                </PermissoesGrid>
              </FieldGroup>
              <FieldGroup>
                <FieldLabel htmlFor="busca-permissao">Permissões na plataforma</FieldLabel>
                <FieldInput
                  id="busca-permissao"
                  type="text"
                  value={busca}
                  placeholder="Buscar por nome ou pelo que a permissão abre..."
                  autoComplete="off"
                  onChange={(e) => setBusca(e.target.value)}
                />
                {visiveis.length === 0 && (
                  <EmptyText style={{ fontSize: "0.75rem" }}>
                    Nenhuma permissão encontrada para "{busca}".
                  </EmptyText>
                )}
                {marcadasEscondidas > 0 && (
                  <EmptyText style={{ fontSize: "0.7rem" }}>
                    {marcadasEscondidas} permissão(ões) marcada(s) fora deste filtro continuam
                    marcadas ao salvar.
                  </EmptyText>
                )}
                <PermissoesGrid>
                  {visiveis.map((p) => (
                    <PermissaoItem key={p.campo}>
                      <input
                        type="checkbox"
                        checked={permissoes[p.campo]}
                        onChange={() =>
                          p.campo === "pode_administrar_permissoes" && permissoes[p.campo]
                            ? setCampoPendente(p.campo)
                            : togglePermissao(p.campo)
                        }
                      />
                      <PermissaoTexto>
                        <PermissaoTitulo>{p.titulo}</PermissaoTitulo>
                        <PermissaoDesc>{p.descricao}</PermissaoDesc>
                      </PermissaoTexto>
                    </PermissaoItem>
                  ))}
                </PermissoesGrid>
              </FieldGroup>

              {erro && <FormErrorText>{erro}</FormErrorText>}
            </ModalBody>
            <ModalFooter>
              {/* Só cargo criado pela tela pode sair — os 6 padrão sustentam
                  regras de identidade hardcoded fora daqui (ver o docstring
                  de `Posicao` em `types/auth.ts`), apagar um deles quebraria
                  todas elas sem aviso. `marginRight: auto` separa esta ação
                  destrutiva das duas de sempre sem precisar de outro layout. */}
              {!posicao.e_padrao && (
                <PageButton
                  $variant="outline"
                  type="button"
                  style={{ marginRight: "auto" }}
                  onClick={onExcluir}
                >
                  Excluir cargo
                </PageButton>
              )}
              <PageButton $variant="outline" type="button" onClick={onClose}>
                Cancelar
              </PageButton>
              <PageButton type="submit" disabled={salvando}>
                {salvando ? "Salvando..." : "Salvar"}
              </PageButton>
            </ModalFooter>
          </FormStack>
        </WideModalContent>
      </ModalOverlay>

      {desligandoAdministracao && (
        <ConfirmarModal
          titulo="Tirar quem edita permissões?"
          mensagem={
            <>
              Esta é a caixa que dá acesso a esta tela. Tirando-a de{" "}
              <strong>{posicao.nome}</strong>, ninguém
              dessa posição consegue mais abrir as permissões de ninguém, nem devolver esta
              caixa a si mesmo.
              <br />
              <br />
              Se ninguém de outra posição tiver esta caixa, a plataforma fica sem quem edite
              permissões, e não sobra tela nenhuma para desfazer: o conserto passa a ser no
              banco de dados. Por isso a plataforma recusa quando esta é a última porta.
              <br />
              <br />
              O caminho seguro é conceder a permissão a outra posição com gente ativa
              <strong> antes</strong> de tirá-la desta.
            </>
          }
          rotuloConfirmar="Tirar mesmo assim"
          rotuloProcessando="Tirando..."
          onCancelar={() => setCampoPendente(null)}
          onConfirmar={() => {
            togglePermissao("pode_administrar_permissoes");
            setCampoPendente(null);
          }}
        />
      )}

      {recusaUltimaPorta && (
        <AlertModal
          titulo="Não deu para tirar esta permissão"
          mensagem={
            <>
              Nenhum outro cargo com gente ativa tem a permissão{" "}
              <strong>Editar as permissões das posições</strong>. Tirando-a de{" "}
              <strong>{posicao.nome}</strong>, a
              plataforma ficaria sem ninguém capaz de abrir esta tela, e não haveria como
              desfazer por aqui.
              <br />
              <br />
              <strong>Nada foi salvo</strong>, nem as outras caixas que você tenha mudado
              agora. A permissão continua marcada.
              <br />
              <br />
              Para seguir: dê esta permissão a outro cargo que tenha alguém ativo e só
              então tire desta posição.
            </>
          }
          onFechar={() => setRecusaUltimaPorta(false)}
        />
      )}
    </>
  );
}
