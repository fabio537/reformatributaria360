import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLinkedEmpresa } from "@/hooks/useLinkedEmpresa";
import {
  calcularAnaliseComparativa,
  CBS_2027_DEFAULT,
  IBS_2027_DEFAULT,
  type AnaliseComparativaResultado,
  type CompetenciaFiscalRow,
} from "@/lib/analise-comparativa-engine";
import type { AnexoSN } from "@/lib/reforma";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BadgeRow,
  CenarioBreakdownCard,
  ComparativoFooter,
} from "@/components/CenarioBreakdownCard";

export const Route = createFileRoute("/_authenticated/analise-comparativa")({
  head: () => ({
    meta: [
      { title: "Análise Comparativa de Cenários 2027 | Reforma Tributária" },
      {
        name: "description",
        content:
          "Compare os cenários de 2027 — SN Atual (dentro do DAS), SN Híbrido (DAS + CBS/IBS) e Lucro Presumido 2027 — a partir de dados mensais agregados.",
      },
    ],
  }),
  component: AnaliseComparativaPage,
});

const fmtBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtPct = (n: number) =>
  (n * 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 }) + "%";
const fmtMes = (iso: string) => {
  const [y, m] = iso.split("-");
  return `${m}/${y}`;
};

const CENARIO_LABEL = {
  sn_atual: "SN Atual 2027 (dentro do DAS)",
  sn_hibrido: "SN Híbrido 2027",
  lp_2027: "LP 2027",
} as const;
const COR = {
  sn_atual: "#94a3b8",
  sn_hibrido: "#10b981",
  lp_2027: "#3b82f6",
} as const;
type Cenario2027 = keyof typeof CENARIO_LABEL;
const CENARIOS_2027: readonly Cenario2027[] = ["sn_atual", "sn_hibrido", "lp_2027"] as const;

