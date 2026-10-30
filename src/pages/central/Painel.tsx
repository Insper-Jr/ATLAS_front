import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { ROTULO_VIA, getPainelCentral, type Painel as Dados } from "@/lib/central";
import { EstadoVazio } from "@/components/EstadoVazio";
import { ErrorText, PageBadge, PageButtonSm, PageCard, PageCardContent, PageCardHeader, PageCardTitle, PageGrid, PageLoadingBlock } from "@/styles/page.styled";
import {
  AtencaoItem,
  Barra,
  BarraLinha,
  BarraRotulo,
  BarraTrilho,
  BarraValor,
  Cobertura,
  CoberturaTile,
  Nota,
  Tile,
  Tiles,
} from "./Central.styled";
import { useCentral } from "./contexto";

function Barras({ linhas, unidade = "" }: { linhas: { rotulo: string; valor: number | null; texto?: string }[]; unidade?: string }) {
  const maior = Math.max(1, ...linhas.map((l) => l.valor ?? 0));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      {linhas.map((l) => (
        <BarraLinha key={l.rotulo}>
          <BarraRotulo>{l.rotulo}</BarraRotulo>
          <BarraTrilho>{l.valor ? <Barra style={{ width: `${Math.max(4, (l.valor / maior) * 100)}%` }} /> : null}</BarraTrilho>
          <BarraValor>{l.texto ?? (l.valor == null ? "—" : `${l.valor}${unidade}`)}</BarraValor>
        </BarraLinha>
      ))}
    </div>
  );
}

/** O painel da diretoria (fase 2): como a Central está sendo usada e
 *  alimentada nesta gestão. Só para quem gere. */
