import type { EscopoVendido, ProjetoCompleto } from "@/types/projeto";
import { diaDoValor, diasEntre, hojeEmBrasilia } from "@/lib/fuso";

/**
 * ⭐ **O que está pendente no projeto** — a lista que a Visão geral existe
 * para responder.
 *
 * ⚠ **Por que uma função pura, fora do React.** A regra do que conta como
 * pendência é a parte que vai mudar: o núcleo vai querer acrescentar caso,
 * afrouxar prazo, mudar quem resolve. Misturada ao JSX de uma tela de mil
 * linhas, cada mudança dessas viraria arqueologia.
 *
 * 📐 **Nada aqui é inventado.** Toda pendência sai de campo que o
 * `/projetos/{id}` já devolve — vários deles (`fim_janela`,
 * `reajuste_pendente`, `entrega_liberada`, `estourou`) nunca tinham sido
 * renderizados em lugar nenhum da plataforma.
 *
 * ⚠ **A lista é do PROJETO, não da pessoa** (decisão do núcleo, 13/08/2026: a
 * tela é igual para todos). Por isso cada item diz de quem ele é, em vez de
 * sumir para quem não pode agir: um consultor que lê "diretoria" aprende o
 * estado do projeto, e é a mesma palavra que cobra o diretor.
 */

/** Quem destrava. Não é permissão — é a quem cobrar. */
export type DonoDaPendencia = "coordenação" | "diretoria" | "avaliadores";

/**
 * A urgência, e é ela que ordena a lista.
 *
 * - `travado`  — o projeto não anda enquanto isto não for resolvido;
 * - `atencao`  — anda, mas o prazo corre contra;
 * - `espera`   — depende de outra pessoa; quem olha só precisa saber que está lá.
 */
export type GravidadePendencia = "travado" | "atencao" | "espera";

export interface Pendencia {
  /** Estável, para `key` de lista e telemetria futura. */
  id: string;
  /**
   * ⭐ **O que falta, em duas ou três palavras.** É a coluna que a pessoa
   * varre, e ela só funciona se todos os rótulos couberem no mesmo formato:
   * "Reunião inicial", "Banca sem data", "Entrega pendente".
   */
  acao: string;
  /** Onde: o nome do escopo. Vazio quando a pendência é do projeto inteiro. */
  onde: string;
  /** A data ou o número que importa, já curto ("28/08", "+3d"). */
  prazo?: string;
  /** O prazo já passou — pinta de vermelho. */
  vencido?: boolean;
  /**
   * A frase inteira, para o tooltip.
   *
   * 📐 A explicação não cabe na linha, mas não pode sumir: quem vê "Banca sem
   * data" pela primeira vez precisa poder descobrir por que aquilo trava algo.
   */
  explicacao: string;
  dono: DonoDaPendencia;
  gravidade: GravidadePendencia;
  /** Para onde o clique leva. A rota é montada por quem renderiza. */
  aba: "cronograma" | "banca" | "visao-geral";
  /**
   * ⭐ **O atalho**: chega no Cronograma com o modo de marcação já ligado e o
   * escopo já escolhido, faltando só clicar no dia.
   *
   * Sem ele o link cumpria metade do trabalho — levava à aba certa e largava a
   * pessoa ali, tendo que refazer à mão as duas escolhas que esta lista já
   * sabia (qual escopo, o que marcar). Vira `?marcar=…&escopo=…`, lido em
   * `ProjetoCronograma`.
   *
   * Só existe onde a marcação é REALMENTE o próximo passo. Nada de apontar
   * para `banca` num escopo sem reunião inicial: o backend recusa (§20.4, sem
   * janela não há banca), e o atalho terminaria num erro.
   */
  marcar?: { modo: "reuniao_inicial" | "banca"; escopoId: number };
}

const ORDEM: Record<GravidadePendencia, number> = { travado: 0, atencao: 1, espera: 2 };

/** "2026-08-28" → "28/08". O ano é ruído dentro de um semestre só. Instante
 *  (a hora da banca, em UTC) vira o dia de Brasília antes do corte. */
function curta(iso: string | null): string {
  if (!iso) return "";
  const dia = diaDoValor(iso);
  return `${dia.slice(8, 10)}/${dia.slice(5, 7)}`;
}

/** Dias corridos até a data, contados em Brasília. Negativo = já passou. */
function diasAte(iso: string | null): number | null {
  if (!iso) return null;
  return diasEntre(hojeEmBrasilia(), diaDoValor(iso));
}

function plural(n: number, um: string, muitos: string): string {
  return `${n} ${n === 1 ? um : muitos}`;
}

/**
 * As pendências de UM escopo.
 *
 * 📐 A ordem das checagens é a do §6 — reunião inicial → banca → resultado →
 * entrega — e ela **para na primeira que falta**. Um escopo sem reunião
 * inicial também não tem banca marcada, mas listar as duas seria ruído: a
 * segunda é consequência da primeira, e só resolver a primeira destrava.
 */
