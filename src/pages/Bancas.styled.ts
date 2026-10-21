import styled, { css } from "styled-components";
import { theme } from "@/styles/theme";
import { ModalFooter as BaseModalFooter } from "./Calendario.styled";
/* Direto de `modal.styled`, e não do reexport de `Calendario.styled`: o
   formulário de banca estende o corpo e o rodapé do chrome compartilhado. */
import { ModalBody as BaseModalBody, ModalHeader } from "@/styles/modal.styled";
/* Importado além do reexport logo abaixo: `export { X } from "..."` não cria
   binding local, e `FiltroFrenteSelect` precisa dele para estender. */
import { SelectCustom } from "@/components/SelectCustom";

export const DataTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: ${theme.fontSize.sm};
`;

export { LIST_MAX_VISIVEIS, ListScrollWrap, TableScrollWrap } from "@/styles/shared.styled";

export const TableHead = styled.thead`
  border-bottom: 1px solid ${theme.colors.border};
`;

export const TableHeadCell = styled.th`
  padding: 0.625rem 0.75rem;
  text-align: left;
  font-weight: ${theme.fontWeight.medium};
  color: ${theme.colors.mutedForeground};
`;

export const TableBody = styled.tbody``;

export const TableRow = styled.tr`
  border-bottom: 1px solid ${theme.colors.border};

  &:last-child {
    border-bottom: none;
  }
`;

export const TableCell = styled.td`
  padding: 0.75rem;
  vertical-align: middle;
  color: ${theme.colors.foreground};
`;

export const NameCell = styled(TableCell)`
  font-weight: ${theme.fontWeight.medium};
`;

export const ActionsCell = styled(TableCell)`
  display: flex;
  justify-content: flex-end;
  gap: ${theme.spacing.sm};
`;

export const DetailList = styled.dl`
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  font-size: ${theme.fontSize.sm};
  margin: 0;
`;

export const DetailRow = styled.div`
  display: flex;
  justify-content: space-between;
  gap: ${theme.spacing.md};
`;

export const DetailTerm = styled.dt`
  margin: 0;
  color: ${theme.colors.mutedForeground};
`;

export const DetailValue = styled.dd`
  margin: 0;
  text-align: right;
`;

/** A lista de avaliadores agrupados no "ver mais" — uma coluna de blocos
 *  (liderança/membro × frente), não um par rótulo→valor como as linhas do
 *  `DetailRow`. Ganha respiro do bloco de detalhes acima. */
export const AvaliadoresSecao = styled.div`
  margin-top: ${theme.spacing.md};
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

/** Separa a seção da descrição do coordenador do bloco de detalhes acima —
 *  sem isto os dois grudam, sem hierarquia visual nenhuma. */
export const DescricaoSecao = styled.div`
  margin-top: ${theme.spacing.md};
  padding-top: ${theme.spacing.md};
  border-top: 1px solid ${theme.colors.border};
`;

export const FormStack = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
`;

export const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
`;

export const FieldLabel = styled.label`
  font-size: ${theme.fontSize.sm};
  font-weight: ${theme.fontWeight.medium};
  color: ${theme.colors.foreground};
`;

/** O asterisco de campo obrigatório, mesma marcação em todo formulário. */
export const Required = styled.span`
  color: ${theme.colors.destructive};
  margin-left: 0.15rem;
`;

export const FieldInput = styled.input`
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

export const FieldTextarea = styled.textarea`
  width: 100%;
  box-sizing: border-box;
  min-height: 5rem;
  padding: 0.625rem 0.75rem;
  border-radius: ${theme.borderRadius.lg};
  border: 1px solid ${theme.colors.input};
  background: ${theme.colors.background};
  font-size: ${theme.fontSize.sm};
  color: ${theme.colors.foreground};
  resize: vertical;

  &:focus {
    outline: none;
    border-color: ${theme.colors.ring};
    box-shadow: 0 0 0 3px color-mix(in srgb, ${theme.colors.ring} 25%, transparent);
  }
`;

export const FormErrorText = styled.p`
  margin: 0;
  font-size: ${theme.fontSize.sm};
  color: ${theme.colors.destructive};
