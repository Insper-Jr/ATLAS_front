import styled from "styled-components";
import { Link } from "react-router-dom";
import { DRAWER_ATE } from "./Layout.styled";

/**
 * Acima de `lg` é a coluna fixa de sempre. Abaixo, vira drawer: 16rem de menu
 * mais a página ao lado não cabem em 375px — sobravam ~71px de conteúdo, e era
 * essa a causa raiz do app ser inutilizável no celular.
 *
 * O estado de aberto/fechado vive no `Layout`, que é o dono do shell, e chega
 * aqui como `$aberta`. `Sidebar.tsx` só repassa a prop: a lista de navegação e
 * suas regras de permissão continuam intocadas.
 */
export const SidebarContainer = styled.aside<{ $aberta: boolean }>`
  width: 16rem;
  flex-shrink: 0;
  background: var(--background);
  border-right: 1px solid var(--sidebar-border);
  display: flex;
  flex-direction: column;
  /* sticky (e não fixed) no desktop: fica parada na viewport SEM sair do
     fluxo, então o Main continua com o offset de 16rem. fixed cobriria o
     conteúdo. No drawer (abaixo) vira fixed, porque aí a página fica atrás. */
  position: sticky;
  top: 0;
  height: 100dvh;
  /* O rodapé (perfil/notificações/sair) fica grudado embaixo da TELA, não
     embaixo do último item da navegação — por isso a coluna preenche a
     altura inteira (height: 100dvh), e é o Footer (margin-top: auto,
     abaixo) quem puxa a si mesmo pro final. Cargo com pouca navegação
     (consultor, por exemplo) sobra vão ACIMA do rodapé, e é isso mesmo: o
     rodapé continua alcançável sem rolar, que é o requisito. */
  overflow-y: auto;

  @media (max-width: ${DRAWER_ATE - 1}px) {
    /* fixed e não absolute: o menu tem de ficar parado na tela enquanto a
       página rola por baixo dele. Acima do Overlay (z 50) e da Topbar (z 40)
       — ver Layout.styled.ts. */
    position: fixed;
    top: 0;
    left: 0;
    z-index: 60;
    height: 100dvh;
    transform: translateX(${({ $aberta }) => ($aberta ? "0" : "-100%")});

    /* visibility junto com o transform: fora da tela o painel continuaria
       alcançável por Tab, e o foco desapareceria dentro de um menu fechado.
       Sendo propriedade discreta, ela só troca no fim da transição — o menu
       não pisca ao sair. */
    visibility: ${({ $aberta }) => ($aberta ? "visible" : "hidden")};
    transition: transform 200ms ease, visibility 200ms ease;
    box-shadow: var(--atlas-sombra-lg);
  }

  @media (max-width: ${DRAWER_ATE - 1}px) and (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

export const LogoContainer = styled.div`
  flex-shrink: 0;
  /* 5rem (80px), a altura da faixa do logo no GP.
     Sem variante para tela baixa de propósito: havia uma que caía para
     3.25rem em telas de até 800px de altura — a maioria dos notebooks —, e
     era ela que fazia o logo continuar menor que o do GP mesmo depois de a
     medida base ser igualada. O logo é a identidade da tela; os 27px que ela
     economizava saem da navegação, que tem rolagem própria. */
  height: 5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid var(--sidebar-border);
`;

export const LogoImg = styled.img`
  max-height: 2.5rem;
  width: auto;
  object-fit: contain;
`;

export const Nav = styled.nav`
  /* Não "flex: 1 1 auto": com a sidebar do tamanho do próprio conteúdo (ver
     SidebarContainer), o <nav> não precisa mais brigar por espaço extra —
     ele só ocupa o que os itens pedem. */
  flex: 0 1 auto;
  min-height: 0;
  padding: 0.5rem 0 0.25rem;
  display: flex;
  flex-direction: column;
  overflow-y: auto;

  @media (max-height: 800px) {
    padding: 0.35rem 0 0.15rem;
  }
`;

export const NavItem = styled(Link)<{ $isActive: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  /* min-height não existe no GP, mas fica: é o que garante alvo de toque
     razoável no drawer do celular, onde a sidebar é a navegação inteira. */
  min-height: 38px;
  padding: 0.5rem 1.5rem;
  font-size: 0.875rem;
  line-height: 1.3;
  text-decoration: none;
  color: ${({ $isActive }) => ($isActive ? "var(--destructive)" : "var(--sidebar-foreground)")};
  font-weight: ${({ $isActive }) => ($isActive ? 500 : 400)};
  transition: color 150ms ease;

  & svg {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
  }

  &:hover {
    color: var(--destructive);
  }

  @media (max-height: 800px) {
    min-height: 34px;
    padding: 6px 1.25rem;
    font-size: 14px;

    & svg {
      width: 18px;
      height: 18px;
    }
  }
`;

