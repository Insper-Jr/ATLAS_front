import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getFrentes } from "@/lib/bancas";
import { frentesDoUsuario, normalizarTexto } from "@/lib/nucleo";
import {
  deletarUsuarioPermanente,
  getUsuarios,
  reenviarSenhaProvisoria,
  registrarUsuario,
  transferirDiretoria,
  updateUsuario,
  type SenhaProvisoriaEmitida,
} from "@/lib/usuarios";
import { getUsuariosFrentes, syncFrentesUsuario } from "@/lib/usuarios-frentes";
import { getNucleos, type Nucleo } from "@/lib/nucleos";
import { getPosicoesPermissoes } from "@/lib/posicoes-permissoes";
import { getLotes, getPendencias } from "@/lib/desempenho-lotes";
import { getFaixasDisponiveis, getGradeDeUsuario, getGradesPreenchidas } from "@/lib/grade-horaria";
import { ConfirmarModal } from "@/components/ConfirmarModal";
import { GradeEditor } from "@/components/grade/GradeEditor";
import { Th, useOrdenacao, type Colunas } from "@/components/tabela/ordenacao";

/** O rótulo de uma posição: o `nome` do catálogo (`GET /posicoes-permissoes`,
 *  cobre cargo padrão E cargo criado pela diretoria) e só cai para
 *  `ROTULO_POSICAO`/a chave crua se a lista ainda não carregou. */
function rotuloPosicao(posicoes: PosicaoPermissao[], posicao: string): string {
  return posicoes.find((p) => p.posicao === posicao)?.nome ?? ROTULO_POSICAO[posicao] ?? posicao;
}

/** Os cargos da pessoa, por extenso — a principal e, se houver, o cargo
 *  extra (⭐ 2026-09-22: qualquer cargo sobreponível, não só "bdr"), juntos
 *  com vírgula. Usado tanto na coluna "Posição" da tabela quanto na busca,
 *  senão quem só tem o cargo extra em comum com o termo buscado não aparece. */
function rotulosDeCargo(posicoes: PosicaoPermissao[], membro: { posicao: string; cargo_extra: string | null }): string {
  const rotulos = [rotuloPosicao(posicoes, membro.posicao)];
  if (membro.cargo_extra) rotulos.push(rotuloPosicao(posicoes, membro.cargo_extra));
  return rotulos.join(", ");
}

/** O par de cargo que a pessoa tem agora — sempre uma `posicao` principal,
 *  mais um `cargoExtra` opcional (`cargo_extra` no backend). ⭐ 2026-09-22 —
 *  generalizado: antes só existia "bdr" em cima de "consultor", hardcoded;
 *  agora qualquer cargo marcado `sobreponivel` no catálogo pode ser o extra
 *  de qualquer posição principal (ver `posicao_permissao.sobreponivel`). */
interface EstadoCargo {
  posicao: Posicao;
  cargoExtra: string | null;
}

/** ⭐ 2026-09-16, a pedido — a lista de cargos vira múltipla seleção de
 *  verdade (não select + checkbox à parte). ⭐ 2026-09-22 — a regra virou:
 *  cargos marcados `sobreponivel` (catálogo de permissões) podem ficar
 *  marcados JUNTO da posição principal, soma as permissões das duas; os
 *  demais são mutuamente exclusivos — marcar um troca a seleção pra ele
 *  sozinho, e desmarca o extra se ele coincidir com a nova posição. */
function alternarCargo(posicoes: PosicaoPermissao[], atual: EstadoCargo, clicado: string): EstadoCargo {
  const ehSobreponivel = posicoes.find((p) => p.posicao === clicado)?.sobreponivel ?? false;
  if (ehSobreponivel && clicado !== atual.posicao) {
    return { ...atual, cargoExtra: atual.cargoExtra === clicado ? null : clicado };
  }
  return {
    posicao: clicado,
    cargoExtra: atual.cargoExtra === clicado ? null : atual.cargoExtra,
  };
}

function cargoMarcado(atual: EstadoCargo, posicaoDaLinha: string): boolean {
  return atual.posicao === posicaoDaLinha || atual.cargoExtra === posicaoDaLinha;
}

/** A lista de cargos como checkboxes — substitui o `<select>` único de
 *  posição. Compartilhada entre cadastro e edição de membro para as duas
 *  telas não divergirem na regra de cargo sobreponível. */
function SeletorDeCargo({
  posicoes,
  estado,
  onMudar,
}: {
  posicoes: PosicaoPermissao[];
  estado: EstadoCargo;
  onMudar: (novo: EstadoCargo) => void;
}) {
  return (
    <CheckboxGrid>
      {posicoes.map((p) => (
        <CheckboxLabel key={p.posicao}>
          <input
            type="checkbox"
            checked={cargoMarcado(estado, p.posicao)}
            onChange={() => onMudar(alternarCargo(posicoes, estado, p.posicao))}
          />
          {p.nome}
        </CheckboxLabel>
      ))}
    </CheckboxGrid>
  );
}

/** As colunas ordenáveis da lista de membros. Recebe as frentes porque
 *  "Frentes" é derivada de outra tabela, não um campo do usuário — e as
 *  posições pelo mesmo motivo: o rótulo de um cargo vem do catálogo. */
function colunasDeMembro(
  usuariosFrentes: UsuarioFrente[],
  frentes: Frente[],
  posicoes: PosicaoPermissao[],
): Colunas<UsuarioResumo> {
  return {
    nome: { valor: (m) => m.nome, inicial: "asc" },
    email: { valor: (m) => m.email_insper, inicial: "asc" },
    // Pelo RÓTULO, que é o que está escrito na célula: ordenar pela chave
    // ("consultor", "diretor_projetos") daria uma ordem que a tela não mostra.
    posicao: { valor: (m) => rotuloPosicao(posicoes, m.posicao), inicial: "asc" },
    frentes: {
      valor: (m) => frentesDoUsuario(usuariosFrentes, frentes, m.id).join(", "),
      inicial: "asc",
    },
    semestre: { valor: (m) => m.semestre_graduacao, inicial: "asc" },
    nucleo: { valor: (m) => m.nucleo_nomes.join(", "), inicial: "asc" },
    status: { valor: (m) => ROTULO_STATUS_USUARIO[m.status] ?? m.status, inicial: "asc" },
  };
}
import type { Frente } from "@/types/banca";
import type { FaixaDisponivel, FaixaGrade } from "@/types/grade";
import type { Posicao, PosicaoPermissao, StatusUsuario, UsuarioFrente, UsuarioResumo } from "@/types/auth";
import { pode, ROTULO_POSICAO, ROTULO_STATUS_USUARIO } from "@/utils/permissoes";
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
  PageBadge,
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
  StatusBadge,
  DetailList,
  DetailRow,
  DetailTerm,
  DetailValue,
  ModalOverlay,
  ModalHeader,
  ModalTitle,
  ModalClose,
  ModalBody,
  ModalFooter,
  WideModalContent,
  FormStack,
  FieldGroup,
  FieldLabel,
  FieldInput,
  FieldSelect,
  CheckboxGrid,
  CheckboxLabel,
  FormErrorText,
  EditSection,
  EditSectionTitle,
  FiltersRow,
  SearchField,
  HeaderActions,
  BotaoComPino,
  PinoGrade,
  SenhaProvisoriaCaixa,
  SenhaProvisoriaValor,
} from "./Membros.styled";
import { TableScrollWrap } from "@/styles/shared.styled";

