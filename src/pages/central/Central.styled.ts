import styled, { css } from "styled-components";
import { theme } from "@/styles/theme";
import { PageButton } from "@/styles/page.styled";

/* ------------------------------------------------------------------ */
/* Cards de ficha (Tool Box, Minhas indicações, filas)                  */
/* ------------------------------------------------------------------ */

export const FichasLista = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
`;

export const FichaCard = styled.article`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md};
  border-radius: ${theme.borderRadius.lg};
  border: 1px solid ${theme.colors.border};
  background: ${theme.colors.card};
`;

export const FichaTopo = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
  align-items: flex-start;

  @media (max-width: ${theme.breakpoints.sm}px) {
    flex-direction: column;
  }
`;

/** O selo "REF 014 26.2" do canto do card. */
export const Ref = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  min-width: 3.5rem;
  padding: 0.375rem 0.5rem;
  border-radius: ${theme.borderRadius.md};
  background: ${theme.colors.muted};
  color: ${theme.colors.mutedForeground};
  font-size: 0.625rem;
  font-weight: ${theme.fontWeight.semibold};
  letter-spacing: 0.06em;
  text-transform: uppercase;

  strong {
    font-size: ${theme.fontSize.lg};
    letter-spacing: 0;
    color: ${theme.colors.foreground};
  }
`;

export const FichaCorpo = styled.div`
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
`;

export const FichaTitulo = styled.h3`
  margin: 0;
  font-size: ${theme.fontSize.base};
  font-weight: ${theme.fontWeight.semibold};
  letter-spacing: 0.01em;
  text-transform: uppercase;
  color: ${theme.colors.foreground};

  a {
    color: inherit;
    text-decoration: none;
  }

  a:hover {
    color: ${theme.colors.primary};
  }
`;

export const FichaTituloNormal = styled(FichaTitulo)`
  text-transform: none;
`;

export const Tags = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  align-items: center;
`;

export const Meta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 0.875rem;
  font-size: ${theme.fontSize.xs};
  color: ${theme.colors.mutedForeground};
`;

export const Resumo = styled.p`
  margin: 0;
  font-size: ${theme.fontSize.sm};
  line-height: 1.5;
  color: ${theme.colors.foreground};
`;

export const FichaRodape = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: ${theme.spacing.sm};
  padding-top: ${theme.spacing.sm};
  border-top: 1px solid ${theme.colors.border};
  font-size: ${theme.fontSize.xs};
  color: ${theme.colors.mutedForeground};
`;

export const Acoes = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.sm};
  align-items: center;
`;

/* ------------------------------------------------------------------ */
/* Linha do tempo (Indicada > Gerente > Autores > Diretor > Publicada)  */
/* ------------------------------------------------------------------ */

export const Etapas = styled.ol`
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 0.375rem;

  @media (max-width: ${theme.breakpoints.sm}px) {
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 0.25rem;
  }
`;

export const Etapa = styled.li<{ $estado: "feita" | "atual" | "futura" | "parada" }>`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding-top: 0.375rem;
  border-top: 3px solid
    ${({ $estado }) =>
      $estado === "feita"
        ? theme.colors.success
        : $estado === "atual"
          ? theme.colors.primary
          : $estado === "parada"
            ? theme.colors.mutedForeground
            : theme.colors.border};
  font-size: ${theme.fontSize.xs};

  strong {
    font-weight: ${theme.fontWeight.semibold};
    color: ${({ $estado }) =>
      $estado === "feita"
        ? theme.colors.success
        : $estado === "atual"
          ? theme.colors.primary
          : theme.colors.mutedForeground};
  }

  span {
    color: ${theme.colors.mutedForeground};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

/* ------------------------------------------------------------------ */
/* Destaques da gestão                                                  */
/* ------------------------------------------------------------------ */

export const DestaquesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
  gap: ${theme.spacing.md};
`;

export const DestaqueTitulo = styled.h3`
  margin: 0 0 ${theme.spacing.sm};
  font-size: ${theme.fontSize.xs};
  font-weight: ${theme.fontWeight.semibold};
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: ${theme.colors.mutedForeground};
`;

export const DestaqueVazio = styled.div`
  padding: ${theme.spacing.lg} ${theme.spacing.md};
  border: 1px dashed ${theme.colors.border};
  border-radius: ${theme.borderRadius.lg};
  text-align: center;
  font-size: ${theme.fontSize.sm};
  color: ${theme.colors.mutedForeground};

  strong {
    display: block;
    margin-bottom: 0.25rem;
    color: ${theme.colors.foreground};
  }
`;

export const DestaqueLista = styled.ol`
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
`;

export const DestaqueItem = styled.li`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  border-radius: ${theme.borderRadius.md};
  background: ${theme.colors.muted};
  font-size: ${theme.fontSize.sm};

  strong {
    flex: 1 1 auto;
    color: ${theme.colors.foreground};
  }

  span {
    font-size: ${theme.fontSize.xs};
    color: ${theme.colors.mutedForeground};
  }
`;

export const Posicao = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: ${theme.borderRadius.full};
  background: ${theme.colors.card};
  border: 1px solid ${theme.colors.border};
  font-weight: ${theme.fontWeight.semibold};
  color: ${theme.colors.foreground} !important;
`;

export const Nota = styled.p`
  margin: ${theme.spacing.sm} 0 0;
  font-size: ${theme.fontSize.xs};
  line-height: 1.5;
  color: ${theme.colors.mutedForeground};
`;

/* ------------------------------------------------------------------ */
/* Filtros e grupos                                                     */
/* ------------------------------------------------------------------ */

export const Filtros = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.sm};
  margin-bottom: ${theme.spacing.md};

  & > * {
    flex: 0 1 14rem;
  }

  & > :first-child {
    flex: 1 1 18rem;
  }

  @media (max-width: ${theme.breakpoints.sm}px) {
    & > * {
      flex: 1 1 100%;
    }
  }
