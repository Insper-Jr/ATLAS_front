import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Download,
  ExternalLink,
  FileText,
  Folder,
  FolderInput,
  FolderPlus,
  X,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ConfirmarModal } from "@/components/ConfirmarModal";
import { useParticulas } from "@/hooks/useParticulas";
import {
  abrirItemArquivo,
  apagarItemArquivo,
  apagarPastaArquivo,
  baixarItemArquivo,
  buscarArquivo,
  criarPastaArquivo,
  getPastaArquivo,
  importarItemArquivo,
  moverItemArquivo,
  moverPastaArquivo,
  renomearItemArquivo,
  renomearPastaArquivo,
  substituirItemArquivo,
} from "@/lib/arquivo-contratos";
import type { ConteudoPasta, ItemArquivo, PastaArquivo } from "@/types/arquivo-contratos";
import {
  AcoesCabecalho,
  Barra,
  Botao,
  BotaoCabecalho,
  Cabecalho,
  CabecalhoGrade,
  CabecalhoLista,
  Caixa,
  Caminho,
  CampoBusca,
  Cartao,
  Conteudo,
  Descricao,
  Entrada,
  Erro,
  Etiqueta,
  Item,
  LinhaInline,
  Lista,
  ListaEscolha,
  MenuGatilho,
  MenuPainel,
  MenuWrap,
  NomeUsuario,
  Pagina,
  Particulas,
  TituloCabecalho,
  Vazio,
  Veu,
} from "./ArquivoContratos.styled";
import { FUSO } from "@/lib/fuso";

const PREFIXO_DELETADO = "[DELETADO] ";
const FONTE_MONTSERRAT = "https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600;700&display=swap";

type Alvo = { tipo: "pasta" | "item"; id: number; nome: string };

function tamanhoLegivel(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function dataCurta(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: FUSO });
}

