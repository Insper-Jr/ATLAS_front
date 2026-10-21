import { apiFetch } from "@/lib/api";
import type {
  AprovacaoDaBanca,
  AprovacaoDiretoria,
  AprovacaoGerente,
  AvaliadorDaBanca,
  Banca,
  BancaDetalhes,
  ComposicaoDaFrente,
  BancaFrente,
  BancaParaAvaliar,
  Candidatura,
  EquipeProjeto,
  Escopo,
  EscopoVendidoResumo,
  Frente,
  ResultadoBanca,
  StatusBanca,
} from "@/types/banca";
import { camposDeBrasilia } from "@/lib/fuso";

/**
 * ⭐ A única saída manual que resta (2026-09-04, a pedido). Não existe mais
 * "Registrar realização": `data_hora` passar sozinho já marca a banca como
 * realizada e dispara a avaliação de banca e a de desempenho de finalização
 * (rotina automática do backend). Cancelar é o único jeito de tirar uma
 * banca desse trilho — reservado a gerência e diretoria de projetos
 * (`require_gestao`), e só antes de a banca acontecer.
 */
export function cancelarBanca(bancaId: number, token: string) {
  return apiFetch<{ id: number; cancelada_em: string }>(`/bancas/${bancaId}/cancelar`, {
    aviso: "Banca cancelada", method: "POST",
    token,
  });
}

/**
 * ⭐ Aprova ou reprova a banca (§5.5, §8) — diretoria de projetos e gerente
 * da(s) frente(s) da banca, não mais o voto dos avaliadores.
 *
 * O papel de quem está chamando (diretoria, ou gerente de qual frente) é
 * resolvido pelo BACKEND a partir do usuário logado — não é escolhido aqui.
 * Os dois precisam aprovar para fechar "aprovada"; uma reprovação de
 * qualquer um dos dois já fecha "não aprovada" na hora.
 */
export function registrarAprovacaoBanca(
  bancaId: number,
  aprovado: boolean,
  nota: string | null,
  token: string,
) {
  // ⭐ Devolve a situação inteira (resultado + as duas assinaturas) para a
  // tela atualizar o card na hora, sem precisar recarregar tudo de novo.
  return apiFetch<{ banca_id: number } & AprovacaoDaBanca>(`/bancas/${bancaId}/aprovacao`, {
    aviso: "Resultado da banca registrado", method: "POST",
    token,
    body: JSON.stringify({ aprovado, nota }),
  });
}

/** Uma banca realizada esperando diretoria + gerente da frente decidirem. */
export interface BancaEsperandoAprovacao {
  banca_id: number;
  projeto_id: number | null;
  projeto_nome: string;
  escopos: string[];
  realizado_em: string;
  resultado: ResultadoBanca | null;
  aprovacao_diretoria: AprovacaoDiretoria | null;
  aprovacao_gerente: AprovacaoGerente[];
}

/**
 * A fila "Esperando aprovação" da aba Bancas — diretoria vê tudo, gerente só
 * as bancas com frente dele (§3).
 */
export function getBancasEsperandoAprovacao(token: string) {
  return apiFetch<BancaEsperandoAprovacao[]>("/bancas/esperando-aprovacao", { token });
}

/**
 * ⭐ Quem PODE aprovar esta banca, em texto pronto para a tela — diretoria de
 * projetos e o gerente de cada frente, qualquer um decide sozinho (§5.5, §8).
 * Só faz sentido para uma banca ainda sem `resultado`; use `quemDecidiu` para
 * a que já foi fechada.
 */
export function quemPodeAprovar(situacao: { aprovacao_gerente: AprovacaoGerente[] }): string {
  const opcoes = ["diretoria de projetos"];
  for (const g of situacao.aprovacao_gerente) {
    opcoes.push(
      g.possiveis_gerentes.length > 0
        ? `gerente de ${g.frente_nome} (${g.possiveis_gerentes.join(" ou ")})`
        : `gerente de ${g.frente_nome} (nenhum cadastrado ainda)`,
    );
  }
  return opcoes.join(", ");
}

/**
 * Quem de fato decidiu uma banca já fechada — `null` enquanto ela ainda
 * espera. Só um dos registros (diretoria ou algum gerente) tem `aprovado`
 * preenchido: é o primeiro que decidiu, e foi ele quem fechou o resultado.
 */