`;

export {
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalClose,
  ModalBody,
  ModalFooter,
  DetailRow as ModalDetailRow,
  DetailTerm as ModalDetailTerm,
  DetailValue as ModalDetailValue,
} from "./Calendario.styled";

export const NarrowModalContent = styled.div`
  width: 100%;
  max-width: 28rem;
  max-height: min(90vh, 640px);
  overflow-y: auto;
  border-radius: ${theme.borderRadius.xl};
  border: 1px solid ${theme.colors.border};
  background: ${theme.colors.card};
  box-shadow: ${theme.shadows.lg};
`;

export const WideModalContent = styled(NarrowModalContent)`
  max-width: 36rem;
`;

export const ModalFooterSplit = styled(BaseModalFooter)`
  justify-content: space-between;
`;

/** Corpo do formulário de avaliação da banca. O \`ModalBody\` cru é só
 *  padding: os grupos de campo ficavam encostados, e isso aparecia justo
 *  onde não há caixa de input pra separar (nome do escopo colado em
 *  "Projeto Avaliado", "Comentário" colado no último critério). Mesmo
 *  respiro do \`FormModalBody\`, sem o resto da mecânica de rolagem dele:
 *  aqui quem rola é o \`WideModalContent\`. */
export const AvaliarModalBody = styled(BaseModalBody)`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.lg};
`;

export const PageHeaderRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${theme.spacing.md};
`;

/** Os botões do cabeçalho, lado a lado — quebram na largura estreita em vez
 *  de espremer o rótulo. */
export const PageHeaderAcoes = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${theme.spacing.sm};
`;

export const PageHeaderText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

export const PageHeading = styled.h1`
  margin: 0;
  font-size: ${theme.fontSize["2xl"]};
  font-weight: ${theme.fontWeight.bold};
  color: ${theme.colors.foreground};
`;

export const PageSubheading = styled.p`
  margin: 0;
  font-size: ${theme.fontSize.sm};
  color: ${theme.colors.mutedForeground};
`;

export const CardHeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${theme.spacing.md};
  width: 100%;
`;

// A implementação real não é mais um `<select>` nativo, é `SelectCustom`,
// reexportado aqui com o mesmo nome pra ninguém precisar trocar import nos
// ~20 arquivos que já usam `FieldSelect` (mesma API: value/onChange/filhos
// `<option>`). Ver `components/SelectCustom.tsx`.
export { SelectCustom as FieldSelect } from "@/components/SelectCustom";

export const CheckboxGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 10rem;
  overflow-y: auto;
  padding: 0.625rem 0.75rem;
  border-radius: ${theme.borderRadius.lg};
  border: 1px solid ${theme.colors.input};
  background: ${theme.colors.background};
`;

export const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: ${theme.fontSize.sm};
  color: ${theme.colors.foreground};
  cursor: pointer;

  input {
    accent-color: ${theme.colors.primary};
  }
`;

export const DateTimeRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${theme.spacing.sm};
`;

export const SectionGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.lg};
`;

export const SectionTitle = styled.h2`
  margin: 0;
  font-size: ${theme.fontSize.lg};
  font-weight: ${theme.fontWeight.semibold};
  color: ${theme.colors.foreground};
`;

export const BancaLinha = styled.div<{ $destacada?: boolean }>`
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: ${theme.spacing.md};
  padding: 0.625rem 0.25rem;
  border-bottom: 1px solid ${theme.colors.border};
  transition: background ${theme.transitions.fast};

  /* Quem chega pelo card do monitoramento (/bancas?banca=123) cai numa lista
     longa. Sem uma marca, a pessoa precisa procurar de novo justamente a banca
     em que acabou de clicar. A marca é lateral e sutil: aponta sem esconder o
     que já está na tela. */
  ${({ $destacada }) =>
    $destacada &&
    css`
      background: ${theme.alpha(theme.colors.ring, 0.08)};
      box-shadow: inset 3px 0 0 ${theme.colors.ring};
      border-radius: ${theme.borderRadius.sm};
    `}

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: ${theme.colors.muted};
  }
`;

