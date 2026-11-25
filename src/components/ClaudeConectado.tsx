import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { desconectarMcp, getMinhasConexoesMcp, getStatusMcp, type ConexaoMcp, type StatusMcp } from "@/lib/mcp";
import {
  PageCard,
  PageCardHeader,
  PageCardTitle,
  PageCardContent,
  PageButtonSm,
  EmptyText,
} from "@/styles/page.styled";
import { Explicacao } from "@/pages/MeuPerfil.styled";
import { FormErrorText } from "@/pages/Bancas.styled";

function quando(iso: string | null): string {
  if (!iso) return "ainda não usado";
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR") + " às " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

/**
 * O card "Claude conectado" do Meu perfil (2026-11-24).
 *
 * Mostra as conexões vivas do Claude da pessoa com o ATLAS e deixa
 * desconectar. Some inteiro quando o conector não está ligado no ambiente
 * (`/mcp/status`), para não anunciar algo que não existe.
 */
export function ClaudeConectado() {
  const { token } = useAuth();
  const [status, setStatus] = useState<StatusMcp | null>(null);
  const [conexoes, setConexoes] = useState<ConexaoMcp[]>([]);
  const [erro, setErro] = useState("");
  const [removendo, setRemovendo] = useState<number | null>(null);

  useEffect(() => {
    if (!token) return;
    let ativo = true;
    (async () => {
      try {
        const s = await getStatusMcp(token);
        if (!ativo) return;
        setStatus(s);
        if (s.ativo) {
          const lista = await getMinhasConexoesMcp(token);
          if (ativo) setConexoes(lista);
        }
      } catch {
        if (ativo) setStatus({ ativo: false, url: null });
      }
    })();
    return () => {
      ativo = false;
    };
  }, [token]);

  if (!status?.ativo || !token) return null;

  async function desconectar(id: number) {
    if (!token) return;
    setErro("");
    setRemovendo(id);
    try {
      await desconectarMcp(id, token);
      setConexoes((atual) => atual.filter((c) => c.id !== id));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível desconectar");
    } finally {
      setRemovendo(null);
    }
  }

  return (
    <PageCard>
      <PageCardHeader>
        <PageCardTitle>Claude conectado</PageCardTitle>
      </PageCardHeader>
      <PageCardContent>
        <Explicacao>
          Para o seu Claude consultar o ATLAS (seus projetos, o acervo, as fichas da Tool Box, seus pontos),
          adicione um conector personalizado no Claude com este endereço e autorize com o seu login:
          <br />
          <code>{status.url}</code>
          <br />O Claude só lê, sempre com a sua visão do ATLAS. Desconectar aqui derruba o acesso na hora.
        </Explicacao>
        {conexoes.length === 0 ? (
          <EmptyText>Nenhum Claude conectado.</EmptyText>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "0.5rem" }}>
            {conexoes.map((c) => (
              <li
                key={c.id}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}
              >
                <span>
                  <strong>{c.cliente}</strong> · conectado em {new Date(c.criado_em).toLocaleDateString("pt-BR")} · último uso:{" "}
                  {quando(c.ultimo_uso_em)}
                </span>
                <PageButtonSm type="button" $variant="outline" disabled={removendo === c.id} onClick={() => void desconectar(c.id)}>
                  {removendo === c.id ? "Desconectando…" : "Desconectar"}
                </PageButtonSm>
              </li>
            ))}
          </ul>
        )}
        {erro && <FormErrorText>{erro}</FormErrorText>}
      </PageCardContent>
    </PageCard>
  );
}
