/** § Contratos — a integração com a antiga plataforma Contratos (Fase 1,
 *  ainda só em `contratos-implementacao`, não em produção). */

export type TipoDocumentoContratual = "contrato" | "tep" | "nda" | "uso_imagem" | "aditivo" | "outro";

export type StatusDocumentoContratual =
  | "aguardando_preenchimento"
  | "em_revisao_interna"
  | "aprovado_internamente"
  | "aguardando_aprovacao_cliente"
  | "alteracao_solicitada"
  | "aprovado_pelo_cliente"
  | "assinado_e_arquivado";

export const ROTULO_TIPO_DOCUMENTO: Record<TipoDocumentoContratual, string> = {
  contrato: "Contrato de Prestação de Serviços",
  tep: "TEP",
  nda: "NDA",
  uso_imagem: "Termo de Uso de Imagem",
  aditivo: "Termo Aditivo",
  outro: "Outro",
};

export const ROTULO_STATUS_DOCUMENTO: Record<StatusDocumentoContratual, string> = {
  aguardando_preenchimento: "Aguardando preenchimento",
  em_revisao_interna: "Em revisão interna",
  aprovado_internamente: "Aprovado internamente",
  aguardando_aprovacao_cliente: "Aguardando aprovação do cliente",
  alteracao_solicitada: "Alteração solicitada",
  aprovado_pelo_cliente: "Aprovado pelo cliente",
  assinado_e_arquivado: "Assinado e arquivado",
};

export interface DocumentoContratual {
  id: number;
  /** `null` = contrato institucional (Agro etc.), sem projeto de entrega
   *  nenhum por trás — `projeto_nome`/`projeto_cliente` vêm do texto
   *  digitado no próprio documento, não de um cadastro de projeto. */
  projeto_id: number | null;
  /** Trazidos junto pro cabeçalho da página própria do documento (fora da
   *  aba do projeto) — antes vinham do contexto do `ProjetoPage`. */
  projeto_nome: string;
  projeto_cliente: string | null;
  /** Vazio pra institucional (sem projeto). Pro destaque de frente no
   *  cabeçalho da página do documento. */
  frente_ids: number[];
  tipo: TipoDocumentoContratual;
  status: StatusDocumentoContratual;
  /** O shape muda por `tipo` (ver `render_template.py` no backend) — ainda
   *  sem um form campo-a-campo no front, então isto fica solto por ora. */
  dados: Record<string, unknown> | null;
  confirmado: boolean;
  gestao_id: number | null;
  criado_em: string;
  atualizado_em: string;
  /** 0 = nenhuma versão gerada ainda. */
  ultima_versao: number | null;
  /** Registro de auditoria — "Aprovado por Fulana às 14h32". `null` até
   *  passar por "Aprovar internamente". */
  /** ⭐ 2026-09-23 — a pedido: quem abriu este documento (o "Novo
   *  Contrato") — registro de auditoria que não existia (nem `confirmado_
   *  por` nem `aprovado_internamente_por` respondem "quem criou"). `null`
   *  pra documentos de antes desta coluna existir. */
  criado_por_nome: string | null;
  aprovado_internamente_por_nome: string | null;
  aprovado_internamente_em: string | null;
  /** Só não-`null` pro TEP em "aprovado_pelo_cliente" — libera o botão
   *  "Considerar assinado (prazo vencido)" quando `<= 0`. */
  dias_restantes_aceite_tacito: number | null;
  /** ⭐ 2026-09-23 — a pedido: o card de "copiar link"/"enviar por
   *  WhatsApp" não é visualização única — o backend reconstrói a partir do
   *  token ainda não usado, então sobrevive a sair e voltar da página.
   *  `null` = nenhum link ativo agora (nunca exportado, ou o cliente já
   *  respondeu e o token virou usado). */
  link_aprovacao: LinkAprovacao | null;
  /** 2026-11-05: os dados foram editados depois da última versão gerada,
   *  então o rascunho ficou pra trás e o botão "Gerar rascunho de novo"
   *  aparece mesmo em revisão interna. */
  rascunho_desatualizado: boolean;
  /** O pedido de revisão da administradora jurídica ainda não atendido
   *  (some quando uma versão nova é gerada ou reanexada). */
  revisao_pendente: RevisaoInterna | null;
  revisoes: RevisaoInterna[];
}

/** Pedido de revisão INTERNA (2026-11-05): a administradora jurídica, em vez
 *  de aprovar, escreve o que quer que mude. Não confundir com
 *  `SolicitacaoAlteracao`, que é o pedido do cliente. */
