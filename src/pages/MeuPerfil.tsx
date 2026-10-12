import { useEffect, useState } from "react";
import { Camera, ChevronDown, ChevronUp } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getFaixasDisponiveis, getMinhaGrade, salvarGrade } from "@/lib/grade-horaria";
import { getFrentes } from "@/lib/bancas";
import { getUsuariosFrentes } from "@/lib/usuarios-frentes";
import { atualizarMinhaFoto, atualizarMinhasNotificacoesEmail, removerMinhaFoto } from "@/lib/usuarios";
import { redimensionarParaDataUri } from "@/lib/imagem";
import { DIRETORIA, ROTULO_POSICAO } from "@/utils/permissoes";
import { FotoCircular } from "@/components/Avatar";
import type { Frente } from "@/types/banca";
import type { FaixaDisponivel, FaixaGrade } from "@/types/grade";
import { GradeEditor } from "@/components/grade/GradeEditor";
import { NotificacoesNoAparelho } from "@/components/NotificacoesNoAparelho";
import {
  PageStack,
  PageHeader,
  PageHeaderText,
  PageTitle,
  PageSubtitle,
  PageCard,
  PageCardHeader,
  PageCardTitle,
  PageCardContent,
  PageLoadingBlock,
  ErrorBlock,
  ErrorText,
  PageButton,
  PageButtonSm,
} from "@/styles/page.styled";
import { FormErrorText } from "./Bancas.styled";
import {
  Avatar,
  DadosGrid,
  DadoItem,
  DadoRotulo,
  DadoValor,
  Explicacao,
  FotoAcoes,
  FotoInputLabel,
  PerfilCabecalho,
  PerfilNome,
  PerfilSubtitulo,
} from "./MeuPerfil.styled";
import { PermissoesGrid, PermissaoItem, PermissaoTexto, PermissaoTitulo, PermissaoDesc } from "./Config.styled";

/** Os únicos tipos que dá pra desligar do e-mail — espelha
 *  TIPOS_NOTIFICACAO_OPCIONAIS do backend. Os de fora desta lista saem
 *  sempre, e por isso nem aparecem aqui: não teria o que desligar. */
const NOTIFICACOES_OPCIONAIS: { tipo: string; titulo: string; descricao: string }[] = [
  { tipo: "alocado_em_projeto", titulo: "Alocado em projeto", descricao: "Você entrou numa equipe nova." },
  { tipo: "entrega_registrada", titulo: "Entrega registrada", descricao: "Um escopo do seu projeto foi entregue." },
  { tipo: "troca_banca", titulo: "Troca de banca", descricao: "Uma troca de banca que envolve você foi decidida." },
  { tipo: "banca_aviso", titulo: "Aviso de banca", descricao: "Avisos gerais sobre bancas em que você participa." },
  { tipo: "entrega_alterada", titulo: "Entrega alterada", descricao: "A data de entrega de um escopo mudou." },
  { tipo: "kickoff_pendente", titulo: "Kickoff pendente", descricao: "Um projeto seu está sem data de kickoff." },
  { tipo: "banca_nao_marcada", titulo: "Banca não marcada", descricao: "Um escopo seu está sem banca marcada." },
  { tipo: "projeto_sem_reuniao", titulo: "Projeto sem reunião", descricao: "Seu projeto está sem reunião nesta semana." },
];

/** Os fixos aparecem na lista pra dar o quadro completo (você vê TUDO que
 *  existe, não só o que dá pra mexer), mas o checkbox vem travado ligado —
 *  espelha o que `enviar_email_notificacao.py` já faz: estes tipos ignoram
 *  a preferência e saem sempre.
 *
 *  ⭐ 2026-09-22 — a pedido: `reajuste_solicitado` ("Pedido de dias") só
 *  chega pra quem aprova reajuste — hoje é POSIÇÃO diretor, ver o docstring
 *  de `notificar_reajuste_solicitado` no backend — nunca um consultor. Sem
 *  `somenteDiretoria`, a lista mostrava um tipo que a pessoa jamais
 *  receberia como se fosse relevante pra ela. `solicitacao_projeto`
 *  ("Pedido de entrada em projeto") continua pra todo mundo de propósito:
 *  o próprio texto já cobre os dois lados — "alguém pediu" (quem coordena o
 *  projeto decide) OU "seu pedido foi respondido" (qualquer consultor que
 *  pediu pra entrar num projeto).
 *
 *  ⭐ 2026-09-23 — mesma lógica pra `documento_contratual_assinado`
 *  ("Documento assinado"): só chega pro(s) gerente(s) da(s) frente(s) do
 *  projeto (ver `_gerentes_das_frentes_do_projeto` no backend). */
