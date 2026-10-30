import { createElement, useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ICONES_CATEGORIA, criarCategoria, editarCategoria, type Categoria } from "@/lib/central";
import { PageBadge, PageButton, PageButtonSm } from "@/styles/page.styled";
import { ModalBody, ModalClose, ModalContent, ModalFooter, ModalHeader, ModalOverlay, ModalTitle } from "@/styles/modal.styled";
import { FieldInput, FormErrorText } from "@/pages/Bancas.styled";
import { BotaoIcone, GradeIcones, IconeCat, LinhaCategoria, SecaoAjuda } from "./Central.styled";
import { ICONES, iconeDaCategoria } from "./icones";

interface Props {
  categorias: Categoria[];
  onFechar: () => void;
  /** Depois de qualquer mudança: a Tool Box recarrega as categorias. */
  onMudou: () => Promise<void> | void;
}

function SeletorIcone({ valor, onChange }: { valor: string; onChange: (icone: string) => void }) {
  return (
    <GradeIcones role="radiogroup" aria-label="Ícone">
      {ICONES_CATEGORIA.map((nome) => (
        <BotaoIcone key={nome} type="button" role="radio" aria-checked={valor === nome} aria-label={nome} title={nome} $ativo={valor === nome} onClick={() => onChange(nome)}>
          {createElement(ICONES[nome], { size: 16, "aria-hidden": "true" })}
        </BotaoIcone>
      ))}
    </GradeIcones>
  );
}

/**
 * As categorias da Tool Box, para quem gere a Central: renomear, trocar o
 * ícone, desativar e criar. A chave gravada nas fichas nunca muda, então
 * renomear não quebra ficha nenhuma; desativar só tira das escolhas novas.
 */
export function ModalCategorias({ categorias, onFechar, onMudou }: Props) {
  const { token } = useAuth();
  const [editando, setEditando] = useState<number | null>(null);
  const [nome, setNome] = useState("");
  const [icone, setIcone] = useState<string>("compass");
  const [criando, setCriando] = useState(false);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") onFechar();
    }
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [onFechar]);

  function abrirEdicao(c: Categoria) {
    setCriando(false);
    setEditando(c.id);
    setNome(c.nome);
    setIcone(c.icone);
    setErro("");
  }

  function abrirCriacao() {
    setEditando(null);
    setCriando(true);
    setNome("");
    setIcone("compass");
    setErro("");
  }

  async function salvar() {
    if (!token) return;
    if (nome.trim().length < 2) {
      setErro("Dê um nome à categoria.");
      return;
    }
    setSalvando(true);
    setErro("");
    try {
      if (criando) await criarCategoria({ nome: nome.trim(), icone }, token);
      else if (editando != null) await editarCategoria(editando, { nome: nome.trim(), icone }, token);
      setCriando(false);
      setEditando(null);
      await onMudou();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível salvar");
    } finally {
      setSalvando(false);
    }
  }

  async function alternar(c: Categoria) {
    if (!token || c.id == null) return;
    setSalvando(true);
    setErro("");
    try {
      await editarCategoria(c.id, { ativa: !c.ativa }, token);
      await onMudou();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível salvar");
    } finally {
      setSalvando(false);
    }
  }

  const formulario = (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", padding: "0.75rem 0" }}>
      <FieldInput autoFocus maxLength={80} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome da categoria" aria-label="Nome da categoria" />
      <SeletorIcone valor={icone} onChange={setIcone} />
      <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
        <PageButtonSm type="button" $variant="ghost" onClick={() => { setCriando(false); setEditando(null); }}>
          Cancelar
        </PageButtonSm>
        <PageButtonSm type="button" disabled={salvando} onClick={salvar}>
          {salvando ? "Salvando…" : "Salvar"}
        </PageButtonSm>
      </div>
    </div>
  );

  return (
    <ModalOverlay onMouseDown={onFechar}>
      <ModalContent $expandido onMouseDown={(e) => e.stopPropagation()} style={{ maxWidth: "36rem" }}>
        <ModalHeader>
          <div>
            <ModalTitle>Categorias da Tool Box</ModalTitle>
            <SecaoAjuda style={{ marginTop: "0.25rem" }}>
              Cada ficha tem uma ou mais categorias; o ícone da primeira aparece no card. Desativar tira a categoria das
              indicações novas e do filtro, sem mexer nas fichas que já a usam.
            </SecaoAjuda>
          </div>
          <ModalClose type="button" aria-label="Fechar" onClick={onFechar}>
            <X size={16} />
          </ModalClose>
        </ModalHeader>
        <ModalBody>
          <div>
            {categorias.map((c) => {
              return (
                <div key={c.chave}>
                  <LinhaCategoria>
                    <IconeCat $tom="primario" style={{ width: "2.5rem", height: "2.5rem", borderRadius: "0.625rem", opacity: c.ativa ? 1 : 0.5 }}>
                      {createElement(iconeDaCategoria(c.icone), { size: 18, "aria-hidden": "true" })}
                    </IconeCat>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 0 }}>
                      <span style={{ fontWeight: 600, opacity: c.ativa ? 1 : 0.6 }}>{c.nome}</span>
                      {!c.ativa && <PageBadge $tone="muted">desativada</PageBadge>}
                    </div>
                    <div style={{ display: "flex", gap: "0.25rem" }}>
                      {c.id != null && (
                        <>
                          <PageButtonSm type="button" $variant="ghost" onClick={() => abrirEdicao(c)}>
                            Editar
                          </PageButtonSm>
                          <PageButtonSm type="button" $variant="ghost" disabled={salvando} onClick={() => alternar(c)}>
                            {c.ativa ? "Desativar" : "Reativar"}
                          </PageButtonSm>
                        </>
                      )}
                    </div>
                  </LinhaCategoria>
                  {editando === c.id && c.id != null && formulario}
                </div>
              );
            })}
          </div>
          {criando ? (
            formulario
          ) : (
            <div style={{ paddingTop: "0.75rem" }}>
              <PageButtonSm type="button" $variant="outline" onClick={abrirCriacao}>
                <Plus size={14} /> Nova categoria
              </PageButtonSm>
            </div>
          )}
          {erro && <FormErrorText style={{ marginTop: "0.75rem" }}>{erro}</FormErrorText>}
        </ModalBody>
        <ModalFooter>
          <PageButton type="button" $variant="outline" onClick={onFechar}>
            Fechar
          </PageButton>
        </ModalFooter>
      </ModalContent>
    </ModalOverlay>
  );
}
