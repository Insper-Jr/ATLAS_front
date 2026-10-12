import styled from "styled-components";
import { NavLink } from "react-router-dom";
import { theme } from "@/styles/theme";
import { FieldInput } from "@/pages/Bancas.styled";

export const VoltarLink = styled(NavLink)`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  align-self: flex-start;
  font-size: ${theme.fontSize.xs};
  color: ${theme.colors.mutedForeground};
  text-decoration: none;

  &:hover {
    color: ${theme.colors.foreground};
  }
`;

export const FiltrosRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.sm};
  margin-bottom: ${theme.spacing.md};

  /* Sem isso, cada select estica pra ocupar a largura toda do card, bonito
     num formulário de 1 campo, ruim numa fileira de 3 filtros lado a lado. */
  & > * {
    flex: 0 1 12rem;
  }
`;

export const CampoInlineRow = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};

  & > input {
    flex: 1;
  }
`;

export const TabBar = styled.nav`
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  border-bottom: 1px solid ${theme.colors.border};
`;

export const TabLink = styled(NavLink)`
  padding: 0.5rem 0.875rem;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  font-size: ${theme.fontSize.sm};
  font-weight: ${theme.fontWeight.medium};
  color: ${theme.colors.mutedForeground};
  text-decoration: none;

  &:hover {
    color: ${theme.colors.foreground};
  }

  &.active {
    color: ${theme.colors.primary};
    border-bottom-color: ${theme.colors.primary};
  }
`;

export const ListaExpansivel = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
`;

export const PessoaHeader = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border-radius: ${theme.borderRadius.lg};
  border: 1px solid ${theme.colors.border};
  background: ${theme.colors.card};
  font-size: ${theme.fontSize.sm};
  font-weight: ${theme.fontWeight.medium};
  color: ${theme.colors.foreground};
  cursor: pointer;
  text-align: left;

  &:hover {
    border-color: ${theme.colors.primary};
  }
`;

export const PessoaResumo = styled.span`
  font-size: ${theme.fontSize.xs};
  color: ${theme.colors.mutedForeground};
  font-weight: ${theme.fontWeight.normal};
`;

/** Frente(s) e semestre da pessoa, vermelho claro de propósito: é contexto
 *  pra ler o nome, não um alerta nem um dado igual aos outros da linha. */
export const PessoaContexto = styled.span`
  font-size: ${theme.fontSize.xs};
  font-weight: ${theme.fontWeight.normal};
  color: color-mix(in srgb, ${theme.colors.destructive} 65%, ${theme.colors.mutedForeground});
`;

export const SubLista = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.sm} ${theme.spacing.md} ${theme.spacing.md};
`;

export const SubItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${theme.spacing.sm};
  padding: 0.375rem 0;
  font-size: ${theme.fontSize.sm};
  color: ${theme.colors.foreground};
`;

export const SubItemMeta = styled.span`
  font-size: ${theme.fontSize.xs};
  color: ${theme.colors.mutedForeground};
`;

/** Nota + botões no fim de uma linha de avaliação. Separado de
 *  `SubItemMeta` (texto solto, usado em outras telas) porque aqui são
 *  elementos lado a lado, que sem o gap ficavam colados (2026-10-12). */
export const SubItemAcoes = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  flex-shrink: 0;
`;

// "Quem não preencheu": um card por avaliador (não uma linha por par), com
// todo mundo que falta avaliar reunido numa frase só, escaneia muito mais
// rápido que uma lista plana de "Fulano → Beltrano" repetindo o mesmo nome.
/** `$atrasado`: entregou, mas depois do prazo (só no PDI). Fica na lista de
 *  pendências em âmbar, não em vermelho, porque o arquivo existe. */
export const PendenciaCard = styled.div<{ $atrasado?: boolean }>`
  display: flex;
  align-items: flex-start;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border-radius: ${theme.borderRadius.lg};
  border: 1px solid
    color-mix(in srgb, ${({ $atrasado }) => ($atrasado ? theme.colors.warning : theme.colors.destructive)} 35%, transparent);
  background: color-mix(
    in srgb,
    ${({ $atrasado }) => ($atrasado ? theme.colors.warning : theme.colors.destructive)} 6%,
    ${theme.colors.background}
  );
