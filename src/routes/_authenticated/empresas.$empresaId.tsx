import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Save } from "lucide-react";
import { ProdutosTab } from "@/components/ProdutosTab";
import { ServicosTab } from "@/components/ServicosTab";
import { CreditosTab } from "@/components/CreditosTab";
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

const UF_LIST = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA",
  "PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

function EmpresaDetalhePage() {
  const { empresaId } = Route.useParams();
  const auth = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    cnpj: "",
    razao_social: "",
    nome_fantasia: "",
    regime_tributario: "simples_nacional",
    cnae_principal: "",
    email: "",
    telefone: "",
    endereco: "",
    inscricao_estadual: "",
    inscricao_municipal: "",
    uf: "",
    municipio: "",
    faturamento_anual: "",
    optante_simples_mei: false,
  });
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
          inscricao_estadual: (data as any).inscricao_estadual || "",
          inscricao_municipal: (data as any).inscricao_municipal || "",
          uf: (data as any).uf || "",
          municipio: (data as any).municipio || "",
          faturamento_anual: String((data as any).faturamento_anual || ""),
          optante_simples_mei: (data as any).optante_simples_mei || false,
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
    const payload: any = {
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
    return <p className="text-sm text-muted-foreground p-4">Carregando...</p>;
  }

  const isStaff = auth.isStaff();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/empresas">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{form.razao_social || "Empresa"}</h1>
          <p className="text-sm text-muted-foreground">{form.cnpj}</p>
        </div>
      </div>

      <Tabs defaultValue="dados">
        <TabsList>
          <TabsTrigger value="dados">Dados Gerais</TabsTrigger>
          <TabsTrigger value="produtos">Produtos</TabsTrigger>
          <TabsTrigger value="servicos">Serviços</TabsTrigger>
          <TabsTrigger value="creditos">Créditos</TabsTrigger>
          <TabsTrigger value="simulacoes">Simulações</TabsTrigger>
        </TabsList>

        <TabsContent value="dados">
          <Card>
            <CardHeader>
              <CardTitle>Dados Cadastrais</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label>CNPJ</Label>
                    <Input value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} required />
                  </div>
                  <div className="space-y-1">
                    <Label>Razão Social</Label>
                    <Input value={form.razao_social} onChange={(e) => setForm({ ...form, razao_social: e.target.value })} required />
                  </div>
                  <div className="space-y-1">
                    <Label>Nome Fantasia</Label>
                    <Input value={form.nome_fantasia} onChange={(e) => setForm({ ...form, nome_fantasia: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label>Regime Tributário</Label>
                    <Select value={form.regime_tributario} onValueChange={(v) => setForm({ ...form, regime_tributario: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="simples_nacional">Simples Nacional</SelectItem>
                        <SelectItem value="lucro_presumido">Lucro Presumido</SelectItem>
                        <SelectItem value="lucro_real">Lucro Real</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>CNAE Principal</Label>
                    <Input value={form.cnae_principal} onChange={(e) => setForm({ ...form, cnae_principal: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>Faturamento Anual (R$)</Label>
                    <Input type="number" step="0.01" value={form.faturamento_anual} onChange={(e) => setForm({ ...form, faturamento_anual: e.target.value })} className="input-numeric" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label>Inscrição Estadual</Label>
                    <Input value={form.inscricao_estadual} onChange={(e) => setForm({ ...form, inscricao_estadual: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>Inscrição Municipal</Label>
                    <Input value={form.inscricao_municipal} onChange={(e) => setForm({ ...form, inscricao_municipal: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>UF</Label>
                    <Select value={form.uf || "_none_"} onValueChange={(v) => setForm({ ...form, uf: v === "_none_" ? "" : v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none_">—</SelectItem>
                        {UF_LIST.map((uf) => (
                          <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label>Município</Label>
                    <Input value={form.municipio} onChange={(e) => setForm({ ...form, municipio: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>Email</Label>
                    <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>Telefone</Label>
                    <Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Endereço</Label>
                  <Input value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} />
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={form.optante_simples_mei} onCheckedChange={(v) => setForm({ ...form, optante_simples_mei: v })} />
                  <Label>Optante Simples/MEI</Label>
                </div>
                {isStaff && (
                  <Button type="submit" disabled={saving}>
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? "Salvando..." : "Salvar Alterações"}
                  </Button>
                )}
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="produtos">
          <Card>
            <CardHeader><CardTitle>Produtos</CardTitle></CardHeader>
            <CardContent>
              <ProdutosTab empresaId={empresaId} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="servicos">
          <Card>
            <CardHeader><CardTitle>Serviços</CardTitle></CardHeader>
            <CardContent>
              <ServicosTab empresaId={empresaId} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="creditos">
          <Card>
            <CardHeader><CardTitle>Créditos de Aquisição</CardTitle></CardHeader>
            <CardContent>
              <CreditosTab empresaId={empresaId} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="simulacoes">
          <Card>
            <CardHeader><CardTitle>Simulações</CardTitle></CardHeader>
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
