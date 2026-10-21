import { useMemo } from "react";
import type { Avaliacao, Banca, Candidatura } from "@/types/banca";
import type { UsuarioResumo } from "@/types/auth";
import { formatarData } from "@/lib/projetos";
import { MotivoDesabilitado } from "@/components/MotivoDesabilitado";
import {
  PageCard,
  PageCardHeader,
  PageCardTitle,
  PageCardContent,
  PageBadge,
  EmptyText,
} from "@/styles/page.styled";
import {
  DataTable,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "./Config.styled";
import { TabelaRolagem } from "@/styles/shared.styled";
import { Th, useOrdenacao, type Colunas } from "@/components/tabela/ordenacao";
import {
  ConteudoPaginado,
  POR_PAGINA_TABELA,
  Paginacao,
  usePaginacao,
} from "@/pages/monitoramento/Paginacao";
import { paraDataUtc } from "@/lib/fuso";

interface Props {
  usuarios: UsuarioResumo[];
  candidaturas: Candidatura[];
  bancas: Banca[];
  /** Avaliações de banca — presença só conta quando a pessoa também enviou
   *  a sua (2026-09-09, a pedido). */
  avaliacoes: Avaliacao[];
}

interface LinhaPresenca {
  usuario: UsuarioResumo;
  inscrito: number;
  presente: number;
  futuras: number;
  faltas: number;
  percentual: number | null;
  /** ⭐ 2026-09-23 — a pedido: cada falta com a banca e a data, pro
   *  detalhamento (tooltip/clique) na tabela. */
  bancasFaltadas: { banca: Banca; realizadoEm: string }[];
}

/** ⭐ 2026-09-23 — a pedido: só conta como falta depois de 1 SEMANA sem
 *  enviar a avaliação — logo depois da banca, ninguém preencheu ainda (o
 *  formulário acabou de abrir), e contar falta nesse momento é falso
 *  positivo pra todo mundo. Até completar a semana, a banca não entra em
 *  NADA da conta (nem presença, nem falta) — só passa a valer depois. */
const PRAZO_FALTA_DIAS = 7;

function dentroDoPrazoDeGraca(realizadoEm: string): boolean {
  const passados = (Date.now() - paraDataUtc(realizadoEm).getTime()) / (1000 * 60 * 60 * 24);
  return passados < PRAZO_FALTA_DIAS;
}

const COLUNAS_PRESENCA: Colunas<LinhaPresenca> = {
  membro: { valor: (l) => l.usuario.nome, inicial: "asc" },
  presente: { valor: (l) => l.presente, inicial: "desc" },
  faltas: { valor: (l) => l.faltas, inicial: "desc" },
  // Quem nunca teve banca realizada não tem percentual: fica no fim nas duas
  // direções, porque "—" não é 0%.
  percentual: { valor: (l) => l.percentual, inicial: "desc" },
};

/**
 * Presença por membro, o controle da diretoria.
 *
 * ⚠ Presença = compareceu **E** enviou a avaliação da banca (2026-09-09, a
 * pedido). Desde que "Registrar realização" saiu (2026-09-04), `confirmado`
 * sozinho não distingue mais nada: a finalização automática marca
 * `presentes` = todo mundo que se candidatou (backend,
 * `finalizacao_automatica.py`), porque não sobrou humano na tela para
 * apontar ausência. Amarrar à avaliação enviada devolve sentido à coluna —
 * quem esteve na banca de verdade deixou nota.
 *
 * A conta só olha bancas JÁ REALIZADAS: numa banca futura ninguém faltou —
 * misturar as duas faria todo mundo parecer ausente por estar inscrito no que
 * ainda vai acontecer.
 *
 * ⭐ 2026-09-23 — a pedido: dentro da primeira semana depois da banca, ela
 * nem entra na conta (nem presença, nem falta) — é o prazo normal pra
 * enviar a avaliação, e contar falta antes disso é falso positivo de todo
 * mundo assim que o formulário abre.
 */
export function PresencaBancas({ usuarios, candidaturas, bancas, avaliacoes }: Props) {
  const linhas = useMemo(() => {
    const porId = new Map(bancas.map((b) => [b.id, b] as const));
    // `banca:avaliador` de quem enviou a avaliação — a outra metade da
    // presença.
    const avaliou = new Set(
      avaliacoes
        .filter((a) => a.status === "submetida")
        .map((a) => `${a.banca_id}:${a.avaliador_id}`),
    );

    const porUsuario = new Map<
      number,
      { inscrito: number; presente: number; futuras: number; bancasFaltadas: LinhaPresenca["bancasFaltadas"] }
    >();
    for (const c of candidaturas) {
      const banca = porId.get(c.banca_id);
      if (!banca) continue;
      const atual =
        porUsuario.get(c.usuario_id) ?? { inscrito: 0, presente: 0, futuras: 0, bancasFaltadas: [] };
      if (!banca.realizado_em) {
        // Ainda nem aconteceu: banca futura de verdade.
        atual.futuras += 1;
      } else if (!dentroDoPrazoDeGraca(banca.realizado_em)) {
        // Realizada há uma semana ou mais: entra na conta de verdade.
        atual.inscrito += 1;
        if (c.confirmado && avaliou.has(`${c.banca_id}:${c.usuario_id}`)) {
          atual.presente += 1;
        } else {
          atual.bancasFaltadas.push({ banca, realizadoEm: banca.realizado_em });
        }
      }
      // Realizada há menos de uma semana: dentro do prazo de graça, não
      // conta em nada — nem presença, nem falta, nem futura.
      porUsuario.set(c.usuario_id, atual);
    }

    return usuarios
      .map((u) => {
        const d = porUsuario.get(u.id) ?? { inscrito: 0, presente: 0, futuras: 0, bancasFaltadas: [] };
        return {
          usuario: u,
          ...d,
          faltas: d.bancasFaltadas.length,
          // Sem banca realizada não há percentual, `null` para a tela mostrar
          // um traço em vez de "0%", que soaria como falta.
          percentual: d.inscrito > 0 ? Math.round((d.presente / d.inscrito) * 100) : null,
        };
      })
      // Quem tem mais falta primeiro: é quem a diretoria precisa olhar.
      .sort((a, b) => b.faltas - a.faltas || a.usuario.nome.localeCompare(b.usuario.nome));
  }, [usuarios, candidaturas, bancas, avaliacoes]);

  const semNenhuma = linhas.every((l) => l.inscrito === 0 && l.futuras === 0);
  // Sem coluna inicial: a lista já abre por quem tem mais falta, que é a
  // pergunta da tabela e não sai de uma coluna sozinha (empate desempata
  // pelo nome).
  const { itens: ordenadas, ordem, ordenarPor } = useOrdenacao(linhas, COLUNAS_PRESENCA);
  /* Páginas no lugar da rolagem interna. A tabela lista o núcleo INTEIRO — 80
     linhas — e o card virava uma tela sozinho. A rolagem que estava aqui é
     pior que rolar a página: uma área rolável dentro dela captura a roda do
     mouse, e quem queria descer a página fica preso na tabela.
     ⚠ Pagina o ORDENADO, não a lista crua: paginar antes deixaria o clique no
     cabeçalho reordenando só as 15 linhas da página aberta. */
  const pagina = usePaginacao(ordenadas, POR_PAGINA_TABELA);

  return (
    <PageCard>
      <PageCardHeader>
        <PageCardTitle>Presença por membro</PageCardTitle>
      </PageCardHeader>
      <PageCardContent>
        <EmptyText style={{ marginBottom: "0.75rem", fontSize: "0.75rem" }}>
          Só conta como presença quem compareceu à banca <strong>e</strong> enviou a avaliação dela.
          Uma banca só entra nesta conta depois de {PRAZO_FALTA_DIAS} dias da realização — antes
          disso, ainda dentro do prazo normal de envio, ela não conta como falta. Passe o mouse
          sobre o número de faltas para ver quais foram.
        </EmptyText>
        {semNenhuma ? (
          <EmptyText>Ninguém se inscreveu em bancas ainda.</EmptyText>
        ) : (
          <ConteudoPaginado estado={pagina}>
            {/* "Ainda vai ter" saiu (2026-09-18): a mesma pergunta ("quantas
                bancas futuras esta pessoa tem") já aparece em "Carga de
                bancas por pessoa", com o filtro "só futuras" — repetir aqui
                era o mesmo número em dois lugares. */}
            <TabelaRolagem $min="36rem">
              <DataTable>
                <TableHead>
                  <TableRow>
                    <Th coluna="membro" ordem={ordem} onOrdenar={ordenarPor}>
                      Membro
                    </Th>
                    <Th coluna="presente" ordem={ordem} onOrdenar={ordenarPor}>
                      Compareceu
                    </Th>
                    <Th coluna="faltas" ordem={ordem} onOrdenar={ordenarPor}>
                      Faltou
                    </Th>
                    <Th coluna="percentual" ordem={ordem} onOrdenar={ordenarPor}>
                      Presença
                    </Th>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pagina.visiveis.map((l) => (
                    <TableRow key={l.usuario.id}>
                      <TableCell>{l.usuario.nome}</TableCell>
                      <TableCell>
                        {l.presente} de {l.inscrito}
                      </TableCell>
                      <TableCell>
                        {l.faltas > 0 ? (
                          <MotivoDesabilitado
                            motivo={l.bancasFaltadas.map((f) => (
                              <div key={f.banca.id}>
                                {f.banca.nome_projeto} — {formatarData(f.realizadoEm)}
                              </div>
                            ))}
                          >
                            <PageBadge $tone="danger">{l.faltas}</PageBadge>
                          </MotivoDesabilitado>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        {l.percentual === null ? "—" : `${l.percentual}%`}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </DataTable>
            </TabelaRolagem>
          </ConteudoPaginado>
        )}
        {!semNenhuma && <Paginacao estado={pagina} />}
      </PageCardContent>
    </PageCard>
  );
}
