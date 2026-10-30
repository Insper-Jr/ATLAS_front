import { useEffect, useMemo, useState } from "react";
import { Search, Settings2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getToolBox, iniciais, type Ficha, type ToolBox as ToolBoxDados } from "@/lib/central";
import { normalizarTexto } from "@/lib/nucleo";
import { EstadoVazio } from "@/components/EstadoVazio";
import { ErrorText, PageButtonSm, PageLoadingBlock } from "@/styles/page.styled";
import { FieldSelect } from "@/pages/Bancas.styled";
import {
  BotaoContorno,
  BuscaGrande,
  CardConvite,
  Catalogo,
  DestaqueItem,
  DestaqueLista,
  DestaqueVazio,
  DestaquesGrid,
  GrupoTitulo,
  Inicial,
  Nota,
  Painel2,
  PainelTitulo,
  Pilula,
  Pilulas,
  Tile,
  Tiles,
} from "./Central.styled";
import { CardToolBox } from "./FichaCard";
import { ModalCategorias } from "./ModalCategorias";
import { useCentral } from "./contexto";

type Ordem = "recentes" | "usos";

/**
 * A Tool Box como catálogo: os números da gestão, a busca em primeiro
 * plano, os destaques e as fichas por frente. Filtra por categoria, frente
 * e gestão; ordena por data ou por usos. Mostra as fichas que já passaram
 * pela pertinência; as publicadas contam nos números.
 */