export function quemDecidiu(situacao: {
  aprovacao_diretoria: AprovacaoDiretoria | null;
  aprovacao_gerente: AprovacaoGerente[];
}): { nome: string; papel: string } | null {
  if (situacao.aprovacao_diretoria?.aprovado != null) {
    return {
      nome: situacao.aprovacao_diretoria.usuario_nome ?? "diretoria",
      papel: "diretoria de projetos",
    };
  }
  const gerente = situacao.aprovacao_gerente.find((g) => g.aprovado != null);
  if (gerente) {
    return { nome: gerente.usuario_nome ?? "gerente", papel: `gerente de ${gerente.frente_nome}` };
  }
  return null;
}


/**
 * O relato do coordenador do projeto sobre a banca, ele não é avaliador
 * dela (ver "ninguém avalia o próprio grupo"), então isto substitui o
 * formulário de avaliação/notas pra ele, não se soma a ele. Só aceito depois
 * de `realizado_em` e só pelo próprio `banca.coordenador_id` (o backend
 * confere os dois).
 */
export function registrarDescricaoCoordenador(bancaId: number, descricao: string, token: string) {
  return apiFetch(`/bancas/${bancaId}/descricao-coordenador`, {
    aviso: "Relato salvo", method: "PATCH",
    token,
    body: JSON.stringify({ descricao }),
  });
}

/**
 * A escalação automática do uma semana antes, preenche as bancas que ainda
 * estão sem gente, por rodízio e priorizando a mesma frente.
 */
export interface ResultadoPush {
  banca_id: number;
  nome_projeto: string;
  alocados_antes: number;
  alocados_depois: number;
  usuarios_alocados: number[];
}

export function pushAlocacao(token: string) {
  return apiFetch<ResultadoPush[]>("/bancas/push-alocacao", { method: "POST", token });
}

/**
 * Aloca OUTRA pessoa numa banca. Só a diretoria, escalar alguém mexe na
 * agenda dele sem que tenha pedido.
 */
export function alocarUsuario(bancaId: number, usuarioId: number, token: string) {
  return apiFetch("/candidaturas", {
    aviso: "Pessoa alocada na banca", method: "POST",
    token,
    body: JSON.stringify({ banca_id: bancaId, usuario_id: usuarioId }),
  });
}

export function getBancas(token: string) {
  return apiFetch<Banca[]>("/bancas", { token });
}

export interface CargaBancaDeUsuario {
  usuario_id: number;
  nome: string;
  posicao: string;
  quantidade_bancas: number;
}

export type FiltroCargaBancas = "todas" | "realizadas" | "futuras";

/** Mesmo dado que o push automático usa pra rodízio (contagem de bancas por
 *  pessoa), exposto pra diretoria/gerência conferirem quem está sobrecarregado
 *  — `pode_ver_dashboard_bancas` no backend. Já vem ordenado, carga maior
 *  primeiro. `filtro` recorta por já realizadas / só futuras / as duas
 *  somadas (default) — o push sempre usa "todas", mas quem está CONFERINDO
 *  carga às vezes quer separar quem já avaliou de quem ainda vai. */
export function getCargaBancas(token: string, filtro: FiltroCargaBancas = "todas") {
  return apiFetch<CargaBancaDeUsuario[]>(`/bancas/carga-por-usuario?filtro=${filtro}`, { token });
}

/**
 * Uma banca só, com os ids CRUS — o que o formulário de edição precisa.
 *
 * Não confundir com `getBancaDetalhes` ao lado, que devolve nomes já
 * resolvidos e serve a quem só vai LER a ficha. Editar exige `escopo_id`,
 * `piso_minimo_override` e companhia, que a ficha não carrega.
 */
export function getBanca(bancaId: number, token: string) {
  return apiFetch<Banca>(`/bancas/${bancaId}`, { token });
}

/**
 * A ficha da banca com os NOMES já resolvidos, uma chamada só.
 *
 * Não confundir com `getBancas()` + os cruzamentos de `lib/nucleo.ts`, que é
 * como a tela `/bancas` monta a mesma informação. Lá o custo já foi pago (ela
 * carrega usuários, frentes, candidaturas e equipes para desenhar os cards);
 * em qualquer outra tela, puxar cinco listagens inteiras para escrever sete
 * linhas seria caro à toa. E o backend resolve `membros` melhor: ele conhece a
 * equipe REAL do projeto, não só a tabela legada `equipe_projeto`, que fica
 * vazia em toda banca marcada pelo cronograma.
 */
export function getBancaDetalhes(bancaId: number, token: string) {
  return apiFetch<BancaDetalhes>(`/bancas/${bancaId}/detalhes`, { token });
}

// ---------------------------------------------------------------- local e entrega

