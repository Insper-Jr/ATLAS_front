import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { AlertTriangle } from "lucide-react";
import { tonsDaColuna, type TonsColuna } from "@/lib/colunas-tarefa";
import { CORES_STATUS, destinosValidos, formatarDataHoraBanca, podePausar, ROTULO_STATUS } from "@/lib/projetos";
import { StatusPilula } from "@/pages/projetos/Projetos.styled";
import type { ProjetoResumo, StatusProjeto } from "@/types/projeto";
import {
  AlertaCard,
  Board,
  Card,
  CardBanca,
  CardFrentes,
  CardFrenteTag,
  CardMeta,
  CardTitulo,
  CardTopo,
  Coluna,
  ColunaRotuloTexto,
  ColunaTitulo,
  ColunaVazia,
  Contador,
  PendenteDot,
  Ponto,
} from "./Kanban.styled";

/** ⚠ 2026-09-21 — a pedido: "Contrato em elaboração" não entra no Kanban
 *  geral. É um projeto que ainda não é venda de fato — a régua da diretora
 *  foi literal: "não precisa ficar todos esses projetos ali". Esses ficam
 *  só na aba Contratos (`ContratosPainel.tsx`); quando o contrato é
 *  assinado e o projeto vira "Vendido" de verdade, ele aparece aqui como
 *  qualquer outro — mesma linha, só o status mudou. */
const COLUNAS = (Object.keys(ROTULO_STATUS) as StatusProjeto[])
  .filter((status) => status !== "contrato_em_elaboracao")
  .map((status) => ({
    status,
    rotulo: ROTULO_STATUS[status],
  }));

/**
 * Pra onde um projeto no status `atual` pode ir num arrasto, mesma régua
 * livre do seletor de etapa em `ProjetoPage` (qualquer etapa ativa, nos dois
 * sentidos). `pausado` não entra: o alvo do retomar é decidido no backend,
 * não dá pra adivinhar arrastando pra uma coluna específica.
 */
function statusAlvoValidos(atual: StatusProjeto, temKickoff: boolean, livreDeKickoff = false): StatusProjeto[] {
  const alvos = destinosValidos(atual, temKickoff, livreDeKickoff);
  return podePausar(atual) ? [...alvos, "pausado"] : alvos;
}

interface ProjetoKanbanBoardProps {
  projetos: ProjetoResumo[];
  podeArrastar: boolean;
  nomeFrente: (id: number) => string;
  onMover: (projetoId: number, statusNovo: StatusProjeto) => void;
  /** Projetos com pedido de entrada pendente (§7.3) — quem pode responder
   *  vê a bolinha no card, sem precisar abrir o projeto. */
  projetosComPendencia?: Set<number>;
}

export function ProjetoKanbanBoard({
  projetos,
  podeArrastar,
  nomeFrente,
  onMover,
  projetosComPendencia,
}: ProjetoKanbanBoardProps) {
  const [arrastando, setArrastando] = useState<ProjetoResumo | null>(null);

  const tons = useMemo(() => {
    const mapa = new Map<StatusProjeto, TonsColuna>();
    for (const status of Object.keys(CORES_STATUS) as StatusProjeto[]) {
      mapa.set(status, tonsDaColuna(CORES_STATUS[status]));
    }
    return mapa;
  }, []);

  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  function aoIniciar(evento: DragStartEvent) {
    setArrastando(projetos.find((p) => p.id === Number(evento.active.id)) ?? null);
  }

  function aoSoltar(evento: DragEndEvent) {
    setArrastando(null);
    const destino = evento.over?.id as StatusProjeto | undefined;
    if (!destino) return;
    const projeto = projetos.find((p) => p.id === Number(evento.active.id));
    if (!projeto || projeto.status === destino) return;
    if (!statusAlvoValidos(projeto.status, !!projeto.data_kickoff, projeto.criado_pelo_atalho).includes(destino)) return;
    onMover(projeto.id, destino);
  }

  return (
    <DndContext sensors={sensores} onDragStart={aoIniciar} onDragEnd={aoSoltar}>
      <Board $colunas={COLUNAS.length}>
        {COLUNAS.map((coluna) => (
          <ColunaDrop
            key={coluna.status}
            status={coluna.status}
            rotulo={coluna.rotulo}
            tons={tons.get(coluna.status)!}
            projetos={projetos.filter((p) => p.status === coluna.status)}
            podeArrastar={podeArrastar}
            nomeFrente={nomeFrente}
            projetosComPendencia={projetosComPendencia}
          />
        ))}
      </Board>

      <DragOverlay>
        {arrastando && (
          <Card $cor={tons.get(arrastando.status)}>
            <CardTitulo>{arrastando.nome}</CardTitulo>
          </Card>
        )}
      </DragOverlay>
    </DndContext>
  );
}

