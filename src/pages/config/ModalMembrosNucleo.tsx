import { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { X } from "lucide-react";
import { theme } from "@/styles/theme";
import { useAuth } from "@/context/AuthContext";
import { getUsuarios } from "@/lib/usuarios";
import { setMembrosNucleo, type Nucleo } from "@/lib/nucleos";
import type { UsuarioResumo } from "@/types/auth";
import { MultiSelect } from "@/components/MultiSelect";
import { EmptyText, ErrorText, PageButton } from "@/styles/page.styled";
import {
  ModalBody,
  ModalClose,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  ModalTitle,
} from "@/styles/modal.styled";

const Explicacao = styled.p`
  margin: 0 0 ${theme.spacing.md};
  font-size: ${theme.fontSize.sm};
  color: ${theme.colors.mutedForeground};
`;

const Marcados = styled.ul`
  list-style: none;
  margin: ${theme.spacing.md} 0 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.xs};
`;

const Marcado = styled.li`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.125rem 0.5rem;
  border-radius: ${theme.borderRadius.full};
  border: 1px solid ${theme.colors.border};
  background: ${theme.colors.muted};
  font-size: ${theme.fontSize.xs};

  button {
    display: inline-flex;
    border: 0;
    background: transparent;
    color: ${theme.colors.mutedForeground};
    cursor: pointer;
    padding: 0;
  }
`;

interface Props {
  nucleo: Nucleo;
  onSalvo: (nucleo: Nucleo) => void;
  onFechar: () => void;
}

/**
 * Marcar várias pessoas de uma vez num núcleo (2026-10-22, a pedido). É o
 * espelho do modal de membro: lá a pessoa escolhe os núcleos dela, aqui o
 * núcleo escolhe as pessoas. Só gente ativa aparece; quem está desligado e
 * ainda aponta para o núcleo fica como está.
 */
export function ModalMembrosNucleo({ nucleo, onSalvo, onFechar }: Props) {
  const { token } = useAuth();
  const [usuarios, setUsuarios] = useState<UsuarioResumo[] | null>(null);
  const [marcados, setMarcados] = useState<number[]>(nucleo.membro_ids);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!token) return;
    let vivo = true;
    getUsuarios(token)
      .then((lista) => vivo && setUsuarios(lista.filter((u) => u.status === "ativo")))
      .catch((err) => vivo && setErro(err instanceof Error ? err.message : "Erro ao carregar os membros"));
    return () => {
      vivo = false;
    };
  }, [token]);

  useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") onFechar();
    }
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [onFechar]);

  const opcoes = useMemo(
    () =>
      (usuarios ?? [])
        .slice()
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
        .map((u) => ({ value: String(u.id), label: u.nome })),
    [usuarios],
  );
  const nomePorId = useMemo(() => new Map((usuarios ?? []).map((u) => [u.id, u.nome])), [usuarios]);
  const marcadosOrdenados = useMemo(
    () => marcados.slice().sort((a, b) => (nomePorId.get(a) ?? "").localeCompare(nomePorId.get(b) ?? "", "pt-BR")),
    [marcados, nomePorId],
  );
  const mudou = useMemo(() => {
    const antes = new Set(nucleo.membro_ids);
    return marcados.length !== antes.size || marcados.some((id) => !antes.has(id));
  }, [marcados, nucleo.membro_ids]);

  async function salvar() {
    if (!token) return;
    setSalvando(true);
    setErro("");
    try {
      onSalvo(await setMembrosNucleo(nucleo.id, marcados, token));
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível salvar");
      setSalvando(false);
    }
  }

  return (
    <ModalOverlay onMouseDown={onFechar}>
      <ModalContent onMouseDown={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>Membros de {nucleo.nome}</ModalTitle>
          <ModalClose type="button" onClick={onFechar} aria-label="Fechar">
            <X size={18} />
          </ModalClose>
        </ModalHeader>
        <ModalBody>
          <Explicacao>
            Marque quem faz parte deste núcleo. Uma pessoa pode estar em mais de um; o que você
            desmarcar aqui sai só deste.
          </Explicacao>
          {!usuarios && !erro && <EmptyText>Carregando membros...</EmptyText>}
          {usuarios && (
            <>
              <MultiSelect
                valores={marcados.map(String)}
                onChange={(valores) => setMarcados(valores.map(Number))}
                opcoes={opcoes}
                rotuloVazio="Ninguém marcado"
                resumo={(n) => `${n} membros`}
                pesquisavel
                aria-label={`Membros de ${nucleo.nome}`}
                style={{ width: "100%" }}
              />
              {marcadosOrdenados.length > 0 ? (
                <Marcados aria-label="Marcados">
                  {marcadosOrdenados.map((id) => (
                    <Marcado key={id}>
                      {nomePorId.get(id) ?? `#${id}`}
                      <button
                        type="button"
                        aria-label={`Tirar ${nomePorId.get(id) ?? id}`}
                        onClick={() => setMarcados((atual) => atual.filter((m) => m !== id))}
                      >
                        <X size={12} />
                      </button>
                    </Marcado>
                  ))}
                </Marcados>
              ) : (
                <EmptyText style={{ marginTop: theme.spacing.md }}>Nenhum membro neste núcleo.</EmptyText>
              )}
            </>
          )}
          {erro && <ErrorText>{erro}</ErrorText>}
        </ModalBody>
        <ModalFooter>
          <PageButton type="button" $variant="outline" onClick={onFechar} disabled={salvando}>
            Cancelar
          </PageButton>
          <PageButton type="button" onClick={salvar} disabled={salvando || !usuarios || !mudou}>
            {salvando ? "Salvando..." : "Salvar membros"}
          </PageButton>
        </ModalFooter>
      </ModalContent>
    </ModalOverlay>
  );
}
