import { useEffect, useMemo, useState, type FormEvent } from "react";
import styled from "styled-components";
import { theme } from "@/styles/theme";
import { useAuth } from "@/context/AuthContext";
import { getConfiguracao, updateConfiguracao } from "@/lib/configuracao";
import { getGpResumo, reavaliarGpAvisos, type GpCategoria, type GpMembroResumo } from "@/lib/gestao-pessoas";
import { ROTULO_CATEGORIA, renderizarAviso } from "@/lib/gp-rotulos";
import {
  EmptyText,
  ErrorText,
  PageButton,
  PageCard,
  PageCardContent,
  PageCardHeader,
  PageCardTitle,
} from "@/styles/page.styled";
import { FieldGroup, FieldInput, FieldLabel, FieldSelect, FieldTextarea } from "@/pages/Bancas.styled";

const Descricao = styled.p`
  margin: 0 0 ${theme.spacing.md};
  font-size: ${theme.fontSize.sm};
  color: ${theme.colors.mutedForeground};
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
`;

const Toggle = styled.label`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  font-size: ${theme.fontSize.sm};
  color: ${theme.colors.foreground};
  cursor: pointer;

  input {
    accent-color: ${theme.colors.primary};
  }
`;

const Dica = styled.span`
  font-size: ${theme.fontSize.xs};
  color: ${theme.colors.mutedForeground};
`;

const PreviaBloco = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md};
  border-radius: ${theme.borderRadius.lg};
  border: 1px solid ${theme.colors.border};
  background: ${theme.colors.muted};
`;

const PreviaFiltros = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.sm};

  & > * {
    flex: 1 1 12rem;
  }
`;

const PreviaAssunto = styled.p`
  margin: 0;
  font-size: ${theme.fontSize.sm};
  font-weight: ${theme.fontWeight.semibold};
  color: ${theme.colors.foreground};
`;

const PreviaCorpo = styled.p`
  margin: 0;
  font-size: ${theme.fontSize.sm};
  line-height: 1.5;
  white-space: pre-wrap;
  color: ${theme.colors.foreground};
`;

