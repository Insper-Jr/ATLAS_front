/** Espelha o enum `tipo_notificacao` do backend (ver `models/notificacao_model.py`).
 *
 * ⚠ **Esta lista precisa estar completa, e não é decoração.** O `APARENCIA` de
 * `pages/Notificacoes.tsx` é um `Record<TipoNotificacao, …>`: é este tipo que
 * faz o TypeScript exigir uma entrada para cada valor. Quando três valores
 * ficaram de fora daqui, o mapa passou a compilar incompleto e a tela quebrava
 * ao receber qualquer notificação desses tipos.
 */

export type TipoNotificacao =
  // eventos da plataforma
  | "alocado_em_projeto"
  | "entrega_registrada"
  // 📌 Vagas em projetos (§7.3) — pedido de entrada, para quem pede E para
  // quem responde (`solicitacao_projeto.py`)
  | "solicitacao_projeto"
  // pedido de dias de ajuste no cronograma (§13)
  | "reajuste_solicitado"
  | "reajuste_respondido"
  // 📌 o plano mudou depois de combinado — §5.6 e a data prometida ao cliente
  | "banca_remarcada"
  | "entrega_alterada"
  // Avaliação de Desempenho (Prioridade 2), não é de projeto
  | "lote_desempenho_aberto"
  // PDI (relatório de mentoria), mesmo motivo
  | "pdi_prazo_proximo"
  | "pdi_prazo_vencido"
  // ações do Health Track (§15): o responsável não vê o Health Track,
  // então o aviso é como ele fica sabendo
  | "acao_atribuida"
  | "acao_concluida"
  | "acao_prazo_vencido"
  | "rodada_health_track_aberta"
  | "rodada_health_track_pendente"
  // eventos de bancas, entram por `utils/notificar.py` no backend
  | "escalacao_banca"
  | "troca_banca"
  | "avaliacao_pendente"
  | "descricao_coordenador_pendente"
  | "banca_aviso"
  // condições, recalculadas a cada GET; somem sozinhas quando resolvidas
  | "kickoff_pendente"
  | "tarefa_vencida"
  | "banca_nao_marcada"
  | "projeto_sem_reuniao"
  | "banca_hoje"
  // § Contratos — o documento jurídico e o projeto que ele traz junto
  // (§ Contratos, 2026-09-21; ver `notificar_documento_contratual.py` e
  // `notificar_projeto.py` no backend)
  | "documento_contratual_pronto_para_gerar"
  | "documento_contratual_pronto_para_revisao_interna"
  | "documento_contratual_aprovado_internamente"
  | "documento_contratual_liberado"
  | "documento_contratual_cliente_aprovou"
  | "documento_contratual_cliente_pediu_alteracao"
  | "documento_contratual_assinado"
  | "projeto_criado_em_contrato"
  | "projeto_vendido"
  | "vagas_abertas"
  // Gestão de Pessoas (2026-10-21): pontos lançados/corrigidos/retirados
  // pra pessoa, e o aviso ao subir de faixa (próximo do limite, no limite)
  | "gp_pontos_recebidos"
  | "gp_faixa";

export interface Notificacao {
  /** Só o evento tem linha no banco. Condição vem com `null` e é
   *  identificada pela `chave`, é ela que o PATCH manda de volta. */
  id: number | null;
  chave: string;
  tipo: TipoNotificacao;
  origem: "evento" | "condicao";
  titulo: string;
  corpo: string | null;
  projeto_id: number | null;
  /** Para onde clicar leva. Vem pronta do backend. */
  rota: string | null;
  dias: number | null;
  /** Preenchido só no resumo da liderança ("11 tarefas vencidas"). */
  total: number | null;
  lida: boolean;
  criado_em: string | null;
}

export interface ListaNotificacoes {
  nao_lidas: number;
  itens: Notificacao[];
}

export type StatusSolicitacaoTroca = "pendente" | "confirmada" | "cancelada";

export interface SolicitacaoTroca {
  id: number;
  banca_id: number;
  usuario_original_id: number;
  candidatura_id: number | null;
  /** Nulo = pedido aberto, qualquer elegível confirma. Preenchido = convite
   *  direto pra essa pessoa, só ela pode confirmar. */
  usuario_convidado_id: number | null;
  status: StatusSolicitacaoTroca;
  criado_em: string;
  confirmada_por: number | null;
  confirmada_em: string | null;
  /** Frente cuja composição a saída desta pessoa afeta — nulo se a vaga é
   *  excedente (não precisa de ninguém de uma frente específica). */
  frente_id: number | null;
  frente_nome: string | null;
  /** A saída desta pessoa descobre o piso/liderança da frente dela. */
  vaga_precisada: boolean;
  /** Dentro de `vaga_precisada`, é a LIDERANÇA da frente que fica faltando —
   *  só gerente/coordenador da frente cobre. */
  precisa_lideranca: boolean;
  /** Quem pode de fato confirmar esta troca, já considerando o acima —
   *  convite direto vira uma lista de 1 (o convidado). */
  elegiveis_ids: number[];
}