/** Só quem é do projeto avaliado, e só até 1h antes da banca. Texto livre. */
/** Abre ou fecha a avaliação da banca na mão; `null` volta ao prazo automático. */
export function definirPrazoAvaliacaoBanca(
  bancaId: number,
  override: "aberto" | "fechado" | null,
  token: string,
) {
  return apiFetch<{
    id: number;
    prazo_avaliacao_override: "aberto" | "fechado" | null;
    prazo_avaliacao: string | null;
    avaliacao_aberta: boolean;
  }>(`/bancas/${bancaId}/prazo-avaliacao`, {
    aviso: "Prazo de avaliação atualizado", method: "PUT",
    token,
    body: JSON.stringify({ override }),
  });
}

export function registrarLocalBanca(bancaId: number, local: string, token: string) {
  return apiFetch<{ id: number; local: string }>(`/bancas/${bancaId}/local`, {
    aviso: "Local da banca salvo", method: "PUT",
    token,
    body: JSON.stringify({ local }),
  });
}

/** Entrega por link. ⭐ 2026-09-22 — a pedido: era link OU arquivo (upload),
 *  arquivo foi removido. */
export function registrarEntregaLinkBanca(bancaId: number, link: string, token: string) {
  return apiFetch<{ id: number; entrega_link: string | null }>(`/bancas/${bancaId}/entrega-link`, {
    aviso: "Link da entrega salvo", method: "PUT",
    token,
    body: JSON.stringify({ link }),
  });
}

export function removerEntregaBanca(bancaId: number, token: string) {
  return apiFetch<null>(`/bancas/${bancaId}/entrega`, { aviso: "Entrega removida", method: "DELETE", token });
}

export function getCandidaturas(token: string) {
  return apiFetch<Candidatura[]>("/candidaturas", { token });
}

/** As avaliações pendentes de TODO MUNDO (quem tem `pode_definir_cronograma`):
 *  é o que diz, por banca, quem ainda não enviou o formulário. */
export function getAvaliacoesPendentes(token: string) {
  return apiFetch<BancaParaAvaliar[]>("/avaliacoes-pendentes", { token });
}

export function getBancasParaAvaliar(usuarioId: number, token: string) {
  return apiFetch<BancaParaAvaliar[]>(`/usuarios/${usuarioId}/bancas-para-avaliar`, { token });
}

export function alocar(bancaId: number, token: string) {
  return apiFetch<Candidatura>("/candidaturas", {
    aviso: "Você entrou na banca", method: "POST",
    token,
    body: JSON.stringify({ banca_id: bancaId }),
  });
}

/** Serve pra própria pessoa sair e pra quem gere membros tirar alguém; o
 *  aviso de sucesso muda conforme o caso. */
export function desalocar(candidaturaId: number, token: string, aviso = "Você saiu da banca") {
  return apiFetch("/candidaturas/" + candidaturaId, { method: "DELETE", token, aviso });
}

export function getEscopos(token: string) {
  return apiFetch<Escopo[]>("/escopos", { token });
}

export function getEscoposVendidos(token: string) {
  return apiFetch<EscopoVendidoResumo[]>("/escopos-projeto", { token });
}

export function getFrentes(token: string) {
  return apiFetch<Frente[]>("/frentes", { token });
}

export function getBancasFrentes(token: string) {
  return apiFetch<BancaFrente[]>("/bancas-frentes", { token });
}

export function getEquipesProjeto(token: string) {
  return apiFetch<EquipeProjeto[]>("/equipes-projeto", { token });
}

export interface CreateBancaPayload {
  nome_projeto: string;
  escopo_id: number;
  data_hora: string;
  consultor_ids: number[];
  frente_ids: number[];
  /** Só a diretoria manda isto, ver `require_diretor` no backend. */
  piso_minimo_override?: number | null;
}

export interface UpdateBancaPayload {
  nome_projeto?: string;
  /** O escopo do CATÁLOGO — um rótulo da banca. Não confundir com o campo
   *  abaixo, que é o vínculo com os escopos vendidos do projeto.
   *
   *  `null` é válido: escopo vendido "Outro" não tem item de catálogo, e a
   *  coluna é nullable justamente por isso. */
  escopo_id?: number | null;
  data_hora?: string;
  piso_minimo_override?: number | null;
  /**
   * ⭐ Os escopos vendidos que a banca cobre. A lista SUBSTITUI a atual: o que
   * não vier é removido, e o backend recalcula as frentes da banca a partir do
   * que sobrou. Omitir o campo é "não mexer".
   */
  projeto_escopo_ids?: number[];
}

