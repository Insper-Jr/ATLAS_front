/**
 * As permissões da tabela do  (9 das 10, "aprovar reajuste" saiu em
 * 2026-08-06 junto com a feature de reajuste, removida) + as 4 que a
 * estenderam depois. Editáveis por POSIÇÃO (`GET /posicoes-permissoes`) —
 * até 2026-08-07 eram editáveis por um catálogo de "cargo" separado, que
 * foi removido: a distinção não sobrevivia ao uso real (dava pra marcar uma
 * caixa "Admin" numa pessoa sem isso mudar quais projetos ela via).
 * ("Ver o Núcleo" existiu brevemente como uma extensão a mais, mas a página
 * em si foi substituída pelo Dashboard Bancas antes de a permissão chegar a
 * ser usada.)
 */
export interface Permissoes {
  /** 1. Criar projeto e alocar equipe */
  pode_criar_projeto: boolean;
  /** 2. Editar a equipe de um projeto */
  pode_editar_equipe: boolean;
  /** 3. Gerir membros (posição e status) */
  pode_gerir_membros: boolean;
  /** 4. Marcar kickoff e data de entrega */
  pode_marcar_kickoff: boolean;
  /** 5. Definir cronograma por escopo (etapas, banca) */
  pode_definir_cronograma: boolean;
  // `pode_aprovar_reajuste` foi removido: decidir os pedidos de dias é
  // da POSIÇÃO diretor, não de uma caixa de cargo. O backend derrubou a coluna
  // na migration 1556cc590a06, e a rota cobra `require_diretor`.
  /** 7. Criar tarefa */
  pode_criar_tarefa: boolean;
  /** 8. Mover e editar tarefa */
  pode_mover_editar_tarefa: boolean;
  /** 9. Ver os próprios projetos */
  pode_ver_proprios_projetos: boolean;
  /** 10. Monitoramento e alocação */
  pode_ver_monitoramento: boolean;
  /** Administrar a Avaliação de Desempenho (lotes, avaliadores, mentoria, PDI). */
  pode_administrar_desempenho: boolean;
  /** Editar os formulários de Avaliação de Desempenho, mais sensível que
   *  administrar, porque muda o que todo mundo é avaliado. */
  pode_editar_formularios_desempenho: boolean;
  /** O catálogo de Configurações: escopos, frentes, combinações e semestres.
   *
   *  ⚠ Já foi maior. Editar as permissões e mexer nos calendários base saíram
   *  daqui em 2026-09-02 (`pode_administrar_permissoes` e
   *  `pode_gerir_calendarios_base`): eram três trabalhos de riscos bem
   *  diferentes debaixo de uma caixa só. */
  pode_administrar_configuracoes: boolean;
  /** ⭐ Editar as permissões de todas as posições — inclusive a própria. A
   *  mais sensível de todas: quem a tem pode conceder ou tirar qualquer
   *  caixa de qualquer posição. A auto-escalada ainda exige já tê-la. */
  pode_administrar_permissoes: boolean;
  /** Calendários base: dias não letivos, importação do PDF do Insper e o
   *  nome dos calendários de cada frente. */
  pode_gerir_calendarios_base: boolean;
  /** A aba Histórico do Monitoramento: o portfólio encerrado. Leitura pura;
   *  era `require_gestao` (diretoria de projetos + gerente) por posição. */
  pode_ver_historico_projetos: boolean;
  /** O board macro de tarefas, todos os projetos juntos. Leitura pura. */
  pode_ver_tarefas_gerais: boolean;
  /** O board macro de cronogramas. Leitura pura. */
  pode_ver_cronogramas_gerais: boolean;
  /** Criar, renomear, reordenar e apagar coluna do kanban. Criar e mover
   *  tarefa já eram caixa; só o redesenho da coluna seguia por posição. */
  pode_configurar_colunas: boolean;
  /** Responder a fila de Aprovações: pedido de dias de ajuste, exceção de
   *  choque e banca fora da janela.
   *
   *  ⚠ Não cobre as seis linhas da fila. "Atrasos sem justificativa" é
   *  escrito por quem conduz o projeto, e "solicitações de entrada" são
   *  respondidas por quem o coordena — as duas aparecem lá como cobrança,
   *  não como decisão da diretoria. */
  pode_aprovar_pedidos: boolean;
  /** O Dashboard Bancas (`/avaliacoes`): notas por pergunta, histórico de
   *  bancas e os formulários de banca. Era travada em `diretor_projetos` pela
   *  matriz de `utils/permissoes.ts`, fora desta interface — delegar a leitura
   *  das notas exigia promover a pessoa a diretora de projetos inteira.
   *
   *  ⚠ Não confundir com `pode_editar_formularios_desempenho`: aquele é o
   *  formulário da Avaliação de Desempenho, este é o da banca. */
  pode_ver_dashboard_bancas: boolean;
  /** A única caixa que muda QUAIS projetos aparecem, as outras nunca tocam
   *  no recorte de visão (coordenador/consultor continuam só vendo onde
   *  estão alocados mesmo com todas marcadas). Quem tem esta é tratado como
   *  diretor só para fins de visão de projetos. */
  pode_ver_todos_projetos: boolean;
  /** ⭐ 2026-09-16 — substitui o antigo `usuario.coordenador_vendas`/`bdr`
   *  soltos. Quem tem esta caixa (na posição base ou no `cargo_extra` da
   *  pessoa) aparece na lista "quem vendeu o projeto". */
  pode_responsavel_por_vendas: boolean;
  /** Continua contando como liderança (vai à banca, soma no total), mas não
   *  cobre `min_lideranca`/`min_membros` da FRENTE em que está cadastrado. */
  pode_coordenar_vendas: boolean;
  /** ⭐ 2026-09-18 — as caixas da integração com a Contratos. "Criar
   *  documento"/"enviar ao cliente" não têm caixa própria: reaproveitam
   *  `pode_criar_projeto` e `pode_responsavel_por_vendas`. */
  /** ⭐ 2026-09-22 — a aprovação jurídica de verdade (fecha a revisão
   *  interna). `pode_editar_documento_juridico`/`pode_marcar_documento_
   *  assinado` foram removidas no mesmo pedido: quem já elabora/gerencia o
   *  contrato (`pode_elaborar_contratos_proprios`/`pode_elaborar_qualquer_
   *  contrato`, ou diretoria) também edita o texto pós-confirmação e marca
   *  como assinado — não precisava de caixa à parte pra cada ação. */
  pode_aprovar_contrato_internamente: boolean;
  /** Quem assina PELA Insper Jr — antes só diretoria de projetos, agora
   *  delegável. */
  pode_editar_identidade_institucional: boolean;
  /** Acessar a aba Contratos (vê tudo) e elaborar documento jurídico só dos
   *  projetos em que a própria pessoa é vendedora. */
  pode_elaborar_contratos_proprios: boolean;
  /** Mesma coisa, sem o recorte por vendedor — qualquer projeto. */
  pode_elaborar_qualquer_contrato: boolean;
  /** 2026-10-07 — o Health Track inteiro: a aba do projeto e a regra do
   *  status geral em Configurações. Nasce só no diretor de projetos.
   *  Preencher e editar a regra continuam com as regras próprias por baixo
   *  desta caixa (o backend decide, ver `pode_preencher`). */
  pode_ver_health_track: boolean;
  /** Abre "Configuração de Sabatina" (pesos, eleições, apuração). Nasce
   *  marcada pra diretoria. Votar não depende disto. */
  pode_acessar_configuracoes_sabatina: boolean;
  /** Arquivo de contratos: a pasta compartilhada com os contratos assinados
   *  e o que for importado. A diretoria escolhe quem entra. */
  pode_acessar_arquivo_contratos: boolean;
  /** Institucional (2026-10-09): a aba do que a diretoria publica no SITE
   *  da Insper Jr — hoje os ex-membros em destaque. Nasce marcada só pra
   *  diretoria. A leitura pelo site é pública e não passa por aqui. */
  pode_acessar_institucional: boolean;
  /** Comunicados (2026-10-11): sino + e-mail pra um recorte de pessoas
   *  (0 bancas, pendentes de um lote, inscritos de uma banca, por posição,
   *  todo mundo, escolhidos à mão). Nasce marcada só pra diretoria. */
  pode_enviar_comunicados: boolean;
}