function AnaliseComparativaPage() {
  const { empresaId, razaoSocial } = useLinkedEmpresa();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<CompetenciaFiscalRow[]>([]);
  
  const [cbsPct, setCbsPct] = useState<number>(CBS_2027_DEFAULT * 100);
  const [ibsPct, setIbsPct] = useState<number>(IBS_2027_DEFAULT * 100);
  const [projetar, setProjetar] = useState<boolean>(true);
  const [anexo, setAnexo] = useState<AnexoSN>("I");
  const dashRef = useRef<HTMLDivElement>(null);

  const carregar = async () => {
    if (!empresaId) return;
    setLoading(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from("competencias_fiscais" as any) as any)
      .select("*")
      .eq("empresa_id", empresaId)
      .order("competencia", { ascending: true });
    setLoading(false);
    if (error) {
      toast.error("Erro ao carregar competências: " + error.message);
      return;
    }
    setRows((data ?? []) as CompetenciaFiscalRow[]);
  };

  useEffect(() => {
    void carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId]);

  const resultado: AnaliseComparativaResultado | null = useMemo(() => {
    if (rows.length === 0) return null;
    return calcularAnaliseComparativa(rows, {
      cbsRate: cbsPct / 100,
      ibsRate: ibsPct / 100,
      projetar12Meses: projetar,
    });
  }, [rows, cbsPct, ibsPct, projetar]);

  const handleExportXLSX = () => {
    if (!resultado) return;
    const wb = XLSX.utils.book_new();
    const meses = resultado.meses.map((m) => ({
      "Competência": fmtMes(m.competencia),
      "Receita Bruta": m.receita_bruta,
      "SN Atual 2027 (Total)": m.sn_atual_total,
      "SN Híbrido 2027 (Total)": m.sn_hibrido_total,
      "LP 2027 (Total)": m.lp_2027_total,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(meses), "Cenários 2027");
    XLSX.writeFile(wb, `cenarios-2027-${razaoSocial ?? "empresa"}.xlsx`);
  };

  const handleExportPDF = async () => {
    if (!resultado) return;
    const { default: jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    let y = 18;

    doc.setFontSize(16); doc.setFont("helvetica", "bold");
    doc.text("Comparativo de Cenários 2027 — Reforma Tributária", pageW / 2, y, { align: "center" });
    y += 7;
    doc.setFontSize(10); doc.setFont("helvetica", "normal");
    doc.text(razaoSocial ?? "Empresa", pageW / 2, y, { align: "center" });
    y += 5;
    doc.text(
      `Gerado em ${new Date().toLocaleDateString("pt-BR")} • CBS ${cbsPct.toFixed(2)}% • IBS líquido ${ibsPct.toFixed(2)}%`,
      pageW / 2, y, { align: "center" }
    );
    y += 6;
    doc.setDrawColor(180); doc.line(14, y, pageW - 14, y); y += 6;

    doc.setFontSize(12); doc.setFont("helvetica", "bold");
    doc.text("Resumo dos cenários 2027 (período analisado)", 14, y); y += 5;
    autoTable(doc, {
      startY: y,
      head: [["Cenário 2027", "Carga Total", "Carga Efetiva"]],
      body: [
        [CENARIO_LABEL.sn_atual, fmtBRL(resultado.totais.sn_atual), fmtPct(resultado.carga_efetiva.sn_atual)],
        [CENARIO_LABEL.sn_hibrido, fmtBRL(resultado.totais.sn_hibrido), fmtPct(resultado.carga_efetiva.sn_hibrido)],
        [CENARIO_LABEL.lp_2027, fmtBRL(resultado.totais.lp_2027), fmtPct(resultado.carga_efetiva.lp_2027)],
        ["Receita Bruta", fmtBRL(resultado.totais.receita_bruta), "—"],
      ],
      theme: "grid",
      headStyles: { fillColor: [41, 98, 255], textColor: 255 },
      styles: { fontSize: 9 },
      margin: { left: 14, right: 14 },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 8;

    doc.setFontSize(11); doc.setFont("helvetica", "bold");
    doc.text("Recomendação", 14, y); y += 5;
    doc.setFontSize(9); doc.setFont("helvetica", "normal");
    const recoLines = doc.splitTextToSize(resultado.recomendacao, pageW - 28);
    doc.text(recoLines, 14, y); y += recoLines.length * 4 + 4;

    doc.setFontSize(12); doc.setFont("helvetica", "bold");
    doc.text("Detalhamento Mês a Mês — Cenários 2027", 14, y); y += 5;
    autoTable(doc, {
      startY: y,
      head: [["Mês", "Receita", "SN Atual 2027", "SN Híbrido 2027", "LP 2027"]],
      body: resultado.meses.map((m) => [
        fmtMes(m.competencia),
        fmtBRL(m.receita_bruta),
        fmtBRL(m.sn_atual_total),
        fmtBRL(m.sn_hibrido_total),
        fmtBRL(m.lp_2027_total),
      ]),
      theme: "grid",
      headStyles: { fillColor: [41, 98, 255], textColor: 255 },
      styles: { fontSize: 8 },
      margin: { left: 14, right: 14 },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 8;

    if (y > 240) { doc.addPage(); y = 18; }
    doc.setFontSize(10); doc.setFont("helvetica", "bold");
    doc.text("Observação", 14, y); y += 5;
    doc.setFontSize(8); doc.setFont("helvetica", "italic");
    const obs = doc.splitTextToSize(
      "Os dados são construídos a partir de informações históricas da empresa e podem sofrer alterações em função de mudanças no comportamento das operações ou na composição legal (atualizações da reforma tributária, leis complementares e decisões do CGIBS). Trata-se de uma projeção de apoio à decisão, não substituindo a apuração formal.",
      pageW - 28,
    );
    doc.text(obs, 14, y);

    const total = doc.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
      doc.setPage(i);
      doc.setFontSize(8); doc.setFont("helvetica", "italic"); doc.setTextColor(140);
      doc.text(`Reforma Tributária 360 — Página ${i}/${total}`, pageW / 2, doc.internal.pageSize.getHeight() - 8, { align: "center" });
      doc.setTextColor(0);
    }

    doc.save(`analise-comparativa-${(razaoSocial ?? "empresa").replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  if (!empresaId) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Selecione uma empresa</AlertTitle>
        <AlertDescription>
          Use o seletor de empresa na barra lateral para visualizar a análise.
        </AlertDescription>
      </Alert>
    );
  }

  const chartData = resultado?.meses.map((m) => ({
    mes: fmtMes(m.competencia),
    "SN Atual 2027": m.sn_atual_total,
    "SN Híbrido 2027": m.sn_hibrido_total,
    "LP 2027": m.lp_2027_total,
  }));

  const cargaData = resultado
    ? CENARIOS_2027.map((k) => ({
        cenario: CENARIO_LABEL[k],
        carga: resultado.carga_efetiva[k] * 100,
        fill: COR[k],
      }))
    : [];

  const pizzaData = resultado
    ? CENARIOS_2027.map((k) => ({
        name: CENARIO_LABEL[k],
        value: resultado.totais[k],
        fill: COR[k],
      }))
    : [];

  return (
    <div className="space-y-6 p-2" ref={dashRef}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Simulação da Reforma Tributária — Cenários 2027
          </h1>
          <p className="text-sm text-muted-foreground">
            {razaoSocial ?? "Empresa"} — comparativo entre os modelos que passam a valer em 2027: SN Atual (dentro do DAS), SN Híbrido (DAS + CBS/IBS) e Lucro Presumido 2027. Os dados históricos (incl. 2026) são usados apenas como base de cálculo.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExportXLSX} disabled={!resultado} variant="outline">
            <FileSpreadsheet className="h-4 w-4 mr-2" /> XLSX
          </Button>
          <Button onClick={handleExportPDF} disabled={!resultado}>
            <FileText className="h-4 w-4 mr-2" /> Relatório PDF
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Parâmetros da Simulação 2027</CardTitle>
          <CardDescription>
            Ajuste as alíquotas e a base de projeção para refletir cenários alternativos.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div>
            <Label htmlFor="cbs">Alíquota CBS (%)</Label>
            <Input
              id="cbs" type="number" step="0.01" min={0} max={30}
              value={cbsPct}
              onChange={(e) => setCbsPct(Number(e.target.value) || 0)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Referência LC 214/2025: 8,70% — projeção ROIT: 9,30% (ajuste conforme cenário).
            </p>
          </div>
          <div>
            <Label htmlFor="ibs">Alíquota IBS líquida (%)</Label>
            <Input
              id="ibs" type="number" step="0.01" min={0} max={30}
              value={ibsPct}
              onChange={(e) => setIbsPct(Number(e.target.value) || 0)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Transição 2027-2028: alíquota teste de 0,1%. Mesmo com crédito de 0,1%,
              havendo saldo devedor (débito &gt; crédito) o recolhimento é devido.
            </p>
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <Label htmlFor="proj">Projetar 12 meses</Label>
              <p className="text-xs text-muted-foreground">
                Completa o ano com a média das competências informadas.
              </p>
            </div>
            <Switch id="proj" checked={projetar} onCheckedChange={setProjetar} />
          </div>
        </CardContent>
      </Card>

      {loading && <p className="text-sm text-muted-foreground">Carregando…</p>}

      {!loading && rows.length === 0 && (
        <Alert>
          <Download className="h-4 w-4" />
          <AlertTitle>Sem competências importadas</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>
              Para gerar a análise comparativa é necessário importar a planilha mensal
              (Saídas, Entradas, Folha, Impostos apurados).
            </p>
            <Button asChild size="sm" variant="outline">
              <Link to="/importacao">Ir para Importação</Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {resultado && (
        <>
          {(() => {
            // Mês representativo = média dos meses analisados
            const n = Math.max(1, resultado.meses.length);
            const avg = resultado.meses.reduce(
              (a, m) => ({
                receita: a.receita + m.receita_bruta / n,
                sn_atual_total: a.sn_atual_total + m.sn_atual_total / n,
                sn_atual_das: a.sn_atual_das + m.sn_atual_das / n,
                sn_atual_inss: a.sn_atual_inss + m.sn_atual_inss / n,
                sn_hibrido_total: a.sn_hibrido_total + m.sn_hibrido_total / n,
                sn_hibrido_das_reduzido: a.sn_hibrido_das_reduzido + m.sn_hibrido_das_reduzido / n,
                sn_hibrido_cbs_debito: a.sn_hibrido_cbs_debito + m.sn_hibrido_cbs_debito / n,
                sn_hibrido_credito_recebido: a.sn_hibrido_credito_recebido + m.sn_hibrido_credito_recebido / n,
                sn_hibrido_inss: a.sn_hibrido_inss + m.sn_hibrido_inss / n,
                lp_2027_total: a.lp_2027_total + m.lp_2027_total / n,
                lp_2027_cbs: a.lp_2027_cbs + m.lp_2027_cbs / n,
                lp_2027_icms: a.lp_2027_icms + m.lp_2027_icms / n,
                lp_2027_irpj_csll: a.lp_2027_irpj_csll + m.lp_2027_irpj_csll / n,
                lp_2027_inss: a.lp_2027_inss + m.lp_2027_inss / n,
              }),
              {
                receita: 0, sn_atual_total: 0, sn_atual_das: 0, sn_atual_inss: 0,
                sn_hibrido_total: 0, sn_hibrido_das_reduzido: 0, sn_hibrido_cbs_debito: 0,
                sn_hibrido_credito_recebido: 0, sn_hibrido_inss: 0,
                lp_2027_total: 0, lp_2027_cbs: 0, lp_2027_icms: 0,
                lp_2027_irpj_csll: 0, lp_2027_inss: 0,
              },
            );
            const aliqDAS = avg.receita > 0 ? avg.sn_atual_das / avg.receita : 0;
            const cbsHibridoLiquido = Math.max(
              0,
              avg.sn_hibrido_cbs_debito - avg.sn_hibrido_credito_recebido,
            );
            return (
              <>
                <BadgeRow
                  badges={[
                    { label: "Mês representativo", value: `média de ${resultado.meses.length}` },
                    { label: "Faturamento", value: fmtBRL(avg.receita) },
                    { label: "CBS", value: `${cbsPct.toFixed(2)}%` },
                    { label: "IBS líq.", value: `${ibsPct.toFixed(2)}%` },
                    { label: "Melhor cenário", value: CENARIO_LABEL[resultado.melhor_cenario_2027] },
                  ]}
                />

                <div className="grid gap-4 md:grid-cols-3">
                  <CenarioBreakdownCard
                    variant="blue"
                    label="Cenário A"
                    title="SN Atual 2027"
                    icon="🔵"
                    steps={[
                      {
                        title: "DAS unificado",
                        rows: [
                          { label: "Faturamento do mês", value: avg.receita },
                          { label: "Alíquota efetiva DAS", value: fmtPct(aliqDAS) },
                          { label: "DAS total", value: avg.sn_atual_das, tone: "highlight" },
                        ],
                      },
                      {
                        title: "INSS patronal",
                        rows: [{ label: "Sobre folha", value: avg.sn_atual_inss }],
                      },
                      {
                        title: "Créditos aproveitados",
                        rows: [{ label: "Regime unificado — sem crédito de entradas", value: "—", tone: "muted" }],
                      },
                    ]}
                    totalLabel="Total de tributos no mês"
                    totalValue={avg.sn_atual_total}
                    credit={{
                      label: "Crédito CBS ao comprador B2B",
                      value: 0,
                      sub: "DAS unificado não destaca CBS/IBS para o adquirente",
                    }}
                  />

                  <CenarioBreakdownCard
                    variant="green"
                    label="Cenário B"
                    title="SN Híbrido 2027"
                    icon="🟢"
                    steps={[
                      {
                        title: "DAS reduzido (sem CBS/IBS)",
                        rows: [
                          { label: "Faturamento do mês", value: avg.receita },
                          { label: "DAS sem parcela CBS/IBS", value: avg.sn_hibrido_das_reduzido, tone: "highlight" },
                        ],
                        note: "IRPJ, CSLL, CPP e ICMS permanecem no DAS",
                      },
                      {
                        title: "CBS/IBS apurados separadamente",
                        rows: [
                          { label: "Débito CBS+IBS sobre receita B2B", value: avg.sn_hibrido_cbs_debito },
                          { label: "( – ) Crédito sobre insumos regime regular", value: -avg.sn_hibrido_credito_recebido },
                          { label: "CBS/IBS líquido a recolher", value: cbsHibridoLiquido, tone: "highlight" },
                        ],
                      },
                      {
                        title: "INSS patronal",
                        rows: [{ label: "Sobre folha", value: avg.sn_hibrido_inss }],
                      },
                    ]}
                    totalLabel="Total de tributos no mês"
                    totalValue={avg.sn_hibrido_total}
                    credit={{
                      label: "Crédito CBS/IBS transferido ao comprador B2B",
                      value: avg.sn_hibrido_cbs_debito,
                      sub: "Alíquota plena destacada na NF — vantagem competitiva B2B",
                    }}
                  />

                  <CenarioBreakdownCard
                    variant="amber"
                    label="Cenário C"
                    title="LP 2027"
                    icon="🟡"
                    steps={[
                      {
                        title: "CBS/IBS (regime regular)",
                        rows: [
                          { label: "Débito CBS+IBS sobre receita", value: avg.lp_2027_cbs + (avg.lp_2027_cbs > 0 ? 0 : 0) },
                          { label: "CBS/IBS líquido (após créditos)", value: avg.lp_2027_cbs, tone: "highlight" },
                        ],
                        note: "PIS/Cofins extintos em 2027",
                      },
                      {
                        title: "ICMS apurado",
                        rows: [{ label: "ICMS no mês", value: avg.lp_2027_icms }],
                      },
                      {
                        title: "IRPJ + CSLL + INSS",
                        rows: [
                          { label: "IRPJ + CSLL (presunção)", value: avg.lp_2027_irpj_csll },
                          { label: "INSS patronal", value: avg.lp_2027_inss },
                        ],
                      },
                    ]}
                    totalLabel="Total de tributos no mês"
                    totalValue={avg.lp_2027_total}
                    credit={{
                      label: "Crédito CBS/IBS ao comprador B2B",
                      value: avg.lp_2027_cbs > 0 ? avg.lp_2027_cbs : 0,
                      sub: "Destaque pleno na NF; comprador Lucro Real aproveita integralmente",
                    }}
                  />
                </div>

                <ComparativoFooter
                  header="Comparativo — impacto por cenário (média mensal)"
                  colunas={[
                    {
                      title: "Carga tributária mensal",
                      rows: [
                        { label: "SN Atual", value: avg.sn_atual_total, tone: "blue" },
                        { label: "SN Híbrido", value: avg.sn_hibrido_total, tone: "green" },
                        { label: "LP 2027", value: avg.lp_2027_total, tone: "amber" },
                      ],
                      footer: {
                        label: "Diferença vs. melhor",
                        value:
                          Math.max(avg.sn_atual_total, avg.sn_hibrido_total, avg.lp_2027_total) -
                          Math.min(avg.sn_atual_total, avg.sn_hibrido_total, avg.lp_2027_total),
                        tone: "red",
                      },
                    },
                    {
                      title: "Crédito gerado ao comprador B2B",
                      rows: [
                        { label: "SN Atual", value: 0, tone: "blue" },
                        { label: "SN Híbrido", value: avg.sn_hibrido_cbs_debito, tone: "green" },
                        { label: "LP 2027", value: avg.lp_2027_cbs > 0 ? avg.lp_2027_cbs : 0, tone: "amber" },
                      ],
                      footer: {
                        label: "Melhor crédito B2B",
                        value: Math.max(avg.sn_hibrido_cbs_debito, avg.lp_2027_cbs, 0),
                        tone: "green",
                      },
                    },
                    {
                      title: "Carga efetiva (% receita)",
                      rows: [
                        { label: "SN Atual", value: fmtPct(resultado.carga_efetiva.sn_atual), tone: "blue" },
                        { label: "SN Híbrido", value: fmtPct(resultado.carga_efetiva.sn_hibrido), tone: "green" },
                        { label: "LP 2027", value: fmtPct(resultado.carga_efetiva.lp_2027), tone: "amber" },
                      ],
                      footer: {
                        label: "Recomendação",
                        value: CENARIO_LABEL[resultado.melhor_cenario_2027],
                        tone: "green",
                      },
                    },
                  ]}
                  alert={
                    <>
                      <b className="text-[#4eca8b]">O que isso significa: </b>
                      {resultado.recomendacao}
                    </>
                  }
                />
              </>
            );
          })()}

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Carga Tributária Mensal</CardTitle>
                <CardDescription>Total por cenário, mês a mês.</CardDescription>
              </CardHeader>
              <CardContent style={{ height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mes" />
                    <YAxis tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v) => fmtBRL(Number(v))} />
                    <Legend />
                    <Bar dataKey="SN Atual 2027" fill={COR.sn_atual} />
                    <Bar dataKey="SN Híbrido 2027" fill={COR.sn_hibrido} />
                    <Bar dataKey="LP 2027" fill={COR.lp_2027} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Evolução por Cenário</CardTitle>
                <CardDescription>Tendência mensal — útil para projeção anual.</CardDescription>
              </CardHeader>
              <CardContent style={{ height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mes" />
                    <YAxis tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v) => fmtBRL(Number(v))} />
                    <Legend />
                    <Line type="monotone" dataKey="SN Atual 2027" stroke={COR.sn_atual} strokeWidth={2} />
                    <Line type="monotone" dataKey="SN Híbrido 2027" stroke={COR.sn_hibrido} strokeWidth={2} />
                    <Line type="monotone" dataKey="LP 2027" stroke={COR.lp_2027} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Carga Efetiva (%)</CardTitle>
                <CardDescription>% sobre a receita bruta acumulada.</CardDescription>
              </CardHeader>
              <CardContent style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cargaData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="cenario" />
                    <YAxis tickFormatter={(v) => `${v.toFixed(1)}%`} />
                    <Tooltip formatter={(v) => `${Number(v).toFixed(2)}%`} />
                    <Bar dataKey="carga">
                      {cargaData.map((d, i) => (
                        <Cell key={i} fill={d.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Participação no Total</CardTitle>
                <CardDescription>Comparativo proporcional da carga acumulada.</CardDescription>
              </CardHeader>
              <CardContent style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pizzaData} dataKey="value" nameKey="name" outerRadius={100} label>
                      {pizzaData.map((d, i) => (
                        <Cell key={i} fill={d.fill} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => fmtBRL(Number(v))} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Detalhamento Mês a Mês</CardTitle>
              <CardDescription>
                {projetar
                  ? "Inclui projeção dos meses faltantes pela média histórica."
                  : "Apenas competências importadas."}
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mês</TableHead>
                    <TableHead className="text-right">Receita</TableHead>
                    <TableHead className="text-right">SN Atual 2027</TableHead>
                    <TableHead className="text-right">SN Híbrido 2027</TableHead>
                    <TableHead className="text-right">LP 2027</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resultado.meses.map((m) => (
                    <TableRow key={m.competencia}>
                      <TableCell>{fmtMes(m.competencia)}</TableCell>
                      <TableCell className="text-right">{fmtBRL(m.receita_bruta)}</TableCell>
                      <TableCell className="text-right">{fmtBRL(m.sn_atual_total)}</TableCell>
                      <TableCell className="text-right">{fmtBRL(m.sn_hibrido_total)}</TableCell>
                      <TableCell className="text-right">{fmtBRL(m.lp_2027_total)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-semibold">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right">{fmtBRL(resultado.totais.receita_bruta)}</TableCell>
                    <TableCell className="text-right">{fmtBRL(resultado.totais.sn_atual)}</TableCell>
                    <TableCell className="text-right">{fmtBRL(resultado.totais.sn_hibrido)}</TableCell>
                    <TableCell className="text-right">{fmtBRL(resultado.totais.lp_2027)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Alert className="border-amber-300 bg-amber-50">
            <AlertTriangle className="h-4 w-4 text-amber-700" />
            <AlertTitle className="text-amber-900">Observação importante</AlertTitle>
            <AlertDescription className="text-amber-900">
              Os dados desta simulação são construídos com base em <strong>informações
              históricas</strong> da empresa e podem sofrer alterações em razão de
              mudanças no comportamento das operações (mix de clientes, fornecedores,
              volume, preços) ou por <strong>alterações na composição legal</strong> da
              reforma tributária — leis complementares, atos do CGIBS e regulamentações
              ainda em discussão. Trata-se de uma projeção de apoio à decisão e não
              substitui a apuração tributária formal.
            </AlertDescription>
          </Alert>
        </>
      )}

    </div>
  );
}
