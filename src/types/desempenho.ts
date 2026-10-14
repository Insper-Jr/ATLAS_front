// Avaliação de Desempenho, periódica/finalização de consultores e
// coordenadores. Não confundir com os tipos de `banca.ts` (feedback de
// banca, outra feature).

export type DesempenhoTipo = "periodico" | "finalizacao";
// ⭐ "escopo" (2026-09-09) não é papel de pessoa — é o formulário "Avaliação
// do Escopo", auto-avaliação que cada participante do projeto responde uma
// vez por lote. Na finalização fala do escopo que passou pela banca; na
// periódica (2026-10-05), do escopo em andamento.
export type DesempenhoPapel = "consultor" | "coordenador" | "escopo";
export type DesempenhoOverrideManual = "aberto" | "fechado" | null;
export type DesempenhoTipoResposta = "nota" | "texto";

export interface DesempenhoLote {
  id: number;
  nome: string;
  tipo: DesempenhoTipo;
  data_inicio: string;
  data_fim: string;
  override_manual: DesempenhoOverrideManual;
  projeto_ids: number[];
  aberto: boolean;
  /** A Avaliação do Escopo entra junto? Escolhido ao abrir o lote à mão;
   *  `true` na finalização automática e nos lotes antigos. */
  inclui_avaliacao_de_escopo: boolean;
}

export interface DesempenhoCriterio {
  id: number;
  label: string;
  descricao: string | null;
  tipo_resposta: DesempenhoTipoResposta;
  limite_caracteres: number | null;
  ordem: number;
}

export interface DesempenhoSecao {
  id: number;
  titulo: string;
  descricao: string | null;
  ordem: number;
  criterios: DesempenhoCriterio[];
}

export interface DesempenhoFormulario {
  id: number;
  tipo: DesempenhoTipo;
  papel: DesempenhoPapel;
  nota_geral_titulo: string;
  nota_geral_descricao: string;
  comentarios_titulo: string;
  comentarios_descricao: string;
  comentarios_aviso: string;
  secoes: DesempenhoSecao[];
  /** false = versão congelada que um lote aberto ficou usando. */
  vigente?: boolean;
  congelado_em?: string | null;
}

export interface DesempenhoPendencia {
  avaliador_id: number;
  avaliador_nome: string | null;
  avaliado_id: number;
  avaliado_nome: string | null;
  form_type: DesempenhoPapel;
  projeto_ids: number[];
  projeto_nomes: (string | null)[];
  /** Só na Avaliação do Escopo (2026-10-05): qual escopo vendido. É uma
   *  pendência por escopo, então a mesma pessoa pode aparecer mais de uma vez. */
  projeto_escopo_id: number | null;
  escopo_nome: string | null;
  respondida: boolean;
}

/** Quem ficou pendente nos formulários já fechados, por pessoa (2026-10-13). */
export interface DesempenhoPendenciaFechada {
  avaliador_id: number;
  avaliador_nome: string | null;
  total: number;
  lotes: {
    lote_id: number;
    lote_nome: string;
    lote_tipo: DesempenhoTipo;
    fechado_em: string;
    pendentes: number;
    itens: {
      avaliado_nome: string | null;
      form_type: DesempenhoPapel;
      projeto_nomes: (string | null)[];
      escopo_nome: string | null;
    }[];
  }[];
}

export interface DesempenhoFilaItem {
  lote_id: number;
  lote_nome: string;
  lote_tipo: DesempenhoTipo;
  /** false = o lote fechou (manualmente ou pelo prazo) com essa pendência
   *  ainda em aberto, item continua aparecendo por um tempo só pro aviso,
   *  nunca dá pra responder por ele. */
  aberto: boolean;
  avaliado_id: number;
  avaliado_nome: string | null;
  form_type: DesempenhoPapel;
  projeto_ids: number[];
  /** Só na Avaliação do Escopo (2026-10-05): qual escopo vendido este item
   *  avalia. Um item por escopo da frente da pessoa; vai de volta no envio. */
  projeto_escopo_id: number | null;
  escopo_nome: string | null;
}

export interface DesempenhoAvaliacaoEscopo {
  /** Do catálogo. Nulo no escopo vendido como "Outro" sem par no catálogo
   *  (2026-10-12); aí o painel agrupa pelo `nome`. */
  escopo_id: number | null;
  nome: string;
  projeto_nome: string | null;
}

export interface DesempenhoAvaliacao {
  id: number;
  lote_id: number;
  formulario_id: number;
  avaliador_id: number;
  avaliado_id: number;
  /** Só na Avaliação do Escopo a partir de 2026-10-05. */
  projeto_escopo_id?: number | null;
  nota_geral: number;
  comentarios: string;
  criado_em?: string;
  /** Só na Avaliação do Escopo (auto-avaliação): qual escopo a pessoa
   *  avaliou, resolvido pelo backend cruzando a frente dela com os escopos
   *  da banca. `null`/ausente quando não deu pra desambiguar. */
  escopo?: DesempenhoAvaliacaoEscopo | null;
  /** 2026-10-12: `true` sempre que é Avaliação do Escopo, mesmo quando
   *  `escopo` não veio (não deu pra saber QUAL escopo). É isto que tira a
   *  linha da visão por pessoa, nunca a presença de `escopo`. */
  eh_escopo?: boolean;
}

