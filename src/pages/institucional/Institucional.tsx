import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ExternalLink, GripVertical, Trash2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ConfirmarModal } from "@/components/ConfirmarModal";
import { EstadoVazio } from "@/components/EstadoVazio";
import {
  apagarExMembro,
  getExMembros,
  importarExMembrosIniciais,
  publicarExMembro,
  reordenarExMembros,
} from "@/lib/institucional";
import { LIMITE_CARROSSEL, type ExMembro } from "@/types/institucional";
import {
  ErrorText,
  PageBadge,
  PageButton,
  PageButtonSm,
  PageCard,
  PageCardContent,
  PageCardHeader,
  PageCardTitle,
  PageHeader,
  PageHeaderText,
  PageLoadingBlock,
  PageStack,
  PageStat,
  PageStats,
  PageSubtitle,
  PageTitle,
} from "@/styles/page.styled";
import { ExMembroModal } from "./ExMembroModal";
import { FotoExMembro } from "./FotoExMembro";
import {
  Acoes,
  Alca,
  AlcaEPosicao,
  Cartao,
  CartaoTopo,
  Etiquetas,
  Grade,
  Info,
  Intro,
  Nome,
  Pessoa,
  Posicao,
  Sub,
} from "./Institucional.styled";

const SITE_EX_MEMBROS = "https://www.insperjunior.com/alumni";

/**
 * Institucional (2026-10-09, a pedido): o que a diretoria publica no SITE
 * da Insper Jr, sem precisar de PR no repositório do site. Por enquanto só
 * os ex-membros em destaque; a página foi pensada como uma pilha de cards,
 * um por seção do site, pra as próximas entrarem embaixo.
 *
 * Quem entra é quem tem a caixa `pode_acessar_institucional` (nasce marcada
 * só pra diretoria). O site lê a lista por uma rota pública só de leitura.
 */
export function Institucional() {
  return (
    <PageStack>
      <PageHeader>
        <PageHeaderText>
          <PageTitle>Institucional</PageTitle>
          <PageSubtitle>O que aparece no site da Insper Jr. Alterações aparecem no site no próximo carregamento da página.</PageSubtitle>
        </PageHeaderText>
      </PageHeader>

      <CardExMembros />
    </PageStack>
  );
}

/* ─── Ex-membros em destaque ────────────────────────────────────────────── */