/** Montserrat só nesta página (o painel de Contratos a usa nos títulos). */
function useMontserrat() {
  useEffect(() => {
    if (document.querySelector(`link[href="${FONTE_MONTSERRAT}"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = FONTE_MONTSERRAT;
    document.head.appendChild(link);
  }, []);
}

/** O menu "⋯" de uma linha. Fecha ao clicar fora ou ao escolher. */
function Menu({ children }: { children: (fechar: () => void) => React.ReactNode }) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    function aoClicarFora(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false);
    }
    document.addEventListener("mousedown", aoClicarFora);
    return () => document.removeEventListener("mousedown", aoClicarFora);
  }, [aberto]);

  return (
    <MenuWrap ref={ref} onDoubleClick={(e) => e.stopPropagation()}>
      <MenuGatilho type="button" aria-label="Ações" onClick={() => setAberto((v) => !v)}>
        <MoreHorizontal size={16} />
      </MenuGatilho>
      {aberto && <MenuPainel>{children(() => setAberto(false))}</MenuPainel>}
    </MenuWrap>
  );
}

/**
 * Arquivo de contratos (2026-10-07, a pedido): a pasta compartilhada da
 * Insper Jr, aberta em aba própria, com o visual do painel de Contratos
 * (cabeçalho em vinho, partículas, card com borda em degradê). Pastas e
 * arquivos numa lista só, como num explorador: clique duplo abre, o menu
 * "⋯" tem o resto.
 */
export function ArquivoContratos() {
  const { token, usuario } = useAuth();
  const navigate = useNavigate();
  useMontserrat();
  const fundoRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useParticulas(fundoRef, canvasRef);

  const [pastaId, setPastaId] = useState<number | null>(null);
  const [conteudo, setConteudo] = useState<ConteudoPasta | null>(null);
  const [erro, setErro] = useState("");
  const [busca, setBusca] = useState("");
  const [resultados, setResultados] = useState<ItemArquivo[] | null>(null);

  const [novaPasta, setNovaPasta] = useState<string | null>(null);
  const [renomeando, setRenomeando] = useState<Alvo | null>(null);
  const [movendo, setMovendo] = useState<Alvo | null>(null);
  const [apagando, setApagando] = useState<(Alvo & { comConteudo?: boolean }) | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const importarRef = useRef<HTMLInputElement>(null);
  const substituirRef = useRef<HTMLInputElement>(null);
  const [substituindoId, setSubstituindoId] = useState<number | null>(null);

  const carregar = useCallback(
    async (id: number | null) => {
      if (!token) return;
      try {
        setConteudo(await getPastaArquivo(id, token));
        setErro("");
      } catch (err) {
        setErro(err instanceof Error ? err.message : "Erro ao carregar a pasta");
      }
    },
    [token],
  );

  useEffect(() => {
    if (!token) return;
    getPastaArquivo(pastaId, token)
      .then((c) => {
        setConteudo(c);
        setErro("");
      })
      .catch((err) => setErro(err instanceof Error ? err.message : "Erro ao carregar a pasta"));
  }, [pastaId, token]);

  useEffect(() => {
    if (!token) return;
    const termo = busca.trim();
    if (termo.length < 2) return;
    const timer = window.setTimeout(() => {
      buscarArquivo(termo, token)
        .then(setResultados)
        .catch(() => setResultados([]));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [busca, token]);
  const mostrandoBusca = busca.trim().length >= 2 && resultados !== null;

  async function agir(fn: () => Promise<unknown>, fallback: string) {
    if (!token) return;
    setOcupado(true);
    setErro("");
    try {
      await fn();
      await carregar(pastaId);
    } catch (err) {
      setErro(err instanceof Error ? err.message : fallback);
    } finally {
      setOcupado(false);
    }
  }

  async function aoImportar(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    e.target.value = "";
    if (!arquivo || pastaId == null || !token) return;
    await agir(() => importarItemArquivo(pastaId, arquivo, token), "Não foi possível importar");
  }

  async function aoSubstituir(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    e.target.value = "";
    const id = substituindoId;
    setSubstituindoId(null);
    if (!arquivo || id == null || !token) return;
    await agir(() => substituirItemArquivo(id, arquivo, token), "Não foi possível substituir");
  }

  /** Clique duplo num arquivo: PDF abre numa aba, o resto baixa. */
  function abrirArquivo(i: ItemArquivo) {
    if (!token) return;
    const acao = i.mime === "application/pdf" ? abrirItemArquivo(i, token) : baixarItemArquivo(i, token);
    acao.catch((err) => setErro(err instanceof Error ? err.message : "Não foi possível abrir"));
  }

  /** Apagar pasta: se tem conteúdo, a confirmação avisa e apaga tudo junto. */
  async function pedirApagarPasta(p: PastaArquivo) {
    if (!token) return;
    try {
      const c = await getPastaArquivo(p.id, token);
      setApagando({ tipo: "pasta", id: p.id, nome: p.nome, comConteudo: c.subpastas.length + c.itens.length > 0 });
    } catch {
      setApagando({ tipo: "pasta", id: p.id, nome: p.nome, comConteudo: true });
    }
  }

  // A página abre em aba própria (window.open na página de Contratos):
  // "Fechar arquivo" fecha a aba (o Atlas segue aberto na outra); se foi
  // aberta direto pela URL, volta pra Contratos. Chamava "Sair" e parecia
  // sair do Atlas (2026-10-07, a pedido).
  function sair() {
    window.close();
    window.setTimeout(() => navigate("/contratos"), 150);
  }

  const pastaAtual = conteudo?.pasta ?? null;
  const naRaiz = pastaId == null;
  const vazio = !!conteudo && conteudo.subpastas.length === 0 && conteudo.itens.length === 0;

  return (
    <Pagina ref={fundoRef}>
      <Particulas ref={canvasRef} />
      <Cabecalho>
        <CabecalhoGrade>
          <TituloCabecalho>Arquivo de Contratos</TituloCabecalho>
          <AcoesCabecalho>
            {usuario && <NomeUsuario>{usuario.nome}</NomeUsuario>}
            <BotaoCabecalho type="button" onClick={sair} title="Fecha esta aba; o Atlas continua aberto na outra">
              <X size={14} /> Fechar página
            </BotaoCabecalho>
          </AcoesCabecalho>
        </CabecalhoGrade>
      </Cabecalho>

      <Conteudo>
        <Descricao>
          Os documentos <strong>assinados e arquivados</strong> entram aqui sozinhos, por gestão e projeto, na data em
          que foram assinados. Contratos de fora do Atlas podem ser importados em qualquer pasta. Clique duas vezes
          para abrir.
        </Descricao>

        <Barra>
          <CampoBusca>
            <Search size={14} />
            <Entrada
              type="text"
              placeholder="Buscar arquivo pelo nome…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </CampoBusca>
          {!mostrandoBusca && (
            <>
              <Botao type="button" $tom="contorno" onClick={() => setNovaPasta("")} disabled={ocupado}>
                <FolderPlus size={15} /> Nova pasta
              </Botao>
              {!naRaiz && (
                <Botao type="button" $tom="primario" onClick={() => importarRef.current?.click()} disabled={ocupado}>
                  <Upload size={15} /> Importar arquivo
                </Botao>
              )}
            </>
          )}
          <input ref={importarRef} type="file" accept=".pdf,.docx,.doc,.png,.jpg,.jpeg" hidden onChange={aoImportar} />
          <input ref={substituirRef} type="file" accept=".pdf,.docx,.doc,.png,.jpg,.jpeg" hidden onChange={aoSubstituir} />
        </Barra>

        {erro && <Erro>{erro}</Erro>}

        {mostrandoBusca && resultados ? (
          <Lista>
            <CabecalhoLista>
              <span />
              <span>Resultados para “{busca.trim()}”</span>
              <span>Pasta</span>
              <span />
            </CabecalhoLista>
            {resultados.length === 0 ? (
              <Vazio style={{ padding: "0.75rem 0.9rem" }}>Nenhum arquivo com esse nome.</Vazio>
            ) : (
              resultados.map((i) => (
                <Item key={i.id} onDoubleClick={() => abrirArquivo(i)}>
                  <FileText size={16} />
                  <span className="nome" title={i.nome}>
                    {i.nome}
                  </span>
                  <span className="meta">{i.caminho}</span>
                  <Menu>
                    {(fechar) => (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            fechar();
                            setBusca("");
                            setPastaId(i.pasta_id);
                          }}
                        >
                          <FolderInput size={14} /> Abrir pasta
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            fechar();
                            abrirArquivo(i);
                          }}
                        >
                          <ExternalLink size={14} /> Abrir
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            fechar();
                            if (token) baixarItemArquivo(i, token).catch((err) => setErro(err.message));
                          }}
                        >
                          <Download size={14} /> Baixar
                        </button>
                      </>
                    )}
                  </Menu>
                </Item>
              ))
            )}
          </Lista>
        ) : (
          <>
            <Caminho aria-label="Caminho">
              {!naRaiz && (
                <button type="button" onClick={() => setPastaId(pastaAtual?.pai_id ?? null)} title="Voltar">
                  <ArrowLeft size={14} style={{ verticalAlign: "-3px" }} />
                </button>
              )}
              <button type="button" onClick={() => setPastaId(null)}>
                Arquivo
              </button>
              {conteudo?.caminho.map((p, i) => (
                <span key={p.id}>
                  {" / "}
                  {i === conteudo.caminho.length - 1 ? (
                    <strong>{p.nome}</strong>
                  ) : (
                    <button type="button" onClick={() => setPastaId(p.id)}>
                      {p.nome}
                    </button>
                  )}
                </span>
              ))}
            </Caminho>

            {novaPasta !== null && (
              <Cartao style={{ marginBottom: "1rem" }}>
                <p style={{ margin: "0 0 0.5rem", fontSize: "0.875rem", fontWeight: 500 }}>
                  Nova pasta {pastaAtual ? `em ${pastaAtual.nome}` : "na raiz"}
                </p>
                <LinhaInline style={{ marginTop: 0 }}>
                  <Entrada
                    autoFocus
                    placeholder="Nome da pasta"
                    value={novaPasta}
                    onChange={(e) => setNovaPasta(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") setNovaPasta(null);
                    }}
                    style={{ width: "18rem" }}
                  />
                  <Botao
                    type="button"
                    $tom="primario"
                    disabled={ocupado || !novaPasta.trim()}
                    onClick={() =>
                      agir(async () => {
                        await criarPastaArquivo(novaPasta.trim(), pastaId, token as string);
                        setNovaPasta(null);
                      }, "Não foi possível criar a pasta")
                    }
                  >
                    Criar
                  </Botao>
                  <Botao type="button" $tom="texto" onClick={() => setNovaPasta(null)}>
                    Cancelar
                  </Botao>
                </LinhaInline>
              </Cartao>
            )}

            <Lista>
              <CabecalhoLista>
                <span />
                <span>Nome</span>
                <span>Detalhes</span>
                <span />
              </CabecalhoLista>
              {!conteudo ? (
                <Vazio style={{ padding: "0.75rem 0.9rem" }}>Carregando…</Vazio>
              ) : vazio ? (
                <Vazio style={{ padding: "0.75rem 0.9rem" }}>
                  {naRaiz ? "Nenhuma gestão arquivada ainda." : "Pasta vazia. Importe um arquivo ou crie uma pasta."}
                </Vazio>
              ) : (
                <>
                  {conteudo.subpastas.map((p) => (
                    <Item
                      key={`p-${p.id}`}
                      $pasta
                      role="button"
                      tabIndex={0}
                      onDoubleClick={() => setPastaId(p.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") setPastaId(p.id);
                      }}
                    >
                      <Folder size={16} />
                      <span className="nome" title={p.nome}>
                        {p.nome}
                      </span>
                      <span className="meta">{p.semestre_id ? "gestão" : p.projeto_id ? "projeto" : "pasta"}</span>
                      <Menu>
                        {(fechar) => (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                fechar();
                                setPastaId(p.id);
                              }}
                            >
                              <FolderInput size={14} /> Abrir
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                fechar();
                                setRenomeando({ tipo: "pasta", id: p.id, nome: p.nome });
                              }}
                            >
                              <Pencil size={14} /> Renomear
                            </button>
                            {!p.automatica && (
                              <button
                                type="button"
                                onClick={() => {
                                  fechar();
                                  setMovendo({ tipo: "pasta", id: p.id, nome: p.nome });
                                }}
                              >
                                <FolderInput size={14} /> Mover
                              </button>
                            )}
                            <hr />
                            <button
                              type="button"
                              className="perigo"
                              onClick={() => {
                                fechar();
                                void pedirApagarPasta(p);
                              }}
                            >
                              <Trash2 size={14} /> Apagar
                            </button>
                          </>
                        )}
                      </Menu>
                    </Item>
                  ))}
                  {conteudo.itens.map((i) => {
                    const deletado = i.nome.startsWith(PREFIXO_DELETADO);
                    return (
                      <Item key={`i-${i.id}`} onDoubleClick={() => abrirArquivo(i)}>
                        <FileText size={16} />
                        <span className="nome" title={i.nome}>
                          {i.nome}{" "}
                          {deletado ? (
                            <Etiqueta $tom="atencao">apagado no kanban</Etiqueta>
                          ) : (
                            i.origem === "atlas" && <Etiqueta $tom="neutro">gerado no Atlas</Etiqueta>
                          )}
                        </span>
                        <span className="meta">
                          {tamanhoLegivel(i.tamanho)} · {dataCurta(i.atualizado_em)}
                        </span>
                        <Menu>
                          {(fechar) => (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  fechar();
                                  abrirArquivo(i);
                                }}
                              >
                                <ExternalLink size={14} /> Abrir
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  fechar();
                                  if (token) baixarItemArquivo(i, token).catch((err) => setErro(err.message));
                                }}
                              >
                                <Download size={14} /> Baixar
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  fechar();
                                  setRenomeando({ tipo: "item", id: i.id, nome: i.nome });
                                }}
                              >
                                <Pencil size={14} /> Renomear
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  fechar();
                                  setMovendo({ tipo: "item", id: i.id, nome: i.nome });
                                }}
                              >
                                <FolderInput size={14} /> Mover
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  fechar();
                                  setSubstituindoId(i.id);
                                  substituirRef.current?.click();
                                }}
                              >
                                <RefreshCw size={14} /> Substituir arquivo
                              </button>
                              <hr />
                              <button
                                type="button"
                                className="perigo"
                                onClick={() => {
                                  fechar();
                                  setApagando({ tipo: "item", id: i.id, nome: i.nome });
                                }}
                              >
                                <Trash2 size={14} /> Apagar
                              </button>
                            </>
                          )}
                        </Menu>
                      </Item>
                    );
                  })}
                </>
              )}
            </Lista>
          </>
        )}
      </Conteudo>

      {renomeando && (
        <Veu onMouseDown={() => setRenomeando(null)}>
          <Caixa onMouseDown={(e) => e.stopPropagation()}>
            <h3>Renomear {renomeando.tipo === "pasta" ? "pasta" : "arquivo"}</h3>
            <Entrada
              autoFocus
              value={renomeando.nome}
              onChange={(e) => setRenomeando({ ...renomeando, nome: e.target.value })}
            />
            <LinhaInline>
              <Botao
                type="button"
                $tom="primario"
                disabled={ocupado || !renomeando.nome.trim()}
                onClick={() =>
                  agir(async () => {
                    if (renomeando.tipo === "pasta") await renomearPastaArquivo(renomeando.id, renomeando.nome.trim(), token as string);
                    else await renomearItemArquivo(renomeando.id, renomeando.nome.trim(), token as string);
                    setRenomeando(null);
                  }, "Não foi possível renomear")
                }
              >
                Salvar
              </Botao>
              <Botao type="button" $tom="texto" onClick={() => setRenomeando(null)}>
                Cancelar
              </Botao>
            </LinhaInline>
          </Caixa>
        </Veu>
      )}

      {movendo && token && (
        <EscolherPasta
          titulo={`Mover "${movendo.nome}" para…`}
          token={token}
          excluirPastaId={movendo.tipo === "pasta" ? movendo.id : null}
          permitirRaiz={movendo.tipo === "pasta"}
          onCancelar={() => setMovendo(null)}
          onEscolher={(destino) =>
            agir(async () => {
              if (movendo.tipo === "pasta") await moverPastaArquivo(movendo.id, destino, token);
              else if (destino != null) await moverItemArquivo(movendo.id, destino, token);
              setMovendo(null);
            }, "Não foi possível mover")
          }
        />
      )}

      {apagando && (
        <ConfirmarModal
          titulo={apagando.tipo === "pasta" ? "Apagar pasta" : "Apagar arquivo"}
          mensagem={
            apagando.tipo === "pasta"
              ? apagando.comConteudo
                ? `A pasta "${apagando.nome}" tem arquivos ou pastas dentro. Apagar a pasta e tudo que está nela? Essa ação não pode ser desfeita.`
                : `Apagar a pasta "${apagando.nome}"?`
              : `Apagar "${apagando.nome}" do arquivo? Essa ação não pode ser desfeita.`
          }
          rotuloConfirmar={apagando.tipo === "pasta" && apagando.comConteudo ? "Apagar tudo" : "Apagar"}
          rotuloProcessando="Apagando…"
          onCancelar={() => setApagando(null)}
          onConfirmar={async () => {
            if (!token) return;
            if (apagando.tipo === "pasta") await apagarPastaArquivo(apagando.id, token, !!apagando.comConteudo);
            else await apagarItemArquivo(apagando.id, token);
            setApagando(null);
            await carregar(pastaId);
          }}
        />
      )}
    </Pagina>
  );
}

/** Navega pelas pastas pra escolher um destino. */
function EscolherPasta({
  titulo,
  token,
  excluirPastaId,
  permitirRaiz,
  onEscolher,
  onCancelar,
}: {
  titulo: string;
  token: string;
  excluirPastaId: number | null;
  permitirRaiz: boolean;
  onEscolher: (pastaId: number | null) => void;
  onCancelar: () => void;
}) {
  const [atual, setAtual] = useState<number | null>(null);
  const [conteudo, setConteudo] = useState<ConteudoPasta | null>(null);

  useEffect(() => {
    getPastaArquivo(atual, token)
      .then(setConteudo)
      .catch(() => setConteudo(null));
  }, [atual, token]);

  const subpastas: PastaArquivo[] = (conteudo?.subpastas ?? []).filter((p) => p.id !== excluirPastaId);

  return (
    <Veu onMouseDown={onCancelar}>
      <Caixa onMouseDown={(e) => e.stopPropagation()}>
        <h3>{titulo}</h3>
        <p>{["Arquivo", ...(conteudo?.caminho.map((p) => p.nome) ?? [])].join(" / ")}</p>
        <ListaEscolha>
          {atual !== null && (
            <button type="button" onClick={() => setAtual(conteudo?.pasta?.pai_id ?? null)}>
              <ArrowLeft size={14} /> Voltar
            </button>
          )}
          {subpastas.map((p) => (
            <button key={p.id} type="button" onClick={() => setAtual(p.id)}>
              <Folder size={14} /> {p.nome}
            </button>
          ))}
          {subpastas.length === 0 && <Vazio>Sem subpastas aqui.</Vazio>}
        </ListaEscolha>
        <LinhaInline>
          <Botao type="button" $tom="primario" disabled={atual === null && !permitirRaiz} onClick={() => onEscolher(atual)}>
            Mover para cá
          </Botao>
          <Botao type="button" $tom="texto" onClick={onCancelar}>
            Cancelar
          </Botao>
        </LinhaInline>
      </Caixa>
    </Veu>
  );
}