const NOTIFICACOES_FIXAS: {
  tipo: string;
  titulo: string;
  descricao: string;
  somenteDiretoria?: boolean;
  somenteGerente?: boolean;
}[] = [
  { tipo: "justificativa_pedida", titulo: "Justificativa de atraso pedida", descricao: "A diretoria perguntou por que um escopo seu atrasou." },
  { tipo: "banca_remarcada", titulo: "Banca remarcada", descricao: "A data de uma banca sua mudou." },
  {
    tipo: "escalacao_banca",
    titulo: "Escalação em banca",
    descricao: "Você foi escalado para avaliar uma banca.",
  },
  { tipo: "avaliacao_pendente", titulo: "Avaliação pendente", descricao: "Uma banca foi realizada e você precisa avaliar." },
  { tipo: "descricao_coordenador_pendente", titulo: "Descrição de banca pendente", descricao: "Uma banca sua foi realizada e falta a sua descrição do resultado." },
  { tipo: "solicitacao_projeto", titulo: "Pedido de entrada em projeto", descricao: "Alguém pediu para entrar no seu projeto, ou seu pedido foi respondido." },
  {
    tipo: "reajuste_solicitado",
    titulo: "Pedido de dias",
    descricao: "Um pedido de dias de ajuste está esperando sua decisão.",
    somenteDiretoria: true,
  },
  { tipo: "reajuste_respondido", titulo: "Pedido de dias respondido", descricao: "Seu pedido de dias de ajuste foi decidido." },
  {
    tipo: "documento_contratual_assinado",
    titulo: "Documento assinado",
    descricao: "Um documento jurídico de um projeto da sua frente foi assinado.",
    somenteGerente: true,
  },
  { tipo: "tarefa_vencida", titulo: "Tarefa vencida", descricao: "Uma tarefa sua passou do prazo." },
  { tipo: "banca_hoje", titulo: "Banca hoje", descricao: "Você tem banca hoje." },
  { tipo: "lote_desempenho_aberto", titulo: "Avaliação de Desempenho", descricao: "Uma rodada de avaliação abriu com algo para você responder." },
  { tipo: "pdi_prazo_proximo", titulo: "Prazo de PDI próximo", descricao: "Um item de PDI vence amanhã." },
  { tipo: "pdi_prazo_vencido", titulo: "Prazo de PDI vencido", descricao: "Um item de PDI passou do prazo sem envio." },
  { tipo: "acao_atribuida", titulo: "Ação atribuída a você", descricao: "Alguém da gestão registrou um problema no seu projeto e você ficou responsável pela próxima ação." },
  { tipo: "acao_concluida", titulo: "Ação concluída", descricao: "Uma ação que você abriu foi concluída." },
  { tipo: "acao_prazo_vencido", titulo: "Ação com prazo vencido", descricao: "Uma ação passou do prazo sem ser concluída." },
  { tipo: "rodada_health_track_aberta", titulo: "Rodada de Health Track", descricao: "A diretoria abriu uma rodada e há projetos pra avaliar." },
  { tipo: "rodada_health_track_pendente", titulo: "Rodada de Health Track parada", descricao: "Uma rodada está aberta há uma semana ou mais com projetos pendentes." },
];

/** "Heloisa Nogueira" → "HN". Só entra em jogo quando a pessoa não tem foto
 *  (`FotoCircular`), é o que identifica ela de relance no topo do card. */
function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

/**
 * Meu perfil, os dados do pré-cadastro e a grade de aulas do semestre.
 *
 * É de todo mundo: não há trava de cargo nem de posição. Cada um vê e edita a
 * própria grade, e o backend nem aceita id de outra pessoa, o usuário sai
 * sempre do token.
 */