`;

export const Busca = styled.input`
  height: 2.25rem;
  padding: 0 0.75rem;
  border-radius: ${theme.borderRadius.lg};
  border: 1px solid ${theme.colors.input};
  background: ${theme.colors.background};
  font-size: ${theme.fontSize.sm};
  color: ${theme.colors.foreground};

  &:focus {
    outline: none;
    border-color: ${theme.colors.ring};
    box-shadow: 0 0 0 3px color-mix(in srgb, ${theme.colors.ring} 25%, transparent);
  }
`;

export const GrupoTitulo = styled.h3`
  margin: ${theme.spacing.md} 0 ${theme.spacing.sm};
  font-size: ${theme.fontSize.xs};
  font-weight: ${theme.fontWeight.semibold};
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: ${theme.colors.mutedForeground};

  &:first-of-type {
    margin-top: 0;
  }
`;

/* ------------------------------------------------------------------ */
/* A ficha aberta                                                       */
/* ------------------------------------------------------------------ */

export const Secao = styled.section`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: ${theme.spacing.md} 0;
  border-top: 1px solid ${theme.colors.border};

  &:first-of-type {
    border-top: 0;
    padding-top: 0;
  }
`;

export const SecaoTitulo = styled.h3`
  margin: 0;
  font-size: ${theme.fontSize.base};
  font-weight: ${theme.fontWeight.semibold};
  color: ${theme.colors.foreground};
`;

export const SecaoAjuda = styled.p`
  margin: 0;
  font-size: ${theme.fontSize.xs};
  line-height: 1.5;
  color: ${theme.colors.mutedForeground};
`;

export const Texto = styled.p<{ $vazio?: boolean }>`
  margin: 0;
  font-size: ${theme.fontSize.sm};
  line-height: 1.55;
  white-space: pre-wrap;
  color: ${theme.colors.foreground};

  ${({ $vazio }) =>
    $vazio &&
    css`
      color: ${theme.colors.mutedForeground};
      font-style: italic;
    `}
`;

export const Passos = styled.ol`
  margin: 0;
  padding-left: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  font-size: ${theme.fontSize.sm};
  line-height: 1.5;
  color: ${theme.colors.foreground};
`;

export const PassoLinha = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;

  input {
    flex: 1 1 auto;
  }
`;

export const Pergunta = styled.p`
  margin: 0;
  font-size: ${theme.fontSize.sm};
  font-weight: ${theme.fontWeight.medium};
  color: ${theme.colors.foreground};
`;

export const Identificacao = styled.dl`
  margin: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
  gap: 0.75rem ${theme.spacing.md};

  div {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  dt {
    font-size: ${theme.fontSize.xs};
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: ${theme.colors.mutedForeground};
  }

  dd {
    margin: 0;
    font-size: ${theme.fontSize.sm};
    color: ${theme.colors.foreground};
  }
`;

export const AvisoCaixa = styled.div<{ $tom?: "info" | "atencao" }>`
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border-radius: ${theme.borderRadius.md};
  font-size: ${theme.fontSize.sm};
  line-height: 1.5;
  background: ${({ $tom }) =>
    $tom === "atencao"
      ? `color-mix(in srgb, ${theme.colors.warning} 20%, var(--atlas-card))`
      : `color-mix(in srgb, ${theme.colors.primary} 8%, var(--atlas-card))`};
  color: ${theme.colors.foreground};

  strong {
    font-weight: ${theme.fontWeight.semibold};
  }
`;

export const AnexosGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr));
  gap: ${theme.spacing.sm};
