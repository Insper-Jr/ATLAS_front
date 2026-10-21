import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getBancaDetalhes } from "@/lib/bancas";
import { paraDataUtc } from "@/lib/projetos";
import type { BancaDetalhes } from "@/types/banca";
import {
  AvaliadoresSecao,
  DetailList,
  DetailRow,
  DetailTerm,
  DetailValue,
  ModalBody,
  ModalClose,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  ModalTitle,
  NarrowModalContent,
} from "@/pages/Bancas.styled";
import { AvaliadoresAgrupados } from "@/components/bancas/AvaliadoresAgrupados";
import { EmptyText, ErrorText, PageButton } from "@/styles/page.styled";
import { FUSO } from "@/lib/fuso";

const ROTULO_STATUS: Record<BancaDetalhes["status"], string> = {
  nao_marcada: "Não marcada",
  aberta: "Marcada",
  realizada: "Realizada",
  atrasada: "Atrasada",
  cancelada: "Cancelada",
};

const ROTULO_RESULTADO: Record<NonNullable<BancaDetalhes["resultado"]>, string> = {
  aprovada: "Aprovada",
  nao_aprovada: "Não aprovada",
};

/**
 * A ficha da banca, aberta clicando no marco do cronograma.
 *
 * **Busca sozinha, e é de propósito.** O cronograma já carrega `escopo.banca`
 * (`BancaDoEscopo`), mas ali só há ids e datas, nome de coordenador, equipe,
 * avaliadores e frentes não estão lá, e enfiá-los no `GET /cronograma` os
 * faria viajar em toda abertura da aba para servir a um clique que quase nunca
 * acontece. Uma chamada sob demanda paga só quem abre.
 *
 * O ✕ e o clique fora fecham; não há ação de escrita aqui. Editar e excluir
 * continuam na tela `/bancas`, que é onde a banca é gerida, esta ficha
 * responde "o que é esta banca?", que é a pergunta de quem está lendo o
 * cronograma.
 */
export function BancaDetalhesModal({
  bancaId,
  onFechar,
}: {
  bancaId: number;
  onFechar: () => void;
}) {
  const { usuario, token } = useAuth();
  const [banca, setBanca] = useState<BancaDetalhes | null>(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!token) return;
    let ativo = true;
    getBancaDetalhes(bancaId, token)
      .then((dados) => {
        if (ativo) setBanca(dados);
      })
      .catch((err: unknown) => {
        if (ativo) setErro(err instanceof Error ? err.message : "Erro ao carregar a banca");
      });
    // Cancela o efeito da banca anterior: sem isto, abrir duas bancas seguidas
    // deixa a resposta mais lenta sobrescrever a mais nova.
    return () => {
      ativo = false;
    };
  }, [bancaId, token]);

  // Esc fecha, como nos outros modais da tela.
  useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") onFechar();
    }
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [onFechar]);

  const data = banca?.data_hora ? paraDataUtc(banca.data_hora) : null;

  return (
    <ModalOverlay onClick={onFechar} role="presentation">
      <NarrowModalContent
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="banca-detalhes-titulo"
      >
        <ModalHeader>
          <ModalTitle id="banca-detalhes-titulo">
            {banca?.nome_projeto ?? "Banca"}
          </ModalTitle>
          <ModalClose type="button" aria-label="Fechar" onClick={onFechar}>
            <X size={18} />
          </ModalClose>
        </ModalHeader>

        <ModalBody>
          {erro && <ErrorText>{erro}</ErrorText>}
          {!banca && !erro && <EmptyText>Carregando…</EmptyText>}

          {banca && (
            <>
            <DetailList>
              <DetailRow>
                <DetailTerm>Data</DetailTerm>
                <DetailValue>{data ? data.toLocaleDateString("pt-BR", { timeZone: FUSO }) : "—"}</DetailValue>
              </DetailRow>
              <DetailRow>
                <DetailTerm>Horário</DetailTerm>
                <DetailValue>
                  {data
                    ? data.toLocaleTimeString("pt-BR", { timeZone: FUSO, hour: "2-digit", minute: "2-digit" })
                    : "—"}
                </DetailValue>
              </DetailRow>
              <DetailRow>
                <DetailTerm>Status</DetailTerm>
                <DetailValue>{ROTULO_STATUS[banca.status]}</DetailValue>
              </DetailRow>
              {/* O resultado só existe depois da banca, e é ele que libera a
                  entrega ao cliente. Some enquanto não há, para não
                  virar um "—" que parece reprovação. */}
              {banca.resultado && (
                <DetailRow>
                  <DetailTerm>Resultado</DetailTerm>
                  <DetailValue>{ROTULO_RESULTADO[banca.resultado]}</DetailValue>
                </DetailRow>
              )}
              <DetailRow>
                {/* Plural: uma banca pode avaliar mais de um escopo de uma vez. */}
                <DetailTerm>{banca.escopos.length > 1 ? "Escopos" : "Escopo"}</DetailTerm>
                <DetailValue>{banca.escopos.join(", ") || "—"}</DetailValue>
              </DetailRow>
              <DetailRow>
                <DetailTerm>Frentes</DetailTerm>
                <DetailValue>{banca.frentes.join(", ") || "—"}</DetailValue>
              </DetailRow>
              <DetailRow>
                <DetailTerm>Coordenador</DetailTerm>
                <DetailValue>{banca.coordenador}</DetailValue>
              </DetailRow>
              <DetailRow>
                <DetailTerm>Membros</DetailTerm>
                <DetailValue>{banca.membros.join(", ") || "—"}</DetailValue>
              </DetailRow>
              {banca.descricao_coordenador && (
                <DetailRow>
                  <DetailTerm>Relato do coordenador</DetailTerm>
                  <DetailValue>{banca.descricao_coordenador}</DetailValue>
                </DetailRow>
              )}
            </DetailList>

            {/* Os avaliadores separados por (liderança | membro) × frente da
                banca, o mesmo bloco da aba Banca do projeto e do "ver mais" de
                /bancas — antes era uma linha só com todos os nomes juntos. */}
            <AvaliadoresSecao>
              <DetailTerm>Avaliadores</DetailTerm>
              {banca.avaliadores.length === 0 ? (
                <DetailValue style={{ textAlign: "left" }}>—</DetailValue>
              ) : (
                <AvaliadoresAgrupados
                  avaliadores={banca.avaliadores}
                  frentesDaBanca={banca.frentes_da_banca}
                  composicao={banca.composicao}
                  realizadoEm={banca.realizado_em}
                  podeVerAvaliou={!!usuario?.permissoes.pode_ver_dashboard_bancas}
                />
              )}
            </AvaliadoresSecao>
            </>
          )}
        </ModalBody>

        <ModalFooter>
          <PageButton type="button" $variant="outline" onClick={onFechar}>
            Fechar
          </PageButton>
        </ModalFooter>
      </NarrowModalContent>
    </ModalOverlay>
  );
}
