import { useState } from "react";
import { Plus } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  apagarArquivoConteudoSilencioso,
  type ArquivoConteudo,
  type Aula,
  type CapacitacaoDados,
  type Conteudo,
} from "@/lib/central";
import { PageButtonSm } from "@/styles/page.styled";
import { FieldSelect } from "@/pages/Bancas.styled";
import { Bloco, Campo, CampoArquivo, CampoImagens, ListaTextos, ModalEditor, SeletorFichas, Texto, TextoLongo } from "./editores";
import { mover, useFichasPublicadas } from "./editores-util";

const AULA_VAZIA: Aula = { escopo: "", gestao: "", titulo: "", descricao: "", formato: "", previas: [], arquivo_id: null, link: null, conteudo: [], ficha_ids: [], metodo: null };

/** Os ids de arquivo que as aulas ainda usam (prévias e arquivo completo). */
function idsUsados(dados: CapacitacaoDados): Set<number> {
  const usados = new Set<number>();
  for (const a of dados.aulas) {
    a.previas.forEach((id) => usados.add(id));
    if (a.arquivo_id) usados.add(a.arquivo_id);
  }
  return usados;
}

/** O editor da Capacitação: as aulas, uma a uma. As prévias (imagens) e o
 *  arquivo completo são enviados de dentro de cada aula (2026-10-30, a
 *  pedido: acabou a lista separada em que se enviava tudo e depois se
 *  escolhia pelo nome). Ao salvar, os arquivos que nenhuma aula usa mais
 *  são apagados. */
export function EditorCapacitacao({ conteudo, escoposDoMetodo, onFechar, onSalvo }: { conteudo: Conteudo<CapacitacaoDados>; escoposDoMetodo: { chave: string; nome: string }[]; onFechar: () => void; onSalvo: (novo: Conteudo<CapacitacaoDados>) => void }) {
  const { token } = useAuth();
  const [d, setD] = useState<CapacitacaoDados>(() => JSON.parse(JSON.stringify(conteudo.dados)));
  const [arquivos, setArquivos] = useState<ArquivoConteudo[]>(conteudo.arquivos);
  const fichas = useFichasPublicadas();

  function mudarAula(i: number, campo: Partial<Aula>) {
    setD((atual) => ({ ...atual, aulas: atual.aulas.map((a, j) => (j === i ? { ...a, ...campo } : a)) }));
  }

  function salvo(novo: Conteudo<CapacitacaoDados>) {
    const usados = idsUsados(novo.dados);
    const orfaos = novo.arquivos.filter((a) => !usados.has(a.id));
    onSalvo({ ...novo, arquivos: novo.arquivos.filter((a) => usados.has(a.id)) });
    if (token) for (const a of orfaos) apagarArquivoConteudoSilencioso(a.id, token).catch(() => {});
  }

  return (
    <ModalEditor chave="capacitacao" titulo="Capacitação" conteudo={{ ...conteudo, arquivos }} dados={d} onFechar={onFechar} onSalvo={salvo}>
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
            <CampoImagens
              rotulo="Prévias dos slides"
              chave="capacitacao"
              ids={aula.previas}
              onChange={(v) => mudarAula(i, { previas: v })}
              arquivos={arquivos}
              onArquivos={setArquivos}
              ajuda="JPEG ou PNG. As três primeiras aparecem no card; a legenda sai embaixo de cada uma."
            />
            <CampoArquivo
              rotulo="Arquivo completo da aula (para baixar)"
              chave="capacitacao"
              valor={aula.arquivo_id ?? null}
              onChange={(id) => mudarAula(i, { arquivo_id: id })}
              arquivos={arquivos}
              onArquivos={setArquivos}
              aceita=".pdf,.pptx,.ppt,.key,.xlsx,.docx,.zip"
            />
            <Texto rotulo="Ou link da aula (Teams, Drive)" valor={aula.link ?? ""} onChange={(v) => mudarAula(i, { link: v.trim() || null })} placeholder="https://" />
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
