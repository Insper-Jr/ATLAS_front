import { useState } from "react";
import type { ReactNode } from "react";
import { codigoDoErro } from "@/lib/api";
import { PageButtonSm, ErrorText } from "@/styles/page.styled";
import { FieldInput } from "@/pages/projetos/Projetos.styled";
import {
  AprovacaoAcoes,
  AprovacaoForm,
  AprovacaoFormBotoes,
  AtrasoDias,
  AtrasoDiasRotulo,
  AtrasoDiasTopo,
  AtrasoDot,
  AtrasoCorpo,
  LinhaAprovacao,
  type NivelSeveridade,
} from "./Monitoramento.styled";
import { diaDoValor, diasEntre, ehDiaPuro, hojeEmBrasilia } from "@/lib/fuso";

/**
 * O esqueleto de UM item da fila de Aprovações — as cinco filas usam este.
 *
 * ⭐ **Três colunas, sempre nesta ordem:** há quantos dias espera · o que é ·
 * o que fazer. A régua da esquerda é a mesma nas cinco filas, e é ela que
 * torna a página comparável de relance: um pedido parado há 9 dias e uma
 * banca sem veredito há 9 dias pesam igual, mesmo sendo decisões diferentes.
 *
 * ⚠ **Uma régua de severidade só na tela.** `nivelDaEspera` reusa os mesmos
 * cortes de `nivel()` da aba Atrasos (até 3 · 4 a 10 · mais de 10) em vez de
 * inventar uma segunda. Duas réguas com as MESMAS três cores na mesma página
 * fariam o amarelo significar coisas diferentes em dois cards vizinhos.
 */

/** Dias corridos entre uma data e hoje. Nunca negativo. Instante (UTC) e
 *  data pura viram o dia de Brasília antes da conta: ler o instante sem o
 *  "Z" atrasava a virada do contador em 3h. */
export function diasEsperando(desde: string | null | undefined): number {
  if (!desde) return 0;
  const dia = diaDoValor(desde);
  if (!ehDiaPuro(dia)) return 0;
  return Math.max(0, diasEntre(dia, hojeEmBrasilia()));
}

/** Os mesmos cortes de `nivel()` da AtrasosAba — de propósito. */
export function nivelDaEspera(dias: number): NivelSeveridade {
  if (dias > 10) return "critica";
  if (dias > 3) return "media";
  return "leve";
}

interface Props {
  /** Desde quando espera — a coluna da esquerda conta daqui até hoje. */
  desde?: string | null;
  /**
   * O número da coluna da esquerda, quando ele NÃO é "dias desde uma data".
   *
   * ⚠ A aba Atrasos precisa disto: o número dela é dias úteis (pelo calendário
   * do Insper, descontando pausa), calculado no backend. Recontar aqui a
   * partir da data daria dias corridos e as duas telas divergiriam.
   */
  dias?: number;
  /** A unidade embaixo do número. Padrão: "dias". */
  unidade?: string;
  /** O nome + pílula de estado. */
  titulo: ReactNode;
  /** A linha de fatos e, abaixo, o que a pessoa escreveu. */
  children: ReactNode;
  /** Os botões, ou o formulário quando ele abre. */
  acoes: ReactNode;
}

export function AprovacaoLinha({ desde, dias, unidade, titulo, children, acoes }: Props) {
  const n = dias ?? diasEsperando(desde);
  return (
    <LinhaAprovacao>
      <AtrasoDias>
        <AtrasoDiasTopo>
          <AtrasoDot $nivel={nivelDaEspera(n)} />
          <strong>{n}</strong>
        </AtrasoDiasTopo>
        {/* A unidade é explícita porque o mesmo componente serve a duas
            grandezas: "dias" de espera na fila e "dias além" do vendido. Um
            número sem unidade foi exatamente o defeito da aba Atrasos. */}
        <AtrasoDiasRotulo>{unidade ?? (n === 1 ? "dia" : "dias")}</AtrasoDiasRotulo>
      </AtrasoDias>

      <AtrasoCorpo>
        {titulo}
        {children}
      </AtrasoCorpo>

      <AprovacaoAcoes>{acoes}</AprovacaoAcoes>
    </LinhaAprovacao>
  );
}