export function createBanca(dados: CreateBancaPayload, token: string) {
  return apiFetch<Banca>("/bancas", {
    aviso: "Banca marcada", method: "POST",
    token,
    body: JSON.stringify(dados),
  });
}

export function updateBanca(bancaId: number, dados: UpdateBancaPayload, token: string) {
  return apiFetch<Banca>(`/bancas/${bancaId}`, {
    aviso: "Banca atualizada", method: "PATCH",
    token,
    body: JSON.stringify(dados),
  });
}

export function deleteBanca(bancaId: number, token: string) {
  return apiFetch(`/bancas/${bancaId}`, { aviso: "Banca excluída", method: "DELETE", token });
}

function createEquipeProjeto(dados: { banca_id: number; usuario_id: number }, token: string) {
  return apiFetch<EquipeProjeto>("/equipes-projeto", {
    method: "POST",
    token,
    body: JSON.stringify(dados),
  });
}

function deleteEquipeProjeto(equipeId: number, token: string) {
  return apiFetch(`/equipes-projeto/${equipeId}`, { method: "DELETE", token });
}

function createBancaFrente(dados: { banca_id: number; frente_id: number }, token: string) {
  return apiFetch<BancaFrente>("/bancas-frentes", {
    method: "POST",
    token,
    body: JSON.stringify(dados),
  });
}

function deleteBancaFrente(bancaFrenteId: number, token: string) {
  return apiFetch(`/bancas-frentes/${bancaFrenteId}`, { method: "DELETE", token });
}

export async function syncEquipeProjeto(
  bancaId: number,
  consultorIds: number[],
  equipesProjeto: EquipeProjeto[],
  token: string,
) {
  const atuais = equipesProjeto.filter((e) => e.banca_id === bancaId);
  const desejados = new Set(consultorIds);
  const atuaisIds = new Set(atuais.map((e) => e.usuario_id));

  await Promise.all(
    atuais.filter((e) => !desejados.has(e.usuario_id)).map((e) => deleteEquipeProjeto(e.id, token)),
  );

  await Promise.all(
    consultorIds.filter((id) => !atuaisIds.has(id)).map((usuarioId) => createEquipeProjeto({ banca_id: bancaId, usuario_id: usuarioId }, token)),
  );
}

export async function syncBancaFrentes(
  bancaId: number,
  frenteIds: number[],
  bancasFrentes: BancaFrente[],
  token: string,
) {
  const atuais = bancasFrentes.filter((bf) => bf.banca_id === bancaId);
  const desejados = new Set(frenteIds);
  const atuaisIds = new Set(atuais.map((bf) => bf.frente_id));

  await Promise.all(
    atuais.filter((bf) => !desejados.has(bf.frente_id)).map((bf) => deleteBancaFrente(bf.id, token)),
  );

  await Promise.all(
    frenteIds.filter((id) => !atuaisIds.has(id)).map((frenteId) => createBancaFrente({ banca_id: bancaId, frente_id: frenteId }, token)),
  );
}

/** O que falta em UMA frente para a banca fechar a composição exigida. */
export interface FaltaDaFrente {
  frente_nome: string;
  membros: number;
  lideranca: number;
}

/**
 * O que falta nesta banca, frente a frente — derivado de `banca.composicao`,
 * que o backend já entrega contado.
 *
 * ⚠ Nada de regra aqui, só subtração. Quem decide quem conta como membro e
 * quem cobre a liderança é `utils/composicao_banca.py` no backend (a cota de
 * liderança é vaga a mais, a equipe do projeto não conta, o diretor cobre
 * qualquer frente); refazer essa conta no front era exatamente o jeito de as
 * duas telas passarem a discordar.
 *
 * ⚠ Aceita `undefined` de propósito: front e back sobem separados (Vercel e
 * Railway), e a tela nova contra a API antiga receberia banca sem o campo. Um
 * `.map` em `undefined` derruba a lista de bancas inteira.
 */
export function faltasDaComposicao(
  composicao: ComposicaoDaFrente[] | undefined,
): FaltaDaFrente[] {
  return (composicao ?? [])
    .map((c) => ({
      frente_nome: c.frente_nome,
      membros: Math.max(0, c.min_membros - c.membros),
      lideranca: Math.max(0, c.min_lideranca - c.liderancas),
    }))
    .filter((f) => f.membros > 0 || f.lideranca > 0);
}

/** Quantas pessoas faltam ao todo — a soma do que `faltasDaComposicao` achou. */
export function totalFaltando(composicao: ComposicaoDaFrente[] | undefined): number {
  return faltasDaComposicao(composicao).reduce((s, f) => s + f.membros + f.lideranca, 0);
}

