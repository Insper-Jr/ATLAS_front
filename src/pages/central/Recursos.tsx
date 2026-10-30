import { Pencil } from "lucide-react";
import type { RecursosDados } from "@/lib/central";
import { ErrorText, PageBadge, PageButtonSm, PageCard, PageCardContent, PageCardHeader, PageCardTitle, PageLoadingBlock } from "@/styles/page.styled";
import { FichaCard, FichaCorpo, FichaRodape, FichaTituloNormal, FichaTopo, FichasLista, GrupoTitulo, Nota, SecaoAjuda, Tabela } from "./Central.styled";
import { EditorRecursos } from "./EditorRecursos";
import { useConteudo } from "./useConteudo";

/** Recursos externos (fase 3): cursos e bases de dados de fora da Insper
 *  Jr., com a indicação de quando usar cada um. */
export function Recursos() {
  const { conteudo, setConteudo, erro, editando, setEditando } = useConteudo<RecursosDados>("recursos");

  if (erro && !conteudo) return <ErrorText>{erro}</ErrorText>;
  if (!conteudo) return <PageLoadingBlock />;

  return (
    <>
      <PageCard>
        <PageCardHeader style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
          <PageCardTitle>Recursos externos</PageCardTitle>
          {conteudo.permissoes.editar && (
            <PageButtonSm type="button" $variant="outline" onClick={() => setEditando(true)}>
              <Pencil size={14} /> Editar
            </PageButtonSm>
          )}
        </PageCardHeader>
        <PageCardContent>
          <Nota style={{ marginTop: 0, marginBottom: "0.75rem" }}>{conteudo.dados.descricao}</Nota>
          {conteudo.dados.grupos.map((g) => (
            <div key={g.titulo}>
              <GrupoTitulo>{g.titulo}</GrupoTitulo>
              <FichasLista style={{ marginBottom: "1rem" }}>
                {g.itens.map((item) => (
                  <FichaCard key={item.nome}>
                    <FichaTopo>
                      <FichaCorpo>
                        <FichaTituloNormal>{item.nome}</FichaTituloNormal>
                        <SecaoAjuda>{item.descricao}</SecaoAjuda>
                      </FichaCorpo>
                      <PageBadge $tone="muted">{item.tipo}</PageBadge>
                    </FichaTopo>
                    {item.recursos.length > 0 && (
                      <Tabela>
                        <thead>
                          <tr>
                            <th>Curso ou recurso</th>
                            <th>Escopo</th>
                            <th>Quando usar na Insper Jr.</th>
                          </tr>
                        </thead>
                        <tbody>
                          {item.recursos.map((r) => (
                            <tr key={r.nome}>
                              <td>{r.nome}</td>
                              <td>{r.escopo}</td>
                              <td>{r.quando}</td>
                            </tr>
                          ))}
                        </tbody>
                      </Tabela>
                    )}
                    <FichaRodape>
                      <span>{item.acesso ?? ""}</span>
                      {item.url && (
                        <PageButtonSm as="a" href={item.url} target="_blank" rel="noopener noreferrer" $variant="outline">
                          Abrir site
                        </PageButtonSm>
                      )}
                    </FichaRodape>
                  </FichaCard>
                ))}
              </FichasLista>
            </div>
          ))}
        </PageCardContent>
      </PageCard>
      {editando && (
        <EditorRecursos
          conteudo={conteudo}
          onFechar={() => setEditando(false)}
          onSalvo={(novo) => {
            setConteudo(novo);
            setEditando(false);
          }}
        />
      )}
    </>
  );
}
