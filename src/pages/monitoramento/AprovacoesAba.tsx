import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getAprovacoes, type Aprovacoes } from "@/lib/monitoramento";
import { AtrasosSemJustificativaCard } from "./AtrasosSemJustificativaCard";
import { BancasForaDaJanelaCard } from "./BancasForaDaJanelaCard";
import { BancasSemResultadoCard } from "./BancasSemResultadoCard";
import { DispensasDeBancaCard } from "./DispensasDeBancaCard";
import { EntradasEmBancaCard } from "./EntradasEmBancaCard";
import { EntradasEmProjetoCard } from "./EntradasEmProjetoCard";
import { ExcecoesDeChoqueCard } from "./ExcecoesDeChoqueCard";
import { PedidosDeDiasCard } from "./PedidosDeDiasCard";
import { RemarcacoesDeBancaCard } from "./RemarcacoesDeBancaCard";
import {
  PageStack,
  PageButton,
  PageLoadingBlock,
  ErrorBlock,
  ErrorText,
  EmptyText,
} from "@/styles/page.styled";
import { FaixaResumo, ResumoItem, ResumoRotulo, ResumoValor } from "./Monitoramento.styled";

/** Pra "voltar" do projeto cair de novo aqui, não em `/projetos` — mesmo
 *  padrão de `AtrasosAba.tsx`. */
const VOLTAR_PARA_AQUI = { voltarPara: "/monitoramento/aprovacoes", voltarRotulo: "Voltar para Aprovações" };

/**
 * A fila da diretoria, tudo que espera decisão dela, num lugar só.
 *
 * O problema que esta aba resolve não é de dado, é de descoberta. As decisões
 * estavam espalhadas: o pedido de dias num card da Visão geral e a
 * justificativa de atraso dentro da aba Atrasos. Fila que ninguém sabe que
 * existe é fila parada.
 *
 * **Nem toda ação restrita à diretoria é uma aprovação.** Criar formulário,
 * configurar coluna do kanban e excluir usuário também são só dela, e nenhuma
 * entra aqui: são coisas que ela FAZ quando quer, não coisas que esperam por
 * ela. O critério é ter alguém do outro lado bloqueado enquanto não houver
 * resposta.
 *
 * ⭐ **As oito filas aparecem sempre, mesmo vazias.** Uma tela que só surge
 * quando há problema não ensina o que ela cobre.
 *
 * ⭐ **As oito decidem AQUI.** A maioria mandava a pessoa para outra tela — o
 * projeto, Vagas, Bancas — com o argumento de que decidir sem contexto é
 * decidir no escuro. O argumento estava certo e a conclusão errada: o
 * caminho não era exportar a decisão, era importar o contexto. Cada linha
 * agora carrega o que a pessoa iria ver do outro lado (a urna da banca, a
 * carga de quem pediu, o motivo do atraso com escopo e dias).
 *
 * ⚠ **A ordem dos cards é por custo de ficar parado**, não alfabética nem
 * histórica. Choque de horário, banca fora da janela e remarcação de banca
 * vêm primeiro porque são os que APODRECEM: passada a data pretendida, a
 * decisão não destrava mais nada.
 */
