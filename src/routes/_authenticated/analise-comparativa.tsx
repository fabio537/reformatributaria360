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

export const Route = createFileRoute("/_authenticated/analise-comparativa")({
  head: () => ({
    meta: [
      { title: "Análise Comparativa de Cenários | Reforma Tributária" },
      {
        name: "description",
        content:
          "Compare cenários Simples Nacional Atual, Simples Híbrido 2027, Lucro Presumido 2026 e Lucro Presumido 2027 a partir de dados mensais agregados.",
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
  sn_atual: "SN Atual",
  sn_hibrido: "SN Híbrido 2027",
  lp_2026: "LP 2026",
  lp_2027: "LP 2027",
} as const;
const COR = {
  sn_atual: "#94a3b8",
  sn_hibrido: "#10b981",
  lp_2026: "#f59e0b",
  lp_2027: "#3b82f6",
} as const;

function AnaliseComparativaPage() {
  const { empresaId, razaoSocial } = useLinkedEmpresa();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<CompetenciaFiscalRow[]>([]);
  
  const [cbsPct, setCbsPct] = useState<number>(CBS_2027_DEFAULT * 100);
  const [ibsPct, setIbsPct] = useState<number>(IBS_2027_DEFAULT * 100);
  const [projetar, setProjetar] = useState<boolean>(true);
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
      "SN Atual (Total)": m.sn_atual_total,
      "SN Híbrido 2027 (Total)": m.sn_hibrido_total,
      "LP 2026 (Total)": m.lp_2026_total,
      "LP 2027 (Total)": m.lp_2027_total,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(meses), "Comparativo Mensal");
    XLSX.writeFile(wb, `analise-comparativa-${razaoSocial ?? "empresa"}.xlsx`);
  };

  const handleExportPDF = async () => {
    if (!resultado) return;
    const { default: jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    let y = 18;

    doc.setFontSize(16); doc.setFont("helvetica", "bold");
    doc.text("Análise Comparativa de Cenários — Reforma Tributária", pageW / 2, y, { align: "center" });
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
    doc.text("Resumo (período analisado)", 14, y); y += 5;
    autoTable(doc, {
      startY: y,
      head: [["Cenário", "Carga Total", "Carga Efetiva"]],
      body: [
        ["SN Atual", fmtBRL(resultado.totais.sn_atual), fmtPct(resultado.carga_efetiva.sn_atual)],
        ["SN Híbrido 2027", fmtBRL(resultado.totais.sn_hibrido), fmtPct(resultado.carga_efetiva.sn_hibrido)],
        ["LP 2026", fmtBRL(resultado.totais.lp_2026), fmtPct(resultado.carga_efetiva.lp_2026)],
        ["LP 2027", fmtBRL(resultado.totais.lp_2027), fmtPct(resultado.carga_efetiva.lp_2027)],
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
    doc.text("Detalhamento Mês a Mês", 14, y); y += 5;
    autoTable(doc, {
      startY: y,
      head: [["Mês", "Receita", "SN Atual", "SN Híbrido", "LP 2026", "LP 2027"]],
      body: resultado.meses.map((m) => [
        fmtMes(m.competencia),
        fmtBRL(m.receita_bruta),
        fmtBRL(m.sn_atual_total),
        fmtBRL(m.sn_hibrido_total),
        fmtBRL(m.lp_2026_total),
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
    "SN Atual": m.sn_atual_total,
    "SN Híbrido 2027": m.sn_hibrido_total,
    "LP 2026": m.lp_2026_total,
    "LP 2027": m.lp_2027_total,
  }));

  const cargaData = resultado
    ? (["sn_atual", "sn_hibrido", "lp_2026", "lp_2027"] as const).map((k) => ({
        cenario: CENARIO_LABEL[k],
        carga: resultado.carga_efetiva[k] * 100,
        fill: COR[k],
      }))
    : [];

  const pizzaData = resultado
    ? (["sn_atual", "sn_hibrido", "lp_2026", "lp_2027"] as const).map((k) => ({
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
            Simulação da Reforma Tributária — Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            {razaoSocial ?? "Empresa"} — comparativo entre SN Atual, SN Híbrido 2027, LP 2026 e LP 2027.
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
            <p className="text-xs text-muted-foreground mt-1">Referência LC 214/2025: 8,70%</p>
          </div>
          <div>
            <Label htmlFor="ibs">Alíquota IBS líquida (%)</Label>
            <Input
              id="ibs" type="number" step="0.01" min={0} max={30}
              value={ibsPct}
              onChange={(e) => setIbsPct(Number(e.target.value) || 0)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Transição 2027-2028: 0,1% débito = 0,1% crédito ⇒ líquido 0%.
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
          <div className="grid gap-4 md:grid-cols-4">
            {(["sn_atual", "sn_hibrido", "lp_2026", "lp_2027"] as const).map((k) => {
              const best = resultado.melhor_cenario_2027 === k;
              return (
                <Card key={k} className={best ? "border-emerald-500 border-2" : ""}>
                  <CardHeader className="pb-2">
                    <CardDescription>{CENARIO_LABEL[k]}</CardDescription>
                    <CardTitle className="text-xl">{fmtBRL(resultado.totais[k])}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        Carga efetiva: {fmtPct(resultado.carga_efetiva[k])}
                      </span>
                      {best && (
                        <Badge className="bg-emerald-600">
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Melhor 2027
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Recomendação</AlertTitle>
            <AlertDescription>{resultado.recomendacao}</AlertDescription>
          </Alert>

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
                    <Bar dataKey="SN Atual" fill={COR.sn_atual} />
                    <Bar dataKey="SN Híbrido 2027" fill={COR.sn_hibrido} />
                    <Bar dataKey="LP 2026" fill={COR.lp_2026} />
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
                    <Line type="monotone" dataKey="SN Atual" stroke={COR.sn_atual} strokeWidth={2} />
                    <Line type="monotone" dataKey="SN Híbrido 2027" stroke={COR.sn_hibrido} strokeWidth={2} />
                    <Line type="monotone" dataKey="LP 2026" stroke={COR.lp_2026} strokeWidth={2} />
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
                    <TableHead className="text-right">SN Atual</TableHead>
                    <TableHead className="text-right">SN Híbrido</TableHead>
                    <TableHead className="text-right">LP 2026</TableHead>
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
                      <TableCell className="text-right">{fmtBRL(m.lp_2026_total)}</TableCell>
                      <TableCell className="text-right">{fmtBRL(m.lp_2027_total)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-semibold">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right">{fmtBRL(resultado.totais.receita_bruta)}</TableCell>
                    <TableCell className="text-right">{fmtBRL(resultado.totais.sn_atual)}</TableCell>
                    <TableCell className="text-right">{fmtBRL(resultado.totais.sn_hibrido)}</TableCell>
                    <TableCell className="text-right">{fmtBRL(resultado.totais.lp_2026)}</TableCell>
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
