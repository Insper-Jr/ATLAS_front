import { useMemo, useState } from "react";
import { rotuloNucleos, type GpCategoria, type GpMembroResumo } from "@/lib/gestao-pessoas";
import { COR_FAIXA, ROTULO_CATEGORIA, ROTULO_FAIXA, TOM_FAIXA } from "@/lib/gp-rotulos";
import { normalizarTexto } from "@/lib/nucleo";
import { EmptyText, PageBadge, PageCard, PageCardContent, PageCardHeader, PageCardTitle } from "@/styles/page.styled";
import { DataTable, FieldSelect, TableBody, TableCell, TableHead, TableHeadCell, TableRow } from "@/pages/Bancas.styled";
import { TableScrollWrap } from "@/styles/shared.styled";
import {
  BarraFill,
  BarraTrilha,
  BlocoTitulo,
  Busca,
  Filtros,
  LinhaClicavel,
  Medidor,
  MedidorTexto,
  MembroCard,
  MembroCardTopo,
  MembrosGrid,
  NomeComNucleo,
  SubAba,
  SubAbas,
} from "./GestaoPessoas.styled";
import { useGestaoPessoas } from "./contexto";
import { AnalisesCategoria } from "./AnalisesCategoria";

type SubAbaChave = "todos" | "proximos" | "analises";

function MedidorMembro({ membro, categoria }: { membro: GpMembroResumo; categoria: GpCategoria }) {
  const s = membro[categoria];
  return (
    <Medidor>
      <BarraTrilha>
        <BarraFill $percent={s.percentual} $cor={COR_FAIXA[s.faixa]} />
      </BarraTrilha>
      <MedidorTexto>
        {s.pontos}/{s.limite}
      </MedidorTexto>
    </Medidor>
  );
}

/**
 * "Pontos por Obrigações" e "Pontos por Desempenho" (spec 5.1): mesma tela,
 * categoria pela rota. Todos (tabela), Próximos ao limite (grade de cards,
 * a pedido, no lugar da lista comprida) e Análises.
 */
