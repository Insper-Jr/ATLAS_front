import { useEffect, useState, type FormEvent } from "react";
import styled from "styled-components";
import { Plus, Users } from "lucide-react";
import { theme } from "@/styles/theme";
import { useAuth } from "@/context/AuthContext";
import { createNucleo, deleteNucleo, getNucleos, updateNucleo, type Nucleo } from "@/lib/nucleos";
import { ConfirmarModal } from "@/components/ConfirmarModal";
import { ModalMembrosNucleo } from "./ModalMembrosNucleo";
import {
  EmptyText,
  ErrorText,
  PageBadge,
  PageButtonSm,
  PageCard,
  PageCardContent,
  PageCardHeader,
  PageCardTitle,
} from "@/styles/page.styled";
import {
  ActionsCell,
  DataTable,
  FieldInput,
  NameCell,
  TableBody,
  TableCell,
  TableHead,
  TableHeadCell,
  TableRow,
} from "@/pages/Bancas.styled";
import { TableScrollWrap } from "@/styles/shared.styled";

const Descricao = styled.p`
  margin: 0 0 ${theme.spacing.md};
  font-size: ${theme.fontSize.sm};
  color: ${theme.colors.mutedForeground};
`;

const NovoForm = styled.form`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${theme.spacing.sm};
  margin-top: ${theme.spacing.md};

  input {
    flex: 1 1 14rem;
  }
`;

const InputInline = styled(FieldInput)`
  height: 1.75rem;
  padding: 0 0.5rem;
  width: 100%;
`;

/**
 * Núcleos da Gestão de Pessoas. A atribuição a cada pessoa fica no modal de
 * membro (Membros); aqui é só o cadastro. Excluir só sem ninguém dentro: o
 * backend recusa com 409 e a mensagem aparece na tela.
 */
