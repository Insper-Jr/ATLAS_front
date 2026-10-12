import { useCallback, useEffect, useState } from "react";
import styled from "styled-components";
import { useAuth } from "@/context/AuthContext";
import { ComunicadoFormulario } from "@/components/comunicados/ComunicadoFormulario";
import { SucessoComunicado } from "@/components/comunicados/Comunicado.styled";
import { getComunicados, textoSucesso, type ComunicadoHistorico } from "@/lib/comunicados";
import { paraDataUtc } from "@/lib/projetos";
import { theme } from "@/styles/theme";
import {
  EmptyText,
  ErrorText,
  PageButtonSm,
  PageCard,
  PageCardContent,
  PageCardHeader,
  PageCardTitle,
  PageHeader,
  PageHeaderText,
  PageLoadingBlock,
  PageStack,
  PageSubtitle,
  PageTitle,
} from "@/styles/page.styled";

const Historico = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
`;

const Item = styled.div`
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.borderRadius.md};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
`;

const ItemTopo = styled.button`
  display: flex;
  width: 100%;
  align-items: baseline;
  justify-content: space-between;
  gap: ${theme.spacing.md};
  padding: 0;
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;
  font: inherit;
  color: ${theme.colors.foreground};
`;

const ItemAssunto = styled.span`
  font-weight: 600;
  font-size: ${theme.fontSize.sm};
`;

const ItemMeta = styled.span`
  font-size: ${theme.fontSize.xs};
  color: ${theme.colors.mutedForeground};
  white-space: nowrap;
`;

const ItemLinha = styled.p`
  margin: ${theme.spacing.xs} 0 0 0;
  font-size: ${theme.fontSize.xs};
  color: ${theme.colors.mutedForeground};
`;

const ItemMensagem = styled.p`
  margin: ${theme.spacing.sm} 0 0 0;
  font-size: ${theme.fontSize.sm};
  line-height: 1.5;
  white-space: pre-wrap;
`;

const SucessoBloco = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: ${theme.spacing.md};
`;

function dataHora(iso: string): string {
  const d = paraDataUtc(iso);
  return `${d.toLocaleDateString("pt-BR")} ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
}

/**
 * Comunicados (2026-10-12, a pedido: aba própria em Sistema, sem atalhos
 * espalhados por outras telas). Manda sino + e-mail pra um recorte de
 * pessoas e mostra o que já foi enviado. Caixa `pode_enviar_comunicados`.
 */
export function Comunicados() {
  const { token } = useAuth();
  const [historico, setHistorico] = useState<ComunicadoHistorico[] | null>(null);
  const [erro, setErro] = useState("");
  const [enviados, setEnviados] = useState<number | null>(null);
  // Remonta o formulário limpo depois de um envio.
  const [versaoFormulario, setVersaoFormulario] = useState(0);
  const [aberto, setAberto] = useState<string | null>(null);

  const carregar = useCallback(() => {
    if (!token) return;
    getComunicados(token)
      .then((lista) => {
        setHistorico(lista);
        setErro("");
      })
      .catch((err: unknown) => setErro(err instanceof Error ? err.message : "Erro ao carregar o histórico"));
  }, [token]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  function aoEnviar(n: number) {
    setEnviados(n);
    carregar();
  }

  function novoComunicado() {
    setEnviados(null);
    setVersaoFormulario((v) => v + 1);
  }

  return (
    <PageStack>
      <PageHeader>
        <PageHeaderText>
          <PageTitle>Comunicados</PageTitle>
          <PageSubtitle>
            Aviso no sino e por e-mail pra um recorte de pessoas: quem está com 0 bancas, quem ainda não respondeu um
            formulário, os inscritos de uma banca, uma posição, todo mundo ou quem você escolher.
          </PageSubtitle>
        </PageHeaderText>
      </PageHeader>

      <PageCard>
        <PageCardHeader>
          <PageCardTitle>Novo comunicado</PageCardTitle>
        </PageCardHeader>
        <PageCardContent>
          {enviados !== null ? (
            <SucessoBloco>
              <SucessoComunicado>{textoSucesso(enviados)}</SucessoComunicado>
              <PageButtonSm type="button" onClick={novoComunicado}>
                Escrever outro
              </PageButtonSm>
            </SucessoBloco>
          ) : (
            <ComunicadoFormulario key={versaoFormulario} onEnviado={aoEnviar} />
          )}
        </PageCardContent>
      </PageCard>

      <PageCard>
        <PageCardHeader>
          <PageCardTitle>Enviados</PageCardTitle>
        </PageCardHeader>
        <PageCardContent>
          {erro ? (
            <ErrorText>{erro}</ErrorText>
          ) : historico === null ? (
            <PageLoadingBlock />
          ) : historico.length === 0 ? (
            <EmptyText>Nenhum comunicado enviado ainda.</EmptyText>
          ) : (
            <Historico>
              {historico.map((c) => {
                const expandido = aberto === c.comunicado_id;
                return (
                  <Item key={c.comunicado_id}>
                    <ItemTopo
                      type="button"
                      aria-expanded={expandido}
                      onClick={() => setAberto(expandido ? null : c.comunicado_id)}
                    >
                      <ItemAssunto>{c.assunto}</ItemAssunto>
                      <ItemMeta>{dataHora(c.enviado_em)}</ItemMeta>
                    </ItemTopo>
                    <ItemLinha>
                      {c.remetente_nome ? `Por ${c.remetente_nome} · ` : ""}
                      {c.total} {c.total === 1 ? "pessoa" : "pessoas"} · {c.emails_enviados} e-mail(s) entregue(s) ao
                      provedor · {c.lidas} lida(s) no sino
                      {c.rotulo ? ` · ${c.rotulo}` : ""}
                    </ItemLinha>
                    {expandido && (
                      <>
                        {c.mensagem && <ItemMensagem>{c.mensagem}</ItemMensagem>}
                        <ItemLinha>Para: {c.destinatarios.join(", ")}</ItemLinha>
                      </>
                    )}
                  </Item>
                );
              })}
            </Historico>
          )}
        </PageCardContent>
      </PageCard>
    </PageStack>
  );
}