`;

export const AnexoCard = styled.figure`
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  padding: 0.5rem;
  border-radius: ${theme.borderRadius.md};
  border: 1px solid ${theme.colors.border};
  background: ${theme.colors.card};

  button.abrir {
    display: block;
    width: 100%;
    padding: 0;
    border: 0;
    background: ${theme.colors.muted};
    border-radius: ${theme.borderRadius.sm};
    cursor: pointer;
    overflow: hidden;
    aspect-ratio: 4 / 3;
    display: flex;
    align-items: center;
    justify-content: center;
    color: ${theme.colors.mutedForeground};
    font-size: ${theme.fontSize.xs};
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  figcaption {
    font-size: ${theme.fontSize.xs};
    line-height: 1.4;
    color: ${theme.colors.mutedForeground};
    overflow-wrap: anywhere;
  }
`;

export const Historico = styled.ol`
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  font-size: ${theme.fontSize.xs};
  color: ${theme.colors.mutedForeground};

  strong {
    color: ${theme.colors.foreground};
    font-weight: ${theme.fontWeight.medium};
  }
`;

export const BarraAcoes = styled.div`
  position: sticky;
  bottom: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  margin-top: ${theme.spacing.sm};
  border-top: 1px solid ${theme.colors.border};
  background: ${theme.colors.card};
  border-radius: 0 0 ${theme.borderRadius.lg} ${theme.borderRadius.lg};

  p {
    flex: 1 1 auto;
    margin: 0;
    font-size: ${theme.fontSize.xs};
    color: ${theme.colors.mutedForeground};
  }
`;

export const Contador = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.25rem;
  height: 1.25rem;
  padding: 0 0.375rem;
  margin-left: 0.375rem;
  border-radius: ${theme.borderRadius.full};
  background: ${theme.colors.muted};
  color: ${theme.colors.mutedForeground};
  font-size: 0.6875rem;
  font-weight: ${theme.fontWeight.semibold};
`;

export const ContadorAlerta = styled(Contador)`
  background: color-mix(in srgb, ${theme.colors.primary} 12%, var(--atlas-card));
  color: ${theme.colors.primary};
`;

export const Beta = styled.span`
  margin-left: 0.375rem;
  padding: 0.0625rem 0.375rem;
  border-radius: ${theme.borderRadius.full};
  background: color-mix(in srgb, ${theme.colors.primary} 10%, var(--atlas-card));
  color: ${theme.colors.primary};
  font-size: 0.625rem;
  font-weight: ${theme.fontWeight.semibold};
  text-transform: lowercase;
`;

/* ------------------------------------------------------------------ */
/* Assistente (só a casca, por enquanto)                                */
/* ------------------------------------------------------------------ */

export const AssistenteGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(16rem, 1fr);
  gap: ${theme.spacing.md};

  @media (max-width: ${theme.breakpoints.md}px) {
    grid-template-columns: 1fr;
  }
`;

export const Sugestoes = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
  gap: ${theme.spacing.sm};
`;

export const Sugestao = styled.button`
  text-align: left;
  padding: 0.625rem 0.75rem;
  border-radius: ${theme.borderRadius.md};
  border: 1px solid ${theme.colors.border};
  background: ${theme.colors.card};
  font-size: ${theme.fontSize.sm};
  line-height: 1.45;
  color: ${theme.colors.foreground};
  cursor: not-allowed;
  opacity: 0.85;
`;

export const ListaSimples = styled.ul`
  margin: 0;
  padding-left: 1.125rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: ${theme.fontSize.sm};
  line-height: 1.45;
  color: ${theme.colors.foreground};
`;

/* ------------------------------------------------------------------ */
/* Painel: barras simples                                               */
/* ------------------------------------------------------------------ */

export const BarraLinha = styled.div`
  display: grid;
  grid-template-columns: minmax(8rem, 14rem) 1fr auto;
  align-items: center;
  gap: 0.75rem;
  font-size: ${theme.fontSize.sm};
`;

export const BarraRotulo = styled.span`
  color: ${theme.colors.foreground};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const BarraTrilho = styled.div`
  height: 0.625rem;
  border-radius: ${theme.borderRadius.full};
  background: ${theme.colors.muted};
  overflow: hidden;
`;

export const Barra = styled.div`
  height: 100%;
  border-radius: ${theme.borderRadius.full};
  background: ${theme.colors.primary};
`;

export const BarraValor = styled.span`
  min-width: 2.5rem;
  text-align: right;
  font-weight: ${theme.fontWeight.semibold};
  color: ${theme.colors.foreground};
`;

/* ------------------------------------------------------------------ */
/* Vitrines (Método, Capacitação, Recursos)                             */
/* ------------------------------------------------------------------ */

export const Sumario = styled.nav`
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;

  a,
  button {
    padding: 0.25rem 0.625rem;
    border-radius: ${theme.borderRadius.full};
    border: 1px solid ${theme.colors.border};
    background: ${theme.colors.card};
    font-size: ${theme.fontSize.xs};
    color: ${theme.colors.foreground};
    text-decoration: none;
    cursor: pointer;
  }

  a:hover,
  button:hover {
    border-color: ${theme.colors.primary};
    color: ${theme.colors.primary};
  }
`;

export const ItemFundamento = styled.li`
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  padding: 0.5rem 0.75rem;
  border-radius: ${theme.borderRadius.md};
  background: ${theme.colors.muted};

  strong {
    font-size: ${theme.fontSize.sm};
    color: ${theme.colors.foreground};
  }

  span {
    font-size: ${theme.fontSize.sm};
    line-height: 1.45;
    color: ${theme.colors.mutedForeground};
  }
`;

export const PassoItem = styled.li`
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 0.25rem 0.75rem;
  align-items: center;
  padding: 0.5rem 0;
  border-top: 1px solid ${theme.colors.border};
  font-size: ${theme.fontSize.sm};

  &:first-child {
    border-top: 0;
  }

  strong {
    color: ${theme.colors.foreground};
  }

  em {
    grid-column: 1 / -1;
    font-style: normal;
    color: ${theme.colors.mutedForeground};
  }

  @media (max-width: ${theme.breakpoints.sm}px) {
    grid-template-columns: 1fr;
  }
`;

export const DuasColunas = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(16rem, 1fr);
  gap: ${theme.spacing.md};

  @media (max-width: ${theme.breakpoints.md}px) {
    grid-template-columns: 1fr;
  }
`;

export const AulasGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(20rem, 1fr));
  gap: ${theme.spacing.md};