export const SectionLabel = styled.div`
  /* Margem FIXA entre seções — não mais "margin-top: auto". Com a sidebar
     do tamanho do conteúdo (ver SidebarContainer), não existe mais espaço
     sobrando pra repartir; um valor fixo é só a respiração normal entre
     grupos. */
  /* O GP separa os grupos só com o padding do próprio rótulo. Aqui sobra uma
     margem menor que a de antes (1.25rem): sem nenhuma, os grupos encostam,
     porque esta sidebar tem mais itens por grupo que a do GP. */
  margin-top: 0.5rem;
  padding: 0.5rem 1.5rem 0.25rem;
  font-size: 0.7rem;
  font-weight: 600;
  line-height: 1.2;
  color: var(--muted-foreground);
  text-transform: uppercase;
  letter-spacing: 0.05em;

  /* O primeiro rótulo encosta no logo se levar a folga de separação, que
     existe para afastar um grupo do grupo ANTERIOR. Aqui não há anterior. */
  &:first-child {
    margin-top: 0;
    padding-top: 8px;
  }

  @media (max-height: 800px) {
    margin-top: 0.75rem;
    padding: 10px 1.25rem 4px;

    &:first-child {
      padding-top: 4px;
    }
  }
`;

export const Footer = styled.div`
  flex-shrink: 0;
  /* Âncora do painel de notificações. Ele era posicionado contra o
     NotificacoesWrap, que ocupava a largura toda da sidebar; agora o wrap é
     um botão pequeno dentro da linha, e ancorar nele deixaria o painel do
     tamanho do sino. */
  position: relative;
  /* Puxa a si mesmo pro fim da coluna — ver o comentário no SidebarContainer.
     Como o <nav> não cresce mais (flex: 0 1 auto) nem as seções distribuem
     espaço entre si (SectionLabel tem margem fixa), este é o ÚNICO lugar da
     sidebar que reclama a sobra: um vão só, sempre no mesmo lugar. */
  margin-top: auto;
  padding-top: 0.75rem;
  padding-bottom: 0.5rem;
  border-top: 1px solid var(--sidebar-border);

  @media (max-height: 800px) {
    padding-top: 0.5rem;
    padding-bottom: 0.35rem;
  }
`;

/** A identidade no rodapé É o link para o perfil.
 *
 *  "Meu perfil" saiu da lista de navegação: procurar o próprio perfil pelo
 *  nome e pela foto é o gesto que as pessoas já têm de outras plataformas, e
 *  mantê-lo como item deixava uma linha de página no meio do trabalho do dia. */
