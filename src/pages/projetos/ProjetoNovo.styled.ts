import styled, { css } from "styled-components";
import { theme } from "@/styles/theme";

/**
 * O formulário de criar projeto.
 *
 * A versão anterior era uma coluna só, com onze campos empilhados no mesmo
 * peso visual, nome do projeto, dias de ambientação e anexo da proposta
 * pareciam a mesma coisa, e nada dizia quanto faltava. Aqui os campos viram
 * seções com título e uma frase de contexto: quem cadastra sabe em que
 * assunto está e o que ainda vem pela frente.
 */

export const SecaoLista = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.lg};
`;

export const Secao = styled.section`
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.borderRadius.xl};
  background: ${theme.colors.card};
  box-shadow: ${theme.shadows.sm};
  overflow: hidden;
`;

export const SecaoCabecalho = styled.header`
  display: flex;
  align-items: flex-start;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  border-bottom: 1px solid ${theme.colors.border};
  background: color-mix(in srgb, ${theme.colors.muted} 45%, var(--atlas-card));
`;

/**
 * O número da seção.
 *
 * Não é decoração: o formulário é longo e a pessoa volta a ele depois de
 * abrir o painel de equipe ou de conferir um escopo. O número é o que
 * permite dizer "parei na 3" em vez de reler os títulos todos.
 */
export const SecaoNumero = styled.span`
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: ${theme.borderRadius.full};
  background: ${theme.colors.card};
  border: 1px solid ${theme.colors.border};
  font-size: ${theme.fontSize.xs};
  font-weight: ${theme.fontWeight.semibold};
  color: ${theme.colors.mutedForeground};
  font-variant-numeric: tabular-nums;
`;

export const SecaoTexto = styled.div`
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
`;

export const SecaoTitulo = styled.h2`
  margin: 0;
  font-size: ${theme.fontSize.base};
  font-weight: ${theme.fontWeight.semibold};
  color: ${theme.colors.cardForeground};
`;

export const SecaoDescricao = styled.p`
  margin: 0;
  font-size: ${theme.fontSize.xs};
  color: ${theme.colors.mutedForeground};
  line-height: 1.6;
`;

export const SecaoCorpo = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.lg};
  padding: ${theme.spacing.lg};
`;

/** Campos curtos lado a lado, empilhados desperdiçavam a metade da largura
 *  e faziam a página parecer o dobro do tamanho que tem. */
export const CamposGrade = styled.div<{ $colunas?: 2 | 3 }>`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${theme.spacing.md};

  @media (min-width: ${theme.breakpoints.md}px) {
    grid-template-columns: repeat(${({ $colunas = 2 }) => $colunas}, minmax(0, 1fr));
  }
`;

/**
 * Texto de apoio dentro de uma seção.
 *
 * Não é descrição de campo, essas saíram: uma frase debaixo de cada rótulo
 * dobrava a altura do formulário para repetir o que o rótulo já dizia. Fica
 * só o que muda conforme a escolha (o projeto virou sinérgico, o anexo
 * escolhido), que é informação nova e não explicação.
 */
export const CampoAjuda = styled.p`
  margin: 0;
  font-size: ${theme.fontSize.xs};
  color: ${theme.colors.mutedForeground};
  line-height: 1.5;
`;

/* ------------------------------------------------------------------ */
/* Frentes                                                              */
/* ------------------------------------------------------------------ */

/**
 * As frentes como pastilhas, e não como a caixa rolável de checkboxes de
 * antes: são quatro opções, cabem todas na largura, e uma lista com barra de
 * rolagem para quatro itens escondia opção sem motivo.
 *
 * O `<input type="checkbox">` continua lá dentro, só invisível, teclado,
 * leitor de tela e o `:focus-visible` vêm de graça, e nenhum `aria-pressed`
 * feito à mão empata com isso.
 */
export const FrenteLista = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.sm};
`;

export const FrenteToggle = styled.label<{ $marcada: boolean }>`
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  min-height: 2.25rem;
  padding: 0 0.875rem;
  border-radius: ${theme.borderRadius.full};
  font-size: ${theme.fontSize.sm};
  font-weight: ${theme.fontWeight.medium};
  cursor: pointer;
  transition: background ${theme.transitions.fast}, border-color ${theme.transitions.fast},
    color ${theme.transitions.fast};

  ${({ $marcada }) =>
    $marcada
      ? css`
          border: 1px solid ${theme.colors.primary};
          background: color-mix(in srgb, ${theme.colors.primary} 10%, var(--atlas-card));
          color: ${theme.colors.primary};
        `
      : css`
          border: 1px solid ${theme.colors.border};
          background: ${theme.colors.background};
          color: ${theme.colors.foreground};

          &:hover {
            background: ${theme.colors.muted};
          }
        `}

  /* Fora da tela, e não display:none, escondido de verdade o input sai da
     ordem de tabulação e a pastilha vira inalcançável pelo teclado. */
  input {
    position: absolute;
    width: 1px;
    height: 1px;
    opacity: 0;
    pointer-events: none;
  }

  &:has(input:focus-visible) {
    box-shadow: 0 0 0 3px color-mix(in srgb, ${theme.colors.ring} 35%, transparent);
  }
