import { useEffect, useState, type FormEvent } from "react";
import styled from "styled-components";
import { theme } from "@/styles/theme";
import { useAuth } from "@/context/AuthContext";
import { getConfiguracao, updateConfiguracao } from "@/lib/configuracao";
import { reavaliarGpAvisos } from "@/lib/gestao-pessoas";
import {
  EmptyText,
  ErrorText,
  PageButton,
  PageCard,
  PageCardContent,
  PageCardHeader,
  PageCardTitle,
} from "@/styles/page.styled";
import { FieldGroup, FieldInput, FieldLabel } from "@/pages/Bancas.styled";

const Descricao = styled.p`
  margin: 0 0 ${theme.spacing.md};
  font-size: ${theme.fontSize.sm};
  color: ${theme.colors.mutedForeground};
`;

const Grade = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
  gap: ${theme.spacing.md};
`;

const Rodape = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${theme.spacing.sm};
  margin-top: ${theme.spacing.md};
`;

interface Form {
  obrigacoes: number;
  desempenho: number;
  restantes: number;
  percentual: number;
}

/**
 * Limites por categoria e a regra de "próximo do limite". Ao salvar, o
 * backend reavalia a faixa de todo mundo e avisa quem subiu; o número de
 * avisos volta de `POST /avisos/reavaliar`.
 */
export function GpLimitesCard() {
  const { token } = useAuth();
  const [form, setForm] = useState<Form | null>(null);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [resultado, setResultado] = useState("");

  useEffect(() => {
    if (!token) return;
    let vivo = true;
    getConfiguracao(token)
      .then((c) => {
        if (vivo)
          setForm({
            obrigacoes: c.gp_limite_obrigacoes,
            desempenho: c.gp_limite_desempenho,
            restantes: c.gp_alerta_restantes,
            percentual: c.gp_alerta_percentual,
          });
      })
      .catch((err) => vivo && setErro(err instanceof Error ? err.message : "Erro ao carregar"));
    return () => {
      vivo = false;
    };
  }, [token]);

  async function salvar(e: FormEvent) {
    e.preventDefault();
    if (!token || !form) return;
    setSalvando(true);
    setErro("");
    setResultado("");
    try {
      await updateConfiguracao(
        {
          gp_limite_obrigacoes: form.obrigacoes,
          gp_limite_desempenho: form.desempenho,
          gp_alerta_restantes: form.restantes,
          gp_alerta_percentual: form.percentual,
        },
        token,
      );
      const { avisos_gerados } = await reavaliarGpAvisos(token);
      setResultado(
        avisos_gerados > 0
          ? `Situação reavaliada. ${avisos_gerados} aviso(s) gerado(s).`
          : "Situação reavaliada. Nenhum aviso novo.",
      );
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível salvar");
    } finally {
      setSalvando(false);
    }
  }

  const valido = !!form && form.obrigacoes >= 1 && form.desempenho >= 1 && form.restantes >= 0 && form.percentual >= 1;

  return (
    <PageCard>
      <PageCardHeader>
        <PageCardTitle>Limites e alerta</PageCardTitle>
      </PageCardHeader>
      <PageCardContent>
        <Descricao>
          As duas categorias têm limites independentes e nunca são somadas. "Próximo do limite" vale
          quando faltam poucos pontos ou quando a pontuação já passou de uma fração do limite, o que
          vier primeiro. Ao salvar, a situação de todos os membros é reavaliada.
        </Descricao>
        {erro && <ErrorText>{erro}</ErrorText>}
        {!form ? (
          <EmptyText>Carregando...</EmptyText>
        ) : (
          <form onSubmit={salvar}>
            <Grade>
              <FieldGroup>
                <FieldLabel htmlFor="gp-limite-obrigacoes">Limite de obrigações (pts)</FieldLabel>
                <FieldInput
                  id="gp-limite-obrigacoes"
                  type="number"
                  min={1}
                  max={50}
                  value={form.obrigacoes}
                  onChange={(e) => setForm({ ...form, obrigacoes: Number(e.target.value) })}
                />
              </FieldGroup>
              <FieldGroup>
                <FieldLabel htmlFor="gp-limite-desempenho">Limite de desempenho (pts)</FieldLabel>
                <FieldInput
                  id="gp-limite-desempenho"
                  type="number"
                  min={1}
                  max={50}
                  value={form.desempenho}
                  onChange={(e) => setForm({ ...form, desempenho: Number(e.target.value) })}
                />
              </FieldGroup>
              <FieldGroup>
                <FieldLabel htmlFor="gp-alerta-restantes">Avisar quando faltarem N pontos</FieldLabel>
                <FieldInput
                  id="gp-alerta-restantes"
                  type="number"
                  min={0}
                  max={50}
                  value={form.restantes}
                  onChange={(e) => setForm({ ...form, restantes: Number(e.target.value) })}
                />
              </FieldGroup>
              <FieldGroup>
                <FieldLabel htmlFor="gp-alerta-percentual">ou a partir de N% do limite</FieldLabel>
                <FieldInput
                  id="gp-alerta-percentual"
                  type="number"
                  min={1}
                  max={100}
                  value={form.percentual}
                  onChange={(e) => setForm({ ...form, percentual: Number(e.target.value) })}
                />
              </FieldGroup>
            </Grade>
            <Rodape>
              <PageButton type="submit" disabled={salvando || !valido}>
                {salvando ? "Salvando..." : "Salvar limites"}
              </PageButton>
              {resultado && <EmptyText role="status">{resultado}</EmptyText>}
            </Rodape>
          </form>
        )}
      </PageCardContent>
    </PageCard>
  );
}