/**
 * O cargo de uma pessoa na plataforma.
 *
 * Até 2026-09-16 eram 6 valores fechados (união literal, `posicao_usuario`
 * no backend), e o comentário aqui avisava: acrescentar um valor quebrava a
 * compilação de todo `Record<Posicao, ...>` incompleto, de propósito.
 *
 * ⚠ Desde a migration `a9cae5c30c6d` o backend trocou aquele ENUM fechado por
 * um catálogo (`posicao_permissao`, ver `PosicaoPermissao` abaixo): a
 * diretoria cria e apaga cargo pela tela de Configurações
 * (`POST`/`DELETE /posicoes-permissoes`). `Posicao` virou `string` para
 * caber um cargo novo, e a rede de exhaustividade que os `Record<Posicao,...>`
 * tinham (`DIRETORIA`, `MATRIZ` em `utils/permissoes.ts`, `ROTULO_POSICAO`
 * abaixo) SAIU — é o preço aceito da decisão: um cargo criado pela tela
 * nasce só com as caixas de `Permissoes` que a diretoria marcar, e não entra
 * em nenhuma dessas listas de identidade (não é elegível a mentor, não
 * enxerga o portfólio inteiro, etc.). Os 6 valores de sempre continuam
 * literais dentro dessas listas — só o TIPO parou de fechar o conjunto.
 */