`;

export const PendenciaIcone = styled.div<{ $atrasado?: boolean }>`
  flex-shrink: 0;
  margin-top: 0.125rem;
  color: ${({ $atrasado }) => ($atrasado ? theme.colors.warning : theme.colors.destructive)};
`;

export const PendenciaAtrasoRotulo = styled.span`
  display: inline-block;
  margin-left: ${theme.spacing.sm};
  padding: 0 0.4rem;
  border-radius: ${theme.borderRadius.full};
  background: ${theme.colors.warning};
  color: ${theme.colors.warningForeground};
  font-size: ${theme.fontSize.xs};
  font-weight: ${theme.fontWeight.medium};
`;

/** Resultados de uma pasta de PDI: um bloco por mentorado. */
export const ResultadoPessoa = styled.div`
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.borderRadius.lg};
  background: ${theme.colors.card};
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
`;

export const ResultadoPessoaTitulo = styled.div`
  font-size: ${theme.fontSize.sm};
  color: ${theme.colors.mutedForeground};

  strong {
    color: ${theme.colors.foreground};
    font-weight: ${theme.fontWeight.semibold};
  }
`;

export const ResultadoArquivo = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${theme.spacing.sm};
  font-size: ${theme.fontSize.sm};

  span.meta {
    color: ${theme.colors.mutedForeground};
    font-size: ${theme.fontSize.xs};
  }
`;

export const PendenciaTexto = styled.p`
  margin: 0;
  font-size: ${theme.fontSize.sm};
  line-height: 1.5;
  color: ${theme.colors.foreground};
`;

export const PendenciaNome = styled.strong`
  font-weight: ${theme.fontWeight.semibold};
`;

export const PendenciaFaltamRotulo = styled.span`
  color: ${theme.colors.mutedForeground};
`;

export const LotesStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
`;

export const AvaliacaoDetalheBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
  margin: 0 0 ${theme.spacing.sm};
  padding: ${theme.spacing.lg};
  border-radius: ${theme.borderRadius.lg};
  border: 1px solid ${theme.colors.border};
  background: ${theme.colors.card};
  box-shadow: ${theme.shadows.sm};
`;

/** A nota geral (`corDaNota`) puxa a cor da borda inteira, é a primeira
 *  coisa que quem está lendo precisa saber antes de entrar nos critérios. */
export const DetalheNotaGeralDestaque = styled.div<{ $cor: string }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border-radius: ${theme.borderRadius.md};
  border: 1px solid ${({ $cor }) => $cor};
  background: color-mix(in srgb, ${({ $cor }) => $cor} 10%, ${theme.colors.card});
`;

export const DetalheNotaGeralRotulo = styled.span`
  font-size: ${theme.fontSize.sm};
  font-weight: ${theme.fontWeight.semibold};
  color: ${theme.colors.foreground};
`;

export const DetalheNotaGeralNumero = styled.span<{ $cor: string }>`
  font-size: ${theme.fontSize.lg};
  font-weight: ${theme.fontWeight.bold};
  color: ${({ $cor }) => $cor};
`;

export const DetalheCriteriosLista = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
`;

export const DetalheCriterioRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 6rem 1.5rem;
  align-items: center;
  gap: ${theme.spacing.sm};
`;

export const DetalheCriterioLabel = styled.span`
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: ${theme.fontSize.xs};
  color: ${theme.colors.foreground};
`;

export const DetalheCriterioBarraTrilha = styled.div`
  height: 0.375rem;
  border-radius: ${theme.borderRadius.full};
  background: ${theme.colors.secondary};
  overflow: hidden;
`;

export const DetalheCriterioBarraFill = styled.div<{ $percent: number; $cor: string }>`
  height: 100%;
  width: ${({ $percent }) => $percent}%;
  background: ${({ $cor }) => $cor};
  border-radius: ${theme.borderRadius.full};
