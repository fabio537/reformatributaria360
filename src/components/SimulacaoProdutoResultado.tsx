import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingDown, TrendingUp, Wallet, Receipt, Package, PiggyBank } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import type { ResultadoSimulacao } from "@/lib/tax-engine";

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

interface Props {
  resultado: ResultadoSimulacao;
  /** Valor mensal do produto (R$) */
  valorMensalProduto: number;
  /** Soma dos valores mensais brutos das aquisições/insumos vinculados (R$) */
  insumosMensaisBruto: number;
}

export function SimulacaoProdutoResultado({ resultado, valorMensalProduto, insumosMensaisBruto }: Props) {
  const vendaAnual = valorMensalProduto * 12;
  const insumosAnuaisBruto = insumosMensaisBruto * 12;

  const linhas = resultado.anos.map((a) => {
    const insumosLiq = Math.max(0, insumosAnuaisBruto - (a.creditos.creditos_atuais + a.creditos.creditos_ibs_cbs));
    const margem = vendaAnual - a.carga_total - insumosLiq;
    const margemPct = vendaAnual > 0 ? (margem / vendaAnual) * 100 : 0;
    return { ano: a.ano, fase: a.fase, venda: vendaAnual, impostos: a.carga_total, insumos: insumosLiq, margem, margemPct };
  });

  const ultimo = linhas[linhas.length - 1];
  const primeiro = linhas[0];
  const variacaoMargem = ultimo && primeiro ? ultimo.margem - primeiro.margem : 0;
  const variacaoMargemPct = ultimo && primeiro && primeiro.margem !== 0
    ? ((ultimo.margem - primeiro.margem) / Math.abs(primeiro.margem)) * 100
    : 0;

  if (!ultimo) return null;

  const positivo = variacaoMargem >= 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Resultado financeiro do produto</CardTitle>
          <CardDescription>
            Composição da margem líquida do item após impostos e insumos diretos — destaque para o último ano simulado ({ultimo.ano}).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="border-primary/30">
              <CardHeader className="pb-2 flex-row items-center gap-2 space-y-0">
                <Wallet className="h-4 w-4 text-primary" />
                <CardDescription>Valor de venda (anual)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tabular-nums">{formatBRL(ultimo.venda)}</div>
                <p className="text-xs text-muted-foreground mt-1">Mensal: {formatBRL(valorMensalProduto)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2 flex-row items-center gap-2 space-y-0">
                <Receipt className="h-4 w-4 text-destructive" />
                <CardDescription>Impostos em {ultimo.ano}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tabular-nums">{formatBRL(ultimo.impostos)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {ultimo.venda > 0 ? `${((ultimo.impostos / ultimo.venda) * 100).toFixed(1)}% sobre a venda` : "—"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2 flex-row items-center gap-2 space-y-0">
                <Package className="h-4 w-4 text-warning-foreground" />
                <CardDescription>Insumos (líq. de créditos)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tabular-nums">{formatBRL(ultimo.insumos)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Bruto: {formatBRL(insumosAnuaisBruto)}
                </p>
              </CardContent>
            </Card>

            <Card className={positivo ? "border-success/40" : "border-destructive/40"}>
              <CardHeader className="pb-2 flex-row items-center gap-2 space-y-0">
                <PiggyBank className={`h-4 w-4 ${positivo ? "text-success" : "text-destructive"}`} />
                <CardDescription>Margem após impostos e insumos</CardDescription>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold tabular-nums ${ultimo.margem >= 0 ? "text-success" : "text-destructive"}`}>
                  {formatBRL(ultimo.margem)}
                </div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  {ultimo.margemPct.toFixed(1)}% da venda
                  {primeiro && (
                    <span className={`ml-2 inline-flex items-center gap-0.5 ${positivo ? "text-success" : "text-destructive"}`}>
                      {positivo ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {variacaoMargemPct >= 0 ? "+" : ""}{variacaoMargemPct.toFixed(1)}% vs {primeiro.ano}
                    </span>
                  )}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Gráfico de margem */}
          {linhas.length > 1 && (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={linhas}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="ano" />
                  <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: any) => formatBRL(Number(v))} />
                  <Legend />
                  <Line type="monotone" dataKey="venda" name="Venda" stroke="var(--color-chart-1)" strokeWidth={2} />
                  <Line type="monotone" dataKey="impostos" name="Impostos" stroke="var(--color-chart-3)" strokeWidth={2} />
                  <Line type="monotone" dataKey="insumos" name="Insumos (líq.)" stroke="var(--color-chart-4)" strokeWidth={2} />
                  <Line type="monotone" dataKey="margem" name="Margem" stroke="var(--color-chart-2)" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Tabela ano a ano */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2">Ano</th>
                  <th className="text-right py-2 px-2">Valor de venda</th>
                  <th className="text-right py-2 px-2">Impostos</th>
                  <th className="text-right py-2 px-2">Insumos (líq.)</th>
                  <th className="text-right py-2 px-2">Margem (R$)</th>
                  <th className="text-right py-2 px-2">Margem (%)</th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((l) => (
                  <tr key={l.ano} className="border-b hover:bg-muted/50">
                    <td className="py-2 px-2 font-medium">{l.ano}</td>
                    <td className="py-2 px-2 text-right tabular-nums">{formatBRL(l.venda)}</td>
                    <td className="py-2 px-2 text-right tabular-nums text-destructive">-{formatBRL(l.impostos)}</td>
                    <td className="py-2 px-2 text-right tabular-nums text-warning-foreground">-{formatBRL(l.insumos)}</td>
                    <td className={`py-2 px-2 text-right tabular-nums font-semibold ${l.margem >= 0 ? "text-success" : "text-destructive"}`}>
                      {formatBRL(l.margem)}
                    </td>
                    <td className={`py-2 px-2 text-right tabular-nums ${l.margem >= 0 ? "text-success" : "text-destructive"}`}>
                      {l.margemPct.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