function doEscopo(escopo: EscopoVendido, silenciarBancaSemData = false): Pendencia[] {
  const chave = `escopo-${escopo.id}`;
  const nome = escopo.nome;

  // Escopo fora de jogo não tem o que cobrar.
  if (escopo.status === "cancelado" || escopo.data_entrega_real) return [];

  // 1 · A largada. Sem ela não existe janela, e nada mais do escopo anda.
  if (!escopo.data_inicio) {
    return [
      {
        id: `${chave}-sem-reuniao`,
        acao: "Reunião inicial",
        onde: nome,
        explicacao:
          "É a reunião inicial que abre a janela de dias vendidos. Sem ela não dá para pintar etapas nem marcar a banca deste escopo.",
        dono: "coordenação",
        gravidade: "travado",
        aba: "cronograma",
        marcar: { modo: "reuniao_inicial", escopoId: escopo.id },
      },
    ];
  }

  const lista: Pendencia[] = [];

  if (!escopo.banca?.data_hora) {
    // `silenciarBancaSemData`: o prazo do §5.3 já está cobrado no item do
    // PROJETO, que vale por todos os escopos de uma vez. Repetir aqui daria
    // três linhas dizendo a mesma coisa num projeto de dois escopos — o mesmo
    // motivo pelo qual a reunião inicial silencia a banca logo acima.
    if (!silenciarBancaSemData) {
      const faltam = diasAte(escopo.fim_janela);
      const venceu = faltam !== null && faltam < 0;
      lista.push({
        id: `${chave}-banca-sem-data`,
        acao: "Banca sem data",
        onde: nome,
        prazo: curta(escopo.fim_janela),
        vencido: venceu,
        explicacao: venceu
          ? `A janela do escopo fechou em ${curta(escopo.fim_janela)}. Marcar a banca fora dela é decisão da diretoria.`
          : `A banca precisa caber na janela do escopo, que fecha em ${curta(escopo.fim_janela)}${
              faltam !== null ? ` — faltam ${plural(faltam, "dia", "dias")}` : ""
            }.`,
        dono: "coordenação",
        gravidade: venceu ? "travado" : "atencao",
        aba: "cronograma",
        // Seguro: chegar aqui já garante `data_inicio`, e portanto janela aberta.
        marcar: { modo: "banca", escopoId: escopo.id },
      });
    }
  } else if (!escopo.banca.realizado_em && (diasAte(escopo.banca.data_hora) ?? 1) < 0) {
    // Passou a data e ninguém registrou: a banca fica "atrasada" para sempre,
    // e o §7.4 mede o atraso do projeto exatamente por isso.
    lista.push({
      id: `${chave}-banca-nao-registrada`,
      acao: "Registrar banca",
      onde: nome,
      prazo: curta(escopo.banca.data_hora),
      vencido: true,
      explicacao: `A banca era em ${curta(escopo.banca.data_hora)} e ninguém registrou que ela aconteceu. Enquanto isso, ela conta como atrasada — e o projeto junto.`,
      dono: "coordenação",
      gravidade: "travado",
      aba: "banca",
    });
  } else if (escopo.banca.realizado_em && !escopo.banca.resultado) {
    // É o resultado que libera a entrega ao cliente (§5.5).
    lista.push({
      id: `${chave}-banca-sem-resultado`,
      acao: "Resultado da banca",
      onde: nome,
      explicacao:
        "A banca aconteceu e ainda não tem veredito. É o resultado que libera a entrega ao cliente — se ninguém votou, a diretoria registra à mão.",
      dono: "avaliadores",
      gravidade: "espera",
      aba: "banca",
    });
  }

  if (escopo.entrega_liberada && !escopo.data_entrega_real) {
    lista.push({
      id: `${chave}-entrega-liberada`,
      acao: "Entrega pendente",
      onde: nome,
      explicacao:
        "A banca aprovou este escopo e a entrega ao cliente ainda não foi registrada. O trabalho está pronto e parado.",
      dono: "coordenação",
      gravidade: "atencao",
      aba: "cronograma",
    });
  }

  if (escopo.estourou && !escopo.justificativa_atraso) {
    lista.push({
      id: `${chave}-atraso-sem-justificativa`,
      acao: "Justificar atraso",
      onde: nome,
      prazo: `+${Math.abs(escopo.atraso)}d`,
      vencido: true,
      explicacao: `O escopo passou ${plural(Math.abs(escopo.atraso), "dia útil", "dias úteis")} da janela. Sem o motivo registrado, o atraso pesa contra o time no monitoramento.`,
      dono: "coordenação",
      gravidade: "atencao",
      aba: "visao-geral",
    });
  }

  if (escopo.reajuste_pendente) {
    lista.push({
      id: `${chave}-pedido-dias`,
      acao: "Pedido de dias",
      onde: nome,
      prazo: `+${escopo.reajuste_pendente.dias_solicitados}d`,
      explicacao: `Há um pedido de ${plural(escopo.reajuste_pendente.dias_solicitados, "dia útil", "dias úteis")} esperando decisão da diretoria. Enquanto não for respondido, a janela do escopo não muda.`,
      dono: "diretoria",
      gravidade: "espera",
      aba: "cronograma",
    });
  }

  return lista;
}