`;

export const DetalheCriterioNumero = styled.span<{ $cor: string }>`
  text-align: right;
  font-size: ${theme.fontSize.xs};
  font-weight: ${theme.fontWeight.semibold};
  color: ${({ $cor }) => $cor};
`;

export const DetalheCriterioTexto = styled.p`
  grid-column: 1 / -1;
  margin: 0;
  padding: 0.5rem 0.625rem;
  border-radius: ${theme.borderRadius.md};
  background: ${theme.colors.muted};
  font-size: ${theme.fontSize.xs};
  line-height: 1.5;
  color: ${theme.colors.foreground};
  white-space: pre-wrap;
`;

export const DetalheComentarioBlock = styled.div`
  padding: ${theme.spacing.md};
  border-left: 3px solid ${theme.colors.border};
  border-radius: 0 ${theme.borderRadius.md} ${theme.borderRadius.md} 0;
  background: ${theme.colors.muted};
`;

export const DetalheComentarioRotulo = styled.p`
  margin: 0 0 0.25rem;
  font-size: ${theme.fontSize.xs};
  font-weight: ${theme.fontWeight.semibold};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${theme.colors.mutedForeground};
`;

export const DetalheComentarioTexto = styled.p`
  margin: 0;
  font-size: ${theme.fontSize.sm};
  line-height: 1.6;
  color: ${theme.colors.foreground};
  white-space: pre-wrap;
`;

export const LoteCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md};
  border-radius: ${theme.borderRadius.lg};
  border: 1px solid ${theme.colors.border};
`;

export const LoteCardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: ${theme.spacing.sm};
`;

export const LoteCardInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xs};
`;

export const LoteCardTitulo = styled.span`
  font-size: ${theme.fontSize.sm};
  font-weight: ${theme.fontWeight.semibold};
  color: ${theme.colors.foreground};
`;

export const LoteCardMeta = styled.span`
  font-size: ${theme.fontSize.xs};
  color: ${theme.colors.mutedForeground};
`;

export const LoteCardAcoes = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.xs};
`;

/**
 * As pastas de PDI como cards curtos numa grade, no espírito das etapas de
 * um processo seletivo: cada pasta é um cartão fechado (número, nome, prazo),
 * não uma linha de lista. Editar uma pasta abre o formulário e a checklist
 * em modal, o mesmo padrão de "Adicionar pasta", não expande o cartão.
 */
export const PastasGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr));
  gap: ${theme.spacing.md};
`;

export const PastaCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md};
  border-radius: ${theme.borderRadius.lg};
  border: 1px solid ${theme.colors.border};
  background: ${theme.colors.card};
`;

export const PastaCardTopo = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${theme.spacing.sm};
`;

export const PastaNumeroENome = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  min-width: 0;
`;

/** O número de ordem da pasta, mesma ideia visual das `Iniciais` de mentor,
 *  só que com o número no lugar da sigla. */
export const PastaNumero = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: ${theme.borderRadius.full};
  background: color-mix(in srgb, ${theme.colors.primary} 12%, white);
  color: ${theme.colors.primary};
  font-size: ${theme.fontSize.xs};
  font-weight: ${theme.fontWeight.semibold};
`;

export const PastaCardTitulo = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: ${theme.fontSize.sm};
  font-weight: ${theme.fontWeight.semibold};
  color: ${theme.colors.foreground};
`;

/** Rolagem própria: com 20 projetos a lista empurrava o botão "Criar lote"
 *  para fora da tela, e não dava para ver o que tinha sido marcado.
 *  `$expandido` tira esse teto pra quem prefere rolar a página toda em vez
 *  de rolar dentro de uma caixinha de 11rem. */
export const ProjetoChipsRow = styled.div<{ $expandido?: boolean }>`
  display: flex;
  flex-wrap: wrap;
  /* sm, não xs: o contorno de "rodada" (2026-09-05) soma 2px de cada lado
     do chip, e com o gap antigo (4px) dois chips com rodada quase se
     tocavam. */
  gap: ${theme.spacing.sm};
  max-height: ${(p) => (p.$expandido ? "none" : "11rem")};
  overflow-y: ${(p) => (p.$expandido ? "visible" : "auto")};
  padding: ${theme.spacing.sm};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.borderRadius.md};