export function NucleosCard() {
  const { token } = useAuth();
  const [nucleos, setNucleos] = useState<Nucleo[] | null>(null);
  const [erro, setErro] = useState("");
  const [novoNome, setNovoNome] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [renomeandoId, setRenomeandoId] = useState<number | null>(null);
  const [nomeEdicao, setNomeEdicao] = useState("");
  const [paraExcluir, setParaExcluir] = useState<Nucleo | null>(null);
  const [paraMembros, setParaMembros] = useState<Nucleo | null>(null);

  useEffect(() => {
    if (!token) return;
    let vivo = true;
    getNucleos(token)
      .then((n) => vivo && setNucleos(n))
      .catch((err) => vivo && setErro(err instanceof Error ? err.message : "Erro ao carregar"));
    return () => {
      vivo = false;
    };
  }, [token]);

  function substituir(atualizado: Nucleo) {
    setNucleos((atual) => (atual ?? []).map((n) => (n.id === atualizado.id ? atualizado : n)));
  }

  async function adicionar(e: FormEvent) {
    e.preventDefault();
    if (!token || !novoNome.trim()) return;
    setSalvando(true);
    setErro("");
    try {
      const criado = await createNucleo(novoNome.trim(), token);
      setNucleos((atual) => [...(atual ?? []), criado]);
      setNovoNome("");
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível criar o núcleo");
    } finally {
      setSalvando(false);
    }
  }

  async function salvarNome(nucleo: Nucleo) {
    if (!token) return;
    const nome = nomeEdicao.trim();
    if (!nome || nome === nucleo.nome) {
      setRenomeandoId(null);
      return;
    }
    setErro("");
    try {
      substituir(await updateNucleo(nucleo.id, { nome }, token));
      setRenomeandoId(null);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível renomear");
    }
  }

  async function alternarAtivo(nucleo: Nucleo) {
    if (!token) return;
    setErro("");
    try {
      substituir(await updateNucleo(nucleo.id, { ativo: !nucleo.ativo }, token));
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível salvar");
    }
  }

  async function confirmarExclusao() {
    if (!token || !paraExcluir) return;
    await deleteNucleo(paraExcluir.id, token);
    setNucleos((atual) => (atual ?? []).filter((n) => n.id !== paraExcluir.id));
    setParaExcluir(null);
  }

  return (
    <PageCard>
      <PageCardHeader>
        <PageCardTitle>Núcleos</PageCardTitle>
      </PageCardHeader>
      <PageCardContent>
        <Descricao>
          Os núcleos agrupam os membros nas listas e nas análises da Gestão de Pessoas. Marque
          várias pessoas de uma vez em "Membros", ou uma a uma no cadastro de Membros.
        </Descricao>
        {erro && <ErrorText>{erro}</ErrorText>}
        {!nucleos ? (
          <EmptyText>Carregando...</EmptyText>
        ) : nucleos.length === 0 ? (
          <EmptyText>Nenhum núcleo cadastrado.</EmptyText>
        ) : (
          <TableScrollWrap>
            <DataTable>
              <TableHead>
                <TableRow>
                  <TableHeadCell>Núcleo</TableHeadCell>
                  <TableHeadCell>Membros</TableHeadCell>
                  <TableHeadCell>Situação</TableHeadCell>
                  <TableHeadCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {nucleos.map((nucleo) => (
                  <TableRow key={nucleo.id}>
                    <NameCell>
                      {renomeandoId === nucleo.id ? (
                        <InputInline
                          autoFocus
                          value={nomeEdicao}
                          aria-label="Novo nome do núcleo"
                          onChange={(e) => setNomeEdicao(e.target.value)}
                          onBlur={() => salvarNome(nucleo)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") salvarNome(nucleo);
                            if (e.key === "Escape") setRenomeandoId(null);
                          }}
                        />
                      ) : (
                        nucleo.nome
                      )}
                    </NameCell>
                    <TableCell>{nucleo.membros}</TableCell>
                    <TableCell>
                      <PageBadge $tone={nucleo.ativo ? "success" : "muted"}>
                        {nucleo.ativo ? "Ativo" : "Inativo"}
                      </PageBadge>
                    </TableCell>
                    <ActionsCell>
                      <PageButtonSm type="button" $variant="outline" onClick={() => setParaMembros(nucleo)}>
                        <Users size={14} />
                        Membros
                      </PageButtonSm>
                      <PageButtonSm
                        type="button"
                        $variant="ghost"
                        onClick={() => {
                          setRenomeandoId(nucleo.id);
                          setNomeEdicao(nucleo.nome);
                        }}
                      >
                        Renomear
                      </PageButtonSm>
                      <PageButtonSm type="button" $variant="ghost" onClick={() => alternarAtivo(nucleo)}>
                        {nucleo.ativo ? "Desativar" : "Ativar"}
                      </PageButtonSm>
                      <PageButtonSm type="button" $variant="outline" onClick={() => setParaExcluir(nucleo)}>
                        Excluir
                      </PageButtonSm>
                    </ActionsCell>
                  </TableRow>
                ))}
              </TableBody>
            </DataTable>
          </TableScrollWrap>
        )}
        <NovoForm onSubmit={adicionar}>
          <FieldInput
            placeholder="Nome do núcleo"
            aria-label="Nome do núcleo"
            value={novoNome}
            onChange={(e) => setNovoNome(e.target.value)}
          />
          <PageButtonSm type="submit" $variant="outline" disabled={salvando || !novoNome.trim()}>
            <Plus size={14} />
            Adicionar núcleo
          </PageButtonSm>
        </NovoForm>
      </PageCardContent>
      {paraMembros && (
        <ModalMembrosNucleo
          nucleo={paraMembros}
          onSalvo={(atualizado) => {
            substituir(atualizado);
            setParaMembros(null);
          }}
          onFechar={() => setParaMembros(null)}
        />
      )}
      {paraExcluir && (
        <ConfirmarModal
          titulo="Excluir núcleo"
          mensagem={`Excluir o núcleo "${paraExcluir.nome}"? Só é possível quando nenhum membro está nele; senão, desative-o.`}
          rotuloConfirmar="Excluir"
          onConfirmar={confirmarExclusao}
          onCancelar={() => setParaExcluir(null)}
        />
      )}
    </PageCard>
  );
}