export interface DesempenhoAvaliacaoNotaDetalhe {
  criterio_id: number;
  label: string | null;
  tipo_resposta: DesempenhoTipoResposta | null;
  nota: number | null;
  resposta_texto: string | null;
}

export interface DesempenhoAvaliacaoDetalhe extends DesempenhoAvaliacao {
  notas: DesempenhoAvaliacaoNotaDetalhe[];
}

export interface DesempenhoNotaInput {
  criterio_id: number;
  nota?: number | null;
  resposta_texto?: string | null;
}

export interface DesempenhoAvaliacaoSubmissao {
  avaliacao: DesempenhoAvaliacao;
  proxima_pendencia: DesempenhoFilaItem | null;
}

export interface DesempenhoMentoria {
  id: number;
  mentor_id: number;
  mentor_nome: string | null;
  mentor_foto: string | null;
  mentorado_id: number;
  mentorado_nome: string | null;
  mentorado_foto: string | null;
}

export interface DesempenhoRelatorioCriterio {
  criterio_id: number;
  label: string;
  tipo_resposta: DesempenhoTipoResposta;
  nota_media: number | null;
  respostas_texto: string[];
}

export type DesempenhoPdiPastaTipo = "inicial" | "encontro";

export interface DesempenhoPdiPasta {
  id: number;
  nome: string;
  tipo: DesempenhoPdiPastaTipo;
  prazo: string;
  ordem: number;
  /** Gestão vigente na data do prazo (ex: "2026.2"), derivado no backend,
   *  não é um campo próprio da pasta. `null` se o prazo cair fora de
   *  qualquer semestre cadastrado. */
  semestre: string | null;
}

export type DesempenhoPdiItemTipoArquivo = "documento" | "foto" | "planilha" | "qualquer";

/** Um documento exigido dentro de uma pasta, a pasta é uma checklist de
 *  itens (ex: "Encontro 1" pode exigir Foto + Relatório, cada um com seu
 *  próprio envio). `tipo_arquivo` restringe o formato aceito no upload. */
export interface DesempenhoPdiItem {
  id: number;
  pasta_id: number;
  nome: string;
  tipo_arquivo: DesempenhoPdiItemTipoArquivo;
  ordem: number;
}

export interface DesempenhoPdiPendencia {
  mentorado_id: number;
  mentorado_nome: string | null;
  mentor_id: number;
  mentor_nome: string | null;
  /** "pendente" não entregou; "atrasado" entregou depois do prazo da pasta
   *  e continua na lista, em outra cor (2026-10-06, a pedido). */
  status: "pendente" | "atrasado";
  enviado_em: string | null;
}

/** Resultados de uma pasta: todo mundo que mandou algo nela. */
export interface DesempenhoPdiResultadoEnvio {
  item_id: number;
  item_nome: string;
  tipo_arquivo: DesempenhoPdiItemTipoArquivo;
  arquivo_nome: string;
  enviado_por: number;
  enviado_por_nome: string | null;
  enviado_em: string;
  atrasado: boolean;
}

export interface DesempenhoPdiResultadoPessoa {
  mentorado_id: number;
  mentorado_nome: string | null;
  mentor_id: number | null;
  mentor_nome: string | null;
  envios: DesempenhoPdiResultadoEnvio[];
}

export interface DesempenhoPdiResultadosPasta {
  pasta_id: number;
  pasta_nome: string;
  prazo: string;
  total_itens: number;
  pessoas: DesempenhoPdiResultadoPessoa[];
}

export interface DesempenhoPdiEnvio {
  arquivo_nome: string;
  enviado_por: number;
  enviado_por_nome: string | null;
  enviado_em: string;
}

/** Um item da checklist de uma pasta, com ou sem envio. */
export interface DesempenhoPdiItemComEnvio {
  item_id: number;
  item_nome: string;
  tipo_arquivo: DesempenhoPdiItemTipoArquivo;
  envio: DesempenhoPdiEnvio | null;
}

/** Uma linha por PASTA, com a checklist de itens dentro, é o shape que
 *  `RelatorioPdi` desenha direto, sem precisar cruzar listas. */
export interface DesempenhoPdiPastaComItens {
  pasta_id: number;
  pasta_nome: string;
  pasta_tipo: DesempenhoPdiPastaTipo;
  pasta_semestre: string | null;
  prazo: string;
  itens: DesempenhoPdiItemComEnvio[];
}

export interface DesempenhoRelatorioLote {
  lote_id: number;
  lote_nome: string | null;
  tipo: DesempenhoTipo | null;
  nota_geral_media: number | null;
  quantidade_avaliadores: number;
  criterios: DesempenhoRelatorioCriterio[];
  comentarios: string[];
}

export interface DesempenhoRelatorio {
  usuario_id: number;
  lotes: DesempenhoRelatorioLote[];
}
