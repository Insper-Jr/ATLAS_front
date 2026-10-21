import { chaveData } from "@/components/calendario/semanas";
import type { CronogramaResposta } from "@/types/cronograma";
import { COR_AMBIENTACAO, COR_PAUSA, ROTULOS_MARCO } from "./cores";
import type { DiaNaoUtil, EtapaPintavel, FaixaDerivada, MarcoRenderizavel } from "./PaintedCalendar";
import { diaDoValor } from "@/lib/fuso";

export interface CronogramaGeralDerivado {
  etapas: EtapaPintavel[];
  marcos: MarcoRenderizavel[];
  faixas: FaixaDerivada[];
  diasNaoUteis: Map<string, DiaNaoUtil>;
}

/**
 * A derivação do modo "Geral", todos os escopos do projeto juntos.
 *
 * Extraída de `ProjetoCronograma.tsx` (que também usa, quando `modoGeral` é
 * true) para o mini-calendário do board macro de cronogramas não
 * duplicar as mesmas ~60 linhas: as duas telas leem `escopo.banca`,
 * `data_entrega_real ?? data_entrega_planejada` e `projeto.data_kickoff` do
 * mesmo jeito, e precisam continuar concordando se essa regra mudar.
 *
 * Função pura: sem estado de edição (rascunhos, pincel), quem chama é
 * sempre leitura.
 */
export function derivarCronogramaGeral(dados: CronogramaResposta): CronogramaGeralDerivado {
  const frentesVisiveis = new Set(dados.escopos.map((e) => e.frente_id));

  const fimDeSemana = new Map<string, DiaNaoUtil>();
  const fim = new Date(`${dados.janela.fim.slice(0, 10)}T12:00:00`);
  const cursor = new Date(`${dados.janela.inicio.slice(0, 10)}T12:00:00`);
  while (cursor <= fim) {
    if (cursor.getDay() === 0 || cursor.getDay() === 6) {
      fimDeSemana.set(chaveData(cursor), { tipo: "fim_de_semana", descricao: null });
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  const diasNaoUteis = new Map(fimDeSemana);
  for (const dia of dados.dias_nao_uteis) {
    if (dia.frente_id !== null && !frentesVisiveis.has(dia.frente_id)) continue;
    diasNaoUteis.set(dia.data.slice(0, 10), { tipo: dia.tipo, descricao: dia.descricao });
  }

  const marcos: MarcoRenderizavel[] = [];
  if (dados.data_kickoff) {
    marcos.push({
      data: dados.data_kickoff.slice(0, 10),
      tipo: "kickoff",
      rotulo: ROTULOS_MARCO.kickoff,
      titulo: "Kickoff",
    });
  }
  for (const e of dados.escopos) {
    if (e.banca?.data_hora) {
      marcos.push({
        data: diaDoValor(e.banca.data_hora),
        tipo: "banca",
        rotulo: ROTULOS_MARCO.banca,
        titulo: `Banca de ${e.nome}`,
      });
    }
    const entrega = e.data_entrega_real ?? e.data_entrega_planejada;
    if (entrega) {
      marcos.push({
        data: entrega.slice(0, 10),
        tipo: "entrega",
        rotulo: ROTULOS_MARCO.entrega,
        titulo: `Entrega de ${e.nome}`,
      });
    }
  }
  for (const m of dados.marcos) {
    marcos.push({
      data: m.data.slice(0, 10),
      tipo: m.tipo,
      rotulo: ROTULOS_MARCO[m.tipo],
      titulo: m.nota ?? ROTULOS_MARCO[m.tipo],
    });
  }

  const faixas: FaixaDerivada[] = dados.faixas_derivadas.map((f) => ({
    ...f,
    inicio: f.inicio.slice(0, 10),
    fim: f.fim.slice(0, 10),
    cor: f.tipo === "ambientacao" ? COR_AMBIENTACAO : COR_PAUSA,
  }));

  const etapas: EtapaPintavel[] = dados.escopos.flatMap((e) =>
    (e.etapas ?? []).map((etapa) => ({
      ...etapa,
      grupo: `${e.id}|${etapa.nome}|${etapa.cor}`,
    })),
  );

  return { etapas, marcos, faixas, diasNaoUteis };
}
