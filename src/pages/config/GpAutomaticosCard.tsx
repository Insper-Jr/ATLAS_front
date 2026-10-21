import { useEffect, useState, type FormEvent } from "react";
import styled from "styled-components";
import { theme } from "@/styles/theme";
import { useAuth } from "@/context/AuthContext";
import {
  getGpRegras,
  getGpTipos,
  updateGpRegras,
  type GpAlvoPdi,
  type GpRegras,
  type GpTipo,
} from "@/lib/gestao-pessoas";
import { ROTULO_ALVO_PDI, rotuloDoTipo, tiposParaSelecao } from "@/lib/gp-rotulos";
import {
  EmptyText,
  ErrorText,
  PageButton,
  PageCard,
  PageCardContent,
  PageCardHeader,
  PageCardTitle,
} from "@/styles/page.styled";
import { FieldGroup, FieldInput, FieldLabel, FieldSelect } from "@/pages/Bancas.styled";

const Descricao = styled.p`
  margin: 0 0 ${theme.spacing.md};
  font-size: ${theme.fontSize.sm};
  color: ${theme.colors.mutedForeground};
`;

const Regra = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md} 0;
  border-top: 1px solid ${theme.colors.border};

  &:first-of-type {
    border-top: none;
    padding-top: 0;
  }
`;

const RegraTitulo = styled.label`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  font-size: ${theme.fontSize.sm};
  font-weight: ${theme.fontWeight.semibold};
  color: ${theme.colors.foreground};

  input {
    accent-color: ${theme.colors.primary};
  }
`;

const RegraTituloFixo = styled.span`
  font-size: ${theme.fontSize.sm};
  font-weight: ${theme.fontWeight.semibold};
  color: ${theme.colors.foreground};
`;

const Campos = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 2fr) 6rem minmax(0, 1fr);
  gap: ${theme.spacing.sm};
  align-items: end;

  @media (max-width: ${theme.breakpoints.md}px) {
    grid-template-columns: 1fr;
  }
`;

const Rodape = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${theme.spacing.sm};
  margin-top: ${theme.spacing.md};