`;

export const Tabela = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: ${theme.fontSize.sm};

  th,
  td {
    padding: 0.375rem 0.5rem;
    text-align: left;
    vertical-align: top;
    border-top: 1px solid ${theme.colors.border};
  }

  th {
    font-size: ${theme.fontSize.xs};
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: ${theme.colors.mutedForeground};
    border-top: 0;
  }
`;

/* ------------------------------------------------------------------ */
/* Reforma visual (2026-10-29): catálogo, selos e painéis               */
/* ------------------------------------------------------------------ */

/** Linha pequena em caixa alta acima do título ("Trabalho · Gestão 2026.2"). */
export const Olho = styled.span`
  font-size: ${theme.fontSize.xs};
  font-weight: ${theme.fontWeight.semibold};
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${theme.colors.primary};
`;

/** Os botões da Central são os do resto do site; só o nome muda. */
export const BotaoPrimario = styled(PageButton)``;

export const BotaoContorno = styled(PageButton).attrs({ $variant: "outline" as const })``;

export const Tiles = styled.section`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
  gap: ${theme.spacing.md};
`;

export const Tile = styled.div<{ $escuro?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 1.125rem 1.25rem;
  border-radius: 1rem;
  border: 1px solid ${({ $escuro }) => ($escuro ? "transparent" : theme.colors.border)};
  background: ${({ $escuro }) => ($escuro ? theme.colors.foreground : theme.colors.card)};
  color: ${({ $escuro }) => ($escuro ? theme.colors.background : theme.colors.foreground)};

  small {
    font-size: ${theme.fontSize.xs};
    font-weight: ${theme.fontWeight.semibold};
    letter-spacing: 0.06em;
    text-transform: uppercase;
    opacity: 0.7;
  }

  strong {
    font-size: ${theme.fontSize["2xl"]};
    font-weight: ${theme.fontWeight.bold};
    line-height: 1.1;
  }

  span {
    font-size: ${theme.fontSize.xs};
    opacity: 0.75;
  }
`;

export const BuscaGrande = styled.label`
  flex: 0 0 auto;
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  height: 2.5rem;
  padding: 0 0.875rem;
  border-radius: 0.875rem;
  border: 1px solid ${theme.colors.border};
  background: ${theme.colors.card};
  color: ${theme.colors.mutedForeground};

  &:focus-within {
    border-color: ${theme.colors.ring};
    box-shadow: 0 0 0 3px color-mix(in srgb, ${theme.colors.ring} 25%, transparent);
  }

  input {
    flex: 1;
    min-width: 0;
    border: 0;
    outline: 0;
    background: transparent;
    font: inherit;
    font-size: ${theme.fontSize.base};
    color: ${theme.colors.foreground};
  }
`;

export const Pilulas = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

export const Pilula = styled.button<{ $ativa?: boolean }>`
  height: 2rem;
  padding: 0 0.875rem;
  border-radius: ${theme.borderRadius.full};
  border: 1px solid ${({ $ativa }) => ($ativa ? theme.colors.foreground : theme.colors.border)};
  background: ${({ $ativa }) => ($ativa ? theme.colors.foreground : theme.colors.card)};
  color: ${({ $ativa }) => ($ativa ? theme.colors.background : theme.colors.foreground)};
  font: inherit;
  font-size: ${theme.fontSize.sm};
  font-weight: ${({ $ativa }) => ($ativa ? theme.fontWeight.semibold : theme.fontWeight.medium)};
  cursor: pointer;
`;

export const Painel2 = styled.div`
  background: ${theme.colors.card};
  border: 1px solid ${theme.colors.border};
  border-radius: 1rem;
  padding: 1.375rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
`;

export const PainelTitulo = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;

  h2,
  h3 {
    margin: 0;
    font-size: ${theme.fontSize.base};
    font-weight: ${theme.fontWeight.bold};
  }

  span {
    font-size: ${theme.fontSize.xs};
    color: ${theme.colors.mutedForeground};
  }
`;

export const Inicial = styled.span<{ $destaque?: boolean }>`
  flex: 0 0 auto;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: ${theme.borderRadius.full};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: ${theme.fontSize.xs};
  font-weight: ${theme.fontWeight.bold};
  background: ${({ $destaque }) => ($destaque ? theme.colors.primary : theme.colors.muted)};

  /* Dobrado de propósito: a regra "span { color }" do DestaqueItem, mais
     específica, pintava as iniciais de cinza sobre o vermelho. */
  && {
    color: ${({ $destaque }) => ($destaque ? theme.colors.primaryForeground : theme.colors.foreground)};
  }
`;

export const Catalogo = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(26rem, 1fr));
  gap: ${theme.spacing.md};

  @media (max-width: ${theme.breakpoints.sm}px) {
    grid-template-columns: 1fr;
  }
