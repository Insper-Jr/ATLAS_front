import { useCallback, useEffect, useState } from "react";
import { Columns3, Plus, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { createTarefa, getTarefas, podeMoverTarefa, updateTarefa } from "@/lib/tarefas";
import type { Tarefa } from "@/types/tarefa";
import { getColunas, type ColunaTarefa } from "@/lib/colunas-tarefa";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { TarefaDetalheModal } from "@/components/kanban/TarefaDetalheModal";
import { MultiSelect } from "@/components/MultiSelect";
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
  FieldGroup,
  FieldInput,
  FieldLabel,
  FormErrorText,
  ModalOverlay,
  ModalHeader,
  ModalTitle,
  ModalClose,
  ModalBody,
  ModalFooter,
  WideModalContent,
  FormFields,
  HeaderAcoes,
} from "./Projetos.styled";
import { useProjeto } from "./ProjetoPage";
import { ColunasTarefaCard } from "./ColunasTarefaCard";
import { hojeEmBrasilia } from "@/lib/fuso";

export function ProjetoTarefas() {
  const { projeto, usuarios } = useProjeto();
  const { token, usuario } = useAuth();
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [colunas, setColunas] = useState<ColunaTarefa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [criando, setCriando] = useState(false);
  const [aberta, setAberta] = useState<Tarefa | null>(null);
  const [configurando, setConfigurando] = useState(false);

  const carregar = useCallback(async () => {
    if (!token) return;
    setErro("");
    try {
      // As colunas vêm da API e são DESTE projeto: quantidade, nome, cor e
      // ordem são configuráveis pela diretoria aqui mesmo, no botão
      // "Colunas", cada projeto tem o seu fluxo.
      const [resTarefas, resColunas] = await Promise.all([
        getTarefas(projeto.id, token),
        getColunas(projeto.id, token),
      ]);
      setTarefas(resTarefas);
      setColunas(resColunas);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao carregar as tarefas");
    } finally {
      setCarregando(false);
    }
  }, [projeto.id, token]);

  useEffect(() => {
    setCarregando(true);
    carregar();
  }, [carregar]);

  const nomeUsuario = (id: number) => usuarios.find((u) => u.id === id)?.nome ?? `Usuário ${id}`;

  // Coordenação e diretoria movem qualquer tarefa; o consultor só as em que
  // é responsável (2026-09-09). O backend revalida.
  const podeMover = (t: Tarefa) => podeMoverTarefa(usuario, t, projeto.coordenador_ids);

  // Só quem está de fato alocado neste projeto pode ser responsável por uma
  // tarefa dele, `usuarios` (do useProjeto) é o quadro inteiro da Insper Jr.
  const membrosDoProjeto = usuarios
    .filter((u) => projeto.coordenador_ids.includes(u.id) || projeto.consultor_ids.includes(u.id))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  /**
   * Otimista: o card já aparece na coluna nova antes da resposta. Se o PATCH
   * falhar, recarrega do servidor, a fonte da verdade nunca é o estado local.
   */
  async function mover(tarefaId: number, colunaId: number) {
    if (!token) return;
    const anterior = tarefas;
    setTarefas((lista) =>
      lista.map((t) => (t.id === tarefaId ? { ...t, coluna_id: colunaId } : t)),
    );
    setAviso("");
    try {
      await updateTarefa(tarefaId, { coluna_id: colunaId }, token);
      await carregar();
    } catch (err) {
      setTarefas(anterior);
      setAviso(err instanceof Error ? err.message : "Erro ao mover a tarefa");
    }
  }

  if (erro) {
    return (
      <ErrorBlock>
        <ErrorText>Não foi possível carregar as tarefas: {erro}</ErrorText>
        <PageButton $variant="outline" onClick={() => carregar()}>
          Tentar novamente
        </PageButton>
      </ErrorBlock>
    );
  }

  if (carregando) return <PageLoadingBlock />;

  const vencidas = tarefas.filter((t) => t.vencida).length;

  return (
    <PageStack>
      {/* ⚠ Vem ANTES do quadro (2026-09-16, corrigido a pedido): o board
          logo abaixo empilha os cards de tarefa sem rolagem própria — numa
          coluna cheia ele passa de 2000px de altura. Este card, renderizado
          DEPOIS do quadro, ficava fora da tela sem nenhum aviso: clicar em
          "Colunas" parecia não fazer nada, quando na verdade abria a
          quilômetros de distância do clique. */}
      {configurando && <ColunasTarefaCard projetoId={projeto.id} onMudou={carregar} />}

      <PageCard>
        <PageCardHeader>
          <PageCardTitle>
            {tarefas.length} {tarefas.length === 1 ? "tarefa" : "tarefas"}
            {vencidas > 0 && ` · ${vencidas} vencida${vencidas > 1 ? "s" : ""}`}
          </PageCardTitle>
          <HeaderAcoes>
            {/* Redesenhar o board, e só deste projeto. */}
            {usuario?.permissoes.pode_configurar_colunas && (
              <PageButtonSm
                type="button"
                $variant="outline"
                aria-expanded={configurando}
                onClick={() => setConfigurando((v) => !v)}
              >
                <Columns3 size={14} />
                Colunas
              </PageButtonSm>
            )}
            {/* os QUATRO perfis criam e movem tarefa, sem gate de posição. */}
            <PageButtonSm type="button" onClick={() => setCriando(true)}>
              <Plus size={14} />
              Nova tarefa
            </PageButtonSm>
          </HeaderAcoes>
        </PageCardHeader>
        <PageCardContent>
          {aviso && <FormErrorText>{aviso}</FormErrorText>}
          {tarefas.length === 0 ? (
            <EmptyText>
              Nenhuma tarefa ainda. O coordenador distribui, mas qualquer pessoa da equipe pode criar.
            </EmptyText>
          ) : (
            <KanbanBoard
              colunas={colunas}
              tarefas={tarefas}
              nomeUsuario={nomeUsuario}
              onMover={mover}
              onAbrir={setAberta}
              podeMoverTarefa={podeMover}
            />
          )}
        </PageCardContent>
      </PageCard>

      {aberta && (
        <TarefaDetalheModal
          // A tarefa vem da lista recarregada, não do estado do clique: assim
          // o modal reflete a edição que acabou de acontecer.
          tarefa={tarefas.find((t) => t.id === aberta.id) ?? aberta}
          colunas={colunas}
          usuarios={usuarios}
          usuariosAtribuiveis={membrosDoProjeto}
          consultorIds={projeto.consultor_ids}
          coordenadorIds={projeto.coordenador_ids}
          irmasDoGrupo={
            aberta.grupo_id == null
              ? []
              : tarefas.filter((t) => t.grupo_id === aberta.grupo_id && t.id !== aberta.id)
          }
          onClose={() => setAberta(null)}
          onMudou={carregar}
        />
      )}

      {criando && token && (
        <NovaTarefaModal
          projetoId={projeto.id}
          usuarios={membrosDoProjeto.filter((u) => u.ativo)}
          consultorIds={projeto.consultor_ids}
          token={token}
          onClose={() => setCriando(false)}
          onCriada={async () => {
            setCriando(false);
            await carregar();
          }}
        />
      )}
    </PageStack>
  );
}

