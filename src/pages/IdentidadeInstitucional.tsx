import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  atualizarIdentidadeInstitucional,
  baixarModeloContratual,
  enviarModeloContratual,
  getIdentidadeInstitucional,
  getModelosContratuais,
  removerModeloContratual,
} from "@/lib/contratos";
import type { IdentidadeInstitucional as IdentidadeInstitucionalType, ModeloContratual } from "@/types/contratos";
import {
  ErrorText,
  PageButton,
  PageButtonSm,
  PageCard,
  PageCardContent,
  PageCardHeader,
  PageCardTitle,
  PageLoadingBlock,
  PageStack,
} from "@/styles/page.styled";
import { FieldGroup, FieldLabel, FieldInput } from "./Bancas.styled";
import { FormGrid, FormSecoes, FormSecaoTitulo } from "./projetos/ProjetoContratos.styled";
import { FUSO, paraDataUtc } from "@/lib/fuso";

const CAMPOS_PRESIDENTE: { campo: keyof IdentidadeInstitucionalType; label: string }[] = [
  { campo: "presidente_nome", label: "Nome" },
  { campo: "presidente_cpf", label: "CPF" },
  { campo: "presidente_rg", label: "RG" },
  { campo: "presidente_orgao_emissor", label: "Órgão emissor" },
  { campo: "presidente_estado_civil", label: "Estado civil" },
  { campo: "presidente_nacionalidade", label: "Nacionalidade" },
  { campo: "presidente_profissao", label: "Profissão" },
];

/** Endereço em partes — o documento gerado precisa da frase inteira, mas
 *  quem cadastra digita rua/número/etc. separados (backend junta em
 *  `endereco_presidente_completo`). */
const CAMPOS_ENDERECO: { campo: keyof IdentidadeInstitucionalType; label: string }[] = [
  { campo: "presidente_endereco_rua", label: "Rua" },
  { campo: "presidente_endereco_numero", label: "Número" },
  { campo: "presidente_endereco_complemento", label: "Complemento (opcional)" },
  { campo: "presidente_endereco_bairro", label: "Bairro" },
  { campo: "presidente_endereco_cidade", label: "Cidade" },
  { campo: "presidente_endereco_estado", label: "Estado (UF)" },
  { campo: "presidente_endereco_cep", label: "CEP" },
];

function camposTestemunha(n: 1 | 2): { campo: keyof IdentidadeInstitucionalType; label: string }[] {
  return [
    { campo: `testemunha${n}_nome` as const, label: "Nome" },
    { campo: `testemunha${n}_cpf` as const, label: "CPF" },
  ];
}

/**
 * ⭐ 2026-09-18 — presidente + as duas testemunhas fixas da Insper Jr,
 * usadas em todo documento jurídico gerado (`render_template.py`). Muda a
 * cada troca de gestão. Gate: `eh_diretoria_de_projetos` (`RequirePosicao`
 * no `App.tsx`) — o equivalente mais próximo do "admin" do sistema antigo.
 */
