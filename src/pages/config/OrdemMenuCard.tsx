import { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { ChevronDown, ChevronUp } from "lucide-react";
import { theme } from "@/styles/theme";
import { useAuth } from "@/context/AuthContext";
import { CATALOGO_DO_MENU, GRUPOS_DO_MENU } from "@/components/sidebar-itens";
import { getConfiguracao, updateConfiguracao } from "@/lib/configuracao";
import { mover, ordenarPor, type MenuOrdem } from "@/lib/menu-ordem";
import {
  EmptyText,
  ErrorText,
  PageButton,
  PageButtonSm,
  PageCard,
  PageCardContent,
  PageCardHeader,
  PageCardTitle,
} from "@/styles/page.styled";

const Grupos = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
  margin-top: ${theme.spacing.md};
`;

const Grupo = styled.div`
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.borderRadius.lg};
  overflow: hidden;
`;

const GrupoCabecalho = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: ${theme.colors.muted};
  font-size: ${theme.fontSize.sm};
  font-weight: ${theme.fontWeight.medium};
`;

const Item = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${theme.spacing.sm};
  padding: 0.375rem ${theme.spacing.md};
  font-size: ${theme.fontSize.sm};
  border-top: 1px solid ${theme.colors.border};
`;

const Setas = styled.div`
  display: flex;
  gap: 0.25rem;
`;

const Rodape = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  margin-top: ${theme.spacing.md};
`;

/**
 * Ordem do menu lateral, só para a diretoria (2026-10-21, a pedido). Lista
 * TODOS os itens do menu, inclusive os que a pessoa logada não vê, porque a
 * ordem vale para a empresa inteira. "Avaliação de Desempenho" aparece em
 * dois grupos porque são dois caminhos: a fila (Desempenho) e o painel
 * (Gestão), cada um no grupo que o cargo enxerga.
 */
export function OrdemMenuCard() {
  const { token, recarregarUsuario } = useAuth();
  const [grupos, setGrupos] = useState<string[]>(GRUPOS_DO_MENU.map((g) => g.chave));
  const [itens, setItens] = useState<Record<string, string[]>>({});
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const padraoPorGrupo = useMemo(() => {
    const mapa: Record<string, string[]> = {};
    for (const g of GRUPOS_DO_MENU) mapa[g.chave] = CATALOGO_DO_MENU.filter((i) => i.grupo === g.chave).map((i) => i.path);
    return mapa;
  }, []);

  useEffect(() => {
    if (!token) return;
    getConfiguracao(token)
      .then((config) => {
        const salvo = (config as { menu_ordem?: MenuOrdem | null }).menu_ordem;
        setGrupos(ordenarPor(GRUPOS_DO_MENU, (g) => g.chave, salvo?.grupos).map((g) => g.chave));
        const proximo: Record<string, string[]> = {};
        for (const g of GRUPOS_DO_MENU) {
          proximo[g.chave] = ordenarPor(padraoPorGrupo[g.chave], (p) => p, salvo?.itens?.[g.chave]);
        }
        setItens(proximo);
      })
      .catch((err) => setErro(err instanceof Error ? err.message : "Erro ao carregar a ordem do menu"))
      .finally(() => setCarregando(false));
  }, [token, padraoPorGrupo]);

  async function salvar() {
    if (!token) return;
    setSalvando(true);
    setErro("");
    try {
      await updateConfiguracao({ menu_ordem: { grupos, itens } }, token);
      // O menu lê a ordem da sessão (`/auth/me`), então recarrega pra
      // aparecer na hora, sem sair da página.
      await recarregarUsuario();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao salvar a ordem do menu");
    } finally {
      setSalvando(false);
    }
  }

  function restaurar() {
    setGrupos(GRUPOS_DO_MENU.map((g) => g.chave));
    setItens({ ...padraoPorGrupo });
  }

  const rotuloDe = (path: string, grupo: string) =>
    CATALOGO_DO_MENU.find((i) => i.path === path && i.grupo === grupo)?.label ?? path;
  const rotuloGrupo = (chave: string) => GRUPOS_DO_MENU.find((g) => g.chave === chave)?.rotulo ?? chave;

  return (
    <PageCard>
      <PageCardHeader>
        <PageCardTitle>Ordem do menu</PageCardTitle>
      </PageCardHeader>
      <PageCardContent>
        <EmptyText style={{ fontSize: "0.75rem" }}>
          A ordem das categorias e das abas do menu lateral, para todo mundo. Cada pessoa continua
          vendo só o que a posição dela permite.
        </EmptyText>
        {carregando && <EmptyText>Carregando...</EmptyText>}
        {!carregando && (
          <Grupos>
            {grupos.map((chave, gi) => (
              <Grupo key={chave}>
                <GrupoCabecalho>
                  <span>{rotuloGrupo(chave)}</span>
                  <Setas>
                    <PageButtonSm $variant="outline" type="button" disabled={gi === 0} onClick={() => setGrupos(mover(grupos, gi, -1))} aria-label="Subir categoria">
                      <ChevronUp size={14} />
                    </PageButtonSm>
                    <PageButtonSm $variant="outline" type="button" disabled={gi === grupos.length - 1} onClick={() => setGrupos(mover(grupos, gi, 1))} aria-label="Descer categoria">
                      <ChevronDown size={14} />
                    </PageButtonSm>
                  </Setas>
                </GrupoCabecalho>
                {(itens[chave] ?? []).map((path, ii) => (
                  <Item key={path}>
                    <span>{rotuloDe(path, chave)}</span>
                    <Setas>
                      <PageButtonSm $variant="outline" type="button" disabled={ii === 0} onClick={() => setItens({ ...itens, [chave]: mover(itens[chave], ii, -1) })} aria-label="Subir aba">
                        <ChevronUp size={14} />
                      </PageButtonSm>
                      <PageButtonSm $variant="outline" type="button" disabled={ii === itens[chave].length - 1} onClick={() => setItens({ ...itens, [chave]: mover(itens[chave], ii, 1) })} aria-label="Descer aba">
                        <ChevronDown size={14} />
                      </PageButtonSm>
                    </Setas>
                  </Item>
                ))}
              </Grupo>
            ))}
          </Grupos>
        )}
        {erro && <ErrorText>{erro}</ErrorText>}
        <Rodape>
          <PageButton type="button" disabled={salvando || carregando} onClick={salvar}>
            {salvando ? "Salvando..." : "Salvar ordem"}
          </PageButton>
          <PageButton $variant="outline" type="button" disabled={salvando || carregando} onClick={restaurar}>
            Voltar ao padrão
          </PageButton>
        </Rodape>
      </PageCardContent>
    </PageCard>
  );
}
