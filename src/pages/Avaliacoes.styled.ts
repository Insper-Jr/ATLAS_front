import styled from "styled-components";
import { theme } from "@/styles/theme";
// Importado de verdade (o bloco abaixo é `export ... from`, que não traz nada
// para o escopo): o modal do formulário mira `ModalBody` por seletor.
import { ModalBody } from "./Bancas.styled";

export {
  PageHeaderRow,
  PageHeaderText,
  PageHeading,
  PageSubheading,
  DataTable,
  TableHead,
  TableHeadCell,
  TableBody,
  TableRow,
  NameCell,
  TableCell,
  ActionsCell,
  DetailList,
  DetailRow,
  DetailTerm,
  DetailValue,
  FormStack,
  FieldGroup,
  FieldLabel,
  FieldInput,
  FieldTextarea,
  FieldSelect,
  FormErrorText,
  ModalOverlay,
  ModalHeader,
  ModalTitle,
  ModalClose,
  ModalBody,
  ModalFooter,
  WideModalContent,
} from "./Bancas.styled";

export { LIST_MAX_VISIVEIS, ListScrollWrap, TableScrollWrap } from "@/styles/shared.styled";

export { NotaCell } from "./Nucleo.styled";

export const FiltersRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.sm};
  margin-bottom: ${theme.spacing.md};
`;

export const FormularioLista = styled.ol`
  margin: 0;
  padding-left: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  font-size: ${theme.fontSize.sm};
  color: ${theme.colors.foreground};
`;

export const FormularioItem = styled.li`
  line-height: 1.4;
`;

export const FormularioTipo = styled.span`
  color: ${theme.colors.mutedForeground};
  font-size: ${theme.fontSize.xs};
`;

export const FormHint = styled.p`
  margin: ${theme.spacing.sm} 0 0;
  font-size: ${theme.fontSize.xs};
  color: ${theme.colors.mutedForeground};
`;

export const CardActions = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-top: ${theme.spacing.md};
`;

export const PerguntaEditorList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
`;

export const PerguntaEditorRow = styled.div`
  display: grid;
  grid-template-columns: 1fr auto auto auto;
  gap: ${theme.spacing.sm};
  align-items: start;

  @media (max-width: ${theme.breakpoints.sm}px) {
    grid-template-columns: 1fr;
  }
`;

export const MoveButtonGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

export const MoveButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.0625rem;
  padding: 0;
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.borderRadius.sm};
  background: ${theme.colors.background};
  color: ${theme.colors.mutedForeground};
  font-size: ${theme.fontSize.xs};
  line-height: 1;
  cursor: pointer;

  &:hover:not(:disabled) {
    color: ${theme.colors.foreground};
    border-color: ${theme.colors.foreground};
  }

  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
`;

export const RemoveButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 2.25rem;
  padding: 0 0.625rem;
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.borderRadius.lg};
  background: ${theme.colors.background};
  font-size: ${theme.fontSize.xs};
  color: ${theme.colors.destructive};
  cursor: pointer;

  &:hover {
    background: color-mix(in srgb, ${theme.colors.destructive} 8%, var(--atlas-card));
  }
`;

/** Um bloco por escopo (ou o "Geral", fora de qualquer frente) no editor de
 *  formulário, cada um com sua própria lista de perguntas e botão de
 *  adicionar, para o Bloco 2 poder variar por tipo de entrega. */
export const PerguntaSecao = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.borderRadius.lg};
  background: ${theme.colors.background};
`;

export const PerguntaSecaoTitulo = styled.h4`
  margin: 0;
  font-size: ${theme.fontSize.sm};
  font-weight: ${theme.fontWeight.semibold};
  color: ${theme.colors.foreground};
`;

export const PerguntaSecaoVazia = styled.p`
  margin: 0;
  font-size: ${theme.fontSize.xs};
  color: ${theme.colors.mutedForeground};
`;

