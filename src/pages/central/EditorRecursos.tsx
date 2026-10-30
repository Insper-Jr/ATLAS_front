import { useState } from "react";
import { Plus } from "lucide-react";
import type { Conteudo, RecursoExterno, RecursosDados } from "@/lib/central";
import { PageButtonSm } from "@/styles/page.styled";
import { FieldInput } from "@/pages/Bancas.styled";
import { Bloco, BotoesItem, Campo, ModalEditor, Texto, TextoLongo } from "./editores";
import { mover } from "./editores-util";

const ITEM_VAZIO: RecursoExterno = { nome: "", tipo: "", descricao: "", url: "", recursos: [], acesso: "" };

/** O editor dos Recursos externos: grupos (Cursos, Bases de dados) e, em
 *  cada um, os cursos com a tabela de quando usar. */
export function EditorRecursos({ conteudo, onFechar, onSalvo }: { conteudo: Conteudo<RecursosDados>; onFechar: () => void; onSalvo: (novo: Conteudo<RecursosDados>) => void }) {
  const [d, setD] = useState<RecursosDados>(() => JSON.parse(JSON.stringify(conteudo.dados)));

  function mudarGrupo(g: number, campo: Partial<RecursosDados["grupos"][number]>) {
    setD((atual) => ({ ...atual, grupos: atual.grupos.map((x, i) => (i === g ? { ...x, ...campo } : x)) }));
  }
  function mudarItem(g: number, i: number, campo: Partial<RecursoExterno>) {
    setD((atual) => ({
      ...atual,
      grupos: atual.grupos.map((x, gi) => (gi === g ? { ...x, itens: x.itens.map((it, ii) => (ii === i ? { ...it, ...campo } : it)) } : x)),
    }));
  }

  return (
    <ModalEditor chave="recursos" titulo="Recursos externos" conteudo={conteudo} dados={d} onFechar={onFechar} onSalvo={onSalvo}>
      <TextoLongo rotulo="Texto de abertura" valor={d.descricao} onChange={(v) => setD({ ...d, descricao: v })} />
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {d.grupos.map((grupo, g) => (
          <Bloco
            key={g}
            titulo={grupo.titulo || `Grupo ${g + 1}`}
            onSubir={() => setD({ ...d, grupos: mover(d.grupos, g, -1) })}
            onDescer={() => setD({ ...d, grupos: mover(d.grupos, g, 1) })}
            onRemover={() => {
              if (!window.confirm(`Remover o grupo "${grupo.titulo}" e tudo dentro dele?`)) return;
              setD({ ...d, grupos: d.grupos.filter((_, j) => j !== g) });
            }}
          >
            <Texto rotulo="Nome do grupo" valor={grupo.titulo} onChange={(v) => mudarGrupo(g, { titulo: v })} placeholder="Ex.: Cursos" />
            {grupo.itens.map((item, i) => (
              <Bloco
                key={i}
                titulo={item.nome || `Item ${i + 1}`}
                aberto={!item.nome}
                onSubir={() => mudarGrupo(g, { itens: mover(grupo.itens, i, -1) })}
                onDescer={() => mudarGrupo(g, { itens: mover(grupo.itens, i, 1) })}
                onRemover={() => mudarGrupo(g, { itens: grupo.itens.filter((_, j) => j !== i) })}
              >
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(12rem, 1fr))", gap: "0.75rem" }}>
                  <Texto rotulo="Nome" valor={item.nome} onChange={(v) => mudarItem(g, i, { nome: v })} />
                  <Texto rotulo="Tipo" valor={item.tipo} onChange={(v) => mudarItem(g, i, { tipo: v })} placeholder="Ex.: Curso online" />
                  <Texto rotulo="Site" valor={item.url ?? ""} onChange={(v) => mudarItem(g, i, { url: v || null })} placeholder="https://" />
                  <Texto rotulo="Como acessar" valor={item.acesso ?? ""} onChange={(v) => mudarItem(g, i, { acesso: v || null })} placeholder="Ex.: Acesso livre" />
                </div>
                <TextoLongo rotulo="Descrição" valor={item.descricao} onChange={(v) => mudarItem(g, i, { descricao: v })} />
                <Campo rotulo="Quando usar na Insper Jr.">
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                    {item.recursos.map((r, ri) => (
                      <div key={ri} style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr) minmax(0, 3fr) auto", gap: "0.375rem", alignItems: "center" }}>
                        <FieldInput aria-label="Curso ou recurso" value={r.nome} onChange={(e) => mudarItem(g, i, { recursos: item.recursos.map((x, j) => (j === ri ? { ...x, nome: e.target.value } : x)) })} placeholder="Curso ou recurso" />
                        <FieldInput aria-label="Escopo" value={r.escopo} onChange={(e) => mudarItem(g, i, { recursos: item.recursos.map((x, j) => (j === ri ? { ...x, escopo: e.target.value } : x)) })} placeholder="Escopo" />
                        <FieldInput aria-label="Quando usar" value={r.quando} onChange={(e) => mudarItem(g, i, { recursos: item.recursos.map((x, j) => (j === ri ? { ...x, quando: e.target.value } : x)) })} placeholder="Quando usar" />
                        <BotoesItem onRemover={() => mudarItem(g, i, { recursos: item.recursos.filter((_, j) => j !== ri) })} />
                      </div>
                    ))}
                    <div>
                      <PageButtonSm type="button" $variant="outline" onClick={() => mudarItem(g, i, { recursos: [...item.recursos, { nome: "", escopo: "", quando: "" }] })}>
                        <Plus size={14} /> Adicionar linha
                      </PageButtonSm>
                    </div>
                  </div>
                </Campo>
              </Bloco>
            ))}
            <div>
              <PageButtonSm type="button" $variant="outline" onClick={() => mudarGrupo(g, { itens: [...grupo.itens, { ...ITEM_VAZIO }] })}>
                <Plus size={14} /> Adicionar item ao grupo
              </PageButtonSm>
            </div>
          </Bloco>
        ))}
        <div>
          <PageButtonSm type="button" $variant="outline" onClick={() => setD({ ...d, grupos: [...d.grupos, { titulo: "", itens: [] }] })}>
            <Plus size={14} /> Adicionar grupo
          </PageButtonSm>
        </div>
      </div>
    </ModalEditor>
  );
}