`;

export const ProjetoChip = styled.button<{ $selecionado: boolean; $corRodada?: string }>`
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.625rem;
  border-radius: ${theme.borderRadius.full};
  border: 1px solid ${({ $selecionado }) => ($selecionado ? theme.colors.primary : theme.colors.border)};
  background: ${({ $selecionado }) => ($selecionado ? theme.colors.primary : theme.colors.card)};
  color: ${({ $selecionado }) => ($selecionado ? theme.colors.primaryForeground : theme.colors.foreground)};
  font-size: ${theme.fontSize.xs};
  font-weight: ${theme.fontWeight.medium};
  cursor: pointer;
  transition: background 0.12s ease, border-color 0.12s ease;
  /* ⭐ Anel de fora, não a borda: a borda já fala "selecionado" (vermelho) ou
     não (cinza) — reaproveitá-la para "quantas rodadas" faria as duas
     informações brigarem pela mesma linha. O anel continua visível em cima
     do vermelho do chip marcado, que é exatamente o pedido: marcar todos
     não pode apagar quem já rodou antes. */
  box-shadow: ${({ $corRodada }) => ($corRodada ? `0 0 0 2px ${$corRodada}` : "none")};

  &:hover {
    border-color: ${theme.colors.primary};
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.primary};
    outline-offset: 1px;
  }
`;

/** Busca + ações + contador, acima da lista. */
export const SeletorBarra = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  flex-wrap: wrap;
  margin-bottom: ${theme.spacing.sm};
`;

export const SeletorBusca = styled.input`
  flex: 1;
  min-width: 10rem;
  padding: 0.375rem 0.625rem;
  border-radius: ${theme.borderRadius.md};
  border: 1px solid ${theme.colors.border};
  background: ${theme.colors.card};
  color: ${theme.colors.foreground};
  font-size: ${theme.fontSize.sm};

  &:focus-visible {
    outline: 2px solid ${theme.colors.primary};
    outline-offset: -1px;
  }
`;

export const SeletorContagem = styled.span`
  font-size: ${theme.fontSize.xs};
  color: ${theme.colors.mutedForeground};
  white-space: nowrap;
`;

/** ⭐ A legenda do contorno de rodadas (2026-09-05) — só existe uma entrada
 *  por número que TEM projeto de verdade, nunca uma tabela fixa. Uma linha
 *  só, texto pequeno: é contexto pra quem olha o seletor, não o assunto
 *  principal da tela. */
export const RodadaLegendaRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: ${theme.spacing.md};
  margin-bottom: ${theme.spacing.sm};
  font-size: ${theme.fontSize.xs};
  color: ${theme.colors.mutedForeground};
`;

export const RodadaLegendaItem = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
`;

export const RodadaLegendaBolinha = styled.span<{ $cor: string }>`
  width: 0.625rem;
  height: 0.625rem;
  border-radius: ${theme.borderRadius.full};
  background: ${({ $cor }) => $cor};
  flex-shrink: 0;
`;

/**
 * Cada mentor vira um cartão com os seus mentorados pendurados.
 *
 * Antes era um `h4` com linhas soltas embaixo, e lia como título e
 * subtítulo, nada dizia que uma pessoa orienta a outra. Agora as iniciais e
 * o fio à esquerda dos mentorados desenham a relação.
 */
export const MentoriaGrupo = styled.div`
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.borderRadius.lg};
  padding: ${theme.spacing.md};
  background: ${theme.colors.card};

  & + & {
    margin-top: ${theme.spacing.md};
  }
`;