/* ------------------------------------------------------------------ */

interface FormProps {
  /** O rótulo do botão que confirma — "Confirmar aprovação", "Liberar"… */
  rotuloConfirmar: string;
  /** `false` quando a decisão não pede texto (aceitar alguém numa vaga). */
  exigeTexto?: boolean;
  /** O que aparece acima do campo quando não há texto a pedir. */
  aviso?: ReactNode;
  onConfirmar: (texto: string) => Promise<void>;
  onCancelar: () => void;
  /**
   * ⭐ A saída oferecida quando a recusa é de um tipo que a diretoria PODE
   * atropelar — mesma ideia do "registrar assim mesmo" da composição de banca.
   *
   * ⚠ Destravada pelo `codigo` da recusa, nunca por um trecho do texto. Foi
   * assim que o botão da composição sumiu sem ninguém perceber: a frase mudou
   * e o `includes` parou de casar, deixando a plataforma recusando sem
   * oferecer saída. Texto é para ler; código é contrato.
   */
  segundaChance?: {
    /** O `codigo` da recusa que faz o botão aparecer. */
    quando: string;
    /** O rótulo do botão — diga o que ele autoriza A MAIS, não só "confirmar". */
    rotulo: string;
    onConfirmar: (texto: string) => Promise<void>;
  };
}

/**
 * O formulário que abre no lugar dos botões.
 *
 * ⭐ **O texto obrigatório fica.** Chegou a existir a ideia de oferecer
 * motivos prontos em chips para acelerar. Ficou de fora: o valor da
 * justificativa nunca foi o texto guardado, foi a batida de dois segundos em
 * que a pessoa formula o porquê. Chip preenche o campo e pula a batida — em
 * três meses o histórico vira carimbo, e o §8 pede o contrário.
 */
export function FormDecisao({
  rotuloConfirmar,
  exigeTexto = true,
  aviso,
  onConfirmar,
  onCancelar,
  segundaChance,
}: FormProps) {
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [codigoRecusa, setCodigoRecusa] = useState<string | undefined>(undefined);

  async function enviar(acao: (texto: string) => Promise<void>) {
    setErro("");
    setCodigoRecusa(undefined);
    setEnviando(true);
    try {
      await acao(texto.trim());
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível concluir");
      setCodigoRecusa(codigoDoErro(err));
      setEnviando(false);
    }
    // No sucesso quem chamou recarrega e este componente some — mexer no
    // estado depois seria atualizar um componente que já morreu.
  }

  const ofereceSegundaChance = Boolean(
    segundaChance && codigoRecusa && codigoRecusa === segundaChance.quando,
  );

  return (
    <AprovacaoForm>
      {aviso}
      {exigeTexto && (
        <FieldInput
          as="textarea"
          rows={3}
          placeholder="Por quê? Fica no histórico."
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          aria-label="Justificativa da decisão"
        />
      )}
      {erro && <ErrorText>{erro}</ErrorText>}
      <AprovacaoFormBotoes>
        {/* ⚠ A segunda chance SUBSTITUI o botão normal em vez de aparecer ao
            lado: repetir o gesto que acabou de falhar só produziria o mesmo
            erro, e dois botões parecidos logo abaixo de uma recusa é onde se
            clica no errado. */}
        {ofereceSegundaChance ? (
          <PageButtonSm
            type="button"
            disabled={enviando || (exigeTexto && !texto.trim())}
            onClick={() => enviar(segundaChance!.onConfirmar)}
          >
            {enviando ? "Enviando…" : segundaChance!.rotulo}
          </PageButtonSm>
        ) : (
          <PageButtonSm
            type="button"
            disabled={enviando || (exigeTexto && !texto.trim())}
            onClick={() => enviar(onConfirmar)}
          >
            {enviando ? "Enviando…" : rotuloConfirmar}
          </PageButtonSm>
        )}
        <PageButtonSm type="button" $variant="ghost" onClick={onCancelar} disabled={enviando}>
          Cancelar
        </PageButtonSm>
      </AprovacaoFormBotoes>
    </AprovacaoForm>
  );
}