export const PerguntaGrupoFrente = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
`;

export const AvaliacaoBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  padding: ${theme.spacing.sm} 0;
  border-bottom: 1px solid ${theme.colors.border};

  &:last-child {
    border-bottom: none;
  }
`;

export const AvaliacaoTitulo = styled.h4`
  margin: 0;
  font-size: ${theme.fontSize.sm};
  font-weight: ${theme.fontWeight.semibold};
`;

export const AvaliacaoMeta = styled.p`
  margin: 0;
  font-size: ${theme.fontSize.xs};
  color: ${theme.colors.mutedForeground};
`;

export const SectionTitle = styled.h3`
  margin: ${theme.spacing.md} 0 ${theme.spacing.sm};
  font-size: ${theme.fontSize.sm};
  font-weight: ${theme.fontWeight.semibold};
  color: ${theme.colors.foreground};
`;

export const FormularioResumo = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.lg};
`;

export const FormularioResumoItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
`;

export const FormularioResumoValor = styled.span`
  font-size: ${theme.fontSize.xl};
  font-weight: ${theme.fontWeight.bold};
  color: ${theme.colors.foreground};
`;

export const FormularioResumoLabel = styled.span`
  font-size: ${theme.fontSize.xs};
  color: ${theme.colors.mutedForeground};
`;

export const PreviewToggleRow = styled.div`
  display: flex;
  justify-content: flex-end;
`;

/** O indicador de "tem descrição" ao lado do nome do projeto na tabela, só
 *  um sinal visual discreto, o texto em si fica no modal "Ver avaliações". */
export const DescricaoIndicador = styled.span`
  display: inline-flex;
  align-items: center;
  margin-left: ${theme.spacing.xs};
  color: ${theme.colors.mutedForeground};
  vertical-align: middle;
`;

export const NotaFinalDestaque = styled.p`
  margin: 0 0 ${theme.spacing.md};
  font-size: ${theme.fontSize.base};
  color: ${theme.colors.foreground};

  strong {
    font-size: ${theme.fontSize.lg};
    color: ${theme.colors.primary};
  }
`;

/* ------------------------------------------------------------------ */
/* Modal de editar o formulário padrão                                  */
/* ------------------------------------------------------------------ */

/**
 * Container próprio, e não o `WideModalContent`: este modal lista uma seção
 * por escopo, agrupadas por frente, hoje são 15 escopos. Em 36rem cada
 * pergunta ficava apertada, e o teto de 640px de altura deixava a rolagem
 * interminável mesmo num monitor grande.
 *
 * O `WideModalContent` tem 16 outros usos. Alargar lá para resolver aqui
 * mexeria em modal de tarefa, de membro, de cargo, todos dimensionados para
 * o pouco conteúdo que têm.
 *
 * Coluna ÚNICA, de propósito. Tentei duas colunas e quebrou: a linha da
 * pergunta é `1fr auto auto auto` (campo, tipo, setas, remover) e não encolhe
 * abaixo do conteúdo, então estourava a borda e cortava o "Remover". Fora que
 * "Geral" tem 3 perguntas e "Business" tem 4 escopos inteiros, as colunas
 * saíam com alturas absurdamente diferentes.
 */
export const FormularioModalContent = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 52rem;
  /* "dvh" em vez de "vh": no celular a barra do navegador some e volta, e o
     "vh" não acompanha, o rodapé com o botão Publicar ficaria fora da tela. */
  max-height: calc(100dvh - 2rem);
  overflow: hidden;
  border-radius: ${theme.borderRadius.xl};
  border: 1px solid ${theme.colors.border};
  background: ${theme.colors.card};
  box-shadow: ${theme.shadows.lg};

  /* Cabeçalho e rodapé ficam parados, só o miolo rola. Antes o container
     inteiro rolava, e o botão "Publicar nova versão" sumia da vista assim que
     a pessoa descia para editar a terceira pergunta. */
  form {
    display: flex;
    flex-direction: column;
    min-height: 0;
    flex: 1;
  }

  ${ModalBody} {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
  }
`;

