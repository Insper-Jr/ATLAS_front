import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Paperclip, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { theme } from "@/styles/theme";
import { getFrentes } from "@/lib/bancas";
import { abrirDocumento, getDocumentosDoProjeto } from "@/lib/contratos";
import {
  createProjeto,
  DIAS_REUNIAO,
  listCalendariosParaEscolha,
  uploadAnexoProposta,
} from "@/lib/projetos";
import type { CalendariosDaFrente } from "@/lib/projetos";
import { getUsuarios, podeSerVendedor } from "@/lib/usuarios";
import { getUsuariosFrentes } from "@/lib/usuarios-frentes";
import { getEscopos } from "@/lib/escopos";
import { montarEquipePayload, validarEquipe, type EquipeSelecionada } from "@/components/membros/MemberPicker";
import { EquipeCampo } from "@/components/membros/EquipePainel";
import { CompatibilidadeHorarios } from "@/components/grade/CompatibilidadeHorarios";
import { MultiSelect } from "@/components/MultiSelect";
import {
  EscopoPicker,
  montarEscoposPayload,
  validarEscopos,
  type EscopoEmEdicao,
} from "@/components/escopos/EscopoPicker";
import type { UsuarioFrente, UsuarioResumo } from "@/types/auth";
import type { Escopo, Frente } from "@/types/banca";
import {
  PageButton,
  PageLoadingBlock,
  ErrorBlock,
  ErrorText,
  EmptyText,
  PageStack,
} from "@/styles/page.styled";
import {
  PageHeaderRow,
  PageHeaderText,
  PageHeading,
  FieldGroup,
  FieldLabel,
  Required,
  FieldInput,
  FieldTextarea,
  FieldSelect,
  FormErrorText,
  VoltarLink,
} from "./Projetos.styled";
import {
  AcoesBarra,
  AcoesBotoes,
  AcoesMensagem,
  ArquivoBotao,
  ArquivoLinha,
  ArquivoNome,
  ArquivoRemover,
  CampoAjuda,
  CamposGrade,
  FrenteLista,
  FrenteToggle,
  ModoBotao,
  ModoLista,
  Secao,
  SecaoCabecalho,
  SecaoCorpo,
  SecaoDescricao,
  SecaoLista,
  SecaoNumero,
  SecaoTexto,
  SecaoTitulo,
} from "./ProjetoNovo.styled";

/** Duas ou mais frentes tornam o projeto sinérgico, mesmo critério do
 *  backend em `get_projeto` (`len(frentes) > 1`). Não há teto de frentes. */
const MIN_FRENTES_SINERGICO = 2;

/** Um bloco do formulário: número, título e a frase que explica por que ele
 *  existe. Fora do componente da página para não remontar a cada tecla. */
function BlocoSecao({
  numero,
  titulo,
  descricao,
  children,
}: {
  numero: number;
  titulo: string;
  descricao: string;
  children: React.ReactNode;
}) {
  return (
    <Secao>
      <SecaoCabecalho>
        <SecaoNumero aria-hidden="true">{numero}</SecaoNumero>
        <SecaoTexto>
          <SecaoTitulo>{titulo}</SecaoTitulo>
          <SecaoDescricao>{descricao}</SecaoDescricao>
        </SecaoTexto>
      </SecaoCabecalho>
      <SecaoCorpo>{children}</SecaoCorpo>
    </Secao>
  );
}

/**
 * O cadastro do projeto.
 *
 * Kickoff **não** entra aqui: o projeto nasce Vendido, sem data. Ela é
 * marcada depois, na página do projeto, e é isso que dispara a mudança de
 * status.
 *
 * A **equipe é opcional** (2026-08-13). Antes o formulário exigia coordenador
 * e pelo menos um consultor, e isso invertia a ordem real das coisas: o
 * projeto é vendido antes de o time existir. Quem cadastrava punha nomes de
 * mentira só para conseguir salvar, e esses nomes ficavam no histórico de
 * participação, que as regras de histórico não deixam reescrever. O time entra depois, em
 * Vagas ou na Visão geral, e o mesmo painel lateral de Vagas serve aqui.
 */