/** "2 de Business · 1 liderança de Direito" — o que falta, em uma frase. */
export function resumoDoQueFalta(composicao: ComposicaoDaFrente[] | undefined): string {
  return faltasDaComposicao(composicao)
    .map((f) => {
      const partes = [];
      if (f.membros > 0) partes.push(`${f.membros} de ${f.frente_nome}`);
      if (f.lideranca > 0) partes.push(`${f.lideranca} liderança de ${f.frente_nome}`);
      return partes.join(" · ");
    })
    .join(" · ");
}

/* ------------------------------------------------------------------ */
/* Agrupamento dos avaliadores na ficha da banca                       */
/* ------------------------------------------------------------------ */

export interface CotaDoGrupo {
  atual: number;
  /** O piso DAQUELA frente — quem completa acima disso pode ser de qualquer
   *  frente, então não existe "máximo por grupo". */
  min: number;
  faltando: number;
}

export interface GrupoDeAvaliadores {
  chave: string;
  rotulo: string;
  categoria: "lideranca" | "membro";
  /** `null` no bloco "Outras frentes". */
  frente_id: number | null;
  avaliadores: (AvaliadorDaBanca & {
    /** ⭐ Esta pessoa é liderança da frente, sobra além do `min_lideranca`,
     *  E está cobrindo um buraco real no piso de MEMBRO daquela frente
     *  (2026-09-07: só entra na lista de membro quando falta membro de
     *  verdade — ver `ComposicaoBancaChecker.contar` no backend). Aparece
     *  no grupo "membro" com essa marca, e continua listada inteira no
     *  grupo "lideranca" da mesma frente. */
    cobrindoPiso?: boolean;
  })[];
  /** Só nas frentes da banca (o bloco "Outras frentes" não tem piso). */
  cota: CotaDoGrupo | null;
}

/**
 * Os avaliadores escalados separados por (liderança | membro) × frente da
 * banca, com o bloco "Outras frentes" para quem avalia sem ser de nenhuma
 * delas. É o que deixa a ficha mostrar o que ainda falta para o piso.
 *
 * ⚠ A CATEGORIA (`eh_lideranca`) e as FRENTES de cada pessoa vêm do backend
 * já resolvidas — refazer isso aqui era o jeito de a ficha divergir da
 * contagem. O piso (`min_membros`/`min_lideranca`) vem de `composicao`, a
 * mesma que a tela de alocação usa. O teto é da banca INTEIRA (`vagas`), não
 * de cada frente — completar acima do piso é "tanto faz a frente".
 *
 * O rótulo sempre traz o nome da frente ("Lideranças · Business"), inclusive
 * na banca de uma frente só (2026-09-07): reforça de qual frente é a cota
 * que está faltando. Alguém vinculado a duas frentes da banca aparece nos
 * dois blocos — está cobrindo as duas.
 *
 * ⚠ Coordenador de vendas e TODA a diretoria são "liderança SEM frente"
 * (`a.lideranca_sem_frente`): o backend não os conta no piso de liderança de
 * nenhuma frente, então caem sempre no bloco "Lideranças · outras frentes",
 * mesmo vinculados a uma frente da banca.
 */