function CardExMembros() {
  const { token } = useAuth();
  const [lista, setLista] = useState<ExMembro[] | null>(null);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [modal, setModal] = useState<ExMembro | "novo" | null>(null);
  const [apagando, setApagando] = useState<ExMembro | null>(null);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    if (!token) return;
    getExMembros(token)
      .then(setLista)
      .catch((err) => setErro(err instanceof Error ? err.message : "Erro ao carregar"));
  }, [token]);

  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Posição entre os PUBLICADOS: é ela que decide quem está no carrossel.
  const posicaoPublicada = useMemo(() => {
    const mapa = new Map<number, number>();
    let i = 0;
    for (const m of lista ?? []) if (m.publicado) mapa.set(m.id, i++);
    return mapa;
  }, [lista]);

  const publicados = posicaoPublicada.size;

  async function aoSoltar(evento: DragEndEvent) {
    const { active, over } = evento;
    if (!lista || !token || !over || active.id === over.id) return;
    const de = lista.findIndex((m) => m.id === active.id);
    const para = lista.findIndex((m) => m.id === over.id);
    if (de < 0 || para < 0) return;

    // Reflete na hora e salva em seguida; se o servidor recusar, volta pro
    // que ele tem — a lista nunca fica mostrando uma ordem que não existe.
    const anterior = lista;
    const nova = arrayMove(lista, de, para);
    setLista(nova);
    setErro("");
    try {
      setLista(await reordenarExMembros(nova.map((m) => m.id), token));
    } catch (err) {
      setLista(anterior);
      setErro(err instanceof Error ? err.message : "Não foi possível salvar a ordem.");
    }
  }

  async function alternarPublicado(m: ExMembro) {
    if (!token) return;
    setOcupado(true);
    setErro("");
    try {
      const salvo = await publicarExMembro(m.id, !m.publicado, token);
      setLista((l) => l?.map((x) => (x.id === salvo.id ? salvo : x)) ?? null);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível atualizar.");
    } finally {
      setOcupado(false);
    }
  }

  async function confirmarApagar() {
    if (!token || !apagando) return;
    await apagarExMembro(apagando.id, token);
    setLista((l) => l?.filter((x) => x.id !== apagando.id) ?? null);
    setApagando(null);
  }

  async function importar() {
    if (!token) return;
    setOcupado(true);
    setErro("");
    setAviso("");
    try {
      const r = await importarExMembrosIniciais(token);
      setLista(await getExMembros(token));
      setAviso(
        r.importados === 0
          ? "Ninguém novo na lista inicial: todos já estavam cadastrados."
          : `${r.importados} ex-membro(s) importado(s)${r.pulados ? ` (${r.pulados} já existiam)` : ""}. Quem veio do formulário entra oculto — revise e publique.`,
      );
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível importar.");
    } finally {
      setOcupado(false);
    }
  }

  function aoSalvar(salvo: ExMembro) {
    setLista((l) => {
      if (!l) return [salvo];
      return l.some((x) => x.id === salvo.id) ? l.map((x) => (x.id === salvo.id ? salvo : x)) : [...l, salvo];
    });
    setModal(null);
  }

  if (lista === null && !erro) return <PageLoadingBlock />;

  return (
    <>
      <PageCard>
        <PageCardHeader>
          <PageCardTitle>Ex-membros em destaque</PageCardTitle>
          <PageStats>
            <PageButtonSm as="a" href={SITE_EX_MEMBROS} target="_blank" rel="noreferrer" $variant="ghost">
              Ver no site <ExternalLink size={14} />
            </PageButtonSm>
            <PageButtonSm
              type="button"
              onClick={importar}
              disabled={ocupado}
              $variant="outline"
              title="Traz quem está na lista inicial (os do site antigo + os do formulário de mapeamento) e ainda não foi cadastrado. Não duplica ninguém."
            >
              {ocupado ? "Importando…" : "Importar lista inicial"}
            </PageButtonSm>
            <PageButton type="button" onClick={() => setModal("novo")} disabled={ocupado}>
              Novo ex-membro
            </PageButton>
          </PageStats>
        </PageCardHeader>

        <PageCardContent>
          <PageStack>
            <Intro>
              A ordem abaixo é a ordem do site — arraste pela alça para mudar. Os{" "}
              <strong>{LIMITE_CARROSSEL} primeiros publicados</strong> aparecem no carrossel da página; os demais só em
              &quot;Ver todos&quot;. Textos em inglês são opcionais: vazios, o site mostra o português.
            </Intro>

            {lista && lista.length > 0 && (
              <PageStats>
                <PageStat>{lista.length} cadastrados</PageStat>
                <PageStat>{publicados} publicados</PageStat>
                <PageStat>{Math.min(publicados, LIMITE_CARROSSEL)} no carrossel</PageStat>
              </PageStats>
            )}

            {erro && <ErrorText>{erro}</ErrorText>}
            {aviso && <Intro role="status">{aviso}</Intro>}

            {lista && lista.length === 0 && (
              <>
                <EstadoVazio
                  causa="vazio"
                  titulo="Nenhum ex-membro cadastrado"
                  motivo="Enquanto esta lista estiver vazia, o site continua mostrando a lista fixa antiga. Importe a lista inicial — os 13 que já estão no site (publicados, com fotos e textos PT/EN) e os 19 que anexaram foto no formulário de mapeamento da 51ª (ocultos, para revisar e publicar) — ou comece do zero."
                />
                <PageStats>
                  <PageButton type="button" onClick={importar} disabled={ocupado}>
                    {ocupado ? "Importando…" : "Importar lista inicial"}
                  </PageButton>
                </PageStats>
              </>
            )}

            {lista && lista.length > 0 && (
              <DndContext sensors={sensores} collisionDetection={closestCenter} onDragEnd={aoSoltar}>
                <SortableContext items={lista.map((m) => m.id)} strategy={rectSortingStrategy}>
                  <Grade>
                    {lista.map((m, indice) => {
                      const pos = posicaoPublicada.get(m.id);
                      const noCarrossel = pos !== undefined && pos < LIMITE_CARROSSEL;
                      return (
                        <CartaoExMembro
                          key={m.id}
                          exMembro={m}
                          indice={indice}
                          noCarrossel={noCarrossel}
                          ocupado={ocupado}
                          onEditar={() => setModal(m)}
                          onAlternar={() => alternarPublicado(m)}
                          onApagar={() => setApagando(m)}
                        />
                      );
                    })}
                  </Grade>
                </SortableContext>
              </DndContext>
            )}
          </PageStack>
        </PageCardContent>
      </PageCard>

      {modal && <ExMembroModal exMembro={modal === "novo" ? null : modal} onSalvo={aoSalvar} onFechar={() => setModal(null)} />}

      {apagando && (
        <ConfirmarModal
          titulo="Remover ex-membro do site?"
          mensagem={
            <>
              <strong>{apagando.nome}</strong> sai do site e a foto é apagada; não dá para desfazer. Se a ideia é só tirar
              do ar por enquanto, use &quot;Ocultar&quot;.
            </>
          }
          rotuloConfirmar="Remover"
          onConfirmar={confirmarApagar}
          onCancelar={() => setApagando(null)}
        />
      )}
    </>
  );
}

