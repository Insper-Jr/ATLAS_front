import { useState } from "react";
import { Plus } from "lucide-react";
import type { ArquivoConteudo, Conteudo, MetodoDados, MetodoEscopo, MetodoPasso } from "@/lib/central";
import { PageButtonSm } from "@/styles/page.styled";
import { FieldSelect } from "@/pages/Bancas.styled";
import { SegmentedButton, SegmentedGroup } from "@/styles/shared.styled";
import { SecaoAjuda, SecaoTitulo } from "./Central.styled";
import { Bloco, Campo, CampoArquivo, ModalEditor, Numero, Texto, TextoLongo } from "./editores";
import { mover, useFichasPublicadas } from "./editores-util";

function chaveDoNome(nome: string): string {
  return nome
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

const ESCOPO_VAZIO: MetodoEscopo = { chave: "", nome: "", pagina: null, decisao: "", erro: "", passos: [] };
const PASSO_VAZIO: MetodoPasso = { nome: "", pergunta: "", nivel: "", pagina: null, ficha_id: null };

/** O editor do Método, campo a campo: cabeçalho e PDF, a parte 0
 *  (fundamentos) e, por escopo, a sequência da análise com adicionar,
 *  remover e reordenar passos. */
export function EditorMetodo({ conteudo, onFechar, onSalvo }: { conteudo: Conteudo<MetodoDados>; onFechar: () => void; onSalvo: (novo: Conteudo<MetodoDados>) => void }) {
  const [d, setD] = useState<MetodoDados>(() => {
    const copia: MetodoDados = JSON.parse(JSON.stringify(conteudo.dados));
    // Conteúdo salvo antes de 2026-10-29 pode trazer campos que a tela não mostra mais.
    copia.escopos = copia.escopos.map((e) => ({ chave: e.chave, nome: e.nome, pagina: e.pagina ?? null, decisao: e.decisao ?? "", erro: e.erro ?? "", passos: e.passos ?? [] }));
    copia.niveis = copia.niveis ?? {};
    return copia;
  });
  const [arquivos, setArquivos] = useState<ArquivoConteudo[]>(conteudo.arquivos);
  const [escopoIdx, setEscopoIdx] = useState(0);
  const fichas = useFichasPublicadas();
  const escopo = d.escopos[escopoIdx];
  const niveis = Object.keys(d.niveis);

  function mudar(campo: Partial<MetodoDados>) {
    setD((atual) => ({ ...atual, ...campo }));
  }
  function mudarEscopo(campo: Partial<MetodoEscopo>) {
    setD((atual) => ({ ...atual, escopos: atual.escopos.map((e, i) => (i === escopoIdx ? { ...e, ...campo } : e)) }));
  }
  function mudarPasso(i: number, campo: Partial<MetodoPasso>) {
    if (!escopo) return;
    mudarEscopo({ passos: escopo.passos.map((p, j) => (j === i ? { ...p, ...campo } : p)) });
  }

  return (
    <ModalEditor chave="metodo" titulo="Método" conteudo={{ ...conteudo, arquivos }} dados={d} onFechar={onFechar} onSalvo={onSalvo}>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <SecaoTitulo style={{ fontSize: "0.875rem" }}>Cabeçalho</SecaoTitulo>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(14rem, 1fr))", gap: "1rem 0.75rem" }}>
          <Texto rotulo="Título" valor={d.titulo} onChange={(v) => mudar({ titulo: v })} />
          <Texto rotulo="Versão" valor={d.versao} onChange={(v) => mudar({ versao: v })} placeholder="v2" />
          <Texto rotulo="Origem" valor={d.origem} onChange={(v) => mudar({ origem: v })} placeholder="Documento de método · núcleo de Inovação" />
          <CampoArquivo rotulo="Documento completo (PDF, até 50 MB)" chave="metodo" valor={d.arquivo_id} onChange={(id) => mudar({ arquivo_id: id })} arquivos={arquivos} onArquivos={setArquivos} aceita=".pdf" />
        </div>
        <TextoLongo rotulo="Descrição" valor={d.descricao} onChange={(v) => mudar({ descricao: v })} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <SecaoTitulo style={{ fontSize: "0.875rem" }}>Parte 0 · Fundamentos</SecaoTitulo>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 3fr) minmax(0, 1fr)", gap: "1rem 0.75rem" }}>
          <Texto rotulo="Título da seção" valor={d.fundamentos.titulo} onChange={(v) => mudar({ fundamentos: { ...d.fundamentos, titulo: v } })} />
          <Numero rotulo="Página no PDF" valor={d.fundamentos.pagina} onChange={(v) => mudar({ fundamentos: { ...d.fundamentos, pagina: v } })} />
        </div>
        <TextoLongo rotulo="Descrição" valor={d.fundamentos.descricao} onChange={(v) => mudar({ fundamentos: { ...d.fundamentos, descricao: v } })} />
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {d.fundamentos.itens.map((item, i) => (
            <Bloco
              key={i}
              titulo={item.titulo || `Fundamento ${i + 1}`}
              aberto={false}
              onSubir={() => mudar({ fundamentos: { ...d.fundamentos, itens: mover(d.fundamentos.itens, i, -1) } })}
              onDescer={() => mudar({ fundamentos: { ...d.fundamentos, itens: mover(d.fundamentos.itens, i, 1) } })}
              onRemover={() => mudar({ fundamentos: { ...d.fundamentos, itens: d.fundamentos.itens.filter((_, j) => j !== i) } })}
            >
              <Texto rotulo="Título" valor={item.titulo} onChange={(v) => mudar({ fundamentos: { ...d.fundamentos, itens: d.fundamentos.itens.map((x, j) => (j === i ? { ...x, titulo: v } : x)) } })} />
              <TextoLongo rotulo="Texto" valor={item.texto} onChange={(v) => mudar({ fundamentos: { ...d.fundamentos, itens: d.fundamentos.itens.map((x, j) => (j === i ? { ...x, texto: v } : x)) } })} />
            </Bloco>
          ))}
          <div>
            <PageButtonSm type="button" $variant="outline" onClick={() => mudar({ fundamentos: { ...d.fundamentos, itens: [...d.fundamentos.itens, { titulo: "", texto: "" }] } })}>
              <Plus size={14} /> Adicionar fundamento
            </PageButtonSm>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <SecaoTitulo style={{ fontSize: "0.875rem" }}>Escopos e sequência da análise</SecaoTitulo>
        <SegmentedGroup role="tablist" aria-label="Escopo em edição">
          {d.escopos.map((e, i) => (
            <SegmentedButton key={i} type="button" role="tab" $ativo={i === escopoIdx} onClick={() => setEscopoIdx(i)}>
              {e.nome || `Escopo ${i + 1}`}
            </SegmentedButton>
          ))}
          <SegmentedButton
            type="button"
            $ativo={false}
            onClick={() => {
              mudar({ escopos: [...d.escopos, { ...ESCOPO_VAZIO, chave: `escopo_${d.escopos.length + 1}` }] });
              setEscopoIdx(d.escopos.length);
            }}
          >
            + Novo escopo
          </SegmentedButton>
        </SegmentedGroup>
        {escopo && (
          <Bloco
            titulo={escopo.nome || "Escopo"}
            onSubir={escopoIdx > 0 ? () => { mudar({ escopos: mover(d.escopos, escopoIdx, -1) }); setEscopoIdx(escopoIdx - 1); } : undefined}
            onDescer={escopoIdx < d.escopos.length - 1 ? () => { mudar({ escopos: mover(d.escopos, escopoIdx, 1) }); setEscopoIdx(escopoIdx + 1); } : undefined}
            onRemover={() => {
              if (!window.confirm(`Remover o escopo "${escopo.nome}" do Método?`)) return;
              mudar({ escopos: d.escopos.filter((_, j) => j !== escopoIdx) });
              setEscopoIdx(0);
            }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 3fr) minmax(0, 1fr)", gap: "1rem 0.75rem" }}>
              <Texto rotulo="Nome" valor={escopo.nome} onChange={(v) => mudarEscopo({ nome: v, chave: escopo.chave || chaveDoNome(v) })} />
              <Numero rotulo="Página no PDF" valor={escopo.pagina} onChange={(v) => mudarEscopo({ pagina: v })} />
            </div>
            <TextoLongo rotulo="A decisão que este escopo serve" valor={escopo.decisao} onChange={(v) => mudarEscopo({ decisao: v })} />
            <TextoLongo rotulo="O erro estrutural a evitar" valor={escopo.erro} onChange={(v) => mudarEscopo({ erro: v })} />

            <Campo rotulo="Sequência da análise" ajuda="Cada passo com a pergunta que ele responde, o nível e a página do PDF. Use as setas para reordenar.">
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {escopo.passos.map((p, i) => (
                  <Bloco
                    key={i}
                    titulo={`${i + 1}. ${p.nome || "Passo"}`}
                    aberto={!p.nome}
                    onSubir={() => mudarEscopo({ passos: mover(escopo.passos, i, -1) })}
                    onDescer={() => mudarEscopo({ passos: mover(escopo.passos, i, 1) })}
                    onRemover={() => mudarEscopo({ passos: escopo.passos.filter((_, j) => j !== i) })}
                  >
                    <Texto rotulo="Passo" valor={p.nome} onChange={(v) => mudarPasso(i, { nome: v })} />
                    <TextoLongo rotulo="Pergunta que responde" valor={p.pergunta} onChange={(v) => mudarPasso(i, { pergunta: v })} />
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(10rem, 1fr))", gap: "1rem 0.75rem" }}>
                      <Campo rotulo="Nível">
                        <FieldSelect value={p.nivel} onChange={(e) => mudarPasso(i, { nivel: e.target.value })}>
                          <option value="">Sem nível</option>
                          {niveis.map((n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                          {p.nivel && !niveis.includes(p.nivel) && <option value={p.nivel}>{p.nivel}</option>}
                        </FieldSelect>
                      </Campo>
                      <Numero rotulo="Página no PDF" valor={p.pagina} onChange={(v) => mudarPasso(i, { pagina: v })} />
                      <Campo rotulo="Ficha relacionada">
                        <FieldSelect value={p.ficha_id ? String(p.ficha_id) : ""} onChange={(e) => mudarPasso(i, { ficha_id: e.target.value ? Number(e.target.value) : null })} pesquisavel>
                          <option value="">Nenhuma</option>
                          {fichas.map((f) => (
                            <option key={f.id} value={String(f.id)}>
                              {f.codigo} · {f.titulo}
                            </option>
                          ))}
                        </FieldSelect>
                      </Campo>
                    </div>
                  </Bloco>
                ))}
                <div>
                  <PageButtonSm type="button" $variant="outline" onClick={() => mudarEscopo({ passos: [...escopo.passos, { ...PASSO_VAZIO, nivel: niveis[0] ?? "" }] })}>
                    <Plus size={14} /> Adicionar passo
                  </PageButtonSm>
                </div>
              </div>
            </Campo>
          </Bloco>
        )}
        {d.escopos.length === 0 && <SecaoAjuda>Nenhum escopo. Clique em "Novo escopo".</SecaoAjuda>}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <SecaoTitulo style={{ fontSize: "0.875rem" }}>Níveis dos passos</SecaoTitulo>
        <SecaoAjuda>Os níveis que um passo pode ter (Núcleo, Condicional...) e o que cada um significa. Apague todos se não quiser usar níveis.</SecaoAjuda>
        {Object.entries(d.niveis).map(([nivel, texto], i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 2fr) auto", gap: "0.5rem", alignItems: "end" }}>
            <Texto
              rotulo="Nível"
              valor={nivel}
              onChange={(v) => {
                const entradas = Object.entries(d.niveis).map(([n, t], j) => (j === i ? [v, t] : [n, t]));
                mudar({ niveis: Object.fromEntries(entradas) });
              }}
            />
            <Texto
              rotulo="O que significa"
              valor={texto}
              onChange={(v) => {
                const entradas = Object.entries(d.niveis).map(([n, t], j) => (j === i ? [n, v] : [n, t]));
                mudar({ niveis: Object.fromEntries(entradas) });
              }}
            />
            <PageButtonSm type="button" $variant="ghost" style={{ marginBottom: "0.125rem" }} onClick={() => mudar({ niveis: Object.fromEntries(Object.entries(d.niveis).filter((_, j) => j !== i)) })}>
              Remover
            </PageButtonSm>
          </div>
        ))}
        <div>
          <PageButtonSm type="button" $variant="outline" onClick={() => mudar({ niveis: { ...d.niveis, [`Nível ${niveis.length + 1}`]: "" } })}>
            <Plus size={14} /> Adicionar nível
          </PageButtonSm>
        </div>
      </div>
    </ModalEditor>
  );
}