export function agruparAvaliadores(
  avaliadores: AvaliadorDaBanca[],
  frentesDaBanca: { id: number; nome: string }[],
  composicao: ComposicaoDaFrente[] | undefined,
): GrupoDeAvaliadores[] {
  const comp = new Map((composicao ?? []).map((c) => [c.frente_id, c]));
  const idsDaBanca = new Set(frentesDaBanca.map((f) => f.id));
  const grupos: GrupoDeAvaliadores[] = [];

  const cotaDe = (
    c: ComposicaoDaFrente | undefined,
    categoria: "lideranca" | "membro",
  ): CotaDoGrupo | null => {
    if (!c) return null;
    const atual = categoria === "lideranca" ? c.liderancas : c.membros;
    const min = categoria === "lideranca" ? c.min_lideranca : c.min_membros;
    return { atual, min, faltando: Math.max(0, min - atual) };
  };

  for (const f of frentesDaBanca) {
    const c = comp.get(f.id);
    const presentesDaFrente = avaliadores.filter(
      (a) => !a.lideranca_sem_frente && a.frente_ids.includes(f.id),
    );
    // ⭐ Espelha `ComposicaoBancaChecker.contar` (backend): a liderança que
    // sobra além do `min_lideranca` só entra na lista de "Membros" — e no
    // número — até o tanto que FALTA de membro na frente (2026-09-07). Se os
    // não-líderes já batem o `min_membros`, o líder excedente aparece só em
    // "Lideranças". A escolha de QUEM é "o excedente que cobre" é arbitrária
    // pro backend (ele só soma); aqui é por nome, pra ser estável entre loads.
    const naoLideres = presentesDaFrente.filter((a) => !a.eh_lideranca);
    const lideresDaFrente = presentesDaFrente
      .filter((a) => a.eh_lideranca)
      .sort((x, y) => x.nome.localeCompare(y.nome, "pt-BR"));
    const minLid = c?.min_lideranca ?? 0;
    const excedentes = Math.max(0, lideresDaFrente.length - minLid);
    const buracoDeMembro = Math.max(0, (c?.min_membros ?? 0) - naoLideres.length);
    const qtdCobrindo = Math.min(excedentes, buracoDeMembro);
    const lideresCobrindo = lideresDaFrente.slice(minLid, minLid + qtdCobrindo);

    for (const categoria of ["lideranca", "membro"] as const) {
      grupos.push({
        chave: `${categoria}-${f.id}`,
        // ⭐ Sempre com o nome da frente, mesmo na banca de uma frente só
        // (2026-09-07, a pedido): reforça DE QUAL frente é a cota que
        // falta, igual já aparece nos sinérgicos.
        rotulo: `${categoria === "lideranca" ? "Lideranças" : "Membros"} · ${f.nome}`,
        categoria,
        frente_id: f.id,
        avaliadores:
          categoria === "membro"
            ? [...naoLideres, ...lideresCobrindo.map((a) => ({ ...a, cobrindoPiso: true }))]
            : lideresDaFrente,
        cota: cotaDe(c, categoria),
      });
    }
  }

  const forasDaBanca = (a: AvaliadorDaBanca) =>
    a.lideranca_sem_frente || !a.frente_ids.some((id) => idsDaBanca.has(id));
  for (const categoria of ["lideranca", "membro"] as const) {
    const lista = avaliadores.filter(
      (a) => a.eh_lideranca === (categoria === "lideranca") && forasDaBanca(a),
    );
    if (lista.length === 0) continue;
    grupos.push({
      chave: `${categoria}-outras`,
      rotulo:
        (categoria === "lideranca" ? "Lideranças" : "Membros") +
        (frentesDaBanca.length === 0 ? "" : " · outras frentes"),
      categoria,
      frente_id: null,
      avaliadores: lista,
      cota: null,
    });
  }

  // Blocos sem ninguém E sem cota não dizem nada — sai. Os com cota ficam
  // (é o "0/1 liderança, falta 1" que a pessoa que escala precisa ver).
  return grupos.filter((g) => g.avaliadores.length > 0 || g.cota !== null);
}

/**
 * Espelho de `utils/banca_status.py::aceita_inscricao`.
 *
 * Uma banca `atrasada` (venceu e não aconteceu) **continua aceitando gente** —
 * ela ainda vai acontecer. Quem fecha a inscrição é a realização, não o
 * calendário. O backend revalida.
 */
export function aceitaInscricao(status: StatusBanca): boolean {
  return status === "aberta" || status === "atrasada";
}

export const ROTULO_STATUS_BANCA: Record<StatusBanca, string> = {
  nao_marcada: "Não marcada",
  aberta: "Aberta para inscrições",
  realizada: "Realizada",
  atrasada: "Atrasada",
  cancelada: "Cancelada",
};

/** Vermelho só para `atrasada`, é o estado que precisa gritar na tela.
 *  `cancelada` fica em `muted`, igual `nao_marcada`: não é um problema
 *  pendente (como `atrasada`), é uma decisão já tomada — não sobrou nada
 *  para fazer nela. */
export function tomDoStatusBanca(status: StatusBanca): "default" | "success" | "muted" | "danger" {
  if (status === "atrasada") return "danger";
  if (status === "realizada") return "success";
  if (status === "nao_marcada" || status === "cancelada") return "muted";
  return "default";
}

export function podeGerenciarBanca(
  banca: Banca,
  usuarioId: number,
  ehDiretor = false,
): boolean {
  // Banca atrasada continua gerenciável: é justamente quando o coordenador
  // precisa entrar para marcar que ela aconteceu (ou remarcar).
  //
  // ⭐ A diretoria também. A banca nasce com o coordenador do PROJETO como
  // dono, mesmo quando quem a criou foi a diretoria pela tela de Bancas — e
  // então quem acabara de criá-la não via Editar nem Excluir no próprio card.
  // O backend sempre permitiu (`require_pode_definir_cronograma` + acesso ao
  // projeto); era só a tela que escondia.
  return (
    (banca.coordenador_id === usuarioId || ehDiretor) && aceitaInscricao(banca.status)
  );
}

