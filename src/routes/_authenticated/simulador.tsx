import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export const Route = createFileRoute("/_authenticated/simulador")({
  head: () => ({
    meta: [
      { title: "Simulador Tributário — Reforma Tributária" },
      { name: "description", content: "Simule cenários da reforma tributária para sua empresa." },
    ],
  }),
  component: SimuladorPage,
});

// Simplified transition schedule (CBS + IBS percentages by year)
const transicao: Record<number, { cbs: number; ibs: number; reducao_atual: number }> = {
  2026: { cbs: 0.9, ibs: 0, reducao_atual: 0 },
  2027: { cbs: 0.9, ibs: 0, reducao_atual: 0 },
  2028: { cbs: 0.9, ibs: 0, reducao_atual: 0 },
  2029: { cbs: 100, ibs: 10, reducao_atual: 10 },
  2030: { cbs: 100, ibs: 25, reducao_atual: 25 },
  2031: { cbs: 100, ibs: 50, reducao_atual: 50 },
  2032: { cbs: 100, ibs: 75, reducao_atual: 75 },
  2033: { cbs: 100, ibs: 100, reducao_atual: 100 },
};

function SimuladorPage() {
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [empresaId, setEmpresaId] = useState("");
  const [resultados, setResultados] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("empresas").select("id, razao_social").order("razao_social").then(({ data }) => {
      setEmpresas(data || []);
    });
  }, []);

  const simular = async () => {
    if (!empresaId) return;

    // Fetch products and services for the empresa
    const [{ data: produtos }, { data: servicos }] = await Promise.all([
      supabase.from("produtos").select("*").eq("empresa_id", empresaId),
      supabase.from("servicos").select("*").eq("empresa_id", empresaId),
    ]);

    // Calculate current tax burden
    const totalProdutos = (produtos || []).reduce((acc: number, p: any) => {
      const tributos = (Number(p.aliquota_ipi) + Number(p.aliquota_pis) + Number(p.aliquota_cofins) + Number(p.aliquota_icms)) / 100;
      return acc + Number(p.valor_mensal) * tributos;
    }, 0);

    const totalServicos = (servicos || []).reduce((acc: number, s: any) => {
      const tributos = (Number(s.aliquota_iss) + Number(s.aliquota_pis) + Number(s.aliquota_cofins)) / 100;
      return acc + Number(s.valor_mensal) * tributos;
    }, 0);

    const cargaAtual = (totalProdutos + totalServicos) * 12; // Annual

    // IBS/CBS reference rate (simplified)
    const aliquotaIbsCbs = 0.265; // 26.5% reference
    const faturamentoAnual = ((produtos || []).reduce((a: number, p: any) => a + Number(p.valor_mensal), 0) +
      (servicos || []).reduce((a: number, s: any) => a + Number(s.valor_mensal), 0)) * 12;

    const cargaNova = faturamentoAnual * aliquotaIbsCbs;

    // Generate transition data
    const dados = Object.entries(transicao).map(([ano, t]) => {
      const reducao = t.reducao_atual / 100;
      const atual = cargaAtual * (1 - reducao);
      const novo = cargaNova * reducao;
      return {
        ano: Number(ano),
        "Sistema Atual": Math.round(atual),
        "IBS/CBS": Math.round(novo),
        Total: Math.round(atual + novo),
      };
    });

    setResultados(dados);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Simulador Tributário</h1>
        <p className="text-muted-foreground mt-1">
          Compare a carga tributária atual com o novo modelo IBS/CBS
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Parâmetros da Simulação</CardTitle>
          <CardDescription>Selecione a empresa para simular os cenários</CardDescription>
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
            <Button onClick={simular} disabled={!empresaId}>
              Simular
            </Button>
          </div>
        </CardContent>
      </Card>

      {resultados.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Resultado da Simulação — Transição 2026-2033</CardTitle>
            <CardDescription>
              Carga tributária anual estimada (R$) durante o período de transição
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={resultados}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="ano" />
                  <YAxis tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => `R$ ${v.toLocaleString("pt-BR")}`} />
                  <Legend />
                  <Bar dataKey="Sistema Atual" fill="var(--color-chart-5)" stackId="a" />
                  <Bar dataKey="IBS/CBS" fill="var(--color-chart-1)" stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
