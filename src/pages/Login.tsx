import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { getPrimeirosNomes } from "@/lib/auth";
import { MembersGlobe } from "@/components/MembersGlobe";
import insperJrLogo from "@/assets/insperjr2.png";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, ArrowRight, Eye, EyeOff } from "lucide-react";
import {
  AuthPageWrapper,
  LoginLeftPanel,
  LoginLeftPanelContent,
  LoginGlobeHalo,
  LoginHeadline,
  LoginHeadlineAccent,
  LoginHeadlineCursor,
  LoginFormPanel,
  LoginFormWrapper,
  LoginHeaderBlock,
  LoginFormLogoWrap,
  LoginBrandLogo,
  LoginFormSubtitle,
  LoginAuthForm,
  LoginFieldGroup,
  LoginFieldRow,
  LoginForgotLink,
  LoginInputWrapper,
  LoginInputWrapperWithRight,
  LoginIconWrapper,
  LoginTogglePasswordBtn,
  LoginSubmitButton,
  LoginErrorMessage,
} from "./Auth.styled";

const TITULO_BOAS_VINDAS = "Bem-vindo ao ATLAS";
const INICIO_DESTAQUE = "Bem-vindo à ".length;
const VELOCIDADE_DIGITACAO_MS = 80;

export function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [tamanhoDigitado, setTamanhoDigitado] = useState(0);
  const [nomes, setNomes] = useState<string[]>([]);
  const { login } = useAuth();
  const navigate = useNavigate();

  const digitacaoCompleta = tamanhoDigitado >= TITULO_BOAS_VINDAS.length;

  useEffect(() => {
    if (digitacaoCompleta) return;
    const t = setTimeout(() => setTamanhoDigitado((n) => n + 1), VELOCIDADE_DIGITACAO_MS);
    return () => clearTimeout(t);
  }, [tamanhoDigitado, digitacaoCompleta]);

  useEffect(() => {
    getPrimeirosNomes()
      .then(setNomes)
      .catch(() => setNomes([]));
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro("");
    setCarregando(true);
    try {
      // Copiar/colar credenciais costuma trazer um espaço ou quebra de linha
      // junto, sem isso, um e-mail/senha corretos "sobrando um espaço"
      // caem como "Email ou senha incorretos" sem nenhuma pista do porquê.
      await login(email.trim(), senha.trim());
      // No celular o teclado ainda está aberto e a página rolada pra cima
      // dele: fecha o teclado e volta ao topo antes de trocar de tela, senão
      // "Meus projetos" abre deslocado.
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      window.scrollTo(0, 0);
      navigate("/projetos");
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao fazer login");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <AuthPageWrapper>
      <LoginLeftPanel>
        <LoginLeftPanelContent>
          <LoginGlobeHalo>
            <MembersGlobe nomes={nomes} />
          </LoginGlobeHalo>
          <LoginHeadline>
            {TITULO_BOAS_VINDAS.slice(0, Math.min(tamanhoDigitado, INICIO_DESTAQUE))}
            {tamanhoDigitado > INICIO_DESTAQUE && (
              <LoginHeadlineAccent>
                {TITULO_BOAS_VINDAS.slice(INICIO_DESTAQUE, tamanhoDigitado)}
              </LoginHeadlineAccent>
            )}
            {!digitacaoCompleta && <LoginHeadlineCursor aria-hidden />}
          </LoginHeadline>
        </LoginLeftPanelContent>
      </LoginLeftPanel>

      <LoginFormPanel>
        <LoginFormWrapper>
          <LoginHeaderBlock>
            <LoginFormLogoWrap>
              <LoginBrandLogo src={insperJrLogo} alt="Insper Jr." />
            </LoginFormLogoWrap>
            <LoginFormSubtitle>
              Entre com sua conta para acessar a plataforma de projetos.
            </LoginFormSubtitle>
          </LoginHeaderBlock>

          <LoginAuthForm onSubmit={handleSubmit}>
            <LoginFieldGroup>
              <Label htmlFor="email">E-mail</Label>
              <LoginInputWrapper>
                <LoginIconWrapper>
                  <Mail size={20} />
                </LoginIconWrapper>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                />
              </LoginInputWrapper>
            </LoginFieldGroup>

            <LoginFieldGroup>
              <LoginFieldRow>
                <Label htmlFor="senha">Senha</Label>
                <LoginForgotLink to="/esqueci-senha">Esqueceu a senha?</LoginForgotLink>
              </LoginFieldRow>
              <LoginInputWrapperWithRight>
                <LoginIconWrapper>
                  <Lock size={20} />
                </LoginIconWrapper>
                <Input
                  id="senha"
                  name="senha"
                  type={showPassword ? "text" : "password"}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <LoginTogglePasswordBtn
                  type="button"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </LoginTogglePasswordBtn>
              </LoginInputWrapperWithRight>
            </LoginFieldGroup>

            {erro && <LoginErrorMessage>{erro}</LoginErrorMessage>}

            <LoginSubmitButton type="submit" size="lg" disabled={carregando}>
              {carregando ? (
                <>Entrando...</>
              ) : (
                <>
                  Entrar
                  <ArrowRight size={16} />
                </>
              )}
            </LoginSubmitButton>
          </LoginAuthForm>
        </LoginFormWrapper>
      </LoginFormPanel>
    </AuthPageWrapper>
  );
}