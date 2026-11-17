import { urlAbsoluta } from "@/lib/arquivos";
import { iniciais } from "@/lib/avatar";
import { FotoCircular } from "@/components/Avatar";
import { Circulo } from "./Institucional.styled";

interface Props {
  nome: string;
  /** Link assinado da foto (`foto_url` do ex-membro); nulo sem foto. */
  fotoUrl?: string | null;
  tamanho?: number;
  /** Preview local (arquivo recém-escolhido no modal) tem prioridade sobre a do servidor. */
  previewUrl?: string | null;
}

/** O círculo do ex-membro: a foto quando existe, as iniciais quando não.
 *  A foto vem por link assinado (2026-11-17), direto no `<img>`. */
export function FotoExMembro({ nome, fotoUrl, tamanho = 44, previewUrl }: Props) {
  const src = previewUrl ?? (fotoUrl ? urlAbsoluta(fotoUrl) : null);
  return <Circulo $tamanho={tamanho}>{src ? <FotoCircular src={src} /> : iniciais(nome)}</Circulo>;
}
