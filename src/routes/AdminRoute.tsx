import { Navigate, Outlet, useOutletContext } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { PageLoadingBlock } from "@/styles/page.styled";
import type { Permissoes } from "@/types/auth";

/** As caixas de permissão que valem como booleano. */
type PermissaoCampo = keyof Permissoes;

/**
 * Guarda de rota por permissão (da posição, ver `types/auth.ts`).
 *
 * Cada área administrativa tem a sua caixa própria, dar acesso ao Núcleo não
 * dá acesso a Membros. Esconder o item na Sidebar não protege nada: sem este
 * guard, digitar /membros na barra de endereço abre a tela. E o backend
 * revalida tudo, porque o front só esconde.
 */
export function AdminRoute({ permissao }: { permissao: PermissaoCampo | PermissaoCampo[] }) {
  const { usuario, carregando } = useAuth();
  // Repassa o contexto do pai: aninhada em `/projetos/:id`, sem isto a aba
  // perde o `useProjeto()`, porque o contexto de outlet não atravessa sozinho.
  const contexto = useOutletContext();

  if (carregando) return <PageLoadingBlock />;
  // Lista = basta UMA das caixas (Configurações abre pra quem administra o
  // catálogo OU pra quem só configura a Gestão de Pessoas).
  const caixas = Array.isArray(permissao) ? permissao : [permissao];
  if (!caixas.some((caixa) => usuario?.permissoes[caixa])) return <Navigate to="/dashboard" replace />;

  return <Outlet context={contexto} />;
}