export function IdentidadeInstitucional() {
  const { token } = useAuth();
  const [identidade, setIdentidade] = useState<IdentidadeInstitucionalType | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [salvo, setSalvo] = useState(false);

  useEffect(() => {
    if (!token) return;
    getIdentidadeInstitucional(token)
      .then(setIdentidade)
      .catch((err) => setErro(err instanceof Error ? err.message : "Erro ao carregar"))
      .finally(() => setCarregando(false));
  }, [token]);

  function set(campo: keyof IdentidadeInstitucionalType, valor: string) {
    setIdentidade((atual) => (atual ? { ...atual, [campo]: valor } : atual));
    setSalvo(false);
  }

  async function handleSalvar() {
    if (!identidade || !token) return;
    setSalvando(true);
    setErro("");
    try {
      const atualizado = await atualizarIdentidadeInstitucional(identidade, token);
      setIdentidade(atualizado);
      setSalvo(true);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) return <PageLoadingBlock />;
  if (!identidade) return <ErrorText>{erro || "Identidade institucional não configurada."}</ErrorText>;

  return (
    <PageStack>
      <PageCard>
        <PageCardHeader>
          <PageCardTitle>Identidade Institucional</PageCardTitle>
        </PageCardHeader>
        <PageCardContent>
          <p style={{ marginTop: 0, fontSize: "0.85rem", color: "var(--muted-foreground, inherit)" }}>
            Quem assina pela Insper Jr e as duas testemunhas fixas impressas em todo documento jurídico
            gerado. Atualize a cada troca de gestão.
          </p>

          {erro && <ErrorText>{erro}</ErrorText>}

          <FormSecoes>
            <div>
              <FormSecaoTitulo>Presidente</FormSecaoTitulo>
              <FormGrid $colunas={2}>
                {CAMPOS_PRESIDENTE.map(({ campo, label }) => (
                  <FieldGroup key={campo}>
                    <FieldLabel htmlFor={campo}>{label}</FieldLabel>
                    <FieldInput
                      id={campo}
                      value={identidade[campo] ?? ""}
                      onChange={(e) => set(campo, e.target.value)}
                    />
                  </FieldGroup>
                ))}
              </FormGrid>
              <FormGrid $colunas={2} style={{ marginTop: "0.75rem" }}>
                {CAMPOS_ENDERECO.map(({ campo, label }) => (
                  <FieldGroup key={campo}>
                    <FieldLabel htmlFor={campo}>{label}</FieldLabel>
                    <FieldInput
                      id={campo}
                      value={identidade[campo] ?? ""}
                      onChange={(e) => set(campo, e.target.value)}
                    />
                  </FieldGroup>
                ))}
              </FormGrid>
            </div>

            <div>
              <FormSecaoTitulo>Testemunha 1 (Insper Jr, sempre impressa)</FormSecaoTitulo>
              <FormGrid $colunas={2}>
                {camposTestemunha(1).map(({ campo, label }) => (
                  <FieldGroup key={campo}>
                    <FieldLabel htmlFor={campo}>{label}</FieldLabel>
                    <FieldInput
                      id={campo}
                      value={identidade[campo] ?? ""}
                      onChange={(e) => set(campo, e.target.value)}
                    />
                  </FieldGroup>
                ))}
              </FormGrid>
            </div>

            <div>
              <FormSecaoTitulo>Testemunha 2 (padrão do contratante / 2ª da Insper Jr)</FormSecaoTitulo>
              <FormGrid $colunas={2}>
                {camposTestemunha(2).map(({ campo, label }) => (
                  <FieldGroup key={campo}>
                    <FieldLabel htmlFor={campo}>{label}</FieldLabel>
                    <FieldInput
                      id={campo}
                      value={identidade[campo] ?? ""}
                      onChange={(e) => set(campo, e.target.value)}
                    />
                  </FieldGroup>
                ))}
              </FormGrid>
            </div>
          </FormSecoes>

          <PageButton type="button" disabled={salvando} onClick={handleSalvar} style={{ marginTop: "1rem" }}>
            {salvando ? "Salvando..." : salvo ? "Salvo!" : "Salvar"}
          </PageButton>
        </PageCardContent>
      </PageCard>

      {token && <ModelosContratuaisCard token={token} />}
    </PageStack>
  );
}

/**
 * Modelos base dos documentos jurídicos (2026-10-07, a pedido): baixar o que
 * está em uso, enviar um .docx novo no lugar, voltar ao padrão. O backend
 * só aceita um modelo que use os mesmos campos do padrão; o texto em volta
 * pode mudar à vontade.
 */
function ModelosContratuaisCard({ token }: { token: string }) {
  const [modelos, setModelos] = useState<ModeloContratual[] | null>(null);
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [tipoEnviando, setTipoEnviando] = useState<string | null>(null);

  useEffect(() => {
    getModelosContratuais(token)
      .then(setModelos)
      .catch((err) => setErro(err instanceof Error ? err.message : "Erro ao carregar os modelos"));
  }, [token]);

  async function agir(tipo: string, fn: () => Promise<unknown>, fallback: string) {
    setOcupado(tipo);
    setErro("");
    try {
      await fn();
      setModelos(await getModelosContratuais(token));
    } catch (err) {
      setErro(err instanceof Error ? err.message : fallback);
    } finally {
      setOcupado(null);
    }
  }

  function escolherArquivo(tipo: string) {
    setTipoEnviando(tipo);
    inputRef.current?.click();
  }

  async function aoEscolherArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    e.target.value = "";
    if (!arquivo || !tipoEnviando) return;
    const tipo = tipoEnviando;
    setTipoEnviando(null);
    await agir(tipo, () => enviarModeloContratual(tipo, arquivo, token), "Não foi possível enviar o modelo");
  }

  return (
    <PageCard>
      <PageCardHeader>
        <PageCardTitle>Modelos base dos contratos</PageCardTitle>
      </PageCardHeader>
      <PageCardContent>
        <p style={{ margin: "0 0 1rem", fontSize: "0.85rem", color: "var(--muted-foreground, inherit)" }}>
          O .docx que o sistema preenche ao gerar cada documento. Baixe o atual, edite o texto e envie no lugar.
          Os campos preenchidos automaticamente (como <code>{"{{ contratante.razao_social }}"}</code>) precisam
          continuar iguais; o que fica em volta pode mudar à vontade.
        </p>
        <input ref={inputRef} type="file" accept=".docx" hidden onChange={aoEscolherArquivo} />
        {erro && <ErrorText>{erro}</ErrorText>}
        {!modelos ? (
          <PageLoadingBlock />
        ) : (
          <FormSecoes>
            {modelos.map((m) => (
              <div key={m.tipo} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.5rem" }}>
                <div style={{ flex: "1 1 16rem", fontSize: "0.9rem" }}>
                  <strong>{m.rotulo}</strong>
                  <div style={{ fontSize: "0.8rem", color: "var(--muted-foreground, inherit)" }}>
                    {m.personalizado
                      ? `${m.arquivo_nome}, enviado${m.enviado_por_nome ? ` por ${m.enviado_por_nome}` : ""}${
                          m.enviado_em ? ` em ${paraDataUtc(m.enviado_em).toLocaleDateString("pt-BR", { timeZone: FUSO })}` : ""
                        }`
                      : `padrão do sistema (${m.arquivo_padrao})`}
                  </div>
                </div>
                <PageButtonSm
                  type="button"
                  $variant="outline"
                  disabled={ocupado === m.tipo}
                  onClick={() => baixarModeloContratual(m.tipo, m.arquivo_nome, token).catch((err) => setErro(err.message))}
                >
                  Baixar atual
                </PageButtonSm>
                <PageButtonSm type="button" disabled={ocupado === m.tipo} onClick={() => escolherArquivo(m.tipo)}>
                  {ocupado === m.tipo ? "Enviando..." : "Enviar novo .docx"}
                </PageButtonSm>
                {m.personalizado && (
                  <PageButtonSm
                    type="button"
                    $variant="ghost"
                    disabled={ocupado === m.tipo}
                    onClick={() => agir(m.tipo, () => removerModeloContratual(m.tipo, token), "Não foi possível voltar ao padrão")}
                  >
                    Voltar ao padrão
                  </PageButtonSm>
                )}
              </div>
            ))}
          </FormSecoes>
        )}
      </PageCardContent>
    </PageCard>
  );
}
