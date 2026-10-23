import { useEffect, useState, type FormEvent } from "react";
import styled from "styled-components";
import { Plus } from "lucide-react";
import { theme } from "@/styles/theme";
import { useAuth } from "@/context/AuthContext";
import { createGpTipo, getGpTipos, updateGpTipo, type GpCategoria, type GpTipo } from "@/lib/gestao-pessoas";
import { ROTULO_CATEGORIA } from "@/lib/gp-rotulos";
import { ModalUsoTipo } from "./ModalUsoTipo";
import {
  EmptyText,
  ErrorText,
  PageButtonSm,
  PageCard,
  PageCardContent,
  PageCardHeader,
  PageCardTitle,
} from "@/styles/page.styled";
import {
  DataTable,
  FieldInput,
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

const Categoria = styled.div`
  & + & {
    margin-top: ${theme.spacing.lg};
  }
`;

const CategoriaTitulo = styled.h3`
  margin: 0 0 ${theme.spacing.sm};
  font-size: ${theme.fontSize.xs};
  font-weight: ${theme.fontWeight.semibold};
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: ${theme.colors.mutedForeground};
`;

const InputPontos = styled(FieldInput)`
  width: 5rem;
  height: 1.75rem;
  padding: 0 0.5rem;
  text-align: center;
`;

/* Nome editável na própria linha (2026-10-22, a pedido): o mesmo padrão
   dos pontos, salva ao sair do campo. Renomear vale para os registros
   antigos também, porque eles apontam para o tipo pelo id. */
const InputNome = styled(FieldInput)`
  min-width: 14rem;
  height: 1.75rem;
  padding: 0 0.5rem;
`;

const NovoForm = styled.form`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${theme.spacing.sm};
  margin-top: ${theme.spacing.sm};

  input[type="text"] {
    flex: 1 1 14rem;
  }
`;

const Ativo = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  font-size: ${theme.fontSize.xs};
  color: ${theme.colors.mutedForeground};
  cursor: pointer;

  input {
    accent-color: ${theme.colors.primary};
  }
`;

const CATEGORIAS: GpCategoria[] = ["obrigacoes", "desempenho"];

/**
 * Tipos de ocorrência por categoria. Não existe exclusão: um tipo
 * desativado some do formulário de lançamento, mas continua nos registros
 * antigos. Mudar os pontos sugeridos não altera o que já foi lançado.
 */
export function GpTiposCard() {
  const { token } = useAuth();
  const [tipos, setTipos] = useState<GpTipo[] | null>(null);
  const [erro, setErro] = useState("");
  const [novo, setNovo] = useState<Record<GpCategoria, { nome: string; pontos: number }>>({
    obrigacoes: { nome: "", pontos: 1 },
    desempenho: { nome: "", pontos: 1 },
  });
  const [salvandoNovo, setSalvandoNovo] = useState<GpCategoria | null>(null);
  const [usoDe, setUsoDe] = useState<GpTipo | null>(null);

  useEffect(() => {
    if (!token) return;
    let vivo = true;
    getGpTipos(token)
      .then((t) => vivo && setTipos(t))
      .catch((err) => vivo && setErro(err instanceof Error ? err.message : "Erro ao carregar"));
    return () => {
      vivo = false;
    };
  }, [token]);

  async function salvarPontos(tipo: GpTipo, pontos: number) {
    if (!token || pontos < 1 || pontos === tipo.pontos) return;
    setErro("");
    try {
      const atualizado = await updateGpTipo(tipo.id, { pontos }, token);
      setTipos((atual) => (atual ?? []).map((t) => (t.id === tipo.id ? atualizado : t)));
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível salvar");
    }
  }

  async function salvarNome(tipo: GpTipo, nome: string, campo: HTMLInputElement) {
    const limpo = nome.trim();
    if (!token || limpo === tipo.nome) return;
    if (!limpo) {
      campo.value = tipo.nome;
      return;
    }
    setErro("");
    try {
      const atualizado = await updateGpTipo(tipo.id, { nome: limpo }, token);
      setTipos((atual) => (atual ?? []).map((t) => (t.id === tipo.id ? atualizado : t)));
    } catch (err) {
      campo.value = tipo.nome;
      setErro(err instanceof Error ? err.message : "Não foi possível salvar");
    }
  }

  async function alternarAtivo(tipo: GpTipo) {
    if (!token) return;
    setErro("");
    try {
      const atualizado = await updateGpTipo(tipo.id, { ativo: !tipo.ativo }, token);
      setTipos((atual) => (atual ?? []).map((t) => (t.id === tipo.id ? atualizado : t)));
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível salvar");
    }
  }

  async function adicionar(e: FormEvent, categoria: GpCategoria) {
    e.preventDefault();
    if (!token) return;
    const dados = novo[categoria];
    if (!dados.nome.trim() || dados.pontos < 1) return;
    setSalvandoNovo(categoria);
    setErro("");
    try {
      const criado = await createGpTipo({ categoria, nome: dados.nome.trim(), pontos: dados.pontos }, token);
      setTipos((atual) => [...(atual ?? []), criado]);
      setNovo((atual) => ({ ...atual, [categoria]: { nome: "", pontos: 1 } }));
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível adicionar");
    } finally {
      setSalvandoNovo(null);
    }
  }

  return (
    <PageCard>
      <PageCardHeader>
        <PageCardTitle>Tipos de ocorrência</PageCardTitle>
      </PageCardHeader>
      <PageCardContent>
        <Descricao>
          Renomeie uma ocorrência, altere a pontuação sugerida ou desative um tipo. O nome novo vale
          também para os registros antigos; tipos desativados continuam neles. Mudar os pontos
          sugeridos não altera o que já foi lançado.
        </Descricao>
        {erro && <ErrorText>{erro}</ErrorText>}
        {!tipos ? (
          <EmptyText>Carregando...</EmptyText>
        ) : (
          CATEGORIAS.map((categoria) => {
            const lista = tipos.filter((t) => t.categoria === categoria).sort((a, b) => a.ordem - b.ordem);
            return (
              <Categoria key={categoria}>
                <CategoriaTitulo>{ROTULO_CATEGORIA[categoria]}</CategoriaTitulo>
                <TableScrollWrap>
                  <DataTable>
                    <TableHead>
                      <TableRow>
                        <TableHeadCell>Ocorrência</TableHeadCell>
                        <TableHeadCell>Pontos sugeridos</TableHeadCell>
                        <TableHeadCell>Uso no semestre</TableHeadCell>
                        <TableHeadCell>Situação</TableHeadCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {lista.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4}>
                            <EmptyText>Nenhum tipo cadastrado.</EmptyText>
                          </TableCell>
                        </TableRow>
                      )}
                      {lista.map((tipo) => (
                        <TableRow key={tipo.id} style={{ opacity: tipo.ativo ? 1 : 0.6 }}>
                          <TableCell>
                            <InputNome
                              type="text"
                              key={tipo.nome}
                              defaultValue={tipo.nome}
                              maxLength={120}
                              aria-label={`Nome da ocorrência ${tipo.nome}`}
                              onBlur={(e) => salvarNome(tipo, e.target.value, e.target)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") e.currentTarget.blur();
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <InputPontos
                              type="number"
                              min={1}
                              max={20}
                              defaultValue={tipo.pontos}
                              aria-label={`Pontos sugeridos de ${tipo.nome}`}
                              onBlur={(e) => salvarPontos(tipo, Number(e.target.value))}
                            />
                          </TableCell>
                          <TableCell>
                            {tipo.uso_no_semestre > 0 ? (
                              <PageButtonSm
                                type="button"
                                $variant="ghost"
                                onClick={() => setUsoDe(tipo)}
                                title="Ver quem e quais registros"
                              >
                                {tipo.uso_no_semestre}
                              </PageButtonSm>
                            ) : (
                              0
                            )}
                          </TableCell>
                          <TableCell>
                            <Ativo>
                              <input type="checkbox" checked={tipo.ativo} onChange={() => alternarAtivo(tipo)} />
                              Ativo
                            </Ativo>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </DataTable>
                </TableScrollWrap>
                <NovoForm onSubmit={(e) => adicionar(e, categoria)}>
                  <FieldInput
                    type="text"
                    placeholder="Nova ocorrência"
                    aria-label={`Nova ocorrência de ${ROTULO_CATEGORIA[categoria]}`}
                    value={novo[categoria].nome}
                    onChange={(e) =>
                      setNovo((atual) => ({ ...atual, [categoria]: { ...atual[categoria], nome: e.target.value } }))
                    }
                  />
                  <InputPontos
                    type="number"
                    min={1}
                    max={20}
                    aria-label="Pontos sugeridos"
                    value={novo[categoria].pontos}
                    onChange={(e) =>
                      setNovo((atual) => ({
                        ...atual,
                        [categoria]: { ...atual[categoria], pontos: Number(e.target.value) },
                      }))
                    }
                  />
                  <PageButtonSm type="submit" $variant="outline" disabled={salvandoNovo === categoria}>
                    <Plus size={14} />
                    Adicionar tipo
                  </PageButtonSm>
                </NovoForm>
              </Categoria>
            );
          })
        )}
      </PageCardContent>
      {usoDe && <ModalUsoTipo tipo={usoDe} onFechar={() => setUsoDe(null)} />}
    </PageCard>
  );
}
