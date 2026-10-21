import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { TemaProvider } from "@/context/TemaContext";
import { Toasts } from "@/components/Toasts";
import { PrivateRoute } from "@/routes/PrivateRoute";
import { AdminRoute } from "@/routes/AdminRoute";
import { FormularioRoute } from "@/routes/FormularioRoute";
import { RequirePosicao } from "@/routes/RequirePosicao";
import { Layout } from "@/components/Layout";
import { Login } from "@/pages/Login";
import { EsqueciSenha } from "@/pages/EsqueciSenha";
import { RedefinirSenha } from "@/pages/RedefinirSenha";
import { AprovacaoContratual } from "@/pages/AprovacaoContratual";
import { ContratosPainel } from "@/pages/ContratosPainel";
import { IdentidadeInstitucional } from "@/pages/IdentidadeInstitucional";
import { Sabatina } from "@/pages/sabatina/Sabatina";
import { SabatinaConfig } from "@/pages/sabatina/SabatinaConfig";
import { ArquivoContratos } from "@/pages/arquivo-contratos/ArquivoContratos";
import { Institucional } from "@/pages/institucional/Institucional";
import { Comunicados } from "@/pages/comunicados/Comunicados";
import { DefinirSenha } from "@/pages/DefinirSenha";
import { Desempenho } from "@/pages/Desempenho";
import { Bancas } from "@/pages/Bancas";
import { MeuPerfil } from "@/pages/MeuPerfil";
import { Vagas } from "@/pages/Vagas";
import { CalendarioGeral } from "@/pages/CalendarioGeral";
import { Membros } from "@/pages/Membros";
import { Notificacoes } from "@/pages/Notificacoes";
import { Avaliacoes } from "@/pages/Avaliacoes";
import { CalendariosBase } from "@/pages/CalendariosBase";
import { Config } from "@/pages/Config";
import { ProjetosList } from "@/pages/projetos/ProjetosList";
import { ProjetoNovo } from "@/pages/projetos/ProjetoNovo";
import { ProjetoPage } from "@/pages/projetos/ProjetoPage";
import { ProjetoVisaoGeral } from "@/pages/projetos/ProjetoVisaoGeral";
import { ProjetoCronograma } from "@/pages/projetos/ProjetoCronograma";
import { ProjetoBanca } from "@/pages/projetos/ProjetoBanca";
import { ProjetoHistorico } from "@/pages/projetos/ProjetoHistorico";
import { HealthTrack } from "@/pages/health-track/HealthTrack";
import { HealthTrackProjeto } from "@/pages/health-track/HealthTrackProjeto";
import { DocumentoContratualPage } from "@/pages/projetos/DocumentoContratualPage";
import { ProjetoTarefas } from "@/pages/projetos/ProjetoTarefas";
import { MonitoramentoLayout } from "@/pages/monitoramento/MonitoramentoLayout";
import { VisaoGeralAba } from "@/pages/monitoramento/VisaoGeralAba";
import { AprovacoesAba } from "@/pages/monitoramento/AprovacoesAba";
import { ExecucaoAba } from "@/pages/monitoramento/ExecucaoAba";
import { AlocacaoAba } from "@/pages/monitoramento/AlocacaoAba";
import { AtrasosAba } from "@/pages/monitoramento/AtrasosAba";
import { GraficosAba } from "@/pages/monitoramento/GraficosAba";
import { HistoricoAba } from "@/pages/monitoramento/HistoricoAba";
import { AvaliacaoDesempenhoHub } from "@/pages/avaliacao-desempenho/AvaliacaoDesempenhoHub";
import { MeuRelatorio } from "@/pages/avaliacao-desempenho/MeuRelatorio";
import { MeusMentorados } from "@/pages/avaliacao-desempenho/MeusMentorados";
import { PainelDesempenho } from "@/pages/avaliacao-desempenho/painel/PainelDesempenho";
import { PainelAvaliacoes } from "@/pages/avaliacao-desempenho/painel/PainelAvaliacoes";
import { PainelRelatorio } from "@/pages/avaliacao-desempenho/painel/PainelRelatorio";
import { PainelLotes } from "@/pages/avaliacao-desempenho/painel/PainelLotes";
import { PainelPdi } from "@/pages/avaliacao-desempenho/painel/PainelPdi";
import { PainelFormularios } from "@/pages/avaliacao-desempenho/painel/PainelFormularios";
import { GestaoPessoas } from "@/pages/gestao-pessoas/GestaoPessoas";
import { PontosCategoria } from "@/pages/gestao-pessoas/PontosCategoria";
import { HistoricoRelatorios } from "@/pages/gestao-pessoas/HistoricoRelatorios";
import { MeusPontos } from "@/pages/MeusPontos";
import { TarefasGeraisAba } from "@/pages/monitoramento/TarefasGeraisAba";
import { CronogramasGeraisAba } from "@/pages/monitoramento/CronogramasGeraisAba";
import { MENTORES_ELEGIVEIS } from "@/utils/permissoes";