`;

/* ------------------------------------------------------------------ */
/* Proposta                                                             */
/* ------------------------------------------------------------------ */

/** O par de botões "Link" / "Anexar PDF" como um segmentado, dois botões
 *  soltos não diziam que são alternativas exclusivas. */
export const ModoLista = styled.div`
  display: inline-flex;
  padding: 0.125rem;
  border-radius: ${theme.borderRadius.lg};
  border: 1px solid ${theme.colors.border};
  background: ${theme.colors.muted};
`;

export const ModoBotao = styled.button<{ $ativo: boolean }>`
  min-height: 1.875rem;
  padding: 0 0.75rem;
  border: none;
  border-radius: ${theme.borderRadius.md};
  font-size: ${theme.fontSize.xs};
  font-weight: ${theme.fontWeight.medium};
  cursor: pointer;
  transition: background ${theme.transitions.fast}, color ${theme.transitions.fast};

  ${({ $ativo }) =>
    $ativo
      ? css`
          background: ${theme.colors.card};
          color: ${theme.colors.foreground};
          box-shadow: ${theme.shadows.sm};
        `
      : css`
          background: transparent;
          color: ${theme.colors.mutedForeground};

          &:hover {
            color: ${theme.colors.foreground};
          }
        `}

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px color-mix(in srgb, ${theme.colors.ring} 35%, transparent);
  }
`;

/**
 * O anexo da proposta.
 *
 * O `<input type="file">` cru é a única coisa da tela desenhada pelo sistema
 * operacional: fonte diferente, altura diferente, um "Nenhum arquivo
 * selecionado" em inglês ou português conforme o Chrome. Aqui ele fica
 * escondido dentro de um `<label>` com cara de botão, e continua focável,
 * porque num input de verdade Enter e Espaço já abrem o seletor.
 */
export const ArquivoLinha = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${theme.spacing.sm};
`;

export const ArquivoBotao = styled.label`
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  min-height: 2.25rem;
  padding: 0 0.875rem;
  /* Azul cheio, não a caixa cinza de antes: um <input type=file> nu não lê
     como algo pra clicar. É a única cor de ação não-vermelha do tema. */
  border: 1px solid ${theme.colors.info};
  border-radius: ${theme.borderRadius.lg};
  background: ${theme.colors.info};
  font-size: ${theme.fontSize.sm};
  font-weight: ${theme.fontWeight.medium};
  color: ${theme.colors.infoForeground};
  cursor: pointer;
  transition: background ${theme.transitions.fast}, border-color ${theme.transitions.fast};

  &:hover {
    background: color-mix(in srgb, ${theme.colors.info} 88%, black);
    border-color: color-mix(in srgb, ${theme.colors.info} 88%, black);
  }

  /* Mesmo motivo das pastilhas de frente: fora da tela, e não display:none,
     senão o input sai da ordem de tabulação e não há como abrir o seletor
     pelo teclado. */
  input {
    position: absolute;
    width: 1px;
    height: 1px;
    opacity: 0;
    pointer-events: none;
  }

  &:has(input:focus-visible) {
    box-shadow: 0 0 0 3px color-mix(in srgb, ${theme.colors.ring} 35%, transparent);
  }
`;

/** O nome do arquivo escolhido, ao lado do botão. */
export const ArquivoNome = styled.span<{ $vazio?: boolean }>`
  min-width: 0;
  font-size: ${theme.fontSize.sm};
  color: ${({ $vazio }) => ($vazio ? theme.colors.mutedForeground : theme.colors.foreground)};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const ArquivoRemover = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: none;
  border-radius: ${theme.borderRadius.md};
  background: transparent;
  color: ${theme.colors.mutedForeground};
  cursor: pointer;
  transition: background ${theme.transitions.fast}, color ${theme.transitions.fast};

  &:hover {
    background: color-mix(in srgb, ${theme.colors.destructive} 10%, var(--atlas-card));
    color: ${theme.colors.destructive};
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.ring};
    outline-offset: -2px;
  }
`;

/* ------------------------------------------------------------------ */
/* Rodapé de ações                                                      */
/* ------------------------------------------------------------------ */

/**
 * Gruda no fim da janela enquanto o formulário rola.
 *
 * São cinco seções: com o botão no fim do documento, conferir um campo lá de
 * cima custava rolar até o fim de novo para submeter. `z-index: 20` fica
 * abaixo do painel lateral (40/50), o painel precisa cobri-lo.
 */
export const AcoesBarra = styled.div`
  position: sticky;
  bottom: 0;
  z-index: 20;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.borderRadius.xl};
  background: ${theme.colors.card};
  box-shadow: ${theme.shadows.md};
`;

/** O erro mora na barra, ao lado do botão que falhou, no fim da página ele
 *  aparecia fora da tela, e o clique parecia não ter feito nada. */
export const AcoesMensagem = styled.p<{ $erro?: boolean }>`
  flex: 1;
  min-width: 12rem;
  margin: 0;
  font-size: ${theme.fontSize.sm};
  color: ${({ $erro }) => ($erro ? theme.colors.destructive : theme.colors.mutedForeground)};
`;

export const AcoesBotoes = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
`;
