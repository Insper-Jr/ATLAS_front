import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  getPerfilCentral,
  type FichaCompleta,
  type PerfilCentral,
} from "@/lib/central";
import { formatarDataHora } from "@/lib/projetos";
import { EstadoVazio } from "@/components/EstadoVazio";
import {
  ErrorText,
  PageBadge,
  PageButtonSm,
  PageCard,
  PageCardContent,
  PageCardHeader,
  PageCardTitle,
  PageLoadingBlock,
} from "@/styles/page.styled";
import { FichasLista, Historico, Nota, Tile, Tiles } from "./Central.styled";
import { CardAcompanhamento } from "./FichaCard";
import { useCentral } from "./contexto";

/** "Sua autoria na Central" (plano, 2.2): o que a pessoa indicou, escreveu
 *  e decidiu, com os totais. Estende a antiga "Minhas indicações". */
export function MinhasIndicacoes() {
  const { token } = useAuth();
  const { versao, abrirIndicacao } = useCentral();
  const [perfil, setPerfil] = useState<PerfilCentral | null>(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!token) return;
    let vivo = true;
    getPerfilCentral(token)
      .then((p) => vivo && setPerfil(p))
      .catch(
        (err) =>
          vivo &&
          setErro(err instanceof Error ? err.message : "Erro ao carregar"),
      );
    return () => {
      vivo = false;
    };
  }, [token, versao]);

  if (erro && !perfil) return <ErrorText>{erro}</ErrorText>;
  if (!perfil) return <PageLoadingBlock />;
  const t = perfil.totais;

  function lista(fichas: FichaCompleta[], vazio: string) {
    if (fichas.length === 0) return <Nota style={{ margin: 0 }}>{vazio}</Nota>;
    return (
      <FichasLista>
        {fichas.map((f) => (
          <CardAcompanhamento
            key={f.id}
            ficha={f}
            filhos={
              f.historico && f.historico.length > 0 ? (
                <details>
                  <summary style={{ cursor: "pointer", fontSize: "0.75rem" }}>
                    Histórico ({f.historico.length})
                  </summary>
                  <Historico style={{ marginTop: "0.5rem" }}>
                    {f.historico.map((h) => (
                      <li key={h.id}>
                        {formatarDataHora(h.em)} ·{" "}
                        <strong>{h.usuario_nome ?? "ATLAS"}</strong>{" "}
                        {h.detalhe ?? h.acao}
                      </li>
                    ))}
                  </Historico>
                </details>
              ) : null
            }
            acoes={
              <PageButtonSm
                as={Link}
                to={`/central/fichas/${f.id}`}
                state={{ de: "/central/minhas" }}
                $variant={f.permissoes.editar ? "primary" : "outline"}
              >
                {f.permissoes.editar ? "Escrever a ficha" : "Abrir ficha"}
              </PageButtonSm>
            }
          />
        ))}
      </FichasLista>
    );
  }

  const secoes: [string, string, FichaCompleta[], string][] = [
    [
      "Indicou",
      "O que você indicou, em qualquer via e em qualquer status.",
      perfil.indicadas,
      "Você ainda não indicou nada.",
    ],
    [
      "Escreveu",
      "Fichas em que você é autor ou responsável pela escrita.",
      perfil.escritas,
      "Nenhuma ficha com você.",
    ],
    [
      "Decidiu",
      "Pertinência que você decidiu ou fichas que você publicou.",
      perfil.decididas,
      "Nenhuma decisão sua.",
    ],
  ];

  return (
    <>
      <Tiles aria-label="Sua autoria na Central">
        <Tile>
          <small>Indicou</small>
          <strong>{t.indicadas}</strong>
          <span>indicações suas</span>
        </Tile>
        <Tile>
          <small>Escreveu</small>
          <strong>{t.escritas}</strong>
          <span>
            {t.publicadas_como_autor} publicada
            {t.publicadas_como_autor === 1 ? "" : "s"} como autor
          </span>
        </Tile>
        <Tile>
          <small>Usou</small>
          <strong>{t.usos_marcados}</strong>
          <span>"Usei no meu projeto"</span>
        </Tile>
        <Tile $escuro>
          <small>Contribuições</small>
          <strong>{t.contribuicoes}</strong>
          <span>
            {t.decididas > 0
              ? `${t.decididas} decisão${t.decididas === 1 ? "" : "s"} incluída${t.decididas === 1 ? "" : "s"}`
              : "indicou, escreveu e usou"}
          </span>
        </Tile>
      </Tiles>

      {t.contribuicoes === 0 ? (
        <PageCard>
          <PageCardContent>
            <EstadoVazio
              causa="vazio"
              titulo="Você ainda não contribuiu com a Central"
              motivo={
                <>
                  Indique uma metodologia, ferramenta ou fonte que se destacou
                  num projeto seu.{" "}
                  <button
                    type="button"
                    onClick={abrirIndicacao}
                    style={{
                      all: "unset",
                      cursor: "pointer",
                      textDecoration: "underline",
                    }}
                  >
                    Nova indicação
                  </button>
                </>
              }
            />
          </PageCardContent>
        </PageCard>
      ) : (
        secoes.map(([titulo, nota, fichas, vazio]) => (
          <PageCard key={titulo}>
            <PageCardHeader
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <PageCardTitle>{titulo}</PageCardTitle>
              <PageBadge $tone="muted">{fichas.length}</PageBadge>
            </PageCardHeader>
            <PageCardContent>
              <Nota style={{ marginTop: 0, marginBottom: "0.75rem" }}>
                {nota}
              </Nota>
              {lista(fichas, vazio)}
            </PageCardContent>
          </PageCard>
        ))
      )}
    </>
  );
}