export default function App() {
  return (
    <BrowserRouter>
      <TemaProvider>
      <AuthProvider>
        <Routes>
          {/* A home é /projetos: é o que a pessoa abre todo dia. */}
          <Route path="/" element={<Navigate to="/projetos" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/esqueci-senha" element={<EsqueciSenha />} />
          {/* Pública e obrigatoriamente ACIMA do catch-all: é o destino do link
              que vai no e-mail, e quem clica nele está justamente sem conseguir
              logar. Caindo no `*` iria para /projetos e de lá para /login. */}
          <Route path="/redefinir-senha" element={<RedefinirSenha />} />
          {/* Pública: quem recebe o link de aprovação (o representante do
              cliente) não tem conta no ATLAS. Ver `aprovacao_contratual.py`
              no backend — o token de uso único é a única credencial. */}
          <Route path="/aprovacao/:token" element={<AprovacaoContratual />} />
          <Route element={<PrivateRoute />}>
            {/* Primeiro acesso: dentro do PrivateRoute (exige sessão) e
                FORA do Layout, quem ainda não definiu a senha não deve ver o
                menu de uma plataforma que o backend recusa a servir. */}
            <Route path="/definir-senha" element={<DefinirSenha />} />
            {/* Arquivo de contratos (2026-10-07): layout próprio, sem a barra
                lateral, por isso fora do Layout. Quem entra é quem tem a caixa. */}
            <Route element={<AdminRoute permissao="pode_acessar_arquivo_contratos" />}>
              <Route path="/arquivo-contratos" element={<ArquivoContratos />} />
            </Route>
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<Desempenho />} />
              <Route path="/bancas" element={<Bancas />} />
              {/* A cédula da sabatina: qualquer pessoa logada; o backend só aceita
                  voto de quem estava entre os eleitores na abertura. */}
              <Route path="/sabatina" element={<Sabatina />} />
                <Route path="/meu-perfil" element={<MeuPerfil />} />
              {/* /calendario agora agrega os 4 tipos (§6.5); a visão
                  só-de-bancas foi RELOCADA para /bancas/calendario, intacta. */}
              {/* /calendario agrega os 4 tipos; a página só-de-bancas
                  foi removida, o filtro "Banca" aqui já cobre o mesmo caso
                  de uso ("calendário pra não sobrepor horários") sem
                  duplicar a tela. */}
              <Route path="/calendario" element={<CalendarioGeral />} />

              {/* Sem guard: todo perfil tem notificação. O que muda
                  é o conteúdo, e quem recorta isso é o backend. */}
              <Route path="/notificacoes" element={<Notificacoes />} />

              <Route path="/projetos" element={<ProjetosList />} />
              {/* Sem guard: o backend já recorta as linhas por vendedor/
                  coordenador/diretoria/Jurídico/`pode_elaborar_*`
                  (`PainelContratualUseCase`) — quem não se encaixa em nada
                  disso só vê a lista vazia, não precisa de 403 aqui. */}
              <Route path="/contratos" element={<ContratosPainel />} />
              {/* ⭐ 2026-09-21 — a página do documento é standalone, fora da
                  aba do projeto: não herda cabeçalho/abas/avisos de
                  `ProjetoPage` (que não fazem sentido pra quem chega pela
                  Kanban de Contratos), e não depende de um projeto de
                  verdade existir por trás (contrato institucional). */}
              <Route path="/contratos/:documentoId" element={<DocumentoContratualPage />} />
              <Route path="/vagas" element={<Vagas />} />
              {/* Criar projeto é a caixa de permissão `pode_criar_projeto` —
                  a mesma que decide o botão em `ProjetosList` e que o backend
                  já checava (`require_pode_criar_projeto`). Guard por posição
                  aqui travava quem tinha a caixa delegada sem ser
                  diretor/gerente: via o botão, clicava, e caía numa rota que
                  não deixava entrar. "Arquivados" não é rota própria, é só a
                  mesma <ProjetosList /> com outro recorte de conteúdo
                  (?modo=arquivados), travada por dentro com a permissão
                  `arquivar_projeto`. */}
              <Route element={<AdminRoute permissao="pode_criar_projeto" />}>
                <Route path="/projetos/novo" element={<ProjetoNovo />} />
              </Route>
              {/* Abas como sub-rotas: é o que deixa uma notificação abrir
                  direto em /projetos/42/tarefas. */}
              <Route path="/projetos/:id" element={<ProjetoPage />}>
                <Route index element={<ProjetoVisaoGeral />} />
                <Route path="cronograma" element={<ProjetoCronograma />} />
                <Route path="banca" element={<ProjetoBanca />} />
                <Route path="tarefas" element={<ProjetoTarefas />} />
                <Route path="historico" element={<ProjetoHistorico />} />
              </Route>

              {/* Health Track fora do projeto (2026-10-08, a pedido da
                  diretoria): coordenador e consultor não veem, então não
                  pode ser aba do projeto. Página própria, atrás da caixa. */}
              <Route element={<AdminRoute permissao="pode_ver_health_track" />}>
                <Route path="/health-track" element={<HealthTrack />} />
                <Route path="/health-track/projetos/:id" element={<HealthTrackProjeto />} />
              </Route>

              {/* monitoramento é por CARGO (`pode_ver_monitoramento`), não
                  por posição, mesma caixa que a Sidebar já lê pra decidir se
                  mostra o link. Guardar por posição aqui deixava o link
                  visível pra quem tivesse a permissão de cargo mas não fosse
                  literalmente diretor/gerente, e a rota chutava pra
                  /projetos ao clicar. O backend revalida com require_gestao. */}
              <Route element={<AdminRoute permissao="pode_ver_monitoramento" />}>
                <Route path="/monitoramento" element={<MonitoramentoLayout />}>
                  <Route index element={<VisaoGeralAba />} />
                  {/* Só a diretoria decide, o backend cobra
                      `require_diretor` na rota; o guard aqui evita a tela
                      vazia com 403 para quem chega pela URL. */}
                  <Route path="aprovacoes" element={<AprovacoesAba />} />
                  <Route path="execucao" element={<ExecucaoAba />} />
                  <Route path="alocacao" element={<AlocacaoAba />} />
                  <Route path="atrasos" element={<AtrasosAba />} />
                  <Route path="graficos" element={<GraficosAba />} />
                <Route path="historico" element={<HistoricoAba />} />
                  <Route path="tarefas" element={<TarefasGeraisAba />} />
                  <Route path="cronogramas" element={<CronogramasGeraisAba />} />
                </Route>
              </Route>

              {/* Avaliação de Desempenho (periódica/finalização), não
                  confundir com /avaliacoes (feedback de banca) nem com
                  /dashboard (Desempenho.tsx, % de bancas atendidas).
                  Sem guard por posição (2026-10-06, corrigido): quem
                  responde é quem está em `projeto_membro` como
                  coordenador/consultor, e isso independe da posição (um
                  gerente pode coordenar um projeto). A fila vem do
                  backend; quem não tem nada vê a tela vazia. */}
              <Route path="/avaliacao-desempenho" element={<AvaliacaoDesempenhoHub />} />

              {/* Sem guard e sem link em nenhum menu, igual já era antes do
                  hub existir: ninguém vê o próprio relatório de desempenho,
                  só o mentor vê o do mentorado (`MeusMentorados`, mais
                  abaixo) e a diretoria/gerência vê tudo pelo painel admin. */}
              <Route path="/avaliacao-desempenho/relatorio" element={<MeuRelatorio />} />

              {/* Mentoria fica de propósito FORA do hub acima — vínculo
                  independente do projeto, escolhido pela diretoria, sem
                  relação com o processo de avaliação (ver
                  `AvaliacaoDesempenhoHub`). Mentor pode ser coordenador,
                  gerente ou diretor (2026-08-06). */}
              <Route element={<RequirePosicao posicoes={MENTORES_ELEGIVEIS} />}>
                <Route path="/avaliacao-desempenho/mentorados" element={<MeusMentorados />} />
              </Route>

              <Route element={<AdminRoute permissao="pode_administrar_desempenho" />}>
                <Route path="/avaliacao-desempenho/painel" element={<PainelDesempenho />}>
                  {/* Avaliações é a primeira aba da barra — a entrada padrão
                      segue a mesma ordem, senão o painel abre numa aba que
                      não é a primeira visualmente. */}
                  <Route index element={<Navigate to="avaliadores" replace />} />
                  <Route path="relatorio" element={<PainelRelatorio />} />
                  <Route path="avaliadores" element={<PainelAvaliacoes />} />
                  <Route path="avaliados" element={<PainelAvaliacoes />} />
                  <Route path="avaliacoes" element={<Navigate to="avaliadores" replace />} />
                  <Route path="lotes" element={<PainelLotes />} />
                  <Route path="pdi" element={<PainelPdi />} />
                </Route>
              </Route>

              {/* Fora do shell do painel acima, sem o TabBar do resto do
                  painel. Editar os formulários é mais sensível que administrar
                  lotes/PDI (muda o que todo mundo é avaliado), então tem
                  caixa de cargo própria. */}
              <Route element={<AdminRoute permissao="pode_editar_formularios_desempenho" />}>
                <Route path="/avaliacao-desempenho/painel/formularios" element={<PainelFormularios />} />
              </Route>

              {/* Esconder o item na Sidebar não protege a rota: sem estes
                  guards, digitar /membros na barra de endereço abre a tela. */}
              <Route element={<FormularioRoute />}>
                <Route path="/avaliacoes" element={<Avaliacoes />} />
              </Route>
              {/* Config edita as permissões de qualquer posição, inclusive
                  esta mesma caixa, então é a mais sensível das 4
                  estendidas. Calendários base entrou junto por já viver na
                  mesma trava antes. */}
              {/* Gestão de Pessoas (2026-10-21): pontos por obrigações e por
                  desempenho, histórico e relatórios. A gaveta do membro abre
                  dentro da própria página, sem rota. */}
              <Route element={<AdminRoute permissao="pode_gerir_gestao_pessoas" />}>
                <Route path="/gestao-pessoas" element={<GestaoPessoas />}>
                  <Route index element={<Navigate to="obrigacoes" replace />} />
                  <Route path="obrigacoes" element={<PontosCategoria categoria="obrigacoes" />} />
                  <Route path="desempenho" element={<PontosCategoria categoria="desempenho" />} />
                  <Route path="historico" element={<HistoricoRelatorios />} />
                </Route>
              </Route>
              {/* Sem guard: todo mundo vê os próprios pontos. */}
              <Route path="/meus-pontos" element={<MeusPontos />} />
              {/* Abre pra quem administra o catálogo OU pra quem só configura
                  a Gestão de Pessoas; a página recorta as seções por caixa. */}
              <Route
                element={
                  <AdminRoute permissao={["pode_administrar_configuracoes", "pode_configurar_gestao_pessoas"]} />
                }
              >
                <Route path="/config" element={<Config />} />
              </Route>
              {/* Calendários base saiu da caixa de Configurações em
                  2026-09-02: mexer no calendário do Insper muda o cálculo de
                  dias úteis de todo projeto, e não tem relação com editar o
                  catálogo de escopos e frentes. */}
              <Route element={<AdminRoute permissao="pode_gerir_calendarios_base" />}>
                <Route path="/calendarios-base" element={<CalendariosBase />} />
              </Route>
              <Route element={<AdminRoute permissao="pode_gerir_membros" />}>
                <Route path="/membros" element={<Membros />} />
              </Route>
              {/* ⭐ 2026-09-22 — a pedido: era hardcoded pra diretor_projetos
                  (quem assina PELA Insper Jr), virou caixa delegável. */}
              <Route element={<AdminRoute permissao="pode_editar_identidade_institucional" />}>
                <Route path="/identidade-institucional" element={<IdentidadeInstitucional />} />
              </Route>
              {/* Sabatina (2026-10-05): montar, abrir, fechar e apurar. Caixa
                  que nasce marcada pra diretoria;
                  `require_pode_acessar_configuracoes_sabatina` no backend. */}
              <Route element={<AdminRoute permissao="pode_acessar_configuracoes_sabatina" />}>
                <Route path="/sabatina/config" element={<SabatinaConfig />} />
              </Route>
              {/* Institucional (2026-10-09): o que a diretoria publica no site
                  da Insper Jr (ex-membros em destaque, por enquanto). Caixa que
                  nasce marcada só pra diretoria; `require_pode_acessar_
                  institucional` no backend. */}
              <Route element={<AdminRoute permissao="pode_acessar_institucional" />}>
                <Route path="/institucional" element={<Institucional />} />
              </Route>
              {/* Comunicados (2026-10-12): sino + e-mail pra um recorte de
                  pessoas. Caixa `pode_enviar_comunicados`, que nasce marcada
                  só pra diretoria. */}
              <Route element={<AdminRoute permissao="pode_enviar_comunicados" />}>
                <Route path="/comunicados" element={<Comunicados />} />
              </Route>
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toasts />
      </AuthProvider>
      </TemaProvider>
    </BrowserRouter>
  );
}
