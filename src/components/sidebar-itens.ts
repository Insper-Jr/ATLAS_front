// O catálogo do menu lateral, fora do componente para a tela de
// Configurações (ordem do menu) poder importar sem carregar o Sidebar.
import { BarChart3, FolderKanban, ClipboardList, Calendar, CalendarCog, Users, ClipboardCheck, Settings, Star, GraduationCap, UserPlus, Landmark, FileSignature, Vote, ListChecks, HeartPulse, Globe, Megaphone, Flag, Gauge } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Usuario } from "@/types/auth";

type UsuarioLogado = Usuario;
import { DIRETORIA, pode } from "@/utils/permissoes";

/**
 * Os blocos da navegação, na ordem em que aparecem.
 *
 * ⭐ Esta lista é a ÚNICA fonte da ordem e dos rótulos. O agrupamento não vem
 * mais da posição do item em `navItems` — vem do campo `grupo`. Antes o
 * rótulo "Administração" nascia de uma comparação com o item anterior
 * (`visibleItems[index - 1]?.section !== "admin"`), então quem inserisse um
 * item no meio do array, ou reordenasse, desmanchava as seções sem erro
 * nenhum aparecer. Aconteceu.
 *
 * A divisão responde a "que pergunta esta pessoa veio fazer":
 *
 * - **Trabalho** — o dia a dia de quem executa projeto;
 * - **Desempenho** — avaliação e mentoria, que são ciclo próprio, não tarefa;
 * - **Gestão** — olhar o núcleo de cima (quem está atrasado, quem é membro);
 * - **Sistema** — configurar a plataforma.
 *
 * Gestão e Sistema eram uma seção só, "Administração", com seis itens. Elas
 * respondem a perguntas diferentes: a diretoria varria a lista inteira para
 * achar Configurações no fim.
 */
export const GRUPOS = [
  { chave: "trabalho", rotulo: "Trabalho" },
  { chave: "desempenho", rotulo: "Desempenho" },
  { chave: "gestao", rotulo: "Gestão" },
  { chave: "sistema", rotulo: "Sistema" },
] as const;

export type ChaveGrupo = (typeof GRUPOS)[number]["chave"];

export interface NavItemConfig {
  icon: LucideIcon;
  label: string;
  path: string;
  /** Em que bloco o item aparece. OBRIGATÓRIO de propósito: quem adicionar um
   *  item novo e não escolher grupo leva erro de compilação, em vez de um item
   *  silenciosamente no lugar errado. É o que impede a bagunça de voltar. */
  grupo: ChaveGrupo;
  /** Marca o item como ativo também nas sub-rotas (ex.: /projetos/42/tarefas). */
  prefixo?: boolean;
  /** Visibilidade por PERMISSÃO (da posição, ver `types/auth.ts`). */
  visible?: (permissoes: UsuarioLogado["permissoes"]) => boolean;
  /** Visibilidade por POSIÇÃO direto, pra regra que não é uma caixa
   *  de permissão, como o item de Monitoramento restrito a certas posições. */
  visiblePorPosicao?: (usuario: UsuarioLogado) => boolean;
  /** Visibilidade por DADO do servidor, não por quem a pessoa é: a aba
   *  "Sabatina" só existe enquanto há eleição aberta em que ela vota;
   *  "Avaliação de Desempenho" aparece pra quem tem algo na fila, seja qual
   *  for a posição. Quando o item também tem `visiblePorPosicao`, o dado
   *  SOMA à posição (um OU), não substitui. */
  visivelDinamico?: "sabatina" | "fila_desempenho";
}

