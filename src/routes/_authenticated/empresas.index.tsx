import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { formatCnpj } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  EmpresaFormFields,
  getEmptyEmpresaForm,
  type EmpresaFormValues,
} from "@/components/EmpresaFormFields";
import { Plus, Search, ExternalLink, Pencil } from "lucide-react";

export const Route = createFileRoute("/_authenticated/empresas/")({
  head: () => ({
    meta: [
      { title: "Empresas — Reforma Tributária" },
      { name: "description", content: "Gestão de empresas clientes." },
    ],
  }),
  component: EmpresasPage,
});

const regimeLabels: Record<string, string> = {
  simples_nacional: "Simples Nacional",
  lucro_presumido: "Lucro Presumido",
  lucro_real: "Lucro Real",
};

function EmpresasPage() {
  const auth = useAuth();
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingEmpresa, setEditingEmpresa] = useState<any>(null);
  const [form, setForm] = useState<EmpresaFormValues>(getEmptyEmpresaForm());

  const fetchEmpresas = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("empresas")
      .select("*")
      .order("razao_social");
    setEmpresas(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchEmpresas();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("empresas").insert({
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
      faturamento_anual: form.faturamento_anual ? Number(form.faturamento_anual) : 0,
      optante_simples_mei: form.optante_simples_mei,
    } as any);
    if (!error) {
      setDialogOpen(false);
      setForm(getEmptyEmpresaForm());
      fetchEmpresas();
    }
  };

  const handleEdit = (empresa: any) => {
    setEditingEmpresa(empresa);
    setForm({
      cnpj: empresa.cnpj || "",
      razao_social: empresa.razao_social || "",
      nome_fantasia: empresa.nome_fantasia || "",
      regime_tributario: (empresa.regime_tributario as "simples_nacional" | "lucro_presumido" | "lucro_real") || "simples_nacional",
      cnae_principal: empresa.cnae_principal || "",
      email: empresa.email || "",
      telefone: empresa.telefone || "",
      endereco: empresa.endereco || "",
      inscricao_estadual: empresa.inscricao_estadual || "",
      inscricao_municipal: empresa.inscricao_municipal || "",
      uf: empresa.uf || "",
      municipio: empresa.municipio || "",
      faturamento_anual: empresa.faturamento_anual ? String(empresa.faturamento_anual) : "",
      optante_simples_mei: empresa.optante_simples_mei || false,
    });
    setEditDialogOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmpresa) return;
    
    const { error } = await supabase
      .from("empresas")
      .update({
        cnpj: form.cnpj,
        razao_social: form.razao_social,
        nome_fantasia: form.nome_fantasia,
        regime_tributario: form.regime_tributario,
        cnae_principal: form.cnae_principal,
        email: form.email,
        telefone: form.telefone,
        endereco: form.endereco || null,
        inscricao_estadual: form.inscricao_estadual || null,
        inscricao_municipal: form.inscricao_municipal || null,
        uf: form.uf,
        municipio: form.municipio || null,
        faturamento_anual: form.faturamento_anual ? Number(form.faturamento_anual) : null,
        optante_simples_mei: form.optante_simples_mei,
      })
      .eq("id", editingEmpresa.id);
      
    if (!error) {
      setEditDialogOpen(false);
      setEditingEmpresa(null);
      setForm(getEmptyEmpresaForm());
      fetchEmpresas();
    }
  };

  const canEdit = auth.isAdmin() || auth.isStaff();

  const filtered = empresas.filter(
    (e) =>
      e.razao_social?.toLowerCase().includes(search.toLowerCase()) ||
      e.cnpj?.includes(search)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Empresas</h1>
          <p className="text-muted-foreground mt-1">Gerencie as empresas clientes</p>
        </div>
        {auth.isAdmin() && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nova Empresa
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Cadastrar Empresa</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <EmpresaFormFields form={form} setForm={setForm} />
                <Button type="submit" className="w-full">Cadastrar</Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Dialog de Edição */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Empresa</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <EmpresaFormFields form={form} setForm={setForm} />
            <Button type="submit" className="w-full">Salvar Alterações</Button>
          </form>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por razão social ou CNPJ..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma empresa encontrada.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Razão Social</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead>UF</TableHead>
                  <TableHead>Regime</TableHead>
                  <TableHead>Faturamento Anual</TableHead>
                  <TableHead>CNAE</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((empresa) => (
                  <TableRow key={empresa.id}>
                    <TableCell className="font-medium">{empresa.razao_social}</TableCell>
                    <TableCell className="input-cnpj">{formatCnpj(empresa.cnpj)}</TableCell>
                    <TableCell>{(empresa as any).uf || "—"}</TableCell>
                    <TableCell>{regimeLabels[empresa.regime_tributario] || empresa.regime_tributario}</TableCell>
                    <TableCell className="tabular-nums text-right whitespace-nowrap">
                      {(empresa as any).faturamento_anual
                        ? Number((empresa as any).faturamento_anual).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                        : "—"}
                    </TableCell>
                    <TableCell>{empresa.cnae_principal || "—"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {canEdit && (
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(empresa)} title="Editar">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        <Link to="/empresas/$empresaId" params={{ empresaId: empresa.id }}>
                          <Button variant="ghost" size="icon" title="Ver detalhes">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