`;

export const CardCatalogo = styled.article`
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 1.125rem;
  border: 1px solid ${theme.colors.border};
  background: ${theme.colors.card};
`;

export const CardCatalogoTopo = styled.div`
  display: flex;
  gap: 1.125rem;
  padding: 1.25rem 1.375rem 1rem;
`;

/** O selo REF grande. `$tom`: a cor da frente. */
export const Selo = styled.div<{ $tom?: "primario" | "neutro"; $grande?: boolean }>`
  flex: 0 0 auto;
  width: ${({ $grande }) => ($grande ? "6rem" : "4.5rem")};
  height: ${({ $grande }) => ($grande ? "6rem" : "4.5rem")};
  border-radius: ${({ $grande }) => ($grande ? "1.125rem" : "0.875rem")};
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  line-height: 1;
  background: ${({ $tom }) =>
    $tom === "neutro"
      ? `color-mix(in srgb, ${theme.colors.foreground} 8%, var(--atlas-card))`
      : `color-mix(in srgb, ${theme.colors.primary} 12%, var(--atlas-card))`};
  color: ${({ $tom }) => ($tom === "neutro" ? theme.colors.foreground : theme.colors.primary)};

  small {
    font-size: 0.625rem;
    font-weight: ${theme.fontWeight.bold};
    letter-spacing: 0.1em;
  }

  strong {
    margin-top: 0.125rem;
    font-size: ${({ $grande }) => ($grande ? "2.25rem" : "1.625rem")};
    font-weight: ${theme.fontWeight.bold};
  }

  span {
    margin-top: 0.125rem;
    font-size: 0.625rem;
    font-weight: ${theme.fontWeight.semibold};
    opacity: 0.8;
  }
`;

export const CardCatalogoCorpo = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;

  h3 {
    margin: 0;
    font-size: 1.0625rem;
    font-weight: ${theme.fontWeight.bold};
    line-height: 1.25;
  }

  h3 a {
    color: inherit;
    text-decoration: none;
  }

  h3 a:hover {
    color: ${theme.colors.primary};
  }

  p {
    margin: 0;
    font-size: ${theme.fontSize.sm};
    line-height: 1.5;
    color: ${theme.colors.foreground};
    opacity: 0.85;
  }
`;

export const CardCatalogoTags = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  padding: 0 1.375rem 0.875rem;
`;

export const CardCatalogoRodape = styled.div`
  margin-top: auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.75rem 1.375rem;
  border-top: 1px solid ${theme.colors.border};
  background: ${theme.colors.muted};
  font-size: ${theme.fontSize.xs};
  color: ${theme.colors.mutedForeground};

  strong {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    color: ${theme.colors.foreground};
    font-weight: ${theme.fontWeight.semibold};
  }
`;

export const Chip = styled.span<{ $tom?: "neutro" | "primario" | "atencao" | "ok" }>`
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.625rem;
  border-radius: ${theme.borderRadius.full};
  font-size: ${theme.fontSize.xs};
  font-weight: ${theme.fontWeight.semibold};
  white-space: nowrap;
  background: ${({ $tom }) =>
    $tom === "primario"
      ? `color-mix(in srgb, ${theme.colors.primary} 12%, var(--atlas-card))`
      : $tom === "atencao"
        ? `color-mix(in srgb, ${theme.colors.warning} 20%, var(--atlas-card))`
        : $tom === "ok"
          ? `color-mix(in srgb, ${theme.colors.success} 14%, var(--atlas-card))`
          : theme.colors.muted};
  color: ${({ $tom }) =>
    $tom === "primario"
      ? theme.colors.primary
      : $tom === "atencao"
        ? theme.colors.warningForeground
        : $tom === "ok"
          ? theme.colors.success
          : theme.colors.foreground};
`;

export const CardConvite = styled.article`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 2rem;
  border-radius: 1.125rem;
  border: 1px dashed ${theme.colors.border};
  text-align: center;
  background: ${theme.colors.card};

  strong {
    font-size: ${theme.fontSize.base};
  }

  span {
    max-width: 36ch;
    font-size: ${theme.fontSize.sm};
    color: ${theme.colors.mutedForeground};
  }
`;

/* Ficha aberta como documento */

export const DocumentoGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.lg};
  align-items: flex-start;
`;

