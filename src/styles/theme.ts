/** Breakpoints para media queries (use max-width para mobile-first) */
export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
} as const;

/**
 * Cada cor é uma variável CSS; os valores (claro e escuro) moram em
 * `tema.css`, e o `<html data-theme>` decide qual vale (`context/TemaContext`).
 * Por isso nada aqui pode ser lido como número: quem precisar de opacidade usa
 * `alpha`, quem precisar misturar usa `color-mix`.
 */
export const theme = {
  breakpoints,
  colors: {
    // Base colors
    background: 'var(--atlas-background)',
    foreground: 'var(--atlas-foreground)',

    // Card
    card: 'var(--atlas-card)',
    cardForeground: 'var(--atlas-card-foreground)',

    // Popover (dropdowns, selects)
    popover: 'var(--atlas-popover)',
    popoverForeground: 'var(--atlas-popover-foreground)',

    // Primary - Red accent
    primary: 'var(--atlas-primary)',
    primaryForeground: 'var(--atlas-primary-foreground)',

    // Secondary - Light gray
    secondary: 'var(--atlas-secondary)',
    secondaryForeground: 'var(--atlas-secondary-foreground)',

    // Muted
    muted: 'var(--atlas-muted)',
    mutedForeground: 'var(--atlas-muted-foreground)',

    // Accent - Same as primary (red)
    accent: 'var(--atlas-accent)',
    accentForeground: 'var(--atlas-accent-foreground)',

    // Destructive
    destructive: 'var(--atlas-destructive)',
    destructiveForeground: 'var(--atlas-destructive-foreground)',

    // Success
    success: 'var(--atlas-success)',
    successForeground: 'var(--atlas-success-foreground)',

    // Warning, atenção: o texto sobre warning é ESCURO, não branco
    warning: 'var(--atlas-warning)',
    warningForeground: 'var(--atlas-warning-foreground)',

    // Info
    info: 'var(--atlas-info)',
    infoForeground: 'var(--atlas-info-foreground)',

    // Borders
    border: 'var(--atlas-border)',
    input: 'var(--atlas-input)',
    ring: 'var(--atlas-ring)',

    // Sidebar
    sidebarBackground: 'var(--atlas-sidebar-background)',
    sidebarForeground: 'var(--atlas-sidebar-foreground)',
    sidebarPrimary: 'var(--atlas-sidebar-primary)',
    sidebarAccent: 'var(--atlas-sidebar-accent)',
    sidebarBorder: 'var(--atlas-sidebar-border)',

    // O véu atrás de modal, drawer e painel lateral; mais fechado no escuro.
    veu: 'var(--atlas-veu)',
  },

  /**
   * Opacidade sobre uma cor do tema.
   *
   * NÃO concatene sufixo hex numa string de cor (`${primary}1A`): as cores são
   * `var(--atlas-…)` e o resultado nem é cor CSS. `alpha(theme.colors.primary, 0.1)`
   * resolve via `color-mix`, que aceita a variável e segue o modo noturno.
   */
  alpha: (cor: string, opacidade: number) =>
    `color-mix(in srgb, ${cor} ${+(opacidade * 100).toFixed(2)}%, transparent)`,

  /**
   * Texto numa cor de paleta (status de projeto, tipo de evento, urgência)
   * sobre fundo escuro. Essas cores foram escolhidas para fundo branco e as
   * mais fechadas somem no modo noturno. No claro devolve a própria cor
   * (`--atlas-clareio` é 0%); no escuro mistura um tanto de branco.
   */
  clarear: (cor: string) => `color-mix(in srgb, white var(--atlas-clareio), ${cor})`,

  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
  },

  borderRadius: {
    sm: '0.25rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    full: '9999px',
  },

  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
    '4xl': '2.25rem',
  },

  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },

  // Mais fortes no escuro (ver `tema.css`): sombra preta sobre fundo preto some.
  shadows: {
    sm: 'var(--atlas-sombra-sm)',
    md: 'var(--atlas-sombra-md)',
    lg: 'var(--atlas-sombra-lg)',
  },

  transitions: {
    fast: '150ms ease-in-out',
    normal: '200ms ease-in-out',
    slow: '300ms ease-in-out',
  },

  /**
   * A escala de empilhamento, cinco degraus e nada entre eles.
   *
   * O app tem portal (`SelectCustom`), cabeçalho de tabela `sticky`, barra de
   * filtros e modal convivendo na mesma tela. Sem uma escala, cada um chuta um
   * número, o chute vira `9999`, e o próximo elemento precisa de `10000` —
   * até alguém descobrir que `z-index` não atravessa contexto de empilhamento
   * e o número grande nunca foi o problema.
   *
   * `base` é o piso de quem só precisa passar por cima do irmão (cabeçalho de
   * tabela sobre as linhas). `sticky` é a barra que acompanha a rolagem.
   * `popover` é o que abre por cima do conteúdo sem bloqueá-lo (listbox do
   * select, popover de datas). `modal` é o que bloqueia a tela. `toast` é o
   * aviso passageiro de canto (`<Toasts />`): passa por cima do modal porque
   * a ação que ele confirma costuma ter sido disparada de dentro de um.
   */
  zIndex: {
    base: 10,
    sticky: 20,
    popover: 30,
    modal: 50,
    toast: 60,
  },
};

export type Theme = typeof theme;
