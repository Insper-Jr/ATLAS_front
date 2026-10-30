import { useState } from "react";
import { Plus } from "lucide-react";
import type { ArquivoConteudo, Aula, CapacitacaoDados, Conteudo } from "@/lib/central";
import { PageButtonSm } from "@/styles/page.styled";
import { FieldSelect } from "@/pages/Bancas.styled";
import { ArquivosVitrine, Bloco, Campo, ListaTextos, ModalEditor, SeletorArquivo, SeletorFichas, SeletorImagens, Texto, TextoLongo } from "./editores";
import { mover, useFichasPublicadas } from "./editores-util";

const AULA_VAZIA: Aula = { escopo: "", gestao: "", titulo: "", descricao: "", formato: "", previas: [], arquivo_id: null, link: null, conteudo: [], ficha_ids: [], metodo: null };

/** O editor da Capacitação: as aulas, uma a uma, com as prévias (imagens)
 *  e o arquivo completo escolhidos entre os enviados, ou um link. */
export function EditorCapacitacao({ conteudo, escoposDoMetodo, onFechar, onSalvo }: { conteudo: Conteudo<CapacitacaoDados>; escoposDoMetodo: { chave: string; nome: string }[]; onFechar: () => void; onSalvo: (novo: Conteudo<CapacitacaoDados>) => void }) {
  const [d, setD] = useState<CapacitacaoDados>(() => JSON.parse(JSON.stringify(conteudo.dados)));
  const [arquivos, setArquivos] = useState<ArquivoConteudo[]>(conteudo.arquivos);
  const fichas = useFichasPublicadas();

  function mudarAula(i: number, campo: Partial<Aula>) {
    setD((atual) => ({ ...atual, aulas: atual.aulas.map((a, j) => (j === i ? { ...a, ...campo } : a)) }));
  }

  return (
    <ModalEditor chave="capacitacao" titulo="Capacitação" conteudo={{ ...conteudo, arquivos }} dados={d} onFechar={onFechar} onSalvo={onSalvo}>
      <ArquivosVitrine
        chave="capacitacao"
        arquivos={arquivos}
        onChange={setArquivos}
        aceita=".png,.jpg,.jpeg,.webp,.pdf,.pptx,.ppt,.key,.xlsx,.docx,.zip"
        ajuda="Envie aqui as prévias (JPEG ou PNG dos slides, com legenda) e o arquivo completo de cada aula (PDF, PowerPoint...). Depois escolha-os em cada aula."
      />
      <TextoLongo rotulo="Texto de abertura" valor={d.descricao} onChange={(v) => setD({ ...d, descricao: v })} />
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {d.aulas.map((aula, i) => (
          <Bloco
            key={i}
            titulo={aula.titulo || `Aula ${i + 1}`}
            aberto={!aula.titulo}
            onSubir={() => setD({ ...d, aulas: mover(d.aulas, i, -1) })}
            onDescer={() => setD({ ...d, aulas: mover(d.aulas, i, 1) })}
            onRemover={() => {
              if (!window.confirm(`Remover a aula "${aula.titulo}"?`)) return;
              setD({ ...d, aulas: d.aulas.filter((_, j) => j !== i) });
            }}
          >
            <Texto rotulo="Título" valor={aula.titulo} onChange={(v) => mudarAula(i, { titulo: v })} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(12rem, 1fr))", gap: "1rem 0.75rem" }}>
              <Texto rotulo="Escopo" valor={aula.escopo} onChange={(v) => mudarAula(i, { escopo: v })} placeholder="Ex.: Análise mercadológica" />
              <Texto rotulo="Gestão" valor={aula.gestao} onChange={(v) => mudarAula(i, { gestao: v })} placeholder="Ex.: 51ª Gestão · 2026.2" />
              <Texto rotulo="Formato" valor={aula.formato} onChange={(v) => mudarAula(i, { formato: v })} placeholder="Ex.: Aula em slides · 119 slides" />
              <Campo rotulo="Escopo no Método">
                <FieldSelect value={aula.metodo ?? ""} onChange={(e) => mudarAula(i, { metodo: e.target.value || null })}>
                  <option value="">Nenhum</option>
                  {escoposDoMetodo.map((e) => (
                    <option key={e.chave} value={e.chave}>
                      {e.nome}
                    </option>
                  ))}
                </FieldSelect>
              </Campo>
            </div>
            <TextoLongo rotulo="Descrição" valor={aula.descricao} onChange={(v) => mudarAula(i, { descricao: v })} />
            <SeletorImagens rotulo="Prévias (até 3 imagens aparecem no card)" ids={aula.previas} onChange={(v) => mudarAula(i, { previas: v })} arquivos={arquivos} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(14rem, 1fr))", gap: "1rem 0.75rem" }}>
              <SeletorArquivo rotulo="Arquivo completo da aula (para baixar)" valor={aula.arquivo_id ?? null} onChange={(id) => mudarAula(i, { arquivo_id: id })} arquivos={arquivos.filter((a) => !a.imagem)} />
              <Texto rotulo="Ou link da aula (Teams, Drive)" valor={aula.link ?? ""} onChange={(v) => mudarAula(i, { link: v.trim() || null })} placeholder="https://" />
            </div>
            <ListaTextos rotulo="Conteúdo da aula" itens={aula.conteudo} onChange={(v) => mudarAula(i, { conteudo: v })} placeholder="Um tópico por linha" />
            <SeletorFichas rotulo="Fichas relacionadas" ids={aula.ficha_ids} onChange={(v) => mudarAula(i, { ficha_ids: v })} fichas={fichas} />
          </Bloco>
        ))}
        <div>
          <PageButtonSm type="button" $variant="outline" onClick={() => setD({ ...d, aulas: [...d.aulas, { ...AULA_VAZIA }] })}>
            <Plus size={14} /> Adicionar aula
          </PageButtonSm>
        </div>
      </div>
    </ModalEditor>
  );
}
