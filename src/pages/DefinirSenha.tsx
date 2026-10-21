import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock } from "lucide-react";
import { useLogoInsperJr } from "@/lib/logo-insper-jr";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { definirSenha } from "@/lib/auth";
import { lerVolta } from "@/lib/volta-login";
import {
  AuthPageWrapper,
  LoginRightPanel,
  LoginFormWrapper,
  LoginHeaderBlock,
  LoginFormLogoWrap,
  LoginBrandLogo,
  LoginFormSubtitle,
  LoginAuthForm,
  LoginFieldGroup,
  LoginInputWrapperWithRight,
  LoginIconWrapper,
  LoginTogglePasswordBtn,
  LoginSubmitButton,
  LoginErrorMessage,
  LoginSuccessMessage,
} from "./Auth.styled";

/** Espelha `TAMANHO_MINIMO_SENHA` do backend, validar aqui evita a ida à rede. */
const TAMANHO_MINIMO = 8;

/**
 * O primeiro acesso: quem entrou com a senha provisória do e-mail define a
 * sua antes de usar a plataforma.
 *
 * Irmã de `RedefinirSenha.tsx`, com uma diferença: lá o segredo é o token da
 * URL; aqui é a própria sessão, a pessoa já está logada. Por isso não há
 * "voltar para o login" nem link de fuga: sair daqui é definir a senha (ou
 * deslogar). O backend responde 403 em qualquer outra rota enquanto isso não
 * acontece, então um atalho na tela só levaria a uma tela vazia.
 */
export function DefinirSenha() {
  const insperJrLogo = useLogoInsperJr("horizontal");
  const { usuario, token, recarregarUsuario } = useAuth();
  const navigate = useNavigate();
  // Primeiro acesso vindo de um link (ex.: /vagas): depois de definir a senha
  // a pessoa segue pra lá, não pra /projetos.
  const destino = lerVolta(useLocation().search);

  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [mostrar, setMostrar] = useState(false);
  const [erro, setErro] = useState("");
  const [pronto, setPronto] = useState(false);
  const [carregando, setCarregando] = useState(false);

  // Quem já tem senha própria não tem o que fazer aqui, inclusive logo depois
  // de definir, quando o `recarregarUsuario` derruba o flag.
  if (usuario && !usuario.senha_provisoria) return <Navigate to={destino} replace />;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro("");

    // As duas checagens que o servidor não faz melhor que aqui: ele nunca vê a
    // confirmação, e o tamanho evita uma ida à rede.
    if (senha !== confirmacao) {
      setErro("As senhas não são iguais.");
      return;
    }
    if (senha.length < TAMANHO_MINIMO) {
      setErro(`A senha precisa ter pelo menos ${TAMANHO_MINIMO} caracteres.`);
      return;
    }

    setCarregando(true);
    try {
      await definirSenha(senha, token!);
      setPronto(true);
      // Recarrega o usuário ANTES de navegar: é o que derruba
      // `senha_provisoria` no contexto. Sem isso o `PrivateRoute` devolveria a
      // pessoa para esta mesma tela.
      await recarregarUsuario();
      navigate(destino);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao definir a senha");
      setPronto(false);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <AuthPageWrapper>
      <LoginRightPanel>
        <LoginFormWrapper>
          <LoginHeaderBlock>
            <LoginFormLogoWrap>
              <LoginBrandLogo src={insperJrLogo} alt="Insper Jr." />
            </LoginFormLogoWrap>
            <LoginFormSubtitle>
              {usuario ? `Bem-vindo, ${usuario.nome.split(" ")[0]}. ` : ""}
              Você entrou com a senha provisória que enviamos por e-mail. Escolha a sua senha para
              começar a usar o ATLAS.
            </LoginFormSubtitle>
          </LoginHeaderBlock>

          {pronto ? (
            <LoginSuccessMessage>Senha definida. Abrindo a plataforma...</LoginSuccessMessage>
          ) : (
            <LoginAuthForm onSubmit={handleSubmit}>
              <LoginFieldGroup>
                <Label htmlFor="senha">Sua nova senha</Label>
                <LoginInputWrapperWithRight>
                  <LoginIconWrapper>
                    <Lock size={20} />
                  </LoginIconWrapper>
                  <Input
                    id="senha"
                    type={mostrar ? "text" : "password"}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="Pelo menos 8 caracteres"
                    required
                    autoFocus
                  />
                  <LoginTogglePasswordBtn
                    type="button"
                    aria-label={mostrar ? "Ocultar senha" : "Mostrar senha"}
                    onClick={() => setMostrar(!mostrar)}
                  >
                    {mostrar ? <EyeOff size={20} /> : <Eye size={20} />}
                  </LoginTogglePasswordBtn>
                </LoginInputWrapperWithRight>
              </LoginFieldGroup>

              <LoginFieldGroup>
                <Label htmlFor="confirmacao">Repita a nova senha</Label>
                <LoginInputWrapperWithRight>
                  <LoginIconWrapper>
                    <Lock size={20} />
                  </LoginIconWrapper>
                  <Input
                    id="confirmacao"
                    type={mostrar ? "text" : "password"}
                    value={confirmacao}
                    onChange={(e) => setConfirmacao(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </LoginInputWrapperWithRight>
              </LoginFieldGroup>

              {erro && <LoginErrorMessage>{erro}</LoginErrorMessage>}

              <LoginSubmitButton type="submit" size="lg" disabled={carregando}>
                {carregando ? "Salvando..." : "Definir senha e entrar"}
              </LoginSubmitButton>
            </LoginAuthForm>
          )}
        </LoginFormWrapper>
      </LoginRightPanel>
    </AuthPageWrapper>
  );
}