const Rodape = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${theme.spacing.sm};
`;

interface Form {
  ativos: boolean;
  copia: boolean;
  assunto: string;
  corpo: string;
}

/**
 * O modelo do aviso por e-mail e os dois interruptores. A prévia usa um
 * membro de verdade (o primeiro em alerta, por padrão); quem só configura e
 * não gere a Gestão de Pessoas não vê a lista e cai num exemplo.
 */
export function GpAvisosCard() {
  const { token } = useAuth();
  const [form, setForm] = useState<Form | null>(null);
  const [limites, setLimites] = useState({ obrigacoes: 6, desempenho: 5 });
  const [membros, setMembros] = useState<GpMembroResumo[]>([]);
  const [previaMembroId, setPreviaMembroId] = useState<number | null>(null);
  const [previaCategoria, setPreviaCategoria] = useState<GpCategoria>("obrigacoes");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [resultado, setResultado] = useState("");

  useEffect(() => {
    if (!token) return;
    let vivo = true;
    getConfiguracao(token)
      .then((c) => {
        if (!vivo) return;
        setForm({
          ativos: c.gp_alertas_ativos,
          copia: c.gp_copia_diretoria,
          assunto: c.gp_aviso_assunto,
          corpo: c.gp_aviso_corpo,
        });
        setLimites({ obrigacoes: c.gp_limite_obrigacoes, desempenho: c.gp_limite_desempenho });
      })
      .catch((err) => vivo && setErro(err instanceof Error ? err.message : "Erro ao carregar"));
    getGpResumo(token)
      .then((r) => {
        if (!vivo) return;
        const ativos = r.membros.filter((m) => m.ativo);
        setMembros(ativos);
        const emAlerta = ativos.find((m) => m.obrigacoes.faixa !== "ok" || m.desempenho.faixa !== "ok");
        const escolhido = emAlerta ?? ativos[0];
        if (escolhido) {
          setPreviaMembroId(escolhido.usuario_id);
          setPreviaCategoria(escolhido.obrigacoes.faixa !== "ok" || escolhido.desempenho.faixa === "ok" ? "obrigacoes" : "desempenho");
        }
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, [token]);

  const previa = useMemo(() => {
    if (!form) return null;
    const membro = membros.find((m) => m.usuario_id === previaMembroId);
    const dados = membro
      ? { nome: membro.nome, categoria: previaCategoria, pontuacao: membro[previaCategoria].pontos, limite: membro[previaCategoria].limite }
      : { nome: "Ana Beatriz Costa", categoria: previaCategoria, pontuacao: 4, limite: limites[previaCategoria] };
    return {
      nome: dados.nome,
      assunto: renderizarAviso(form.assunto, dados),
      corpo: renderizarAviso(form.corpo, dados),
    };
  }, [form, membros, previaMembroId, previaCategoria, limites]);

  async function salvar(e: FormEvent) {
    e.preventDefault();
    if (!token || !form) return;
    if (!form.assunto.trim() || !form.corpo.trim()) {
      setErro("Assunto e mensagem são obrigatórios.");
      return;
    }
    setSalvando(true);
    setErro("");
    setResultado("");
    try {
      const antes = await getConfiguracao(token);
      await updateConfiguracao(
        {
          gp_alertas_ativos: form.ativos,
          gp_copia_diretoria: form.copia,
          gp_aviso_assunto: form.assunto.trim(),
          gp_aviso_corpo: form.corpo,
        },
        token,
      );
      // Ligar os alertas reavalia quem já estava acima da faixa com eles
      // desligados; o backend também faz isso, aqui é só pra mostrar quantos.
      if (!antes.gp_alertas_ativos && form.ativos) {
        const { avisos_gerados } = await reavaliarGpAvisos(token);
        setResultado(avisos_gerados > 0 ? `Salvo. ${avisos_gerados} aviso(s) pendente(s) gerado(s).` : "Salvo.");
      } else {
        setResultado("Salvo.");
      }
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível salvar");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <PageCard>
      <PageCardHeader>
        <PageCardTitle>Aviso por e-mail</PageCardTitle>
      </PageCardHeader>
      <PageCardContent>
        <Descricao>
          Cada membro recebe um aviso por mudança de situação (próximo do limite, no limite), sem
          duplicados. Se a pontuação cair, o ciclo reinicia. O aviso também aparece no sino.
        </Descricao>
        {erro && <ErrorText>{erro}</ErrorText>}
        {!form ? (
          <EmptyText>Carregando...</EmptyText>
        ) : (
          <Form onSubmit={salvar}>
            <Toggle>
              <input type="checkbox" checked={form.ativos} onChange={(e) => setForm({ ...form, ativos: e.target.checked })} />
              Enviar alertas automaticamente
            </Toggle>
            <Toggle>
              <input type="checkbox" checked={form.copia} onChange={(e) => setForm({ ...form, copia: e.target.checked })} />
              Enviar cópia para a Diretoria de Gestão de Pessoas
            </Toggle>
            <FieldGroup>
              <FieldLabel htmlFor="gp-aviso-assunto">Assunto</FieldLabel>
              <FieldInput
                id="gp-aviso-assunto"
                value={form.assunto}
                onChange={(e) => setForm({ ...form, assunto: e.target.value })}
                required
              />
            </FieldGroup>
            <FieldGroup>
              <FieldLabel htmlFor="gp-aviso-corpo">Mensagem</FieldLabel>
              <FieldTextarea
                id="gp-aviso-corpo"
                rows={12}
                value={form.corpo}
                onChange={(e) => setForm({ ...form, corpo: e.target.value })}
                required
              />
              <Dica>
                Variáveis: {"{{nome}}"}, {"{{nome_completo}}"}, {"{{categoria}}"}, {"{{pontuacao}}"},{" "}
                {"{{limite}}"}, {"{{restantes}}"}. Valem no assunto e na mensagem.
              </Dica>
            </FieldGroup>

            {previa && (
              <PreviaBloco>
                <PreviaFiltros>
                  <FieldSelect
                    aria-label="Membro da prévia"
                    value={previaMembroId ?? ""}
                    onChange={(e) => setPreviaMembroId(e.target.value ? Number(e.target.value) : null)}
                    pesquisavel
                  >
                    {membros.length === 0 && <option value="">Exemplo</option>}
                    {membros.map((m) => (
                      <option key={m.usuario_id} value={m.usuario_id}>
                        {m.nome}
                      </option>
                    ))}
                  </FieldSelect>
                  <FieldSelect
                    aria-label="Categoria da prévia"
                    value={previaCategoria}
                    onChange={(e) => setPreviaCategoria(e.target.value as GpCategoria)}
                  >
                    <option value="obrigacoes">{ROTULO_CATEGORIA.obrigacoes}</option>
                    <option value="desempenho">{ROTULO_CATEGORIA.desempenho}</option>
                  </FieldSelect>
                </PreviaFiltros>
                <Dica>Prévia com {previa.nome}, {ROTULO_CATEGORIA[previaCategoria]}</Dica>
                <PreviaAssunto>{previa.assunto}</PreviaAssunto>
                <PreviaCorpo>{previa.corpo}</PreviaCorpo>
              </PreviaBloco>
            )}

            <Rodape>
              <PageButton type="submit" disabled={salvando}>
                {salvando ? "Salvando..." : "Salvar aviso"}
              </PageButton>
              {resultado && <EmptyText role="status">{resultado}</EmptyText>}
            </Rodape>
          </Form>
        )}
      </PageCardContent>
    </PageCard>
  );
}
