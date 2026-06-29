import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Calculator, BookOpen, Newspaper } from "lucide-react";
import { useAuth } from "@/hooks/AuthContext";
import { useLinkedEmpresa } from "@/hooks/useLinkedEmpresa";
import { supabase } from "@/integrations/supabase/client";
import { AnaliseEmpresaImportada } from "@/components/AnaliseEmpresaImportada";
import { DecisoesCriticasCard } from "@/components/DecisoesCriticasCard";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Reforma Tributária" },
      { name: "description", content: "Visão geral da plataforma de reforma tributária." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const auth = useAuth();
  const linkedEmpresa = useLinkedEmpresa();
  const [stats, setStats] = useState([
    { title: auth.hasRole("cliente") ? "Minha Empresa" : "Empresas", value: "—", icon: Building2, color: "bg-primary" },
    { title: "Simulações", value: "—", icon: Calculator, color: "bg-chart-2" },
    { title: "Artigos", value: "—", icon: BookOpen, color: "bg-chart-3" },
    { title: "Atualizações", value: "—", icon: Newspaper, color: "bg-chart-4" },
  ]);

  useEffect(() => {
    async function loadStats() {
      const empresaFilter = auth.hasRole("cliente") && linkedEmpresa.empresaId ? linkedEmpresa.empresaId : null;

      const empresasQuery = empresaFilter
        ? supabase.from("empresas").select("id", { count: "exact", head: true }).eq("id", empresaFilter)
        : supabase.from("empresas").select("id", { count: "exact", head: true });

      const simulacoesQuery = empresaFilter
        ? supabase.from("simulacoes").select("id", { count: "exact", head: true }).eq("empresa_id", empresaFilter)
        : supabase.from("simulacoes").select("id", { count: "exact", head: true });

      const [empresasRes, simulacoesRes, artigosRes, atualizacoesRes] = await Promise.all([
        empresasQuery,
        simulacoesQuery,
        supabase.from("artigos_legais").select("id", { count: "exact", head: true }).eq("publicado", true),
        supabase.from("fontes_atualizacao").select("id", { count: "exact", head: true }),
      ]);

      setStats([
        { title: auth.hasRole("cliente") ? "Minha Empresa" : "Empresas", value: String(empresasRes.count ?? 0), icon: Building2, color: "bg-primary" },
        { title: "Simulações", value: String(simulacoesRes.count ?? 0), icon: Calculator, color: "bg-chart-2" },
        { title: "Artigos", value: String(artigosRes.count ?? 0), icon: BookOpen, color: "bg-chart-3" },
        { title: "Atualizações", value: String(atualizacoesRes.count ?? 0), icon: Newspaper, color: "bg-chart-4" },
      ]);
    }

    if (!linkedEmpresa.loading) {
      loadStats();
    }
  }, [auth, linkedEmpresa.empresaId, linkedEmpresa.loading]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          {auth.hasRole("cliente")
            ? "Visão da sua empresa e das suas frentes prioritárias da reforma tributária"
            : "Visão geral da plataforma de suporte à reforma tributária"}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`h-8 w-8 rounded-lg ${stat.color} flex items-center justify-center`}>
                <stat.icon className="h-4 w-4 text-primary-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {linkedEmpresa.empresaId && (
        <AnaliseEmpresaImportada empresaId={linkedEmpresa.empresaId} />
      )}

      <DecisoesCriticasCard />


      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Últimas Simulações</CardTitle>
            <CardDescription>Simulações mais recentes realizadas</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Nenhuma simulação realizada ainda.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Atualizações Recentes</CardTitle>
            <CardDescription>Notícias sobre a reforma tributária</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Nenhuma atualização disponível.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