/**
 * Tudo o que está pendente, do que trava ao que só espera.
 *
 * 📐 Ordena por gravidade e, dentro dela, mantém a ordem dos escopos — que é a
 * ordem em que foram vendidos. Reordenar por data faria a lista dançar a cada
 * carregamento, e a pessoa perderia a posição do item que estava lendo.
 */
export function derivarPendencias(projeto: ProjetoCompleto): Pendencia[] {
  const lista: Pendencia[] = [];

  // Não no projeto do atalho (2026-10-14): lá o kickoff é opcional.
  if (!projeto.data_kickoff && projeto.status !== "finalizado" && !projeto.criado_pelo_atalho) {
    lista.push({
      id: "projeto-sem-kickoff",
      acao: "Kickoff",
      onde: "",
      explicacao:
        "O kickoff ainda não foi marcado. É dele que a ambientação conta, e sem ele o projeto não sai de “vendido”.",
      dono: "coordenação",
      gravidade: "travado",
      aba: "cronograma",
    });
  }

  if (projeto.equipe.filter((m) => m.papel === "coordenador").length === 0) {
    lista.push({
      id: "projeto-sem-coordenador",
      acao: "Sem coordenador",
      onde: "",
      explicacao: "O projeto não tem coordenador. Sem um, a plataforma recusa marcar banca.",
      dono: "diretoria",
      gravidade: "travado",
      aba: "visao-geral",
    });
  }

  /**
   * ⭐ **§5.3: a banca é cravada no fim da ambientação.**
   *
   * *"Ao fim da ambientação, o coordenador crava o cronograma oficial do escopo
   * e a data e horário da banca."* É o mesmo alerta que o Monitoramento mostra
   * em "Atenção agora" (`ambientacao_sem_banca`, no backend) — aqui ele chega
   * ao lugar onde dá para resolver.
   *
   * ⚠ **Do PROJETO, não de cada escopo.** O prazo do §5.3 é um só: marcar a
   * primeira banca já o cumpre. Por isso a condição é "nenhum escopo vivo tem
   * banca" — e por isso ela silencia os "Banca sem data" de cada escopo
   * enquanto está de pé, que diriam a mesma coisa N vezes.
   *
   * ⏱ `<= 0` é hoje >= fim: o alerta nasce NO último dia da ambientação, que é
   * o dia de cravar — esperar o seguinte avisaria com o prazo já vencido.
   */
  const vivos = projeto.escopos.filter((e) => e.status !== "cancelado");
  const semBancaAlguma = vivos.every((e) => !e.banca?.data_hora);
  const cobrarBancaDaAmbientacao =
    projeto.status !== "finalizado" &&
    vivos.length > 0 &&
    semBancaAlguma &&
    (diasAte(projeto.fim_ambientacao) ?? 1) <= 0;

  if (cobrarBancaDaAmbientacao) {
    // ⚠ **A banca precisa de uma janela aberta** (§20.4): a plataforma recusa a
    // data enquanto o escopo não tiver reunião inicial. Então o atalho aponta
    // para a banca quando já existe escopo iniciado, e para a reunião inicial
    // quando não existe — que é literalmente o próximo clique possível. Mandar
    // para "banca" nesse caso daria um erro na cara de quem clicou.
    const pronto = vivos.find((e) => e.data_inicio);
    const alvo = pronto ?? vivos[0];
    const fim = curta(projeto.fim_ambientacao);
    lista.push({
      id: "projeto-ambientacao-sem-banca",
      acao: "Banca não marcada",
      onde: alvo.nome,
      prazo: fim,
      vencido: true,
      explicacao: pronto
        ? `A ambientação terminou em ${fim} e o projeto ainda não tem nenhuma banca marcada — é no fim dela que a data e o horário são cravados.`
        : `A ambientação terminou em ${fim} e o projeto ainda não tem nenhuma banca marcada. Antes vem a reunião inicial de “${alvo.nome}”: é ela que abre a janela em que a banca cabe, e sem janela a plataforma recusa a data.`,
      dono: "coordenação",
      gravidade: "travado",
      aba: "cronograma",
      marcar: { modo: pronto ? "banca" : "reuniao_inicial", escopoId: alvo.id },
    });
  }

  for (const escopo of projeto.escopos) {
    lista.push(...doEscopo(escopo, cobrarBancaDaAmbientacao));
  }

  return lista.sort((a, b) => ORDEM[a.gravidade] - ORDEM[b.gravidade]);
}
