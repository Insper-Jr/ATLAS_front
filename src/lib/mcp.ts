import { apiFetch } from "@/lib/api";

/**
 * Conector MCP (2026-11-24): o Claude de cada membro lendo o ATLAS.
 *
 * O OAuth em si acontece entre o Claude e o backend. O front entra em dois
 * momentos: a tela "Autorizar o Claude a ler o ATLAS?" (`/autorizar-claude`,
 * para onde o backend manda a pessoa) e a lista "Claude conectado" no perfil.
 */

export interface StatusMcp {
  ativo: boolean;
  /** A URL que a pessoa cola no Claude ao adicionar o conector. */
  url: string | null;
}

export interface PedidoAutorizacao {
  id: string;
  cliente: string;
  valido: boolean;
  motivo: string | null;
  le: string[];
  nao_le: string[];
}

export interface ConexaoMcp {
  id: number;
  cliente: string;
  criado_em: string;
  ultimo_uso_em: string | null;
  usuario_id: number;
  usuario_nome: string | null;
}

export function getStatusMcp(token: string) {
  return apiFetch<StatusMcp>("/mcp/status", { token });
}

export function getPedidoAutorizacao(pedidoId: string, token: string) {
  return apiFetch<PedidoAutorizacao>(`/mcp/pedidos/${encodeURIComponent(pedidoId)}`, { token });
}

/** Devolve a URL de volta para o Claude, com o código de uso único. */
export function autorizarPedido(pedidoId: string, token: string) {
  return apiFetch<{ redirect: string }>(`/mcp/pedidos/${encodeURIComponent(pedidoId)}/autorizar`, {
    method: "POST",
    token,
  });
}

export function recusarPedido(pedidoId: string, token: string) {
  return apiFetch<{ redirect: string }>(`/mcp/pedidos/${encodeURIComponent(pedidoId)}/recusar`, {
    method: "POST",
    token,
  });
}

export function getMinhasConexoesMcp(token: string) {
  return apiFetch<ConexaoMcp[]>("/mcp/conexoes/minhas", { token });
}

export function desconectarMcp(conexaoId: number, token: string) {
  return apiFetch<void>(`/mcp/conexoes/${conexaoId}`, {
    method: "DELETE",
    token,
    aviso: "Claude desconectado do ATLAS",
  });
}
