import { PageCard, PageCardContent, PageCardHeader, PageCardTitle } from "@/styles/page.styled";
import { FieldInput } from "@/pages/Bancas.styled";
import { AssistenteGrid, AvisoCaixa, ListaSimples, Nota, SecaoTitulo, Sugestao, Sugestoes } from "./Central.styled";

const SUGESTOES = [
  "Estou começando uma análise mercadológica, focada em concorrência, no setor de saúde digital em São Paulo. O que a Júnior já fez de parecido?",
  "Quero usar um case internacional como benchmark. Como a Júnior já fez isso?",
  "Meu cliente tem duas empresas do mesmo dono com regimes tributários diferentes. Já tivemos um caso assim?",
  "Que fontes a Júnior já usou para dimensionar mercado em saúde?",
];

/**
 * O Assistente da Central: a casca está pronta, o modelo ainda não está
 * ligado (decisão de 2026-10-29: fica para depois das fichas existirem).
 * Ele consulta projetos e fichas da Insper Jr. e sempre mostra a fonte.
 */
export function Assistente() {
  return (
    <AssistenteGrid>
      <PageCard>
        <PageCardHeader>
          <PageCardTitle>Assistente da Central</PageCardTitle>
        </PageCardHeader>
        <PageCardContent>
          <Nota style={{ marginTop: 0, marginBottom: "0.75rem" }}>
            Consulta projetos e fichas da Insper Jr. e sempre mostra a fonte. Ajuda a encontrar projetos parecidos,
            metodologias e fontes para direcionar o seu projeto. Não monta o projeto.
          </Nota>
          <AvisoCaixa $tom="atencao" style={{ marginBottom: "0.75rem" }}>
            <strong>Ainda não está ligado.</strong> O assistente entra quando a Tool Box tiver fichas publicadas para
            consultar. As perguntas abaixo mostram o que ele vai responder.
          </AvisoCaixa>
          <Sugestoes>
            {SUGESTOES.map((s) => (
              <Sugestao key={s} type="button" disabled>
                {s}
              </Sugestao>
            ))}
          </Sugestoes>
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
            <FieldInput disabled placeholder="Pergunte sobre projetos, metodologias ou fontes…" aria-label="Pergunta" style={{ flex: 1 }} />
          </div>
        </PageCardContent>
      </PageCard>
      <PageCard>
        <PageCardContent style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div>
            <SecaoTitulo style={{ fontSize: "0.875rem" }}>O que ele consulta</SecaoTitulo>
            <ListaSimples style={{ marginTop: "0.375rem" }}>
              <li>Projetos de referência</li>
              <li>Fichas da Tool Box</li>
              <li>Playbook de Escopos</li>
              <li>Acervo de projetos das gestões anteriores</li>
            </ListaSimples>
            <Nota>Fichas e projetos validados têm prioridade nas respostas.</Nota>
          </div>
          <div>
            <SecaoTitulo style={{ fontSize: "0.875rem" }}>Como ele responde</SecaoTitulo>
            <ListaSimples style={{ marginTop: "0.375rem" }}>
              <li>Indica projetos parecidos e por quê</li>
              <li>Mostra metodologias e fontes já usadas</li>
              <li>Aponta os cuidados registrados nas fichas</li>
              <li>Diz com quem conversar</li>
              <li>Cita a fonte de cada informação</li>
              <li>Não faz a análise nem escreve slides</li>
              <li>Não inventa: se não houver caso parecido, diz que não há</li>
            </ListaSimples>
          </div>
          <div>
            <SecaoTitulo style={{ fontSize: "0.875rem" }}>Por que ele só direciona</SecaoTitulo>
            <Nota>
              Os tokens deste chat são pagos pela Insper Jr. Para pesquisa preliminar pesada, use a base de contexto
              no seu próprio assistente.
            </Nota>
          </div>
        </PageCardContent>
      </PageCard>
    </AssistenteGrid>
  );
}
