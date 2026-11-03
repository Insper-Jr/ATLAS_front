import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { decidirDispensaBanca } from "@/lib/bancas";
import { formatarData } from "@/lib/projetos";
import type { AprovacaoDispensaBanca } from "@/lib/monitoramento";
import {
  PageCard,
  PageCardHeader,
  PageCardTitle,
  PageCardContent,
  PageButtonSm,
  EmptyText,
} from "@/styles/page.styled";
import {
  AprovacaoCitacao,
  AprovacaoMeta,
  AtrasoTitulo,
  LinkProjeto,
  ListaSimples,
} from "./Monitoramento.styled";
import { AprovacaoLinha, FormDecisao } from "./AprovacaoLinha";

/**
 * 2026-11-03, a pedido: a fila de pedidos para entregar um escopo SEM banca.
 *
 * A entrega só libera depois de a banca aprovar. Projetos que terminaram nas
 * férias, ou que entraram na plataforma já prontos, não têm banca, e a saída
 * era marcar uma banca de mentira. Agora o coordenador pede a dispensa aqui,
 * com justificativa, e a diretoria decide. Aprovada, a entrega daquele escopo
 * pode ser marcada e confirmada como qualquer outra.
 */
export function DispensasDeBancaCard({
  itens,
  onDecidiu,
}: {
  itens: AprovacaoDispensaBanca[];
  onDecidiu: () => void;
}) {
  const { token } = useAuth();
  const [decidindo, setDecidindo] = useState<{ id: number; aprovar: boolean } | null>(null);

  return (
    <PageCard id="fila-dispensas-de-banca">
      <PageCardHeader>
        <PageCardTitle>Entregas sem banca{itens.length > 0 && ` (${itens.length})`}</PageCardTitle>
      </PageCardHeader>
      <PageCardContent>
        {itens.length === 0 ? (
          <EmptyText>Nenhum pedido de dispensa de banca aguardando decisão.</EmptyText>
        ) : (
          <ListaSimples>
            {itens.map((p) => (
              <AprovacaoLinha
                key={p.id}
                desde={p.criado_em}
                titulo={
                  <AtrasoTitulo>
                    <LinkProjeto to={`/projetos/${p.projeto_id}`}>
                      {p.projeto_nome}
                      {p.escopo_nome ? ` — ${p.escopo_nome}` : ""}
                    </LinkProjeto>
                  </AtrasoTitulo>
                }
                acoes={
                  decidindo?.id === p.id ? (
                    <FormDecisao
                      rotuloConfirmar={decidindo.aprovar ? "Dispensar a banca" : "Confirmar recusa"}
                      aviso={
                        decidindo.aprovar ? (
                          <AprovacaoMeta>
                            <span>
                              Confirmar libera a <strong>entrega deste escopo sem banca</strong>: o
                              coordenador marca e confirma a entrega como qualquer outra.
                            </span>
                          </AprovacaoMeta>
                        ) : undefined
                      }
                      onCancelar={() => setDecidindo(null)}
                      onConfirmar={async (texto) => {
                        if (!token) return;
                        await decidirDispensaBanca(p.id, { aprovar: decidindo.aprovar, resposta: texto }, token);
                        setDecidindo(null);
                        onDecidiu();
                      }}
                    />
                  ) : (
                    <>
                      <PageButtonSm
                        type="button"
                        $variant="outline"
                        onClick={() => setDecidindo({ id: p.id, aprovar: true })}
                      >
                        Dispensar a banca
                      </PageButtonSm>
                      <PageButtonSm
                        type="button"
                        $variant="ghost"
                        onClick={() => setDecidindo({ id: p.id, aprovar: false })}
                      >
                        Negar
                      </PageButtonSm>
                    </>
                  )
                }
              >
                <AprovacaoMeta>
                  <span>
                    {p.solicitado_por_nome ?? "coordenador"} em {formatarData(p.criado_em)}
                  </span>
                </AprovacaoMeta>
                <AprovacaoCitacao>{p.justificativa}</AprovacaoCitacao>
              </AprovacaoLinha>
            ))}
          </ListaSimples>
        )}
      </PageCardContent>
    </PageCard>
  );
}
