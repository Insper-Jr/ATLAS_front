import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Bell, Menu } from "lucide-react";
import { NotificacoesProvider, useNotificacoes } from "@/context/NotificacoesContext";
import insperJrLogo from "@/assets/insperjr.png";
import { Sidebar } from "./Sidebar";
import {
  ID_MENU_LATERAL,
  LayoutWrapper,
  Main,
  Overlay,
  MenuBotao,
  Topbar,
  TopbarEspaco,
  TopbarLogo,
  TopbarSino,
  TopbarSinoBadge,
} from "./Layout.styled";

/**
 * A barra de topo que substitui a sidebar abaixo de `lg` (o CSS a esconde no
 * desktop). Componente separado porque o sino precisa do `useNotificacoes`, e
 * o `Layout` está FORA do provider que ele mesmo monta.
 */
function TopbarMobile({ menuAberto, onAbrirMenu }: { menuAberto: boolean; onAbrirMenu: () => void }) {
  const { naoLidas } = useNotificacoes();
  const navigate = useNavigate();

  return (
    <Topbar>
      <MenuBotao
        type="button"
        onClick={onAbrirMenu}
        aria-label="Abrir menu de navegação"
        aria-expanded={menuAberto}
        aria-controls={ID_MENU_LATERAL}
      >
        <Menu size={22} />
      </MenuBotao>
      <TopbarLogo src={insperJrLogo} alt="Insper Jr." />
      <TopbarEspaco />
      {/* Vai direto para a página, não abre o painel do rodapé da sidebar: no
          celular a lista completa cabe melhor que um dropdown de 6 itens. */}
      <TopbarSino
        type="button"
        onClick={() => navigate("/notificacoes")}
        aria-label={naoLidas > 0 ? `Notificações (${naoLidas} não lidas)` : "Notificações"}
      >
        <Bell size={20} />
        {naoLidas > 0 && <TopbarSinoBadge>{naoLidas > 99 ? "99+" : naoLidas}</TopbarSinoBadge>}
      </TopbarSino>
    </Topbar>
  );
}

export function Layout() {
  // O estado do drawer mora aqui, e não na Sidebar: o Layout é o dono do shell,
  // e é ele quem tem os outros dois pedaços (topbar e overlay) que precisam
  // saber se o menu está aberto. A Sidebar só recebe `aberta`.
  const [menuAberto, setMenuAberto] = useState(false);
  const location = useLocation();

  // Fechar ao navegar. Sem isto, tocar num item deixa o menu aberto por cima da
  // página que acabou de abrir. Observar o pathname cobre TODA forma de navegar
  // (item da nav, atalho, botão voltar do navegador), não só o clique num link.
  //
  // O ajuste é no render, e não num useEffect: é o padrão do React para "trocar
  // estado quando uma entrada muda" — o React reprocessa antes de pintar, então
  // o menu nunca aparece por um quadro sobre a página nova. Num efeito, além do
  // piscada, cairia na regra react-hooks/set-state-in-effect.
  const [rotaAnterior, setRotaAnterior] = useState(location.pathname);
  if (rotaAnterior !== location.pathname) {
    setRotaAnterior(location.pathname);
    setMenuAberto(false);
  }

  // Tela nova começa no topo (2026-10-12). Sem isto a rolagem da tela
  // anterior continua valendo: no celular, depois do login, o título de
  // "Meus projetos" ficava escondido atrás da Topbar, ainda na altura em que
  // o teclado tinha empurrado a página. Só o pathname: trocar filtro na URL
  // (search) não deve jogar a pessoa pro topo.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuAberto) return;

    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === "Escape") setMenuAberto(false);
    }
    document.addEventListener("keydown", aoTeclar);

    // Trava a rolagem do fundo enquanto o menu está aberto — deslizar o dedo
    // sobre o véu não deve arrastar a página escondida atrás dele.
    // `overflowY` e não `overflow`: `index.css` define `overflow-x: clip` no
    // body de propósito, e sobrescrever os dois eixos o perderia.
    const overflowAnterior = document.body.style.overflowY;
    document.body.style.overflowY = "hidden";

    return () => {
      document.removeEventListener("keydown", aoTeclar);
      document.body.style.overflowY = overflowAnterior;
    };
  }, [menuAberto]);

  // O provider mora aqui, e não no App: o Layout só é renderizado dentro do
  // PrivateRoute, então o polling do sino nunca roda na tela de login.
  return (
    <NotificacoesProvider>
      <LayoutWrapper>
        <TopbarMobile menuAberto={menuAberto} onAbrirMenu={() => setMenuAberto(true)} />
        <Sidebar aberta={menuAberto} />
        {/* `aria-hidden`: o véu é decorativo, quem fecha por teclado usa Escape. */}
        {menuAberto && <Overlay onClick={() => setMenuAberto(false)} aria-hidden />}
        <Main>
          <Outlet />
        </Main>
      </LayoutWrapper>
    </NotificacoesProvider>
  );
}