const MEMBROS_MAX_VISIVEIS = 9;
const SEMESTRES_GRADUACAO = [1, 2, 3, 4, 5, 6, 7, 8];

interface Contexto {
  frentes: Frente[];
  usuariosFrentes: UsuarioFrente[];
  posicoes: PosicaoPermissao[];
  /** Núcleos da Gestão de Pessoas (só os ativos entram no select). */
  nucleos: Nucleo[];
}

/** Quantas avaliações da rodada aberta cada pessoa já respondeu, como
 *  avaliadora, e quantas ainda faltam. */
interface AvaliacaoResumo {
  total: number;
  pendentes: number;
}

/**
 * Soma as pendências de todos os lotes abertos por avaliador. Uma pessoa
 * pode ter pendência em mais de um lote ao mesmo tempo (ex: periódico e
 * finalização rodando juntos), então o número é a soma, não "o pior lote".
 */
async function carregarAvaliacaoPorMembro(token: string): Promise<Map<number, AvaliacaoResumo>> {
  const lotesAbertos = await getLotes(token);
  const pendenciasPorLote = await Promise.all(lotesAbertos.map((lote) => getPendencias(lote.id, token)));
  const mapa = new Map<number, AvaliacaoResumo>();
  for (const pendencias of pendenciasPorLote) {
    for (const pendencia of pendencias) {
      const atual = mapa.get(pendencia.avaliador_id) ?? { total: 0, pendentes: 0 };
      atual.total += 1;
      if (!pendencia.respondida) atual.pendentes += 1;
      mapa.set(pendencia.avaliador_id, atual);
    }
  }
  return mapa;
}