`;

function SelectTipo({
  id,
  tipos,
  valor,
  onChange,
}: {
  id: string;
  tipos: GpTipo[];
  valor: number | null;
  onChange: (tipoId: number | null) => void;
}) {
  return (
    <FieldGroup>
      <FieldLabel htmlFor={id}>Tipo de ocorrência</FieldLabel>
      <FieldSelect id={id} value={valor ?? ""} onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}>
        <option value="">Selecione</option>
        {tiposParaSelecao(tipos).map((t) => (
          <option key={t.id} value={t.id}>
            {rotuloDoTipo(t)}
          </option>
        ))}
      </FieldSelect>
    </FieldGroup>
  );
}

function CampoPontos({ id, valor, onChange }: { id: string; valor: number | null; onChange: (n: number | null) => void }) {
  return (
    <FieldGroup>
      <FieldLabel htmlFor={id}>Pontos</FieldLabel>
      <FieldInput
        id={id}
        type="number"
        min={1}
        max={20}
        value={valor ?? ""}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
      />
    </FieldGroup>
  );
}

/**
 * Regras globais (tarefa atrasada, falta em banca) e os padrões que
 * pré-preenchem o bloco de pontuação ao criar lote e pasta de PDI. Lote e
 * pasta ainda perguntam na criação; aqui fica só o padrão.
 */
export function GpAutomaticosCard() {
  const { token } = useAuth();
  const [regras, setRegras] = useState<GpRegras | null>(null);
  const [tipos, setTipos] = useState<GpTipo[]>([]);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);

  useEffect(() => {
    if (!token) return;
    let vivo = true;
    Promise.all([getGpRegras(token), getGpTipos(token)])
      .then(([r, t]) => {
        if (!vivo) return;
        setRegras(r);
        setTipos(t);
      })
      .catch((err) => vivo && setErro(err instanceof Error ? err.message : "Erro ao carregar"));
    return () => {
      vivo = false;
    };
  }, [token]);

  function aoEscolherTipo(tipoId: number | null, pontosAtuais: number | null): number | null {
    // O tipo traz os pontos sugeridos quando ainda não há valor.
    const tipo = tipos.find((t) => t.id === tipoId);
    return tipo && pontosAtuais == null ? tipo.pontos : pontosAtuais;
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    if (!token || !regras) return;
    for (const chave of ["tarefa", "banca"] as const) {
      const regra = regras[chave];
      if (regra.ativa && (!regra.tipo_id || !regra.pontos || regra.pontos < 1)) {
        setErro(`Escolha o tipo e os pontos da regra "${chave === "tarefa" ? "Tarefa atrasada" : "Falta em banca"}".`);
        return;
      }
    }
    setSalvando(true);
    setErro("");
    setSalvo(false);
    try {
      setRegras(await updateGpRegras(regras, token));
      setSalvo(true);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível salvar");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <PageCard>
      <PageCardHeader>
        <PageCardTitle>Pontuação automática</PageCardTitle>
      </PageCardHeader>
      <PageCardContent>
        <Descricao>
          Tarefa atrasada e falta em banca são regras globais: ligadas, pontuam sozinhas, uma vez por
          ocorrência. O lote de Avaliação de Desempenho e a pasta de PDI perguntam na criação se quem
          ficar pendente toma ponto; aqui fica só o padrão que pré-preenche essa pergunta. A diretoria
          pode corrigir ou retirar qualquer registro automático depois.
        </Descricao>
        {erro && <ErrorText>{erro}</ErrorText>}
        {!regras ? (
          <EmptyText>Carregando...</EmptyText>
        ) : (
          <form onSubmit={salvar}>
            <Regra>
              <RegraTitulo>
                <input
                  type="checkbox"
                  checked={regras.tarefa.ativa}
                  onChange={(e) => setRegras({ ...regras, tarefa: { ...regras.tarefa, ativa: e.target.checked } })}
                />
                Tarefa atrasada (prazo vencido e não concluída)
              </RegraTitulo>
              {regras.tarefa.ativa && (
                <Campos>
                  <SelectTipo
                    id="gp-regra-tarefa-tipo"
                    tipos={tipos}
                    valor={regras.tarefa.tipo_id}
                    onChange={(tipoId) =>
                      setRegras({
                        ...regras,
                        tarefa: { ...regras.tarefa, tipo_id: tipoId, pontos: aoEscolherTipo(tipoId, regras.tarefa.pontos) },
                      })
                    }
                  />
                  <CampoPontos
                    id="gp-regra-tarefa-pontos"
                    valor={regras.tarefa.pontos}
                    onChange={(pontos) => setRegras({ ...regras, tarefa: { ...regras.tarefa, pontos } })}
                  />
                </Campos>
              )}
            </Regra>

            <Regra>
              <RegraTitulo>
                <input
                  type="checkbox"
                  checked={regras.banca.ativa}
                  onChange={(e) => setRegras({ ...regras, banca: { ...regras.banca, ativa: e.target.checked } })}
                />
                Falta em banca (confirmado e sem avaliação até o prazo)
              </RegraTitulo>
              {regras.banca.ativa && (
                <Campos>
                  <SelectTipo
                    id="gp-regra-banca-tipo"
                    tipos={tipos}
                    valor={regras.banca.tipo_id}
                    onChange={(tipoId) =>
                      setRegras({
                        ...regras,
                        banca: { ...regras.banca, tipo_id: tipoId, pontos: aoEscolherTipo(tipoId, regras.banca.pontos) },
                      })
                    }
                  />
                  <CampoPontos
                    id="gp-regra-banca-pontos"
                    valor={regras.banca.pontos}
                    onChange={(pontos) => setRegras({ ...regras, banca: { ...regras.banca, pontos } })}
                  />
                </Campos>
              )}
            </Regra>

            <Regra>
              <RegraTituloFixo>Padrão ao criar lote de Avaliação de Desempenho</RegraTituloFixo>
              <Campos>
                <SelectTipo
                  id="gp-lote-padrao-tipo"
                  tipos={tipos}
                  valor={regras.lote_padrao.tipo_id}
                  onChange={(tipoId) =>
                    setRegras({
                      ...regras,
                      lote_padrao: { tipo_id: tipoId, pontos: aoEscolherTipo(tipoId, regras.lote_padrao.pontos) },
                    })
                  }
                />
                <CampoPontos
                  id="gp-lote-padrao-pontos"
                  valor={regras.lote_padrao.pontos}
                  onChange={(pontos) => setRegras({ ...regras, lote_padrao: { ...regras.lote_padrao, pontos } })}
                />
              </Campos>
            </Regra>

            <Regra>
              <RegraTituloFixo>Padrão ao criar pasta de PDI</RegraTituloFixo>
              <Campos>
                <SelectTipo
                  id="gp-pdi-padrao-tipo"
                  tipos={tipos}
                  valor={regras.pdi_padrao.tipo_id}
                  onChange={(tipoId) =>
                    setRegras({
                      ...regras,
                      pdi_padrao: {
                        ...regras.pdi_padrao,
                        tipo_id: tipoId,
                        pontos: aoEscolherTipo(tipoId, regras.pdi_padrao.pontos),
                      },
                    })
                  }
                />
                <CampoPontos
                  id="gp-pdi-padrao-pontos"
                  valor={regras.pdi_padrao.pontos}
                  onChange={(pontos) => setRegras({ ...regras, pdi_padrao: { ...regras.pdi_padrao, pontos } })}
                />
                <FieldGroup>
                  <FieldLabel htmlFor="gp-pdi-padrao-alvo">Quem toma</FieldLabel>
                  <FieldSelect
                    id="gp-pdi-padrao-alvo"
                    value={regras.pdi_padrao.alvo ?? ""}
                    onChange={(e) =>
                      setRegras({
                        ...regras,
                        pdi_padrao: { ...regras.pdi_padrao, alvo: (e.target.value || null) as GpAlvoPdi | null },
                      })
                    }
                  >
                    <option value="">Sem padrão</option>
                    {(Object.keys(ROTULO_ALVO_PDI) as GpAlvoPdi[]).map((alvo) => (
                      <option key={alvo} value={alvo}>
                        {ROTULO_ALVO_PDI[alvo]}
                      </option>
                    ))}
                  </FieldSelect>
                </FieldGroup>
              </Campos>
            </Regra>

            <Rodape>
              <PageButton type="submit" disabled={salvando}>
                {salvando ? "Salvando..." : "Salvar"}
              </PageButton>
              {salvo && <EmptyText role="status">Salvo.</EmptyText>}
            </Rodape>
          </form>
        )}
      </PageCardContent>
    </PageCard>
  );
}
