import { apiFetch } from "@/lib/api";
import { API_URL } from "@/config/config";
import type {
  EscopoVendido,
  HistoricoEntrada,
  MembroEquipePayload,
  ProjetoCompleto,
  ProjetoResumo,
  StatusProjeto,
} from "@/types/projeto";

/* ------------------------------------------------------------------ */
/* Rotas                                                               */
/* ------------------------------------------------------------------ */

/**
 * O recorte de visão é do backend: esta chamada devolve coisas
 * diferentes para diretor, gerente e consultor com o mesmo endereço. O
 * `frenteId` só é aceito para diretor, para o gerente ele no máximo
 * restringe dentro das frentes dele, nunca amplia.
 */
export function getProjetos(
  token: string,
  frenteId?: number | null,
  incluirArquivados?: boolean,
) {
  const params = new URLSearchParams();
  if (frenteId) params.set("frente_id", String(frenteId));
  if (incluirArquivados) params.set("incluir_arquivados", "true");
  const query = params.toString() ? `?${params.toString()}` : "";
  return apiFetch<ProjetoResumo[]>(`/projetos${query}`, { token });
}

export function getProjeto(projetoId: number, token: string) {
  return apiFetch<ProjetoCompleto>(`/projetos/${projetoId}`, { token });
}

/** Arquivar não é excluir, só some das listagens normais. */
export function arquivarProjeto(projetoId: number, token: string) {
  return apiFetch<{ id: number; arquivado_em: string }>(`/projetos/${projetoId}/arquivar`, {
    aviso: "Projeto arquivado", method: "PATCH",
    token,
  });
}

export function desarquivarProjeto(projetoId: number, token: string) {
  return apiFetch<{ id: number; arquivado_em: null }>(`/projetos/${projetoId}/desarquivar`, {
    aviso: "Projeto desarquivado", method: "PATCH",
    token,
  });
}

/** Sem volta, o backend só aceita se o projeto já estiver arquivado. */
export function deletarProjetoPermanente(projetoId: number, token: string) {
  return apiFetch<{ nome: string }>(`/projetos/${projetoId}`, {
    aviso: "Projeto apagado", method: "DELETE",
    token,
  });
}

export interface CreateProjetoPayload {
  nome: string;
  cliente?: string | null;
  descricao?: string | null;
  link_proposta?: string | null;
  frente_ids: number[];
  /** Em branco (atalho, 2026-10-13) o backend usa o padrão: 5 dias úteis. */
  dias_ambientacao?: number;
  /** Teto de consultores, decide quando o projeto sai da lista de vagas.
   *  Em branco o backend usa o padrão: 3. */
  max_consultores?: number;
  equipe: MembroEquipePayload[];
  /** Quem vendeu. Opcional e sem obrigatoriedade: nem toda venda tem vendedor
   *  identificado, e exigir travaria o cadastro por um dado que às vezes
   *  ninguém lembra na hora. Editável depois, na tela da equipe. */
  vendedor_ids?: number[];
  dia_reuniao_padrao?: number | null;
  /** A promessa ao cliente, registrada já na venda. */
  data_entrega_prevista_cliente?: string | null;
  escopos?: EscopoVendidoPayload[];
  /** ⭐ 2026-09-23 — só o botão de atalho em `ProjetosList` (diretoria de
   *  projetos) manda `true`. O backend só honra isto se quem chamou
   *  também for diretor_projetos — ver `CreateProjetoRequest` no backend. */
  atalho_direto_vendido?: boolean;
}

export function createProjeto(dados: CreateProjetoPayload, token: string) {
  return apiFetch<ProjetoResumo>("/projetos", {
    aviso: "Projeto criado", method: "POST",
    token,
    body: JSON.stringify(dados),
  });
}

/** A proposta é ou link (mandado junto no `createProjeto`), ou este PDF, nunca os dois. */
export function uploadAnexoProposta(projetoId: number, arquivo: File, token: string) {
  const formData = new FormData();
  formData.append("arquivo", arquivo);
  return apiFetch<{ anexo_proposta_nome: string }>(`/projetos/${projetoId}/anexo-proposta`, {
    aviso: "PDF da proposta enviado", method: "POST",
    token,
    body: formData,
  });
}