function NovaTarefaModal({
  projetoId,
  usuarios,
  consultorIds,
  token,
  onClose,
  onCriada,
}: {
  projetoId: number;
  usuarios: { id: number; nome: string }[];
  consultorIds: number[];
  token: string;
  onClose: () => void;
  onCriada: () => void;
}) {
  const [titulo, setTitulo] = useState("");
  const [responsavelIds, setResponsavelIds] = useState<number[]>([]);
  const [atribuicao, setAtribuicao] = useState<"conjunta" | "individual">("conjunta");
  const [prazo, setPrazo] = useState(() => hojeEmBrasilia());
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  // Só os consultores que estão de fato na lista atribuível.
  const idsConsultores = consultorIds.filter((id) => usuarios.some((u) => u.id === id));

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (responsavelIds.length === 0) {
      setErro("Escolha ao menos um responsável.");
      return;
    }
    setSalvando(true);
    setErro("");
    try {
      await createTarefa(
        projetoId,
        {
          titulo: titulo.trim(),
          responsavel_ids: responsavelIds,
          prazo,
          atribuicao: responsavelIds.length > 1 ? atribuicao : "conjunta",
        },
        token,
      );
      onCriada();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao criar a tarefa");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <ModalOverlay onClick={onClose} role="presentation">
      <WideModalContent onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="nova-tarefa">
        <ModalHeader>
          <ModalTitle id="nova-tarefa">Nova tarefa</ModalTitle>
          <ModalClose type="button" aria-label="Fechar" onClick={onClose}>
            <X size={18} />
          </ModalClose>
        </ModalHeader>
        <form onSubmit={salvar}>
          <ModalBody>
            <FormFields>
              <FieldGroup>
                <FieldLabel htmlFor="tarefa-titulo">Título</FieldLabel>
                <FieldInput
                  id="tarefa-titulo"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Levantar concorrentes"
                  required
                />
              </FieldGroup>
              <FieldGroup>
                <FieldLabel>Responsáveis</FieldLabel>
                <MultiSelect
                  valores={responsavelIds.map(String)}
                  onChange={(v) => setResponsavelIds(v.map(Number))}
                  opcoes={usuarios.map((u) => ({ value: String(u.id), label: u.nome }))}
                  rotuloVazio="Escolher pessoas…"
                  resumo={(n) => `${n} responsáveis`}
                  aria-label="Responsáveis pela tarefa"
                />
                {idsConsultores.length > 0 && (
                  <PageButtonSm
                    type="button"
                    $variant="outline"
                    onClick={() => setResponsavelIds(idsConsultores)}
                    style={{ marginTop: "0.4rem", alignSelf: "flex-start" }}
                  >
                    Todos os consultores
                  </PageButtonSm>
                )}
              </FieldGroup>

              {responsavelIds.length > 1 && (
                <FieldGroup>
                  <FieldLabel as="span">Como dividir</FieldLabel>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "0.85rem" }}>
                    <label style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                      <input
                        type="radio"
                        name="atribuicao"
                        checked={atribuicao === "conjunta"}
                        onChange={() => setAtribuicao("conjunta")}
                      />
                      Conjunta: um card, todos fazem juntos
                    </label>
                    <label style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                      <input
                        type="radio"
                        name="atribuicao"
                        checked={atribuicao === "individual"}
                        onChange={() => setAtribuicao("individual")}
                      />
                      Cada um faz a sua parte: um card por pessoa
                    </label>
                  </div>
                </FieldGroup>
              )}

              <FieldGroup>
                <FieldLabel htmlFor="tarefa-prazo">Prazo</FieldLabel>
                <FieldInput
                  id="tarefa-prazo"
                  type="date"
                  value={prazo}
                  onChange={(e) => setPrazo(e.target.value)}
                  required
                />
              </FieldGroup>
              {erro && <FormErrorText>{erro}</FormErrorText>}
            </FormFields>
          </ModalBody>
          <ModalFooter>
            <PageButton type="button" $variant="outline" onClick={onClose}>
              Cancelar
            </PageButton>
            <PageButton type="submit" disabled={salvando}>
              {salvando ? "Criando…" : "Criar tarefa"}
            </PageButton>
          </ModalFooter>
        </form>
      </WideModalContent>
    </ModalOverlay>
  );
}