export function MeuPerfil() {
  const { usuario, token, recarregarUsuario } = useAuth();
  const [faixasDisponiveis, setFaixasDisponiveis] = useState<FaixaDisponivel[]>([]);
  const [salvas, setSalvas] = useState<FaixaGrade[]>([]);
  const [frentes, setFrentes] = useState<Frente[]>([]);
  const [minhasFrentes, setMinhasFrentes] = useState<number[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  // "Tentar novamente" incrementa isto em vez de chamar a busca direto:
  // disparar setState no corpo do efeito gera render em cascata.
  const [tentativa, setTentativa] = useState(0);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [erroFoto, setErroFoto] = useState("");
  const [notificacoesExpandidas, setNotificacoesExpandidas] = useState(false);
  // Preguiçoso, e não um efeito: `PrivateRoute` só monta esta tela depois do
  // usuário carregado, então o valor real já está disponível de cara — um
  // efeito para "sincronizar" algo que nunca muda por fora desta tela seria
  // render em cascata à toa.
  const [notificacoesPendentes, setNotificacoesPendentes] = useState<string[]>(
    () => usuario?.notificacoes_email_desativadas ?? [],
  );
  const [salvandoNotificacoes, setSalvandoNotificacoes] = useState(false);
  const [erroNotificacoes, setErroNotificacoes] = useState("");

  const usuarioId = usuario?.id;

  useEffect(() => {
    if (!token || usuarioId == null) return;
    let ativo = true;
    Promise.all([
      getFaixasDisponiveis(token),
      getMinhaGrade(token),
      getFrentes(token),
      getUsuariosFrentes(token),
    ])
      .then(([faixasResp, gradeResp, frentesResp, vinculosResp]) => {
        if (!ativo) return;
        setFaixasDisponiveis(faixasResp);
        setSalvas(gradeResp.faixas);
        setFrentes(frentesResp);
        setMinhasFrentes(
          vinculosResp.filter((v) => v.usuario_id === usuarioId).map((v) => v.frente_id),
        );
        setErro("");
      })
      .catch((e) => {
        if (ativo) setErro(e instanceof Error ? e.message : "Erro ao carregar o perfil");
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => {
      ativo = false;
    };
  }, [token, usuarioId, tentativa]);

  if (!usuario) return null;

  if (erro) {
    return (
      <ErrorBlock>
        <ErrorText>Não foi possível carregar o perfil: {erro}</ErrorText>
        <PageButton
          $variant="outline"
          onClick={() => {
            setCarregando(true);
            setTentativa((n) => n + 1);
          }}
        >
          Tentar novamente
        </PageButton>
      </ErrorBlock>
    );
  }

  if (carregando) return <PageLoadingBlock />;

  const nomesFrentes = frentes
    .filter((f) => minhasFrentes.includes(f.id))
    .map((f) => f.nome);

  async function aoSalvar(faixas: FaixaGrade[]) {
    if (!token) return;
    const resposta = await salvarGrade(faixas, token);
    // Regravar com o que o backend devolveu, não com o que foi enviado: é
    // isso que faz o botão voltar para "Grade salva" refletindo o banco.
    setSalvas(resposta.faixas);
  }

  async function aoEscolherFoto(evento: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0];
    // Limpa o valor já aqui: sem isso, escolher o MESMO arquivo de novo (pra
    // tentar de novo depois de um erro) não dispara o `onChange` outra vez.
    evento.target.value = "";
    if (!arquivo || !token) return;
    setErroFoto("");
    setEnviandoFoto(true);
    try {
      const dataUri = await redimensionarParaDataUri(arquivo);
      await atualizarMinhaFoto(dataUri, token);
      await recarregarUsuario();
    } catch (e) {
      setErroFoto(e instanceof Error ? e.message : "Não foi possível enviar a foto");
    } finally {
      setEnviandoFoto(false);
    }
  }

  async function removerFoto() {
    if (!token) return;
    setErroFoto("");
    setEnviandoFoto(true);
    try {
      await removerMinhaFoto(token);
      await recarregarUsuario();
    } catch (e) {
      setErroFoto(e instanceof Error ? e.message : "Não foi possível remover a foto");
    } finally {
      setEnviandoFoto(false);
    }
  }

  /** Só mexe no estado local — nada é salvo até clicar em "Salvar". */
  function alternarNotificacao(tipo: string, ligada: boolean) {
    setNotificacoesPendentes((atual) =>
      ligada ? atual.filter((t) => t !== tipo) : [...atual, tipo],
    );
  }

  const notificacoesMudaram =
    notificacoesPendentes.length !== usuario.notificacoes_email_desativadas.length ||
    notificacoesPendentes.some((t) => !usuario.notificacoes_email_desativadas.includes(t));

  async function salvarNotificacoes() {
    if (!token) return;
    setErroNotificacoes("");
    setSalvandoNotificacoes(true);
    try {
      await atualizarMinhasNotificacoesEmail(notificacoesPendentes, token);
      await recarregarUsuario();
    } catch (e) {
      setErroNotificacoes(e instanceof Error ? e.message : "Não foi possível salvar a preferência");
    } finally {
      setSalvandoNotificacoes(false);
    }
  }

  return (
    <PageStack>
      <PageHeader>
        <PageHeaderText>
          <PageTitle>Meu perfil</PageTitle>
          <PageSubtitle>Seus dados de cadastro e a sua grade de aulas do semestre.</PageSubtitle>
        </PageHeaderText>
      </PageHeader>

      <PageCard>
        <PageCardHeader>
          <PageCardTitle>Cadastro</PageCardTitle>
        </PageCardHeader>
        <PageCardContent>
          <PerfilCabecalho>
            <Avatar>
              {usuario.foto ? <FotoCircular src={usuario.foto} /> : iniciais(usuario.nome)}
            </Avatar>
            <div>
              <PerfilNome>{usuario.nome}</PerfilNome>
              <PerfilSubtitulo>{ROTULO_POSICAO[usuario.posicao] ?? usuario.posicao}</PerfilSubtitulo>
              <FotoAcoes>
                <FotoInputLabel $desabilitado={enviandoFoto}>
                  <Camera size={12} />
                  {enviandoFoto ? "Enviando…" : usuario.foto ? "Trocar foto" : "Adicionar foto"}
                  <input
                    type="file"
                    accept="image/*"
                    disabled={enviandoFoto}
                    onChange={(e) => void aoEscolherFoto(e)}
                  />
                </FotoInputLabel>
                {usuario.foto && (
                  <FotoInputLabel as="button" type="button" $desabilitado={enviandoFoto} onClick={removerFoto}>
                    Remover foto
                  </FotoInputLabel>
                )}
              </FotoAcoes>
              {erroFoto && <FormErrorText>{erroFoto}</FormErrorText>}
            </div>
          </PerfilCabecalho>

          <DadosGrid>
            <DadoItem>
              <DadoRotulo>E-mail</DadoRotulo>
              <DadoValor>{usuario.email_insper}</DadoValor>
            </DadoItem>
            <DadoItem>
              <DadoRotulo>{nomesFrentes.length === 1 ? "Frente" : "Frentes"}</DadoRotulo>
              <DadoValor>{nomesFrentes.length > 0 ? nomesFrentes.join(" · ") : "—"}</DadoValor>
            </DadoItem>
          </DadosGrid>
        </PageCardContent>
      </PageCard>

      <PageCard>
        <PageCardHeader>
          <PageCardTitle>Minha grade de aulas</PageCardTitle>
        </PageCardHeader>
        <PageCardContent>
          <Explicacao>
            Marque os horários em que você tem aula, do mesmo jeito que aparecem na sua grade
            do Insper. É por aqui que a plataforma sabe quando você não está livre.
          </Explicacao>
          <GradeEditor
            faixasDisponiveis={faixasDisponiveis}
            salvas={salvas}
            onSalvar={aoSalvar}
          />
        </PageCardContent>
      </PageCard>

      <NotificacoesNoAparelho />

      <PageCard>
        <PageCardHeader>
          <PageCardTitle>Notificações por e-mail</PageCardTitle>
          <PageButtonSm
            type="button"
            $variant="outline"
            onClick={() => setNotificacoesExpandidas((v) => !v)}
          >
            {notificacoesExpandidas ? (
              <>
                <ChevronUp size={14} />
                Recolher
              </>
            ) : (
              <>
                <ChevronDown size={14} />
                Expandir
              </>
            )}
          </PageButtonSm>
        </PageCardHeader>
        {notificacoesExpandidas && (
          <PageCardContent>
            <Explicacao>
              Estas continuam chegando no sino independente da escolha aqui — é só o e-mail que
              liga ou desliga. As marcadas com cadeado não têm essa opção (prazo com bloqueio,
              pedido direto de alguém, compromisso de agenda) e saem sempre por e-mail.
            </Explicacao>
            <PermissoesGrid>
              {NOTIFICACOES_OPCIONAIS.map((n) => (
                <PermissaoItem key={n.tipo}>
                  <input
                    type="checkbox"
                    checked={!notificacoesPendentes.includes(n.tipo)}
                    disabled={salvandoNotificacoes}
                    onChange={(e) => alternarNotificacao(n.tipo, e.target.checked)}
                  />
                  <PermissaoTexto>
                    <PermissaoTitulo>{n.titulo}</PermissaoTitulo>
                    <PermissaoDesc>{n.descricao}</PermissaoDesc>
                  </PermissaoTexto>
                </PermissaoItem>
              ))}
              {NOTIFICACOES_FIXAS.filter(
                (n) =>
                  (!n.somenteDiretoria || DIRETORIA.includes(usuario.posicao)) &&
                  (!n.somenteGerente || usuario.posicao === "gerente"),
              ).map((n) => (
                <PermissaoItem key={n.tipo}>
                  <input type="checkbox" checked disabled />
                  <PermissaoTexto>
                    <PermissaoTitulo>{n.titulo}</PermissaoTitulo>
                    <PermissaoDesc>{n.descricao} · Sempre ligado</PermissaoDesc>
                  </PermissaoTexto>
                </PermissaoItem>
              ))}
            </PermissoesGrid>
            {erroNotificacoes && <FormErrorText>{erroNotificacoes}</FormErrorText>}
            <PageButton
              type="button"
              disabled={salvandoNotificacoes || !notificacoesMudaram}
              onClick={() => void salvarNotificacoes()}
            >
              {salvandoNotificacoes ? "Salvando…" : "Salvar"}
            </PageButton>
          </PageCardContent>
        )}
      </PageCard>
    </PageStack>
  );
}
