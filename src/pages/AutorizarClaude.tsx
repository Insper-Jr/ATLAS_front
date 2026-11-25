import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Check, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useLogoInsperJr } from "@/lib/logo-insper-jr";
import { autorizarPedido, getPedidoAutorizacao, recusarPedido, type PedidoAutorizacao } from "@/lib/mcp";
import {
  AuthPageWrapper,
  LoginRightPanel,
  LoginFormWrapper,
  LoginHeaderBlock,
  LoginFormLogoWrap,
  LoginBrandLogo,
  LoginFormSubtitle,
  LoginAuthForm,
  LoginSubmitButton,
  LoginErrorMessage,
  LoginSuccessMessage,
} from "./Auth.styled";
import { PageButton } from "@/styles/page.styled";

/**
 * "Autorizar o Claude a ler o ATLAS?" (2026-11-24).
 *
 * O Claude manda a pessoa para cá quando ela adiciona o conector do ATLAS. A
 * tela fica dentro do `PrivateRoute` (exige a sessão do ATLAS: é ela que diz
 * QUEM está autorizando) e fora do `Layout` (não é uma tela da plataforma, é
 * uma pergunta de sim ou não). Ao confirmar, o backend gera o código de uso
 * único e devolve a URL de volta ao Claude; a página só navega para lá.
 *
 * O pedido vence em minutos: quem demora vê o motivo e volta ao Claude para
 * conectar de novo.
 */
export function AutorizarClaude() {
  const insperJrLogo = useLogoInsperJr("horizontal");
  const { usuario, token } = useAuth();
  const pedidoId = new URLSearchParams(useLocation().search).get("pedido") ?? "";

  const [pedido, setPedido] = useState<PedidoAutorizacao | null>(null);
  const [erro, setErro] = useState("");
  // Sem `?pedido=` não há o que carregar: o aviso vem do próprio render.
  const [carregando, setCarregando] = useState(!!pedidoId);
  const [decidindo, setDecidindo] = useState<"sim" | "nao" | null>(null);
  const [voltando, setVoltando] = useState(false);
  const semPedido = !pedidoId;

  useEffect(() => {
    if (!token || !pedidoId) return;
    let ativo = true;
    getPedidoAutorizacao(pedidoId, token)
      .then((p) => {
        if (ativo) setPedido(p);
      })
      .catch((e) => {
        if (ativo) setErro(e instanceof Error ? e.message : "Não foi possível abrir o pedido");
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => {
      ativo = false;
    };
  }, [pedidoId, token]);

  async function decidir(sim: boolean) {
    if (!token) return;
    setErro("");
    setDecidindo(sim ? "sim" : "nao");
    try {
      const { redirect } = sim ? await autorizarPedido(pedidoId, token) : await recusarPedido(pedidoId, token);
      setVoltando(true);
      // A URL de volta é o `redirect_uri` registrado pelo Claude: é para lá
      // que o código vai, e só o Claude sabe o que fazer com ele.
      window.location.href = redirect;
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível responder ao pedido");
      setDecidindo(null);
    }
  }

  const primeiroNome = usuario?.nome.split(" ")[0] ?? "";

  return (
    <AuthPageWrapper>
      <LoginRightPanel>
        <LoginFormWrapper>
          <LoginHeaderBlock>
            <LoginFormLogoWrap>
              <LoginBrandLogo src={insperJrLogo} alt="Insper Jr." />
            </LoginFormLogoWrap>
            <LoginFormSubtitle>
              {pedido ? `${pedido.cliente} quer ler o ATLAS como você, ${primeiroNome}.` : "Autorizar o Claude a ler o ATLAS?"}
            </LoginFormSubtitle>
          </LoginHeaderBlock>

          {carregando ? (
            <LoginFormSubtitle>Abrindo o pedido...</LoginFormSubtitle>
          ) : voltando ? (
            <LoginSuccessMessage>Pronto. Voltando para o Claude...</LoginSuccessMessage>
          ) : pedido && pedido.valido ? (
            <LoginAuthForm as="div">
              <div style={{ display: "grid", gap: "0.75rem", fontSize: "0.95rem", lineHeight: 1.5 }}>
                <div>
                  <strong>O que ele passa a ler, sempre com a sua visão do ATLAS:</strong>
                  <ul style={{ margin: "0.4rem 0 0", paddingLeft: "1.2rem" }}>
                    {pedido.le.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <strong>O que ele não lê:</strong>
                  <ul style={{ margin: "0.4rem 0 0", paddingLeft: "1.2rem" }}>
                    {pedido.nao_le.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div style={{ opacity: 0.8 }}>
                  Só leitura. O que o Claude ler vai para a sua conta Claude, como se você colasse no chat.
                  Dá para desconectar a qualquer hora em Meu perfil.
                </div>
              </div>

              {erro && <LoginErrorMessage>{erro}</LoginErrorMessage>}

              <LoginSubmitButton type="button" size="lg" disabled={decidindo !== null} onClick={() => void decidir(true)}>
                <Check size={18} style={{ marginRight: 8 }} />
                {decidindo === "sim" ? "Autorizando..." : "Autorizar"}
              </LoginSubmitButton>
              <PageButton type="button" $variant="outline" disabled={decidindo !== null} onClick={() => void decidir(false)}>
                <X size={16} style={{ marginRight: 6 }} />
                {decidindo === "nao" ? "Recusando..." : "Agora não"}
              </PageButton>
            </LoginAuthForm>
          ) : (
            <LoginErrorMessage>
              {semPedido
                ? "Este link não tem um pedido de autorização. Volte ao Claude e conecte de novo."
                : erro || pedido?.motivo || "Este pedido não pode mais ser respondido."}
            </LoginErrorMessage>
          )}
        </LoginFormWrapper>
      </LoginRightPanel>
    </AuthPageWrapper>
  );
}
