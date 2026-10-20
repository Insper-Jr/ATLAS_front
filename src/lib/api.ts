import { API_URL } from "@/config/config";
import { avisar } from "@/lib/toast";
import { comVolta } from "@/lib/volta-login";

interface ApiOptions extends RequestInit {
  token?: string | null;
  /** Texto do aviso de sucesso no canto da tela quando a resposta for 2xx
   *  (2026-10-14, a pedido: a maioria das ações não dizia nada ao dar
   *  certo). Só pra ação que a pessoa disparou com um clique; chamada de
   *  fundo (marcar lida, arrastar, salvar sozinho) fica sem. */
  aviso?: string;
}

/**
 * A recusa da API, com o código da regra quando ela tem um.
 *
 * ⭐ **Quem precisa REAGIR a uma recusa específica olha o `codigo`, nunca o
 * texto.** A mensagem é escrita para a pessoa e muda de redação junto com a
 * regra; o código é contrato.
 *
 * Não é preciosismo — já quebrou duas telas. O modal de realizar banca e a
 * aba Banca do projeto reconheciam a recusa de composição procurando trechos
 * dentro da mensagem ("Composição incompleta", depois "mínimo"). Quando o
 * piso por frente saiu do §8 e a frase mudou, as duas pararam de oferecer o
 * "registrar assim mesmo" — a plataforma recusava e não dava saída nenhuma
 * para a diretoria.
 *
 * Continua sendo um `Error`, então todo `catch (e) { e.message }` que já
 * existe segue funcionando sem saber que o código existe.
 */
export class ErroDaApi extends Error {
  readonly codigo?: string;
  /** Os CAMINHOS dos campos que faltam (ex.: "contratante.cnpj"), quando a
   *  recusa é de campo obrigatório vazio — ver `campos_faltando` no backend.
   *  Mesma ideia do `codigo`, só que pra destacar cada campo no formulário
   *  em vez de reagir a um flag só. */
  readonly campos?: string[];

  constructor(mensagem: string, codigo?: string, campos?: string[]) {
    super(mensagem);
    this.name = "ErroDaApi";
    this.codigo = codigo;
    this.campos = campos;
  }
}

/** O código da recusa, quando houver — `undefined` para qualquer outro erro. */
export function codigoDoErro(erro: unknown): string | undefined {
  return erro instanceof ErroDaApi ? erro.codigo : undefined;
}

/** Os campos obrigatórios vazios apontados pela recusa, quando houver. */
export function camposFaltandoDoErro(erro: unknown): string[] | undefined {
  return erro instanceof ErroDaApi ? erro.campos : undefined;
}

function formatApiDetail(detail: unknown): string {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object" && "msg" in item) return String((item as { msg: string }).msg);
        return JSON.stringify(item);
      })
      .join("; ");
  }
  if (detail && typeof detail === "object" && "msg" in detail) return String((detail as { msg: string }).msg);
  if (detail != null) return String(detail);
  return "";
}

