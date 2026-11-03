import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { CODIGO_CHOQUE_DE_HORARIO } from "@/lib/api";
import { decidirRemarcacao } from "@/lib/bancas";
import { formatarData, formatarDataHora } from "@/lib/projetos";
import type { AprovacaoRemarcacao } from "@/lib/monitoramento";
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
  Pilula,
} from "./Monitoramento.styled";
import { AprovacaoLinha, FormDecisao } from "./AprovacaoLinha";

/**
 * ⭐ §13, 2026-09-10: a fila de remarcações de banca, para quem as decide.
 *
 * ⚠ **O atalho que isto fecha.** Remarcar uma banca que já tinha data era
 * livre para quem edita o projeto — bastava justificativa e a data trocava na
 * hora, sem ninguém da diretoria ver. Virou rotina silenciosa (o coordenador
 * do ENSINO remarcou e ninguém aprovou nada). Agora quem conduz o projeto
 * pede aqui, com justificativa, e a diretoria decide — mesmo desenho da fila
 * de bancas fora da janela ao lado.
 *
 * ⭐ **Autorizar REMARCA a banca**, não só libera — a tela diz isso antes do
 * clique, e é por isso que o botão se chama "Autorizar e remarcar". Quem
 * pediu não precisa voltar ao cronograma.
 */
export function RemarcacoesDeBancaCard({
  itens,
  onDecidiu,
}: {
  itens: AprovacaoRemarcacao[];
  onDecidiu: () => void;
}) {
  const { token } = useAuth();
  const [decidindo, setDecidindo] = useState<{ id: number; aprovar: boolean } | null>(null);

  return (
    <PageCard id="fila-remarcacoes-de-banca">
      <PageCardHeader>
        <PageCardTitle>
          Remarcações de banca{itens.length > 0 && ` (${itens.length})`}
        </PageCardTitle>
      </PageCardHeader>
      <PageCardContent>
        {itens.length === 0 ? (
          <EmptyText>Nenhum pedido de remarcação aguardando decisão.</EmptyText>
        ) : (
          <ListaSimples>
            {itens.map((p) => (
              <AprovacaoLinha
                key={p.id}
                desde={p.criado_em}
                titulo={
                  <AtrasoTitulo>
                    <LinkProjeto to={`/projetos/${p.projeto_id}/cronograma`}>
                      {p.projeto_nome}
                      {p.escopo_nome ? ` — ${p.escopo_nome}` : ""}
                    </LinkProjeto>
                    {/* 2026-11-03: a data nova passa da janela do escopo. Dito
                        ANTES do clique, para a aprovação já autorizar o §13 junto
                        em vez de bater na trava da janela com uma mensagem
                        escrita para quem pede, não para quem decide. */}
                    {p.fora_da_janela && p.fim_janela && (
                      <Pilula $tom="alerta">janela até {formatarData(p.fim_janela)}</Pilula>
                    )}
                  </AtrasoTitulo>
                }
                acoes={
                  decidindo?.id === p.id ? (
                    <FormDecisao
                      rotuloConfirmar={
                        decidindo.aprovar
                          ? `${p.fora_da_janela ? "Autorizar fora da janela e remarcar" : "Autorizar e remarcar"} para ${formatarDataHora(p.data_hora_pretendida)}`
                          : "Confirmar recusa"
                      }
                      aviso={
                        decidindo.aprovar ? (
                          <AprovacaoMeta>
                            <span>
                              Confirmar já <strong>remarca a banca</strong> para esta data — quem
                              pediu não precisa voltar ao cronograma, e quem estava escalado é
                              avisado.
                              {p.fora_da_janela && p.fim_janela && (
                                <>
                                  {" "}
                                  A data passa da janela do escopo (até {formatarData(p.fim_janela)}):
                                  autorizar aqui também libera a marcação fora dela, e os dias além da
                                  janela seguem contando como atraso.
                                </>
                              )}
                            </span>
                          </AprovacaoMeta>
                        ) : undefined
                      }
                      onCancelar={() => setDecidindo(null)}
                      onConfirmar={async (texto) => {
                        if (!token) return;
                        await decidirRemarcacao(
                          p.id,
                          {
                            aprovar: decidindo.aprovar,
                            resposta: texto,
                            autorizar_fora_janela: decidindo.aprovar && p.fora_da_janela,
                          },
                          token,
                        );
                        setDecidindo(null);
                        onDecidiu();
                      }}
                      /* Mesmo beco do §8 dentro do §13: a data nova pode
                         esbarrar na banca de outro projeto. A recusa por
                         choque diz com QUAL, e o segundo clique autoriza as
                         duas coisas. */
                      segundaChance={
                        decidindo.aprovar
                          ? {
                              quando: CODIGO_CHOQUE_DE_HORARIO,
                              rotulo: "Autorizar o choque também e remarcar",
                              onConfirmar: async (texto) => {
                                if (!token) return;
                                await decidirRemarcacao(
                                  p.id,
                                  {
                                    aprovar: true,
                                    resposta: texto,
                                    autorizar_choque: true,
                                    autorizar_fora_janela: p.fora_da_janela,
                                  },
                                  token,
                                );
                                setDecidindo(null);
                                onDecidiu();
                              },
                            }
                          : undefined
                      }
                    />
                  ) : (
                    <>
                      <PageButtonSm
                        type="button"
                        $variant="outline"
                        onClick={() => setDecidindo({ id: p.id, aprovar: true })}
                      >
                        Autorizar e remarcar
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
                    de <strong>{formatarDataHora(p.data_hora_anterior)}</strong> para{" "}
                    <strong>{formatarDataHora(p.data_hora_pretendida)}</strong>
                  </span>
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
