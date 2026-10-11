import styled from "styled-components";
import { theme } from "@/styles/theme";

export const Intro = styled.p`
  margin: 0;
  font-size: ${theme.fontSize.sm};
  line-height: 1.5;
  color: ${theme.colors.mutedForeground};
`;

export const Lista = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
`;

/** Uma opção da cédula: candidato ou branco. */
export const Opcao = styled.label<{ $marcada: boolean }>`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border: 1px solid ${({ $marcada }) => ($marcada ? theme.colors.primary : theme.colors.border)};
  border-radius: ${theme.borderRadius.lg};
  background: ${({ $marcada }) => ($marcada ? "hsl(0 72% 51% / 6%)" : theme.colors.card)};
  cursor: pointer;
  font-size: ${theme.fontSize.sm};

  input {
    accent-color: ${theme.colors.primary};
  }
`;

export const Acoes = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${theme.spacing.sm};
  margin-top: ${theme.spacing.md};
`;

export const Aviso = styled.p`
  margin: 0;
  font-size: ${theme.fontSize.sm};
  color: ${theme.colors.mutedForeground};
`;

export const CabecalhoEleicao = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: ${theme.spacing.sm};
`;

export const TituloEleicao = styled.h3`
  margin: 0;
  font-size: ${theme.fontSize.base};
  font-weight: ${theme.fontWeight.semibold};
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${theme.spacing.sm};
`;

export const Meta = styled.span`
  font-size: ${theme.fontSize.xs};
  color: ${theme.colors.mutedForeground};
`;

export const Chips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
`;

export const Chip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.125rem 0.5rem;
  border-radius: ${theme.borderRadius.full};
  background: ${theme.colors.muted};
  font-size: ${theme.fontSize.xs};
  color: ${theme.colors.foreground};
`;

export const Secao = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
  margin-top: ${theme.spacing.md};
`;

export const SecaoTitulo = styled.strong`
  font-size: ${theme.fontSize.xs};
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: ${theme.colors.mutedForeground};
`;

/** O veredito, em cor: verde eleito, vermelho ninguém, cinza sem votos. */
export const Veredito = styled.div<{ $tom: "eleito" | "ninguem" | "vazio" }>`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md};
  border-radius: ${theme.borderRadius.lg};
  font-size: ${theme.fontSize.base};
  font-weight: ${theme.fontWeight.semibold};
  color: ${({ $tom }) =>
    $tom === "eleito"
      ? theme.colors.successForeground
      : $tom === "ninguem"
        ? theme.colors.destructiveForeground
        : theme.colors.foreground};
  background: ${({ $tom }) =>
    $tom === "eleito"
      ? theme.colors.success
      : $tom === "ninguem"
        ? theme.colors.destructive
        : theme.colors.muted};

  small {
    font-weight: ${theme.fontWeight.normal};
    font-size: ${theme.fontSize.sm};
    opacity: 0.9;
  }
`;

export const LinhaCandidato = styled.div<{ $eleito: boolean }>`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.25rem ${theme.spacing.md};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border: 1px solid ${({ $eleito }) => ($eleito ? theme.colors.success : theme.colors.border)};
  border-radius: ${theme.borderRadius.lg};
  background: ${theme.colors.card};
`;

export const NomeCandidato = styled.span`
  font-size: ${theme.fontSize.sm};
  font-weight: ${theme.fontWeight.medium};
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${theme.spacing.sm};
`;

export const NumerosCandidato = styled.span`
  font-size: ${theme.fontSize.sm};
  color: ${theme.colors.mutedForeground};
  text-align: right;
  white-space: nowrap;

  strong {
    color: ${theme.colors.foreground};
    font-size: ${theme.fontSize.base};
  }
`;

export const Barra = styled.div`
  grid-column: 1 / -1;
  height: 0.375rem;
  border-radius: ${theme.borderRadius.full};
  background: ${theme.colors.muted};
  overflow: hidden;
`;

export const BarraPreenchida = styled.div<{ $pct: number; $tom: "eleito" | "normal" | "branco" }>`
  width: ${({ $pct }) => Math.min(100, Math.max(0, $pct))}%;
  height: 100%;
  background: ${({ $tom }) =>
    $tom === "eleito" ? theme.colors.success : $tom === "branco" ? theme.colors.mutedForeground : theme.colors.primary};
`;

export const TabelaSimples = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: ${theme.fontSize.sm};

  th,
  td {
    text-align: left;
    padding: 0.375rem 0.5rem;
    border-bottom: 1px solid ${theme.colors.border};
  }

  th {
    font-size: ${theme.fontSize.xs};
    font-weight: ${theme.fontWeight.medium};
    color: ${theme.colors.mutedForeground};
  }

  td.num,
  th.num {
    text-align: right;
    width: 6rem;
  }
`;

export const PesoInput = styled.input`
  width: 4.5rem;
  height: 2rem;
  padding: 0 0.5rem;
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.borderRadius.md};
  font: inherit;
  font-size: ${theme.fontSize.sm};
  text-align: right;
`;

export const FormNova = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.md};
  border: 1px dashed ${theme.colors.border};
  border-radius: ${theme.borderRadius.lg};
`;

export const FormLinha = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
  gap: ${theme.spacing.md};

  @media (max-width: ${theme.breakpoints.md}px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

export const LinkAcao = styled.button`
  border: none;
  background: none;
  padding: 0;
  font: inherit;
  font-size: ${theme.fontSize.xs};
  color: ${theme.colors.primary};
  text-decoration: underline;
  cursor: pointer;

  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
`;

// ---------------------------------------------------------------- gráficos

/** Dois gráficos por linha no desktop, um embaixo do outro no celular. */
/** No máximo 2 por linha: são 4 gráficos (ou 2), então 2×2 ocupa a largura
 *  toda; `auto-fit` deixava 3 + 1 em tela larga. */
export const GradeGraficos = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: ${theme.spacing.md};
  margin-top: ${theme.spacing.sm};

  @media (max-width: 40rem) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

export const CaixaGrafico = styled.div<{ $altura?: string }>`
  width: 100%;
  height: ${({ $altura }) => $altura ?? "14rem"};
`;

export const BlocoGrafico = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.sm};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.borderRadius.md};
  background: ${theme.colors.card};
`;

export const TituloGrafico = styled.span`
  font-size: ${theme.fontSize.sm};
  font-weight: 600;
  color: ${theme.colors.foreground};
`;

export const PontoAoVivo = styled.span`
  display: inline-block;
  width: 0.5rem;
  height: 0.5rem;
  margin-right: 0.35rem;
  border-radius: 50%;
  background: ${theme.colors.destructive};
  animation: pulsar 1.4s ease-in-out infinite;

  @keyframes pulsar {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.3;
    }
  }
`;