function ColunaDrop({
  status,
  rotulo,
  tons,
  projetos,
  podeArrastar,
  nomeFrente,
  projetosComPendencia,
}: {
  status: StatusProjeto;
  rotulo: string;
  tons: TonsColuna;
  projetos: ProjetoResumo[];
  podeArrastar: boolean;
  nomeFrente: (id: number) => string;
  projetosComPendencia?: Set<number>;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <Coluna ref={setNodeRef} $sobre={isOver} $cor={tons}>
      <ColunaTitulo>
        <StatusPilula $cor={tons}>
          <Ponto $cor={tons.ponto} />
          <ColunaRotuloTexto>{rotulo}</ColunaRotuloTexto>
        </StatusPilula>
        <Contador>{projetos.length}</Contador>
      </ColunaTitulo>

      {projetos.length === 0 && <ColunaVazia>—</ColunaVazia>}
      {projetos.map((projeto) => (
        <CardArrastavel
          key={projeto.id}
          projeto={projeto}
          tons={tons}
          podeArrastar={podeArrastar}
          nomeFrente={nomeFrente}
          temPendencia={!!projetosComPendencia?.has(projeto.id)}
        />
      ))}
    </Coluna>
  );
}

function CardArrastavel({
  projeto,
  tons,
  podeArrastar,
  nomeFrente,
  temPendencia,
}: {
  projeto: ProjetoResumo;
  tons: TonsColuna;
  podeArrastar: boolean;
  nomeFrente: (id: number) => string;
  temPendencia: boolean;
}) {
  const arrastavel =
    podeArrastar && statusAlvoValidos(projeto.status, !!projeto.data_kickoff, projeto.criado_pelo_atalho).length > 0;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: projeto.id,
    disabled: !arrastavel,
  });
  const navigate = useNavigate();

  return (
    <Card
      ref={setNodeRef}
      $cor={tons}
      $arrastando={isDragging}
      $bloqueada={!arrastavel}
      {...(arrastavel ? listeners : {})}
      {...(arrastavel ? attributes : {})}
      // Depois do spread de propósito: `attributes` do dnd-kit já traz
      // role/tabIndex quando arrastável, e espalhar por último sobrescreveria
      // os nossos. O clique abre o projeto; o arrasto só começa depois de 5px
      // de movimento (activationConstraint), então os dois gestos convivem.
      // `tabIndex` fica explícito pra continuar navegável por teclado mesmo
      // quando o card não é arrastável (aí `attributes` não traz nenhum).
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/projetos/${projeto.id}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          navigate(`/projetos/${projeto.id}`);
        }
      }}
    >
      {temPendencia && <PendenteDot title="Pedido de entrada pendente" />}
      <CardTopo>
        <CardTitulo>{projeto.nome}</CardTitulo>
        {projeto.kickoff_pendente && (
          <AlertaCard title="Kickoff pendente">
            <AlertTriangle size={14} />
          </AlertaCard>
        )}
      </CardTopo>
      <CardMeta title={projeto.cliente ?? undefined}>{projeto.cliente}</CardMeta>
      <CardFrentes>
        {projeto.frente_ids.map((id) => (
          <CardFrenteTag key={id} title={nomeFrente(id)}>
            {nomeFrente(id)}
          </CardFrenteTag>
        ))}
      </CardFrentes>
      {projeto.proxima_banca && (
        <CardBanca title={`Banca: ${formatarDataHoraBanca(projeto.proxima_banca)}`}>
          Banca: {formatarDataHoraBanca(projeto.proxima_banca)}
        </CardBanca>
      )}
    </Card>
  );
}
