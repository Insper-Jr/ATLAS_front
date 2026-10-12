import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { apiFetch } from "@/lib/api";
import { getPosicoesPermissoes, mesclarPermissoes } from "@/lib/posicoes-permissoes";
import { desativarPush, sincronizarPush } from "@/lib/push";
import { ehCelular } from "@/utils/dispositivo";
import type { Usuario, Permissoes, Posicao, StatusUsuario } from "@/types/auth";

// A API devolve `posicao` solto em /auth/me, sem as 13 caixas de permissão
// dela aninhadas, por isso buscamos as permissões à parte (por posição,
// desde 2026-08-07, antes era por `cargo_id`) e montamos o Usuario completo
// aqui.
interface UsuarioResponse {
  id: number;
  nome: string;
  email_insper: string;
  posicao: Posicao;
  /** Cargo extra opcional, soma permissões à posição base — ver
   *  `UsuarioResumo.cargo_extra` em `types/auth.ts`. */
  cargo_extra: Posicao | null;
  status: StatusUsuario;
  ativo: boolean;
  /** Primeiro acesso pendente, ver `Usuario.senha_provisoria`. */
  senha_provisoria: boolean;
  foto: string | null;
  notificacoes_email_desativadas: string[];
}

interface AuthContextType {
  usuario: Usuario | null;
  token: string | null;
  carregando: boolean;
  login: (email: string, senha: string) => Promise<void>;
  /**
   * Relê `/auth/me` sem relogar. Existe para um caso só: acabei de definir a
   * minha senha e preciso que `senha_provisoria` caia AQUI, senão o
   * `PrivateRoute` me devolve para a tela que eu acabei de concluir.
   */
  recarregarUsuario: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

/** Permissões de mentira, todas as caixas desmarcadas, só pra existir
 *  enquanto `senha_provisoria` for true. O PrivateRoute não deixa nada além
 *  de /definir-senha acontecer nesse estado, então nenhuma delas chega a ser
 *  lida de verdade. */
const PERMISSOES_PLACEHOLDER: Permissoes = {
  pode_criar_projeto: false,
  pode_editar_equipe: false,
  pode_gerir_membros: false,
  pode_marcar_kickoff: false,
  pode_definir_cronograma: false,
  pode_criar_tarefa: false,
  pode_mover_editar_tarefa: false,
  pode_ver_proprios_projetos: false,
  pode_ver_monitoramento: false,
  pode_administrar_desempenho: false,
  pode_editar_formularios_desempenho: false,
  pode_administrar_configuracoes: false,
  pode_administrar_permissoes: false,
  pode_gerir_calendarios_base: false,
  pode_ver_historico_projetos: false,
  pode_ver_tarefas_gerais: false,
  pode_ver_cronogramas_gerais: false,
  pode_configurar_colunas: false,
  pode_aprovar_pedidos: false,
  pode_ver_todos_projetos: false,
  pode_ver_dashboard_bancas: false,
  pode_responsavel_por_vendas: false,
  pode_coordenar_vendas: false,
  pode_aprovar_contrato_internamente: false,
  pode_editar_identidade_institucional: false,
  pode_elaborar_contratos_proprios: false,
  pode_elaborar_qualquer_contrato: false,
  pode_ver_health_track: false,
  pode_acessar_configuracoes_sabatina: false,
  pode_acessar_arquivo_contratos: false,
  pode_acessar_institucional: false,
  pode_enviar_comunicados: false,
};

/**
 * Estende a sessão: pede um token novo, com o prazo cheio, e guarda no
 * lugar do atual. Quem abre o ATLAS toda semana nunca precisa relogar.
 *
 * Grava só no `localStorage`, sem `setToken`: mexer no estado dispararia de
 * novo o efeito que carrega o usuário (o `token` é a dependência dele) e a
 * renovação viraria um laço. O token em memória continua válido nesta sessão
 *, o novo entra em vigor no próximo load, que é quando ele é lido.
 *
 * Falha em silêncio de propósito: renovar é conforto, não requisito. Se a
 * rede cair aqui, a sessão segue valendo pelo prazo que já tinha.
 */
function renovarSessao(token: string) {
  // No celular o token novo também é longo (sessão que não cai).
  apiFetch<{ access_token: string }>("/auth/renovar", {
    method: "POST",
    token,
    body: JSON.stringify({ celular: ehCelular() }),
  })
    .then((resposta) => localStorage.setItem("token", resposta.access_token))
    .catch(() => {});
}

/**
 * O último `Usuario` montado fica guardado no `localStorage` para o próximo
 * load abrir DIRETO na tela, sem o "Carregando..." em branco.
 *
 * Num reload duro não sobra nada em memória: só o token está persistido, e o
 * `Usuario` completo (nome, posição, as 14 caixas de permissão) precisa ser
 * remontado com `/auth/me` + `/posicoes-permissoes`, duas idas ao backend. O
 * `PrivateRoute` e os guards seguram a tela inteira enquanto isso, e é esse
 * intervalo que aparece como um flash de texto sem estilo.
 *
 * Com o cache, a sessão válida abre otimista com o último usuário conhecido e
 * `carregarUsuario` revalida por baixo. Se o token tiver expirado, o `/auth/me`
 * falha e o `catch` desloga na sequência; se as permissões tiverem mudado no
 * servidor, elas se corrigem em menos de um segundo (e o backend recusa o que
 * não deve, de qualquer forma).
 */
const USUARIO_CACHE_KEY = "usuario";

function lerUsuarioCache(): Usuario | null {
  try {
    const bruto = localStorage.getItem(USUARIO_CACHE_KEY);
    return bruto ? (JSON.parse(bruto) as Usuario) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("token"));
  const [usuario, setUsuario] = useState<Usuario | null>(() =>
    token ? lerUsuarioCache() : null,
  );
  // Só espera de verdade quando não há como abrir otimista: há token mas
  // nenhum usuário em cache para mostrar enquanto a revalidação corre.
  const [carregando, setCarregando] = useState(() => !!token && !lerUsuarioCache());

  const carregarUsuario = useCallback(async () => {
    if (!token) {
      setCarregando(false);
      return;
    }
    try {
      const dados = await apiFetch<UsuarioResponse>("/auth/me", { token });
      // Com senha provisória o backend trava QUALQUER rota fora das 3 do
      // primeiro acesso, /posicoes-permissoes não é uma delas, e 403 caía no
      // catch abaixo, que desloga. As permissões de verdade não fazem falta
      // agora: o PrivateRoute só deixa passar pra /definir-senha até isso
      // resolver, e recarregarUsuario() busca as permissões reais depois,
      // quando já não trava.
      let permissoes = PERMISSOES_PLACEHOLDER;
      if (!dados.senha_provisoria) {
        const catalogo = await getPosicoesPermissoes(token);
        const base = catalogo.find((p) => p.posicao === dados.posicao) ?? PERMISSOES_PLACEHOLDER;
        const extra = dados.cargo_extra
          ? catalogo.find((p) => p.posicao === dados.cargo_extra) ?? null
          : null;
        permissoes = mesclarPermissoes(base, extra);
      }
      const completo = { ...dados, permissoes };
      setUsuario(completo);
      localStorage.setItem(USUARIO_CACHE_KEY, JSON.stringify(completo));
      renovarSessao(token);
      // Aparelho com push ativado passa a ser de quem está logado agora.
      void sincronizarPush(token);
    } catch {
      setToken(null);
      setUsuario(null);
      localStorage.removeItem("token");
      localStorage.removeItem(USUARIO_CACHE_KEY);
    } finally {
      setCarregando(false);
    }
  }, [token]);

  useEffect(() => {
    // Embrulhada numa função local, e não chamada direta: `carregarUsuario`
    // mexe em estado antes do primeiro await (o caso "sem token"), e chamá-la
    // no corpo do efeito é uma cascata de render aos olhos do lint.
    async function carregarAoAbrir() {
      await carregarUsuario();
    }
    carregarAoAbrir();
  }, [carregarUsuario]);

  async function login(email: string, senha: string) {
    const resposta = await apiFetch<{ access_token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email_insper: email, senha, celular: ehCelular() }),
    });
    localStorage.setItem("token", resposta.access_token);
    setToken(resposta.access_token);
  }

  function logout() {
    // Só no "Sair" de propósito (sessão vencida não passa por aqui): o
    // aparelho deixa de receber os avisos de quem saiu. Roda de carona,
    // sem esperar.
    void desativarPush(token);
    localStorage.removeItem("token");
    localStorage.removeItem(USUARIO_CACHE_KEY);
    setToken(null);
    setUsuario(null);
  }

  return (
    <AuthContext.Provider
      value={{ usuario, token, carregando, login, recarregarUsuario: carregarUsuario, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth precisa estar dentro de um AuthProvider");
  return context;
}