export function ProjetoNovo() {
  const { token } = useAuth();
  const navigate = useNavigate();
  // ⭐ 2026-09-23 — esta tela também é aberta pelo fluxo normal (assistente
  // de Novo Contrato → "Projeto de entrega novo") — só é o atalho da
  // diretoria quando chega daquele botão específico em `ProjetosList`.
  const location = useLocation();
  const veioDoAtalho = !!(location.state as { atalho?: boolean } | null)?.atalho;

  const [frentes, setFrentes] = useState<Frente[]>([]);
  const [catalogo, setCatalogo] = useState<Escopo[]>([]);
  // Os calendarios escolhiveis por frente. O escopo declara em qual deles os
  // dias vendidos dele sao contados (§5.4) — e sem isso a janela sai errada.
  const [calendarios, setCalendarios] = useState<CalendariosDaFrente[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioResumo[]>([]);
  const [usuariosFrentes, setUsuariosFrentes] = useState<UsuarioFrente[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroCarga, setErroCarga] = useState("");

  const [nome, setNome] = useState("");
  const [cliente, setCliente] = useState("");
  const [descricao, setDescricao] = useState("");
  const [modoProposta, setModoProposta] = useState<"link" | "anexo">("link");
  const [linkProposta, setLinkProposta] = useState("");
  const [anexoProposta, setAnexoProposta] = useState<File | null>(null);
  const [erroAnexo, setErroAnexo] = useState("");
  const anexoRef = useRef<HTMLInputElement>(null);
  const [frenteIds, setFrenteIds] = useState<number[]>([]);
  // No atalho (2026-10-13, a pedido) os dois são opcionais e começam em
  // branco: em branco o backend usa o padrão (5 e 3) e a Visão geral deixa
  // mudar depois. Serve pra criar um projeto só pra gerar a banca dele.
  const [diasAmbientacao, setDiasAmbientacao] = useState(veioDoAtalho ? "" : "5");
  // 3 é o padrão combinado com o núcleo para o time de consultores.
  const [maxConsultores, setMaxConsultores] = useState(veioDoAtalho ? "" : "3");
  const [diaReuniao, setDiaReuniao] = useState("");
  // A promessa feita ao cliente na venda. Opcional: nem toda venda fecha com
  // data combinada, e exigi-la aqui travaria o cadastro por um dado que às
  // vezes só existe depois do kickoff.
  const [entregaPrevista, setEntregaPrevista] = useState("");
  const [equipe, setEquipe] = useState<EquipeSelecionada>({ coordenadorIds: [], consultorIds: [] });
  // Fora da equipe de propósito: quem vendeu não é do time (ver
  // `projeto_vendedor` no backend). Vazio é o caso normal — vendedor é
  // opcional.
  const [vendedorIds, setVendedorIds] = useState<number[]>([]);
  const [escopos, setEscopos] = useState<EscopoEmEdicao[]>([]);

  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  // Guardado para a tentativa de reenvio do anexo não criar um segundo
  // projeto se o upload falhar depois que o projeto já foi criado.
  const [projetoCriadoId, setProjetoCriadoId] = useState<number | null>(null);

  async function carregar() {
    if (!token) return;
    setCarregando(true);
    setErroCarga("");
    try {
      const [
        frentesResp,
        usuariosResp,
        catalogoResp,
        usuariosFrentesResp,
        calendariosResp,
      ] = await Promise.all([
        getFrentes(token),
        getUsuarios(token),
        getEscopos(token),
        getUsuariosFrentes(token),
        listCalendariosParaEscolha(token),
      ]);
      setFrentes(frentesResp);
      setCalendarios(calendariosResp);
      setCatalogo(catalogoResp.filter((e) => e.ativo));
      setUsuarios(
        usuariosResp.filter((u) => u.ativo).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
      );
      setUsuariosFrentes(usuariosFrentesResp);
    } catch (err) {
      setErroCarga(err instanceof Error ? err.message : "Erro ao carregar o formulário");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function toggleFrente(id: number) {
    setFrenteIds((atual) => {
      if (atual.includes(id)) {
        const novas = atual.filter((x) => x !== id);
        // Desmarcar a frente tem que levar os escopos dela junto, senão o
        // formulário envia um escopo de uma frente que o projeto não tem
        // mais, e o backend recusa com uma mensagem confusa.
        setEscopos((lista) => lista.filter((e) => novas.includes(e.frente_id)));
        return novas;
      }
      return [...atual, id];
    });
  }

  function handleArquivoProposta(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0] ?? null;
    if (arquivo && arquivo.type !== "application/pdf" && !arquivo.name.toLowerCase().endsWith(".pdf")) {
      setErroAnexo("O anexo da proposta precisa ser um PDF.");
      setAnexoProposta(null);
      e.target.value = "";
      return;
    }
    setErroAnexo("");
    setAnexoProposta(arquivo);
  }

  /** Limpar o state não basta: sem zerar o `value` do input, escolher DE NOVO
   *  o mesmo arquivo não dispara `change` e o anexo não volta. */
  function limparAnexo() {
    setAnexoProposta(null);
    setErroAnexo("");
    if (anexoRef.current) anexoRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;

    if (frenteIds.length === 0) {
      setErro("Escolha pelo menos uma frente.");
      return;
    }
    const erroEscopos = validarEscopos(escopos, calendarios);
    if (erroEscopos) {
      setErro(erroEscopos);
      return;
    }
    // Equipe vazia passa, o que ainda é erro é a mesma pessoa nos dois
    // papéis. Ver `validarEquipe`.
    const erroEquipe = validarEquipe(equipe);
    if (erroEquipe) {
      setErro(erroEquipe);
      return;
    }

    setSalvando(true);
    setErro("");
    // Local, não o state: o state só reflete no próximo render, e o catch
    // logo abaixo precisa saber JÁ nesta chamada se a criação passou.
    let projetoId = projetoCriadoId;
    // ⭐ 2026-09-23 — a pedido: atalho da diretoria de projetos — o backend
    // já cria o projeto direto em "Vendido" pra ela (ver
    // `CreateProjetoUseCase`/`direto_para_vendido`). Não faz sentido abrir o
    // Contrato de Prestação depois nesse caso: o projeto já "vendeu" sem
    // ele, então cai direto na Visão Geral em vez do fluxo normal.
    let jaNasceuVendido = false;
    try {
      // Se o projeto já foi criado numa tentativa anterior (e só o upload do
      // anexo falhou), não cria de novo, só reenvia o anexo.
      if (!projetoId) {
        const projeto = await createProjeto(
          {
            nome: nome.trim(),
            cliente: cliente.trim() || null,
            descricao: descricao.trim() || null,
            link_proposta: modoProposta === "link" ? linkProposta.trim() || null : null,
            frente_ids: frenteIds,
            // Em branco vai sem o campo e o backend aplica o padrão. (Antes
            // era `Number(x) || 5`, que também trocava um 0 digitado por 5.)
            dias_ambientacao: diasAmbientacao.trim() === "" ? undefined : Number(diasAmbientacao),
            max_consultores: maxConsultores.trim() === "" ? undefined : Number(maxConsultores),
            equipe: montarEquipePayload(equipe),
            vendedor_ids: vendedorIds,
            dia_reuniao_padrao: diaReuniao ? Number(diaReuniao) : null,
            data_entrega_prevista_cliente: entregaPrevista || null,
            escopos: montarEscoposPayload(escopos),
            atalho_direto_vendido: veioDoAtalho,
          },
          token,
        );
        projetoId = projeto.id;
        setProjetoCriadoId(projeto.id);
        jaNasceuVendido = projeto.status === "vendido";
      }

      if (modoProposta === "anexo" && anexoProposta) {
        await uploadAnexoProposta(projetoId, anexoProposta, token);
      }

      if (jaNasceuVendido) {
        navigate(`/projetos/${projetoId}`, { replace: true });
        return;
      }

      // ⭐ 2026-09-21 — a pedido: todo projeto nasce por um contrato. Criar
      // o projeto já abre o Contrato de Prestação dele na hora, em vez de
      // cair na Visão Geral — fecha o loop "criei o projeto, já tô com o
      // contrato aberto pra preencher".
      //
      // ⚠ Reenvio depois de o anexo falhar numa tentativa anterior já criou
      // o projeto E o documento — `abrirDocumento` recusaria um segundo
      // (só um Contrato de Prestação por projeto). Busca o que já existe em
      // vez de tratar isso como erro.
      let documentoId: number;
      try {
        documentoId = (await abrirDocumento(projetoId, "contrato", token)).id;
      } catch {
        const { documentos } = await getDocumentosDoProjeto(projetoId, token);
        const existente = documentos.find((d) => d.tipo === "contrato");
        if (!existente) throw new Error("Não foi possível abrir o Contrato de Prestação do projeto.");
        documentoId = existente.id;
      }
      navigate(`/contratos/${documentoId}`, { replace: true });
    } catch (err) {
      setErro(
        projetoId
          ? `O projeto foi criado, mas o anexo da proposta falhou: ${err instanceof Error ? err.message : "erro desconhecido"}. Tente enviar de novo.`
          : err instanceof Error
            ? err.message
            : "Erro ao criar o projeto",
      );
    } finally {
      setSalvando(false);
    }
  }

  if (erroCarga) {
    return (
      <ErrorBlock>
        <ErrorText>Não foi possível abrir o formulário: {erroCarga}</ErrorText>
        <PageButton $variant="outline" onClick={carregar}>
          Tentar novamente
        </PageButton>
      </ErrorBlock>
    );
  }

  if (carregando) return <PageLoadingBlock />;

  const sinergico = frenteIds.length >= MIN_FRENTES_SINERGICO;

  return (
    <PageStack>
      <PageHeaderRow>
        <PageHeaderText>
          <VoltarLink to="/projetos">
            <ArrowLeft size={14} />
            Voltar para projetos
          </VoltarLink>
          <PageHeading>Criar projeto</PageHeading>
        </PageHeaderText>
      </PageHeaderRow>

      {/* ⭐ 2026-09-23 — a pedido: avisa que não é o fluxo ideal, só quando
          chegou aqui pelo botão de atalho — pelo fluxo normal (Contratos →
          "Projeto de entrega novo") esta tela é o caminho certo, o aviso
          não se aplica. */}
      {veioDoAtalho && (
        <div
          style={{
            padding: "0.75rem 1rem",
            borderRadius: theme.borderRadius.md,
            background: `color-mix(in srgb, ${theme.colors.warning} 20%, var(--atlas-card))`,
            color: theme.colors.warningForeground,
            fontSize: theme.fontSize.sm,
          }}
        >
          Este é um atalho — o projeto nasce direto como <strong>Vendido</strong>, sem passar pelo
          Contrato de Prestação de Serviços. O fluxo ideal é abrir o contrato pela aba Contratos e
          deixar ele levar o projeto a Vendido quando for assinado; use esta tela só quando isso não
          for viável. Aqui, dias de ambientação e máximo de consultores são opcionais, o kickoff não é
          cobrado (cronograma, banca e etapa ficam liberados sem ele) e a declaração de interesse não
          abre sozinha: abra na Visão geral quando quiser avisar os consultores.
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <SecaoLista>
          <BlocoSecao
            numero={1}
            titulo="O projeto"
            descricao="Como ele vai ser reconhecido na lista, em Vagas e nas notificações."
          >
            <CamposGrade>
              <FieldGroup>
                <FieldLabel htmlFor="projeto-nome">
                  Nome do projeto<Required>*</Required>
                </FieldLabel>
                <FieldInput
                  id="projeto-nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Projeto Alfa"
                  required
                />
              </FieldGroup>

              <FieldGroup>
                <FieldLabel htmlFor="projeto-cliente">Cliente</FieldLabel>
                <FieldInput
                  id="projeto-cliente"
                  value={cliente}
                  onChange={(e) => setCliente(e.target.value)}
                  placeholder="Padaria do Zé"
                />
              </FieldGroup>
            </CamposGrade>

            <FieldGroup>
              <FieldLabel htmlFor="projeto-descricao">Descrição</FieldLabel>
              <FieldTextarea
                id="projeto-descricao"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="O que o cliente contratou."
              />
            </FieldGroup>
          </BlocoSecao>

          <BlocoSecao
            numero={2}
            titulo="Frentes e escopos vendidos"
            descricao="A frente decide quais escopos existem para este projeto e quem aparece na hora de montar o time."
          >
            <FieldGroup>
              <FieldLabel as="span">
                Frente(s)<Required>*</Required>
              </FieldLabel>
              {frentes.length === 0 ? (
                <EmptyText>Nenhuma frente cadastrada.</EmptyText>
              ) : (
                <FrenteLista>
                  {frentes.map((frente) => {
                    const marcada = frenteIds.includes(frente.id);
                    return (
                      <FrenteToggle key={frente.id} $marcada={marcada}>
                        <input
                          type="checkbox"
                          checked={marcada}
                          onChange={() => toggleFrente(frente.id)}
                        />
                        {frente.nome}
                      </FrenteToggle>
                    );
                  })}
                </FrenteLista>
              )}
              {/* Só quando acontece. A instrução ("marque quantas frentes o
                  projeto tiver") saiu junto com as outras descrições de campo;
                  isto aqui não descreve o campo, avisa uma consequência que
                  muda o projeto de categoria, sem teto de frentes,
                  "sinérgico" é ">= 2", o mesmo critério do `get_projeto`. */}
              {sinergico && (
                <CampoAjuda>
                  {frenteIds.length} frentes marcadas: o projeto é sinérgico e aparece para os
                  gerentes de todas elas.
                </CampoAjuda>
              )}
            </FieldGroup>

            <FieldGroup>
              <FieldLabel as="span">
                Escopos vendidos<Required>*</Required>
              </FieldLabel>
              <EscopoPicker
                catalogo={catalogo}
                frentes={frentes}
                frentesMarcadas={frenteIds}
                calendarios={calendarios}
                valor={escopos}
                onChange={setEscopos}
                desabilitado={salvando}
              />
            </FieldGroup>
          </BlocoSecao>

          <BlocoSecao
            numero={3}
            titulo="Prazos e capacidade"
            descricao="Os números que a contagem de dias úteis e a página de Vagas usam."
          >
            <CamposGrade>
              <FieldGroup>
                {/* "dias úteis" volta pro rótulo: sem a frase de apoio embaixo,
                    é a única coisa que diz que 5 não são 5 dias corridos. */}
                <FieldLabel htmlFor="projeto-ambientacao">
                  Dias de ambientação (dias úteis){!veioDoAtalho && <Required>*</Required>}
                </FieldLabel>
                <FieldInput
                  id="projeto-ambientacao"
                  type="number"
                  min={0}
                  max={60}
                  value={diasAmbientacao}
                  onChange={(e) => setDiasAmbientacao(e.target.value)}
                  placeholder={veioDoAtalho ? "5" : undefined}
                  required={!veioDoAtalho}
                />
                {veioDoAtalho && (
                  <CampoAjuda>Opcional no atalho: em branco fica 5 e dá pra mudar depois na Visão geral.</CampoAjuda>
                )}
              </FieldGroup>

              {/* A data combinada com o cliente, registrada já na venda,
                  é aqui que ela é conhecida. Sem obrigatoriedade: nem toda
                  venda fecha com data, e travar o cadastro por isso empurraria
                  quem cria a inventar um valor. */}
              <FieldGroup>
                <FieldLabel htmlFor="projeto-entrega-prevista">Entrega prevista ao cliente</FieldLabel>
                <FieldInput
                  id="projeto-entrega-prevista"
                  type="date"
                  value={entregaPrevista}
                  onChange={(e) => setEntregaPrevista(e.target.value)}
                />
              </FieldGroup>
            </CamposGrade>

            <CamposGrade>
              <FieldGroup>
                <FieldLabel htmlFor="projeto-max-consultores">
                  Máximo de consultores{!veioDoAtalho && <Required>*</Required>}
                </FieldLabel>
                <FieldInput
                  id="projeto-max-consultores"
                  type="number"
                  min={1}
                  max={10}
                  value={maxConsultores}
                  onChange={(e) => setMaxConsultores(e.target.value)}
                  placeholder={veioDoAtalho ? "3" : undefined}
                  required={!veioDoAtalho}
                />
                {veioDoAtalho && (
                  <CampoAjuda>Opcional no atalho: em branco fica 3 e dá pra mudar depois na Visão geral.</CampoAjuda>
                )}
              </FieldGroup>

              <FieldGroup>
                <FieldLabel htmlFor="projeto-dia-reuniao">Dia padrão da reunião semanal</FieldLabel>
                <FieldSelect
                  id="projeto-dia-reuniao"
                  value={diaReuniao}
                  onChange={(e) => setDiaReuniao(e.target.value)}
                >
                  <option value="">Sem dia definido</option>
                  {DIAS_REUNIAO.map((dia) => (
                    <option key={dia.valor} value={dia.valor}>
                      {dia.rotulo}
                    </option>
                  ))}
                </FieldSelect>
              </FieldGroup>
            </CamposGrade>
          </BlocoSecao>

          <BlocoSecao
            numero={4}
            titulo="Equipe"
            descricao="Opcional. O projeto pode nascer sem time e ser preenchido depois, em Vagas. Não é preciso inventar nomes agora."
          >
            <EquipeCampo
              usuarios={usuarios}
              usuariosFrentes={usuariosFrentes}
              frentes={frentes}
              frenteIdsProjeto={frenteIds}
              maxConsultores={Number(maxConsultores) || undefined}
              valor={equipe}
              onChange={setEquipe}
              desabilitado={salvando}
            />

            {/* Logo abaixo da escolha: serve para rever o time ANTES de
                fechar, não para descobrir o problema depois. Some sozinho com
                menos de 2 consultores, a comparação é entre pessoas, e o
                próprio componente já devolve `null` nesse caso. */}
            <CompatibilidadeHorarios consultorIds={equipe.consultorIds} usuarios={usuarios} />

            <FieldGroup>
              <FieldLabel htmlFor="vendedores">Quem vendeu o projeto</FieldLabel>
              <MultiSelect
                valores={vendedorIds.map(String)}
                onChange={(ids) => setVendedorIds(ids.map(Number))}
                opcoes={usuarios
                  .filter((u) => u.ativo && (podeSerVendedor(u) || vendedorIds.includes(u.id)))
                  .map((u) => ({ value: String(u.id), label: u.nome }))}
                rotuloVazio="Ninguém marcado"
                resumo={(n) => `${n} vendedores`}
                aria-label="Quem vendeu o projeto"
                pesquisavel
              />
              <EmptyText style={{ fontSize: "0.7rem" }}>
                Quem vendeu enxerga o projeto em modo somente leitura, mesmo sem estar
                na equipe, e pode avaliar a banca deste projeto.
              </EmptyText>
            </FieldGroup>
          </BlocoSecao>

          <BlocoSecao
            numero={5}
            titulo="Proposta"
            descricao="O documento fechado com o cliente: um link ou o PDF."
          >
            <FieldGroup>
              <ModoLista role="group" aria-label="Formato da proposta">
                <ModoBotao
                  type="button"
                  $ativo={modoProposta === "link"}
                  aria-pressed={modoProposta === "link"}
                  onClick={() => {
                    setModoProposta("link");
                    limparAnexo();
                  }}
                >
                  Link
                </ModoBotao>
                <ModoBotao
                  type="button"
                  $ativo={modoProposta === "anexo"}
                  aria-pressed={modoProposta === "anexo"}
                  onClick={() => {
                    setModoProposta("anexo");
                    setLinkProposta("");
                  }}
                >
                  Anexar PDF
                </ModoBotao>
              </ModoLista>

              {modoProposta === "link" ? (
                <>
                  <FieldLabel htmlFor="projeto-proposta">Link da proposta</FieldLabel>
                  <FieldInput
                    id="projeto-proposta"
                    type="url"
                    value={linkProposta}
                    onChange={(e) => setLinkProposta(e.target.value)}
                    placeholder="https://…"
                  />
                </>
              ) : (
                <>
                  <ArquivoLinha>
                    <ArquivoBotao htmlFor="projeto-proposta-anexo">
                      <Paperclip size={14} aria-hidden="true" />
                      {anexoProposta ? "Trocar PDF" : "Escolher PDF"}
                      <input
                        ref={anexoRef}
                        id="projeto-proposta-anexo"
                        type="file"
                        accept="application/pdf,.pdf"
                        aria-label="Arquivo da proposta, em PDF"
                        onChange={handleArquivoProposta}
                      />
                    </ArquivoBotao>
                    <ArquivoNome $vazio={!anexoProposta}>
                      {anexoProposta ? anexoProposta.name : "Nenhum PDF escolhido"}
                    </ArquivoNome>
                    {anexoProposta && (
                      <ArquivoRemover
                        type="button"
                        aria-label={`Remover ${anexoProposta.name}`}
                        onClick={limparAnexo}
                      >
                        <X size={16} />
                      </ArquivoRemover>
                    )}
                  </ArquivoLinha>
                  {erroAnexo && <FormErrorText>{erroAnexo}</FormErrorText>}
                </>
              )}
            </FieldGroup>
          </BlocoSecao>

          <AcoesBarra>
            <AcoesMensagem $erro={!!erro} role={erro ? "alert" : undefined}>
              {erro || "Nome, frentes e escopos são o mínimo para criar."}
            </AcoesMensagem>
            <AcoesBotoes>
              <PageButton type="button" $variant="outline" onClick={() => navigate("/projetos")}>
                Cancelar
              </PageButton>
              <PageButton type="submit" disabled={salvando}>
                {salvando ? "Criando…" : "Criar projeto"}
              </PageButton>
            </AcoesBotoes>
          </AcoesBarra>
        </SecaoLista>
      </form>
    </PageStack>
  );
}
