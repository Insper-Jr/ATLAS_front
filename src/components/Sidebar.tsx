import { Fragment, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useTema } from "@/context/TemaContext";
import { useNotificacoes } from "@/context/NotificacoesContext";
import { rotuloProjetos } from "@/utils/permissoes";
import { ordenarPor } from "@/lib/menu-ordem";
import { GRUPOS, navItems, type NavItemConfig } from "./sidebar-itens";
import { getNotificacoes, marcarNotificacaoLida } from "@/lib/notificacoes";
import { getMinhasEleicoes } from "@/lib/sabatina";
import { getMinhaFila } from "@/lib/desempenho-avaliacoes";
import type { Notificacao } from "@/types/notificacao";
import insperJrLogo from "@/assets/insperjr.png";
import { Bell, Moon, Sun, LogOut } from "lucide-react";
import { FotoCircular } from "@/components/Avatar";
import { ID_MENU_LATERAL } from "./Layout.styled";
import {
  SidebarContainer,
  LogoContainer,
  LogoImg,
  Nav,
  NavItem,
  SectionLabel,
  Footer,
  UserRow,
  UserAvatar,
  UserName,
  BotaoIconeRodape,
  FooterAcoes,
  FooterRow,
  NotificacoesWrap,
  SinoButton,
  SinoBadge,
  NotificacoesPainel,
  NotificacaoItem,
  NotificacaoVazia,
  VerTodas,
} from "./Sidebar.styled";


/** "Ana Souza" -> "AS". Só entra em jogo quando a pessoa não tem foto. */
function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}



interface SidebarProps {
  /** Só tem efeito abaixo de `lg`, onde a sidebar é um drawer que desliza. No
   *  desktop ela é sempre visível e a prop é ignorada pelo CSS. Quem controla é
   *  o `Layout` — ver `SidebarContainer` no .styled. */
  aberta?: boolean;
}

