import styled from "styled-components";
import { theme } from "@/styles/theme";

export const AprovacaoWrapper = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: ${theme.colors.muted};
`;

export const AprovacaoHeader = styled.header`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  background: ${theme.colors.background};
  border-bottom: 1px solid ${theme.colors.border};
`;

export const AprovacaoLogo = styled.img`
  height: 2rem;
  width: auto;
`;

export const AprovacaoTitulo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.125rem;

  h1 {
    margin: 0;
    font-size: ${theme.fontSize.base};
    font-weight: ${theme.fontWeight.semibold};
  }

  span {
    font-size: ${theme.fontSize.sm};
    color: ${theme.colors.mutedForeground};
  }
`;

export const AprovacaoCorpo = styled.main`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.lg};
  padding: ${theme.spacing.lg};
  max-width: 60rem;
  width: 100%;
  margin: 0 auto;
  box-sizing: border-box;
`;

export const VisualizadorPdf = styled.iframe`
  width: 100%;
  height: 70vh;
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.borderRadius.lg};
  background: ${theme.colors.background};
`;

export const AprovacaoPainel = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.lg};
  border-radius: ${theme.borderRadius.lg};
  border: 1px solid ${theme.colors.border};
  background: ${theme.colors.background};
`;

export const AprovacaoAcoes = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.sm};
`;

export const TextoDocumentoTitulo = styled.h2`
  margin: 0;
  font-size: ${theme.fontSize.sm};
  font-weight: ${theme.fontWeight.semibold};
  color: ${theme.colors.mutedForeground};
  text-transform: uppercase;
  letter-spacing: 0.03em;
`;

export const TextoDocumentoBloco = styled.div`
  max-height: 22rem;
  overflow-y: auto;
  padding: ${theme.spacing.md};
  border-radius: ${theme.borderRadius.lg};
  border: 1px solid ${theme.colors.border};
  background: ${theme.colors.muted};
  /* Cursor de texto sugere "isto é selecionável", diferente do resto da
     tela — a única área da página que funciona assim. */
  cursor: text;

  p {
    margin: 0 0 ${theme.spacing.sm};
    font-size: ${theme.fontSize.sm};
    line-height: 1.6;

    &::selection {
      background: color-mix(in srgb, ${theme.colors.primary} 30%, transparent);
    }
  }
`;

export const BotaoCitarFlutuante = styled.button`
  position: fixed;
  z-index: 40;
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  border: none;
  border-radius: ${theme.borderRadius.md};
  background: ${theme.colors.foreground};
  color: ${theme.colors.background};
  font-size: ${theme.fontSize.xs};
  font-weight: ${theme.fontWeight.medium};
  cursor: pointer;
  box-shadow: ${theme.shadows.md};

  &:hover {
    opacity: 0.9;
  }
`;

export const TrechosCitadosLista = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xs};
`;

export const TrechoCitadoLinha = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  border-left: 2px solid ${theme.colors.border};
  background: ${theme.colors.muted};
  border-radius: 0 ${theme.borderRadius.md} ${theme.borderRadius.md} 0;

  blockquote {
    flex: 1;
    margin: 0;
    font-size: ${theme.fontSize.xs};
    font-style: italic;
    color: ${theme.colors.mutedForeground};
  }
`;

export const AprovacaoCentro = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${theme.spacing.xl};
  text-align: center;
`;
