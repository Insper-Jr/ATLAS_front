import type { Posicao, StatusUsuario, Usuario } from "@/types/auth";

/**
 * A tabela de permissões do  do briefing, num lugar só.
 *
 * Nenhum botão da aplicação deve fazer `if (usuario.posicao === "diretor")`
 * solto: todos consultam `pode()`. E o backend revalida tudo, esconder o
 * botão é conveniência de UI, não segurança.
 *
 * ⭐ **A diretoria são três cargos desde 2026-08-20.** Quem herdou os poderes
 * do `diretor` de antes é `diretor_projetos`, e é ele que aparece na matriz
 * abaixo. O `diretor` de hoje só visualiza, e o `diretor_pessoas` acrescenta
 * a isso a Avaliação de Desempenho — nenhum dos dois conduz projeto, então
 * nenhum dos dois entra nas ações daqui.
 */
export type Acao =
  | "arquivar_projeto"
  | "apagar_projeto_permanente"
  | "apagar_usuario_permanente"
  | "mudar_status_projeto"
  | "mover_projeto_kanban"
  | "remarcar_banca"
  | "liberar_excecao_choque"
  | "registrar_justificativa_atraso"
  | "registrar_reuniao"
  // Acrescentadas na divisão da diretoria (2026-08-20): eram comparações
  // soltas espalhadas pelas telas, e agora que "diretor" deixou de ser um
  // cargo só, cada uma precisava decidir QUAL diretoria — melhor decidir uma
  // vez aqui do que em 6 arquivos.
  | "acoes_de_pessoas"
  | "ser_mentor";

/** Os três cargos de diretoria. O que os une é enxergar o portfólio inteiro
 *  — e mais nada. Espelha `DIRETORIA` em `middlewares/authorization.py`. */
export const DIRETORIA: Posicao[] = ["diretor_projetos", "diretor_pessoas", "diretor"];

/** Quem conduz a operação de projeto. Herdeiro do `diretor` de antes. */
const DIR_PROJETOS: Posicao = "diretor_projetos";

/** Quem pode ser mentor de alguém. Espelha `POSICOES_ELEGIVEIS_MENTOR` do
 *  backend — a tela do PDI filtra a lista de candidatos por ela.
 *  Vendas e diretor de vendas entraram em 2026-10-13: a coordenadora de
 *  vendas tinha mentorados e não via a aba. */
export const MENTORES_ELEGIVEIS: Posicao[] = ["coordenador", "gerente", "vendas", "diretor_de_vendas", ...DIRETORIA];

const MATRIZ: Record<Acao, Posicao[]> = {
  // Gestão, restrito às lideranças
  arquivar_projeto: [DIR_PROJETOS, "gerente"],

  // Só a diretoria
  /** Sem volta, mais pesado que arquivar, por isso não é diretor+gerente. */
  apagar_projeto_permanente: [DIR_PROJETOS],
  /** Sem volta, e cascata bem maior que a de projeto, só quem já está
   *  desligado, e só diretoria. */
  apagar_usuario_permanente: [DIR_PROJETOS],
  remarcar_banca: [DIR_PROJETOS],
  liberar_excecao_choque: [DIR_PROJETOS],
  /** ⚠ Só governa EXCLUIR uma justificativa já registrada (`ProjetoHistorico`),
   *  que é correção de engano e não rotina. Escrever a justificativa é
   *  `ehLideranca`, espelhando o `require_lideranca` do backend. */
  registrar_justificativa_atraso: [DIR_PROJETOS],

  // Condução do projeto, o consultor não define cronograma nem move o
  // ciclo de vida do projeto
  mudar_status_projeto: [DIR_PROJETOS, "gerente", "coordenador"],
  /** Arrastar o card no kanban é o MESMO ato que o seletor de etapa da página
   *  do projeto — mesma rota (`PATCH /projetos/{id}/status`, `require_lideranca`)
   *  e mesma régua de destinos (`destinosValidos`). Ficou restrito à diretoria
   *  por um tempo, com o argumento de que o arrasto era "mais informal" que o
   *  botão; na prática isso só escondia do gerente e do coordenador um caminho
   *  que o backend já aceitava deles. Anda junto com `mudar_status_projeto`. */
  mover_projeto_kanban: [DIR_PROJETOS, "gerente", "coordenador"],

  /** Cadastrar pessoa, reemitir senha provisória, apagar em definitivo e
   *  passar o bastão. As duas diretorias com poder — espelha
   *  `require_diretoria_de_pessoas` no backend. */
  acoes_de_pessoas: ["diretor_projetos", "diretor_pessoas"],

  /** Vínculo de mentoria, independente do projeto. Os três cargos de
   *  diretoria entram: mentoria é acompanhamento de gente, não condução de
   *  projeto. Espelha `POSICOES_ELEGIVEIS_MENTOR`. */
  ser_mentor: MENTORES_ELEGIVEIS,

  // Todo mundo (a regra de herança do  já está refletida aqui)
  registrar_reuniao: [DIR_PROJETOS, "gerente", "coordenador", "consultor"],

  // Saíram daqui em 2026-09-02 e viraram caixa (15ª à 19ª):
  // `configurar_colunas`, `ver_tarefas_gerais`, `ver_cronogramas_gerais`,
  // `ver_historico_projetos` e `aprovar_pedidos`. Eram leitura pura ou
  // administração presa a posição dentro de telas cuja entrada já era caixa.
  //
  // `filtrar_por_frente` saiu por outro motivo: nunca deveria ter sido uma
  // matriz. Quem pode filtrar é quem o BACKEND deixa filtrar
  // (`aplicar_recorte_visao`) — ver `podeFiltrarPorFrente` abaixo.
  //
  // `ver_dashboard_bancas` saiu daqui em 2026-09-01 e virou a 14ª caixa
  // (`pode_ver_dashboard_bancas`): ler as notas de banca é trabalho que se
  // delega, e delegá-lo exigia promover a pessoa a diretora de projetos.
  //
  // As 14 ações de `Permissoes` (types/auth.ts) saíram desta matriz: são
  // editáveis por posição em Configurações (`GET /posicoes-permissoes`).
  // Deixá-las aqui criaria uma segunda fonte de verdade divergindo do
  // backend, foi o que já aconteceu uma vez.
  // O que sobrou aqui é o que nunca virou caixa e segue travado por posição
  // pura (identidade organizacional, não permissão delegável).
};

