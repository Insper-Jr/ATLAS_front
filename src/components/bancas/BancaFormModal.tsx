import { useEffect, useRef, useState } from "react";
import { AlertCircle, Search, X } from "lucide-react";
import {
  getEscoposVendidos,
  syncBancaFrentes,
  syncEquipeProjeto,
  toDateInputValue,
  toTimeInputValue,
  updateBanca,
} from "@/lib/bancas";
import {
  getProjetos,
  getEscoposProjeto,
  marcarBancaDoEscopo,
  paraDataUtc,
} from "@/lib/projetos";
import { consultoresDoNucleo } from "@/lib/nucleo";
import { ListaMarcavel } from "@/components/ListaMarcavel";
import { useLockBodyScroll } from "@/hooks/useLockBodyScroll";
import type { Banca, BancaFrente, EquipeProjeto, Frente } from "@/types/banca";
import type { EscopoVendido, ProjetoResumo } from "@/types/projeto";
import type { UsuarioResumo } from "@/types/auth";
import { EmptyText, PageButton, PageButtonSm } from "@/styles/page.styled";
import {
  FieldGroup,
  FieldLabel,
  FieldInput,
  CheckboxGrid,
  CheckboxLabel,
  DateTimeRow,
  ModalOverlay,
  ModalHeader,
  ModalTitle,
  ModalClose,
  BuscaLista,
  BuscaItem,
  BuscaTexto,
  BuscaNome,
  BuscaMeta,
  EscolhidoBox,
  EscopoIndisponivel,
  FormModalContent,
  FormModalForm,
  FormModalBody,
  FormModalErro,
  FormModalFooter,
  FormModalPendencia,
  FormModalAcoes,
  FormSecao,
  FieldLabelRow,
  FieldContador,
  FieldHint,
  BuscaCampo,
  EscoposCarregando,
  ModalTituloBloco,
  ModalSubtitulo,
  BotaoSpinner,
} from "@/pages/Bancas.styled";
import { FUSO, instanteDeBrasilia } from "@/lib/fuso";

/**
 * As listas do núcleo que o formulário precisa para traduzir id em nome e
 * para saber o que já está marcado nesta banca.
 *
 * Vêm de fora porque as duas telas que abrem o formulário já as têm por
 * motivos próprios (a `/bancas` carrega tudo para desenhar os cards; a aba
 * Banca do projeto busca sob demanda, no clique do Editar) — buscá-las aqui
 * dentro repetiria a chamada em uma das duas.
 */
export interface DadosDoFormularioDeBanca {
  usuarios: UsuarioResumo[];
  frentes: Frente[];
  equipesProjeto: EquipeProjeto[];
  bancasFrentes: BancaFrente[];
}

/**
 * O formulário de banca — criar (sem `banca`) e editar (com ela).
 *
 * Vive aqui, e não dentro da tela `/bancas`, porque a aba **Banca** do projeto
 * abre o MESMO formulário: quem está olhando a banca de um projeto edita data,
 * escopo, consultores e frentes ali mesmo, em vez de procurar a banca certa na
 * lista de todas as bancas do semestre.
 *
 * Os campos estão agrupados em três blocos — projeto, quando, composição —
 * separados só por respiro, sem título: numa coluna única de oito campos de
 * mesmo peso não dava para ver que "Horário" pertence a "Data" e "Frentes"
 * pertence a "Consultores". A ordem dentro de cada bloco é a de sempre; só o
 * piso mínimo mudou de lugar, do meio do formulário para o fim da composição,
 * que é sobre o que ele decide (quanta gente a banca exige).
 */
