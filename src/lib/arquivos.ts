import { API_URL } from "@/config/config";

/** Os links de arquivo vêm da API relativos ("/arquivos/12/conteudo?t=...") e
 *  já trazem a autorização: entram num <img src>, numa aba ou num download
 *  sem token no cabeçalho (2026-11-17, armazenamento único de arquivos). */
export function urlAbsoluta(url: string): string {
  return url.startsWith("/") ? `${API_URL}${url}` : url;
}

/** Abre um arquivo numa aba. */
export function abrirArquivo(url: string, pagina?: number | null) {
  window.open(`${urlAbsoluta(url)}${pagina ? `#page=${pagina}` : ""}`, "_blank", "noopener");
}

/** Baixa com o nome original: a resposta vem como anexo, a página fica onde está. */
export function baixarArquivo(urlDownload: string) {
  const a = document.createElement("a");
  a.href = urlAbsoluta(urlDownload);
  a.rel = "noopener";
  a.click();
}
