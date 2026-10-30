import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getCategorias, type Categoria } from "@/lib/central";
import { FieldGroup, FieldInput, FieldLabel, FieldSelect, FieldTextarea } from "@/pages/Bancas.styled";
import { SecaoAjuda, SecaoTitulo } from "./Central.styled";
import type { PreIndicacao } from "./pre-indicacao";

/**
 * O bloco opcional "Indicar para a Central" nas telas em que o avaliador
 * escreve a avaliação (fase 2). O gerente da frente decide a pertinência;
 * o coordenador vê a indicação no arquivamento do projeto.
 */
export function PreIndicacaoBanca({ valor, onChange, idPrefixo }: { valor: PreIndicacao; onChange: (v: PreIndicacao) => void; idPrefixo: string }) {
  const { token } = useAuth();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  useEffect(() => {
    if (!token) return;
    let vivo = true;
    getCategorias(token)
      .then((lista) => vivo && setCategorias(lista.filter((c) => c.ativa)))
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, [token]);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", paddingTop: "0.5rem", borderTop: "1px solid var(--atlas-border)" }}>
      <SecaoTitulo style={{ fontSize: "0.875rem" }}>Indicar para a Central de Conhecimento (opcional)</SecaoTitulo>
      <SecaoAjuda>
        Algo deste projeto merece virar ficha na Tool Box? Uma metodologia, ferramenta ou fonte que outros projetos deveriam
        conhecer. O gerente da frente decide se vale a ficha.
      </SecaoAjuda>
      <FieldGroup>
        <FieldLabel htmlFor={`${idPrefixo}-titulo`}>O que se destacou</FieldLabel>
        <FieldInput
          id={`${idPrefixo}-titulo`}
          maxLength={200}
          value={valor.titulo}
          onChange={(e) => onChange({ ...valor, titulo: e.target.value })}
          placeholder="Ex.: análise de demanda por palavras-chave"
        />
      </FieldGroup>
      <FieldGroup>
        <FieldLabel htmlFor={`${idPrefixo}-tipo`}>Categoria</FieldLabel>
        <FieldSelect id={`${idPrefixo}-tipo`} value={valor.tipo} onChange={(e) => onChange({ ...valor, tipo: e.target.value })}>
          {categorias.length === 0 && <option value={valor.tipo}>{valor.tipo}</option>}
          {categorias.map((c) => (
            <option key={c.chave} value={c.chave}>
              {c.nome}
            </option>
          ))}
        </FieldSelect>
      </FieldGroup>
      <FieldGroup>
        <FieldLabel htmlFor={`${idPrefixo}-porque`}>Por que se destacou</FieldLabel>
        <FieldTextarea
          id={`${idPrefixo}-porque`}
          rows={2}
          value={valor.porQue}
          onChange={(e) => onChange({ ...valor, porQue: e.target.value })}
          placeholder="Em até duas linhas"
        />
      </FieldGroup>
    </div>
  );
}
