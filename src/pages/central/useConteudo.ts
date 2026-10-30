import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getConteudo, type ChaveConteudo, type Conteudo } from "@/lib/central";

/** Carrega uma vitrine e devolve o estado que as três abas compartilham. */
export function useConteudo<T>(chave: ChaveConteudo) {
  const { token } = useAuth();
  const [conteudo, setConteudo] = useState<Conteudo<T> | null>(null);
  const [erro, setErro] = useState("");
  const [editando, setEditando] = useState(false);

  useEffect(() => {
    if (!token) return;
    let vivo = true;
    getConteudo<T>(chave, token)
      .then((c) => vivo && setConteudo(c))
      .catch((err) => vivo && setErro(err instanceof Error ? err.message : "Erro ao carregar"));
    return () => {
      vivo = false;
    };
  }, [token, chave]);

  return { token, conteudo, setConteudo, erro, editando, setEditando };
}
