import { useCallback, useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { Plus } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  getGpResumo,
  getGpTipos,
  type GpCategoria,
  type GpGestao,
  type GpMembroResumo,
  type GpRegistro,
  type GpResumo,
  type GpTipo,
} from "@/lib/gestao-pessoas";
import { getNucleos, type Nucleo } from "@/lib/nucleos";
import {
  ErrorBlock,
  ErrorText,
  PageButton,
  PageHeader,
  PageHeaderText,
  PageLoadingBlock,
  PageStack,
  PageSubtitle,
  PageTitle,
} from "@/styles/page.styled";
import { TabBar, TabLink } from "@/pages/avaliacao-desempenho/painel/Painel.styled";
import { GavetaMembro } from "./GavetaMembro";
import { ModalRegistro } from "./ModalRegistro";
import { ModalCorrigir } from "./ModalCorrigir";
import { ModalRetirar } from "./ModalRetirar";
import { avisarAvisosGerados, type GpContexto } from "./contexto";

/**
 * Gestão de Pessoas (2026-10-21): pontos por obrigações e por desempenho,
 * contados dentro da gestão (o semestre do ATLAS), nunca somados entre si.
 * A página carrega o resumo uma vez e o repassa às abas; a gaveta do membro
 * e os modais vivem aqui porque abrem de qualquer aba.
 */
export function GestaoPessoas() {
  const { token } = useAuth();
  const [resumo, setResumo] = useState<GpResumo | null>(null);
  const [tipos, setTipos] = useState<GpTipo[]>([]);
  const [nucleos, setNucleos] = useState<Nucleo[]>([]);
  const [erro, setErro] = useState("");
  const [versao, setVersao] = useState(0);

  const [gaveta, setGaveta] = useState<{ membro: GpMembroResumo; gestao: GpGestao | null } | null>(null);
  const [modalRegistro, setModalRegistro] = useState<{ categoria: GpCategoria; membro: GpMembroResumo | null } | null>(
    null,
  );
  const [modalCorrigir, setModalCorrigir] = useState<GpRegistro | null>(null);
  const [modalRetirar, setModalRetirar] = useState<GpRegistro | null>(null);

  // Sem setState síncrono: o efeito só dispara a busca, o estado muda quando
  // a resposta chega.
  const carregar = useCallback(() => {
    if (!token) return Promise.resolve();
    return Promise.all([getGpResumo(token), getGpTipos(token), getNucleos(token)])
      .then(([r, t, n]) => {
        setResumo(r);
        setTipos(t);
        setNucleos(n);
        setErro("");
      })
      .catch((err) => setErro(err instanceof Error ? err.message : "Erro ao carregar a Gestão de Pessoas"));
  }, [token]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const recarregar = useCallback(async () => {
    await carregar();
    setVersao((v) => v + 1);
  }, [carregar]);

  if (erro && !resumo) {
    return (
      <ErrorBlock>
        <ErrorText>{erro}</ErrorText>
        <PageButton $variant="outline" onClick={carregar}>
          Tentar novamente
        </PageButton>
      </ErrorBlock>
    );
  }

  if (!resumo) return <PageLoadingBlock />;

  const contexto: GpContexto = {
    resumo,
    tipos,
    nucleos,
    versao,
    recarregar,
    abrirMembro: (membro, gestao = null) => setGaveta({ membro, gestao }),
    abrirRegistro: (categoria, membro = null) => setModalRegistro({ categoria, membro }),
    corrigir: (registro) => setModalCorrigir(registro),
    retirar: (registro) => setModalRetirar(registro),
  };

  return (
    <PageStack>
      <PageHeader>
        <PageHeaderText>
          <PageTitle>Gestão de Pessoas</PageTitle>
          <PageSubtitle>
            Gestão {resumo.semestre.nome} · Obrigações até {resumo.limites.obrigacoes} pontos, Desempenho até{" "}
            {resumo.limites.desempenho}. As duas categorias nunca são somadas.
          </PageSubtitle>
        </PageHeaderText>
        <PageButton type="button" onClick={() => setModalRegistro({ categoria: "obrigacoes", membro: null })}>
          <Plus size={16} />
          Adicionar pontos
        </PageButton>
      </PageHeader>

      {erro && <ErrorText>{erro}</ErrorText>}

      <TabBar>
        <TabLink to="/gestao-pessoas/obrigacoes">Pontos por Obrigações</TabLink>
        <TabLink to="/gestao-pessoas/desempenho">Pontos por Desempenho</TabLink>
        <TabLink to="/gestao-pessoas/historico">Histórico e Relatórios</TabLink>
      </TabBar>

      <Outlet context={contexto} />

      {gaveta && (
        <GavetaMembro
          contexto={contexto}
          membroInicial={gaveta.membro}
          gestao={gaveta.gestao}
          onFechar={() => setGaveta(null)}
        />
      )}

      {modalRegistro && (
        <ModalRegistro
          contexto={contexto}
          categoriaInicial={modalRegistro.categoria}
          membroFixo={modalRegistro.membro}
          onFechar={() => setModalRegistro(null)}
          onSalvo={async (avisos) => {
            setModalRegistro(null);
            avisarAvisosGerados(avisos);
            await recarregar();
          }}
        />
      )}

      {modalCorrigir && (
        <ModalCorrigir
          contexto={contexto}
          registro={modalCorrigir}
          onFechar={() => setModalCorrigir(null)}
          onSalvo={async (avisos) => {
            setModalCorrigir(null);
            avisarAvisosGerados(avisos);
            await recarregar();
          }}
        />
      )}

      {modalRetirar && (
        <ModalRetirar
          registro={modalRetirar}
          onFechar={() => setModalRetirar(null)}
          onSalvo={async (avisos) => {
            setModalRetirar(null);
            avisarAvisosGerados(avisos);
            await recarregar();
          }}
        />
      )}
    </PageStack>
  );
}
