import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingDown, TrendingUp, Wallet, Receipt, Package, PiggyBank, Percent } from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import type { ResultadoSimulacao } from "@/lib/tax-engine";

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function formatPct(value: number, digits = 1): string {
  return `${value.toFixed(digits)}%`;
}

interface Props {
  resultado: ResultadoSimulacao;
  /** Valor mensal do produto (R$) — receita mensal do item */
  valorMensalProduto: number;
  /** Soma dos valores mensais brutos das aquisições/insumos vinculados (R$) */
  insumosMensaisBruto: number;
  /** Quantidade vendida por mês. Se 0, o painel cai para modo "por operação". */
  quantidadeMensal?: number;
}

export function SimulacaoProdutoResultado({
  resultado,
  valorMensalProduto,
  insumosMensaisBruto,
  quantidadeMensal = 0,
}: Props) {
  const porUnidade = quantidadeMensal > 0;
  const unidadeAnual = porUnidade ? quantidadeMensal * 12 : 12; // divisor para passar de "anual" para "por unidade" ou "por operação mensal"
  const sufixo = porUnidade ? "/unid." : "/operação";

  const vendaAnual = valorMensalProduto * 12;
  const insumosAnuaisBruto = insumosMensaisBruto * 12;
  const precoUnit = vendaAnual / unidadeAnual;

  const linhas = resultado.anos.map((a) => {
    const insumosLiqAnual = Math.max(0, insumosAnuaisBruto - (a.creditos.creditos_atuais + a.creditos.creditos_ibs_cbs));
    const impostosUnit = a.carga_total / unidadeAnual;
    const insumosUnit = insumosLiqAnual / unidadeAnual;
    const margemUnit = precoUnit - impostosUnit - insumosUnit;
    const aliqEfetiva = vendaAnual > 0 ? (a.carga_total / vendaAnual) * 100 : 0;
    const aliqAtuais = vendaAnual > 0 ? (a.tributos_atuais_bruto.total / vendaAnual) * 100 : 0;
    const aliqIbsCbs = vendaAnual > 0 ? (a.ibs_cbs_bruto.total / vendaAnual) * 100 : 0;
    const margemPct = precoUnit > 0 ? (margemUnit / precoUnit) * 100 : 0;
    return {
      ano: a.ano,
      fase: a.fase,
      preco: precoUnit,
      impostos: impostosUnit,
      insumos: insumosUnit,
      margem: margemUnit,
      aliqEfetiva,
      aliqAtuais,
      aliqIbsCbs,
      margemPct,
    };
  });

  const ultimo = linhas[linhas.length - 1];
  const base = linhas[0];
  if (!ultimo || !base) return null;

  const deltaAliqPp = ultimo.aliqEfetiva - base.aliqEfetiva; // pontos percentuais
  const deltaMargemRS = ultimo.margem - base.margem;
  const deltaMargemPp = ultimo.margemPct - base.margemPct;
  const margemPositiva = deltaMargemRS >= 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Resultado por item</CardTitle>
          <CardDescription>
            Foco no impacto da reforma sobre <strong>uma {porUnidade ? "unidade" : "operação mensal"}</strong> do produto —
            comparando o ano-base ({base.ano}) com o ano-alvo ({ultimo.ano}).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {/* Preço */}
            <Card className="border-primary/30">
              <CardHeader className="pb-2 flex-row items-center gap-2 space-y-0">
                <Wallet className="h-4 w-4 text-primary" />
                <CardDescription>Preço de venda {sufixo}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tabular-nums">{formatBRL(ultimo.preco)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {porUnidade ? `${quantidadeMensal.toLocaleString("pt-BR")} unid./mês` : "Receita mensal do item"}
                </p>
              </CardContent>
            </Card>

            {/* Carga em % e R$/unid */}
            <Card>
              <CardHeader className="pb-2 flex-row items-center gap-2 space-y-0">
                <Percent className="h-4 w-4 text-destructive" />
                <CardDescription>Alíquota efetiva em {ultimo.ano}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tabular-nums">{formatPct(ultimo.aliqEfetiva)}</div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  {formatBRL(ultimo.impostos)} {sufixo}
                  <span className={`ml-1 inline-flex items-center gap-0.5 ${deltaAliqPp <= 0 ? "text-success" : "text-destructive"}`}>
                    {deltaAliqPp <= 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                    {deltaAliqPp >= 0 ? "+" : ""}{deltaAliqPp.toFixed(1)} p.p. vs {base.ano}
                  </span>
                </p>
              </CardContent>
            </Card>

            {/* Insumos */}
            <Card>
              <CardHeader className="pb-2 flex-row items-center gap-2 space-y-0">
                <Package className="h-4 w-4 text-warning-foreground" />
                <CardDescription>Insumos {sufixo} (líq.)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tabular-nums">{formatBRL(ultimo.insumos)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {ultimo.preco > 0 ? `${((ultimo.insumos / ultimo.preco) * 100).toFixed(1)}% do preço` : "—"}
                </p>
              </CardContent>
            </Card>

            {/* Margem */}
            <Card className={margemPositiva ? "border-success/40" : "border-destructive/40"}>
              <CardHeader className="pb-2 flex-row items-center gap-2 space-y-0">
                <PiggyBank className={`h-4 w-4 ${margemPositiva ? "text-success" : "text-destructive"}`} />
                <CardDescription>Margem {sufixo} em {ultimo.ano}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold tabular-nums ${ultimo.margem >= 0 ? "text-success" : "text-destructive"}`}>
                  {formatBRL(ultimo.margem)}
                </div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  {formatPct(ultimo.margemPct)} do preço
                  <span className={`ml-1 inline-flex items-center gap-0.5 ${margemPositiva ? "text-success" : "text-destructive"}`}>
                    {margemPositiva ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {deltaMargemPp >= 0 ? "+" : ""}{deltaMargemPp.toFixed(1)} p.p. vs {base.ano}
                  </span>
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Gráfico 1 — alíquota efetiva (%) */}
          {linhas.length > 1 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Receipt className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-sm font-semibold">Alíquota efetiva sobre o item</h4>
                <Badge variant="outline" className="text-xs">% sobre o preço</Badge>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={linhas}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="ano" />
                    <YAxis tickFormatter={(v) => `${v.toFixed(0)}%`} />
                    <Tooltip formatter={(v: any) => `${Number(v).toFixed(2)}%`} />
                    <Legend />
                    <Line type="monotone" dataKey="aliqAtuais" name="Tributos atuais" stroke="var(--color-chart-3)" strokeWidth={2} />
                    <Line type="monotone" dataKey="aliqIbsCbs" name="IBS/CBS" stroke="var(--color-chart-1)" strokeWidth={2} />
                    <Line type="monotone" dataKey="aliqEfetiva" name="Carga total efetiva" stroke="var(--color-chart-2)" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Gráfico 2 — composição do preço unitário */}
          {linhas.length > 1 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-sm font-semibold">Composição do preço {sufixo}</h4>
                <Badge variant="outline" className="text-xs">R$ {sufixo}</Badge>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={linhas}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="ano" />
                    <YAxis tickFormatter={(v) => formatBRL(Number(v))} />
                    <Tooltip formatter={(v: any) => formatBRL(Number(v))} />
                    <Legend />
                    <Bar dataKey="impostos" name="Impostos" stackId="p" fill="var(--color-chart-3)" />
                    <Bar dataKey="insumos" name="Insumos (líq.)" stackId="p" fill="var(--color-chart-4)" />
                    <Bar dataKey="margem" name="Margem" stackId="p" fill="var(--color-chart-2)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Tabela ano a ano */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2">Ano</th>
                  <th className="text-left py-2 px-2">Fase</th>
                  <th className="text-right py-2 px-2">Preço {sufixo}</th>
                  <th className="text-right py-2 px-2">Impostos {sufixo}</th>
                  <th className="text-right py-2 px-2">Alíq. efetiva</th>
                  <th className="text-right py-2 px-2">Insumos {sufixo}</th>
                  <th className="text-right py-2 px-2">Margem {sufixo}</th>
                  <th className="text-right py-2 px-2">Margem %</th>
                  <th className="text-right py-2 px-2">Δ Margem vs {base.ano}</th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((l) => {
                  const dMargem = l.margem - base.margem;
                  return (
                    <tr key={l.ano} className="border-b hover:bg-muted/50">
                      <td className="py-2 px-2 font-medium">{l.ano}</td>
                      <td className="py-2 px-2">
                        <Badge variant="outline" className="text-xs whitespace-nowrap">{l.fase}</Badge>
                      </td>
                      <td className="py-2 px-2 text-right tabular-nums">{formatBRL(l.preco)}</td>
                      <td className="py-2 px-2 text-right tabular-nums text-destructive">-{formatBRL(l.impostos)}</td>
                      <td className="py-2 px-2 text-right tabular-nums">{formatPct(l.aliqEfetiva)}</td>
                      <td className="py-2 px-2 text-right tabular-nums text-warning-foreground">-{formatBRL(l.insumos)}</td>
                      <td className={`py-2 px-2 text-right tabular-nums font-semibold ${l.margem >= 0 ? "text-success" : "text-destructive"}`}>
                        {formatBRL(l.margem)}
                      </td>
                      <td className={`py-2 px-2 text-right tabular-nums ${l.margem >= 0 ? "text-success" : "text-destructive"}`}>
                        {formatPct(l.margemPct)}
                      </td>
                      <td className={`py-2 px-2 text-right tabular-nums ${dMargem >= 0 ? "text-success" : "text-destructive"}`}>
                        {dMargem >= 0 ? "+" : ""}{formatBRL(dMargem)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