export const Indice = styled.nav`
  flex: 1 1 14rem;
  max-width: 16rem;
  position: sticky;
  top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  padding: 0.75rem;
  border-radius: 1rem;
  border: 1px solid ${theme.colors.border};
  background: ${theme.colors.card};

  a {
    padding: 0.625rem 0.75rem;
    border-radius: 0.625rem;
    font-size: ${theme.fontSize.sm};
    font-weight: ${theme.fontWeight.medium};
    color: ${theme.colors.foreground};
    text-decoration: none;
  }

  a:hover {
    background: ${theme.colors.muted};
  }

  @media (max-width: ${theme.breakpoints.md}px) {
    position: static;
    max-width: none;
  }
`;

export const IndiceCreditos = styled.div`
  margin: 0.625rem 0.75rem 0.25rem;
  padding-top: 0.75rem;
  border-top: 1px solid ${theme.colors.border};
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  font-size: ${theme.fontSize.xs};
  color: ${theme.colors.mutedForeground};

  b {
    display: block;
    color: ${theme.colors.foreground};
    font-weight: ${theme.fontWeight.semibold};
  }
`;

export const Documento = styled.article`
  flex: 999 1 34rem;
  min-width: 0;
  border-radius: 1.25rem;
  border: 1px solid ${theme.colors.border};
  background: ${theme.colors.card};
  padding: 0.5rem 2.25rem 1.5rem;

  @media (max-width: ${theme.breakpoints.sm}px) {
    padding: 0.5rem 1rem 1rem;
  }
`;

export const SecaoDoc = styled.section`
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  padding: 1.5rem 0;
  border-bottom: 1px solid ${theme.colors.border};

  &:last-of-type {
    border-bottom: 0;
  }
`;

export const SecaoDocTitulo = styled.h2<{ $destaque?: boolean }>`
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 1.125rem;
  font-weight: ${theme.fontWeight.bold};

  i {
    flex: 0 0 auto;
    width: 1.875rem;
    height: 1.875rem;
    border-radius: ${theme.borderRadius.full};
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-style: normal;
    font-size: ${theme.fontSize.xs};
    background: ${({ $destaque }) => ($destaque ? theme.colors.primary : theme.colors.foreground)};
    color: ${({ $destaque }) => ($destaque ? theme.colors.primaryForeground : theme.colors.background)};
  }
`;

export const SecaoDocCorpo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  margin-left: 2.625rem;

  @media (max-width: ${theme.breakpoints.sm}px) {
    margin-left: 0;
  }
`;

export const PassosDoc = styled.ol`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.625rem;

  li {
    display: flex;
    gap: 0.875rem;
    padding: 0.75rem 1rem;
    border-radius: 0.75rem;
    background: ${theme.colors.muted};
    font-size: ${theme.fontSize.sm};
    line-height: 1.5;
  }

  li i {
    flex: 0 0 auto;
    width: 1.5rem;
    height: 1.5rem;
    border-radius: ${theme.borderRadius.full};
    border: 1px solid ${theme.colors.border};
    background: ${theme.colors.card};
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-style: normal;
    font-size: ${theme.fontSize.xs};
    font-weight: ${theme.fontWeight.bold};
  }
`;

export const RespostasGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
  gap: 0.75rem;
`;

export const Resposta = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  padding: 1rem 1.125rem;
  border-radius: 0.875rem;
  border: 1px solid color-mix(in srgb, ${theme.colors.primary} 30%, var(--atlas-card));
  background: color-mix(in srgb, ${theme.colors.primary} 6%, var(--atlas-card));

  b {
    font-size: ${theme.fontSize.xs};
    font-weight: ${theme.fontWeight.semibold};
    color: ${theme.colors.primary};
  }

  p {
    margin: 0;
    font-size: ${theme.fontSize.sm};
    line-height: 1.55;
    white-space: pre-wrap;
  }
`;

export const CabecalhoFicha = styled.header`
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 1.75rem 2rem;
  border-radius: 1.25rem;
  border: 1px solid ${theme.colors.border};
  background: ${theme.colors.card};

  @media (max-width: ${theme.breakpoints.sm}px) {
    padding: 1.25rem 1rem;
  }
`;

export const CabecalhoFichaLinha = styled.div`
  display: flex;
  gap: 1.5rem;
  align-items: flex-start;

  @media (max-width: ${theme.breakpoints.md}px) {
    flex-wrap: wrap;
  }
`;

export const TituloFicha = styled.h1`
  margin: 0;
  font-size: ${theme.fontSize["2xl"]};
  font-weight: ${theme.fontWeight.bold};
  line-height: 1.15;
`;

/* Referências */

export const CardReferencia = styled.article<{ $inativa?: boolean }>`
  display: grid;
  grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
  overflow: hidden;
  border-radius: 1.25rem;
  border: 1px solid ${theme.colors.border};
  background: ${theme.colors.card};
  opacity: ${({ $inativa }) => ($inativa ? 0.6 : 1)};

  @media (max-width: ${theme.breakpoints.md}px) {
    grid-template-columns: 1fr;
  }
