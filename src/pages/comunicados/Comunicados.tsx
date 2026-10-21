import { useCallback, useEffect, useState } from "react";
import styled from "styled-components";
import { useAuth } from "@/context/AuthContext";
import { ComunicadoFormulario } from "@/components/comunicados/ComunicadoFormulario";
import { SucessoComunicado } from "@/components/comunicados/Comunicado.styled";
import { ConfirmarModal } from "@/components/ConfirmarModal";
import { apagarComunicado, getComunicados, textoSucesso, type ComunicadoHistorico } from "@/lib/comunicados";
import { paraDataUtc } from "@/lib/projetos";
import { theme } from "@/styles/theme";
import {
  EmptyText,
  ErrorText,
  PageBadge,
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
import { FUSO } from "@/lib/fuso";

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
  flex: 1 1 auto;
  min-width: 0;
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

const ItemCabeca = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${theme.spacing.sm};
`;

const Destinatarios = styled.div`
  margin-top: ${theme.spacing.sm};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.borderRadius.md};
  overflow-x: auto;
`;

const DestinatarioLinha = styled.div`
  display: grid;
  grid-template-columns: minmax(10rem, 1.2fr) minmax(12rem, 1.4fr) auto;
  gap: ${theme.spacing.md};
  align-items: center;
  min-width: 34rem;
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  font-size: ${theme.fontSize.sm};
  border-bottom: 1px solid ${theme.colors.border};

  &:last-child {
    border-bottom: none;
  }
`;

const Email = styled.span`
  color: ${theme.colors.mutedForeground};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Situacao = styled.span`
  display: inline-flex;
  gap: ${theme.spacing.xs};
  justify-self: end;
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

/** "Ana, Bia e Caio" até 5 nomes; dali em diante "Ana, Bia, ... e mais 12". */
function resumoDestinatarios(c: ComunicadoHistorico): string {
  const nomes = c.destinatarios.map((d) => d.nome);
  if (nomes.length <= 5) {
    return nomes.length <= 1 ? nomes.join("") : `${nomes.slice(0, -1).join(", ")} e ${nomes[nomes.length - 1]}`;
  }
  return `${nomes.slice(0, 5).join(", ")} e mais ${nomes.length - 5}`;
}

function dataHora(iso: string): string {
  const d = paraDataUtc(iso);
  return `${d.toLocaleDateString("pt-BR", { timeZone: FUSO })} ${d.toLocaleTimeString("pt-BR", { timeZone: FUSO, hour: "2-digit", minute: "2-digit" })}`;
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
  const [paraApagar, setParaApagar] = useState<ComunicadoHistorico | null>(null);

  async function confirmarApagar() {
    if (!token || !paraApagar) return;
    await apagarComunicado(paraApagar.comunicado_id, token);
    setParaApagar(null);
    carregar();
  }

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
                    <ItemCabeca>
                      <ItemTopo
                        type="button"
                        aria-expanded={expandido}
                        onClick={() => setAberto(expandido ? null : c.comunicado_id)}
                      >
                        <ItemAssunto>{c.assunto}</ItemAssunto>
                        <ItemMeta>{dataHora(c.enviado_em)}</ItemMeta>
                      </ItemTopo>
                      <PageButtonSm type="button" $variant="ghost" onClick={() => setParaApagar(c)}>
                        Apagar
                      </PageButtonSm>
                    </ItemCabeca>
                    <ItemLinha>
                      Para: {resumoDestinatarios(c)}
                      {c.remetente_nome ? ` · por ${c.remetente_nome}` : ""}
                    </ItemLinha>
                    <ItemLinha>
                      {c.emails_enviados} de {c.total} e-mail(s) enviado(s) · {c.lidas} lido(s) no sino
                      {c.rotulo ? ` · ${c.rotulo}` : ""}
                    </ItemLinha>
                    {expandido && (
                      <>
                        {c.mensagem && <ItemMensagem>{c.mensagem}</ItemMensagem>}
                        <Destinatarios>
                          {c.destinatarios.map((d) => (
                            <DestinatarioLinha key={d.usuario_id}>
                              <span>{d.nome}</span>
                              <Email title={d.email ?? undefined}>{d.email ?? "sem e-mail"}</Email>
                              <Situacao>
                                <PageBadge $tone={d.email_enviado ? "success" : "warning"}>
                                  {d.email_enviado ? "E-mail enviado" : "E-mail pendente"}
                                </PageBadge>
                                {d.lida && <PageBadge $tone="muted">Lido</PageBadge>}
                              </Situacao>
                            </DestinatarioLinha>
                          ))}
                        </Destinatarios>
                      </>
                    )}
                  </Item>
                );
              })}
            </Historico>
          )}
        </PageCardContent>
      </PageCard>

      {paraApagar && (
        <ConfirmarModal
          titulo="Apagar do histórico"
          mensagem={`"${paraApagar.assunto}" sai do histórico e do sino das ${paraApagar.total} pessoa(s) que receberam. O e-mail que já foi enviado não volta.`}
          rotuloConfirmar="Apagar"
          onConfirmar={confirmarApagar}
          onCancelar={() => setParaApagar(null)}
        />
      )}
    </PageStack>
  );
}