// A ordem DENTRO desta lista só decide a ordem dentro do próprio grupo — o
// bloco em que cada item cai vem do campo `grupo`, não da posição aqui.
export const navItems: NavItemConfig[] = [
  // O rótulo é definido no componente: para coord e consultor é "Meus
  // projetos", porque eles só enxergam onde estão alocados.
  { icon: FolderKanban, label: "Projetos", path: "/projetos", grupo: "trabalho", prefixo: true },
  {
    icon: FileSignature,
    label: "Contratos",
    path: "/contratos",
    grupo: "trabalho",
    // Aproximação: o backend recorta por LINHA (vendedor/coordenador do
    // projeto, além de diretoria/`pode_elaborar_*`, que são globais) — não
    // tem como saber aqui "sou vendedor de algum projeto" sem uma chamada
    // extra só pra decidir se mostra o item.
    // `pode_criar_projeto`/`pode_responsavel_por_vendas` já é a mesma
    // dupla que abre o Contrato de Prestação (ver docstring de
    // `_pode_abrir_documento` no back). Diretoria já tem
    // `pode_criar_projeto` = true.
    visible: (c) =>
      c.pode_criar_projeto ||
      c.pode_responsavel_por_vendas ||
      c.pode_elaborar_contratos_proprios ||
      c.pode_elaborar_qualquer_contrato,
  },
  { icon: ClipboardList, label: "Bancas", path: "/bancas", grupo: "trabalho" },
  // Sem trava: a página serve os dois lados e decide o que mostrar pelas
  // flags que o back manda, consultor pede para entrar, quem coordena ou
  // monta equipe responde aos pedidos.
  { icon: UserPlus, label: "Vagas em projetos", path: "/vagas", grupo: "trabalho" },
  { icon: Calendar, label: "Calendário", path: "/calendario", grupo: "trabalho" },
  // A cédula da sabatina (2026-10-05): aparece só enquanto houver eleição
  // aberta pra pessoa votar. Em "Gestão", a pedido; a configuração fica em
  // "Sistema", pra diretoria.
  { icon: Vote, label: "Sabatina", path: "/sabatina", grupo: "gestao", visivelDinamico: "sabatina" },
  {
    icon: Star,
    label: "Avaliação de Desempenho",
    path: "/avaliacao-desempenho",
    grupo: "desempenho",
    prefixo: true,
    // Coordenador e consultor sempre; qualquer outra posição só quando a
    // fila dela tem algo (2026-10-06, corrigido: um gerente de posição pode
    // ser coordenador de projeto em `projeto_membro`, e a regra antiga
    // assumia que gerente nunca entrava nessa tabela). Diretor sem fila
    // segue sem ver dois botões "Avaliação de Desempenho" na sidebar.
    visiblePorPosicao: (u) => u.posicao === "coordenador" || u.posicao === "consultor",
    visivelDinamico: "fila_desempenho",
  },
  {
    icon: GraduationCap,
    label: "Meus Mentorados",
    path: "/avaliacao-desempenho/mentorados",
    grupo: "desempenho",
    // Vínculo independente do projeto, escolhido pela diretoria — mentor
    // pode ser coordenador, gerente ou diretor (2026-08-06). Fica FORA do
    // item "Avaliação de Desempenho" de propósito: mentoria não é processo
    // de avaliação, é acompanhamento; juntar os dois também colidia com o
    // rótulo do painel admin, que a diretoria já vê.
    visiblePorPosicao: (u) => pode(u, "ser_mentor"),
  },
  // Os próprios pontos da Gestão de Pessoas (2026-10-21). Diretoria não
  // pontua, então não tem o item.
  {
    icon: Gauge,
    label: "Meus Pontos",
    path: "/meus-pontos",
    grupo: "desempenho",
    visiblePorPosicao: (u) => !DIRETORIA.includes(u.posicao),
  },
  // "Meu perfil" NÃO é item de navegação: o acesso é pelo nome e pela foto no
  // rodapé, que já estão lá. Notificações também não — o sino do rodapé mostra
  // as últimas sem trocar de página. Nos dois casos, ter item E atalho seria
  // duas portas para a mesma coisa.
  {
    icon: BarChart3,
    label: "Monitoramento",
    path: "/monitoramento",
    grupo: "gestao",
    prefixo: true,
    visible: (c) => c.pode_ver_monitoramento,
  },
  {
    icon: HeartPulse,
    label: "Health Track",
    path: "/health-track",
    grupo: "gestao",
    prefixo: true,
    // Caixa que nasce marcada só pra diretor de projetos (2026-10-08, a
    // pedido): coordenador e consultor não veem. Espelha
    // `require_pode_ver_health_track` no backend.
    visible: (c) => c.pode_ver_health_track,
  },
  {
    icon: Users,
    label: "Membros",
    path: "/membros",
    grupo: "gestao",
    visible: (c) => c.pode_gerir_membros,
  },
  {
    icon: Flag,
    label: "Gestão de Pessoas",
    path: "/gestao-pessoas",
    grupo: "gestao",
    prefixo: true,
    // Pontos por obrigações e por desempenho (2026-10-21). Espelha
    // `require_pode_gerir_gestao_pessoas` no backend.
    visible: (c) => c.pode_gerir_gestao_pessoas,
  },
  {
    icon: ClipboardCheck,
    label: "Dashboard Bancas",
    path: "/avaliacoes",
    grupo: "gestao",
    visible: (c) => c.pode_ver_dashboard_bancas,
  },
  {
    icon: Star,
    label: "Avaliação de Desempenho",
    path: "/avaliacao-desempenho/painel",
    grupo: "gestao",
    prefixo: true,
    visible: (c) => c.pode_administrar_desempenho,
  },
  {
    icon: CalendarCog,
    label: "Calendários base",
    path: "/calendarios-base",
    grupo: "sistema",
    visible: (c) => c.pode_gerir_calendarios_base,
  },
  {
    icon: Landmark,
    label: "Identidade Institucional",
    path: "/identidade-institucional",
    grupo: "sistema",
    // ⭐ 2026-09-22 — a pedido: era hardcoded pra diretor_projetos
    // (`eh_diretoria_de_projetos` no back), virou caixa delegável.
    visible: (c) => c.pode_editar_identidade_institucional,
  },
  {
    icon: Settings,
    label: "Configurações",
    path: "/config",
    grupo: "sistema",
    // Também pra quem só configura a Gestão de Pessoas: a página recorta
    // as seções por caixa.
    visible: (c) => c.pode_administrar_configuracoes || c.pode_configurar_gestao_pessoas,
  },
  {
    icon: ListChecks,
    label: "Configuração de Sabatina",
    path: "/sabatina/config",
    grupo: "sistema",
    // Caixa que nasce marcada pra diretoria. Espelha
    // `require_pode_acessar_configuracoes_sabatina` no backend. Ficou
    // escondida de 2026-10-06 a 2026-10-08, até a diretoria liberar.
    visible: (c) => c.pode_acessar_configuracoes_sabatina,
  },
  {
    icon: Globe,
    label: "Institucional",
    path: "/institucional",
    grupo: "sistema",
    // O que a diretoria publica no SITE da Insper Jr (2026-10-09, a pedido):
    // hoje os ex-membros em destaque; outras seções do site entram aqui
    // depois. Caixa que nasce marcada só pra diretoria. Espelha
    // `require_pode_acessar_institucional` no backend.
    visible: (c) => c.pode_acessar_institucional,
  },
  {
    icon: Megaphone,
    label: "Comunicados",
    path: "/comunicados",
    grupo: "sistema",
    // Sino + e-mail pra um recorte de pessoas (2026-10-12, a pedido: aba
    // própria). Espelha `require_pode_enviar_comunicados` no backend.
    visible: (c) => c.pode_enviar_comunicados,
  },
];

/** O que a tela de Configurações lista para reordenar: tudo, inclusive o que
 *  o usuário logado não vê. "Avaliação de Desempenho" aparece duas vezes de
 *  propósito, é um caminho por grupo (fila em Desempenho, painel em Gestão). */
export const GRUPOS_DO_MENU = GRUPOS;
export const CATALOGO_DO_MENU = navItems.map((item) => ({ label: item.label, path: item.path, grupo: item.grupo }));