`;

export const Mosaico = styled.div`
  padding: 1.25rem;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.625rem;
  align-content: start;
  background: color-mix(in srgb, ${theme.colors.foreground} 6%, var(--atlas-card));

  figure {
    margin: 0;
  }

  figure:first-child {
    grid-column: 1 / -1;
  }

  button.abrir {
    display: block;
    width: 100%;
    padding: 0;
    border: 0;
    border-radius: 0.625rem;
    overflow: hidden;
    aspect-ratio: 16 / 9;
    background: color-mix(in srgb, ${theme.colors.foreground} 10%, var(--atlas-card));
    color: ${theme.colors.mutedForeground};
    font-size: ${theme.fontSize.xs};
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  figcaption {
    margin-top: 0.25rem;
    font-size: 0.6875rem;
    color: ${theme.colors.mutedForeground};
  }

  small {
    grid-column: 1 / -1;
    font-size: ${theme.fontSize.xs};
    color: ${theme.colors.mutedForeground};
  }
`;

export const CardReferenciaCorpo = styled.div`
  padding: 1.625rem 1.75rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;

  h2 {
    margin: 0;
    font-size: ${theme.fontSize.xl};
    font-weight: ${theme.fontWeight.bold};
  }

  @media (max-width: ${theme.breakpoints.sm}px) {
    padding: 1rem;
  }
`;

export const PerguntaResposta = styled.dl`
  margin: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.875rem 1.25rem;

  div {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  div.larga {
    grid-column: 1 / -1;
  }

  dt {
    font-size: 0.6875rem;
    font-weight: ${theme.fontWeight.bold};
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: ${theme.colors.mutedForeground};
  }

  dd {
    margin: 0;
    font-size: ${theme.fontSize.sm};
    line-height: 1.5;
  }

  @media (max-width: ${theme.breakpoints.sm}px) {
    grid-template-columns: 1fr;
  }
`;

/* Painel */

export const Cobertura = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr));
  gap: 0.625rem;
`;

export const CoberturaTile = styled.div<{ $coberto: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.875rem;
  border-radius: 0.75rem;
  background: ${({ $coberto }) =>
    $coberto
      ? `color-mix(in srgb, ${theme.colors.success} 14%, var(--atlas-card))`
      : `color-mix(in srgb, ${theme.colors.warning} 20%, var(--atlas-card))`};

  small {
    font-size: 0.6875rem;
    font-weight: ${theme.fontWeight.bold};
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: ${({ $coberto }) => ($coberto ? theme.colors.success : theme.colors.warningForeground)};
  }

  strong {
    font-size: ${theme.fontSize.sm};
  }

  span {
    font-size: ${theme.fontSize.xs};
    color: ${({ $coberto }) => ($coberto ? theme.colors.success : theme.colors.warningForeground)};
  }
`;

export const AtencaoItem = styled.li`
  display: flex;
  align-items: center;
  gap: 0.875rem;
  padding: 0.75rem 1rem;
  border-radius: 0.75rem;
  border: 1px solid ${theme.colors.border};

  .dias {
    flex: 0 0 auto;
    width: 2.75rem;
    height: 2.75rem;
    border-radius: 0.625rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: ${theme.fontSize.xs};
    font-weight: ${theme.fontWeight.bold};
    background: color-mix(in srgb, ${theme.colors.warning} 20%, var(--atlas-card));
    color: ${theme.colors.warningForeground};
  }

  .texto {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    min-width: 0;
  }

  .texto a {
    font-size: ${theme.fontSize.sm};
    font-weight: ${theme.fontWeight.semibold};
    color: ${theme.colors.foreground};
    text-decoration: none;
  }

  .texto span {
    font-size: ${theme.fontSize.xs};
    color: ${theme.colors.mutedForeground};
  }
`;

/* ------------------------------------------------------------------ */
/* Ajustes de 2026-10-29: ícone por categoria, aulas, formulários       */
/* ------------------------------------------------------------------ */

/** O quadrado com o ícone da categoria, no lugar do antigo selo REF. */
export const IconeCat = styled.div<{ $tom?: "primario" | "neutro"; $grande?: boolean }>`
  flex: 0 0 auto;
  width: ${({ $grande }) => ($grande ? "5.5rem" : "4rem")};
  height: ${({ $grande }) => ($grande ? "5.5rem" : "4rem")};
  border-radius: ${({ $grande }) => ($grande ? "1.125rem" : "0.875rem")};
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ $tom }) =>
    $tom === "neutro"
      ? `color-mix(in srgb, ${theme.colors.foreground} 8%, var(--atlas-card))`
      : `color-mix(in srgb, ${theme.colors.primary} 12%, var(--atlas-card))`};
  color: ${({ $tom }) => ($tom === "neutro" ? theme.colors.foreground : theme.colors.primary)};
`;

/** Uma linha de opção (rádio ou caixa) com espaço para respirar. */
export const Opcao = styled.label`
  display: flex;
  gap: 0.625rem;
  align-items: flex-start;
  padding: 0.5rem 0;
  font-size: ${theme.fontSize.sm};
  line-height: 1.5;
  cursor: pointer;

  input {
    margin-top: 0.2rem;
    flex: 0 0 auto;
  }