export const BancaData = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  flex-shrink: 0;
  border-radius: ${theme.borderRadius.lg};
  background: ${theme.colors.muted};
  line-height: 1.15;
`;

export const BancaDataDiaSemana = styled.span`
  font-size: 0.625rem;
  font-weight: ${theme.fontWeight.semibold};
  color: ${theme.colors.mutedForeground};
  text-transform: uppercase;
  letter-spacing: 0.03em;
`;

export const BancaDataDia = styled.span`
  font-size: ${theme.fontSize.lg};
  font-weight: ${theme.fontWeight.bold};
  color: ${theme.colors.foreground};
`;

/* Espelha o dia da semana, embaixo do número: o azulejo lê "TER / 26 / AGO".
   Sem o mês, banca de setembro e de outubro no dia 26 ficavam idênticas nas
   listas, que misturam meses. */
export const BancaDataMes = styled.span`
  font-size: 0.625rem;
  font-weight: ${theme.fontWeight.semibold};
  color: ${theme.colors.mutedForeground};
  text-transform: uppercase;
  letter-spacing: 0.03em;
`;

/** O quadrado de data quando a banca AINDA NÃO FOI MARCADA.
 *
 *  Substitui as três linhas (dia da semana / dia / mês) por um bloco só,
 *  centrado no mesmo quadrado de 3rem. Reaproveitar as três fatias não
 *  funcionava: "Sem data" tem 8 caracteres e a fatia do dia da semana tem
 *  10px de altura, então o texto espremia e sobrava um travessão grande no
 *  meio, onde o olho espera o número do dia.
 *
 *  Duas linhas curtas em vez de uma: em 3rem, "SEM DATA" numa linha só teria
 *  de encolher abaixo do legível. */
export const BancaSemData = styled.span`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  font-size: 0.625rem;
  font-weight: ${theme.fontWeight.semibold};
  color: ${theme.colors.mutedForeground};
  text-transform: uppercase;
  letter-spacing: 0.03em;
  line-height: 1.2;
`;

export const BancaInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.1875rem;
  min-width: 0;
`;

export const BancaNomeLinha = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

export const BancaNome = styled.span`
  font-weight: ${theme.fontWeight.medium};
  color: ${theme.colors.foreground};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

/** A linha de metadado simples (picker do `AlocarPessoasModal`, linhas de
 *  `SecaoTrocas`), sem ícone, é só texto corrido curto. Pro card cheio da
 *  lista principal ver `BancaMetaLinha`/`BancaMetaItem`, que têm mais fatos
 *  pra separar. */
export const BancaMeta = styled.span`
  font-size: ${theme.fontSize.xs};
  color: ${theme.colors.mutedForeground};
`;

/** O(s) selo(s) de ESTADO da banca (Inscrito, N vaga(s), Lotada, prazo de
 *  avaliação), empurrados pro canto direito da linha do título, longe do
 *  nome e do escopo. Separar por ALINHAMENTO, não só por serem badges
 *  diferentes: título+escopo dizem "o que é", o selo diz "como está", e os
 *  dois lados coexistindo na mesma corrida de texto era o que misturava as
 *  duas coisas. */
export const BancaStatusBadges = styled.span`
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  gap: 0.375rem;
  margin-left: auto;
`;

/** Cada fato da linha de metadado (horário, coordenador, alocados) com o
 *  próprio ícone, "09:00 · Duda Lima · 2/5 alocados" corrido, sem nada
 *  diferenciando as três informações, lia como um bloco só de texto cinza. */
export const BancaMetaLinha = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  font-size: ${theme.fontSize.xs};
  color: ${theme.colors.mutedForeground};
`;

export const BancaMetaItem = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;

  svg {
    flex-shrink: 0;
  }
`;

export const BancaAcoes = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  flex-wrap: wrap;
  justify-content: flex-end;
`;

