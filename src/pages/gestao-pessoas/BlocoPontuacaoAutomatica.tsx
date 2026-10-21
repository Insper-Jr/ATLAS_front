import styled from "styled-components";
import { theme } from "@/styles/theme";
import type { GpAlvoPdi, GpTipo } from "@/lib/gestao-pessoas";
import { ROTULO_ALVO_PDI, rotuloDoTipo, tiposParaSelecao } from "@/lib/gp-rotulos";
import { formatarData } from "@/lib/projetos";
import { EmptyText } from "@/styles/page.styled";
import { FieldGroup, FieldInput, FieldLabel, FieldSelect } from "@/pages/Bancas.styled";

const Bloco = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md};
  border-radius: ${theme.borderRadius.lg};
  border: 1px solid ${theme.colors.border};
  background: ${theme.colors.muted};
`;

const Toggle = styled.label`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  font-size: ${theme.fontSize.sm};
  font-weight: ${theme.fontWeight.medium};
  color: ${theme.colors.foreground};
  cursor: pointer;

  input {
    accent-color: ${theme.colors.primary};
  }
`;

const Campos = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 6rem;
  gap: ${theme.spacing.sm};
  align-items: end;

  @media (max-width: ${theme.breakpoints.sm}px) {
    grid-template-columns: 1fr;
  }
`;

export interface PontuacaoAutomaticaValor {
  pontua: boolean;
  tipoId: number | null;
  pontos: number;
  alvo: GpAlvoPdi;
}

/**
 * O bloco "quem ficar pendente no prazo toma ponto?" dos formulários de lote
 * e de pasta de PDI. `comAlvo` acrescenta "Quem toma" (só o PDI tem mentor e
 * mentorado). `aplicadoEm` trava tudo: os pontos já saíram.
 */
export function BlocoPontuacaoAutomatica({
  idPrefixo,
  pergunta,
  tipos,
  valor,
  onChange,
  comAlvo,
  aplicadoEm,
}: {
  idPrefixo: string;
  pergunta: string;
  tipos: GpTipo[];
  valor: PontuacaoAutomaticaValor;
  onChange: (novo: PontuacaoAutomaticaValor) => void;
  comAlvo?: boolean;
  aplicadoEm?: string | null;
}) {
  const travado = !!aplicadoEm;
  const opcoes = tiposParaSelecao(tipos);

  function escolherTipo(valorTexto: string) {
    const tipoId = valorTexto ? Number(valorTexto) : null;
    const tipo = opcoes.find((t) => t.id === tipoId);
    // Os pontos sugeridos do tipo entram como padrão; a pessoa pode mudar.
    onChange({ ...valor, tipoId, pontos: tipo ? tipo.pontos : valor.pontos });
  }

  return (
    <Bloco>
      <Toggle>
        <input
          type="checkbox"
          checked={valor.pontua}
          disabled={travado}
          onChange={(e) => onChange({ ...valor, pontua: e.target.checked })}
        />
        {pergunta}
      </Toggle>
      {aplicadoEm && <EmptyText>Pontos aplicados em {formatarData(aplicadoEm)}.</EmptyText>}
      {valor.pontua && (
        <>
          <Campos>
            <FieldGroup>
              <FieldLabel htmlFor={`${idPrefixo}-gp-tipo`}>Tipo de ocorrência</FieldLabel>
              <FieldSelect
                id={`${idPrefixo}-gp-tipo`}
                value={valor.tipoId ?? ""}
                disabled={travado}
                onChange={(e) => escolherTipo(e.target.value)}
              >
                <option value="">Selecione</option>
                {opcoes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {rotuloDoTipo(t)}
                  </option>
                ))}
              </FieldSelect>
            </FieldGroup>
            <FieldGroup>
              <FieldLabel htmlFor={`${idPrefixo}-gp-pontos`}>Pontos</FieldLabel>
              <FieldInput
                id={`${idPrefixo}-gp-pontos`}
                type="number"
                min={1}
                max={20}
                value={valor.pontos}
                disabled={travado}
                onChange={(e) => onChange({ ...valor, pontos: Number(e.target.value) })}
              />
            </FieldGroup>
          </Campos>
          {comAlvo && (
            <FieldGroup>
              <FieldLabel htmlFor={`${idPrefixo}-gp-alvo`}>Quem toma</FieldLabel>
              <FieldSelect
                id={`${idPrefixo}-gp-alvo`}
                value={valor.alvo}
                disabled={travado}
                onChange={(e) => onChange({ ...valor, alvo: e.target.value as GpAlvoPdi })}
              >
                {(Object.keys(ROTULO_ALVO_PDI) as GpAlvoPdi[]).map((alvo) => (
                  <option key={alvo} value={alvo}>
                    {ROTULO_ALVO_PDI[alvo]}
                  </option>
                ))}
              </FieldSelect>
            </FieldGroup>
          )}
        </>
      )}
    </Bloco>
  );
}
