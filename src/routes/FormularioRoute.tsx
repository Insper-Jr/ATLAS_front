import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { PageLoadingBlock } from "@/styles/page.styled";

export function FormularioRoute() {
  const { usuario, carregando } = useAuth();

  if (carregando) return <PageLoadingBlock />;

  // Mesma caixa do Dashboard Bancas: o formulário é o que aquela tela
  // edita, e separar as duas daria a caixa a quem não vê a tela.
  if (!usuario?.permissoes.pode_ver_dashboard_bancas) {
    return <Navigate to="/projetos" replace />;
  }

  return <Outlet />;
}