/**
 * O card de uma banca na lista principal, não confundir com
 * `BancaLinha`, que continua sendo a linha fina usada em listas mais simples
 * (o picker do `AlocarPessoasModal`, as trocas em `SecaoTrocas`). Aqui a
 * banca carrega até 5-6 ações possíveis dependendo de quem olha, e por isso
 * ganha um cartão próprio: título/meta em cima, ações num rodapé separado
 * por uma borda, em vez de tudo espremido numa linha só (era isso que
 * deixava a tela cheia de pílulas iguais, sem hierarquia nenhuma). O cartão
 * inteiro é clicável (abre "Ver mais"), no mesmo padrão dos cards de
 * Projetos, por isso o botão "Ver mais" deixou de existir separado.
 */
export const BancaCard = styled.div<{ $destacada?: boolean }>`
  display: grid;
  grid-template-columns: auto 1fr;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.md};
  border-radius: ${theme.borderRadius.xl};
  border: 1px solid ${theme.colors.border};
  background: ${theme.colors.card};
  box-shadow: ${theme.shadows.sm};
  cursor: pointer;
  transition: border-color ${theme.transitions.fast}, box-shadow ${theme.transitions.fast};

  &:hover {
    border-color: ${theme.colors.ring};
    box-shadow: ${theme.shadows.md};
  }

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px color-mix(in srgb, ${theme.colors.ring} 30%, transparent);
  }

  /* Quem chega pelo card do monitoramento (/bancas?banca=123) cai numa lista
     longa. Sem uma marca, a pessoa precisa procurar de novo justamente a
     banca em que acabou de clicar. */
  ${({ $destacada }) =>
    $destacada &&
    css`
      border-color: ${theme.colors.ring};
      box-shadow: 0 0 0 3px color-mix(in srgb, ${theme.colors.ring} 18%, transparent);
    `}
`;

/** As duas colunas da lista de bancas viram uma coluna só em telas
 *  estreitas, a grade de data+ações lado a lado não cabe. */
export const BancaCardScrollWrap = styled.div<{ $scrollable?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};

  ${({ $scrollable }) =>
    $scrollable &&
    css`
      max-height: 34rem;
      overflow-y: auto;
    `}
`;

/**
 * Um bloco de bancas de uma frente dentro da lista.
 *
 * O respiro entre os cartões é o mesmo da lista sem agrupamento, então
 * ligar ou desligar a separação não muda a densidade do card.
 */
export const FrenteGrupo = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
`;

/** O cabeçalho de cada bloco. Mesma forma do agrupamento por frente do
 *  painel de alocação em Vagas (`PainelGrupoTitulo`), de propósito: são a
 *  mesma leitura, em duas telas. */
export const FrenteGrupoTitulo = styled.h4`
  margin: ${theme.spacing.xs} 0 0;
  font-size: ${theme.fontSize.xs};
  font-weight: ${theme.fontWeight.semibold};
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: ${theme.colors.mutedForeground};

  ${FrenteGrupo}:first-child & {
    margin-top: 0;
  }
`;

/** Um bloco de critérios por escopo no formulário de avaliação de banca
 *  (banca de mais de um escopo). Diferente do `FrenteGrupo` compacto do
 *  painel de alocação: aqui os escopos são seções de peso próprio, então
 *  cada uma respira e a fronteira entre elas é visível — sem isso a pessoa
 *  não percebe onde o escopo A termina e o B começa e mistura as notas. */
export const EscopoAvaliacaoBloco = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
  /* O \`gap\` do corpo do modal (\`lg\`) já separa este bloco do que vem antes
   *  (o Bloco 1), mas o título em negrito com a barra pesa mais que o campo
   *  simples ali em cima — sem este respiro a mais, os dois pareciam
   *  colados mesmo com o gap padrão entre eles. */
  margin-top: ${theme.spacing.sm};

  & + & {
    margin-top: ${theme.spacing.lg};
    padding-top: ${theme.spacing.lg};
    border-top: 2px solid ${theme.colors.border};
  }
`;

export const EscopoAvaliacaoTitulo = styled.h4`
  margin: 0;
  font-size: ${theme.fontSize.base};
  font-weight: ${theme.fontWeight.semibold};
  color: ${theme.colors.foreground};
  padding-left: ${theme.spacing.sm};
  border-left: 3px solid ${theme.colors.primary};