export const MentoriaCabecalho = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
`;

/** Iniciais em círculo. Sem foto no sistema, é o que dá rosto à linha. */
export const Iniciais = styled.span<{ $mentor?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
  width: ${({ $mentor }) => ($mentor ? "2.25rem" : "1.75rem")};
  height: ${({ $mentor }) => ($mentor ? "2.25rem" : "1.75rem")};
  border-radius: ${theme.borderRadius.full};
  font-size: ${({ $mentor }) => ($mentor ? theme.fontSize.xs : "0.625rem")};
  font-weight: ${theme.fontWeight.semibold};
  letter-spacing: 0.02em;

  background: ${({ $mentor }) =>
    $mentor
      ? theme.colors.primary
      : `color-mix(in srgb, ${theme.colors.primary} 12%, white)`};
  color: ${({ $mentor }) => ($mentor ? theme.colors.primaryForeground : theme.colors.primary)};
`;

export const MentoriaGrupoTitulo = styled.h4`
  margin: 0;
  font-size: ${theme.fontSize.sm};
  font-weight: ${theme.fontWeight.semibold};
  color: ${theme.colors.foreground};
`;

export const MentorPapel = styled.span`
  font-size: ${theme.fontSize.xs};
  color: ${theme.colors.mutedForeground};
`;

/** O fio vertical que liga o mentor aos mentorados. */
export const MentoradosLista = styled.div`
  margin: ${theme.spacing.sm} 0 0 1.0625rem;
  padding-left: ${theme.spacing.md};
  border-left: 2px solid ${theme.colors.border};
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xs};
`;

export const MentoriaLinha = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: 0.375rem ${theme.spacing.sm};
  border-radius: ${theme.borderRadius.md};
  font-size: ${theme.fontSize.sm};
  color: ${theme.colors.foreground};

  /* O "Remover" só aparece no hover ou no foco pelo teclado: são vínculos
     que quase nunca se desfazem, e um botão vermelho por linha competia
     visualmente com os nomes, que é o que se vem ler aqui. */
  button {
    opacity: 0;
    margin-left: auto;
  }

  &:hover,
  &:focus-within {
    background: ${theme.colors.muted};

    button {
      opacity: 1;
    }
  }
`;

export const FormularioAbasRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.xs};
`;

export const AbaButton = styled.button<{ $active: boolean }>`
  padding: 0.5rem 0.875rem;
  border: none;
  border-bottom: 2px solid ${({ $active }) => ($active ? theme.colors.primary : "transparent")};
  margin-bottom: -1px;
  background: transparent;
  font-size: ${theme.fontSize.sm};
  font-weight: ${theme.fontWeight.medium};
  color: ${({ $active }) => ($active ? theme.colors.primary : theme.colors.mutedForeground)};
  cursor: pointer;

  &:hover {
    color: ${theme.colors.primary};
  }
`;

export const SecaoEditorBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.lg};
  border-radius: ${theme.borderRadius.lg};
  border: 1px solid ${theme.colors.border};
  background: ${theme.colors.card};
`;

/** Só os campos DA SEÇÃO (título + descrição), separado da lista de
 *  critérios por `CriteriosLista` logo abaixo, pra não virar uma pilha só
 *  de campo atrás de campo sem dizer o que é o quê. */
export const SecaoCamposProprios = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
`;

export const CriteriosLista = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
  padding-top: ${theme.spacing.sm};
  border-top: 1px solid ${theme.colors.border};
`;

export const CriterioEditorRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${theme.spacing.sm};
`;

/** O rótulo do critério é o campo mais importante da linha, sem largura
 *  mínima própria, ele encolhia até truncar o texto ao dividir espaço com o
 *  select de tipo e o botão de remover. */
export const CriterioLabelInput = styled(FieldInput)`
  flex: 1 1 14rem;
  min-width: 10rem;
`;

/** Um critério é um card À PARTE dentro da seção, fundo próprio, não só
 *  uma linha separada por borda (que sumia visualmente entre tantos campos
 *  parecidos). É isso que faz "onde começa o critério 2" ficar óbvio. */
export const CriterioEditorBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md};
  border-radius: ${theme.borderRadius.md};
  background: ${theme.colors.muted};
`;
