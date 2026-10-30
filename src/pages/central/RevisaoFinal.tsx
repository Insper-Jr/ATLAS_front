import { Link } from "react-router-dom";
import { EstadoVazio } from "@/components/EstadoVazio";
import { PageBadge, PageButtonSm, PageCard, PageCardContent, PageCardHeader, PageCardTitle, PageLoadingBlock } from "@/styles/page.styled";
import { FichasLista, Nota } from "./Central.styled";
import { CardAcompanhamento } from "./FichaCard";
import { useCentral } from "./contexto";

/** A fila do diretor: fichas aprovadas pelo gerente e já escritas pelos
 *  autores. Publicar ou pedir ajustes acontece na própria ficha. */
export function RevisaoFinal() {
  const { pendencias } = useCentral();
  if (!pendencias) return <PageLoadingBlock />;
  const fila = pendencias.revisao;

  return (
    <PageCard>
      <PageCardHeader style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <PageCardTitle>Esperando sua decisão</PageCardTitle>
        <PageBadge $tone="muted">{fila.length}</PageBadge>
      </PageCardHeader>
      <PageCardContent>
        <Nota style={{ marginTop: 0, marginBottom: "0.75rem" }}>
          Fichas aprovadas pelo gerente e já escritas pelos autores. Abra cada uma para publicar ou pedir ajustes.
        </Nota>
        {fila.length === 0 ? (
          <EstadoVazio causa="vazio" titulo="Nada esperando você" motivo="Fichas escritas pelos autores aparecem aqui para a revisão final." />
        ) : (
          <FichasLista>
            {fila.map((f) => (
              <CardAcompanhamento
                key={f.id}
                ficha={f}
                acoes={
                  <PageButtonSm as={Link} to={`/central/fichas/${f.id}`} state={{ de: "/central/revisao" }}>
                    Revisar a ficha
                  </PageButtonSm>
                }
              />
            ))}
          </FichasLista>
        )}
      </PageCardContent>
    </PageCard>
  );
}
