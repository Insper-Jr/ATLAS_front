// Arquivo de contratos: a pasta compartilhada. Espelha `routers/arquivo_contratos.py`.

export interface PastaArquivo {
  id: number;
  nome: string;
  pai_id: number | null;
  semestre_id: number | null;
  projeto_id: number | null;
  /** Criada sozinha (gestão ou projeto): não se move. */
  automatica: boolean;
  criado_em: string;
}

export interface ItemArquivo {
  id: number;
  pasta_id: number;
  nome: string;
  mime: string;
  tamanho: number;
  origem: "atlas" | "importado";
  documento_id: number | null;
  criado_por_nome: string | null;
  criado_em: string;
  atualizado_em: string;
  /** Links assinados, relativos à API (ver `lib/arquivos.ts`). */
  url: string;
  url_download: string;
  /** Só na busca: "2026.2 / ANTIQUÁRIO I". */
  caminho?: string;
}

export interface ConteudoPasta {
  pasta: PastaArquivo | null;
  caminho: PastaArquivo[];
  subpastas: PastaArquivo[];
  itens: ItemArquivo[];
}
