import { API_URL } from "@/config/config";

/** Os links de arquivo vêm da API relativos ("/arquivos/12/conteudo?t=...") e
 *  já trazem a autorização: entram num <img src>, numa aba ou num download
 *  sem token no cabeçalho (2026-11-17, armazenamento único de arquivos). */
export function urlAbsoluta(url: string): string {
  return url.startsWith("/") ? `${API_URL}${url}` : url;
}

/** Excel, Word e PowerPoint o navegador não exibe: abrem no visualizador do
 *  Office Online (2026-11-18, a pedido), que busca o arquivo pelo link
 *  assinado e mostra completo, só leitura, sem login. */
const EXTENSOES_OFFICE = ["xlsx", "xlsm", "xls", "csv", "docx", "doc", "pptx", "ppt"];

export function ehArquivoOffice(nome: string | null | undefined): boolean {
  const ext = (nome ?? "").toLowerCase().split(".").pop() ?? "";
  return EXTENSOES_OFFICE.includes(ext);
}

/** O endereço para ABRIR o arquivo: o próprio link, ou o visualizador do
 *  Office por cima dele. Para o visualizador, o link ganha o nome do arquivo
 *  no caminho (ele quer ver a extensão) e `direto=1`, porque a Microsoft não
 *  segue o redirecionamento para o bucket. */
export function urlParaAbrir(url: string, nome?: string | null): string {
  const absoluta = urlAbsoluta(url);
  if (!ehArquivoOffice(nome)) return absoluta;
  const comNome = absoluta.replace("/conteudo?", `/conteudo/${encodeURIComponent(nome ?? "arquivo")}?`) + "&direto=1";
  return `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(comNome)}`;
}

/** Abre um arquivo numa aba. Com `nome`, planilha e documento vão pelo visualizador do Office. */
export function abrirArquivo(url: string, pagina?: number | null, nome?: string | null) {
  const destino = urlParaAbrir(url, nome);
  window.open(`${destino}${pagina && !ehArquivoOffice(nome) ? `#page=${pagina}` : ""}`, "_blank", "noopener");
}

/** Baixa com o nome original: a resposta vem como anexo, a página fica onde está. */
export function baixarArquivo(urlDownload: string) {
  const a = document.createElement("a");
  a.href = urlAbsoluta(urlDownload);
  a.rel = "noopener";
  a.click();
}
