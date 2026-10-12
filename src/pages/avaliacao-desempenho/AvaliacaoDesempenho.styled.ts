import styled from "styled-components";
import { theme } from "@/styles/theme";

export {
  FieldGroup,
  FieldLabel,
  FieldTextarea,
  FormErrorText,
  FormStack,
} from "@/pages/Bancas.styled";

export const InfoBannerCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  border-radius: ${theme.borderRadius.xl};
  border: 1px solid ${theme.colors.border};
  background: color-mix(in srgb, ${theme.colors.primary} 6%, ${theme.colors.card});
`;

export const InfoBannerTitulo = styled.p`
  margin: 0;
  font-size: ${theme.fontSize.base};
  font-weight: ${theme.fontWeight.semibold};
  color: ${theme.colors.foreground};
`;

export const InfoBannerLinha = styled.p`
  margin: 0;
  font-size: ${theme.fontSize.sm};
  color: ${theme.colors.mutedForeground};
`;

/** Formulário(s) que fecharam antes da pessoa responder, tom destrutivo
 *  porque precisa gritar mais que o resto da tela. */
export const AvisoFechadoCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  border-radius: ${theme.borderRadius.xl};
  border: 1px solid color-mix(in srgb, ${theme.colors.destructive} 40%, transparent);
  background: color-mix(in srgb, ${theme.colors.destructive} 8%, ${theme.colors.card});
`;

export const AvisoFechadoTitulo = styled.p`
  margin: 0;
  font-size: ${theme.fontSize.base};
  font-weight: ${theme.fontWeight.semibold};
  color: ${theme.colors.destructive};
`;

export const AvisoFechadoLista = styled.ul`
  margin: 0;
  padding-left: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
`;

export const AvisoFechadoItem = styled.li`
  font-size: ${theme.fontSize.sm};
  color: ${theme.colors.foreground};
`;

export const AvisoFechadoLinha = styled.p`
  margin: 0;
  font-size: ${theme.fontSize.xs};
  color: ${theme.colors.mutedForeground};
`;

export const TipoOpcoesGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${theme.spacing.md};

  @media (min-width: ${theme.breakpoints.md}px) {
    grid-template-columns: 1fr 1fr;
  }
`;

export const TipoCard = styled.button<{ $disabled: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.lg};
  border-radius: ${theme.borderRadius.xl};
  border: 1px solid ${theme.colors.border};
  background: ${theme.colors.card};
  text-align: left;
  cursor: ${({ $disabled }) => ($disabled ? "not-allowed" : "pointer")};
  opacity: ${({ $disabled }) => ($disabled ? 0.7 : 1)};
  transition: border-color ${theme.transitions.fast}, background ${theme.transitions.fast};

  &:hover:not(:disabled) {
    border-color: ${theme.colors.primary};
  }
`;

export const TipoCardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
`;

export const TipoCardTitulo = styled.span`
  font-size: ${theme.fontSize.base};
  font-weight: ${theme.fontWeight.semibold};
  color: ${theme.colors.cardForeground};
`;

export const TipoCardDescricao = styled.span`
  font-size: ${theme.fontSize.sm};
  color: ${theme.colors.mutedForeground};
`;

export const FilaList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
  /* ⭐ 2026-09-05, corrigido a pedido: PageCardContent não é flex (só
     padding), então nada separava esta lista do que vem depois dela no
     card — o botão "Enviar avaliações" encostava direto na última linha,
     0px de vão (confirmado medindo o DOM). */
  margin-bottom: ${theme.spacing.md};
`;

