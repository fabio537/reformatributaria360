import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
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
  Upload,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLinkedEmpresa } from "@/hooks/useLinkedEmpresa";
import { ImportDialog } from "@/components/ImportDialog";
import {
  calcularAnaliseComparativa,
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

function AnaliseComparativaPage() {
  const { empresaId, razaoSocial } = useLinkedEmpresa();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<CompetenciaFiscalRow[]>([]);
  const [importOpen, setImportOpen] = useState(false);

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
    return calcularAnaliseComparativa(rows);
  }, [rows]);

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

    const resumo = [
      { Indicador: "Receita Bruta Total", Valor: resultado.totais.receita_bruta },
      { Indicador: "Total SN Atual", Valor: resultado.totais.sn_atual },
      { Indicador: "Total SN Híbrido 2027", Valor: resultado.totais.sn_hibrido },
      { Indicador: "Total LP 2026", Valor: resultado.totais.lp_2026 },
      { Indicador: "Total LP 2027", Valor: resultado.totais.lp_2027 },
      { Indicador: "Carga Efetiva SN Atual (%)", Valor: resultado.carga_efetiva.sn_atual * 100 },
      { Indicador: "Carga Efetiva SN Híbrido (%)", Valor: resultado.carga_efetiva.sn_hibrido * 100 },
      { Indicador: "Carga Efetiva LP 2026 (%)", Valor: resultado.carga_efetiva.lp_2026 * 100 },
      { Indicador: "Carga Efetiva LP 2027 (%)", Valor: resultado.carga_efetiva.lp_2027 * 100 },
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(resumo), "Resumo");
    XLSX.writeFile(wb, `analise-comparativa-${razaoSocial ?? "empresa"}.xlsx`);
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

  return (
    <div className="space-y-6 p-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Análise Comparativa de Cenários
          </h1>
          <p className="text-sm text-muted-foreground">
            {razaoSocial ?? "Empresa"} — projeção mensal entre SN Atual, SN Híbrido 2027,
            LP 2026 e LP 2027 a partir das competências fiscais importadas.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setImportOpen(true)} variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Importar Competências
          </Button>
          <Button onClick={handleExportXLSX} disabled={!resultado}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Exportar XLSX
          </Button>
        </div>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Carregando…</p>}

      {!loading && rows.length === 0 && (
        <Alert>
          <Download className="h-4 w-4" />
          <AlertTitle>Sem competências importadas</AlertTitle>
          <AlertDescription>
            Importe a planilha mensal (Saídas, Entradas, Folha, Impostos apurados) para gerar
            a análise comparativa. O modelo pode ser baixado dentro do importador.
          </AlertDescription>
        </Alert>
      )}

      {resultado && (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            {[
              { label: "SN Atual", v: resultado.totais.sn_atual, c: resultado.carga_efetiva.sn_atual, k: "sn_atual" },
              { label: "SN Híbrido 2027", v: resultado.totais.sn_hibrido, c: resultado.carga_efetiva.sn_hibrido, k: "sn_hibrido" },
              { label: "LP 2026", v: resultado.totais.lp_2026, c: resultado.carga_efetiva.lp_2026, k: "lp_2026" },
              { label: "LP 2027", v: resultado.totais.lp_2027, c: resultado.carga_efetiva.lp_2027, k: "lp_2027" },
            ].map((card) => {
              const best = resultado.melhor_cenario_2027 === card.k;
              return (
                <Card key={card.label} className={best ? "border-emerald-500" : ""}>
                  <CardHeader className="pb-2">
                    <CardDescription>{card.label}</CardDescription>
                    <CardTitle className="text-xl">{fmtBRL(card.v)}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        Carga efetiva: {fmtPct(card.c)}
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

          {resultado.alertas.length > 0 && (
            <Alert variant="default">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Observações</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  {resultado.alertas.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Comparativo Mensal</CardTitle>
              <CardDescription>Carga tributária total por mês em cada cenário.</CardDescription>
            </CardHeader>
            <CardContent style={{ height: 360 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" />
                  <YAxis tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => fmtBRL(v)} />
                  <Legend />
                  <Bar dataKey="SN Atual" fill="#94a3b8" />
                  <Bar dataKey="SN Híbrido 2027" fill="#10b981" />
                  <Bar dataKey="LP 2026" fill="#f59e0b" />
                  <Bar dataKey="LP 2027" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Detalhamento Mês a Mês</CardTitle>
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
        </>
      )}

      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        tableName="competencias_fiscais"
        entity="competencias_fiscais"
        extraData={{ empresa_id: empresaId }}
        onSuccess={() => void carregar()}
        templateFileName="competencias-fiscais"
      />
    </div>
  );
}