/** Dia da banca em Brasília, pro `<input type="date">` da edição. */
export function toDateInputValue(iso: string): string {
  return camposDeBrasilia(iso).dia;
}

/** Hora da banca em Brasília, pro `<input type="time">` da edição. */
export function toTimeInputValue(iso: string): string {
  return camposDeBrasilia(iso).hora;
}

/**
 * ⭐ Pedir para marcar a banca num horário já ocupado (§8).
 *
 * ⚠ **O caminho que faltava.** O backend bloqueia duas bancas no mesmo horário
 * e anuncia que a exceção é da diretoria — mas até aqui nenhuma tela sabia como
 * pedi-la. Quem esbarrava no choque lia a regra e não tinha o que fazer.
 */
export function solicitarExcecaoChoque(
  dados: { projeto_escopo_id: number; data_hora_pretendida: string; justificativa: string },
  token: string,
) {
  return apiFetch<{ id: number; status: string }>("/bancas/excecoes-choque", {
    aviso: "Pedido de exceção enviado", method: "POST",
    token,
    body: JSON.stringify(dados),
  });
}

/** Um pedido de exceção esperando a diretoria. */
export interface ExcecaoChoquePendente {
  id: number;
  projeto_id: number | null;
  projeto_nome: string;
  projeto_escopo_id: number;
  data_hora_pretendida: string;
  /** Com QUEM está chocando — o contexto sem o qual a decisão é no escuro. */
  conflita_com: string;
  justificativa: string;
  solicitado_por: number;
  solicitado_por_nome: string | null;
  criado_em: string;
}

export function getExcecoesChoquePendentes(token: string) {
  return apiFetch<ExcecaoChoquePendente[]>("/bancas/excecoes-choque/pendentes", { token });
}

/** A decisão da diretoria — `resposta` é obrigatória nos dois sentidos. */
export function decidirExcecaoChoque(
  pedidoId: number,
  dados: { aprovar: boolean; resposta: string },
  token: string,
) {
  return apiFetch(`/bancas/excecoes-choque/${pedidoId}`, {
    aviso: "Decisão registrada", method: "PATCH",
    token,
    body: JSON.stringify(dados),
  });
}

/**
 * ⭐ Pedir autorização para marcar a banca fora da janela do escopo (§13).
 *
 * ⚠ **O caminho que faltava.** Marcar fora da janela era um atalho de um ato
 * só: só quem tinha `posicao === "diretor"` conseguia, e marcava sozinho, na
 * mesma chamada que gravava a data. Agora quem marca PEDE aqui, com
 * justificativa, e a diretoria decide depois, em ato separado — mesmo
 * desenho do pedido de exceção de choque acima.
 */
export function solicitarForaJanela(
  dados: { projeto_escopo_id: number; data_hora_pretendida: string; justificativa: string },
  token: string,
) {
  return apiFetch<{ id: number; status: string }>("/bancas/fora-janela", {
    aviso: "Pedido enviado à diretoria", method: "POST",
    token,
    body: JSON.stringify(dados),
  });
}

/** Um pedido de autorização de banca fora da janela, esperando a diretoria. */
export interface ForaJanelaPendente {
  id: number;
  projeto_id: number | null;
  projeto_nome: string;
  projeto_escopo_id: number;
  escopo_nome: string | null;
  data_hora_pretendida: string;
  /** O fim da janela hoje — o contexto de quanto a data pretendida passa dela. */
  fim_janela: string | null;
  justificativa: string;
  solicitado_por: number;
  solicitado_por_nome: string | null;
  criado_em: string;
}

export function getForaJanelaPendentes(token: string) {
  return apiFetch<ForaJanelaPendente[]>("/bancas/fora-janela/pendentes", { token });
}

/** A decisão da diretoria — `resposta` é obrigatória nos dois sentidos. */
export function decidirForaJanela(
  pedidoId: number,
  /** `autorizar_choque` acompanha um SIM e libera também a exceção do §8,
   *  quando a data pedida esbarra na banca de outro projeto. */
  dados: { aprovar: boolean; resposta: string; autorizar_choque?: boolean },
  token: string,
) {
  return apiFetch(`/bancas/fora-janela/${pedidoId}`, {
    aviso: "Decisão registrada", method: "PATCH",
    token,
    body: JSON.stringify(dados),
  });
}

