import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/AuthContext";
import { useLinkedEmpresa } from "@/hooks/useLinkedEmpresa";
import { supabase } from "@/integrations/supabase/client";
import { formatCnpj } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Save } from "lucide-react";
import { ProdutosTab } from "@/components/ProdutosTab";
import { ServicosTab } from "@/components/ServicosTab";
import { CreditosTab } from "@/components/CreditosTab";
import { ChecklistReformaTab } from "@/components/ChecklistReformaTab";
import {
  EmpresaFormFields,
  getEmptyEmpresaForm,
  type EmpresaFormValues,
} from "@/components/EmpresaFormFields";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/empresas/$empresaId")({
  head: () => ({
    meta: [
      { title: "Detalhe da Empresa — Reforma Tributária" },
      { name: "description", content: "Dados detalhados da empresa." },
    ],
  }),
  component: EmpresaDetalhePage,
});

function EmpresaDetalhePage() {
  const { empresaId } = Route.useParams();
  const auth = useAuth();
  const linkedEmpresa = useLinkedEmpresa();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<EmpresaFormValues>(getEmptyEmpresaForm());
  const [simulacoes, setSimulacoes] = useState<any[]>([]);

  useEffect(() => {
    const fetchEmpresa = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("empresas")
        .select("*")
        .eq("id", empresaId)
        .single();

      if (data) {
        setForm({
          cnpj: data.cnpj || "",
          razao_social: data.razao_social || "",
          nome_fantasia: data.nome_fantasia || "",
          regime_tributario: data.regime_tributario || "simples_nacional",
          cnae_principal: data.cnae_principal || "",
          email: data.email || "",
          telefone: data.telefone || "",
          endereco: data.endereco || "",
          inscricao_estadual: data.inscricao_estadual || "",
          inscricao_municipal: data.inscricao_municipal || "",
          uf: data.uf || "",
          municipio: data.municipio || "",
          faturamento_anual: String(data.faturamento_anual || ""),
          optante_simples_mei: data.optante_simples_mei || false,
          perc_insumos_creditaveis:
            data.perc_insumos_creditaveis != null ? String(data.perc_insumos_creditaveis) : "",
        });

      }
      setLoading(false);
    };

    const fetchSimulacoes = async () => {
      const { data } = await supabase
        .from("simulacoes")
        .select("id, nome, created_at")
        .eq("empresa_id", empresaId)
        .order("created_at", { ascending: false });
      setSimulacoes(data || []);
    };

    fetchEmpresa();
    fetchSimulacoes();
  }, [empresaId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const payload = {
      cnpj: form.cnpj,
      razao_social: form.razao_social,
      nome_fantasia: form.nome_fantasia || null,
      regime_tributario: form.regime_tributario,
      cnae_principal: form.cnae_principal || null,
      email: form.email || null,
      telefone: form.telefone || null,
      endereco: form.endereco || null,
      inscricao_estadual: form.inscricao_estadual || null,
      inscricao_municipal: form.inscricao_municipal || null,
      uf: form.uf || null,
      municipio: form.municipio || null,
      faturamento_anual: Number(form.faturamento_anual) || 0,
      optante_simples_mei: form.optante_simples_mei,
      perc_insumos_creditaveis: Number(form.perc_insumos_creditaveis) || 0,
    };


    const { error } = await supabase
      .from("empresas")
      .update(payload)
      .eq("id", empresaId);

    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Dados salvos com sucesso!");
  };

  if (loading) {
    return <p className="p-4 text-sm text-muted-foreground">Carregando...</p>;
  }

  if (auth.hasRole("cliente") && linkedEmpresa.empresaId && linkedEmpresa.empresaId !== empresaId) {
    return <p className="p-4 text-sm text-muted-foreground">Você não tem acesso a esta empresa.</p>;
  }

  const isStaff = auth.isStaff();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to={auth.hasRole("cliente") ? "/minha-empresa" : "/empresas"}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{form.razao_social || "Empresa"}</h1>
          <p className="text-sm text-muted-foreground">{formatCnpj(form.cnpj)}</p>
        </div>
      </div>

      <Tabs defaultValue="dados" className="space-y-4">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-2">
          <TabsTrigger value="dados">Dados Gerais</TabsTrigger>
          <TabsTrigger value="produtos">Produtos</TabsTrigger>
          <TabsTrigger value="servicos">Serviços</TabsTrigger>
          <TabsTrigger value="creditos">Créditos</TabsTrigger>
          <TabsTrigger value="checklist">Checklist</TabsTrigger>
          <TabsTrigger value="simulacoes">Simulações</TabsTrigger>
        </TabsList>

        <TabsContent value="dados">
          <Card>
            <CardHeader>
              <CardTitle>Dados cadastrais e premissas da simulação</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="space-y-4">
                <EmpresaFormFields form={form} setForm={setForm} />
                {isStaff && (
                  <Button type="submit" disabled={saving}>
                    <Save className="mr-2 h-4 w-4" />
                    {saving ? "Salvando..." : "Salvar Alterações"}
                  </Button>
                )}
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="produtos">
          <Card>
            <CardHeader>
              <CardTitle>Produtos</CardTitle>
            </CardHeader>
            <CardContent>
              <ProdutosTab empresaId={empresaId} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="servicos">
          <Card>
            <CardHeader>
              <CardTitle>Serviços</CardTitle>
            </CardHeader>
            <CardContent>
              <ServicosTab empresaId={empresaId} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="creditos">
          <Card>
            <CardHeader>
              <CardTitle>Créditos de Aquisição</CardTitle>
            </CardHeader>
            <CardContent>
              <CreditosTab empresaId={empresaId} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="checklist">
          <Card>
            <CardHeader>
              <CardTitle>Checklist — Ações para a Reforma Tributária</CardTitle>
            </CardHeader>
            <CardContent>
              <ChecklistReformaTab empresaId={empresaId} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="simulacoes">
          <Card>
            <CardHeader>
              <CardTitle>Simulações</CardTitle>
            </CardHeader>
            <CardContent>
              {simulacoes.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma simulação realizada.</p>
              ) : (
                <div className="space-y-2">
                  {simulacoes.map((s) => (
                    <div key={s.id} className="flex items-center justify-between rounded-md border p-3">
                      <div>
                        <p className="font-medium">{s.nome}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(s.created_at).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                      <Link to="/simulador">
                        <Button variant="outline" size="sm">Ver</Button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
