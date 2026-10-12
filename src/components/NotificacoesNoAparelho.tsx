import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { ativarPush, desativarPush, enviarPushTeste, estadoPush, ehIOS, type EstadoPush } from "@/lib/push";
import {
  PageButton,
  PageButtonSm,
  PageCard,
  PageCardContent,
  PageCardHeader,
  PageCardTitle,
} from "@/styles/page.styled";
import { FormErrorText } from "@/pages/Bancas.styled";
import { Explicacao } from "@/pages/MeuPerfil.styled";
import styled from "styled-components";
import { theme } from "@/styles/theme";

const Acoes = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.sm};
`;

function textoDoEstado(estado: Exclude<EstadoPush, "desativado" | "ativado">): string {
  switch (estado) {
    case "instalar_ios":
      return 'No iPhone, o aviso só chega com o ATLAS na Tela de Início. No Safari, toque em Compartilhar e depois em "Adicionar à Tela de Início". Abra o ATLAS pelo ícone novo e volte aqui pra ativar.';
    case "sem_suporte":
      return "Este navegador não recebe notificações. No celular, use o ATLAS instalado na tela de início.";
    case "sem_servidor":
      return "As notificações no aparelho ainda não foram configuradas no servidor.";
    case "bloqueado":
      return ehIOS()
        ? "As notificações do ATLAS estão bloqueadas neste aparelho. Libere em Ajustes, Notificações, ATLAS, e abra o app de novo."
        : "As notificações estão bloqueadas pra este site. Libere nas configurações do navegador e recarregue a página.";
  }
}

/**
 * Notificação push neste aparelho (2026-10-12). Os mesmos avisos do sino e
 * do e-mail aparecem como notificação do celular ou do computador. Vale por
 * aparelho: ativar no celular não liga no notebook.
 */
export function NotificacoesNoAparelho() {
  const { token } = useAuth();
  const [estado, setEstado] = useState<EstadoPush | null>(null);
  const [chave, setChave] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");

  const atualizar = useCallback(() => {
    if (!token) return;
    estadoPush(token)
      .then((r) => {
        setEstado(r.estado);
        setChave(r.chave);
      })
      .catch(() => setEstado("sem_suporte"));
  }, [token]);

  useEffect(() => {
    atualizar();
  }, [atualizar]);

  async function ativar() {
    if (!token || !chave) return;
    setOcupado(true);
    setErro("");
    setAviso("");
    try {
      await ativarPush(token, chave);
      setAviso("Ativadas neste aparelho.");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível ativar.");
    } finally {
      setOcupado(false);
      atualizar();
    }
  }

  async function desativar() {
    setOcupado(true);
    setErro("");
    setAviso("");
    await desativarPush(token);
    setOcupado(false);
    atualizar();
  }

  async function testar() {
    if (!token) return;
    setOcupado(true);
    setErro("");
    setAviso("");
    try {
      const { entregues } = await enviarPushTeste(token);
      setAviso(
        entregues > 0
          ? "Teste enviado. Deve aparecer em alguns segundos; se não aparecer, confira o modo foco ou não perturbe."
          : "Nenhum aparelho aceitou o teste. Desative e ative de novo.",
      );
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível enviar o teste.");
    } finally {
      setOcupado(false);
    }
  }

  return (
    <PageCard>
      <PageCardHeader>
        <PageCardTitle>Notificações no celular</PageCardTitle>
      </PageCardHeader>
      <PageCardContent>
        <Explicacao>
          Os avisos do sino aparecem também como notificação do aparelho, igual a um app. Vale só pro aparelho em que
          você ativar. Os tipos que você desligou em "Notificações por e-mail" também não chegam aqui.
        </Explicacao>

        {estado === null ? null : estado === "ativado" ? (
          <>
            <Explicacao>Ativadas neste aparelho.</Explicacao>
            <Acoes>
              <PageButtonSm type="button" disabled={ocupado} onClick={() => void testar()}>
                Enviar teste
              </PageButtonSm>
              <PageButtonSm type="button" $variant="outline" disabled={ocupado} onClick={() => void desativar()}>
                Desativar neste aparelho
              </PageButtonSm>
            </Acoes>
          </>
        ) : estado === "desativado" ? (
          <Acoes>
            <PageButton type="button" disabled={ocupado} onClick={() => void ativar()}>
              {ocupado ? "Ativando…" : "Ativar neste aparelho"}
            </PageButton>
          </Acoes>
        ) : (
          <Explicacao>{textoDoEstado(estado)}</Explicacao>
        )}

        {aviso && <Explicacao>{aviso}</Explicacao>}
        {erro && <FormErrorText>{erro}</FormErrorText>}
      </PageCardContent>
    </PageCard>
  );
}