/**
 * ⭐ Pedir para remarcar uma banca que já tem data (§13, 2026-09-10).
 *
 * ⚠ **O atalho que isto fecha.** Remarcar dentro da janela e com folga era
 * livre para quem edita o projeto — bastava justificativa e a data trocava na
 * hora. Virou rotina silenciosa. Agora quem conduz o projeto PEDE aqui, e a
 * diretoria decide na aba Aprovações; a aprovação já remarca a banca.
 */
export function solicitarRemarcacao(
  dados: { projeto_escopo_id: number; data_hora_pretendida: string; justificativa: string },
  token: string,
) {
  return apiFetch<{ id: number; status: string }>("/bancas/remarcacao", {
    aviso: "Pedido de remarcação enviado", method: "POST",
    token,
    body: JSON.stringify(dados),
  });
}

/** Um pedido de remarcação de banca, esperando a diretoria. */
export interface RemarcacaoPendente {
  id: number;
  banca_id: number | null;
  projeto_id: number | null;
  projeto_nome: string;
  projeto_escopo_id: number;
  escopo_nome: string | null;
  data_hora_anterior: string;
  data_hora_pretendida: string;
  justificativa: string;
  solicitado_por: number;
  solicitado_por_nome: string | null;
  criado_em: string;
}

export function getRemarcacoesPendentes(token: string) {
  return apiFetch<RemarcacaoPendente[]>("/bancas/remarcacao/pendentes", { token });
}

/** A decisão da diretoria sobre a remarcação — aprovar já remarca a banca. */
export function decidirRemarcacao(
  pedidoId: number,
  dados: { aprovar: boolean; resposta: string; autorizar_choque?: boolean },
  token: string,
) {
  return apiFetch(`/bancas/remarcacao/${pedidoId}`, {
    aviso: "Decisão registrada", method: "PATCH",
    token,
    body: JSON.stringify(dados),
  });
}

/**
 * Pedir para entrar numa banca sem vaga livre pra quem pede (2026-09-18).
 *
 * ⚠ `alocado_direto: true` quando a vaga na verdade estava aberta — a
 * autoinscrição normal já resolveu, sem pedido nenhum indo pra fila da
 * diretoria (a vaga pode ter aberto entre abrir a tela e clicar).
 */
export function solicitarEntradaBanca(bancaId: number, justificativa: string, token: string) {
  return apiFetch<{ alocado_direto: boolean; candidatura?: Candidatura; pedido?: { id: number; status: string } }>(
    "/bancas/entrada",
    {
      method: "POST",
      token,
      body: JSON.stringify({ banca_id: bancaId, justificativa }),
    },
  );
}

/** Um pedido de entrada em banca, esperando a diretoria. */
export interface EntradaBancaPendente {
  id: number;
  banca_id: number;
  projeto_id: number | null;
  projeto_nome: string;
  data_hora: string | null;
  frentes: string[];
  vagas: number;
  alocados: number;
  justificativa: string;
  usuario_id: number;
  usuario_nome: string | null;
  criado_em: string;
}

export function getEntradaBancaPendentes(token: string) {
  return apiFetch<EntradaBancaPendente[]>("/bancas/entrada/pendentes", { token });
}

/** O que EU pedi e ainda espera decisão (2026-09-18) — troca "Solicitar
 *  entrada" por "Aguardando aprovação" nas bancas já pedidas. */
export interface MinhaEntradaBancaPendente {
  id: number;
  banca_id: number;
  criado_em: string;
}

export function getMinhasEntradaBancaPendentes(token: string) {
  return apiFetch<MinhaEntradaBancaPendente[]>("/bancas/entrada/minhas", { token });
}

/** A decisão da diretoria — aprovar cria a candidatura, acima do teto normal. */
export function decidirEntradaBanca(
  pedidoId: number,
  dados: { aprovar: boolean; resposta: string },
  token: string,
) {
  return apiFetch(`/bancas/entrada/${pedidoId}`, {
    aviso: "Pedido respondido", method: "PATCH",
    token,
    body: JSON.stringify(dados),
  });
}

/**
 * ⭐ Todas as bancas de um PROJETO, cada uma com a ficha completa.
 *
 * É o que a aba "Banca" do projeto consome. Rota própria, e não N chamadas a
 * `/bancas/{id}/detalhes`: quem abre a aba não sabe os ids das bancas, e
 * descobri-los exigiria buscar os escopos antes só para saber o que pedir.
 */
export function getBancasDoProjeto(projetoId: number, token: string) {
  return apiFetch<BancaDetalhes[]>(`/projetos/${projetoId}/bancas`, { token });
}
