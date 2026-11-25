import { useCallback, useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getPendenciasCentral, type Pendencias } from "@/lib/central";
import { PageButton, PageHeader, PageHeaderText, PageStack, PageSubtitle, PageTitle } from "@/styles/page.styled";
import { Contador, ContadorAlerta } from "./Central.styled";
import { TabBar, TabLink } from "@/pages/avaliacao-desempenho/painel/Painel.styled";
import { ModalIndicacao } from "./ModalIndicacao";
import type { CentralContexto } from "./contexto";

/**
 * Central de Conhecimento (2026-10-29): projetos que se destacaram e as
 * metodologias, ferramentas e fontes que saíram deles. A página carrega as
 * pendências (que decidem quais abas de gestão aparecem) e repassa às abas.
 * O modal de indicação vive aqui porque abre de qualquer aba.
 */
export function Central() {
  const { token, usuario } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // O botão "Nova indicação" é da Tool Box; nas outras abas não faz sentido.
  const naToolBox = location.pathname.replace(/\/$/, "").endsWith("/toolbox");
  const [pendencias, setPendencias] = useState<Pendencias | null>(null);
  const [indicando, setIndicando] = useState(false);
  const [versao, setVersao] = useState(0);
  const recarregarPendencias = useCallback(async () => {
    if (!token) return;
    try {
      setPendencias(await getPendenciasCentral(token));
    } catch {
      setPendencias(
        (atual) =>
          atual ?? {
            decide_pertinencia: false,
            gere: false,
            coordena_projetos: false,
            arquivamentos_pendentes: 0,
            exige_arquivamento: false,
            fichas_existentes: [],
            pertinencia: [],
            revisao_periodica: [],
            revisao: [],
          },
      );
    }
  }, [token]);

  useEffect(() => {
    // Função local, não chamada direta: o lint lê setState no corpo do
    // efeito como cascata de render (mesmo padrão do AuthContext).
    async function aoAbrir() {
      await recarregarPendencias();
    }
    aoAbrir();
  }, [recarregarPendencias]);

  const contexto: CentralContexto = {
    pendencias,
    recarregarPendencias,
    abrirIndicacao: () => setIndicando(true),
    versao,
  };

  const pertinencia = pendencias?.pertinencia.length ?? 0;
  const revisao = (pendencias?.revisao.length ?? 0) + (pendencias?.revisao_periodica?.length ?? 0);
  return (
    <PageStack>
      <PageHeader>
        <PageHeaderText>
          <PageTitle style={{ fontSize: "1.75rem" }}>Central de Conhecimento</PageTitle>
          <PageSubtitle style={{ maxWidth: "110ch" }}>
            O que os projetos da Insper Jr. aprenderam e vale reaproveitar: fichas da Tool Box, projetos de referência,
            método e capacitação.
          </PageSubtitle>
          <PageSubtitle style={{ maxWidth: "110ch", marginTop: "0.5rem", fontSize: "0.8125rem" }}>
            Ao acessar esta aba, você declara estar ciente dos termos assinados no Termo de Voluntariado e se compromete a
            não divulgar nenhum destes materiais a qualquer pessoa, organização ou entidade externa à Insper Jr.
          </PageSubtitle>
        </PageHeaderText>
        {naToolBox && usuario?.permissoes.pode_ver_central_conhecimento && (
          <PageButton type="button" onClick={() => setIndicando(true)} style={{ whiteSpace: "nowrap", flexShrink: 0, alignSelf: "flex-start" }}>
            <Plus size={16} />
            Nova indicação
          </PageButton>
        )}
      </PageHeader>
      <TabBar>
        <TabLink to="/central/toolbox">Tool Box</TabLink>
        <TabLink to="/central/referencias">Projetos de referência</TabLink>
        <TabLink to="/central/metodo">Método</TabLink>
        <TabLink to="/central/capacitacao">Capacitação</TabLink>
        <TabLink to="/central/recursos">Recursos externos</TabLink>
        <TabLink to="/central/minhas">Meu perfil</TabLink>
        {pendencias?.coordena_projetos && (
          <TabLink to="/central/projetos">
            Meus projetos
            {(pendencias.arquivamentos_pendentes ?? 0) > 0 && <ContadorAlerta>{pendencias.arquivamentos_pendentes}</ContadorAlerta>}
          </TabLink>
        )}
        {pendencias?.decide_pertinencia && (
          <TabLink to="/central/pertinencia">
            Pertinência
            {pertinencia > 0 ? <ContadorAlerta>{pertinencia}</ContadorAlerta> : <Contador>0</Contador>}
          </TabLink>
        )}
        {pendencias?.gere && (
          <TabLink to="/central/revisao">
            Revisão final
            {revisao > 0 ? <ContadorAlerta>{revisao}</ContadorAlerta> : <Contador>0</Contador>}
          </TabLink>
        )}
        {pendencias?.gere && <TabLink to="/central/painel">Painel</TabLink>}
      </TabBar>

      <Outlet context={contexto} />

      {indicando && (
        <ModalIndicacao
          onFechar={() => setIndicando(false)}
          onIndicada={async (ficha) => {
            setIndicando(false);
            setVersao((v) => v + 1);
            await recarregarPendencias();
            navigate(`/central/fichas/${ficha.id}`);
          }}
        />
      )}
    </PageStack>
  );
}