export async function apiFetch<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const { token, headers, aviso, ...rest } = options;
  // FormData define seu próprio Content-Type (com o boundary do multipart) —
  // se a gente fixar "application/json" aqui, o navegador não sobrescreve e o
  // backend não consegue parsear o corpo.
  const isFormData = rest.body instanceof FormData;

  let response: Response;
  try {
    response = await fetch(`${API_URL}${endpoint}`, {
      ...rest,
      headers: {
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
    });
  } catch {
    // ⚠ **A requisição não chegou a sair.** O `fetch` só rejeita quando o
    // navegador não conseguiu falar com o servidor: sem internet, servidor
    // fora do ar, ou CORS.
    //
    // A mensagem nativa é "Failed to fetch", que vazava direto para a tela.
    // Ela não diz nada a quem está usando a plataforma e ainda parece defeito
    // do que a pessoa acabou de preencher — em vez de problema de conexão.
    throw new Error(
      "Não foi possível falar com o servidor. Verifique sua conexão e tente de novo; " +
        "se continuar, avise a diretoria.",
    );
  }

  if (!response.ok) {
    const erro = await response.json().catch(() => null);
    const mensagem = formatApiDetail(erro?.detail);

    // O JWT tem prazo (ACCESS_TOKEN_EXPIRE_MINUTES, hoje 7 dias) e o
    // AuthContext só revalida no mount, sem isto, uma sessão que expira no
    // meio do uso deixa a pessoa presa numa página mostrando "Token inválido
    // ou expirado" em vez de voltar pro login pra entrar de novo. O caminho
    // normal é este 401 nunca acontecer: `/auth/renovar` estende o prazo a
    // cada abertura da plataforma.
    if (response.status === 401 && token) {
      localStorage.removeItem("token");
      if (typeof window !== "undefined" && window.location.pathname !== "/login") {
        const { pathname, search, hash } = window.location;
        window.location.href = comVolta("/login", pathname + search + hash);
      }
    }

    // ⭐ **Duas famílias de falha, dois textos.**
    //
    // 4xx com mensagem é a plataforma RECUSANDO algo com um motivo escrito
    // para a pessoa — é o texto do backend que manda, e o front nunca o
    // reescreve. É o caso do "esta banca tem 0 de 2 pessoas alocadas".
    //
    // Sem mensagem, sobra o erro técnico. `Erro 500 ao chamar
    // /bancas/7/realizar` diz à pessoa exatamente nada, e ainda sugere que ela
    // errou o preenchimento. O endpoint continua no console, para quem vai
    // depurar; na tela vai o que dá para fazer a respeito.
    if (mensagem) {
      const detalhe = erro?.detail;
      const codigo =
        detalhe && typeof detalhe === "object" && "codigo" in detalhe
          ? String((detalhe as { codigo: unknown }).codigo)
          : undefined;
      const campos =
        detalhe && typeof detalhe === "object" && "campos" in detalhe
          ? (detalhe as { campos: unknown }).campos
          : undefined;
      throw new ErroDaApi(mensagem, codigo, Array.isArray(campos) ? (campos as string[]) : undefined);
    }

    console.error(`Erro ${response.status} em ${endpoint}`);
    throw new Error(
      response.status >= 500
        ? "O servidor não conseguiu concluir esta ação. Tente de novo em instantes; " +
          "se continuar, avise a diretoria."
        : "Não foi possível concluir esta ação. Recarregue a página e tente de novo.",
    );
  }

  if (aviso) avisar(aviso);
  if (response.status === 204) return null as T;
  return response.json();
}

/**
 * Os códigos de recusa que a interface reconhece.
 *
 * ⚠ Espelham as constantes de `src/utils/exceptions.py` no backend. São
 * poucos de propósito: só entra aqui a recusa a que alguma tela REAGE, e não
 * toda regra que existe — as outras 200 só precisam ser exibidas.
 */
export const CODIGO_BANCA_ABAIXO_DO_MINIMO = "banca_abaixo_do_minimo";

/** Choque de horário (§8): a data pretendida já tem banca de outro projeto.
 *
 *  Reage em dois lugares, com leitores diferentes: quem marca pelo cronograma
 *  precisa PEDIR a exceção, e a diretoria, decidindo um pedido de banca fora
 *  da janela (§13), pode conceder as duas coisas no mesmo ato. */
export const CODIGO_CHOQUE_DE_HORARIO = "choque_de_horario";

/** Tirar a última porta da tela de permissões: recusado.
 *
 *  Reage no modal de editar permissões, que precisa DESFAZER o checkbox
 *  local — o backend não gravou, e deixar a caixa desmarcada na tela
 *  mostraria um estado que não existe no servidor. */
export const CODIGO_ULTIMO_ADMINISTRADOR = "ultimo_administrador_de_permissoes";

/** Autoinscrição recusada por falta de vaga (banca no teto, ou a última vaga
 *  reservada pro piso por frente que a pessoa não cobre) — 2026-09-18.
 *
 *  Reage em `Bancas.tsx`: em vez de só mostrar a recusa, oferece "Solicitar
 *  entrada", que manda o pedido pra fila da diretoria. */
export const CODIGO_BANCA_LOTADA = "banca_lotada";