export function Painel() {
  const { token } = useAuth();
  const { versao } = useCentral();
  const [dados, setDados] = useState<Dados | null>(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!token) return;
    let vivo = true;
    getPainelCentral(token)
      .then((d) => vivo && setDados(d))
      .catch((err) => vivo && setErro(err instanceof Error ? err.message : "Erro ao carregar o painel"));
    return () => {
      vivo = false;
    };
  }, [token, versao]);

  if (erro && !dados) return <ErrorText>{erro}</ErrorText>;
  if (!dados) return <PageLoadingBlock />;
  const r = dados.resumo;

  return (
    <>
      <Tiles aria-label="Resumo">
        <Tile>
          <small>Fichas publicadas</small>
          <strong>{r.publicadas}</strong>
          <span>{r.publicadas_na_gestao} nesta gestão</span>
        </Tile>
        <Tile>
          <small>Em andamento</small>
          <strong>{r.em_andamento}</strong>
          <span>
            {r.aguardando_gerente} com o gerente · {r.com_autores} com autores · {r.revisao_final} com você
          </span>
        </Tile>
        <Tile>
          <small>Autores no prazo</small>
          <strong>{r.autores_total > 0 ? `${r.autores_no_prazo} de ${r.autores_total}` : "—"}</strong>
          <span>meta: 7 dias após a aprovação</span>
        </Tile>
        <Tile>
          <small>Escopos cobertos</small>
          <strong>
            {r.escopos_cobertos} de {r.escopos_total}
          </strong>
          <span>com projeto de referência</span>
        </Tile>
        <Tile $escuro>
          <small>Usos registrados</small>
          <strong>{r.usos}</strong>
          <span>fichas e referências</span>
        </Tile>
      </Tiles>

      <PageGrid $columns={2}>
        <PageCard>
          <PageCardHeader>
            <PageCardTitle>Onde estão as indicações</PageCardTitle>
          </PageCardHeader>
          <PageCardContent>
            <Nota style={{ marginTop: 0, marginBottom: "0.75rem" }}>Quantidade em cada etapa do fluxo, agora.</Nota>
            <Barras linhas={dados.onde.map((o) => ({ rotulo: o.rotulo, valor: o.total }))} />
          </PageCardContent>
        </PageCard>
        <PageCard>
          <PageCardHeader>
            <PageCardTitle>Tempo médio em cada etapa</PageCardTitle>
          </PageCardHeader>
          <PageCardContent>
            <Nota style={{ marginTop: 0, marginBottom: "0.75rem" }}>Dias corridos, contados pelo histórico de cada indicação.</Nota>
            <Barras linhas={dados.tempos.map((t) => ({ rotulo: t.rotulo, valor: t.dias, texto: t.dias == null ? "—" : `${t.dias.toLocaleString("pt-BR")} dias` }))} />
            <Nota>Meta: autores enviam em até 7 dias após a aprovação.</Nota>
          </PageCardContent>
        </PageCard>
        <PageCard>
          <PageCardHeader>
            <PageCardTitle>Referências mais usadas</PageCardTitle>
          </PageCardHeader>
          <PageCardContent>
            <Nota style={{ marginTop: 0, marginBottom: "0.75rem" }}>Cliques em "Usei no meu projeto".</Nota>
            {dados.mais_usadas.length === 0 ? (
              <EstadoVazio causa="vazio" titulo="Nenhum uso registrado" motivo="Aparece quando alguém marcar que usou uma ficha." />
            ) : (
              <Barras
                linhas={dados.mais_usadas.map((f) => ({ rotulo: `${f.codigo} ${f.titulo}`, valor: f.usos }))}
              />
            )}
          </PageCardContent>
        </PageCard>
        <PageCard>
          <PageCardHeader>
            <PageCardTitle>De onde vêm as indicações</PageCardTitle>
          </PageCardHeader>
          <PageCardContent>
            <Nota style={{ marginTop: 0, marginBottom: "0.75rem" }}>Por via de indicação, desde o início da gestão.</Nota>
            <Barras linhas={dados.origem.map((o) => ({ rotulo: o.via === "avulsa" ? "Avulsa" : `Indicada ${ROTULO_VIA[o.via]}`, valor: o.total }))} />
          </PageCardContent>
        </PageCard>
      </PageGrid>

      <PageCard>
        <PageCardHeader style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <PageCardTitle>Mapa de cobertura</PageCardTitle>
          <PageBadge>
            {r.escopos_cobertos} de {r.escopos_total} escopos
          </PageBadge>
        </PageCardHeader>
        <PageCardContent>
          <Nota style={{ marginTop: 0, marginBottom: "0.75rem" }}>
            Projetos de referência e fichas publicadas por escopo. Cada escopo deve ter pelo menos um projeto de referência
            até o fim da gestão.
          </Nota>
          <Cobertura>
            {dados.cobertura.map((c) => (
              <CoberturaTile key={c.escopo_id} $coberto={c.coberto}>
                <small>{c.frente}</small>
                <strong>{c.escopo}</strong>
                <span>
                  {c.coberto
                    ? `${c.referencias} referência${c.referencias === 1 ? "" : "s"} · ${c.fichas} ficha${c.fichas === 1 ? "" : "s"}`
                    : "sem referência"}
                </span>
              </CoberturaTile>
            ))}
          </Cobertura>
        </PageCardContent>
      </PageCard>

      <PageCard>
        <PageCardHeader>
          <PageCardTitle>Precisa da sua atenção</PageCardTitle>
        </PageCardHeader>
        <PageCardContent>
          <Nota style={{ marginTop: 0, marginBottom: "0.75rem" }}>Fichas paradas há mais de 7 dias em qualquer etapa.</Nota>
          {dados.atencao.length === 0 ? (
            <EstadoVazio causa="vazio" titulo="Nada parado" motivo="Nenhuma ficha passou de 7 dias na mesma etapa." />
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {dados.atencao.map((a) => (
                <AtencaoItem key={a.id}>
                  <span className="dias">{a.dias}d</span>
                  <span className="texto">
                    <Link to={`/central/fichas/${a.id}`} state={{ de: "/central/painel" }}>{a.titulo}</Link>
                    <span>
                      {a.projeto_nome ?? "Sem projeto"} · {a.status_rotulo.toLowerCase()}
                    </span>
                  </span>
                  <PageButtonSm as={Link} to={`/central/fichas/${a.id}`} state={{ de: "/central/painel" }} $variant="outline">
                    {a.acao || "Abrir"}
                  </PageButtonSm>
                </AtencaoItem>
              ))}
            </ul>
          )}
        </PageCardContent>
      </PageCard>
    </>
  );
}
