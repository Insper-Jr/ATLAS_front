import { useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, Lock } from "lucide-react";
import { useLogoInsperJr } from "@/lib/logo-insper-jr";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { redefinirSenha } from "@/lib/auth";
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
  LoginForgotLink,
} from "./Auth.styled";

/** Espelha `TAMANHO_MINIMO_SENHA` do backend. Validar aqui também é só
 *  conveniência, quem manda é o servidor; isto evita a ida e volta. */
const TAMANHO_MINIMO = 8;

/**
 * Passo 2 da recuperação: escolher a senha nova.
 *
 * O token vem na query string do link do e-mail. Esta rota precisa estar
 * registrada como PÚBLICA no `App.tsx`: rota não declarada cai no catch-all,
 * que redireciona para `/projetos`, que exige login, e o link do e-mail nunca
 * abriria para quem justamente não consegue entrar.
 */
export function RedefinirSenha() {
  const insperJrLogo = useLogoInsperJr("horizontal");
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") ?? "";

  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [mostrar, setMostrar] = useState(false);
  const [erro, setErro] = useState("");
  const [pronto, setPronto] = useState(false);
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro("");

    // As duas checagens locais são as que o backend não tem como fazer melhor
    // que aqui: ele nunca vê a confirmação, e o tamanho evita uma ida à rede.
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
      await redefinirSenha(token, senha);
      setPronto(true);
      // Espera curta para a confirmação ser lida antes de trocar de tela.
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao redefinir a senha");
    } finally {
      setCarregando(false);
    }
  }

  // Sem token não há o que fazer, mostrar o formulário só levaria a pessoa a
  // preencher duas senhas para receber erro no final.
  if (!token) {
    return (
      <AuthPageWrapper>
        <LoginRightPanel>
          <LoginFormWrapper>
            <LoginHeaderBlock>
              <LoginFormLogoWrap>
                <LoginBrandLogo src={insperJrLogo} alt="Insper Jr." />
              </LoginFormLogoWrap>
            </LoginHeaderBlock>
            <LoginErrorMessage>
              Link inválido: falta o código de redefinição. Peça um novo link.
            </LoginErrorMessage>
            <LoginForgotLink to="/esqueci-senha">Pedir novo link</LoginForgotLink>
          </LoginFormWrapper>
        </LoginRightPanel>
      </AuthPageWrapper>
    );
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
              {pronto ? "Tudo certo." : "Escolha a sua nova senha de acesso."}
            </LoginFormSubtitle>
          </LoginHeaderBlock>

          {pronto ? (
            <LoginSuccessMessage>
              Senha redefinida. Levando você para o login...
            </LoginSuccessMessage>
          ) : (
            <LoginAuthForm onSubmit={handleSubmit}>
              <LoginFieldGroup>
                <Label htmlFor="senha">Nova senha</Label>
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
                {carregando ? "Salvando..." : "Salvar nova senha"}
              </LoginSubmitButton>
            </LoginAuthForm>
          )}

          <LoginForgotLink to="/login">Voltar para o login</LoginForgotLink>
        </LoginFormWrapper>
      </LoginRightPanel>
    </AuthPageWrapper>
  );
}