export function Membros() {
  const { usuario, token } = useAuth();
  const [membros, setMembros] = useState<UsuarioResumo[]>([]);
  const [contexto, setContexto] = useState<Contexto | null>(null);
  /** `null` até carregar (ou pra quem não administra desempenho, que nunca
   *  pede isso). Mapa vazio é resultado válido: ninguém tem lote aberto. */
  const [avaliacaoPorMembro, setAvaliacaoPorMembro] = useState<Map<number, AvaliacaoResumo> | null>(null);
  /** Ids de quem já enviou a grade do semestre. `null` até carregar; um id
   *  ausente do conjunto = grade não enviada, e o botão "Ver grade" ganha um
   *  pino. Conjunto vazio é resultado válido (ninguém enviou ainda). */
  const [gradesPreenchidas, setGradesPreenchidas] = useState<Set<number> | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [membroDetalhe, setMembroDetalhe] = useState<UsuarioResumo | null>(null);
  const [gradeDe, setGradeDe] = useState<UsuarioResumo | null>(null);
  const [criandoMembro, setCriandoMembro] = useState(false);
  /** O membro que está tendo a senha de primeiro acesso reemitida. */
  const [reenviandoPara, setReenviandoPara] = useState<UsuarioResumo | null>(null);
  const [transferindo, setTransferindo] = useState(false);
  const [termoPesquisa, setTermoPesquisa] = useState("");
  const [filtroPosicao, setFiltroPosicao] = useState("");
  const [filtroFrente, setFiltroFrente] = useState("");

  // `mostrarCarregando=false` é pra recarregar em silêncio, sem acionar o
  // `if (carregando) return <PageLoadingBlock />` lá embaixo, esse early
  // return troca a PÁGINA INTEIRA pelo esqueleto de carregamento, o que
  // desmonta qualquer modal aberto por cima. "Adicionar membro" e "Reenviar
  // senha" recarregam a lista sem fechar o próprio modal (pra mostrar a
  // senha emitida), sem o flag, o modal sumia e voltava do zero (sem a
  // senha) assim que o carregamento terminava.
  async function carregarMembros(mostrarCarregando = true) {
    if (!token) return;
    if (mostrarCarregando) setCarregando(true);
    setErro("");
    try {
      const [usuariosResp, frentes, usuariosFrentes, posicoes, grades, nucleos] = await Promise.all([
        getUsuarios(token),
        getFrentes(token),
        getUsuariosFrentes(token),
        getPosicoesPermissoes(token),
        // Sem gestão ativa a rota devolve 422. O pino é acessório, então uma
        // falha aqui só o deixa de fora, não derruba a lista.
        getGradesPreenchidas(token).catch(() => ({ semestre_id: 0, usuario_ids: [] as number[] })),
        // Núcleos são acessórios da mesma forma: sem eles o select some.
        getNucleos(token).catch(() => [] as Nucleo[]),
      ]);
      setMembros(usuariosResp.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")));
      setContexto({ frentes, usuariosFrentes, posicoes, nucleos });
      setGradesPreenchidas(new Set(grades.usuario_ids));
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao carregar membros");
    } finally {
      if (mostrarCarregando) setCarregando(false);
    }

    // Separado do try/catch acima de propósito: um problema no módulo de
    // desempenho não pode travar a lista de membros inteira, é só uma
    // coluna a mais, não o motivo da pessoa estar nesta tela.
    if (usuario?.permissoes.pode_administrar_desempenho) {
      try {
        setAvaliacaoPorMembro(await carregarAvaliacaoPorMembro(token));
      } catch {
        setAvaliacaoPorMembro(new Map());
      }
    }
  }

  useEffect(() => {
    carregarMembros();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const membrosAtivos = useMemo(() => membros.filter((m) => m.ativo).length, [membros]);

  /* Filtro e ordenação ficam ACIMA dos `return` cedo abaixo: hook depois de
     `return` é hook condicional, e o React desalinha o estado. Por isso os
     acessos a `contexto` aqui são opcionais — quando ele ainda é nulo, a
     tela nem chega a renderizar a tabela. */
  const termo = normalizarTexto(termoPesquisa.trim());
  const usuariosFrentes = contexto?.usuariosFrentes ?? [];
  const frentesCadastradas = contexto?.frentes ?? [];
  const posicoesCadastradas = contexto?.posicoes ?? [];
  const membrosFiltrados = membros.filter((membro) => {
    if (filtroPosicao && membro.posicao !== filtroPosicao) return false;
    if (filtroFrente) {
      const temFrente = usuariosFrentes.some(
        (uf) => uf.usuario_id === membro.id && uf.frente_id === Number(filtroFrente),
      );
      if (!temFrente) return false;
    }
    if (!termo) return true;
    const frentes = frentesDoUsuario(usuariosFrentes, frentesCadastradas, membro.id).join(" ");
    const texto = normalizarTexto(
      `${membro.nome} ${membro.email_insper ?? ""} ${rotulosDeCargo(posicoesCadastradas, membro)} ${frentes}`,
    );
    return texto.includes(termo);
  });

  /* Ordena o que sobrou do filtro, não a lista crua. Sem coluna inicial: a
     ordem que vem do backend é a do cadastro, e nenhuma coluna sozinha é
     "a certa" para uma lista de 80 pessoas — quem procura ordena pelo que
     está procurando. */
  const colunas = useMemo(
    () => colunasDeMembro(usuariosFrentes, frentesCadastradas, posicoesCadastradas),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [contexto],
  );
  const { itens: membrosOrdenados, ordem, ordenarPor } = useOrdenacao(membrosFiltrados, colunas);

  if (!usuario?.permissoes.pode_gerir_membros) {
    return <Navigate to="/projetos" replace />;
  }

  if (erro) {
    return (
      <ErrorBlock>
        <ErrorText>Não foi possível carregar os membros: {erro}</ErrorText>
        <PageButton $variant="outline" onClick={() => carregarMembros()}>
          Tentar novamente
        </PageButton>
      </ErrorBlock>
    );
  }

  if (carregando || !contexto) return <PageLoadingBlock />;

  return (
    <PageStack>
      <PageHeaderRow>
        <PageHeaderText>
          <PageHeading>Membros</PageHeading>
          <PageSubheading>
            {membros.length} usuários cadastrados · {membrosAtivos} ativos
          </PageSubheading>
        </PageHeaderText>
        {/* ninguém se auto-registra, só a diretoria pré-cadastra. */}
        {pode(usuario, "acoes_de_pessoas") && (
          <HeaderActions>
            <PageButton $variant="outline" type="button" onClick={() => setTransferindo(true)}>
              Transferir diretoria
            </PageButton>
            <PageButton type="button" onClick={() => setCriandoMembro(true)}>
              Adicionar membro
            </PageButton>
          </HeaderActions>
        )}
      </PageHeaderRow>

      <PageCard>
        <PageCardHeader>
          <PageCardTitle>Todos os membros</PageCardTitle>
        </PageCardHeader>
        <PageCardContent>
          <FiltersRow>
            <SearchField
              type="text"
              value={termoPesquisa}
              onChange={(e) => setTermoPesquisa(e.target.value)}
              placeholder="Buscar por nome ou e-mail..."
              aria-label="Buscar membros"
            />
            <FieldSelect
              value={filtroPosicao}
              onChange={(e) => setFiltroPosicao(e.target.value)}
              aria-label="Filtrar por posição"
              style={{ width: "10rem" }}
            >
              <option value="">Todas as posições</option>
              {posicoesCadastradas.map((p) => (
                <option key={p.posicao} value={p.posicao}>
                  {p.nome}
                </option>
              ))}
            </FieldSelect>
            <FieldSelect
              value={filtroFrente}
              onChange={(e) => setFiltroFrente(e.target.value)}
              aria-label="Filtrar por frente"
              style={{ width: "10rem" }}
            >
              <option value="">Todas as frentes</option>
              {contexto.frentes.map((frente) => (
                <option key={frente.id} value={frente.id}>
                  {frente.nome}
                </option>
              ))}
            </FieldSelect>
          </FiltersRow>

          {membros.length === 0 && <EmptyText>Nenhum membro cadastrado.</EmptyText>}
          {membros.length > 0 && membrosFiltrados.length === 0 && (
            <EmptyText>Nenhum membro encontrado com os filtros selecionados.</EmptyText>
          )}
          {membrosFiltrados.length > 0 && (
            <TableScrollWrap
              $scrollable={membrosFiltrados.length > MEMBROS_MAX_VISIVEIS}
              $maxVisiveis={MEMBROS_MAX_VISIVEIS}
              // 7 colunas (8 com "Avaliação", pra quem administra desempenho):
              // abaixo de 56rem a tabela rola na horizontal em vez de espremer
              // "E-mail" e "Posição" até quebrarem letra a letra.
              $min="56rem"
            >
            <DataTable>
              <TableHead>
                <TableRow>
                  <Th coluna="nome" ordem={ordem} onOrdenar={ordenarPor}>
                    Nome
                  </Th>
                  <Th coluna="email" ordem={ordem} onOrdenar={ordenarPor}>
                    E-mail
                  </Th>
                  <Th coluna="posicao" ordem={ordem} onOrdenar={ordenarPor}>
                    Posição
                  </Th>
                  <Th coluna="frentes" ordem={ordem} onOrdenar={ordenarPor}>
                    Frentes
                  </Th>
                  <Th coluna="semestre" ordem={ordem} onOrdenar={ordenarPor}>
                    Semestre
                  </Th>
                  <Th coluna="nucleo" ordem={ordem} onOrdenar={ordenarPor}>
                    Núcleo
                  </Th>
                  <Th coluna="status" ordem={ordem} onOrdenar={ordenarPor}>
                    Status
                  </Th>
                  {/* Só quem administra desempenho vê esta coluna: é
                      informação de gestão da avaliação, não do cadastro. */}
                  {avaliacaoPorMembro && <TableHeadCell>Avaliação</TableHeadCell>}
                  <TableHeadCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {membrosOrdenados.map((membro) => {
                  const frentes = frentesDoUsuario(contexto.usuariosFrentes, contexto.frentes, membro.id);
                  return (
                    <TableRow key={membro.id}>
                      <NameCell>{membro.nome}</NameCell>
                      <TableCell>{membro.email_insper}</TableCell>
                      <TableCell>{rotulosDeCargo(posicoesCadastradas, membro)}</TableCell>
                      <TableCell>{frentes.length > 0 ? frentes.join(", ") : "—"}</TableCell>
                      <TableCell>{membro.semestre_graduacao ? `${membro.semestre_graduacao}º` : "—"}</TableCell>
                      <TableCell>{membro.nucleo_nomes.length > 0 ? membro.nucleo_nomes.join(", ") : "—"}</TableCell>
                      <TableCell>
                        {/* Os 3 estados, não um booleano: ex-membro e
                            desligado são situações diferentes. */}
                        <StatusBadge $ativo={membro.status === "ativo"}>
                          {ROTULO_STATUS_USUARIO[membro.status] ?? membro.status}
                        </StatusBadge>
                        {/* Estado ORTOGONAL ao status: a pessoa está ativa e
                            ainda não trocou a senha que recebeu por e-mail. */}
                        {membro.senha_provisoria && (
                          <EmptyText style={{ fontSize: "0.7rem", marginTop: "0.25rem" }}>
                            aguardando 1º acesso
                          </EmptyText>
                        )}
                      </TableCell>
                      {avaliacaoPorMembro && (
                        <TableCell>
                          {(() => {
                            const resumo = avaliacaoPorMembro.get(membro.id);
                            // Sem linha no mapa = a pessoa não é avaliadora
                            // de ninguém no lote aberto, não é "atrasada".
                            if (!resumo) return <EmptyText>—</EmptyText>;
                            return resumo.pendentes > 0 ? (
                              <PageBadge $tone="warning">
                                {resumo.pendentes} de {resumo.total} pendente{resumo.pendentes > 1 ? "s" : ""}
                              </PageBadge>
                            ) : (
                              <PageBadge $tone="success">Completo</PageBadge>
                            );
                          })()}
                        </TableCell>
                      )}
                      <ActionsCell>
                        {/* Reemitir derruba a senha da pessoa, por isso é
                            da diretoria, a mesma régua do cadastro. */}
                        {pode(usuario, "acoes_de_pessoas") && membro.ativo && (
                          <PageButtonSm
                            $variant="outline"
                            type="button"
                            onClick={() => setReenviandoPara(membro)}
                          >
                            {membro.senha_provisoria ? "Reenviar senha" : "Resetar senha"}
                          </PageButtonSm>
                        )}
                        {/* Pino só para quem está ativo e ainda não enviou a
                            grade do semestre: ex-membro não precisa preencher. */}
                        <BotaoComPino>
                          <PageButtonSm $variant="outline" type="button" onClick={() => setGradeDe(membro)}>
                            Ver grade
                          </PageButtonSm>
                          {membro.ativo && gradesPreenchidas && !gradesPreenchidas.has(membro.id) && (
                            <PinoGrade title="Grade do semestre não enviada" aria-label="Grade do semestre não enviada" />
                          )}
                        </BotaoComPino>
                        <PageButtonSm $variant="outline" type="button" onClick={() => setMembroDetalhe(membro)}>
                          Ver mais
                        </PageButtonSm>
                      </ActionsCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </DataTable>
            </TableScrollWrap>
          )}
        </PageCardContent>
      </PageCard>

      {membroDetalhe && token && (
        <MembroModal
          membro={membroDetalhe}
          contexto={contexto}
          token={token}
          onClose={() => setMembroDetalhe(null)}
          onSalvo={(atualizado) => {
            setMembroDetalhe(null);
            setMembros((lista) =>
              lista
                .map((m) => (m.id === atualizado.id ? atualizado : m))
                .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
            );
            carregarMembros(false);
          }}
          onApagado={() => {
            setMembros((lista) => lista.filter((m) => m.id !== membroDetalhe.id));
            setMembroDetalhe(null);
          }}
        />
      )}

      {gradeDe && token && (
        <GradeMembroModal membro={gradeDe} token={token} onClose={() => setGradeDe(null)} />
      )}

      {criandoMembro && token && (
        <NovoMembroModal
          contexto={contexto}
          token={token}
          onClose={() => setCriandoMembro(false)}
          // Não fecha o modal: quem cadastrou precisa VER a senha provisória
          // antes de sair da tela, ela não existe em mais lugar nenhum.
          onCriado={() => carregarMembros(false)}
        />
      )}

      {reenviandoPara && token && (
        <ReenviarSenhaModal
          membro={reenviandoPara}
          token={token}
          onClose={() => setReenviandoPara(null)}
          onReenviado={() => carregarMembros(false)}
        />
      )}

      {transferindo && token && usuario && (
        <TransferirDiretoriaModal
          membros={membros}
          diretorAtualId={usuario.id}
          posicaoAtual={usuario.posicao}
          token={token}
          onClose={() => setTransferindo(false)}
          onTransferido={() => {
            setTransferindo(false);
            carregarMembros();
          }}
        />
      )}
    </PageStack>
  );
}

/**
 * A grade de aulas de um membro específico, somente leitura.
 *
 * O backend nunca expôs a grade individual de ninguém além do próprio dono
 * — só o cruzamento de compatibilidade entre um grupo (§11). Esta é a
 * exceção deliberada: atrás de `pode_gerir_membros`, a mesma permissão que
 * já guarda a página inteira de Membros, não uma caixinha nova.
 */
function GradeMembroModal({
  membro,
  token,
  onClose,
}: {
  membro: UsuarioResumo;
  token: string;
  onClose: () => void;
}) {
  const [faixasDisponiveis, setFaixasDisponiveis] = useState<FaixaDisponivel[]>([]);
  const [salvas, setSalvas] = useState<FaixaGrade[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let cancelado = false;
    Promise.all([getFaixasDisponiveis(token), getGradeDeUsuario(membro.id, token)])
      .then(([faixas, grade]) => {
        if (cancelado) return;
        setFaixasDisponiveis(faixas);
        setSalvas(grade.faixas);
      })
      .catch((err) => {
        if (cancelado) return;
        setErro(err instanceof Error ? err.message : "Erro ao carregar a grade");
      })
      .finally(() => {
        if (!cancelado) setCarregando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [membro.id, token]);

  return (
    <ModalOverlay onClick={onClose} role="presentation">
      <WideModalContent
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="grade-membro-titulo"
      >
        <ModalHeader>
          <ModalTitle id="grade-membro-titulo">Grade de aulas de {membro.nome}</ModalTitle>
          <ModalClose type="button" aria-label="Fechar" onClick={onClose}>
            <X size={18} />
          </ModalClose>
        </ModalHeader>
        <ModalBody>
          {carregando && <EmptyText>Carregando…</EmptyText>}
          {!carregando && erro && <ErrorText>{erro}</ErrorText>}
          {!carregando && !erro && (
            <GradeEditor faixasDisponiveis={faixasDisponiveis} salvas={salvas} somenteLeitura />
          )}
        </ModalBody>
      </WideModalContent>
    </ModalOverlay>
  );
}

/**
 * , a virada de gestão. Antes disto a troca eram duas edições soltas
 * (promover uma, rebaixar a outra) e entre elas a plataforma podia ficar com
 * dois diretores ou com nenhum. Aqui é um passo só: o backend promove antes de
 * desligar, e quem sai vira ex-membro, o caso de "fim de gestão".
 */
function TransferirDiretoriaModal({
  membros,
  diretorAtualId,
  posicaoAtual,
  token,
  onClose,
  onTransferido,
}: {
  membros: UsuarioResumo[];
  diretorAtualId: number;
  /** O cargo de quem está transferindo — é ele que muda de mão. Não há
   *  seletor porque não há escolha: você só passa a diretoria que ocupa. */
  posicaoAtual: Posicao;
  token: string;
  onClose: () => void;
  onTransferido: () => void;
}) {
  const [novoDiretorId, setNovoDiretorId] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  // Quem pode receber: qualquer pessoa ativa que não seja você. A diretoria
  // que sai é sempre quem está fazendo a transferência.
  const elegiveis = membros.filter((m) => m.id !== diretorAtualId && m.status === "ativo");
  const escolhido = elegiveis.find((m) => String(m.id) === novoDiretorId);

  async function handleTransferir(e: React.FormEvent) {
    e.preventDefault();
    if (!escolhido) {
      setErro("Escolha quem vai receber a diretoria.");
      return;
    }
    setSalvando(true);
    setErro("");
    try {
      await transferirDiretoria(
        { novo_diretor_id: escolhido.id, diretor_atual_id: diretorAtualId, posicao: posicaoAtual },
        token,
      );
      onTransferido();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao transferir a diretoria");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <ModalOverlay onClick={onClose} role="presentation">
      <WideModalContent onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="transferir-titulo">
        <ModalHeader>
          <ModalTitle id="transferir-titulo">Transferir {ROTULO_POSICAO[posicaoAtual]}</ModalTitle>
          <ModalClose type="button" aria-label="Fechar" onClick={onClose}>
            <X size={18} />
          </ModalClose>
        </ModalHeader>

        <FormStack onSubmit={handleTransferir}>
          <ModalBody>
            <EditSection>
              <FieldGroup>
                <FieldLabel htmlFor="novo-diretor">Quem assume a diretoria</FieldLabel>
                <FieldSelect
                  id="novo-diretor"
                  value={novoDiretorId}
                  onChange={(e) => setNovoDiretorId(e.target.value)}
                  required
                  pesquisavel
                >
                  <option value="">Selecione…</option>
                  {elegiveis.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nome} · {ROTULO_POSICAO[m.posicao]}
                    </option>
                  ))}
                </FieldSelect>
              </FieldGroup>

              <EditSectionTitle>O que acontece com você</EditSectionTitle>

              <EmptyText style={{ fontSize: "0.7rem" }}>
                {escolhido ? (
                  <>
                    <strong>{escolhido.nome}</strong> passa a ser Diretor(a) e você vira{" "}
                    <strong>Ex-membro</strong>, o fim de gestão. Você sai da plataforma
                    na hora, mas todo o seu histórico é preservado.
                  </>
                ) : (
                  <>
                    Quem assume vira Diretor(a) e você vira <strong>Ex-membro</strong>, mantendo o
                    histórico. A plataforma nunca fica sem diretoria: a promoção acontece antes.
                  </>
                )}
              </EmptyText>

              {erro && <FormErrorText>{erro}</FormErrorText>}
            </EditSection>
          </ModalBody>
          <ModalFooter>
            <PageButton $variant="outline" type="button" onClick={onClose}>
              Cancelar
            </PageButton>
            <PageButton type="submit" disabled={salvando || !escolhido}>
              {salvando ? "Transferindo…" : "Transferir diretoria"}
            </PageButton>
          </ModalFooter>
        </FormStack>
      </WideModalContent>
    </ModalOverlay>
  );
}

/* ------------------------------------------------------------------ */

/**
 * A senha de primeiro acesso, na tela de quem acabou de emiti-la.
 *
 * Ela aparece aqui porque **esta é a única vez que ela existe fora do
 * e-mail**, o banco só guarda o hash. Fechar esta tela sem anotá-la não é um
 * problema quando o e-mail saiu; quando não saiu, é a diferença entre o membro
 * ter acesso ou não, e por isso o aviso muda de tom nos dois casos.
 */
function PainelSenhaProvisoria({
  email,
  resultado,
}: {
  email: string;
  resultado: SenhaProvisoriaEmitida;
}) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    await navigator.clipboard.writeText(resultado.senha_provisoria_gerada);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <EditSection>
      <EditSectionTitle>Senha de primeiro acesso</EditSectionTitle>
      <SenhaProvisoriaCaixa>
        <SenhaProvisoriaValor>{resultado.senha_provisoria_gerada}</SenhaProvisoriaValor>
        <PageButtonSm $variant="outline" type="button" onClick={copiar}>
          {copiado ? "Copiada!" : "Copiar"}
        </PageButtonSm>
      </SenhaProvisoriaCaixa>

      {resultado.email_enviado ? (
        <EmptyText>
          Enviada para <strong>{email}</strong>. No primeiro login o ATLAS obriga a pessoa a
          escolher a senha dela, até lá, o resto da plataforma fica bloqueado para ela.
        </EmptyText>
      ) : (
        <FormErrorText>
          Não foi possível enviar o e-mail (SMTP fora do ar ou não configurado). O membro está
          cadastrado, repasse a senha acima por outro canal, porque ela não aparece de novo.
          Depois é só usar "Reenviar senha" nesta tela.
        </FormErrorText>
      )}
    </EditSection>
  );
}

/**
 * Reemitir a senha de primeiro acesso.
 *
 * O aviso antes de confirmar não é decoração: reenviar **derruba a senha
 * atual da pessoa**. Para quem ainda não fez o primeiro acesso isso não custa
 * nada; para quem já usa o ATLAS, é tirar o acesso até ela ler o e-mail.
 */
function ReenviarSenhaModal({
  membro,
  token,
  onClose,
  onReenviado,
}: {
  membro: UsuarioResumo;
  token: string;
  onClose: () => void;
  onReenviado: () => void;
}) {
  const [resultado, setResultado] = useState<SenhaProvisoriaEmitida | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  async function confirmar() {
    setEnviando(true);
    setErro("");
    try {
      setResultado(await reenviarSenhaProvisoria(membro.id, token));
      onReenviado();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao reenviar a senha");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <ModalOverlay onClick={onClose} role="presentation">
      <WideModalContent onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="reenviar-titulo">
        <ModalHeader>
          <ModalTitle id="reenviar-titulo">
            {resultado ? "Senha reenviada" : `Reenviar senha para ${membro.nome}`}
          </ModalTitle>
          <ModalClose type="button" aria-label="Fechar" onClick={onClose}>
            <X size={18} />
          </ModalClose>
        </ModalHeader>

        <ModalBody>
          {resultado ? (
            <PainelSenhaProvisoria email={membro.email_insper} resultado={resultado} />
          ) : (
            <EditSection>
              <EmptyText>
                Uma senha provisória nova vai para <strong>{membro.email_insper}</strong>, e{" "}
                {membro.senha_provisoria ? (
                  <>a anterior deixa de valer.</>
                ) : (
                  <>
                    <strong>a senha atual de {membro.nome} deixa de valer</strong>, ele(a) só
                    volta a entrar com a senha nova, e vai ter que escolher outra no primeiro
                    acesso.
                  </>
                )}
              </EmptyText>
              {erro && <FormErrorText>{erro}</FormErrorText>}
            </EditSection>
          )}
        </ModalBody>

        <ModalFooter>
          {resultado ? (
            <PageButton type="button" onClick={onClose}>
              Concluir
            </PageButton>
          ) : (
            <>
              <PageButton $variant="outline" type="button" onClick={onClose}>
                Cancelar
              </PageButton>
              <PageButton type="button" disabled={enviando} onClick={confirmar}>
                {enviando ? "Enviando…" : "Reenviar senha"}
              </PageButton>
            </>
          )}
        </ModalFooter>
      </WideModalContent>
    </ModalOverlay>
  );
}

function NovoMembroModal({
  contexto,
  token,
  onClose,
  onCriado,
}: {
  contexto: Contexto;
  token: string;
  onClose: () => void;
  onCriado: () => void;
}) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [posicao, setPosicao] = useState<Posicao>("consultor");
  const [cargoExtra, setCargoExtra] = useState<string | null>(null);
  const [frenteIds, setFrenteIds] = useState<number[]>([]);
  const [semestreGraduacao, setSemestreGraduacao] = useState("");
  const [nucleoIds, setNucleoIds] = useState<number[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  /** Preenchido depois do cadastro: a senha de primeiro acesso e se o e-mail saiu. */
  const [emitida, setEmitida] = useState<SenhaProvisoriaEmitida | null>(null);

  // o recorte de visão do gerente sai de `usuario_frente`, sem nenhuma
  // frente marcada ele entra na plataforma sem enxergar projeto nenhum. E só
  // UMA: `aplicar_recorte_visao` trava numa frente só, então mais de uma
  // vira ambiguidade sobre o que ele deveria enxergar (o backend também
  // recusa a segunda, ver `create_usuario_frente.py`).
  const frenteObrigatoria = posicao === "gerente";

  function trocarCargo(novo: EstadoCargo) {
    setCargoExtra(novo.cargoExtra);
    // Muda o que a frente SIGNIFICA (trava de acesso pro gerente vs. mero
    // metadado de alocação pros outros), a seleção anterior não deveria
    // sobreviver a essa troca sem a pessoa confirmar de novo. O cargo extra
    // ligando ou desligando sozinho não mexe na posição principal, então
    // não reseta.
    if (novo.posicao !== posicao) setFrenteIds([]);
    setPosicao(novo.posicao);
  }

  function toggleFrente(id: number) {
    if (frenteObrigatoria) {
      setFrenteIds([id]);
      return;
    }
    setFrenteIds((lista) => (lista.includes(id) ? lista.filter((x) => x !== id) : [...lista, id]));
  }

  function toggleNucleo(id: number) {
    setNucleoIds((lista) => (lista.includes(id) ? lista.filter((x) => x !== id) : [...lista, id]));
  }

  async function handleCriar(e: React.FormEvent) {
    e.preventDefault();
    if (frenteObrigatoria && frenteIds.length === 0) {
      setErro("Selecione a frente, é ela que define os projetos que o gerente enxerga.");
      return;
    }
    setSalvando(true);
    setErro("");
    try {
      const criado = await registrarUsuario(
        {
          nome: nome.trim(),
          email_insper: email.trim(),
          posicao,
          cargo_extra: cargoExtra,
          semestre_graduacao: semestreGraduacao ? Number(semestreGraduacao) : null,
          nucleo_ids: nucleoIds,
        },
        token,
      );
      if (frenteIds.length > 0) {
        await syncFrentesUsuario(criado.id, frenteIds, [], token);
      }
      // A tela troca para o painel da senha em vez de fechar: é a ÚNICA vez
      // que a senha em claro existe fora do e-mail.
      setEmitida(criado);
      onCriado();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao cadastrar o membro");
    } finally {
      setSalvando(false);
    }
  }

  if (emitida) {
    return (
      <ModalOverlay onClick={onClose} role="presentation">
        <WideModalContent onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="novo-membro-titulo">
          <ModalHeader>
            <ModalTitle id="novo-membro-titulo">Membro cadastrado</ModalTitle>
            <ModalClose type="button" aria-label="Fechar" onClick={onClose}>
              <X size={18} />
            </ModalClose>
          </ModalHeader>
          <ModalBody>
            <PainelSenhaProvisoria email={email.trim()} resultado={emitida} />
          </ModalBody>
          <ModalFooter>
            <PageButton type="button" onClick={onClose}>
              Concluir
            </PageButton>
          </ModalFooter>
        </WideModalContent>
      </ModalOverlay>
    );
  }

  return (
    <ModalOverlay onClick={onClose} role="presentation">
      <WideModalContent onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="novo-membro-titulo">
        <ModalHeader>
          <ModalTitle id="novo-membro-titulo">Adicionar membro</ModalTitle>
          <ModalClose type="button" aria-label="Fechar" onClick={onClose}>
            <X size={18} />
          </ModalClose>
        </ModalHeader>

        <FormStack onSubmit={handleCriar}>
          <ModalBody>
            <EditSection>
              <FieldGroup>
                <FieldLabel htmlFor="novo-membro-nome">Nome</FieldLabel>
                <FieldInput
                  id="novo-membro-nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Nome completo"
                  required
                />
              </FieldGroup>

              <FieldGroup>
                <FieldLabel htmlFor="novo-membro-email">E-mail Insper</FieldLabel>
                <FieldInput
                  id="novo-membro-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nome@al.insper.edu.br"
                  required
                />
              </FieldGroup>

              <FieldGroup>
                {/* Multi-seleção de verdade (2026-09-16, a pedido): cargos
                    marcados sobreponível no catálogo podem ficar marcados
                    junto da posição principal — ver `alternarCargo`.
                    Substitui o antigo select único. */}
                <FieldLabel>Posição na plataforma</FieldLabel>
                <SeletorDeCargo
                  posicoes={contexto.posicoes}
                  estado={{ posicao, cargoExtra }}
                  onMudar={trocarCargo}
                />
              </FieldGroup>

              <FieldGroup>
                <FieldLabel htmlFor="novo-membro-semestre">Semestre da graduação</FieldLabel>
                <FieldSelect
                  id="novo-membro-semestre"
                  value={semestreGraduacao}
                  onChange={(e) => setSemestreGraduacao(e.target.value)}
                >
                  <option value="">Não informado</option>
                  {SEMESTRES_GRADUACAO.map((n) => (
                    <option key={n} value={n}>
                      {n}º semestre
                    </option>
                  ))}
                </FieldSelect>
              </FieldGroup>

              <FieldGroup>
                <FieldLabel>Núcleos</FieldLabel>
                <CheckboxGrid>
                  {contexto.nucleos.filter((n) => n.ativo).length === 0 && (
                    <EmptyText>Nenhum núcleo ativo cadastrado.</EmptyText>
                  )}
                  {contexto.nucleos
                    .filter((n) => n.ativo)
                    .map((n) => (
                      <CheckboxLabel key={n.id}>
                        <input type="checkbox" checked={nucleoIds.includes(n.id)} onChange={() => toggleNucleo(n.id)} />
                        {n.nome}
                      </CheckboxLabel>
                    ))}
                </CheckboxGrid>
              </FieldGroup>

              {/* Logo abaixo da posição: para o gerente, escolher a frente é
                  parte de definir a posição, não um detalhe solto. */}
              <FieldGroup>
                <FieldLabel>{frenteObrigatoria ? "Frente que o gerente lidera *" : "Frentes"}</FieldLabel>
                <CheckboxGrid>
                  {contexto.frentes.length === 0 && <EmptyText>Nenhuma frente cadastrada.</EmptyText>}
                  {contexto.frentes.map((frente) => (
                    <CheckboxLabel key={frente.id}>
                      <input
                        type={frenteObrigatoria ? "radio" : "checkbox"}
                        name={frenteObrigatoria ? "novo-membro-frente-gerente" : undefined}
                        checked={frenteIds.includes(frente.id)}
                        onChange={() => toggleFrente(frente.id)}
                      />
                      {frente.nome}
                    </CheckboxLabel>
                  ))}
                </CheckboxGrid>
              </FieldGroup>

              {erro && <FormErrorText>{erro}</FormErrorText>}
            </EditSection>
          </ModalBody>
          <ModalFooter>
            <PageButton $variant="outline" type="button" onClick={onClose}>
              Cancelar
            </PageButton>
            <PageButton type="submit" disabled={salvando}>
              {salvando ? "Cadastrando…" : "Cadastrar"}
            </PageButton>
          </ModalFooter>
        </FormStack>
      </WideModalContent>
    </ModalOverlay>
  );
}

function MembroModal({
  membro,
  contexto,
  token,
  onClose,
  onSalvo,
  onApagado,
}: {
  membro: UsuarioResumo;
  contexto: Contexto;
  token: string;
  onClose: () => void;
  onSalvo: (membro: UsuarioResumo) => void;
  onApagado: () => void;
}) {
  const { usuario } = useAuth();
  const podeApagar = pode(usuario, "apagar_usuario_permanente");
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState(membro.nome);
  const [email, setEmail] = useState(membro.email_insper);
  const [posicao, setPosicao] = useState<Posicao>(membro.posicao);
  const [status, setStatus] = useState<StatusUsuario>(membro.status);
  const [frenteIds, setFrenteIds] = useState<number[]>(() =>
    contexto.usuariosFrentes.filter((uf) => uf.usuario_id === membro.id).map((uf) => uf.frente_id),
  );
  const [semestreGraduacao, setSemestreGraduacao] = useState(
    membro.semestre_graduacao ? String(membro.semestre_graduacao) : "",
  );
  const [cargoExtra, setCargoExtra] = useState<string | null>(membro.cargo_extra);
  const [nucleoIds, setNucleoIds] = useState<number[]>(membro.nucleo_ids);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const frentesMembro = frentesDoUsuario(contexto.usuariosFrentes, contexto.frentes, membro.id);

  // promover a gerente sem vincular frente deixa a conta sem enxergar
  // nada. E só UMA, ver o comentário equivalente em `NovoMembroModal`.
  const frenteObrigatoria = posicao === "gerente";

  function trocarCargo(novo: EstadoCargo) {
    setCargoExtra(novo.cargoExtra);
    // O cargo extra ligando/desligando sozinho não muda a posição principal,
    // então não reseta frentes — só quando a posição de fato troca.
    if (novo.posicao !== posicao) setFrenteIds([]);
    setPosicao(novo.posicao);
  }

  function toggleFrente(id: number) {
    if (frenteObrigatoria) {
      setFrenteIds([id]);
      return;
    }
    setFrenteIds((lista) => (lista.includes(id) ? lista.filter((x) => x !== id) : [...lista, id]));
  }

  function toggleNucleo(id: number) {
    setNucleoIds((lista) => (lista.includes(id) ? lista.filter((x) => x !== id) : [...lista, id]));
  }

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    if (frenteObrigatoria && frenteIds.length === 0) {
      setErro("Selecione a frente, é ela que define os projetos que o gerente enxerga.");
      return;
    }
    setSalvando(true);
    setErro("");
    try {
      const atualizado = await updateUsuario(
        membro.id,
        {
          nome: nome.trim(),
          email_insper: email.trim(),
          posicao,
          status,
          // `ativo` é espelho de `status` (F2), mandado junto para o front
          // legado que ainda lê o booleano não divergir.
          ativo: status === "ativo",
          // `alternarCargo` já garante que `cargoExtra` nunca coincide com a
          // posição principal selecionada — manda como está.
          cargo_extra: cargoExtra,
          semestre_graduacao: semestreGraduacao ? Number(semestreGraduacao) : null,
          nucleo_ids: nucleoIds,
        },
        token,
      );
      await syncFrentesUsuario(membro.id, frenteIds, contexto.usuariosFrentes, token);
      onSalvo(atualizado);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao salvar alterações");
    } finally {
      setSalvando(false);
    }
  }

  async function confirmarExclusao() {
    setExcluindo(true);
    try {
      await deletarUsuarioPermanente(membro.id, token);
      onApagado();
    } catch (err) {
      setExcluindo(false);
      throw err;
    }
  }

  return (
    <ModalOverlay onClick={onClose} role="presentation">
      <WideModalContent onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="membro-titulo">
        <ModalHeader>
          <ModalTitle id="membro-titulo">{membro.nome}</ModalTitle>
          <ModalClose type="button" aria-label="Fechar" onClick={onClose}>
            <X size={18} />
          </ModalClose>
        </ModalHeader>

        {!editando ? (
          <>
            <ModalBody>
              <DetailList>
                <DetailRow>
                  <DetailTerm>E-mail</DetailTerm>
                  <DetailValue>{membro.email_insper}</DetailValue>
                </DetailRow>
                <DetailRow>
                  <DetailTerm>Posição</DetailTerm>
                  <DetailValue>
                    {rotuloPosicao(contexto.posicoes, membro.posicao)}
                    {membro.cargo_extra && ` · ${rotuloPosicao(contexto.posicoes, membro.cargo_extra)}`}
                  </DetailValue>
                </DetailRow>
                <DetailRow>
                  <DetailTerm>Frentes</DetailTerm>
                  <DetailValue>{frentesMembro.length > 0 ? frentesMembro.join(", ") : "—"}</DetailValue>
                </DetailRow>
                <DetailRow>
                  <DetailTerm>Semestre da graduação</DetailTerm>
                  <DetailValue>
                    {membro.semestre_graduacao ? `${membro.semestre_graduacao}º semestre` : "—"}
                  </DetailValue>
                </DetailRow>
                <DetailRow>
                  <DetailTerm>Núcleos</DetailTerm>
                  <DetailValue>{membro.nucleo_nomes.length > 0 ? membro.nucleo_nomes.join(", ") : "Sem núcleo"}</DetailValue>
                </DetailRow>
                <DetailRow>
                  <DetailTerm>Status</DetailTerm>
                  <DetailValue>
                    <StatusBadge $ativo={membro.status === "ativo"}>
                      {ROTULO_STATUS_USUARIO[membro.status] ?? membro.status}
                    </StatusBadge>
                  </DetailValue>
                </DetailRow>
              </DetailList>
            </ModalBody>
            <ModalFooter>
              {podeApagar && membro.status === "desligado" && (
                <PageButton
                  $variant="outline"
                  type="button"
                  disabled={excluindo}
                  onClick={() => setConfirmandoExclusao(true)}
                  style={{ marginRight: "auto" }}
                >
                  Apagar para sempre
                </PageButton>
              )}
              <PageButton $variant="outline" type="button" onClick={onClose}>
                Fechar
              </PageButton>
              <PageButton type="button" onClick={() => setEditando(true)}>
                Editar
              </PageButton>
            </ModalFooter>

            {confirmandoExclusao && (
              <ConfirmarModal
                titulo="Apagar membro para sempre"
                mensagem={`Apagar "${membro.nome}" para sempre? Tarefas, bancas coordenadas, avaliações, candidaturas e vínculos dela são todos apagados junto, inclusive registros que envolvem outras pessoas, como bancas que ela coordenou. Essa ação não pode ser desfeita.`}
                rotuloConfirmar="Apagar para sempre"
                onCancelar={() => setConfirmandoExclusao(false)}
                onConfirmar={confirmarExclusao}
              />
            )}
          </>
        ) : (
          <FormStack onSubmit={handleSalvar}>
            <ModalBody>
              <EditSection>
                <EditSectionTitle>Editar membro</EditSectionTitle>

                <FieldGroup>
                  <FieldLabel htmlFor="nome-membro">Nome</FieldLabel>
                  <FieldInput
                    id="nome-membro"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Nome completo"
                    required
                  />
                </FieldGroup>

                <FieldGroup>
                  {/* O email é a credencial de login e o destino da recuperação
                      de senha. Editável pela diretoria para corrigir erro de
                      cadastro ou troca de email institucional. */}
                  <FieldLabel htmlFor="email-membro">E-mail Insper</FieldLabel>
                  <FieldInput
                    id="email-membro"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nome@al.insper.edu.br"
                    required
                  />
                </FieldGroup>

                <FieldGroup>
                  {/* "na troca de gestão, muitos consultores viram
                      coordenadores ou gerentes", a promoção da virada é
                      feita por aqui. Multi-seleção de verdade (2026-09-16, a
                      pedido): cargos marcados sobreponível no catálogo podem
                      ficar marcados junto da posição principal — ver
                      `alternarCargo`. */}
                  <FieldLabel>Posição na plataforma</FieldLabel>
                  <SeletorDeCargo
                    posicoes={contexto.posicoes}
                    estado={{ posicao, cargoExtra }}
                    onMudar={trocarCargo}
                  />
                  <EmptyText style={{ fontSize: "0.7rem" }}>
                    Cargos marcados "sobreponível" no catálogo de permissões (ex.: BDR)
                    acumulam com a posição principal em vez de substituí-la — soma as
                    permissões das duas.
                  </EmptyText>
                </FieldGroup>

                <FieldGroup>
                  <FieldLabel htmlFor="semestre-membro">Semestre da graduação</FieldLabel>
                  <FieldSelect
                    id="semestre-membro"
                    value={semestreGraduacao}
                    onChange={(e) => setSemestreGraduacao(e.target.value)}
                  >
                    <option value="">Não informado</option>
                    {SEMESTRES_GRADUACAO.map((n) => (
                      <option key={n} value={n}>
                        {n}º semestre
                      </option>
                    ))}
                  </FieldSelect>
                </FieldGroup>

                <FieldGroup>
                  <FieldLabel>Núcleos</FieldLabel>
                  <CheckboxGrid>
                    {contexto.nucleos.length === 0 && <EmptyText>Nenhum núcleo cadastrado.</EmptyText>}
                    {/* Núcleo inativo só aparece se a pessoa já está nele,
                        pra dar pra tirar; o backend recusa marcar inativo. */}
                    {contexto.nucleos
                      .filter((n) => n.ativo || membro.nucleo_ids.includes(n.id))
                      .map((n) => (
                        <CheckboxLabel key={n.id}>
                          <input type="checkbox" checked={nucleoIds.includes(n.id)} onChange={() => toggleNucleo(n.id)} />
                          {n.nome}
                          {!n.ativo && " (inativo)"}
                        </CheckboxLabel>
                      ))}
                  </CheckboxGrid>
                </FieldGroup>

                <FieldGroup>
                  <FieldLabel>{frenteObrigatoria ? "Frente que o gerente lidera *" : "Frentes"}</FieldLabel>
                  <CheckboxGrid>
                    {contexto.frentes.length === 0 && <EmptyText>Nenhuma frente cadastrada.</EmptyText>}
                    {contexto.frentes.map((frente) => (
                      <CheckboxLabel key={frente.id}>
                        <input
                          type={frenteObrigatoria ? "radio" : "checkbox"}
                          name={frenteObrigatoria ? "membro-frente-gerente" : undefined}
                          checked={frenteIds.includes(frente.id)}
                          onChange={() => toggleFrente(frente.id)}
                        />
                        {frente.nome}
                      </CheckboxLabel>
                    ))}
                  </CheckboxGrid>
                </FieldGroup>

                <FieldGroup>
                  <FieldLabel htmlFor="status-membro">Status</FieldLabel>
                  <FieldSelect
                    id="status-membro"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as StatusUsuario)}
                    required
                  >
                    {(Object.keys(ROTULO_STATUS_USUARIO) as StatusUsuario[]).map((s) => (
                      <option key={s} value={s}>
                        {ROTULO_STATUS_USUARIO[s]}
                      </option>
                    ))}
                  </FieldSelect>
                  <EmptyText style={{ fontSize: "0.7rem" }}>
                    <strong>Ex-membro</strong>: saiu por vontade própria ou fim de gestão, perde o
                    acesso, mantém o histórico. <strong>Desligado</strong>: removido da plataforma.
                    Em ambos, a participação em projetos passados permanece íntegra.
                  </EmptyText>
                </FieldGroup>

                {erro && <FormErrorText>{erro}</FormErrorText>}
              </EditSection>
            </ModalBody>
            <ModalFooter>
              <PageButton
                $variant="outline"
                type="button"
                onClick={() => {
                  setEditando(false);
                  setNome(membro.nome);
                  setEmail(membro.email_insper);
                  setPosicao(membro.posicao);
                  setStatus(membro.status);
                  setCargoExtra(membro.cargo_extra);
                  setFrenteIds(
                    contexto.usuariosFrentes.filter((uf) => uf.usuario_id === membro.id).map((uf) => uf.frente_id),
                  );
                  setErro("");
                }}
              >
                Cancelar
              </PageButton>
              <PageButton type="submit" disabled={salvando}>
                {salvando ? "Salvando..." : "Salvar"}
              </PageButton>
            </ModalFooter>
          </FormStack>
        )}
      </WideModalContent>
    </ModalOverlay>
  );
}
