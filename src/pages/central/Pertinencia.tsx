import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { decidirPertinencia, type FichaCompleta } from "@/lib/central";
import { EstadoVazio } from "@/components/EstadoVazio";
import { ErrorText, PageBadge, PageButtonSm, PageCard, PageCardContent, PageCardHeader, PageCardTitle, PageLoadingBlock } from "@/styles/page.styled";
import { FieldTextarea } from "@/pages/Bancas.styled";
import { Acoes, FichasLista, Nota } from "./Central.styled";
import { CardAcompanhamento } from "./FichaCard";
import { useCentral } from "./contexto";

/**
 * A fila do gerente: indicações de coordenadores, bancas e membros da frente
 * dele. Decide só a pertinência; o texto é revisado depois pelo diretor.
 */
export function Pertinencia() {
  const { token } = useAuth();
  const { pendencias, recarregarPendencias } = useCentral();
  const [erro, setErro] = useState("");
  const [devolvendo, setDevolvendo] = useState<number | null>(null);
  const [motivo, setMotivo] = useState("");
  const [salvando, setSalvando] = useState<number | null>(null);

  if (!pendencias) return <PageLoadingBlock />;
  const fila = pendencias.pertinencia;

  async function decidir(ficha: FichaCompleta, aprovar: boolean) {
    if (!token) return;
    if (!aprovar && motivo.trim().length < 3) {
      setErro("Diga em uma linha por que não vale uma ficha.");
      return;
    }
    setErro("");
    setSalvando(ficha.id);
    try {
      await decidirPertinencia(ficha.id, aprovar, aprovar ? null : motivo.trim(), token);
      setDevolvendo(null);
      setMotivo("");
      await recarregarPendencias();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível decidir");
    } finally {
      setSalvando(null);
    }
  }

  return (
    <PageCard>
      <PageCardHeader style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <PageCardTitle>Esperando sua decisão</PageCardTitle>
        <PageBadge $tone="muted">{fila.length}</PageBadge>
      </PageCardHeader>
      <PageCardContent>
        <Nota style={{ marginTop: 0, marginBottom: "0.75rem" }}>
          Indicações de coordenadores, bancas e membros. Decida se vale ter uma ficha; o texto é revisado depois pelo
          diretor.
        </Nota>
        {erro && <ErrorText>{erro}</ErrorText>}
        {fila.length === 0 ? (
          <EstadoVazio causa="vazio" titulo="Nada esperando você" motivo="As indicações da sua frente aparecem aqui assim que chegam." />
        ) : (
          <FichasLista>
            {fila.map((f) => (
              <CardAcompanhamento
                key={f.id}
                ficha={f}
                filhos={
                  devolvendo === f.id ? (
                    <FieldTextarea
                      autoFocus
                      rows={2}
                      value={motivo}
                      onChange={(e) => setMotivo(e.target.value)}
                      placeholder="Por que não vale uma ficha (vai para quem indicou)"
                    />
                  ) : null
                }
                acoes={
                  <Acoes>
                    <span style={{ fontSize: "0.75rem", color: "var(--atlas-muted-foreground)" }}>
                      Decida só a pertinência. O texto da ficha é revisado depois pelo diretor.
                    </span>
                    {devolvendo === f.id ? (
                      <>
                        <PageButtonSm type="button" $variant="ghost" onClick={() => setDevolvendo(null)}>
                          Cancelar
                        </PageButtonSm>
                        <PageButtonSm type="button" $variant="outline" disabled={salvando === f.id} onClick={() => decidir(f, false)}>
                          Confirmar devolução
                        </PageButtonSm>
                      </>
                    ) : (
                      <>
                        <PageButtonSm
                          type="button"
                          $variant="outline"
                          disabled={salvando === f.id}
                          onClick={() => {
                            setDevolvendo(f.id);
                            setMotivo("");
                          }}
                        >
                          Não vale uma ficha
                        </PageButtonSm>
                        <PageButtonSm type="button" disabled={salvando === f.id} onClick={() => decidir(f, true)}>
                          Vale ter uma ficha
                        </PageButtonSm>
                      </>
                    )}
                  </Acoes>
                }
              />
            ))}
          </FichasLista>
        )}
      </PageCardContent>
    </PageCard>
  );
}