export function PontosCategoria({ categoria }: { categoria: GpCategoria }) {
  const contexto = useGestaoPessoas();
  const { resumo, nucleos, abrirMembro } = contexto;
  const [subAba, setSubAba] = useState<SubAbaChave>("todos");
  const [busca, setBusca] = useState("");
  const [nucleoId, setNucleoId] = useState("");

  const ativos = useMemo(() => resumo.membros.filter((m) => m.ativo), [resumo.membros]);

  const filtrados = useMemo(() => {
    const termo = normalizarTexto(busca.trim());
    return ativos
      .filter((m) => !nucleoId || m.nucleo_ids.includes(Number(nucleoId)))
      .filter((m) => !termo || normalizarTexto(m.nome).includes(termo) || normalizarTexto(m.email).includes(termo))
      .sort((a, b) => b[categoria].pontos - a[categoria].pontos || a.nome.localeCompare(b.nome, "pt-BR"));
  }, [ativos, busca, nucleoId, categoria]);

  const emAlerta = ativos.filter((m) => m[categoria].faixa !== "ok").length;
  const noLimite = filtrados.filter((m) => m[categoria].faixa === "limite");
  const proximos = filtrados.filter((m) => m[categoria].faixa === "proximo");

  const filtros = (
    <Filtros>
      <Busca
        type="search"
        placeholder="Buscar por nome..."
        aria-label="Buscar por nome"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
      />
      <FieldSelect aria-label="Núcleo" value={nucleoId} onChange={(e) => setNucleoId(e.target.value)}>
        <option value="">Todos os núcleos</option>
        {nucleos.map((n) => (
          <option key={n.id} value={n.id}>
            {n.nome}
          </option>
        ))}
      </FieldSelect>
    </Filtros>
  );

  function cardDoMembro(m: GpMembroResumo) {
    const s = m[categoria];
    return (
      <MembroCard key={m.usuario_id} type="button" onClick={() => abrirMembro(m)}>
        <MembroCardTopo>
          <NomeComNucleo>
            <strong>{m.nome}</strong>
            <span>{rotuloNucleos(m)}</span>
          </NomeComNucleo>
          <PageBadge $tone={TOM_FAIXA[s.faixa]}>{ROTULO_FAIXA[s.faixa]}</PageBadge>
        </MembroCardTopo>
        <MedidorMembro membro={m} categoria={categoria} />
      </MembroCard>
    );
  }

  return (
    <>
      <SubAbas role="tablist" aria-label={`Pontos por ${ROTULO_CATEGORIA[categoria]}`}>
        <SubAba type="button" role="tab" aria-selected={subAba === "todos"} $ativa={subAba === "todos"} onClick={() => setSubAba("todos")}>
          Todos ({ativos.length})
        </SubAba>
        <SubAba
          type="button"
          role="tab"
          aria-selected={subAba === "proximos"}
          $ativa={subAba === "proximos"}
          onClick={() => setSubAba("proximos")}
        >
          Próximos ao limite ({emAlerta})
        </SubAba>
        <SubAba
          type="button"
          role="tab"
          aria-selected={subAba === "analises"}
          $ativa={subAba === "analises"}
          onClick={() => setSubAba("analises")}
        >
          Análises
        </SubAba>
      </SubAbas>

      {subAba === "todos" && (
        <PageCard>
          <PageCardHeader>
            <PageCardTitle>Todos os membros ({filtrados.length})</PageCardTitle>
          </PageCardHeader>
          <PageCardContent>
            {filtros}
            {filtrados.length === 0 ? (
              <EmptyText>Nenhum membro encontrado.</EmptyText>
            ) : (
              <TableScrollWrap>
                <DataTable>
                  <TableHead>
                    <TableRow>
                      <TableHeadCell>Membro</TableHeadCell>
                      <TableHeadCell>Pontos</TableHeadCell>
                      <TableHeadCell>Restantes</TableHeadCell>
                      <TableHeadCell>Situação</TableHeadCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filtrados.map((m) => {
                      const s = m[categoria];
                      return (
                        <LinhaClicavel
                          key={m.usuario_id}
                          role="button"
                          tabIndex={0}
                          onClick={() => abrirMembro(m)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              abrirMembro(m);
                            }
                          }}
                        >
                          <TableCell>
                            <NomeComNucleo>
                              <strong>{m.nome}</strong>
                              <span>{rotuloNucleos(m)}</span>
                            </NomeComNucleo>
                          </TableCell>
                          <TableCell>
                            <MedidorMembro membro={m} categoria={categoria} />
                          </TableCell>
                          <TableCell>
                            {s.restantes} restante{s.restantes === 1 ? "" : "s"} · {Math.round(s.percentual)}%
                          </TableCell>
                          <TableCell>
                            <PageBadge $tone={TOM_FAIXA[s.faixa]}>{ROTULO_FAIXA[s.faixa]}</PageBadge>
                          </TableCell>
                        </LinhaClicavel>
                      );
                    })}
                  </TableBody>
                </DataTable>
              </TableScrollWrap>
            )}
          </PageCardContent>
        </PageCard>
      )}

      {subAba === "proximos" && (
        <PageCard>
          <PageCardHeader>
            <PageCardTitle>Próximos ao limite</PageCardTitle>
            <PageBadge $tone="warning">{resumo.alerta.texto}</PageBadge>
          </PageCardHeader>
          <PageCardContent>
            {filtros}
            <BlocoTitulo>
              No limite ({noLimite.length})
              <PageBadge $tone="danger">Atingiram {resumo.limites[categoria]} pontos</PageBadge>
            </BlocoTitulo>
            {noLimite.length === 0 ? (
              <EmptyText style={{ marginBottom: "1.5rem" }}>Ninguém atingiu o limite.</EmptyText>
            ) : (
              <MembrosGrid>{noLimite.map(cardDoMembro)}</MembrosGrid>
            )}
            <BlocoTitulo>Próximos ao limite ({proximos.length})</BlocoTitulo>
            {proximos.length === 0 ? (
              <EmptyText>Ninguém na faixa de alerta.</EmptyText>
            ) : (
              <MembrosGrid>{proximos.map(cardDoMembro)}</MembrosGrid>
            )}
          </PageCardContent>
        </PageCard>
      )}

      {subAba === "analises" && <AnalisesCategoria categoria={categoria} />}
    </>
  );
}