export interface RevisaoInterna {
  id: number;
  documento_id: number;
  versao_id: number | null;
  comentario: string;
  solicitado_por: number | null;
  solicitado_por_nome: string | null;
  criado_em: string;
  atendida_em: string | null;
}

/** Resposta de `POST .../exportar-aprovacao` e `.../recusar-assinatura-tep`.
 *  O número de WhatsApp não vem daqui — quem manda digita na hora (ver
 *  `montarLinkWhatsapp` em `lib/contratos.ts`), porque o telefone cadastrado
 *  no formulário pode estar errado ou ser de outra pessoa. */
export interface LinkAprovacao {
  token: string;
  link_aprovacao: string;
  mensagem_whatsapp: string;
}

/** Um trecho citado pelo cliente, com o comentário dele sobre AQUELE trecho
 *  (2026-11-05). Pedidos antigos guardavam só o texto (string). */
export interface TrechoCitado {
  texto: string;
  comentario: string | null;
}

export interface SolicitacaoAlteracao {
  id: number;
  documento_id: number;
  versao_id: number;
  texto: string;
  trechos: (TrechoCitado | string)[];
  status: "pendente" | "analisada";
  criado_em: string;
}

export function normalizarTrecho(trecho: TrechoCitado | string): TrechoCitado {
  return typeof trecho === "string" ? { texto: trecho, comentario: null } : trecho;
}

/** O que a tela pública de aprovação (`/aprovacao/:token`, sem login) recebe.
 *  O PDF em si vem de `urlArquivoAprovacao(token)` — o conteúdo mora no
 *  banco, não um caminho (ver docstring do model no backend). */
export interface AprovacaoPublica {
  usado: boolean;
  nome_projeto: string;
  tipo_documento: TipoDocumentoContratual;
  status: StatusDocumentoContratual;
}

export interface ParagrafoEditavel {
  ref: number;
  texto: string;
}

/** Uma linha da aba Contratos (`GET /contratos-painel`) — documento jurídico
 *  de qualquer projeto, em qualquer etapa (a Kanban tem uma coluna própria
 *  pra "Assinado e Arquivado" — não existe mais uma tela de Repositório
 *  separada). O recorte de quem vê qual linha já vem filtrado do back. */
export interface ItemPainelContratual {
  id: number;
  /** `null` = contrato institucional, sem projeto de entrega por trás. */
  projeto_id: number | null;
  projeto_nome: string;
  cliente: string | null;
  frente_ids: number[];
  tipo: TipoDocumentoContratual;
  tipo_rotulo: string;
  status: StatusDocumentoContratual;
  /** Junto com `status`, decide em qual das 7 colunas da Kanban o card cai
   *  (`indiceDaEtapaDocumento`, `lib/contratos-etapas.ts`). */
  confirmado: boolean;
  ultima_versao: number | null;
  criado_em: string;
  atualizado_em: string;
}

export interface IdentidadeInstitucional {
  presidente_nome: string;
  presidente_cpf: string;
  presidente_rg: string;
  presidente_orgao_emissor: string;
  presidente_endereco_rua: string;
  presidente_endereco_numero: string;
  presidente_endereco_complemento: string | null;
  presidente_endereco_bairro: string;
  presidente_endereco_cidade: string;
  presidente_endereco_estado: string;
  presidente_endereco_cep: string;
  presidente_estado_civil: string;
  presidente_nacionalidade: string;
  presidente_profissao: string;
  presidente_email: string | null;
  presidente_telefone: string | null;
  testemunha1_nome: string;
  testemunha1_cpf: string;
  testemunha1_email: string | null;
  testemunha1_telefone: string | null;
  testemunha2_nome: string;
  testemunha2_cpf: string;
  testemunha2_email: string | null;
  testemunha2_telefone: string | null;
}

/** Resposta de `POST .../extrair-coleta` — não persiste nada, o front decide
 *  aplicar `dados` no formulário. */
/** Projeto vendido nas últimas 36 horas: a comemoração na abertura do ATLAS
 *  (`GET /projetos/vendidos-recentes`). */
export interface ProjetoVendidoRecente {
  id: number;
  nome: string;
  cliente: string | null;
  vendido_em: string;
}

export interface ExtracaoColeta {
  dados: Record<string, unknown>;
  pendencias: string[];
}

/** Formatos de `dados` por tipo (ver `render_template.py` e
 *  `dados_documento_contratual.py` no backend). Usados pelo formulário
 *  campo-a-campo em `DadosDocumentoForm.tsx` — o estado em si continua solto
 *  (`Record<string, unknown>`), estas interfaces são só o contrato de forma
 *  que cada seção do formulário espera ler/escrever. */