export const UserRow = styled(Link)<{ $isActive: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  /* Cresce e encolhe: o nome pode ser longo, e é ele que cede espaço para os
     dois botões à direita, nunca o contrário. O min-width zero é o que deixa
     o text-overflow do nome funcionar dentro do flex. */
  flex: 1 1 auto;
  min-width: 0;
  text-decoration: none;
  transition: color 150ms ease;
  color: ${({ $isActive }) => ($isActive ? "var(--destructive)" : "var(--muted-foreground)")};

  &:hover {
    color: var(--destructive);
  }
`;

/** A linha única do rodapé: identidade à esquerda, ações à direita.
 *
 *  Eram três blocos empilhados (perfil, sino com rótulo "Notificações", botão
 *  "Sair"), e o rodapé ocupava altura demais para o que entrega. O GP resolve
 *  com duas linhas e nenhum avatar; aqui a compactação é maior porque nada
 *  pode sair: o perfil, o sino com o painel e o logout continuam todos aqui,
 *  só que os dois últimos viram ícone.
 *
 *  Ícone sem rótulo visível exige `aria-label` nos botões — sem isso o leitor
 *  de tela anuncia "botão" e nada mais. Ver `Sidebar.tsx`. */
export const FooterRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 1.25rem 0.5rem;

  @media (max-height: 800px) {
    padding: 0.3rem 1.25rem 0.375rem;
  }
`;

/** Os dois botões de ícone, colados à direita da linha. */
export const FooterAcoes = styled.div`
  display: flex;
  align-items: center;
  gap: 0.125rem;
  flex-shrink: 0;
`;

/** Fotinho da pessoa quando existe, iniciais quando não — ver
 *  `components/Avatar.tsx`. `overflow: hidden` é o que faz a foto (que
 *  preenche 100% x 100%) respeitar o círculo. */
export const UserAvatar = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 999px;
  background: var(--primary);
  color: var(--primary-foreground);
  font-size: 0.65rem;
  font-weight: 600;
`;

/** `inherit` e não `--muted-foreground`: a cor é decidida pelo `UserRow`, que
 *  precisa acender inteiro no hover e quando a página do perfil está aberta. */
export const UserName = styled.div`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.75rem;
  color: inherit;
`;

export const NotificacoesWrap = styled.div`
  /* Sem position: relative de propósito: quem ancora o painel agora é o
     Footer, para ele continuar com a largura da sidebar. */
  display: flex;

  /* Em mobile o sino mora na Topbar, alcançável sem abrir o menu — que é o
     ponto de uma notificação. Deixar os dois criaria duas portas para a mesma
     coisa; e o painel, que abre para CIMA a partir do rodapé, ficaria preso
     dentro do drawer que rola. Lá o sino leva direto para /notificacoes. */
  @media (max-width: ${DRAWER_ATE - 1}px) {
    display: none;
  }

`;

/** Botão de ícone do rodapé: sino e logout usam o mesmo formato.
 *
 *  Perderam o rótulo visível ("Notificações", "Sair") ao virarem ícone, então
 *  a área de clique deixou de vir do texto. 2.25rem é o alvo confortável no
 *  desktop; no drawer do celular sobe para 44px, o mínimo recomendado para
 *  toque — e lá só o logout aparece, porque o sino mora na Topbar. */
export const BotaoIconeRodape = styled.button`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 2.25rem;
  height: 2.25rem;
  border: none;
  border-radius: 0.5rem;
  background: none;
  color: var(--muted-foreground);
  cursor: pointer;
  transition: color 150ms ease, background 150ms ease;

  &:hover {
    color: var(--destructive);
    background: var(--sidebar-accent);
  }

  &:focus-visible {
    outline: 2px solid var(--ring);
    outline-offset: 2px;
  }

  @media (max-width: ${DRAWER_ATE - 1}px) {
    width: 44px;
    height: 44px;
  }
`;

export const SinoButton = BotaoIconeRodape;

export const SinoBadge = styled.span`
  /* Sobre o ícone, e não ao lado: não há mais rótulo depois do qual pousar. */
  position: absolute;
  top: 0.125rem;
  right: 0.125rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1rem;
  height: 1rem;
  padding: 0 0.25rem;
  border-radius: 9999px;
  background: var(--destructive);
  color: var(--primary-foreground);
  font-size: 0.65rem;
  font-weight: 600;
`;

export const NotificacoesPainel = styled.div`
  /* Ancorado no Footer (ver lá), então o bottom de 100% o abre para CIMA a
     partir do rodapé inteiro, e não de dentro do botão do sino. */
  position: absolute;
  bottom: calc(100% + 0.375rem);
  left: 1rem;
  right: 1rem;
  max-height: 20rem;
  overflow-y: auto;
  border: 1px solid var(--sidebar-border);
  border-radius: 0.75rem;
  background: var(--card);
  box-shadow: var(--atlas-sombra-lg);
  z-index: 20;
`;

export const NotificacaoItem = styled.button<{ $lida: boolean }>`
  display: block;
  width: 100%;
  text-align: left;
  padding: 0.625rem 0.875rem;
  border: none;
  border-bottom: 1px solid var(--sidebar-border);
  background: ${({ $lida }) => ($lida ? "none" : "color-mix(in srgb, var(--destructive) 6%, transparent)")};
  color: var(--card-foreground);
  font-size: 0.75rem;
  line-height: 1.4;
  cursor: pointer;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: var(--muted);
  }
`;

/** A ponte do painel para a página. O painel mostra as primeiras e não tem
 *  espaço para filtro por tipo nem "marcar todas", é lá que essas ações
 *  moram. */
export const VerTodas = styled.button`
  display: block;
  width: 100%;
  padding: 0.5rem 0.875rem;
  border: none;
  border-top: 1px solid var(--sidebar-border);
  background: none;
  color: var(--muted-foreground);
  font-size: 0.72rem;
  font-weight: 600;
  text-align: center;
  cursor: pointer;

  &:hover {
    color: var(--destructive);
  }
`;

export const NotificacaoVazia = styled.p`
  margin: 0;
  padding: 0.875rem;
  font-size: 0.75rem;
  color: var(--muted-foreground);
`;

/** @deprecated Mantido só enquanto algo fora da sidebar ainda o importe.
 *  No rodapé, o logout usa `BotaoIconeRodape`. */
export const LogoutButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.625rem;
  width: 100%;
  min-height: 38px;
  padding: 7px 1.25rem;
  font-size: 15px;
  color: var(--sidebar-foreground);
  background: none;
  border: none;
  cursor: pointer;
  transition: color 150ms ease;

  & svg {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
  }

  &:hover {
    color: var(--destructive);
  }

  @media (max-height: 800px) {
    min-height: 34px;
    padding: 6px 1.25rem;
    font-size: 14px;

    & svg {
      width: 18px;
      height: 18px;
    }
  }
`;
