import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, AreaChart, Area,
} from "recharts";
import {
  executarSimulacao,
  type SimulacaoInput,
  type ResultadoSimulacao,
  type ProdutoInput,
  type ServicoInput,
  type CreditoInput,
  type EmpresaInput,
  type RegimeDiferenciado,
} from "@/lib/tax-engine";
import { AlertTriangle, TrendingDown, TrendingUp, Info, Calculator } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/simulador")({
  head: () => ({
    meta: [
      { title: "Simulador Tributário — Reforma Tributária" },
      { name: "description", content: "Simule cenários da reforma tributária para sua empresa." },
    ],
  }),
  component: SimuladorPage,
});

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function SimuladorPage() {
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [empresaId, setEmpresaId] = useState("");
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<ResultadoSimulacao | null>(null);

  useEffect(() => {
    supabase.from("empresas").select("id, razao_social, cnpj").order("razao_social").then(({ data }) => {
      setEmpresas(data || []);
    });
  }, []);

  const simular = async () => {
    if (!empresaId) return;
    setLoading(true);

    try {
      // Buscar todos os dados da empresa em paralelo
      const [{ data: empresa }, { data: produtos }, { data: servicos }, { data: creditos }] = await Promise.all([
        supabase.from("empresas").select("*").eq("id", empresaId).single(),
        supabase.from("produtos").select("*").eq("empresa_id", empresaId),
        supabase.from("servicos").select("*").eq("empresa_id", empresaId),
        supabase.from("creditos_aquisicao").select("*").eq("empresa_id", empresaId),
      ]);

      if (!empresa) {
        toast.error("Empresa não encontrada");
        return;
      }

      // Montar input para o motor de cálculo
      const empresaInput: EmpresaInput = {
        razao_social: empresa.razao_social,
        cnpj: empresa.cnpj,
        regime_tributario: empresa.regime_tributario as EmpresaInput["regime_tributario"],
        uf: empresa.uf,
        municipio: empresa.municipio,
        faturamento_anual: Number(empresa.faturamento_anual) || 0,
        optante_simples_mei: empresa.optante_simples_mei || false,
      };

      const produtosInput: ProdutoInput[] = (produtos || []).map((p: any) => ({
        descricao: p.descricao,
        ncm: p.ncm,
        valor_mensal: Number(p.valor_mensal) || 0,
        quantidade_mensal: Number(p.quantidade_mensal) || 0,
        regime_diferenciado: (p.regime_diferenciado || "padrao") as RegimeDiferenciado,
        tipo_operacao: p.tipo_operacao || "revenda",
        aliquota_ipi: Number(p.aliquota_ipi) || 0,
        aliquota_pis: Number(p.aliquota_pis) || 0,
        aliquota_cofins: Number(p.aliquota_cofins) || 0,
        aliquota_icms: Number(p.aliquota_icms) || 0,
      }));

      const servicosInput: ServicoInput[] = (servicos || []).map((s: any) => ({
        descricao: s.descricao,
        codigo_servico: s.codigo_servico,
        valor_mensal: Number(s.valor_mensal) || 0,
        regime_diferenciado: (s.regime_diferenciado || "padrao") as RegimeDiferenciado,
        tipo_servico: s.tipo_servico || "",
        aliquota_iss: Number(s.aliquota_iss) || 0,
        aliquota_pis: Number(s.aliquota_pis) || 0,
        aliquota_cofins: Number(s.aliquota_cofins) || 0,
      }));

      const creditosInput: CreditoInput[] = (creditos || []).map((c: any) => ({
        fornecedor: c.fornecedor,
        descricao: c.descricao,
        ncm: c.ncm,
        valor_mensal: Number(c.valor_mensal) || 0,
        aliquota_ipi: Number(c.aliquota_ipi) || 0,
        aliquota_pis: Number(c.aliquota_pis) || 0,
        aliquota_cofins: Number(c.aliquota_cofins) || 0,
        aliquota_icms: Number(c.aliquota_icms) || 0,
      }));

      const input: SimulacaoInput = {
        empresa: empresaInput,
        produtos: produtosInput,
        servicos: servicosInput,
        creditos: creditosInput,
      };

      const res = executarSimulacao(input);
      setResultado(res);

      if (produtosInput.length === 0 && servicosInput.length === 0) {
        toast.warning("Nenhum produto ou serviço cadastrado. Cadastre os dados na página da empresa para uma simulação precisa.");
      } else {
        toast.success("Simulação concluída!");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao executar simulação");
    } finally {
      setLoading(false);
    }
  };

  // Dados para o gráfico de barras empilhadas
  const dadosGrafico = resultado?.anos.map((a) => ({
    ano: a.ano,
    "PIS/COFINS": Math.round(a.tributos_atuais_bruto.pis + a.tributos_atuais_bruto.cofins),
    "IPI": Math.round(a.tributos_atuais_bruto.ipi),
    "ICMS": Math.round(a.tributos_atuais_bruto.icms),
    "ISS": Math.round(a.tributos_atuais_bruto.iss),
    "CBS": Math.round(a.ibs_cbs_bruto.cbs),
    "IBS": Math.round(a.ibs_cbs_bruto.ibs),
  })) || [];

  // Dados para gráfico de carga líquida
  const dadosCargaLiquida = resultado?.anos.map((a) => ({
    ano: a.ano,
    "Carga Atual": Math.round(a.carga_atual_liquida),
    "Carga IBS/CBS": Math.round(a.carga_nova_liquida),
    "Total": Math.round(a.carga_total),
    "Variação (%)": Number(a.variacao_pct.toFixed(1)),
  })) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Simulador Tributário</h1>
        <p className="text-muted-foreground mt-1">
          Motor de cálculo baseado na LC 214/2025, EC 132/2023 e LCP 227
        </p>
      </div>

      {/* Seleção de empresa */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Parâmetros da Simulação
          </CardTitle>
          <CardDescription>Selecione a empresa com produtos, serviços e créditos cadastrados</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div className="space-y-2 flex-1 max-w-sm">
              <Label>Empresa</Label>
              <Select value={empresaId} onValueChange={setEmpresaId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma empresa" />
                </SelectTrigger>
                <SelectContent>
                  {empresas.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.razao_social}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={simular} disabled={!empresaId || loading}>
              {loading ? "Calculando…" : "Simular"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {resultado && (
        <>
          {/* Alertas */}
          {resultado.alertas.length > 0 && (
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-amber-600">
                  <AlertTriangle className="h-4 w-4" />
                  Observações da Simulação
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {resultado.alertas.map((a, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex gap-2">
                      <Info className="h-4 w-4 mt-0.5 shrink-0 text-amber-500" />
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
                <CardDescription>Variação em 2033</CardDescription>
              </CardHeader>
              <CardContent>
                {resultado.anos.length > 0 && (() => {
                  const ultimo = resultado.anos[resultado.anos.length - 1];
                  const positivo = ultimo.variacao >= 0;
                  return (
                    <>
                      <div className={`text-2xl font-bold tabular-nums flex items-center gap-1 ${positivo ? "text-red-500" : "text-green-500"}`}>
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
                  {resultado.regime_tributario.replace("_", " ")}
                </Badge>
                <div className="text-sm tabular-nums">{formatBRL(resultado.faturamento_anual)}/ano</div>
              </CardContent>
            </Card>
          </div>

          {/* Gráfico de Tributos Brutos */}
          <Card>
            <CardHeader>
              <CardTitle>Tributos Brutos por Ano — Transição 2026-2033</CardTitle>
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
                    <Bar dataKey="CBS" fill="var(--color-chart-5)" stackId="b" />
                    <Bar dataKey="IBS" fill="hsl(200 80% 50%)" stackId="b" />
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
                    <Tooltip formatter={(v: any, name: string) => name === "Variação (%)" ? `${v}%` : formatBRL(Number(v))} />
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
                      <td className="py-2 px-2 text-right tabular-nums">{formatBRL(a.ibs_cbs_bruto.total)}</td>
                      <td className="py-2 px-2 text-right tabular-nums text-green-600">
                        -{formatBRL(a.creditos.creditos_atuais + a.creditos.creditos_ibs_cbs)}
                      </td>
                      <td className="py-2 px-2 text-right tabular-nums font-medium">{formatBRL(a.carga_total)}</td>
                      <td className={`py-2 px-2 text-right tabular-nums font-medium ${a.variacao >= 0 ? "text-red-500" : "text-green-500"}`}>
                        {a.variacao >= 0 ? "+" : ""}{a.variacao_pct.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