export interface Representante {
  nome: string;
  nacionalidade: string;
  estado_civil: string;
  profissao: string;
  cargo: string;
  /** RG e órgão emissor num campo só ("2.027.163 SSP/SC") — é como a pessoa
   *  escreve naturalmente e como a Coleta de Dados também pede; separar os
   *  dois pra dentro do documento é conta de `separar_rg` no backend, na
   *  hora de gerar (`render_template.py`), não deste formulário. */
  rg: string;
  cpf: string;
  endereco: string;
  email: string;
  telefone: string;
}

export interface Contratante {
  razao_social: string;
  cnpj: string;
  endereco: string;
  representante: Representante;
  email_cobranca: string;
}

export interface Testemunha {
  nome: string;
  cpf: string;
}

export interface Assinatura {
  dia: string | number;
  mes: string | number;
  ano: number | null;
}

export interface Escopo {
  nome: string;
  prazo_dias_uteis: number;
}

export interface DiaExcecao {
  inicio: string;
  fim: string;
}

/** Uma parcela desenhada à mão (2026-11-05): a data e como o valor é
 *  definido, em reais, em porcentagem do total, ou "o que sobrar". */
export interface ParcelaPersonalizada {
  vencimento: string;
  tipo: "valor" | "percentual" | "restante";
  valor: number | null;
}

export interface Financeiro {
  valor_total: number;
  parcelado: boolean;
  /** "iguais" (N parcelas iguais, todo mês no mesmo dia) é o padrão quando
   *  ausente; "personalizadas" usa a lista `parcelas`. */
  modo_parcelas?: "iguais" | "personalizadas";
  parcelas?: ParcelaPersonalizada[];
  numero_parcelas: number;
  valor_parcela: number;
  primeiro_vencimento: string;
  dia_vencimento_mensal: number;
  forma_pagamento: string;
}

export interface DadosContrato {
  projeto: {
    servico: string;
    escopos: Escopo[];
    num_consultores: number;
    num_coordenadores: number;
    dias_excecao: DiaExcecao[];
    data_inicio: string;
    data_termino: string;
  };
  contratante: Contratante;
  financeiro: Financeiro;
  testemunhas: Testemunha[];
  assinatura: Assinatura;
}

export interface DadosTep {
  projeto: { nome: string; escopos_entregues: string[] };
  contratante: Contratante;
  execucao: { data_inicio: string; data_fim: string };
  testemunhas: Testemunha[];
  assinatura: Assinatura;
}

export interface DadosNda {
  contratante: Contratante;
  testemunhas: Testemunha[];
  assinatura: Assinatura;
}

export interface DadosUsoImagem {
  contratante: Contratante;
  /** Preenche a Cláusula 2ª ("captados no contexto de ..."). */
  contexto: string;
  testemunhas: Testemunha[];
  assinatura: Assinatura;
}

export interface DadosAditivo {
  contratante: Contratante;
  contrato_principal: { referencia: string; data: string };
  secoes: { objeto: boolean; alteracao: boolean; preco: boolean; prazo: boolean };
  objeto: { descricao: string; itens: string[] };
  alteracao: { clausula: string; nova_redacao: string };
  preco: {
    valor_antigo: number | null;
    valor_novo: number | null;
    parcelado: boolean;
    modo_parcelas?: "iguais" | "personalizadas";
    parcelas?: ParcelaPersonalizada[];
    numero_parcelas: number | null;
    valor_parcela: number | null;
    primeiro_vencimento: string;
    dia_vencimento_mensal: number | null;
  };
  prazo: { dias_uteis: number | null };
  testemunhas: Testemunha[];
  assinatura: Assinatura;
}

export interface VersaoDocumentoContratual {
  id: number;
  documento_id: number;
  versao: number;
  status_arquivo: string;
  criado_em: string;
  /** Só em `GET .../versoes` (o histórico) — `/gerar` e `/reanexar` não
   *  mandam, a versão que acabou de nascer nunca está arquivada ainda. */
  arquivado_em?: string | null;
}

/** Modelo base (.docx) de um tipo de documento: o do deploy ou o que a
 *  diretoria enviou no lugar (2026-10-07). */
export interface ModeloContratual {
  tipo: Exclude<TipoDocumentoContratual, "outro">;
  rotulo: string;
  arquivo_padrao: string;
  personalizado: boolean;
  arquivo_nome: string;
  enviado_em: string | null;
  enviado_por_nome: string | null;
}
