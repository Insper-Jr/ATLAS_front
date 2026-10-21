import { hojeEmBrasilia } from "@/lib/fuso";

/**
 * CSV com `;` (abre direto no Excel em português), linhas com `\n`, valor
 * com `;`, aspas ou quebra de linha entre aspas (aspas duplicadas). Sem BOM.
 */
export function gerarCsv(cabecalho: string[], linhas: (string | number | null | undefined)[][]): string {
  function celula(valor: string | number | null | undefined): string {
    if (valor === null || valor === undefined) return "";
    const texto = String(valor);
    return /[;"\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
  }
  return [cabecalho, ...linhas].map((linha) => linha.map(celula).join(";")).join("\n");
}

/** Download de verdade: `Blob` + link temporário. */
export function baixarCsv(nomeBase: string, conteudo: string): void {
  const blob = new Blob([conteudo], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${nomeBase}-${hojeEmBrasilia()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

/** Número com vírgula decimal e casas fixas, pra célula e pra tela. */
export function numeroPt(valor: number, casas = 2): string {
  return valor.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });
}