`;

/** O título do card com o filtro logo depois dele. Existe para os dois
 *  andarem juntos à esquerda — sem ela o `space-between` do cabeçalho
 *  jogaria o filtro para o meio da linha, longe do nome que ele recorta. */
export const CardHeaderTitulo = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  /* Entre \`sm\` e \`md\` do tema: com \`sm\` o filtro encostava no título e os
     dois liam como uma coisa só; \`md\` já soltava demais e o filtro deixava
     de pertencer ao card. */
  gap: 0.75rem;

  /* O h2 herda \`line-height: 1.5\` do preflight, então a caixa dele é bem
     mais alta que as letras. Centrando caixa com caixa, o título parecia
     fora de eixo em relação ao filtro; com \`1\` a caixa encosta nas letras
     e os dois centram pelo que se vê. */
  > h2 {
    line-height: 1;
  }
`;

/**
 * O filtro de frente, no cabeçalho e não acima da lista.
 *
 * Sem rótulo de propósito: a opção escolhida já é o nome de uma frente, e
 * "Frente" ao lado dela só repetiria o que se lê.
 *
 * `width: auto` porque o `SelectWrap` é 100% por padrão — no cabeçalho ele
 * precisa ocupar só o que o nome pede. `display: flex` troca o
 * `inline-block` do wrap, que trazia junto o espaço de descida da linha e
 * empurrava o gatilho alguns pixels abaixo do eixo do título.
 *
 * O gatilho encolhe de 2.25rem para 1.75rem: na altura cheia ele sozinho
 * definia a altura do cabeçalho, e este card ficava com a faixa do topo mais
 * alta que a dos cards vizinhos — que é o que fazia a linha inteira parecer
 * desalinhada.
 */
export const FiltroFrenteSelect = styled(SelectCustom)`
  display: flex;
  align-self: center;
  width: auto;
  min-width: 11rem;

  button {
    height: 1.75rem;
  }
`;

/** O rodapé do card, separado do título/meta por uma borda, pra ação não
 *  parecer parte do mesmo bloco de texto. `justify-content: space-between`
 *  separa as ações administrativas (esquerda) da ação principal (direita),
 *  que é a única pílula cheia do card, o resto fica em contorno. */
export const BancaCardFooter = styled.div`
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: ${theme.spacing.sm};
  margin-top: ${theme.spacing.xs};
  padding-top: ${theme.spacing.sm};
  border-top: 1px solid ${theme.colors.border};
`;

export const BancaAcoesSecundarias = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  flex-wrap: wrap;
`;

export const TabCount = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.125rem;
  height: 1.125rem;
  padding: 0 0.3rem;
  margin-left: 0.375rem;
  border-radius: ${theme.borderRadius.full};
  background: ${theme.colors.muted};
  color: ${theme.colors.mutedForeground};
  font-size: 0.6875rem;
  font-weight: ${theme.fontWeight.semibold};
`;

export const TabBar = styled.nav`
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  border-bottom: 1px solid ${theme.colors.border};
`;

export const TabButton = styled.button<{ $ativa: boolean }>`
  display: inline-flex;
  align-items: center;
  padding: 0.5rem 0.875rem;
  border: none;
  background: none;
  border-bottom: 2px solid ${({ $ativa }) => ($ativa ? theme.colors.primary : "transparent")};
  margin-bottom: -1px;
  font-size: ${theme.fontSize.sm};
  font-weight: ${theme.fontWeight.medium};
  color: ${({ $ativa }) => ($ativa ? theme.colors.primary : theme.colors.mutedForeground)};
  cursor: pointer;

  &:hover {
    color: ${theme.colors.foreground};
  }
`;

/* ------------------------------------------------------------------ */
/* Busca de projeto no "Criar banca"                                    */
/* ------------------------------------------------------------------ */

/** Resultados da busca: rolagem própria para a lista não empurrar o rodapé
 *  do modal para fora da tela quando o núcleo tiver muito projeto. */
