import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { ETAPAS_FICHA, ROTULO_VIA, etapaDaFicha, tomDoStatus, type Ficha, type FichaCompleta } from "@/lib/central";
import { PageBadge } from "@/styles/page.styled";
import {
  Acoes,
  CardCatalogo,
  CardCatalogoCorpo,
  CardCatalogoRodape,
  CardCatalogoTags,
  CardCatalogoTopo,
  Chip,
  Etapa,
  Etapas,
  FichaCard as Card,
  FichaCorpo,
  FichaTituloNormal,
  FichaTopo,
  IconeCat,
  Meta,
  Resumo,
} from "./Central.styled";
import { createElement } from "react";
import { iconeDaCategoria } from "./icones";

/** O ícone da primeira categoria da ficha, no quadrado do card. */
export function IconeCategoria({ ficha, grande = false }: { ficha: Pick<Ficha, "categorias" | "frente_id">; grande?: boolean }) {
  const categoria = ficha.categorias[0];
  return (
    <IconeCat $tom={ficha.frente_id == null ? "neutro" : "primario"} $grande={grande} aria-label={categoria?.nome ?? "Ficha"} title={categoria?.nome}>
      {createElement(iconeDaCategoria(categoria?.icone), { size: grande ? 40 : 28, strokeWidth: 1.75, "aria-hidden": "true" })}
    </IconeCat>
  );
}

/** O card do catálogo (Tool Box): ícone da categoria, título, resumo, chips, rodapé com projeto e usos. */
export function CardToolBox({ ficha }: { ficha: Ficha }) {
  const origem = [ficha.projeto_nome, ficha.cliente, ficha.setor].filter(Boolean).join(" · ") || `Indicada por ${ficha.indicado_por_nome ?? ""}`;
  return (
    <CardCatalogo>
      <CardCatalogoTopo>
        <IconeCategoria ficha={ficha} />
        <CardCatalogoCorpo>
          <h3>
            <Link to={`/central/fichas/${ficha.id}`}>{ficha.titulo}</Link>
          </h3>
          <p>{ficha.em_uma_frase || ficha.por_que_se_destacou}</p>
        </CardCatalogoCorpo>
      </CardCatalogoTopo>
      <CardCatalogoTags>
        {ficha.categorias.map((c) => (
          <Chip key={c.chave}>{c.nome}</Chip>
        ))}
        {ficha.escopo_nome && <Chip style={{ fontWeight: 500 }}>{ficha.escopo_nome}</Chip>}
        {ficha.ferramenta && <Chip style={{ fontWeight: 500 }}>{ficha.ferramenta}</Chip>}
        {ficha.gestao_numero && <Chip style={{ fontWeight: 500 }}>{ficha.gestao_numero}ª gestão</Chip>}
        {ficha.apontada_diagnostico && <Chip $tom="primario">Apontada pelo Diagnóstico</Chip>}
        {ficha.status !== "publicada" && <Chip $tom="atencao">{ficha.status_rotulo}</Chip>}
      </CardCatalogoTags>
      <CardCatalogoRodape>
        <span>{origem}</span>
        {ficha.usos > 0 ? (
          <strong>
            <Check size={14} aria-hidden="true" />
            {ficha.usos} uso{ficha.usos === 1 ? "" : "s"}
          </strong>
        ) : (
          <span>ainda sem usos</span>
        )}
      </CardCatalogoRodape>
    </CardCatalogo>
  );
}

/** A linha do tempo de cinco etapas, com quem está em cada uma. */
export function LinhaDoTempo({ ficha }: { ficha: Ficha | FichaCompleta }) {
  const { indice, devolvida } = etapaDaFicha(ficha.status);
  const legendas: (string | null)[] = [
    ficha.indicado_por_nome,
    ficha.status === "aguardando_gerente" ? "decidindo" : devolvida ? "devolveu" : ficha.decidido_por_nome,
    ficha.status === "com_autores" ? "escrevendo" : ficha.status === "ajustes_pedidos" ? "ajustando" : indice > 2 ? "escreveram" : null,
    ficha.status === "revisao_final" ? "revisando" : ficha.publicado_por_nome,
    ficha.publicado_em ? "publicada" : null,
  ];
  return (
    <Etapas aria-label="Etapas da ficha">
      {ETAPAS_FICHA.map((nome, i) => {
        const estado = devolvida && i === 1 ? "parada" : i < indice ? "feita" : i === indice ? (ficha.status === "publicada" ? "feita" : "atual") : "futura";
        return (
          <Etapa key={nome} $estado={estado}>
            <strong>{nome}</strong>
            <span>{legendas[i] ?? ""}</span>
          </Etapa>
        );
      })}
    </Etapas>
  );
}

/** O card de "Minhas indicações" e das filas: status, linha do tempo, por
 *  que se destacou e as ações que a aba passar. */
export function CardAcompanhamento({ ficha, acoes, filhos }: { ficha: FichaCompleta; acoes?: ReactNode; filhos?: ReactNode }) {
  return (
    <Card>
      <Meta style={{ textTransform: "uppercase", letterSpacing: "0.04em" }}>
        <span>{ficha.categorias.map((c) => c.nome).join(" · ")}</span>
        {ficha.frente_nome && <span>{ficha.frente_nome}</span>}
        {ficha.escopo_nome && <span>{ficha.escopo_nome}</span>}
      </Meta>
      <FichaTopo>
        <IconeCategoria ficha={ficha} />
        <FichaCorpo>
          <FichaTituloNormal>
            <Link to={`/central/fichas/${ficha.id}`}>{ficha.titulo}</Link>
          </FichaTituloNormal>
          <Meta>
            <span>
              {ficha.projeto_nome ?? "Sem projeto"} · indicada {ROTULO_VIA[ficha.indicado_via]} por {ficha.indicado_por_nome}
            </span>
          </Meta>
        </FichaCorpo>
        <PageBadge $tone={tomDoStatus(ficha.status)}>{ficha.status_rotulo}</PageBadge>
      </FichaTopo>
      <LinhaDoTempo ficha={ficha} />
      <div>
        <Meta style={{ textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "0.25rem" }}>
          <span>Por que se destacou</span>
        </Meta>
        <Resumo>{ficha.por_que_se_destacou}</Resumo>
      </div>
      {filhos}
      {acoes && <Acoes style={{ justifyContent: "flex-end" }}>{acoes}</Acoes>}
    </Card>
  );
}