/**
 * A diretoria QUE CONDUZ PROJETO — espelha `eh_diretoria_de_projetos` do
 * backend.
 *
 * Existe para as telas que davam a um diretor o poder de passar por cima de
 * uma regra do projeto (editar comentário alheio, agendar banca fora da
 * janela, apagar tarefa de outro). Todas escreviam `posicao === "diretor"`;
 * com três cargos, todas queriam dizer este aqui.
 */
export function ehDiretoriaDeProjetos(usuario: Usuario | null | undefined): boolean {
  return usuario?.posicao === "diretor_projetos";
}

/**
 * Enxerga o portfólio inteiro — os três cargos de diretoria e o gerente
 * (este, restrito às frentes dele).
 *
 * É o RECORTE DE VISÃO, não permissão: diz o que aparece na lista, nunca o
 * que a pessoa pode fazer com o que apareceu. Quem decide de verdade é
 * `aplicar_recorte_visao` no backend.
 */
export function veTodosOsProjetos(usuario: Usuario | null | undefined): boolean {
  if (!usuario) return false;
  return DIRETORIA.includes(usuario.posicao) || usuario.posicao === "gerente";
}

/**
 * Pode usar o `?frente_id=` — o filtro de frente do Monitoramento e da lista
 * de projetos.
 *
 * ⚠ **Espelha `aplicar_recorte_visao` do backend, e não uma matriz.** Lá,
 * quem filtra é quem enxerga o portfólio inteiro: os três cargos de diretoria
 * OU quem tem `pode_ver_todos_projetos`. Aqui isto era
 * `filtrar_por_frente: [diretor_projetos]`, uma matriz que ficou para trás
 * duas vezes — quando a diretoria virou três cargos, e quando a visão total
 * virou caixa. O resultado era ver todos os projetos sem conseguir recortá-los.
 *
 * O gerente fica de fora de propósito: ele já é forçado nas próprias frentes
 * pelo backend, e um seletor ali só ofereceria frentes que não são dele.
 */
export function podeFiltrarPorFrente(usuario: Usuario | null | undefined): boolean {
  if (!usuario) return false;
  return DIRETORIA.includes(usuario.posicao) || usuario.permissoes.pode_ver_todos_projetos;
}

export function pode(usuario: Usuario | null | undefined, acao: Acao): boolean {
  if (!usuario) return false;
  return MATRIZ[acao].includes(usuario.posicao);
}

/**
 * Quem CONDUZ projeto: coordenador, gerente e diretoria de projetos.
 *
 * ⚠ Era `posicao !== "consultor"`, que parava de valer com a divisão da
 * diretoria: o diretor só-visualização e o de gestão de pessoas não são
 * consultores, e também não conduzem nada. Espelha `eh_lideranca` do backend.
 */
export function ehLideranca(usuario: Usuario | null | undefined): boolean {
  return (
    !!usuario &&
    (usuario.posicao === "diretor_projetos" ||
      usuario.posicao === "gerente" ||
      usuario.posicao === "coordenador")
  );
}

export const ROTULO_POSICAO: Record<Posicao, string> = {
  diretor_projetos: "Diretor(a) de Projetos",
  diretor_pessoas: "Diretor(a) de Gestão de Pessoas",
  diretor: "Diretor(a)",
  gerente: "Gerente de frente",
  coordenador: "Coordenador(a)",
  consultor: "Consultor(a)",
};

/**
 * os dois modos de sair são distintos e não podem virar um booleano só.
 * `ex_membro` sai por vontade própria ou fim de gestão e mantém o histórico;
 * `desligado` perde o acesso. Em ambos, a participação em projetos passados
 * continua íntegra.
 */
export const ROTULO_STATUS_USUARIO: Record<StatusUsuario, string> = {
  ativo: "Ativo",
  ex_membro: "Ex-membro",
  desligado: "Desligado",
};

/**
 * Coordenador e consultor enxergam só os projetos em que estão alocados —
 * para eles o menu diz "Meus projetos".
 *
 * ⚠ **Sai do RECORTE DE VISÃO, não de `ehLideranca`.** Eram a mesma pergunta
 * enquanto a diretoria era um cargo só; deixaram de ser. O diretor
 * só-visualização não conduz projeto (fora de `ehLideranca`) mas enxerga o
 * portfólio inteiro — com a regra antiga, o menu dele diria "Meus projetos"
 * sobre uma lista com todos os projetos do núcleo.
 */
export function rotuloProjetos(usuario: Usuario | null | undefined): string {
  return veTodosOsProjetos(usuario) ? "Projetos" : "Meus projetos";
}