/**
 * A rota exige Bearer token, então um `<a href>` direto não funciona, baixa
 * como blob e dispara o download via um link temporário.
 */
export async function baixarAnexoProposta(projetoId: number, nomeArquivo: string, token: string) {
  const response = await fetch(`${API_URL}/projetos/${projetoId}/anexo-proposta`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (response.status === 404) {
    throw new Error(
      "O arquivo da proposta não está mais no servidor. Envie o PDF de novo pela edição do projeto.",
    );
  }
  if (!response.ok) throw new Error("Erro ao baixar o anexo da proposta");
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * @param vendedorIds quem VENDEU o projeto. Omitir (`undefined`) deixa os
 *   vendedores como estão; `[]` apaga todos. A distinção importa: sem ela,
 *   qualquer tela que salvasse só a equipe apagaria os vendedores em silêncio.
 */
export function updateEquipe(
  projetoId: number,
  equipe: MembroEquipePayload[],
  token: string,
  vendedorIds?: number[],
) {
  return apiFetch<{ equipe: MembroEquipePayload[] }>(`/projetos/${projetoId}/equipe`, {
    aviso: "Equipe salva", method: "PUT",
    token,
    body: JSON.stringify(
      vendedorIds === undefined ? { equipe } : { equipe, vendedor_ids: vendedorIds },
    ),
  });
}

/**
 * Marcar o kickoff move Vendido → Ambientação sozinho — a transição é do
 * sistema, não de uma pessoa clicando no seletor de etapa.
 *
 * A resposta traz o `status` porque ele PODE ter mudado mesmo assim: um
 * projeto já em Ambientação com o kickoff corrigido para trás pode ter a
 * janela vencida na hora e virar Em andamento sozinho.
 */
export function marcarKickoff(projetoId: number, dataKickoff: string, token: string) {
  return apiFetch<{ id: number; data_kickoff: string; status: StatusProjeto }>(
    `/projetos/${projetoId}/kickoff`,
    { aviso: "Kickoff marcado", method: "PATCH", token, body: JSON.stringify({ data_kickoff: dataKickoff }) },
  );
}

/**
 * A exceção do §5.3: a ambientação, na prática, começou antes do kickoff.
 * `dataInicio` nulo limpa a correção (volta a contar do próprio kickoff, o
 * padrão). Só o coordenador do projeto ou a diretoria — o backend recusa o
 * resto, ver `UpdateInicioAmbientacaoUseCase`.
 *
 * Mesmo motivo do `status` em `marcarKickoff`: encurtar a janela pode
 * encerrar a ambientação na hora.
 */
export function marcarInicioAmbientacao(
  projetoId: number,
  dataInicio: string | null,
  token: string,
) {
  return apiFetch<{ id: number; data_inicio_ambientacao: string | null; status: StatusProjeto }>(
    `/projetos/${projetoId}/inicio-ambientacao`,
    { aviso: "Início da ambientação salvo", method: "PATCH", token, body: JSON.stringify({ data_inicio_ambientacao: dataInicio }) },
  );
}

// Não existe `marcarEntregaCliente`: entrega ao cliente e entrega do escopo
// são a MESMA data, quem a escreve é `marcarEntregaEscopo`, e a do
// projeto é derivada da última pelo backend.
//
// O que existe é a PROMESSA, abaixo: outra pergunta, outro campo.

/**
 * A data combinada com o cliente na venda.
 *
 * `null` limpa a promessa. Não toca na entrega realizada, aquela é derivada
 * dos escopos e não passa por aqui.
 */
export function updateEntregaPrevistaCliente(
  projetoId: number,
  data: string | null,
  token: string,
) {
  return apiFetch<{ id: number; data_entrega_prevista_cliente: string | null }>(
    `/projetos/${projetoId}/entrega-prevista-cliente`,
    {
      aviso: "Entrega prevista salva", method: "PATCH",
      token,
      body: JSON.stringify({ data_entrega_prevista_cliente: data }),
    },
  );
}

/** `statusNovo` aceita qualquer etapa ativa (ver `destinosValidos`), `"pausado"` ou `"retomar"`. */
export function mudarStatus(projetoId: number, statusNovo: string, token: string) {
  return apiFetch<{ id: number; status_anterior: StatusProjeto; status: StatusProjeto }>(
    `/projetos/${projetoId}/status`,
    { aviso: "Etapa do projeto atualizada", method: "PATCH", token, body: JSON.stringify({ status_novo: statusNovo }) },
  );
}

export function updateDescricao(projetoId: number, descricao: string, token: string) {
  return apiFetch<{ id: number; nome: string; descricao: string | null }>(
    `/projetos/${projetoId}/descricao`,
    { aviso: "Descrição salva", method: "PATCH", token, body: JSON.stringify({ descricao }) },
  );
}

/** Renomear é separado da descrição (mesma rota, mas só o campo `nome`), o
 *  nome é o título da página, não um conteúdo do card de Descrição, então
 *  a edição mora no cabeçalho, ao lado do título. */
export function renomearProjeto(projetoId: number, nome: string, token: string) {
  return apiFetch<{ id: number; nome: string; descricao: string | null }>(
    `/projetos/${projetoId}/descricao`,
    { aviso: "Nome salvo", method: "PATCH", token, body: JSON.stringify({ nome }) },
  );
}

/** Mesma rota de `updateDescricao`/`renomearProjeto`, só o campo `cliente`. */
export function updateCliente(projetoId: number, cliente: string, token: string) {
  return apiFetch<{ id: number; cliente: string | null }>(
    `/projetos/${projetoId}/descricao`,
    { aviso: "Cliente salvo", method: "PATCH", token, body: JSON.stringify({ cliente }) },
  );
}

/** Mesma rota de `updateDescricao`/`renomearProjeto`, só o campo `link_proposta`. */
export function updateLinkProposta(projetoId: number, linkProposta: string, token: string) {
  return apiFetch<{ id: number; link_proposta: string | null }>(
    `/projetos/${projetoId}/descricao`,
    { aviso: "Link da proposta salvo", method: "PATCH", token, body: JSON.stringify({ link_proposta: linkProposta }) },
  );
}

/** O backend recusa (422) se alguma frente removida ainda tiver escopo
 *  vendido nela. */
export function updateFrentes(projetoId: number, frenteIds: number[], token: string) {
  return apiFetch<{ id: number; frente_ids: number[]; sinergico: boolean }>(
    `/projetos/${projetoId}/frentes`,
    { aviso: "Frentes salvas", method: "PATCH", token, body: JSON.stringify({ frente_ids: frenteIds }) },
  );
}

/** A resposta traz o `status`: encurtar a ambientação pode encerrá-la agora
 *  e virar o projeto para Em andamento. */
export function updateDiasAmbientacao(projetoId: number, diasAmbientacao: number, token: string) {
  return apiFetch<{ id: number; dias_ambientacao: number; status: StatusProjeto }>(
    `/projetos/${projetoId}/dias-ambientacao`,
    { aviso: "Dias de ambientação salvos", method: "PATCH", token, body: JSON.stringify({ dias_ambientacao: diasAmbientacao }) },
  );
}

export function updateDiaReuniaoPadrao(projetoId: number, diaReuniaoPadrao: number | null, token: string) {
  return apiFetch<{ id: number; dia_reuniao_padrao: number | null }>(
    `/projetos/${projetoId}/dia-reuniao-padrao`,
    { aviso: "Dia da reunião salvo", method: "PATCH", token, body: JSON.stringify({ dia_reuniao_padrao: diaReuniaoPadrao }) },
  );
}

/** O backend recusa (422) se o novo teto ficar abaixo da quantidade de
 *  consultores já alocados agora. */
export function updateMaxConsultores(projetoId: number, maxConsultores: number, token: string) {
  return apiFetch<{ id: number; max_consultores: number }>(
    `/projetos/${projetoId}/max-consultores`,
    { aviso: "Máximo de consultores salvo", method: "PATCH", token, body: JSON.stringify({ max_consultores: maxConsultores }) },
  );
}

/** Abrir/fechar a declaração de interesse em Vagas em Projetos — só quem
 *  lidera o projeto (diretoria de projetos, gerente, coordenador). */
export function updateVagasAbertas(projetoId: number, vagasAbertas: boolean, token: string) {
  return apiFetch<{ id: number; vagas_abertas: boolean }>(
    `/projetos/${projetoId}/vagas-abertas`,
    {
      method: "PATCH",
      token,
      body: JSON.stringify({ vagas_abertas: vagasAbertas }),
      aviso: vagasAbertas ? "Vagas abertas, consultores das frentes avisados" : "Vagas fechadas",
    },
  );
}

export function getHistoricoProjeto(projetoId: number, token: string) {
  return apiFetch<HistoricoEntrada[]>(`/projetos/${projetoId}/historico`, { token });
}

/** Só a diretoria; o backend recusa com 403 quem não for. */
export function registrarJustificativaAtraso(
  projetoId: number,
  texto: string,
  token: string,
  projetoEscopoId?: number,
  motivoTipo?: string,
) {
  return apiFetch<HistoricoEntrada>(`/projetos/${projetoId}/justificativa-atraso`, {
    aviso: "Justificativa registrada", method: "POST",
    token,
    body: JSON.stringify({
      texto,
      projeto_escopo_id: projetoEscopoId ?? null,
      motivo_tipo: motivoTipo ?? null,
    }),
  });
}

/**
 * §7.4: "a diretoria **pergunta** ao coordenador e digita a nota".
 *
 * ⭐ A pergunta, registrada. Só a segunda metade existia na plataforma — a
 * caixa de texto — e a pergunta acontecia por fora. Quem cobrou, quando, e se
 * já responderam não ficava em lugar nenhum.
 *
 * O pedido é do MOTIVO (escopo + tipo), não do projeto: dois escopos atrasados
 * rendem dois pedidos, e responder um não fecha o outro. O backend recusa com
 * 422 se já houver pedido aberto para o mesmo motivo.
 */
export function pedirJustificativaAtraso(
  projetoId: number,
  token: string,
  dados: { projeto_escopo_id?: number | null; tipo?: string | null; sobre?: string },
) {
  return apiFetch<{ id: number; solicitado_em: string; coordenador_id: number }>(
    `/projetos/${projetoId}/pedido-justificativa`,
    { aviso: "Pedido de justificativa enviado", method: "POST", token, body: JSON.stringify(dados) },
  );
}

/** §7.4 — não é edição de rotina, é pra corrigir engano/teste. Só diretoria. */
export function excluirJustificativaAtraso(projetoId: number, justificativaId: number, token: string) {
  return apiFetch<null>(`/projetos/${projetoId}/justificativa-atraso/${justificativaId}`, {
    aviso: "Justificativa excluída", method: "DELETE",
    token,
  });
}

/** Mesma lógica da justificativa de atraso acima. Só diretoria. */
export function excluirRemarcacaoBanca(projetoId: number, remarcacaoId: number, token: string) {
  return apiFetch<null>(`/projetos/${projetoId}/remarcacao-banca/${remarcacaoId}`, {
    aviso: "Remarcação excluída", method: "DELETE",
    token,
  });
}

/** "Limpar histórico" não apaga nada, só marca 'agora' como corte de
 *  exibição da timeline. As linhas continuam no banco, usadas na contagem
 *  de dias; só saem da tela até alguém pedir pra ver tudo de novo. */
export function ocultarHistorico(projetoId: number, token: string) {
  return apiFetch<{ id: number; historico_oculto_ate: string }>(
    `/projetos/${projetoId}/historico/ocultar`,
    { aviso: "Histórico limpo", method: "PATCH", token },
  );
}

export function mostrarHistoricoCompleto(projetoId: number, token: string) {
  return apiFetch<{ id: number; historico_oculto_ate: null }>(
    `/projetos/${projetoId}/historico/mostrar-tudo`,
    { aviso: "Histórico completo de volta", method: "PATCH", token },
  );
}

/* ------------------------------------------------------------------ */
/* Escopos vendidos (F4)                                               */
/* ------------------------------------------------------------------ */

export interface EscopoVendidoPayload {
  /** Vazio + `nome_customizado` preenchido = a opção "Outro". */
  escopo_id: number | null;
  nome_customizado?: string | null;
  frente_id: number;
  /**
   * O calendário acadêmico que este escopo segue. Obrigatório no cadastro: o
   * backend recusa (422) quando a frente tem calendários nomeados e nenhum foi
   * escolhido — `null` só passa na frente que tem um calendário só.
   */
  calendario: string | null;
  dias_uteis_vendidos: number;
  data_entrega_planejada?: string | null;
}

/** Uma opção do seletor de calendário. `valor` é o que vai no escopo; `null`
 *  é o calendário único da frente, que não tem rótulo para mostrar. */
export interface OpcaoCalendario {
  valor: string | null;
  rotulo: string;
}

export interface CalendariosDaFrente {
  frente_id: number;
  frente_nome: string;
  padrao: string | null;
  calendarios: OpcaoCalendario[];
}

/**
 * Os calendários escolhíveis de cada frente, para o cadastro do escopo.
 *
 * Toda frente vem com ao menos uma opção — a de calendário único tem `valor`
 * nulo. Esconder o campo quando a lista parece vazia é o que deixava projeto
 * sem calendário nenhum, então a tela sempre mostra o seletor.
 */
export function listCalendariosParaEscolha(token: string) {
  return apiFetch<CalendariosDaFrente[]>("/calendarios-para-escolha", { token });
}

export function getEscoposProjeto(projetoId: number, token: string) {
  return apiFetch<EscopoVendido[]>(`/projetos/${projetoId}/escopos`, { token });
}

export function createEscopoProjeto(projetoId: number, dados: EscopoVendidoPayload, token: string) {
  return apiFetch<{ id: number }>(`/projetos/${projetoId}/escopos`, {
    aviso: "Escopo adicionado", method: "POST",
    token,
    body: JSON.stringify(dados),
  });
}

export function deleteEscopoProjeto(escopoId: number, token: string) {
  return apiFetch(`/escopos-projeto/${escopoId}`, { aviso: "Escopo removido", method: "DELETE", token });
}

export interface UpdateEscopoProjetoPayload {
  /**
   * Qual item do catálogo este escopo é, ou `null` pra virar "Outro" (e aí
   * `nome_customizado` é obrigatório). Os dois campos viajam juntos sempre
   * que o TIPO muda: mandar só um limpa o outro no backend, mas o front evita
   * depender disso e já manda o par.
   */
  escopo_id?: number | null;
  nome_customizado?: string | null;
  dias_uteis_vendidos?: number;
  data_entrega_planejada?: string | null;
  /** Trocada pelas setinhas de reordenar na tabela de escopos vendidos. */
  ordem?: number;
  /**
   * O calendário acadêmico deste escopo. Omitir NÃO mexe nele; mandar `null`
   * aponta para o calendário único da frente, e o backend recusa (422) o nulo
   * quando a frente tem calendários nomeados.
   */
  calendario?: string | null;
}

export function updateEscopoProjeto(
  escopoId: number,
  dados: UpdateEscopoProjetoPayload,
  token: string,
) {
  return apiFetch<{ id: number }>(`/escopos-projeto/${escopoId}`, {
    aviso: "Escopo salvo", method: "PATCH",
    token,
    body: JSON.stringify(dados),
  });
}

// A contagem do  começa pela REUNIÃO INICIAL, marcada no calendário do
// CRONOGRAMA com o escopo escolhido (`createReuniao` em `lib/tarefas.ts`). A
// aba Reuniões, que era onde isso ficava, deixou de existir: todas as datas do
// projeto passaram a ser cravadas numa tela só. Não existe um "iniciar
// escopo" digitado à parte.
//
// (Merge) `updateEscopoProjeto` acima veio da main e convive com isso: ele edita
// os CAMPOS do escopo vendido (nome, dias, entrega planejada, ordem na tabela),
// não a data de início, que continua sendo a reunião inicial do cronograma.

/**
 * O backend recusa com 422 até a banca do escopo ser realizada.
 *
 * `justificativa` só é exigida para ALTERAR uma entrega já registrada, e nesse
 * caso o backend também exige que quem altera seja a diretoria (§13).
 *
 * ⚠ **Marcar a data NÃO entrega o escopo.** O status só vira "entregue" por
 * `confirmarEntregaEscopo` — a data é registro de calendário, a confirmação é
 * a declaração de que o trabalho foi ao cliente.
 */
export function marcarEntregaEscopo(
  escopoId: number,
  data: string,
  token: string,
  justificativa?: string,
) {
  return apiFetch<{
    id: number;
    data_entrega_real: string;
    /** true enquanto ninguém confirmou a entrega — o status segue parado. */
    aguardando_confirmacao: boolean;
  }>(`/escopos-projeto/${escopoId}/entrega`, {
    aviso: "Entrega marcada", method: "PATCH",
    token,
    body: JSON.stringify({ data_entrega_real: data, justificativa }),
  });
}

/**
 * ⭐ O ato que move o escopo para **Entregue** — e o único que faz isso.
 *
 * 🔒 Recusa com 422 se: a banca não aprovou (§5.5), a data da entrega não está
 * marcada, o escopo já foi confirmado, ou quem clicou não é o **coordenador
 * daquele projeto** nem a diretoria. A checagem de quem pode é de VÍNCULO, não
 * de cargo: um coordenador de outro projeto não confirma este.
 */
export function confirmarEntregaEscopo(
  escopoId: number,
  token: string,
  /**
   * O dia da entrega, em `yyyy-MM-dd`, para quando ele ainda não tiver sido
   * marcado no Cronograma. Com data já registrada o backend ignora este campo:
   * mudar entrega registrada é do §13 e tem porta própria.
   */
  dataEntregaReal?: string,
) {
  return apiFetch<{ id: number; status: string; entrega_confirmada_em: string }>(
    `/escopos-projeto/${escopoId}/confirmar-entrega`,
    {
      aviso: "Entrega confirmada", method: "POST",
      token,
      body: JSON.stringify({ data_entrega_real: dataEntregaReal ?? null }),
    },
  );
}

/**
 * Marca a banca do escopo, escreve na MESMA linha que `/bancas` lê.
 *
 * `escopoIds` é o conjunto COMPLETO de escopos que a banca passa a cobrir (o
 * da URL entra de qualquer jeito). Omitido, os vínculos atuais ficam como
 * estão, é o caminho de quem só quer mexer na data.
 */
export function marcarBancaDoEscopo(
  escopoId: number,
  dataHora: string,
  token: string,
  justificativa?: string,
  escopoIds?: number[],
) {
  return apiFetch<{
    id: number;
    data_hora: string;
    status: string;
    projeto_escopo_ids: number[];
  }>(`/escopos-projeto/${escopoId}/banca`, {
    aviso: "Banca marcada", method: "PUT",
    token,
    body: JSON.stringify({
      data_hora: dataHora,
      justificativa: justificativa ?? null,
      escopo_ids: escopoIds ?? null,
    }),
  });
}

export const ROTULO_STATUS_ESCOPO: Record<string, string> = {
  nao_iniciado: "Não iniciado",
  em_andamento: "Em andamento",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

/** O `tipo` de `MotivoAtraso`, usado tanto na aba Atrasos quanto no
 *  histórico do projeto (pra mostrar a que motivo uma justificativa se
 *  refere). Um só lugar pras duas telas não divergirem no rótulo. */
/**
 * Os tipos de motivo de atraso, para rótulo.
 *
 * `entrega_interna`/`entrega_externa` continuam aqui, mas nenhum motivo NOVO
 * nasce com eles: o atraso da entrega saiu dos insights em 2026-08-12. Ficam
 * porque as notas de justificativa já gravadas com esses tipos seguem no banco
 * e aparecem no Histórico, sem o rótulo, a tela mostraria a chave crua.
 */
export const ROTULO_MOTIVO_ATRASO: Record<string, string> = {
  banca: "Banca",
  escopo: "Janela do escopo",
  entrega_interna: "Entrega (histórico)",
  entrega_externa: "Agenda do cliente (histórico)",
};

/* ------------------------------------------------------------------ */
/* Ciclo de vida, espelho de utils/status_projeto.py                  */
/* ------------------------------------------------------------------ */

export const ROTULO_STATUS: Record<StatusProjeto, string> = {
  contrato_em_elaboracao: "Contrato em elaboração",
  vendido: "Vendido",
  ambientacao: "Ambientação",
  em_andamento: "Em andamento",
  validacao_bancas: "Aguardando bancas",
  envio_tep: "Envio do TEP",
  periodo_ajustes: "Período de ajustes",
  finalizado: "Finalizado",
  pausado: "Pausado",
};

const STATUS_PAUSAVEIS: StatusProjeto[] = [
  "ambientacao",
  "em_andamento",
  "validacao_bancas",
  "envio_tep",
  "periodo_ajustes",
];

/** A fila do ciclo de vida, na ordem. `pausado` fica fora, é estado à parte. */
/**
 * O funil, em ordem. Era privado porque só `destinosValidos` o consultava;
 * a trilha de etapas da página do projeto desenha o funil INTEIRO (inclusive
 * as etapas para onde não dá para ir agora), e reconstruir essa ordem lá seria
 * uma segunda fonte de verdade — divergiria na primeira etapa nova.
 *
 * ⚠ `pausado` não está aqui de propósito: é um estado à parte, não um ponto
 * do funil.
 */
export const STATUS_ORDEM: StatusProjeto[] = [
  "contrato_em_elaboracao",
  "vendido",
  "ambientacao",
  "em_andamento",
  "validacao_bancas",
  "envio_tep",
  "periodo_ajustes",
  "finalizado",
];

/**
 * Espelho de `status_projeto.py::destinos_validos`, as etapas que o
 * seletor mostra como opção pra este status. Livre entre as ativas, nos dois
 * sentidos (inclusive reabrir um projeto finalizado); o backend revalida
 * (`transicao_manual_valida`), aqui é só pra montar a lista.
 *
 * Vendido só oferece Ambientação, e só quando `temKickoff`, sem data de
 * kickoff marcada não tem o que confirmar. Contrato em elaboração só
 * oferece Vendido — escape de diretoria pra quando o contrato foi
 * resolvido fora da plataforma; o back revalida que só diretoria pode usar
 * esse destino a partir deste status. `pausado` não tem destino por aqui:
 * sai pelo retomar.
 */
export function destinosValidos(
  atual: StatusProjeto,
  temKickoff: boolean,
  livreDeKickoff = false,
): StatusProjeto[] {
  if (atual === "pausado") return [];
  if (atual === "contrato_em_elaboracao") return ["vendido"];
  // Projeto do atalho (2026-10-14): kickoff opcional, Vendido sai livre.
  if (atual === "vendido") return livreDeKickoff ? STATUS_ORDEM.slice(2) : temKickoff ? ["ambientacao"] : [];
  return STATUS_ORDEM.slice(2).filter((s) => s !== atual);
}

export function podePausar(atual: StatusProjeto): boolean {
  return STATUS_PAUSAVEIS.includes(atual);
}

/** Verde para finalizado, cinza para pausado, vermelho para o resto em curso. */
export function tomDoStatus(status: StatusProjeto): "success" | "muted" | "default" {
  if (status === "finalizado") return "success";
  if (status === "pausado") return "muted";
  return "default";
}

/**
 * Uma cor fixa por fase, mesma fonte usada no kanban de projetos e no
 * seletor de etapa da Visão geral, pra nenhum dos dois inventar a própria
 * paleta e os dois acabarem discordando da cor de uma fase.
 */
export const CORES_STATUS: Record<StatusProjeto, string> = {
  contrato_em_elaboracao: "#A8A29E", // pedra, nem venda ainda
  vendido: "#9CA3AF", // cinza, ainda não começou de fato
  ambientacao: "#6366F1", // índigo
  em_andamento: "#3B82F6", // azul
  validacao_bancas: "#8B5CF6", // roxo
  envio_tep: "#14B8A6", // teal
  periodo_ajustes: "#F97316", // laranja
  finalizado: "#10B981", // verde
  pausado: "#F59E0B", // âmbar, vermelho fica reservado pro alerta de vencida
};

/** Mesma ordem de colunas do kanban de projetos (`ProjetoKanbanBoard`,
 *  que itera `Object.keys(CORES_STATUS)`), usada pra ordenar a lista pela
 *  fase do ciclo de vida sem inventar uma segunda ordem que discorde do
 *  kanban. */
const ORDEM_STATUS_KANBAN = Object.keys(CORES_STATUS) as StatusProjeto[];

export function ordemStatus(status: StatusProjeto): number {
  return ORDEM_STATUS_KANBAN.indexOf(status);
}

/* ------------------------------------------------------------------ */
/* Formatação                                                          */
/* ------------------------------------------------------------------ */

const DIAS_DA_SEMANA = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

export function rotuloDiaSemana(dia: number | null | undefined): string {
  if (!dia || dia < 1 || dia > 7) return "—";
  return DIAS_DA_SEMANA[dia - 1];
}

/** Só dias úteis, reunião de projeto não cai em fim de semana. Catálogo
 *  único do cadastro (`ProjetoNovo`) e da edição (`ProjetoVisaoGeral`). */
export const DIAS_REUNIAO = [
  { valor: 1, rotulo: "Segunda-feira" },
  { valor: 2, rotulo: "Terça-feira" },
  { valor: 3, rotulo: "Quarta-feira" },
  { valor: 4, rotulo: "Quinta-feira" },
  { valor: 5, rotulo: "Sexta-feira" },
];

/**
 * A API manda data pura (`2026-08-10`), sem fuso. `new Date("2026-08-10")`
 * interpreta como UTC e volta um dia atrás no Brasil, daí o corte manual.
 */
export function formatarData(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [ano, mes, dia] = iso.slice(0, 10).split("-");
  return `${dia}/${mes}/${ano}`;
}

/**
 * O backend manda datetime em UTC, mas sem o `Z` na string (datetime "naive"
 * do Python/Pydantic, ex.: `"2026-08-07T03:16:00"`). Sem fuso marcado,
 * `new Date(...)` lê a string como hora LOCAL em vez de UTC, e mostra o
 * relógio de UTC cru como se já fosse horário de Brasília, sempre 3h
 * adiantado. Não mexe em data pura (`2026-07-14`, sem hora): essa já é
 * tratada à parte, porque não é um instante pra converter, só um dia.
 */
export function paraDataUtc(iso: string): Date {
  const temFuso = /Z$|[+-]\d{2}:?\d{2}$/.test(iso);
  return new Date(temFuso ? iso : `${iso}Z`);
}

export function formatarDataHora(iso: string | null | undefined): string {
  if (!iso) return "—";
  // Data pura (`2026-07-14`) não tem hora e NÃO pode passar por `new Date`:
  // ele lê como UTC e no Brasil devolve o dia anterior às 21:00. O calendário
  // geral mistura eventos com hora (banca) e sem hora (kickoff, reunião,
  // entrega) no mesmo campo, então a distinção é feita aqui.
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return formatarData(iso);

  const d = paraDataUtc(iso);
  if (Number.isNaN(d.getTime())) return formatarData(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * "dd/mm/aaaa às hh:mm", usado nos cards de projeto (kanban e lista) pra
 * mostrar a data da próxima banca. Espaço inquebrável em volta do
 * "às" pra data e hora nunca se separarem numa quebra de linha do card.
 */
/** Só a hora ("HH:mm"), ou `null` para eventos de dia inteiro (kickoff,
 *  reunião, entrega — só banca tem hora de verdade, ver `GetEventosCalendarioUseCase`).
 *  Usado no calendário geral, onde a data do dia já está no cabeçalho e só a
 *  hora falta dizer qual evento é qual. */
export function horaDoEvento(iso: string | null | undefined): string | null {
  if (!iso) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const d = paraDataUtc(iso);
  if (Number.isNaN(d.getTime())) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Minutos desde 00:00, para posicionar o evento numa timeline (ver
 *  `TimelineDia`). `null` nos mesmos casos que `horaDoEvento` — dia inteiro,
 *  sem hora de verdade. */
export function minutosDoEvento(iso: string | null | undefined): number | null {
  if (!iso) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const d = paraDataUtc(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.getHours() * 60 + d.getMinutes();
}

export function formatarDataHoraBanca(iso: string | null | undefined): string {
  const completo = formatarDataHora(iso);
  const espaco = completo.indexOf(" ");
  if (espaco === -1) return completo;
  return `${completo.slice(0, espaco)} às ${completo.slice(espaco + 1)}`;
}