`;

/** A grade de ícones do editor de categorias. */
export const GradeIcones = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
`;

export const BotaoIcone = styled.button<{ $ativo?: boolean }>`
  width: 2.25rem;
  height: 2.25rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: ${theme.borderRadius.md};
  border: 1px solid ${({ $ativo }) => ($ativo ? theme.colors.primary : theme.colors.border)};
  background: ${({ $ativo }) => ($ativo ? `color-mix(in srgb, ${theme.colors.primary} 12%, var(--atlas-card))` : theme.colors.card)};
  color: ${({ $ativo }) => ($ativo ? theme.colors.primary : theme.colors.foreground)};
  cursor: pointer;
`;

export const LinhaCategoria = styled.div`
  display: grid;
  grid-template-columns: 2.5rem minmax(0, 1fr) auto;
  gap: 0.75rem;
  align-items: center;
  padding: 0.625rem 0;
  border-top: 1px solid ${theme.colors.border};

  &:first-child {
    border-top: 0;
  }
`;

/* As aulas da Capacitação, no desenho do mockup: cabeçalho, prévias à
   esquerda, conteúdo à direita, rodapé com os botões. */

export const AulaCard = styled.article`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.5rem 1.75rem;
  border-radius: 1.25rem;
  border: 1px solid ${theme.colors.border};
  background: ${theme.colors.card};

  @media (max-width: ${theme.breakpoints.sm}px) {
    padding: 1rem;
  }
`;

export const AulaCabecalho = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  flex-wrap: wrap;

  small {
    display: block;
    font-size: 0.6875rem;
    font-weight: ${theme.fontWeight.bold};
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: ${theme.colors.mutedForeground};
  }

  h2 {
    margin: 0.25rem 0 0;
    font-size: ${theme.fontSize.xl};
    font-weight: ${theme.fontWeight.bold};
  }

  p {
    margin: 0.375rem 0 0;
    max-width: 60ch;
    font-size: ${theme.fontSize.sm};
    line-height: 1.5;
    color: ${theme.colors.foreground};
    opacity: 0.85;
  }
`;

export const AulaCorpo = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 3fr) minmax(16rem, 2fr);
  gap: 1.5rem;

  @media (max-width: ${theme.breakpoints.md}px) {
    grid-template-columns: 1fr;
  }
`;

export const AulaPrevias = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem;
  align-content: start;

  figure {
    margin: 0;
  }

  button.abrir {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    padding: 0;
    border: 1px solid ${theme.colors.border};
    border-radius: 0.625rem;
    overflow: hidden;
    aspect-ratio: 16 / 9;
    background: ${theme.colors.muted};
    color: ${theme.colors.mutedForeground};
    font-size: ${theme.fontSize.xs};
    cursor: pointer;
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  figcaption {
    margin-top: 0.375rem;
    font-size: ${theme.fontSize.xs};
    line-height: 1.4;
    color: ${theme.colors.mutedForeground};
  }

  @media (max-width: ${theme.breakpoints.sm}px) {
    grid-template-columns: 1fr;
  }
`;

export const AulaConteudo = styled.ol`
  margin: 0.375rem 0 0;
  padding-left: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: ${theme.fontSize.sm};
  line-height: 1.5;
`;

export const AulaRodape = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding-top: 1rem;
  border-top: 1px solid ${theme.colors.border};
  font-size: ${theme.fontSize.xs};
  color: ${theme.colors.mutedForeground};
`;

/* Editor das vitrines: miniaturas das prévias enviadas de dentro da aula. */
export const GradeMiniaturas = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr));
  gap: 0.75rem;
`;

export const Miniatura = styled.figure`
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;

  .imagem {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    aspect-ratio: 16 / 9;
    border: 1px solid ${theme.colors.border};
    border-radius: 0.625rem;
    overflow: hidden;
    background: ${theme.colors.muted};
    color: ${theme.colors.mutedForeground};
    font-size: ${theme.fontSize.xs};
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .acoes {
    display: flex;
    gap: 0.25rem;
    align-items: center;
  }
`;

/* A prévia ampliada por cima da página, com o site transparecendo. */
export const Lightbox = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background: rgba(15, 23, 42, 0.72);
  backdrop-filter: blur(2px);

  figure {
    margin: 0;
    max-width: min(92vw, 70rem);
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    color: #fff;
  }

  img {
    max-width: 100%;
    max-height: 82vh;
    object-fit: contain;
    border-radius: 0.5rem;
    background: ${theme.colors.background};
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.45);
  }

  figcaption {
    font-size: ${theme.fontSize.sm};
    text-align: center;
    opacity: 0.9;
  }

  .fechar {
    position: absolute;
    top: 1rem;
    right: 1rem;
    width: 2.5rem;
    height: 2.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid rgba(255, 255, 255, 0.4);
    border-radius: 999px;
    background: rgba(0, 0, 0, 0.35);
    color: #fff;
    cursor: pointer;
  }

  @media (max-width: ${theme.breakpoints.sm}px) {
    padding: 1rem;
  }
`;
