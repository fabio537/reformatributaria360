import type { ResultadoSimulacao } from "@/lib/tax-engine";

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

const regimeTributarioLabels: Record<string, string> = {
  simples_nacional: "Simples Nacional",
  lucro_presumido: "Lucro Presumido",
  lucro_real: "Lucro Real",
};

export interface RelatorioContextoProduto {
  tipo: "produto";
  ncm: string;
  descricao: string;
  regime: string;
  valor_mensal: number;
  aliquotas_atuais: { pis: number; cofins: number; ipi: number; icms: number };
  insumos_anuais: number;
}

export type RelatorioContexto = RelatorioContextoProduto;

export async function gerarRelatorioPDF(
  resultado: ResultadoSimulacao,
  contexto?: RelatorioContexto
): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  const titulo = contexto?.tipo === "produto"
    ? "Relatório de Simulação por Produto"
    : "Relatório de Simulação Tributária";
  doc.text(titulo, pageWidth / 2, y, { align: "center" });
  y += 8;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Reforma Tributária — EC 132/2023, LC 214/2025", pageWidth / 2, y, { align: "center" });
  y += 5;
  doc.text(`Gerado em: ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}`, pageWidth / 2, y, { align: "center" });
  y += 10;

  doc.setDrawColor(100);
  doc.line(14, y, pageWidth - 14, y);
  y += 8;

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(contexto?.tipo === "produto" ? "Identificação do Produto" : "Dados da Empresa", 14, y);
  y += 7;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const dados: [string, string][] = contexto?.tipo === "produto"
    ? [
        ["NCM", contexto.ncm],
        ["Descrição", contexto.descricao],
        ["Regime aplicado", regimeTributarioLabels[contexto.regime] || contexto.regime],
        ["Valor mensal", formatBRL(contexto.valor_mensal)],
        ["Valor de venda anual", formatBRL(contexto.valor_mensal * 12)],
        ["Insumos anuais (bruto)", formatBRL(contexto.insumos_anuais)],
        [
          "Alíquotas atuais",
          `PIS ${contexto.aliquotas_atuais.pis}% • COFINS ${contexto.aliquotas_atuais.cofins}% • IPI ${contexto.aliquotas_atuais.ipi}% • ICMS ${contexto.aliquotas_atuais.icms}%`,
        ],
      ]
    : [
        ["Razão Social", resultado.empresa],
        ["CNPJ", resultado.cnpj],
        ["Regime Tributário", regimeTributarioLabels[resultado.regime_tributario] || resultado.regime_tributario],
        ["Faturamento Anual", formatBRL(resultado.faturamento_anual)],
      ];
  dados.forEach(([label, value]) => {
    doc.setFont("helvetica", "bold");
    doc.text(`${label}: `, 14, y);
    doc.setFont("helvetica", "normal");
    const wrapped = doc.splitTextToSize(value, pageWidth - 70);
    doc.text(wrapped, 60, y);
    y += 5 * Math.max(1, wrapped.length);
  });
  y += 5;

  // Resultado por item + Resultado financeiro por ano (apenas relatório de produto)
  if (contexto?.tipo === "produto") {
    const vendaSemIpi = contexto.valor_mensal * 12;
    const qtdAnual = 12; // 1 unid./mês como referência
    const sufixo = "/unid.";

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Resultado por Item", 14, y);
    y += 7;

    autoTable(doc, {
      startY: y,
      head: [["Ano", `Preço${sufixo}`, `Impostos${sufixo}`, "Alíq. efet.", `Insumos${sufixo}`, `Margem${sufixo}`, "Margem %"]],
      body: resultado.anos.map((a) => {
        // IPI por fora: somado ao preço de venda no ano em que incide
        const vendaComIpi = vendaSemIpi + a.tributos_atuais_bruto.ipi;
        const precoUnit = vendaComIpi / qtdAnual;
        const insumosLiqAnual = Math.max(0, contexto.insumos_anuais - (a.creditos.creditos_atuais + a.creditos.creditos_ibs_cbs));
        const impUnit = a.carga_total / qtdAnual;
        const insUnit = insumosLiqAnual / qtdAnual;
        const margemUnit = precoUnit - impUnit - insUnit;
        const aliqEf = vendaComIpi > 0 ? (a.carga_total / vendaComIpi) * 100 : 0;
        const margemPct = precoUnit > 0 ? (margemUnit / precoUnit) * 100 : 0;
        return [
          String(a.ano),
          formatBRL(precoUnit),
          formatBRL(impUnit),
          `${aliqEf.toFixed(1)}%`,
          formatBRL(insUnit),
          formatBRL(margemUnit),
          `${margemPct.toFixed(1)}%`,
        ];
      }),
      theme: "grid",
      headStyles: { fillColor: [41, 98, 255], textColor: 255 },
      styles: { fontSize: 8 },
      margin: { left: 14, right: 14 },
    });

    y = (doc as any).lastAutoTable.finalY + 10;

    if (y > 230) { doc.addPage(); y = 20; }
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Resultado Anual Consolidado (referência)", 14, y);
    y += 7;

    autoTable(doc, {
      startY: y,
      head: [["Ano", "Valor de venda", "Impostos", "Insumos (líq.)", "Margem (R$)", "Margem (%)"]],
      body: resultado.anos.map((a) => {
        const insumosLiq = Math.max(0, contexto.insumos_anuais - (a.creditos.creditos_atuais + a.creditos.creditos_ibs_cbs));
        const margem = venda - a.carga_total - insumosLiq;
        const margemPct = venda > 0 ? (margem / venda) * 100 : 0;
        return [
          String(a.ano),
          formatBRL(venda),
          formatBRL(a.carga_total),
          formatBRL(insumosLiq),
          formatBRL(margem),
          `${margemPct.toFixed(1)}%`,
        ];
      }),
      theme: "grid",
      headStyles: { fillColor: [41, 98, 255], textColor: 255 },
      styles: { fontSize: 8 },
      margin: { left: 14, right: 14 },
    });

    y = (doc as any).lastAutoTable.finalY + 10;
  }


  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Resumo Comparativo", 14, y);
  y += 7;

  autoTable(doc, {
    startY: y,
    head: [["Indicador", "Valor"]],
    body: [
      ["Carga Tributária Atual (anual)", formatBRL(resultado.carga_atual_anual)],
      ["Créditos Sistema Atual (anual)", formatBRL(resultado.creditos_atuais_anual)],
      ["Carga IBS/CBS em 2033 (anual)", formatBRL(resultado.carga_nova_anual)],
      ["Créditos IBS/CBS (anual)", formatBRL(resultado.creditos_novos_anual)],
      ["Variação em 2033", (() => {
        const ultimo = resultado.anos[resultado.anos.length - 1];
        return `${ultimo.variacao >= 0 ? "+" : ""}${ultimo.variacao_pct.toFixed(1)}% (${formatBRL(Math.abs(ultimo.variacao))})`;
      })()],
    ],
    theme: "grid",
    headStyles: { fillColor: [41, 98, 255], textColor: 255 },
    styles: { fontSize: 9 },
    margin: { left: 14, right: 14 },
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Detalhamento Anual — Transição 2026-2033", 14, y);
  y += 7;

  autoTable(doc, {
    startY: y,
    head: [["Ano", "Fase", "Trib. Atuais", "IBS/CBS", "Créditos", "Carga Total", "Variação"]],
    body: resultado.anos.map((a) => [
      String(a.ano),
      a.fase,
      formatBRL(a.tributos_atuais_bruto.total),
      formatBRL(a.ibs_cbs_bruto.total),
      formatBRL(a.creditos.creditos_atuais + a.creditos.creditos_ibs_cbs),
      formatBRL(a.carga_total),
      `${a.variacao >= 0 ? "+" : ""}${a.variacao_pct.toFixed(1)}%`,
    ]),
    theme: "grid",
    headStyles: { fillColor: [41, 98, 255], textColor: 255 },
    styles: { fontSize: 8 },
    columnStyles: { 0: { cellWidth: 15 }, 1: { cellWidth: 35 } },
    margin: { left: 14, right: 14 },
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  if (y > 230) { doc.addPage(); y = 20; }

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Composição Tributária por Ano", 14, y);
  y += 7;

  autoTable(doc, {
    startY: y,
    head: [["Ano", "PIS", "COFINS", "IPI", "ICMS", "ISS", "IRPJ", "CSLL", "DAS", "CBS", "IBS", "IS"]],
    body: resultado.anos.map((a) => [
      String(a.ano),
      formatBRL(a.tributos_atuais_bruto.pis),
      formatBRL(a.tributos_atuais_bruto.cofins),
      formatBRL(a.tributos_atuais_bruto.ipi),
      formatBRL(a.tributos_atuais_bruto.icms),
      formatBRL(a.tributos_atuais_bruto.iss),
      formatBRL(a.tributos_atuais_bruto.irpj),
      formatBRL(a.tributos_atuais_bruto.csll),
      formatBRL(a.tributos_atuais_bruto.das),
      formatBRL(a.ibs_cbs_bruto.cbs),
      formatBRL(a.ibs_cbs_bruto.ibs),
      formatBRL(a.ibs_cbs_bruto.is),
    ]),
    theme: "grid",
    headStyles: { fillColor: [41, 98, 255], textColor: 255 },
    styles: { fontSize: 7 },
    margin: { left: 14, right: 14 },
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  if (resultado.alertas.length > 0) {
    if (y > 230) { doc.addPage(); y = 20; }
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Observações e Alertas", 14, y);
    y += 7;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    resultado.alertas.forEach((alerta) => {
      if (y > 270) { doc.addPage(); y = 20; }
      const lines = doc.splitTextToSize(`• ${alerta}`, pageWidth - 28);
      doc.text(lines, 14, y);
      y += lines.length * 4 + 3;
    });
  }

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(150);
    doc.text(
      `Reforma Tributária 360 — Página ${i} de ${totalPages}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: "center" }
    );
    doc.setTextColor(0);
  }

  doc.save(`relatorio-simulacao-${resultado.empresa.replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().slice(0, 10)}.pdf`);
}