export function Sidebar({ aberta = false }: SidebarProps) {
  const { usuario, token, logout } = useAuth();
  const { temaAtual, setPreferencia } = useTema();
  // O contador vem do contexto, não desta lista: ele é atualizado a cada ~60s
  // e também pela página /notificacoes. Contar `notificacoes.filter(...)` aqui
  // deixaria o badge congelado no que foi carregado quando o painel abriu.
  const { naoLidas, recarregar } = useNotificacoes();
  const location = useLocation();
  const navigate = useNavigate();
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [painelAberto, setPainelAberto] = useState(false);
  const notificacoesRef = useRef<HTMLDivElement>(null);
  // "Sabatina" no menu depende de haver eleição aberta pra mim. Consulta
  // leve, refeita a cada 5 minutos. Era a cada minuto E a cada troca de
  // rota (2026-10-06): com a fila de desempenho junto, virava dezenas de
  // queries por pessoa a cada clique, num pool de 5 conexões no servidor.
  const [temSabatina, setTemSabatina] = useState(false);
  // Mesma ideia pra fila de avaliação de desempenho: quem não é coordenador
  // nem consultor de posição ainda pode ter o que responder.
  const [temFilaDesempenho, setTemFilaDesempenho] = useState(false);
  const usuarioId = usuario?.id;
  const posicao = usuario?.posicao;

  useEffect(() => {
    if (!token) return;
    let ativo = true;
    const consultar = () => {
      getMinhasEleicoes(token)
        .then((lista) => {
          if (ativo) setTemSabatina(lista.length > 0);
        })
        .catch(() => {
          /* sem rede ou sem permissão: o item só não aparece */
        });
      // Pra coordenador/consultor a posição já decide; a consulta só vale
      // pras outras posições.
      if (usuarioId != null && posicao !== "coordenador" && posicao !== "consultor") {
        getMinhaFila(usuarioId, token)
          .then((fila) => {
            if (ativo) setTemFilaDesempenho(fila.length > 0);
          })
          .catch(() => {
            /* idem */
          });
      }
    };
    void consultar();
    const timer = window.setInterval(consultar, 5 * 60_000);
    return () => {
      ativo = false;
      window.clearInterval(timer);
    };
  }, [token, usuarioId, posicao]);

  // Clicar em qualquer lugar fora fecha o painel. Antes só o próprio sino
  // fechava, e quem abria por engano tinha de achar o botão de novo para se
  // livrar dele — num painel que cobre parte da navegação, isso é atrito.
  //
  // O mesmo padrão de `SelectCustom` e `MultiSelect`: `mousedown` em vez de
  // `click` para o painel sumir junto com o gesto, e o `contains` cobre o
  // botão E o painel, porque os dois vivem dentro do mesmo wrap. Clicar no
  // sino continua alternando — o mousedown cai dentro do wrap e é ignorado,
  // e o click que vem depois faz o toggle de sempre.
  useEffect(() => {
    if (!painelAberto) return;
    function aoClicarFora(evento: MouseEvent) {
      if (notificacoesRef.current?.contains(evento.target as Node)) return;
      setPainelAberto(false);
    }
    document.addEventListener("mousedown", aoClicarFora);
    return () => document.removeEventListener("mousedown", aoClicarFora);
  }, [painelAberto]);

  // Só busca a lista quando o painel abre. O sino sozinho precisa apenas do
  // número, e esse já vem do contexto por uma rota bem mais barata.
  useEffect(() => {
    if (!painelAberto || !token) return;
    getNotificacoes(token)
      .then((lista) => setNotificacoes(lista.itens))
      .catch(() => setNotificacoes([]));
  }, [painelAberto, token]);

  async function abrirNotificacao(notificacao: Notificacao) {
    if (!notificacao.lida && token) {
      try {
        await marcarNotificacaoLida(token, notificacao);
        setNotificacoes((lista) =>
          lista.map((n) => (n.chave === notificacao.chave ? { ...n, lida: true } : n)),
        );
        recarregar();
      } catch {
        // Silencioso: marcar como lida é conveniência, não vale travar a UI.
      }
    }
    // Cada item abre DIRETO na rota do problema, é para isso que as abas do
    // projeto são sub-rotas.
    if (notificacao.rota) {
      setPainelAberto(false);
      navigate(notificacao.rota);
    }
  }

  const itensVisiveis = navItems.filter((item) => {
    if (item.visivelDinamico === "sabatina") return temSabatina;
    if (item.visivelDinamico === "fila_desempenho" && temFilaDesempenho) return true;
    if (item.visiblePorPosicao) {
      return !!usuario && item.visiblePorPosicao(usuario);
    }
    if (!item.visible) return true;
    if (!usuario?.permissoes) return false;
    return item.visible(usuario.permissoes);
  });

  // Dois itens de prefixo podem casar com a mesma rota (ex.: "Avaliação de
  // Desempenho" em "/avaliacao-desempenho" e o painel admin dela em
  // "/avaliacao-desempenho/painel"), só o path mais específico deve
  // acender, senão os dois ficam vermelhos ao mesmo tempo.
  const itemAtivo = itensVisiveis.reduce<NavItemConfig | null>((melhor, item) => {
    const corresponde = item.prefixo
      ? location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)
      : location.pathname === item.path;
    if (!corresponde) return melhor;
    if (!melhor || item.path.length > melhor.path.length) return item;
    return melhor;
  }, null);

  return (
    <SidebarContainer id={ID_MENU_LATERAL} $aberta={aberta} aria-label="Navegação principal">
      <LogoContainer>
        <LogoImg src={insperJrLogo} alt="Insper Jr." />
      </LogoContainer>

      <Nav>
        {ordenarPor(GRUPOS, (g) => g.chave, usuario?.menu_ordem?.grupos).map((grupo) => {
          const itensDoGrupo = ordenarPor(
            itensVisiveis.filter((item) => item.grupo === grupo.chave),
            (item) => item.path,
            usuario?.menu_ordem?.itens?.[grupo.chave],
          );
          // Grupo sem nenhum item visível não desenha rótulo: é o que faz um
          // consultor não ver "Gestão" e "Sistema" vazios pendurados na lista.
          if (itensDoGrupo.length === 0) return null;
          return (
            <Fragment key={grupo.chave}>
              <SectionLabel>{grupo.rotulo}</SectionLabel>
              {itensDoGrupo.map((item) => (
                <NavItem key={item.path} to={item.path} $isActive={item === itemAtivo}>
                  <item.icon size={20} />
                  <span>{item.path === "/projetos" ? rotuloProjetos(usuario) : item.label}</span>
                </NavItem>
              ))}
            </Fragment>
          );
        })}
      </Nav>

      <Footer>
        {/* Uma linha só: identidade à esquerda, ações à direita. Eram três
            blocos empilhados, e o rodapé ocupava altura demais para o que
            entrega. Nada saiu — o sino e o logout viraram ícone. */}
        <FooterRow>
          {/* A identidade É o link para o perfil — ver `UserRow` no .styled. */}
          {usuario && (
            <UserRow to="/meu-perfil" $isActive={location.pathname === "/meu-perfil"} title="Meu perfil">
              <UserAvatar>
                {usuario.foto ? <FotoCircular src={usuario.foto} /> : iniciais(usuario.nome)}
              </UserAvatar>
              <UserName>{usuario.nome}</UserName>
            </UserRow>
          )}
          <FooterAcoes>
            {/* Atalho do modo noturno. Clicar fixa o modo oposto ao de agora,
                o que desliga o automático (pôr/nascer do sol); ele volta em
                Meu perfil, no card Aparência. */}
            <BotaoIconeRodape
              type="button"
              onClick={() => setPreferencia(temaAtual === "escuro" ? "claro" : "escuro")}
              aria-label={temaAtual === "escuro" ? "Modo claro" : "Modo escuro"}
              title={temaAtual === "escuro" ? "Modo claro" : "Modo escuro"}
            >
              {temaAtual === "escuro" ? <Sun size={18} /> : <Moon size={18} />}
            </BotaoIconeRodape>
        <NotificacoesWrap ref={notificacoesRef}>
          <SinoButton
            type="button"
            onClick={() => setPainelAberto((v) => !v)}
            aria-expanded={painelAberto}
            /* O rótulo "Notificações" saiu da tela quando o botão virou
               ícone; sem isto o leitor de tela anuncia só "botão". */
            aria-label="Notificações"
            title="Notificações"
          >
            <Bell size={18} />
            {/* 99+ em vez do número cru: acima disso o badge fica maior que o
                próprio ícone. */}
            {naoLidas > 0 && <SinoBadge>{naoLidas > 99 ? "99+" : naoLidas}</SinoBadge>}
          </SinoButton>
          {painelAberto && (
            <NotificacoesPainel role="menu">
              {notificacoes.length === 0 && <NotificacaoVazia>Nenhuma notificação ainda.</NotificacaoVazia>}
              {/* O painel mostra as primeiras; filtro por tipo e "marcar todas"
                  ficam na página, que é onde há espaço para eles. */}
              {notificacoes.slice(0, 6).map((notificacao) => (
                <NotificacaoItem
                  // `chave` e não `id`: condição derivada não tem linha no
                  // banco, e portanto não tem id.
                  key={notificacao.chave}
                  type="button"
                  $lida={notificacao.lida}
                  onClick={() => abrirNotificacao(notificacao)}
                >
                  {notificacao.titulo}
                </NotificacaoItem>
              ))}
              <VerTodas
                type="button"
                onClick={() => {
                  setPainelAberto(false);
                  navigate("/notificacoes");
                }}
              >
                Ver todas
              </VerTodas>
            </NotificacoesPainel>
          )}
        </NotificacoesWrap>
            <BotaoIconeRodape onClick={logout} type="button" aria-label="Sair" title="Sair">
              <LogOut size={18} />
            </BotaoIconeRodape>
          </FooterAcoes>
        </FooterRow>
      </Footer>
    </SidebarContainer>
  );
}
