/**
 * Institucional: o que a diretoria publica no SITE da Insper Jr.
 * Espelha `use_cases/institucional/ex_membros.py` no backend.
 */

/** Um ex-membro em destaque do site, como a aba Institucional o vê. */
export interface ExMembro {
  id: number;
  nome: string;
  cargo_pt: string;
  cargo_en: string | null;
  area_pt: string | null;
  area_en: string | null;
  empresa: string;
  /** Só quando o nome muda em inglês (ex.: "Empreendedorismo" → "Entrepreneurship"). */
  empresa_en: string | null;
  depoimento_pt: string | null;
  depoimento_en: string | null;
  linkedin: string | null;
  /** Ordem no site (menor primeiro). Os 8 primeiros PUBLICADOS vão pro carrossel. */
  ordem: number;
  tem_foto: boolean;
  /** Link assinado da foto para a aba (só no admin; ver `lib/arquivos.ts`). */
  foto_url?: string | null;
  /** Sobe a cada troca de foto — entra na URL pra furar o cache. */
  foto_versao: number;
  publicado: boolean;
  criado_em: string | null;
  atualizado_em: string | null;
}

export interface ExMembroPayload {
  nome: string;
  cargo_pt: string;
  cargo_en: string | null;
  area_pt: string | null;
  area_en: string | null;
  empresa: string;
  empresa_en: string | null;
  depoimento_pt: string | null;
  depoimento_en: string | null;
  linkedin: string | null;
  publicado: boolean;
}

/** Quantos publicados o site mostra no carrossel; o resto fica em "Ver todos". */
export const LIMITE_CARROSSEL = 8;
