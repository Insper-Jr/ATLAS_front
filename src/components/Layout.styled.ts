import styled from "styled-components";
import { theme } from "@/styles/theme";

/** Acima deste ponto a sidebar é fixa na tela; abaixo, vira drawer. É o mesmo
 *  `lg` do tema, nomeado aqui porque `Sidebar.styled` precisa do MESMO valor —
 *  se os dois divergirem, sobra um intervalo de larguras em que a topbar e a
 *  sidebar aparecem juntas, ou em que nenhuma das duas aparece. */
export const DRAWER_ATE = theme.breakpoints.lg;

/** O `id` do aside, apontado pelo `aria-controls` do botão do menu. Vive aqui,
 *  e não no `Layout.tsx`, porque `Sidebar.tsx` também precisa dele — e importar
 *  do `Layout.tsx` fecharia um ciclo (é ele que importa a `Sidebar`). */
export const ID_MENU_LATERAL = "menu-lateral";

/** Altura da Topbar. Como ela é `fixed`, este valor é também o `padding-top`
 *  que o `Main` precisa reservar — daí ser uma constante, e não um número
 *  repetido nos dois lugares. */
const TOPBAR_ALTURA = "3.5rem";

export const LayoutWrapper = styled.div`
  display: flex;
  min-height: 100vh;
`;

export const Main = styled.main`
  flex: 1;
  /* Sem isso, um filho com largura mínima grande (o grid do kanban de
     projetos, por exemplo) empurra o Main inteiro pra ficar mais largo em
     vez de rolar internamente, e a página toda passa a arrastar pro lado,
     cabeçalho junto. */
  min-width: 0;
  padding: 1.5rem;
  background: var(--sidebar);
  min-height: 100vh;

  @media (max-width: ${DRAWER_ATE - 1}px) {
    /* O padding lateral some quase todo: em 375px, 1.5rem de cada lado comem
       13% da largura útil. E o topo abre espaço para a Topbar fixa. */
    padding: calc(${TOPBAR_ALTURA} + ${theme.spacing.md}) 0.75rem 2rem;
  }
`;

/* ─── Chrome de mobile: topbar, botão do menu e overlay ──────────────────── */

/**
 * A barra que substitui a sidebar abaixo de `lg`.
 *
 * É `fixed` e não `sticky` porque o `Main` é irmão dela, não pai: com sticky
 * ela rolaria para fora junto com o conteúdo. O `Main` compensa a altura dela
 * com o `padding-top` acima.
 */
export const Topbar = styled.header`
  display: none;

  @media (max-width: ${DRAWER_ATE - 1}px) {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 40;
    display: flex;
    align-items: center;
    gap: ${theme.spacing.sm};
    height: ${TOPBAR_ALTURA};
    padding: 0 0.75rem;
    background: var(--background);
    border-bottom: 1px solid var(--sidebar-border);
  }
`;

export const TopbarLogo = styled.img`
  max-height: 28px;
  width: auto;
  object-fit: contain;
`;

/** Empurra o sino para a direita, isolando-o do botão do menu — os dois juntos
 *  num canto só viram um alvo ambíguo para o polegar. */
export const TopbarEspaco = styled.div`
  flex: 1;
`;

export const MenuBotao = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  /* 44px: o mínimo confortável para o polegar, e este é o botão mais usado da
     navegação inteira no celular. */
  width: 2.75rem;
  height: 2.75rem;
  flex-shrink: 0;
  border: none;
  border-radius: ${theme.borderRadius.md};
  background: transparent;
  color: var(--sidebar-foreground);
  cursor: pointer;

  &:hover {
    background: var(--muted);
  }

  &:focus-visible {
    outline: 2px solid var(--ring);
    outline-offset: -2px;
  }
`;

/** O sino da topbar. Herda o alvo de 44px do `MenuBotao`; o `relative` é a
 *  âncora do contador. Em mobile ele leva DIRETO para /notificacoes em vez de
 *  abrir o painel do rodapé da sidebar — ver `NotificacoesWrap`. */
export const TopbarSino = styled(MenuBotao)`
  position: relative;
`;

/** Só o número, sem rótulo: na topbar não há largura para "Notificações", e o
 *  ícone do sino já diz do que se trata. */
export const TopbarSinoBadge = styled.span`
  position: absolute;
  top: 0.25rem;
  right: 0.25rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.05rem;
  height: 1.05rem;
  padding: 0 0.25rem;
  border-radius: 9999px;
  background: var(--destructive);
  color: var(--primary-foreground);
  font-size: 0.6rem;
  font-weight: 600;
  line-height: 1;
`;

/**
 * O véu atrás do drawer. Fecha ao toque, que é como quase todo mundo espera
 * sair de um menu lateral — antes de procurar um X.
 */
export const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 50;
  background: ${theme.colors.veu};

  @media (min-width: ${DRAWER_ATE}px) {
    display: none;
  }
`;