export function ToolBox() {
  const { token } = useAuth();
  const { versao, pendencias, abrirIndicacao } = useCentral();
  const [dados, setDados] = useState<ToolBoxDados | null>(null);
  const [erro, setErro] = useState("");
  const [busca, setBusca] = useState("");
  const [frente, setFrente] = useState("");
  const [categoria, setCategoria] = useState("");
  const [gestao, setGestao] = useState("");
  const [ordem, setOrdem] = useState<Ordem>("recentes");
  const [editandoCategorias, setEditandoCategorias] = useState(false);
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    if (!token) return;
    let vivo = true;
    getToolBox(token)
      .then((d) => vivo && setDados(d))
      .catch((err) => vivo && setErro(err instanceof Error ? err.message : "Erro ao carregar a Tool Box"));
    return () => {
      vivo = false;
    };
  }, [token, versao, recarga]);

  const frentes = useMemo(() => {
    const nomes = new Map<string, string>();
    for (const f of dados?.fichas ?? []) {
      nomes.set(f.frente_id == null ? "transversal" : String(f.frente_id), f.frente_nome ?? "Transversal");
    }
    return [...nomes.entries()];
  }, [dados]);

  const gestoes = useMemo(
    () => [...new Set((dados?.fichas ?? []).map((f) => f.gestao_numero).filter((n): n is number => n != null))].sort((a, b) => b - a),
    [dados],
  );

  const categoriasAtivas = useMemo(() => (dados?.categorias ?? []).filter((c) => c.ativa), [dados]);

  const filtradas = useMemo(() => {
    const termo = normalizarTexto(busca.trim());
    const lista = (dados?.fichas ?? []).filter((f) => {
      if (frente && (f.frente_id == null ? "transversal" : String(f.frente_id)) !== frente) return false;
      if (categoria && !f.tipos.includes(categoria)) return false;
      if (gestao && String(f.gestao_numero ?? "") !== gestao) return false;
      if (!termo) return true;
      const alvo = normalizarTexto(
        [f.titulo, f.projeto_nome, f.cliente, f.escopo_nome, f.ferramenta, f.setor, f.em_uma_frase, f.por_que_se_destacou]
          .filter(Boolean)
          .join(" "),
      );
      return alvo.includes(termo);
    });
    if (ordem === "usos") lista.sort((a, b) => b.usos - a.usos || b.id - a.id);
    return lista;
  }, [dados, busca, frente, categoria, gestao, ordem]);

  const grupos = useMemo(() => {
    const mapa = new Map<string, Ficha[]>();
    for (const f of filtradas) {
      const chave = f.frente_nome ?? "Transversal";
      mapa.set(chave, [...(mapa.get(chave) ?? []), f]);
    }
    return [...mapa.entries()];
  }, [filtradas]);

  if (erro && !dados) return <ErrorText>{erro}</ErrorText>;
  if (!dados) return <PageLoadingBlock />;

  const { destaques } = dados;
  const esperando = (pendencias?.pertinencia.length ?? 0) + (pendencias?.revisao.length ?? 0) + (pendencias?.arquivamentos_pendentes ?? 0);
  const partesEsperando = [
    pendencias?.pertinencia.length ? `${pendencias.pertinencia.length} pertinência` : null,
    pendencias?.revisao.length ? `${pendencias.revisao.length} revisão` : null,
    pendencias?.arquivamentos_pendentes ? `${pendencias.arquivamentos_pendentes} arquivamento` : null,
  ].filter(Boolean);

  return (
    <>
      <Tiles aria-label="Números da gestão">
        <Tile>
          <small>Fichas publicadas</small>
          <strong>{dados.publicadas}</strong>
          <span>{dados.publicadas_na_gestao} nesta gestão</span>
        </Tile>
        <Tile>
          <small>Projetos de referência</small>
          <strong>{dados.referencias}</strong>
          <span>escolhidos pela diretoria</span>
        </Tile>
        <Tile>
          <small>Usos registrados</small>
          <strong>{dados.usos}</strong>
          <span>"Usei no meu projeto"</span>
        </Tile>
        <Tile $escuro>
          <small>Esperando você</small>
          <strong>{esperando}</strong>
          <span>{partesEsperando.length > 0 ? partesEsperando.join(" · ") : "nada pendente"}</span>
        </Tile>
      </Tiles>

      <section aria-label="Busca e filtros" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <BuscaGrande>
          <Search size={18} aria-hidden="true" />
          <input type="search" placeholder="Buscar por tema, projeto, ferramenta ou setor" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar referências" />
        </BuscaGrande>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center" }}>
          <Pilulas role="group" aria-label="Categoria">
            <Pilula type="button" $ativa={!categoria} onClick={() => setCategoria("")}>
              Todas
            </Pilula>
            {categoriasAtivas.map((c) => (
              <Pilula key={c.chave} type="button" $ativa={categoria === c.chave} onClick={() => setCategoria(c.chave)}>
                {c.nome}
              </Pilula>
            ))}
            {pendencias?.gere && (
              <PageButtonSm type="button" $variant="ghost" onClick={() => setEditandoCategorias(true)} aria-label="Editar categorias">
                <Settings2 size={14} /> Categorias
              </PageButtonSm>
            )}
          </Pilulas>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginLeft: "auto" }}>
            {frentes.length > 1 && (
              <FieldSelect aria-label="Frente" value={frente} onChange={(e) => setFrente(e.target.value)} style={{ width: "auto" }}>
                <option value="">Todas as frentes</option>
                {frentes.map(([chave, nome]) => (
                  <option key={chave} value={chave}>
                    {nome}
                  </option>
                ))}
              </FieldSelect>
            )}
            {gestoes.length > 0 && (
              <FieldSelect aria-label="Gestão" value={gestao} onChange={(e) => setGestao(e.target.value)} style={{ width: "auto" }}>
                <option value="">Todas as gestões</option>
                {gestoes.map((n) => (
                  <option key={n} value={String(n)}>
                    {n}ª gestão
                  </option>
                ))}
              </FieldSelect>
            )}
            <FieldSelect aria-label="Ordenar" value={ordem} onChange={(e) => setOrdem(e.target.value as Ordem)} style={{ width: "auto" }}>
              <option value="recentes">Mais recentes</option>
              <option value="usos">Mais usadas</option>
            </FieldSelect>
          </div>
        </div>
      </section>

      <DestaquesGrid>
        <Painel2>
          <PainelTitulo>
            <h2>Autores em destaque</h2>
            <span>{dados.semestre ? `Gestão ${dados.semestre.nome}` : ""}</span>
          </PainelTitulo>
          {destaques.autores.length === 0 ? (
            <DestaqueVazio>
              <strong>Ainda sem destaques</strong>
              Os autores aparecem quando as primeiras fichas desta gestão forem publicadas.
            </DestaqueVazio>
          ) : (
            <DestaqueLista>
              {destaques.autores.map((d, i) => (
                <DestaqueItem key={d.usuario_id} style={{ background: "transparent", padding: "0.25rem 0" }}>
                  <Inicial $destaque={i === 0}>{iniciais(d.nome)}</Inicial>
                  <strong>{d.nome}</strong>
                  <span>
                    {d.fichas} ficha{d.fichas === 1 ? "" : "s"} · {d.usos} uso{d.usos === 1 ? "" : "s"}
                  </span>
                </DestaqueItem>
              ))}
            </DestaqueLista>
          )}
        </Painel2>
        <Painel2>
          <PainelTitulo>
            <h2>Quem mais indicou</h2>
            <span>Lido na reunião geral</span>
          </PainelTitulo>
          {destaques.indicadores.length === 0 ? (
            <DestaqueVazio>
              <strong>Ainda sem destaques</strong>
              Quem indicou aparece quando uma indicação vira ficha publicada.
            </DestaqueVazio>
          ) : (
            <DestaqueLista>
              {destaques.indicadores.map((d, i) => (
                <DestaqueItem key={d.usuario_id} style={{ background: "transparent", padding: "0.25rem 0" }}>
                  <Inicial $destaque={i === 0}>{iniciais(d.nome)}</Inicial>
                  <strong>{d.nome}</strong>
                  <span>
                    {d.fichas} ficha{d.fichas === 1 ? "" : "s"} publicada{d.fichas === 1 ? "" : "s"}
                  </span>
                </DestaqueItem>
              ))}
            </DestaqueLista>
          )}
        </Painel2>
      </DestaquesGrid>
      <Nota style={{ marginTop: "-0.5rem" }}>
        Ordenado por fichas publicadas e, no empate, pelos usos. Indicações devolvidas não contam. Não altera a pontuação
        de desempenho.
      </Nota>

      {dados.fichas.length === 0 ? (
        <EstadoVazio
          causa="vazio"
          titulo="Nenhuma ficha ainda"
          motivo="As fichas aparecem aqui depois que o gerente da frente aprova uma indicação. Se o seu projeto resolveu algo bem, indique como referência."
        />
      ) : filtradas.length === 0 ? (
        <EstadoVazio
          causa="filtro"
          titulo="Nenhuma referência encontrada"
          motivo="Tente outro termo ou limpe os filtros. Se o seu projeto resolveu isso bem, indique como referência."
        />
      ) : (
        grupos.map(([nome, fichas], indice) => (
          <section key={nome} aria-label={nome}>
            <GrupoTitulo style={{ fontSize: "1.125rem", textTransform: "none", letterSpacing: 0, color: "var(--atlas-foreground)" }}>
              {nome} <span style={{ fontWeight: 500, color: "var(--atlas-muted-foreground)" }}>· {fichas.length}</span>
            </GrupoTitulo>
            <Catalogo>
              {fichas.map((f) => (
                <CardToolBox key={f.id} ficha={f} />
              ))}
              {indice === grupos.length - 1 && (
                <CardConvite>
                  <strong>Seu projeto resolveu algo bem?</strong>
                  <span>Indique como referência. O gerente da frente decide a pertinência e os autores escrevem.</span>
                  <BotaoContorno type="button" onClick={abrirIndicacao} style={{ marginTop: "0.5rem" }}>
                    Nova indicação
                  </BotaoContorno>
                </CardConvite>
              )}
            </Catalogo>
          </section>
        ))
      )}

      {editandoCategorias && (
        <ModalCategorias
          categorias={dados.categorias}
          onFechar={() => setEditandoCategorias(false)}
          onMudou={() => setRecarga((n) => n + 1)}
        />
      )}
    </>
  );
}
