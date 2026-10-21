/**
 * Export da aba Histórico de projetos — CSV e PDF.
 *
 * ⚠ O PDF é montado por DADOS (jsPDF texto), não rasterizando a tela como o
 * `components/cronograma-pintado/exportar.ts`. Aquele fixa fundo branco, e a
 * tabela do histórico usa as cores do tema: no modo escuro o texto claro
 * sairia invisível sobre o branco. Desenhando o texto direto, a saída
 * independe do tema — preto sobre branco sempre.
 *
 * O jsPDF entra por import dinâmico, dentro do handler: são ~350 KB que a
 * primeira pintura da aba não deve carregar.
 */

import type { HistoricoProjeto } from "@/lib/monitoramento";
import { ROTULO_STATUS, formatarData } from "@/lib/projetos";
import { hojeEmBrasilia } from "@/lib/fuso";

/** Uma faixa da tabela: quando agrupada, o semestre e seus projetos; quando
 *  não, um bloco único com `titulo` nulo. */
export interface SecaoHistorico {
  titulo: string | null;
  itens: HistoricoProjeto[];
}

function nomeArquivo(extensao: string): string {
  const hoje = hojeEmBrasilia();
  return `historico-projetos-${hoje}.${extensao}`;
}

function baixar(blob: Blob, nome: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nome;
  link.click();
  URL.revokeObjectURL(url);
}

function situacao(p: HistoricoProjeto): string {
  const base = ROTULO_STATUS[p.status];
  return p.arquivado ? `${base} (arquivado)` : base;
}

/* ------------------------------------------------------------------ CSV */

/** Uma célula CSV: entre aspas, com as aspas internas duplicadas (RFC 4180). */
function celula(valor: string | number | null): string {
  const texto = valor == null ? "" : String(valor);
  return `"${texto.replace(/"/g, '""')}"`;
}

const CABECALHO_CSV = [
  "Projeto",
  "Cliente",
  "Frentes",
  "Coordenador",
  "Semestre",
  "Kickoff",
  "Encerrado",
  "Duração (dias)",
  "Situação",
  "Arquivado",
];

export function exportarHistoricoCSV(itens: HistoricoProjeto[]): void {
  const linhas = itens.map((p) =>
    [
      celula(p.nome),
      celula(p.cliente),
      celula(p.frentes.join(", ")),
      celula(p.coordenador),
      celula(p.semestre),
      celula(formatarData(p.data_kickoff)),
      celula(formatarData(p.encerrado_em)),
      celula(p.duracao_dias),
      celula(situacao(p)),
      celula(p.arquivado ? "Sim" : "Não"),
    ].join(";"),
  );

  // Separador `;` e BOM: é o que o Excel em português abre com os acentos e as
  // colunas certas sem pedir para importar.
  const conteudo = "﻿" + [CABECALHO_CSV.map(celula).join(";"), ...linhas].join("\r\n");
  baixar(new Blob([conteudo], { type: "text/csv;charset=utf-8;" }), nomeArquivo("csv"));
}

/* ------------------------------------------------------------------ PDF */

interface ColunaPdf {
  label: string;
  x: number;
  w: number;
  alinhar?: "left" | "right";
}

const COLUNAS: ColunaPdf[] = [
  { label: "Projeto", x: 40, w: 168 },
  { label: "Coordenador", x: 212, w: 96 },
  { label: "Semestre", x: 312, w: 52 },
  { label: "Encerrado", x: 368, w: 66 },
  { label: "Dias", x: 438, w: 38, alinhar: "right" },
  { label: "Situação", x: 480, w: 75 },
];

export async function exportarHistoricoPDF(secoes: SecaoHistorico[]): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
  const largura = pdf.internal.pageSize.getWidth();
  const altura = pdf.internal.pageSize.getHeight();
  const margem = 40;
  const rodapeY = altura - 28;

  const total = secoes.reduce((n, s) => n + s.itens.length, 0);
  let pagina = 1;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(15);
  pdf.text("Histórico de projetos", margem, margem + 4);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(120);
  pdf.text(
    `${total} ${total === 1 ? "projeto encerrado" : "projetos encerrados"} · gerado em ${formatarData(new Date().toISOString())}`,
    margem,
    margem + 20,
  );
  pdf.setTextColor(20);

  let y = margem + 42;

  function rodape(): void {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(150);
    pdf.text(`Página ${pagina}`, largura - margem, rodapeY, { align: "right" });
    pdf.setTextColor(20);
  }

  function cabecalhoTabela(): void {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.setTextColor(110);
    for (const c of COLUNAS) {
      pdf.text(c.label.toUpperCase(), c.alinhar === "right" ? c.x + c.w : c.x, y, {
        align: c.alinhar ?? "left",
      });
    }
    pdf.setTextColor(20);
    y += 6;
    pdf.setDrawColor(210);
    pdf.line(margem, y, largura - margem, y);
    y += 12;
  }

  function quebrarSePreciso(espaco: number): void {
    if (y + espaco <= rodapeY - 6) return;
    rodape();
    pdf.addPage();
    pagina += 1;
    y = margem;
    cabecalhoTabela();
  }

  function corta(texto: string, larguraCol: number): string {
    pdf.setFontSize(8.5);
    let atual = texto;
    while (atual.length > 1 && pdf.getTextWidth(atual) > larguraCol - 4) {
      atual = atual.slice(0, -1);
    }
    return atual === texto ? texto : `${atual.slice(0, -1)}…`;
  }

  cabecalhoTabela();

  for (const secao of secoes) {
    if (secao.titulo) {
      quebrarSePreciso(22);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.text(
        `${secao.titulo}  ·  ${secao.itens.length} ${secao.itens.length === 1 ? "projeto" : "projetos"}`,
        margem,
        y,
      );
      y += 15;
    }

    for (const p of secao.itens) {
      quebrarSePreciso(16);
      const valores: Record<string, string> = {
        Projeto: corta(p.nome, COLUNAS[0].w),
        Coordenador: corta(p.coordenador ?? "—", COLUNAS[1].w),
        Semestre: p.semestre ?? "—",
        Encerrado: formatarData(p.encerrado_em),
        Dias: p.duracao_dias != null ? String(p.duracao_dias) : "—",
        Situação: corta(situacao(p), COLUNAS[5].w),
      };
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8.5);
      for (const c of COLUNAS) {
        pdf.text(valores[c.label], c.alinhar === "right" ? c.x + c.w : c.x, y, {
          align: c.alinhar ?? "left",
        });
      }
      y += 16;
    }
  }

  rodape();
  pdf.save(nomeArquivo("pdf"));
}