export function AprovacoesAba() {
  const { token } = useAuth();
  const [dados, setDados] = useState<Aprovacoes | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const carregar = useCallback(async () => {
    if (!token) return;
    setErro("");
    try {
      setDados(await getAprovacoes(token));
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao carregar as aprovações");
    } finally {
      setCarregando(false);
    }
  }, [token]);

  useEffect(() => {
    setCarregando(true);
    carregar();
  }, [carregar]);

  if (erro) {
    return (
      <ErrorBlock>
        <ErrorText>{erro}</ErrorText>
        <PageButton $variant="outline" onClick={carregar}>
          Tentar novamente
        </PageButton>
      </ErrorBlock>
    );
  }

  if (carregando || !dados) return <PageLoadingBlock />;

  // Na ordem em que os cards aparecem — a faixa é o índice da página.
  const filas = [
    { rotulo: "Choques de horário", n: dados.excecoes_de_choque.length, id: "fila-choque" },
    { rotulo: "Bancas fora da janela", n: dados.bancas_fora_da_janela.length, id: "fila-fora-da-janela" },
    { rotulo: "Remarcações de banca", n: dados.remarcacoes_de_banca.length, id: "fila-remarcacoes-de-banca" },
    { rotulo: "Entregas sem banca", n: dados.dispensas_de_banca.length, id: "fila-dispensas-de-banca" },
    { rotulo: "Dias de ajuste", n: dados.dias_de_ajuste.length, id: "fila-dias" },
    { rotulo: "Bancas sem veredito", n: dados.bancas_sem_resultado.length, id: "fila-bancas" },
    { rotulo: "Pedidos de entrada", n: dados.solicitacoes_de_entrada.length, id: "fila-entradas" },
    { rotulo: "Entradas em banca", n: dados.entradas_em_banca.length, id: "fila-entradas-em-banca" },
    { rotulo: "Atrasos sem porquê", n: dados.atrasos_sem_justificativa.length, id: "fila-atrasos" },
  ];

  return (
    <PageStack>
      {/* ⭐ "Quantos, sem rolar". A página tem oito cards e cresce com a fila;
          sem a faixa, saber se há algo esperando exigia percorrer a tela
          inteira. Os números ficam NEUTROS de propósito — a mesma decisão da
          aba Atrasos: contagem é volume, não gravidade, e tingi-la faria a
          cor competir com a régua de severidade que vive dentro dos cards. */}
      <FaixaResumo>
        {filas.map((f) => (
          <ResumoItem key={f.id}>
            <ResumoValor>
              <a href={`#${f.id}`}>{f.n}</a>
            </ResumoValor>
            <ResumoRotulo>{f.rotulo}</ResumoRotulo>
          </ResumoItem>
        ))}
      </FaixaResumo>

      {dados.total === 0 && (
        <EmptyText>Nada esperando por você. As nove filas estão limpas.</EmptyText>
      )}

      <ExcecoesDeChoqueCard itens={dados.excecoes_de_choque} onDecidiu={carregar} />
      <BancasForaDaJanelaCard itens={dados.bancas_fora_da_janela} onDecidiu={carregar} />
      <RemarcacoesDeBancaCard itens={dados.remarcacoes_de_banca} onDecidiu={carregar} />
      <DispensasDeBancaCard itens={dados.dispensas_de_banca} onDecidiu={carregar} />
      <PedidosDeDiasCard
        itens={dados.dias_de_ajuste}
        onDecidiu={carregar}
        voltarPara={VOLTAR_PARA_AQUI.voltarPara}
        voltarRotulo={VOLTAR_PARA_AQUI.voltarRotulo}
      />
      <BancasSemResultadoCard itens={dados.bancas_sem_resultado} onDecidiu={carregar} />
      <EntradasEmProjetoCard itens={dados.solicitacoes_de_entrada} onDecidiu={carregar} />
      <EntradasEmBancaCard itens={dados.entradas_em_banca} onDecidiu={carregar} />
      <AtrasosSemJustificativaCard
        itens={dados.atrasos_sem_justificativa}
        onDecidiu={carregar}
        voltarPara={VOLTAR_PARA_AQUI.voltarPara}
        voltarRotulo={VOLTAR_PARA_AQUI.voltarRotulo}
      />

      {/* Havia aqui um card "Entregas sem classificação": as entregas
          atrasadas ainda não marcadas como atraso interno ou por agenda do
          cliente. Saiu em 2026-08-12 junto com o que lhe dava sentido, o
          atraso de ENTREGA deixou de ser insight, e com ele a métrica que
          separava os dois tipos. */}
    </PageStack>
  );
}