export function BancaFormModal({
  banca,
  dados,
  token,
  ehDiretor,
  onClose,
  onSalvo,
}: {
  banca?: Banca | null;
  dados: DadosDoFormularioDeBanca;
  token: string;
  ehDiretor: boolean;
  onClose: () => void;
  onSalvo: () => void;
}) {
  const editando = !!banca;

  const [nomeProjeto, setNomeProjeto] = useState(banca?.nome_projeto ?? "");

  // Criar banca parte de um projeto que já existe: nada de digitar o nome.
  // O endpoint `marcarBancaDoEscopo` deriva nome, coordenador e frentes do
  // próprio projeto, os mesmos dados que a tela de cronograma usa.
  const [projetos, setProjetos] = useState<ProjetoResumo[]>([]);
  const [projetoId, setProjetoId] = useState<number | null>(null);
  const [busca, setBusca] = useState("");
  const [escoposCarregados, setEscoposCarregados] = useState<{
    projetoId: number;
    lista: EscopoVendido[];
  } | null>(null);
  const [escoposMarcados, setEscoposMarcados] = useState<number[]>(
    banca?.projeto_escopo_ids ?? [],
  );
  // Banca sem data abre o formulário com os campos VAZIOS, que é justamente o
  // caso de quem entra aqui para marcá-la.
  const [data, setData] = useState(banca?.data_hora ? toDateInputValue(banca.data_hora) : "");
  const [hora, setHora] = useState(banca?.data_hora ? toTimeInputValue(banca.data_hora) : "");
  const [consultorIds, setConsultorIds] = useState<number[]>(() =>
    banca ? dados.equipesProjeto.filter((e) => e.banca_id === banca.id).map((e) => e.usuario_id) : [],
  );
  const [frenteIds, setFrenteIds] = useState<number[]>(() =>
    banca ? dados.bancasFrentes.filter((bf) => bf.banca_id === banca.id).map((bf) => bf.frente_id) : [],
  );
  const [pisoOverride, setPisoOverride] = useState(
    banca?.piso_minimo_override != null ? String(banca.piso_minimo_override) : "",
  );
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  const caixaRef = useRef<HTMLDivElement>(null);
  const primeiroCampoRef = useRef<HTMLInputElement>(null);
  // O `onClose` das duas telas que abrem este modal é uma arrow criada a cada
  // render; como dependência do efeito abaixo ele o remontaria a cada
  // digitação, roubando o foco do campo em uso. Por ref, o efeito roda uma vez
  // só e ainda enxerga o `onClose` atual.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  const consultores = consultoresDoNucleo(dados.usuarios).sort((a, b) =>
    a.nome.localeCompare(b.nome, "pt-BR"),
  );

  // A página atrás não rola junto: a trava mora no hook (no `<html>`, com
  // contador), compartilhada com `ModalOverlay` e o detalhe da banca.
  useLockBodyScroll();

  /**
   * O contrato de diálogo que faltava: Esc fecha, o Tab não escapa para a
   * página atrás e o foco volta para o botão que abriu o modal. É o mesmo
   * Esc que os outros ~15 modais do app já têm.
   */
  useEffect(() => {
    const focoAnterior = document.activeElement as HTMLElement | null;
    primeiroCampoRef.current?.focus();

    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !caixaRef.current) return;
      const focaveis = caixaRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focaveis.length === 0) return;
      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];
      if (e.shiftKey && document.activeElement === primeiro) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primeiro.focus();
      }
    }

    window.addEventListener("keydown", aoTeclar);
    return () => {
      window.removeEventListener("keydown", aoTeclar);
      focoAnterior?.focus?.();
    };
  }, []);

  useEffect(() => {
    if (editando) return;
    let ativo = true;
    getProjetos(token)
      .then((lista) => {
        if (ativo) setProjetos(lista.filter((p) => !p.arquivado_em));
      })
      .catch(() => undefined);
    return () => {
      ativo = false;
    };
  }, [editando, token]);

  // ⭐ Editando, o projeto não é escolhido — vem da banca. Como ela guarda só
  // os ids dos escopos, a lista GLOBAL de escopos vendidos é o caminho mais
  // curto para o `projeto_id` deles; buscar escopo a escopo seria uma
  // requisição por escopo para chegar ao mesmo número.
  useEffect(() => {
    if (!editando || !banca || projetoId != null) return;
    const primeiro = banca.projeto_escopo_ids[0];
    if (primeiro == null) return;
    let ativo = true;
    getEscoposVendidos(token)
      .then((todos) => {
        const dono = todos.find((e) => e.id === primeiro);
        if (ativo && dono) setProjetoId(dono.projeto_id);
      })
      .catch(() => undefined);
    return () => {
      ativo = false;
    };
  }, [editando, banca, projetoId, token]);

  useEffect(() => {
    if (projetoId == null) return;
    let ativo = true;
    getEscoposProjeto(projetoId, token)
      .then((lista) => {
        if (ativo) setEscoposCarregados({ projetoId, lista });
      })
      .catch(() => {
        if (ativo) setEscoposCarregados({ projetoId, lista: [] });
      });
    return () => {
      ativo = false;
    };
  }, [projetoId, token]);

  // Derivados em vez de estado espelhado: a lista só vale para o projeto que
  // a trouxe, então trocar de projeto já a invalida sozinho.
  /** O escopo já pertence à banca que está sendo editada. */
  const ehDestaBanca = (escopo: EscopoVendido) =>
    !!banca && banca.projeto_escopo_ids.includes(escopo.id);

  const escoposDoProjeto =
    escoposCarregados?.projetoId === projetoId ? escoposCarregados.lista : [];
  /** Editando, o projeto ainda está sendo descoberto a partir dos escopos da
   *  banca (o efeito acima). Sem isto o bloco de escopos simplesmente não
   *  existia até a resposta chegar. */
  const resolvendoProjeto =
    editando && projetoId == null && (banca?.projeto_escopo_ids.length ?? 0) > 0;
  const carregandoEscopos =
    resolvendoProjeto || (projetoId != null && escoposCarregados?.projetoId !== projetoId);

  const projetoEscolhido = projetos.find((p) => p.id === projetoId) ?? null;

  const projetosFiltrados = (
    busca.trim()
      ? projetos.filter((p) =>
          `${p.nome} ${p.cliente}`.toLowerCase().includes(busca.trim().toLowerCase()),
        )
      : projetos.slice()
  ).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  /** Escopo que já tem banca não pode ser puxado para outra: o backend recusa
   *  (seria apagar em silêncio a data já marcada).
   *
   *  ⚠ Editando, os escopos DESTA banca também contam como disponíveis: eles
   *  aparecem com `escopo.banca` preenchida (a própria), e tratá-los como
   *  ocupados escondia a lista inteira — toda banca cujos escopos fossem todos
   *  os do projeto caía no "todos já têm banca" e não dava para trocar nada. */
  const escoposSelecionaveis = escoposDoProjeto.filter((e) => !e.banca || ehDestaBanca(e));

  const frentesDosEscoposMarcados = [
    ...new Set(
      escoposDoProjeto
        .filter((e) => escoposMarcados.includes(e.id))
        .map((e) => dados.frentes.find((f) => f.id === e.frente_id)?.nome)
        .filter((nome): nome is string => !!nome),
    ),
  ];

  /** O que ainda falta para o botão principal sair do cinza. Um botão
   *  desativado sem explicação é um beco sem saída: quem chegava sem escopo
   *  marcado via "Criar" apagado e nada dizendo o porquê. */
  const pendencia = editando
    ? ""
    : projetoEscolhido == null
      ? "Escolha o projeto para continuar."
      : escoposMarcados.length === 0
        ? "Marque ao menos um escopo que esta banca cobre."
        : "";

  function toggleId(lista: number[], id: number): number[] {
    return lista.includes(id) ? lista.filter((x) => x !== id) : [...lista, id];
  }

  /**
   * Marca/desmarca um escopo e, na edição, faz as frentes acompanharem.
   *
   * ⚠ O `syncBancaFrentes` do submit é o ÚLTIMO a gravar e manda a lista de
   * checkboxes de Frentes. Se ela não acompanhasse os escopos, o recálculo que
   * o backend faz em `updateBanca` seria desfeito logo em seguida: a frente do
   * escopo removido voltaria e a do escopo acrescentado sumiria. As frentes
   * que o usuário marcou à mão e não vêm de escopo nenhum do projeto ficam.
   */
  function alternarEscopo(escopoId: number) {
    const marcados = toggleId(escoposMarcados, escopoId);
    setEscoposMarcados(marcados);
    if (!editando) return;
    const frentesDeEscopo = new Set(escoposDoProjeto.map((e) => e.frente_id));
    const frentesDosMarcados = escoposDoProjeto
      .filter((e) => marcados.includes(e.id))
      .map((e) => e.frente_id);
    setFrenteIds((ids) => [
      ...new Set([...ids.filter((id) => !frentesDeEscopo.has(id)), ...frentesDosMarcados]),
    ]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!data || !hora) return;
    // Editando, os escopos também são obrigatórios: o backend recusa esvaziar
    // a banca (ela ficaria órfã), e barrar aqui evita o 422 depois do clique.
    // A banca LEGADA (nenhum escopo vendido) é a única que pode ser salva sem
    // nenhum marcado — ela nunca teve vínculo para perder.
    if (escoposMarcados.length === 0 && (banca?.projeto_escopo_ids.length ?? 1) > 0) {
      if (editando) setErro("A banca precisa cobrir ao menos um escopo.");
      return;
    }
    setEnviando(true);
    setErro("");
    try {
      // Digitado como horário de Brasília, não do navegador.
      const dataHora = instanteDeBrasilia(data, hora);
      // Ordem do PROJETO, não a de clique: qual escopo é "o primeiro" não pode
      // depender da ordem em que as caixas foram marcadas.
      const primeiroMarcado = escoposDoProjeto.find((e) => escoposMarcados.includes(e.id));
      const escopoDoCatalogo = primeiroMarcado ? primeiroMarcado.escopo_id : undefined;
      const pisoMinimoOverride = ehDiretor
        ? pisoOverride.trim() === ""
          ? null
          : Number(pisoOverride)
        : undefined;
      if (editando && banca) {
        await updateBanca(
          banca.id,
          {
            nome_projeto: nomeProjeto.trim(),
            data_hora: dataHora,
            // ⭐ A lista SUBSTITUI a atual: o que foi desmarcado sai da banca,
            // e o backend recalcula as frentes dela a partir dos escopos que
            // sobraram. Não confundir com `escopo_id`, que é o rótulo do
            // catálogo.
            projeto_escopo_ids: escoposMarcados,
            // ⭐ O rótulo legado do catálogo acompanha os escopos marcados, em
            // vez de ter um campo próprio: ele é o mesmo dado, e escolhido à
            // parte divergia da banca (a tela de Avaliações e o Dashboard
            // agrupam por ele). É o catálogo do PRIMEIRO escopo marcado —
            // a mesma regra da criação, em `marcar_banca_escopo`. Só vai
            // quando os escopos do projeto estão carregados: sem eles,
            // mandar `null` apagaria o rótulo sem que ninguém tenha pedido.
            ...(escopoDoCatalogo !== undefined ? { escopo_id: escopoDoCatalogo } : {}),
            ...(pisoMinimoOverride !== undefined ? { piso_minimo_override: pisoMinimoOverride } : {}),
          },
          token,
        );
        await syncEquipeProjeto(banca.id, consultorIds, dados.equipesProjeto, token);
        await syncBancaFrentes(banca.id, frenteIds, dados.bancasFrentes, token);
      } else {
        // Uma banca pode cobrir vários escopos do mesmo projeto. O
        // primeiro vai na URL, a lista completa no corpo, o backend deriva
        // dali o nome do projeto, o coordenador e as frentes.
        const criada = await marcarBancaDoEscopo(
          escoposMarcados[0],
          dataHora,
          token,
          undefined,
          escoposMarcados,
        );
        if (consultorIds.length > 0) {
          await syncEquipeProjeto(criada.id, consultorIds, dados.equipesProjeto, token);
        }
        if (pisoMinimoOverride != null) {
          await updateBanca(criada.id, { piso_minimo_override: pisoMinimoOverride }, token);
        }
      }
      onSalvo();
    } catch (err) {
      setErro(err instanceof Error ? err.message : editando ? "Erro ao salvar banca" : "Erro ao criar banca");
    } finally {
      setEnviando(false);
    }
  }

  return (
    // `onMouseDown` e não `onClick`: arrastar para selecionar o texto de dentro
    // e soltar o botão em cima do véu contava como clique fora e fechava o
    // formulário preenchido.
    <ModalOverlay onMouseDown={onClose} role="presentation">
      <FormModalContent
        ref={caixaRef}
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="banca-form-titulo"
      >
        <ModalHeader>
          <ModalTituloBloco>
            <ModalTitle id="banca-form-titulo">{editando ? "Editar banca" : "Criar banca"}</ModalTitle>
            <ModalSubtitulo>
              {editando
                ? "Data, escopos, consultores e frentes desta banca."
                : "A banca nasce de um escopo já vendido: escolha o projeto e o que ela cobre."}
            </ModalSubtitulo>
          </ModalTituloBloco>
          <ModalClose type="button" aria-label="Fechar" onClick={onClose}>
            <X size={18} />
          </ModalClose>
        </ModalHeader>

        <FormModalForm onSubmit={handleSubmit}>
          <FormModalBody>
            <FormSecao>
              {editando ? (
                <FieldGroup>
                  <FieldLabel htmlFor="nome-projeto">Nome do projeto</FieldLabel>
                  <FieldInput
                    id="nome-projeto"
                    ref={primeiroCampoRef}
                    value={nomeProjeto}
                    onChange={(e) => setNomeProjeto(e.target.value)}
                    placeholder="Ex.: Portugal 1"
                    required
                  />
                </FieldGroup>
              ) : (
                <FieldGroup>
                  <FieldLabel htmlFor="busca-projeto">Projeto</FieldLabel>
                  {projetoEscolhido ? (
                    <EscolhidoBox>
                      <BuscaTexto>
                        <BuscaNome>{projetoEscolhido.nome}</BuscaNome>
                        <BuscaMeta>{projetoEscolhido.cliente}</BuscaMeta>
                      </BuscaTexto>
                      <PageButtonSm
                        $variant="outline"
                        type="button"
                        onClick={() => {
                          setProjetoId(null);
                          setEscoposMarcados([]);
                          setBusca("");
                        }}
                      >
                        Trocar
                      </PageButtonSm>
                    </EscolhidoBox>
                  ) : (
                    <>
                      <BuscaCampo>
                        <Search size={15} aria-hidden="true" />
                        <FieldInput
                          id="busca-projeto"
                          ref={primeiroCampoRef}
                          value={busca}
                          onChange={(e) => setBusca(e.target.value)}
                          placeholder="Busque pelo nome do projeto ou do cliente"
                          autoComplete="off"
                        />
                      </BuscaCampo>
                      {projetos.length === 0 ? (
                        <EmptyText>Nenhum projeto ativo para marcar banca.</EmptyText>
                      ) : projetosFiltrados.length === 0 ? (
                        <EmptyText>Nenhum projeto encontrado para "{busca}".</EmptyText>
                      ) : (
                        <BuscaLista>
                          {projetosFiltrados.map((projeto) => (
                            <BuscaItem
                              key={projeto.id}
                              type="button"
                              onClick={() => {
                                setProjetoId(projeto.id);
                                setEscoposMarcados([]);
                                // A equipe do projeto é quem apresenta, e por
                                // isso não assiste à própria banca, já
                                // vem marcada para não montar à mão.
                                setConsultorIds(projeto.consultor_ids);
                              }}
                            >
                              <BuscaNome>{projeto.nome}</BuscaNome>
                              <BuscaMeta>{projeto.cliente}</BuscaMeta>
                            </BuscaItem>
                          ))}
                        </BuscaLista>
                      )}
                    </>
                  )}
                </FieldGroup>
              )}

              {(editando ? projetoId != null || resolvendoProjeto : !!projetoEscolhido) && (
                <FieldGroup>
                  <FieldLabelRow>
                    <FieldLabel as="span">Escopos que esta banca cobre</FieldLabel>
                    {!carregandoEscopos && escoposSelecionaveis.length > 0 && (
                      <FieldContador>
                        {escoposMarcados.length} de {escoposSelecionaveis.length} marcados
                      </FieldContador>
                    )}
                  </FieldLabelRow>
                  {carregandoEscopos ? (
                    <EscoposCarregando role="status" aria-label="Carregando escopos" />
                  ) : escoposDoProjeto.length === 0 ? (
                    <EmptyText>Este projeto ainda não tem escopo vendido.</EmptyText>
                  ) : escoposSelecionaveis.length === 0 ? (
                    <EmptyText>Os outros escopos deste projeto já têm banca marcada.</EmptyText>
                  ) : (
                    <CheckboxGrid>
                      {escoposDoProjeto.map((escopo) => (
                        <CheckboxLabel key={escopo.id}>
                          <input
                            type="checkbox"
                            // ⚠ Editando, o escopo que já é DESTA banca aparece
                            // com `escopo.banca` preenchida — desabilitá-lo por
                            // isso travaria justamente o que se veio remover.
                            disabled={!!escopo.banca && !ehDestaBanca(escopo)}
                            checked={escoposMarcados.includes(escopo.id)}
                            onChange={() => alternarEscopo(escopo.id)}
                          />
                          <span>
                            {escopo.nome}
                            {escopo.banca && !ehDestaBanca(escopo) && (
                              <>
                                {" "}
                                <EscopoIndisponivel>
                                  {escopo.banca.data_hora
                                    ? `já tem banca em ${paraDataUtc(escopo.banca.data_hora).toLocaleDateString("pt-BR", { timeZone: FUSO })}`
                                    : "já tem banca, sem data"}
                                </EscopoIndisponivel>
                              </>
                            )}
                          </span>
                        </CheckboxLabel>
                      ))}
                    </CheckboxGrid>
                  )}
                </FieldGroup>
              )}
            </FormSecao>

            <FormSecao>
              <DateTimeRow>
                <FieldGroup>
                  <FieldLabel htmlFor="data-banca">Data</FieldLabel>
                  <FieldInput id="data-banca" type="date" value={data} onChange={(e) => setData(e.target.value)} required />
                </FieldGroup>
                <FieldGroup>
                  <FieldLabel htmlFor="hora-banca">Horário</FieldLabel>
                  <FieldInput id="hora-banca" type="time" value={hora} onChange={(e) => setHora(e.target.value)} required />
                </FieldGroup>
              </DateTimeRow>
            </FormSecao>

            <FormSecao>
              <FieldGroup>
                <FieldLabelRow>
                  <FieldLabel as="span">Consultores do projeto</FieldLabel>
                  {consultorIds.length > 0 && (
                    <FieldContador>{consultorIds.length} marcados</FieldContador>
                  )}
                </FieldLabelRow>
                <ListaMarcavel
                  opcoes={consultores}
                  marcados={(id) => consultorIds.includes(id)}
                  onAlternar={(id) => setConsultorIds((ids) => toggleId(ids, id))}
                  vazio="Nenhum consultor disponível."
                  placeholder="Buscar consultor…"
                  aria-label="Buscar consultor"
                />
              </FieldGroup>

              {editando ? (
                <FieldGroup>
                  <FieldLabelRow>
                    <FieldLabel as="span">Frentes</FieldLabel>
                    {frenteIds.length > 0 && (
                      <FieldContador>{frenteIds.length} marcadas</FieldContador>
                    )}
                  </FieldLabelRow>
                  <CheckboxGrid>
                    {dados.frentes.length === 0 && <EmptyText>Nenhuma frente cadastrada.</EmptyText>}
                    {dados.frentes.map((frente) => (
                      <CheckboxLabel key={frente.id}>
                        <input
                          type="checkbox"
                          checked={frenteIds.includes(frente.id)}
                          onChange={() => setFrenteIds((ids) => toggleId(ids, frente.id))}
                        />
                        <span>{frente.nome}</span>
                      </CheckboxLabel>
                    ))}
                  </CheckboxGrid>
                  <FieldHint>
                    Marcar ou desmarcar um escopo acima já ajusta as frentes que vêm dele.
                  </FieldHint>
                </FieldGroup>
              ) : (
                escoposMarcados.length > 0 && (
                  <FieldGroup>
                    <FieldLabel as="span">Frentes</FieldLabel>
                    <FieldHint>
                      {frentesDosEscoposMarcados.length > 0
                        ? `${frentesDosEscoposMarcados.join(" · ")}, vêm dos escopos escolhidos.`
                        : "Definidas pelos escopos escolhidos."}
                    </FieldHint>
                  </FieldGroup>
                )
              )}

              {ehDiretor && (
                <FieldGroup>
                  <FieldLabel htmlFor="piso-override">Piso mínimo desta banca (opcional)</FieldLabel>
                  <FieldInput
                    id="piso-override"
                    type="number"
                    min={0}
                    value={pisoOverride}
                    onChange={(e) => setPisoOverride(e.target.value)}
                    placeholder="Deixe em branco para usar o padrão da(s) frente(s)"
                  />
                </FieldGroup>
              )}
            </FormSecao>
          </FormModalBody>

          {erro && (
            <FormModalErro role="alert">
              <AlertCircle size={16} aria-hidden="true" />
              {erro}
            </FormModalErro>
          )}

          <FormModalFooter>
            {pendencia && <FormModalPendencia>{pendencia}</FormModalPendencia>}
            <FormModalAcoes>
              <PageButton $variant="outline" type="button" onClick={onClose}>
                Cancelar
              </PageButton>
              <PageButton
                type="submit"
                disabled={enviando || (!editando && escoposMarcados.length === 0)}
              >
                {enviando && <BotaoSpinner aria-hidden="true" />}
                {enviando ? (editando ? "Salvando..." : "Criando...") : editando ? "Salvar" : "Criar"}
              </PageButton>
            </FormModalAcoes>
          </FormModalFooter>
        </FormModalForm>
      </FormModalContent>
    </ModalOverlay>
  );
}
