import { useState, type FormEvent } from "react";
import { Mail } from "lucide-react";
import { useLogoInsperJr } from "@/lib/logo-insper-jr";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { solicitarRecuperacao } from "@/lib/auth";
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
  LoginInputWrapper,
  LoginIconWrapper,
  LoginSubmitButton,
  LoginErrorMessage,
  LoginSuccessMessage,
  LoginForgotLink,
} from "./Auth.styled";

/**
 * Passo 1 da recuperação: pedir o link por e-mail.
 *
 * O texto de sucesso é condicional de propósito, "se este e-mail estiver
 * cadastrado" e não "enviamos para você". O backend responde igual exista o
 * e-mail ou não, para a rota pública não virar um verificador de quem é membro
 * do núcleo; prometer entrega aqui desmentiria isso e ainda entregaria a
 * informação que o backend esconde.
 */
export function EsqueciSenha() {
  const insperJrLogo = useLogoInsperJr("horizontal");
  const [email, setEmail] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro("");
    setCarregando(true);
    try {
      await solicitarRecuperacao(email);
      setEnviado(true);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao solicitar a redefinição");
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
              {enviado
                ? "Confira a sua caixa de entrada."
                : "Informe o seu e-mail e enviaremos um link para você criar uma senha nova."}
            </LoginFormSubtitle>
          </LoginHeaderBlock>

          {enviado ? (
            <LoginSuccessMessage>
              Se este e-mail estiver cadastrado, enviamos o link de redefinição. Ele vale por 30
              minutos e só pode ser usado uma vez.
            </LoginSuccessMessage>
          ) : (
            <LoginAuthForm onSubmit={handleSubmit}>
              <LoginFieldGroup>
                <Label htmlFor="email">E-mail</Label>
                <LoginInputWrapper>
                  <LoginIconWrapper>
                    <Mail size={16} />
                  </LoginIconWrapper>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                    autoFocus
                  />
                </LoginInputWrapper>
              </LoginFieldGroup>

              {erro && <LoginErrorMessage>{erro}</LoginErrorMessage>}

              <LoginSubmitButton type="submit" size="lg" disabled={carregando}>
                {carregando ? "Enviando..." : "Enviar link de redefinição"}
              </LoginSubmitButton>
            </LoginAuthForm>
          )}

          <LoginForgotLink to="/login">Voltar para o login</LoginForgotLink>
        </LoginFormWrapper>
      </LoginRightPanel>
    </AuthPageWrapper>
  );
}
