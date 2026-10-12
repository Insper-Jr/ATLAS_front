import { useEffect, useRef, useState } from "react";
import { Download, Trash2, Upload } from "lucide-react";
import styled from "styled-components";
import { theme } from "@/styles/theme";
import { useAuth } from "@/context/AuthContext";
import { baixarEnvioPdi, deleteEnvioPdi, getEnviosPdi, uploadEnvioPdi } from "@/lib/desempenho-pdi";
import { formatarData } from "@/lib/projetos";
import type { DesempenhoPdiItemComEnvio, DesempenhoPdiPastaComItens } from "@/types/desempenho";
import { EmptyText, PageBadge, PageButtonSm, PageLoadingBlock } from "@/styles/page.styled";
import { FormErrorText } from "@/pages/Bancas.styled";
import { SubItem, SubItemMeta, SubLista } from "@/pages/avaliacao-desempenho/painel/Painel.styled";

interface RelatorioPdiProps {
  usuarioId: number;
  /** Quem está vendo pode enviar/reenviar/remover itens do "PDI inicial"?
   *  Só a diretoria, o mentor não tem essa pasta liberada (backend recusa
   *  mesmo se o botão aparecesse, mas não faz sentido oferecer um botão
   *  fadado a dar erro). */
  podeEnviarInicial: boolean;
  /** E os itens de "Encontro"? Diretoria sempre; o mentor só quando é o
   *  mentor DESTE mentorado, quem chama já garante isso (a tela "Meus
   *  Mentorados" só abre com o próprio mentorado da pessoa logada). */
  podeEnviarEncontro: boolean;
}


/** Uma pasta com só 1 item vira UMA linha (nome + prazo + status + ações),
 *  em vez do card-dentro-de-card de `LoteCard`/`SubLista`: esse aninhamento
 *  faz sentido quando há vários itens pra distinguir, mas pra 1 item só é
 *  moldura demais em volta de pouca informação. */
const PastaLinha = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border-radius: ${theme.borderRadius.lg};
  border: 1px solid ${theme.colors.border};
`;

const PastaLinhaInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  min-width: 0;
`;

const PastaLinhaNome = styled.span`
  font-size: ${theme.fontSize.sm};
  font-weight: ${theme.fontWeight.semibold};
  color: ${theme.colors.foreground};
`;

const PastaLinhaMeta = styled.span`
  font-size: ${theme.fontSize.xs};
  color: ${theme.colors.mutedForeground};
`;

const PastaLinhaAcoes = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  flex-wrap: wrap;
`;

/** Mesma moldura de `PastaLinha`, mas em coluna: usada só quando a pasta
 *  tem mais de um item exigido, e cada um precisa da própria linha. */
const PastaBloco = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border-radius: ${theme.borderRadius.lg};
  border: 1px solid ${theme.colors.border};
`;

/** Explica a ausência do botão Enviar em vez de deixar o espaço em branco
 *  — sem isso, "PDI inicial" parece quebrado (Pendente, sem jeito de agir). */
const LotesStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
`;

function statusDoItem(
  item: DesempenhoPdiItemComEnvio,
  prazo: string,
  podeAgir: boolean,
): { tom: "success" | "warning" | "danger"; rotulo: string } {
  if (item.envio) return { tom: "success", rotulo: "Enviado" };
  const hoje = new Date().toISOString().slice(0, 10);
  const atrasado = prazo < hoje;
  // Pra quem não pode agir (mentor numa pasta "inicial"), "Pendente"/
  // "Atrasado" lê como uma cobrança sem saída — a pendência é de quem
  // envia (a diretoria), não de quem só acompanha.
  if (!podeAgir) return { tom: atrasado ? "danger" : "warning", rotulo: "Aguardando a diretoria" };
  return atrasado ? { tom: "danger", rotulo: "Atrasado" } : { tom: "warning", rotulo: "Pendente" };
}

export function RelatorioPdi({ usuarioId, podeEnviarInicial, podeEnviarEncontro }: RelatorioPdiProps) {
  const { token } = useAuth();
  const [pastas, setPastas] = useState<DesempenhoPdiPastaComItens[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState<number | null>(null);
  const [itemAlvo, setItemAlvo] = useState<number | null>(null);
  const inputArquivo = useRef<HTMLInputElement>(null);

  async function carregar() {
    if (!token) return;
    setCarregando(true);
    setErro("");
    try {
      setPastas(await getEnviosPdi(usuarioId, token));
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao carregar o PDI");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuarioId, token]);

  function podeEnviarNestaPasta(pasta: DesempenhoPdiPastaComItens): boolean {
    return pasta.pasta_tipo === "inicial" ? podeEnviarInicial : podeEnviarEncontro;
  }

  function abrirSeletorDeArquivo(itemId: number) {
    setItemAlvo(itemId);
    inputArquivo.current?.click();
  }

  async function aoEscolherArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    e.target.value = "";
    if (!arquivo || !token || itemAlvo == null) return;
    setOcupado(itemAlvo);
    setErro("");
    try {
      await uploadEnvioPdi(usuarioId, itemAlvo, arquivo, token);
      await carregar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao enviar o arquivo");
    } finally {
      setOcupado(null);
      setItemAlvo(null);
    }
  }

  async function remover(itemId: number) {
    if (!token) return;
    setOcupado(itemId);
    setErro("");
    try {
      await deleteEnvioPdi(usuarioId, itemId, token);
      await carregar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao remover o envio");
    } finally {
      setOcupado(null);
    }
  }

  async function baixar(itemId: number, item: DesempenhoPdiItemComEnvio) {
    if (!token || !item.envio) return;
    try {
      await baixarEnvioPdi(usuarioId, itemId, item.envio.arquivo_nome, token);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao baixar o arquivo");
    }
  }

  function acoesDoItem(item: DesempenhoPdiItemComEnvio, podeAgir: boolean) {
    const ocupadoAqui = ocupado === item.item_id;
    return (
      <>
        {item.envio && (
          <PageButtonSm type="button" $variant="outline" onClick={() => baixar(item.item_id, item)}>
            <Download size={14} />
            Baixar
          </PageButtonSm>
        )}
        {/* Sem aviso extra pra quem não pode enviar: o selo do item já diz
            "Aguardando a diretoria". */}
        {podeAgir && (
          <PageButtonSm
            type="button"
            $variant="outline"
            disabled={ocupadoAqui}
            onClick={() => abrirSeletorDeArquivo(item.item_id)}
          >
            <Upload size={14} />
            {ocupadoAqui ? "Enviando…" : item.envio ? "Reenviar" : "Enviar"}
          </PageButtonSm>
        )}
        {podeAgir && item.envio && (
          <PageButtonSm type="button" $variant="ghost" disabled={ocupadoAqui} onClick={() => remover(item.item_id)}>
            <Trash2 size={14} />
            Remover
          </PageButtonSm>
        )}
      </>
    );
  }

  if (carregando) return <PageLoadingBlock />;

  return (
    <div>
      <input
        ref={inputArquivo}
        type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
        hidden
        onChange={aoEscolherArquivo}
      />

      {pastas.length === 0 ? (
        <EmptyText>Nenhuma pasta de PDI cadastrada ainda.</EmptyText>
      ) : (
        <>
          <LotesStack>
            {pastas.map((pasta) => {
              const podeAgir = podeEnviarNestaPasta(pasta);
              const nomePasta = pasta.pasta_nome + (pasta.pasta_semestre ? ` (${pasta.pasta_semestre})` : "");

              if (pasta.itens.length === 0) {
                return (
                  <PastaLinha key={pasta.pasta_id}>
                    <PastaLinhaInfo>
                      <PastaLinhaNome>{nomePasta}</PastaLinhaNome>
                      <PastaLinhaMeta>Prazo: {formatarData(pasta.prazo)}</PastaLinhaMeta>
                    </PastaLinhaInfo>
                    <EmptyText>Nenhum documento exigido nesta pasta ainda.</EmptyText>
                  </PastaLinha>
                );
              }

              if (pasta.itens.length === 1) {
                const item = pasta.itens[0];
                const status = statusDoItem(item, pasta.prazo, podeAgir);
                return (
                  <PastaLinha key={pasta.pasta_id}>
                    <PastaLinhaInfo>
                      <PastaLinhaNome>{nomePasta}</PastaLinhaNome>
                      <PastaLinhaMeta>
                        Prazo: {formatarData(pasta.prazo)}
                        {item.envio && ` · enviado por ${item.envio.enviado_por_nome ?? "—"} em ${formatarData(item.envio.enviado_em)}`}
                      </PastaLinhaMeta>
                    </PastaLinhaInfo>
                    <PastaLinhaAcoes>
                      <PageBadge $tone={status.tom}>{status.rotulo}</PageBadge>
                      {acoesDoItem(item, podeAgir)}
                    </PastaLinhaAcoes>
                  </PastaLinha>
                );
              }

              return (
                <PastaBloco key={pasta.pasta_id}>
                  <PastaLinhaInfo>
                    <PastaLinhaNome>{nomePasta}</PastaLinhaNome>
                    <PastaLinhaMeta>Prazo: {formatarData(pasta.prazo)}</PastaLinhaMeta>
                  </PastaLinhaInfo>
                  <SubLista style={{ padding: 0 }}>
                    {pasta.itens.map((item) => {
                      const status = statusDoItem(item, pasta.prazo, podeAgir);
                      return (
                        <SubItem key={item.item_id}>
                          <div>
                            {item.item_nome}
                            {item.envio && (
                              <SubItemMeta>
                                {" "}
                                · enviado por {item.envio.enviado_por_nome ?? "—"} em{" "}
                                {formatarData(item.envio.enviado_em)}
                              </SubItemMeta>
                            )}
                          </div>
                          <PastaLinhaAcoes>
                            <PageBadge $tone={status.tom}>{status.rotulo}</PageBadge>
                            {acoesDoItem(item, podeAgir)}
                          </PastaLinhaAcoes>
                        </SubItem>
                      );
                    })}
                  </SubLista>
                </PastaBloco>
              );
            })}
          </LotesStack>
        </>
      )}

      {erro && <FormErrorText>{erro}</FormErrorText>}
    </div>
  );
}