export const BuscaLista = styled.div`
  display: flex;
  flex-direction: column;
  max-height: 12rem;
  overflow-y: auto;
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.borderRadius.md};
`;

export const BuscaItem = styled.button`
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  text-align: left;
  border: none;
  background: transparent;
  cursor: pointer;
  font: inherit;

  & + & {
    border-top: 1px solid ${theme.colors.border};
  }

  &:hover,
  &:focus-visible {
    background: ${theme.colors.muted};
  }
`;

export const BuscaNome = styled.span`
  font-size: ${theme.fontSize.sm};
  font-weight: ${theme.fontWeight.medium};
  color: ${theme.colors.cardForeground};
`;

export const BuscaMeta = styled.span`
  font-size: ${theme.fontSize.xs};
  color: ${theme.colors.mutedForeground};
`;

/** Nome + cliente empilhados, tanto no resultado da busca quanto no escolhido. */
export const BuscaTexto = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  min-width: 0;
`;

/** O projeto já escolhido, com a saída para trocar. */
export const EscolhidoBox = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.borderRadius.md};
  background: ${theme.colors.muted};
`;

/** Escopo que já tem banca: continua visível, mas fora de alcance, some da
 *  lista seria pior, o usuário procuraria por ele. */
export const EscopoIndisponivel = styled.span`
  font-size: ${theme.fontSize.xs};
  color: ${theme.colors.mutedForeground};
  font-style: italic;
`;

/** A composição por frente no modal de alocar: uma linha por frente, com o
 *  que ela tem contra o que ela exige. Lista e não tabela — são no máximo
 *  quatro linhas curtas, e uma tabela pediria cabeçalho para dizer o que
 *  cada texto já diz. */
export const ComposicaoLista = styled.ul`
  margin: 0 0 ${theme.spacing.md};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xs};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.borderRadius.md};
  background: ${theme.colors.muted};
  font-size: ${theme.fontSize.xs};
  color: ${theme.colors.mutedForeground};

  strong {
    color: ${theme.colors.foreground};
  }
`;

/* ------------------------------------------------------------------ */
/* O formulário de banca (criar / editar)                               */
/* ------------------------------------------------------------------ */

/**
 * A caixa do formulário de banca.
 *
 * Difere do `WideModalContent` num ponto só, e é o ponto: quem rola é o
 * CORPO, não a caixa inteira. O formulário tem oito campos, três deles com
 * lista de rolagem própria — com a caixa rolando, o cabeçalho e o rodapé (que
 * é onde ficam Cancelar e Salvar) saíam da tela junto com o resto, e o botão
 * que termina a tarefa ficava a uma rolagem de distância do último campo
 * preenchido.
 *
 * Não estende `WideModalContent` porque precisaria desfazer o `overflow-y` e
 * a `max-height` dele; e não muda `WideModalContent` porque são outros 16
 * modais usando aquele formato.
 */
