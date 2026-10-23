import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getGpUsoTipo, type GpRegistro, type GpTipo } from "@/lib/gestao-pessoas";
import { formatarDia } from "@/pages/gestao-pessoas/calculos";
import { EmptyText, ErrorText, PageButton } from "@/styles/page.styled";
import { ModalBody, ModalClose, ModalContent, ModalFooter, ModalHeader, ModalOverlay, ModalTitle } from "@/styles/modal.styled";
import { DataTable, TableBody, TableCell, TableHead, TableHeadCell, TableRow } from "@/pages/Bancas.styled";
import { TableScrollWrap } from "@/styles/shared.styled";

interface Props {
  tipo: GpTipo;
  onFechar: () => void;
}

/**
 * Quem e quais registros estão por trás do "uso no semestre" de um tipo
 * (2026-10-22, a pedido). Só os ativos do semestre ativo, os mesmos que a
 * contagem da tabela soma.
 */
export function ModalUsoTipo({ tipo, onFechar }: Props) {
  const { token } = useAuth();
  const [registros, setRegistros] = useState<GpRegistro[] | null>(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!token) return;
    let vivo = true;
    getGpUsoTipo(tipo.id, token)
      .then((lista) => vivo && setRegistros(lista))
      .catch((err) => vivo && setErro(err instanceof Error ? err.message : "Erro ao carregar"));
    return () => {
      vivo = false;
    };
  }, [token, tipo.id]);

  useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") onFechar();
    }
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [onFechar]);

  const total = (registros ?? []).reduce((soma, r) => soma + r.pontos, 0);

  return (
    <ModalOverlay onMouseDown={onFechar}>
      <ModalContent $expandido onMouseDown={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>{tipo.nome} no semestre</ModalTitle>
          <ModalClose type="button" onClick={onFechar} aria-label="Fechar">
            <X size={18} />
          </ModalClose>
        </ModalHeader>
        <ModalBody>
          {erro && <ErrorText>{erro}</ErrorText>}
          {!registros && !erro && <EmptyText>Carregando...</EmptyText>}
          {registros && registros.length === 0 && <EmptyText>Nenhum registro ativo deste tipo no semestre.</EmptyText>}
          {registros && registros.length > 0 && (
            <TableScrollWrap>
              <DataTable>
                <TableHead>
                  <TableRow>
                    <TableHeadCell>Membro</TableHeadCell>
                    <TableHeadCell>Data</TableHeadCell>
                    <TableHeadCell>Pontos</TableHeadCell>
                    <TableHeadCell>Projeto</TableHeadCell>
                    <TableHeadCell>Observação</TableHeadCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {registros.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.usuario_nome}</TableCell>
                      <TableCell>{formatarDia(r.data)}</TableCell>
                      <TableCell>{r.pontos}</TableCell>
                      <TableCell>{r.projeto_nome ?? "-"}</TableCell>
                      <TableCell>{r.observacao || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </DataTable>
            </TableScrollWrap>
          )}
          {registros && registros.length > 0 && (
            <EmptyText style={{ marginTop: "0.75rem" }}>
              {registros.length} registro(s), {total} ponto(s), {new Set(registros.map((r) => r.usuario_id)).size} pessoa(s).
            </EmptyText>
          )}
        </ModalBody>
        <ModalFooter>
          <PageButton type="button" $variant="outline" onClick={onFechar}>
            Fechar
          </PageButton>
        </ModalFooter>
      </ModalContent>
    </ModalOverlay>
  );
}