export const FilaItem = styled.button<{ $clicavel?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border-radius: ${theme.borderRadius.lg};
  border: 1px solid ${theme.colors.border};
  background: ${theme.colors.card};
  text-align: left;
  cursor: ${({ $clicavel = true }) => ($clicavel ? "pointer" : "default")};
  opacity: ${({ $clicavel = true }) => ($clicavel ? 1 : 0.7)};

  &:hover {
    border-color: ${({ $clicavel = true }) => ($clicavel ? theme.colors.primary : theme.colors.border)};
  }
`;

export const FilaItemInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
`;

export const FilaItemNome = styled.span`
  font-size: ${theme.fontSize.sm};
  font-weight: ${theme.fontWeight.medium};
  color: ${theme.colors.foreground};
`;

export const FilaItemMeta = styled.span`
  font-size: ${theme.fontSize.xs};
  color: ${theme.colors.mutedForeground};
`;

export const ProgressoTexto = styled.p`
  margin: 0;
  font-size: ${theme.fontSize.sm};
  color: ${theme.colors.mutedForeground};
`;

export const ProgressoRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
`;

export const ProgressoBarTrack = styled.div`
  flex: 1;
  height: 0.5rem;
  border-radius: ${theme.borderRadius.full};
  background: ${theme.colors.secondary};
  overflow: hidden;
`;

export const ProgressoBarFill = styled.div<{ $percent: number }>`
  height: 100%;
  border-radius: ${theme.borderRadius.full};
  width: ${({ $percent }) => $percent}%;
  background: ${theme.colors.primary};
  transition: width ${theme.transitions.fast};
`;

export const InstrucoesBox = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.lg};
  margin-bottom: ${theme.spacing.xl};
  border-radius: ${theme.borderRadius.xl};
  border-left: 4px solid ${theme.colors.primary};
  background: ${theme.colors.muted};
`;

export const InstrucoesTitulo = styled.p`
  margin: 0;
  font-size: ${theme.fontSize.xs};
  font-weight: ${theme.fontWeight.bold};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${theme.colors.primary};
`;

export const IntroTexto = styled.p`
  margin: 0;
  white-space: pre-wrap;
  font-size: ${theme.fontSize.sm};
  font-style: italic;
  color: ${theme.colors.foreground};
  line-height: 1.5;
`;

export const NotaGeralDestaque = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.lg};
  border-radius: ${theme.borderRadius.xl};
  border: 2px solid ${theme.colors.primary};
  background: color-mix(in srgb, ${theme.colors.primary} 6%, ${theme.colors.card});
`;

export const EscalaLegenda = styled.dl`
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.125rem ${theme.spacing.sm};
  margin: 0;
  padding-top: ${theme.spacing.md};
  border-top: 1px solid color-mix(in srgb, ${theme.colors.primary} 25%, transparent);
`;

export const EscalaLegendaNumero = styled.dt`
  font-size: ${theme.fontSize.xs};
  font-weight: ${theme.fontWeight.semibold};
  color: ${theme.colors.foreground};
`;

export const EscalaLegendaTexto = styled.dd`
  margin: 0;
  font-size: ${theme.fontSize.xs};
  color: ${theme.colors.mutedForeground};
`;

export const VoltarLink = styled.button`
  align-self: flex-start;
  border: none;
  background: none;
  padding: 0;
  /* Não encostar no card "Como avaliar" logo abaixo (2026-10-12). */
  margin-bottom: ${theme.spacing.md};
  font-size: ${theme.fontSize.sm};
  font-weight: ${theme.fontWeight.medium};
  color: ${theme.colors.mutedForeground};
  cursor: pointer;

  &:hover {
    color: ${theme.colors.primary};
  }
`;

export const SecaoFormulario = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
`;

export const SecaoTitulo = styled.h3`
  margin: 0;
  font-size: ${theme.fontSize.base};
  font-weight: ${theme.fontWeight.semibold};
  color: ${theme.colors.foreground};
`;

export const SecaoDescricao = styled.p`
  margin: 0;
  font-size: ${theme.fontSize.sm};
  color: ${theme.colors.mutedForeground};
`;

export const CampoContador = styled.span<{ $excedido: boolean }>`
  align-self: flex-end;
  font-size: ${theme.fontSize.xs};
  color: ${({ $excedido }) => ($excedido ? theme.colors.destructive : theme.colors.mutedForeground)};
`;

export const ComentariosAviso = styled.p`
  margin: 0;
  font-size: ${theme.fontSize.xs};
  color: ${theme.colors.mutedForeground};
`;

export const DoneBlock = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.xl} 0;
  text-align: center;
`;