export type Posicao = string;

/** Os 6 cargos que a plataforma sempre teve — os únicos que entram em
 *  `DIRETORIA`, `MATRIZ` e companhia (`utils/permissoes.ts`). Um cargo novo
 *  criado pela tela nunca está aqui. */
export type PosicaoPadrao =
  | "diretor_projetos"
  | "diretor_pessoas"
  | "diretor"
  | "gerente"
  | "coordenador"
  | "consultor";

/** Uma linha de `GET /posicoes-permissoes`: as caixas de UMA posição, mais o
 *  rótulo mostrado na tela e se é um dos 6 cargos padrão (só esses podem ser
 *  apagados — ver `e_padrao`). */
export interface PosicaoPermissao extends Permissoes {
  posicao: Posicao;
  /** O rótulo mostrado na tela — "Vendas", "Diretor(a) de Projetos" etc. */
  nome: string;
  /** Um dos 6 cargos que a plataforma sempre teve. A tela de Configurações
   *  não deixa apagar nem editar o nome desses — ver o docstring de
   *  `PosicaoPermissaoModel` no backend. */
  e_padrao: boolean;
  /** ⭐ 2026-09-22 — a pedido: decidido na criação do cargo (não é uma
   *  permissão de ação, é sobre como ele se combina com outros). Se
   *  `true`, pode ser escolhido como `cargo_extra` de qualquer pessoa,
   *  além da posição principal dela — soma permissões, não substitui.
   *  Exemplo dado pela diretoria: "consultor" não seria sobreponível (é
   *  sempre posição base); "bdr"/"adm jurídico" seriam. */
  sobreponivel: boolean;
}

/** , sair por vontade própria (ex_membro) é diferente de ser desligado. */
export type StatusUsuario = "ativo" | "ex_membro" | "desligado";

export interface Usuario {
  id: number;
  nome: string;
  email_insper: string;
  permissoes: Permissoes;
  posicao: Posicao;
  /** Cargo extra opcional — suas permissões já vêm somadas (OU lógico) em
   *  `permissoes` acima, ver `mesclarPermissoes` em `lib/posicoes-permissoes.ts`.
   *  Guardado aqui à parte só pra telas que precisam mostrar o cargo em si
   *  (ex.: Membros), não pra recalcular permissão. */
  cargo_extra: Posicao | null;
  status: StatusUsuario;
  ativo: boolean;
  /**
   * A senha atual é a provisória que veio no e-mail de cadastro, e a pessoa
   * ainda não escolheu a dela. Enquanto for `true`, o `PrivateRoute` manda
   * para `/definir-senha`, e o backend recusa qualquer outra rota com 403.
   */
  senha_provisoria: boolean;
  /** Data URI já redimensionada, ou `null` para cair nas iniciais — ver
   *  `src/components/Avatar.tsx`. */
  foto: string | null;
  /** Tipos de notificação que a pessoa desligou do e-mail. Vazio (o padrão)
   *  = tudo ligado. Só os tipos opcionais podem entrar aqui — ver
   *  TIPOS_NOTIFICACAO_OPCIONAIS no backend. */
  notificacoes_email_desativadas: string[];
}

export interface UsuarioFrente {
  id: number;
  usuario_id: number;
  frente_id: number;
}

export interface UsuarioResumo {
  id: number;
  nome: string;
  email_insper: string;
  posicao: Posicao;
  status: StatusUsuario;
  ativo: boolean;
  /** 2026-09-16 — substitui os antigos `coordenador_vendas`/`bdr`. A pessoa
   *  pode acumular duas posições: a principal (`posicao`) e esta, opcional —
   *  qualquer cargo marcado `sobreponivel` no catálogo (⭐ 2026-09-22,
   *  generalizado). `null` pra quase todo mundo. */
  cargo_extra: string | null;
  /** Computado no backend (posição base OU `cargo_extra`, permissão
   *  `pode_responsavel_por_vendas`) — quem tem isto entra na lista "quem
   *  vendeu o projeto" do cadastro. */
  responsavel_por_vendas: boolean;
  /** 1º a 8º semestre da graduação, `null` pra quem não é aluno em curso
   *  (diretoria, gerência já formada etc). */
  semestre_graduacao: number | null;
  /** Ainda não fez o primeiro acesso, a tela de Membros marca essas linhas. */
  senha_provisoria: boolean;
  /**
   * Carga atual da pessoa: projetos em que ela está alocada hoje,
   * sem contar os finalizados nem os arquivados.
   */
  projetos_alocados: number;
  foto: string | null;
}
