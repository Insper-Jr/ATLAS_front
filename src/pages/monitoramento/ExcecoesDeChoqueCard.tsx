import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { decidirExcecaoChoque } from "@/lib/bancas";
import { formatarData, formatarDataHora } from "@/lib/projetos";
import type { AprovacaoExcecaoChoque } from "@/lib/monitoramento";
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
import { diaDoValor, diasEntre, hojeEmBrasilia, paraDataUtc } from "@/lib/fuso";

/**
 * ⭐ §8: a fila de exceções de choque de horário, para quem as decide.
 *
 * ⚠ **A regra existia sem via de cumprimento.** O backend recusa duas bancas
 * no mesmo horário dizendo que a exceção é da diretoria — e não havia como
 * pedi-la nem como concedê-la. Quem esbarrava no choque só podia mudar o
 * horário ou resolver por fora do sistema.
 *
 * ⭐ **É a fila que APODRECE.** As outras quatro só acumulam; esta tem uma
 * data marcada, e passado o horário pretendido a decisão vira lixo — o pedido
 * não tem mais o que liberar. Por isso é o primeiro card da aba, e por isso a
 * pílula avisa quando o horário já passou em vez de mostrar a data crua.
 *
 * A resposta é obrigatória nos dois sentidos: recusar sem motivo deixa quem
 * pediu sem saber o que mudar, e aprovar sem motivo apaga por que a regra foi
 * aberta naquele caso.
 */
export function ExcecoesDeChoqueCard({
  itens,
  onDecidiu,
}: {
  itens: AprovacaoExcecaoChoque[];
  onDecidiu: () => void;
}) {
  const { token } = useAuth();
  const [decidindo, setDecidindo] = useState<{ id: number; aprovar: boolean } | null>(null);

  return (
    <PageCard id="fila-choque">
      <PageCardHeader>
        <PageCardTitle>
          Exceções de choque de horário{itens.length > 0 && ` (${itens.length})`}
        </PageCardTitle>
      </PageCardHeader>
      <PageCardContent>
        {itens.length === 0 ? (
          <EmptyText>Nenhum pedido de exceção aguardando decisão.</EmptyText>
        ) : (
          <ListaSimples>
            {itens.map((p) => {
              const quando = paraDataUtc(p.data_hora_pretendida);
              const jaPassou = quando.getTime() < Date.now();
              // Dias de calendário em Brasília: "é amanhã" é o dia daqui.
              const faltamDias = diasEntre(hojeEmBrasilia(), diaDoValor(p.data_hora_pretendida));
              return (
                <AprovacaoLinha
                  key={p.id}
                  desde={p.criado_em}
                  titulo={
                    <AtrasoTitulo>
                      <LinkProjeto to={`/projetos/${p.projeto_id}/cronograma`}>
                        {p.projeto_nome}
                        {p.escopo_nome ? ` — ${p.escopo_nome}` : ""}
                      </LinkProjeto>
                      {jaPassou ? (
                        <Pilula $tom="alerta">o horário já passou</Pilula>
                      ) : faltamDias <= 2 ? (
                        <Pilula $tom="atencao">
                          {faltamDias <= 1 ? "é amanhã" : `daqui a ${faltamDias} dias`}
                        </Pilula>
                      ) : (
                        <Pilula $tom="neutro">{formatarDataHora(p.data_hora_pretendida)}</Pilula>
                      )}
                    </AtrasoTitulo>
                  }
                  acoes={
                    decidindo?.id === p.id ? (
                      <FormDecisao
                        rotuloConfirmar={decidindo.aprovar ? "Confirmar liberação" : "Confirmar recusa"}
                        onCancelar={() => setDecidindo(null)}
                        onConfirmar={async (texto) => {
                          if (!token) return;
                          await decidirExcecaoChoque(p.id, { aprovar: decidindo.aprovar, resposta: texto }, token);
                          setDecidindo(null);
                          onDecidiu();
                        }}
                      />
                    ) : jaPassou ? (
                      // Liberar um horário que já passou não destrava nada.
                      <PageButtonSm
                        type="button"
                        $variant="ghost"
                        onClick={() => setDecidindo({ id: p.id, aprovar: false })}
                      >
                        Encerrar pedido
                      </PageButtonSm>
                    ) : (
                      <>
                        <PageButtonSm
                          type="button"
                          $variant="outline"
                          onClick={() => setDecidindo({ id: p.id, aprovar: true })}
                        >
                          Liberar
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
                      quer <strong>{formatarDataHora(p.data_hora_pretendida)}</strong>
                    </span>
                    <span>
                      choca com <strong>{p.conflita_com ?? "outra banca"}</strong>
                    </span>
                    <span>
                      {p.solicitado_por_nome ?? "coordenador"} em {formatarData(p.criado_em)}
                    </span>
                  </AprovacaoMeta>

                  <AprovacaoCitacao>{p.justificativa}</AprovacaoCitacao>
                </AprovacaoLinha>
              );
            })}
          </ListaSimples>
        )}
      </PageCardContent>
    </PageCard>
  );
}