/* ─── Um card arrastável ───────────────────────────────────────────────── */

interface CartaoProps {
  exMembro: ExMembro;
  indice: number;
  noCarrossel: boolean;
  ocupado: boolean;
  onEditar: () => void;
  onAlternar: () => void;
  onApagar: () => void;
}

function CartaoExMembro({ exMembro: m, indice, noCarrossel, ocupado, onEditar, onAlternar, onApagar }: CartaoProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: m.id,
  });

  return (
    <Cartao
      ref={setNodeRef}
      $oculto={!m.publicado}
      $arrastando={isDragging}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <CartaoTopo>
        <AlcaEPosicao>
          <Alca ref={setActivatorNodeRef} type="button" aria-label={`Arrastar ${m.nome}`} {...attributes} {...listeners}>
            <GripVertical size={14} />
          </Alca>
          <Posicao>{indice + 1}</Posicao>
        </AlcaEPosicao>
        {m.publicado ? (
          noCarrossel ? <PageBadge>Carrossel</PageBadge> : <PageBadge $tone="success">Ver todos</PageBadge>
        ) : (
          <PageBadge $tone="muted">Oculto</PageBadge>
        )}
      </CartaoTopo>

      <Pessoa>
        <FotoExMembro id={m.id} nome={m.nome} temFoto={m.tem_foto} versao={m.foto_versao} tamanho={48} />
        <Info>
          <Nome title={m.nome}>{m.nome}</Nome>
          <Sub title={m.cargo_pt}>
            {m.cargo_pt}
            {m.area_pt ? ` · ${m.area_pt}` : ""}
          </Sub>
          <Sub title={m.empresa}>{m.empresa}</Sub>
        </Info>
      </Pessoa>

      <Etiquetas>
        {!m.tem_foto && <PageBadge $tone="warning">Sem foto</PageBadge>}
        {!m.depoimento_pt && <PageBadge $tone="muted">Sem depoimento</PageBadge>}
        {!m.linkedin && <PageBadge $tone="muted">Sem LinkedIn</PageBadge>}
        {!m.cargo_en && <PageBadge $tone="muted">Sem EN</PageBadge>}
      </Etiquetas>

      <Acoes>
        <PageButtonSm type="button" $variant="outline" onClick={onAlternar} disabled={ocupado}>
          {m.publicado ? "Ocultar" : "Publicar"}
        </PageButtonSm>
        <PageButtonSm type="button" $variant="outline" onClick={onEditar} disabled={ocupado}>
          Editar
        </PageButtonSm>
        <PageButtonSm type="button" $variant="ghost" onClick={onApagar} disabled={ocupado} aria-label={`Remover ${m.nome}`}>
          <Trash2 size={14} />
        </PageButtonSm>
      </Acoes>
    </Cartao>
  );
}