export const FormModalContent = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 38rem;
  /* \`dvh\` e não \`vh\`: no celular a \`vh\` mede a janela SEM a barra de
     endereço, então 92vh é mais alto do que se vê e o rodapé — onde estão
     Cancelar e Salvar — nasce escondido atrás dela. A linha de \`vh\` fica
     como reserva para quem não conhece \`dvh\`. */
  max-height: min(92vh, 46rem);
  max-height: min(92dvh, 46rem);
  overflow: hidden;
  border-radius: ${theme.borderRadius.xl};
  border: 1px solid ${theme.colors.border};
  background: ${theme.colors.card};
  box-shadow: ${theme.shadows.lg};
  animation: formModalEntrar ${theme.transitions.fast};

  /* Ver a nota do respiro em \`FormModalBody\`: os três precisam do mesmo
     recuo lateral, senão o título e os botões ficam fora do eixo dos campos. */
  @media (max-width: ${theme.breakpoints.md}px) {
    ${ModalHeader},
    ${BaseModalFooter} {
      padding-left: ${theme.spacing.md};
      padding-right: ${theme.spacing.md};
    }
  }

  @keyframes formModalEntrar {
    from {
      opacity: 0;
      transform: translateY(0.5rem) scale(0.985);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

/** O `<form>` ocupa a altura toda da caixa: é dentro dele que o corpo rola e
 *  o rodapé fica colado embaixo. `min-height: 0` porque item de flex não
 *  encolhe abaixo do conteúdo sem isso, e o corpo nunca ganharia a barra. */
export const FormModalForm = styled.form`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
`;

export const FormModalBody = styled(BaseModalBody)`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.lg};
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  /* Sem isto, rolar até o fim do corpo "encadeia" para a página atrás e ela
     rola junto (o modal é filho de um overlay \`position: fixed\`, que não
     segura a rolagem por si só). */
  overscroll-behavior: contain;

  /*
   * A linha das três listas de marcar deste formulário — escopos, consultores
   * (dentro da \`ListaMarcavel\`) e frentes. Escopado ao corpo do modal, e não
   * posto na \`CheckboxLabel\`, que tem 34 usos espalhados e densidades
   * próprias.
   *
   * A área de clique passa a ser a linha inteira, não os 13px da caixinha; o
   * marcado ganha fundo tênue para a seleção ser legível de relance, sem
   * depender de enxergar caixa por caixa; e o indisponível perde o
   * \`cursor: pointer\`, que prometia um clique que não acontece.
   */
  ${CheckboxLabel} {
    align-items: flex-start;
    padding: 0.375rem 0.5rem;
    margin: 0 -0.25rem;
    border-radius: ${theme.borderRadius.md};
    line-height: 1.35;
    transition: background ${theme.transitions.fast};

    input {
      flex-shrink: 0;
      margin-top: 0.15rem;
    }

    &:hover {
      background: ${theme.colors.muted};
    }

    &:has(input:checked) {
      background: ${theme.alpha(theme.colors.primary, 0.07)};
    }

    &:has(input:disabled) {
      cursor: not-allowed;
      color: ${theme.colors.mutedForeground};

      &:hover {
        background: transparent;
      }
    }

    /* 30px de altura é confortável com um mouse e pequeno para o polegar.
       Cresce só no celular: no desktop a lista rola menos por caber mais
       linha na mesma caixa de 10rem. */
    @media (max-width: ${theme.breakpoints.md}px) {
      min-height: 2.75rem;
      align-items: center;

      input {
        margin-top: 0;
      }
    }
  }

  /* Num aparelho de 390px, 24px de cada lado aqui mais 16px do véu deixam
     310px para o formulário. Com 16px sobram 326px — 5% de largura que
     aparecem justamente nos rótulos longos dos escopos. O cabeçalho e o
     rodapé acompanham (logo abaixo), senão o conteúdo desalinha deles. */
  @media (max-width: ${theme.breakpoints.md}px) {
    padding: ${theme.spacing.md};
  }

  /* Grade de duas colunas não encolhe abaixo do conteúdo sem isto: um
     \`input[type=date]\` largo (o Safari do iPhone desenha o dele maior que o
     Chrome) empurraria a linha para fora em vez de espremer. */
  ${DateTimeRow} > * {
    min-width: 0;
  }
`;

/** Título e linha de apoio empilhados no cabeçalho do modal. */
export const ModalTituloBloco = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
`;

export const ModalSubtitulo = styled.p`
  margin: 0;
  font-size: ${theme.fontSize.xs};
  color: ${theme.colors.mutedForeground};
`;

/** Um bloco do formulário: os campos que pertencem uns aos outros, mais
 *  juntos entre si (\`md\`) do que do bloco vizinho (o \`lg\` do
 *  \`FormModalBody\`). Sem isto o modal é uma coluna de oito campos de peso
 *  igual, em que "Data" parece tão ligada a "Consultores" quanto a "Horário".
 *
 *  O respiro é a única marca do agrupamento, de propósito: os títulos com
 *  régua que existiam aqui repetiam o nome do campo logo abaixo ("Projeto"
 *  sobre o campo Projeto) e sujavam a leitura em troca de nada. */
export const FormSecao = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
`;

/** Rótulo à esquerda, contador ("2 de 3 marcados") à direita, na mesma linha. */
export const FieldLabelRow = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: ${theme.spacing.sm};
`;

export const FieldContador = styled.span`
  flex-shrink: 0;
  font-size: ${theme.fontSize.xs};
  color: ${theme.colors.mutedForeground};
`;

/** A frase de apoio abaixo de um campo (o que ele faz, de onde o valor vem).
 *  `BuscaMeta` fazia esse papel emprestado, sendo um `span` de item de
 *  resultado de busca. */
export const FieldHint = styled.p`
  margin: 0;
  font-size: ${theme.fontSize.xs};
  color: ${theme.colors.mutedForeground};
  line-height: 1.4;
`;

/** O campo de busca com a lupa dentro. O ícone não é enfeite: a caixa de
 *  texto solta acima de uma lista parecia um campo a preencher, e não o
 *  filtro dela. */
export const BuscaCampo = styled.div`
  position: relative;
  display: flex;
  align-items: center;

  > svg {
    position: absolute;
    left: 0.625rem;
    color: ${theme.colors.mutedForeground};
    pointer-events: none;
  }

  > input {
    width: 100%;
    box-sizing: border-box;
    padding-left: 2.125rem;
  }
`;

/** O lugar da lista de escopos enquanto ela chega. Reserva altura para o
 *  resto do formulário não pular quando a resposta volta. */
export const EscoposCarregando = styled.div`
  height: 4.5rem;
  border-radius: ${theme.borderRadius.lg};
  border: 1px solid ${theme.colors.input};
  background: linear-gradient(
    90deg,
    ${theme.colors.muted} 0%,
    color-mix(in srgb, ${theme.colors.muted} 55%, var(--atlas-card)) 50%,
    ${theme.colors.muted} 100%
  );
  background-size: 200% 100%;
  animation: escoposShimmer 1.2s ease-in-out infinite;

  @keyframes escoposShimmer {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

/**
 * O erro do envio, numa faixa colada ao rodapé em vez de solto no fim do
 * corpo: o corpo rola, e o erro que nasce depois do clique em Salvar
 * aparecia a uma tela de distância do botão que a pessoa acabou de apertar.
 */
export const FormModalErro = styled.p`
  display: flex;
  align-items: flex-start;
  gap: ${theme.spacing.sm};
  margin: 0;
  padding: ${theme.spacing.sm} ${theme.spacing.lg};
  border-top: 1px solid ${theme.alpha(theme.colors.destructive, 0.3)};
  background: ${theme.alpha(theme.colors.destructive, 0.08)};
  font-size: ${theme.fontSize.sm};
  color: ${theme.colors.destructive};

  svg {
    flex-shrink: 0;
    margin-top: 0.1rem;
  }
`;

/** O rodapé do formulário: o que ainda falta à esquerda, os botões à
 *  direita. Botão desativado sem explicação é beco sem saída — quem não
 *  marcou escopo nenhum via "Criar" apagado e nada dizendo por quê. */
export const FormModalFooter = styled(BaseModalFooter)`
  align-items: center;
  flex-wrap: wrap;
  gap: ${theme.spacing.md};
`;

export const FormModalPendencia = styled.span`
  flex: 1;
  min-width: 10rem;
  font-size: ${theme.fontSize.xs};
  color: ${theme.colors.mutedForeground};
`;

export const FormModalAcoes = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  margin-left: auto;
`;

/** O anel girando dentro do botão enquanto o envio corre. Sem ele, "Salvando…"
 *  é uma troca de rótulo que passa despercebida numa requisição rápida e
 *  parece um botão travado numa lenta. */
export const BotaoSpinner = styled.span`
  /* O \`gap\` do \`buttonBase\` já separa o anel do rótulo — margem aqui somaria
     em cima dele. */
  flex-shrink: 0;
  width: 0.8rem;
  height: 0.8rem;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: ${theme.borderRadius.full};
  animation: botaoGirar 0.6s linear infinite;

  @keyframes botaoGirar {
    to {
      transform: rotate(360deg);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    animation-duration: 2s;
  }
`;
