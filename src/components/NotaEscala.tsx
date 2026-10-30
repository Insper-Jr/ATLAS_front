import type { ReactNode } from "react";
import {
  NotaBotao,
  NotaBotoesRow,
  NotaItem,
  NotaLabel,
  NotaLista,
  NotaSecao,
  NotaTitulo,
} from "./NotaEscala.styled";

/** Escala fechada: 1 a 5, inteiros, sem nota parcial. */
export const NOTA_VALORES = [1, 2, 3, 4, 5] as const;

/** "Não se aplica" (2026-10-30, a pedido): conta como respondido, mas fica
 *  fora da média. O formulário exige nota de verdade em pelo menos 3
 *  critérios, então N/A nunca pode ser a resposta de tudo. */
export const NOTA_NA = "na" as const;

export type ValorNota = number | typeof NOTA_NA;

interface NotaEscalaProps {
  id?: string;
  label: string;
  value: ValorNota | null;
  onChange?: (value: ValorNota) => void;
  disabled?: boolean;
  /** Mostra o botão N/A ao lado da escala (o formulário de banca mostra). */
  permiteNa?: boolean;
}

export function NotaEscala({ id, label, value, onChange, disabled, permiteNa }: NotaEscalaProps) {
  const labelId = id ? `${id}-label` : undefined;
  return (
    <NotaItem>
      <NotaLabel id={labelId}>{label}</NotaLabel>
      <NotaBotoesRow role="radiogroup" aria-labelledby={labelId}>
        {NOTA_VALORES.map((n) => (
          <NotaBotao
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            $selecionado={value === n}
            disabled={disabled}
            onClick={() => onChange?.(n)}
          >
            {n}
          </NotaBotao>
        ))}
        {permiteNa && (
          <NotaBotao
            type="button"
            role="radio"
            aria-checked={value === NOTA_NA}
            aria-label="Não se aplica"
            title="Não se aplica: fica fora da média"
            $selecionado={value === NOTA_NA}
            $largo
            disabled={disabled}
            onClick={() => onChange?.(NOTA_NA)}
          >
            N/A
          </NotaBotao>
        )}
      </NotaBotoesRow>
    </NotaItem>
  );
}

interface NotaEscalaGrupoProps {
  titulo?: string;
  children: ReactNode;
}

export function NotaEscalaGrupo({ titulo = "Avalie os seguintes critérios (1 a 5):", children }: NotaEscalaGrupoProps) {
  return (
    <NotaSecao>
      <NotaTitulo>{titulo}</NotaTitulo>
      <NotaLista>{children}</NotaLista>
    </NotaSecao>
  );
}
