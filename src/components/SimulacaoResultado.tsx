import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area,
} from "recharts";
import { AlertTriangle, TrendingDown, TrendingUp, Info, Save, FileText } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import type { ResultadoSimulacao } from "@/lib/tax-engine";
import type { RelatorioContexto } from "@/lib/relatorio-pdf";

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

const regimeTributarioLabels: Record<string, string> = {
  simples_nacional: "Simples Nacional",
  lucro_presumido: "Lucro Presumido",
  lucro_real: "Lucro Real",
};

interface SimulacaoResultadoProps {
  resultado: ResultadoSimulacao;
  escopoSomenteCbs?: boolean;
  /** Quando definido, exibe botão "Salvar" */
  onSalvar?: () => Promise<void> | void;
  salvando?: boolean;
  salvado?: boolean;
  /** Contexto opcional para customizar o PDF (ex.: relatório por produto) */
  pdfContexto?: RelatorioContexto;
}

export function SimulacaoResultado({
  resultado,
  escopoSomenteCbs = false,
  onSalvar,
  salvando = false,
  salvado = false,
  pdfContexto,
}: SimulacaoResultadoProps) {
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const incluiIrpjCsll = !!resultado.anos.some(
    (a) => a.tributos_atuais_bruto.irpj > 0 || a.tributos_atuais_bruto.csll > 0
  );

  const dadosGrafico = resultado.anos.map((a) => ({
    ano: a.ano,
    "DAS": Math.round(a.tributos_atuais_bruto.das),
    "PIS/COFINS": Math.round(a.tributos_atuais_bruto.pis + a.tributos_atuais_bruto.cofins),
    "IPI": Math.round(a.tributos_atuais_bruto.ipi),
    "ICMS": Math.round(a.tributos_atuais_bruto.icms),
    "ISS": Math.round(a.tributos_atuais_bruto.iss),
    "IRPJ": Math.round(a.tributos_atuais_bruto.irpj),
    "CSLL": Math.round(a.tributos_atuais_bruto.csll),
    "CBS": Math.round(a.ibs_cbs_bruto.cbs),
    "IBS": Math.round(a.ibs_cbs_bruto.ibs),
    "IS": Math.round(a.ibs_cbs_bruto.is),
  }));

  const dadosCargaLiquida = resultado.anos.map((a) => ({
    ano: a.ano,
    "Carga Atual": Math.round(a.carga_atual_liquida),
    "Carga IBS/CBS": Math.round(a.carga_nova_liquida),
    "Total": Math.round(a.carga_total),
    "Variação (%)": Number(a.variacao_pct.toFixed(1)),
  }));

  const gerarRelatorio = async () => {
    setGeneratingPdf(true);
    try {
      const { gerarRelatorioPDF } = await import("@/lib/relatorio-pdf");
      await gerarRelatorioPDF(resultado, pdfContexto);
      toast.success("Relatório PDF gerado com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar relatório");
    } finally {
      setGeneratingPdf(false);
    }
  };

  const ultimo = resultado.anos.length > 0 ? resultado.anos[resultado.anos.length - 1] : null;

  return (
    <div className="space-y-6">
      {/* Botões de ação */}
      <div className="flex flex-wrap gap-2 justify-end">
        {onSalvar && (
          <Button variant="outline" onClick={() => onSalvar()} disabled={salvando || salvado}>
            <Save className="h-4 w-4 mr-1" />
            {salvado ? "Salva ✓" : salvando ? "Salvando…" : "Salvar"}
          </Button>
        )}
        <Button variant="outline" onClick={gerarRelatorio} disabled={generatingPdf}>
          <FileText className="h-4 w-4 mr-1" />
          {generatingPdf ? "Gerando…" : "Gerar Relatório PDF"}
        </Button>
      </div>

      {/* Alertas */}
      {resultado.alertas.length > 0 && (
        <Card className="border-warning/30 bg-warning/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-warning-foreground">
              <AlertTriangle className="h-4 w-4" />
              Observações da Simulação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {resultado.alertas.map((a, i) => (
                <li key={i} className="text-sm text-muted-foreground flex gap-2">
                  <Info className="h-4 w-4 mt-0.5 shrink-0 text-warning-foreground" />
                  {a}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Resumo */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Carga Atual (anual)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{formatBRL(resultado.carga_atual_anual)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Créditos: {formatBRL(resultado.creditos_atuais_anual)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Carga IBS/CBS (anual, 100%)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{formatBRL(resultado.carga_nova_anual)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Créditos: {formatBRL(resultado.creditos_novos_anual)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>
              Variação no último ano simulado{ultimo ? ` (${ultimo.ano})` : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {ultimo && (() => {
              const positivo = ultimo.variacao >= 0;
              return (
                <>
                  <div className={`text-2xl font-bold tabular-nums flex items-center gap-1 ${positivo ? "text-destructive" : "text-success"}`}>
                    {positivo ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                    {formatBRL(Math.abs(ultimo.variacao))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {positivo ? "Aumento" : "Economia"} de {Math.abs(ultimo.variacao_pct).toFixed(1)}%
                  </p>
                </>
              );
            })()}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Regime / Faturamento</CardDescription>
          </CardHeader>
          <CardContent>
            <Badge variant="outline" className="mb-1">
              {regimeTributarioLabels[resultado.regime_tributario] || resultado.regime_tributario}
            </Badge>
            <div className="text-sm tabular-nums">{formatBRL(resultado.faturamento_anual)}/ano</div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Tributos Brutos */}
      <Card>
        <CardHeader>
          <CardTitle>Tributos Brutos por Ano</CardTitle>
          <CardDescription>Composição da carga tributária bruta anual (R$) por tributo</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dadosGrafico}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="ano" />
                <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: any) => formatBRL(Number(v))} />
                <Legend />
                <Bar dataKey="PIS/COFINS" fill="var(--color-chart-1)" stackId="a" />
                <Bar dataKey="IPI" fill="var(--color-chart-2)" stackId="a" />
                <Bar dataKey="ICMS" fill="var(--color-chart-3)" stackId="a" />
                <Bar dataKey="ISS" fill="var(--color-chart-4)" stackId="a" />
                {incluiIrpjCsll && <Bar dataKey="IRPJ" fill="var(--color-chart-6)" stackId="a" />}
                {incluiIrpjCsll && <Bar dataKey="CSLL" fill="var(--color-chart-7)" stackId="a" />}
                <Bar dataKey="CBS" fill="var(--color-chart-5)" stackId="b" />
                {!escopoSomenteCbs && <Bar dataKey="IBS" fill="var(--color-chart-2)" stackId="b" />}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Gráfico de Carga Líquida */}
      <Card>
        <CardHeader>
          <CardTitle>Carga Tributária Líquida — Comparativo</CardTitle>
          <CardDescription>Carga após créditos, comparando sistema atual vs IBS/CBS</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dadosCargaLiquida}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="ano" />
                <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: any, name: any) => String(name) === "Variação (%)" ? `${v}%` : formatBRL(Number(v))} />
                <Legend />
                <Area type="monotone" dataKey="Carga Atual" fill="var(--color-chart-5)" stroke="var(--color-chart-5)" fillOpacity={0.3} stackId="1" />
                <Area type="monotone" dataKey="Carga IBS/CBS" fill="var(--color-chart-1)" stroke="var(--color-chart-1)" fillOpacity={0.3} stackId="1" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Tabela detalhada */}
      <Card>
        <CardHeader>
          <CardTitle>Detalhamento por Ano</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-2">Ano</th>
                <th className="text-left py-2 px-2">Fase</th>
                <th className="text-right py-2 px-2">Trib. Atuais</th>
                {incluiIrpjCsll && <th className="text-right py-2 px-2">IRPJ/CSLL</th>}
                <th className="text-right py-2 px-2">IBS/CBS</th>
                <th className="text-right py-2 px-2">Créditos</th>
                <th className="text-right py-2 px-2">Carga Total</th>
                <th className="text-right py-2 px-2">Variação</th>
              </tr>
            </thead>
            <tbody>
              {resultado.anos.map((a) => (
                <tr key={a.ano} className="border-b hover:bg-muted/50">
                  <td className="py-2 px-2 font-medium">{a.ano}</td>
                  <td className="py-2 px-2">
                    <Badge variant="outline" className="text-xs whitespace-nowrap">{a.fase}</Badge>
                  </td>
                  <td className="py-2 px-2 text-right tabular-nums">{formatBRL(a.tributos_atuais_bruto.total)}</td>
                  {incluiIrpjCsll && (
                    <td className="py-2 px-2 text-right tabular-nums">
                      {formatBRL(a.tributos_atuais_bruto.irpj + a.tributos_atuais_bruto.csll)}
                    </td>
                  )}
                  <td className="py-2 px-2 text-right tabular-nums">{formatBRL(a.ibs_cbs_bruto.total)}</td>
                  <td className="py-2 px-2 text-right tabular-nums text-green-600">
                    -{formatBRL(a.creditos.creditos_atuais + a.creditos.creditos_ibs_cbs)}
                  </td>
                  <td className="py-2 px-2 text-right tabular-nums font-medium">{formatBRL(a.carga_total)}</td>
                  <td className={`py-2 px-2 text-right tabular-nums font-medium ${a.variacao >= 0 ? "text-destructive" : "text-success"}`}>
                    {a.variacao >= 0 ? "+" : ""}{a.variacao_pct.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
