import { useTema } from "@/context/TemaContext";
import simboloEscuro from "@/assets/insperjr.png";
import simboloClaro from "@/assets/insperjr-claro.png";
import horizontalEscuro from "@/assets/insperjr2.png";
import horizontalClaro from "@/assets/insperjr2-claro.png";

/**
 * O logo da Insper Jr. de acordo com o tema (modo noturno, 2026-10-21).
 *
 * O traço preto do logo some no fundo escuro, então existe uma versão com o
 * "Insper" e o símbolo em branco; o "Jr." continua vermelho nas duas. As
 * versões claras são geradas a partir das originais (pixels escuros viram
 * brancos, alfa preservado), não desenhadas à mão.
 */
export function useLogoInsperJr(variante: "simbolo" | "horizontal"): string {
  const { temaAtual } = useTema();
  const escuro = temaAtual === "escuro";
  if (variante === "simbolo") return escuro ? simboloClaro : simboloEscuro;
  return escuro ? horizontalClaro : horizontalEscuro;
}
