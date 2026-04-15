import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { formatCnpj } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const [form, setForm] = useState<{
    cnpj: string;
    razao_social: string;
    nome_fantasia: string;
    regime_tributario: "simples_nacional" | "lucro_presumido" | "lucro_real";
    cnae_principal: string;
    email: string;
    telefone: string;
    uf: string;
    faturamento_anual: string;
  }>({
    cnpj: "",
    razao_social: "",
    nome_fantasia: "",
    regime_tributario: "simples_nacional",
    cnae_principal: "",
    email: "",
    telefone: "",
    uf: "",
    faturamento_anual: "",
  });

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
    const { error } = await supabase.from("empresas").insert(form as any);
    if (!error) {
      setDialogOpen(false);
      setForm({ cnpj: "", razao_social: "", nome_fantasia: "", regime_tributario: "simples_nacional", cnae_principal: "", email: "", telefone: "", uf: "", faturamento_anual: "" });
      fetchEmpresas();
    }
  };

  const handleEdit = (empresa: any) => {
    setEditingEmpresa(empresa);
    setForm({
      cnpj: empresa.cnpj || "",
      razao_social: empresa.razao_social || "",
      nome_fantasia: empresa.nome_fantasia || "",
      regime_tributario: empresa.regime_tributario || "simples_nacional",
      cnae_principal: empresa.cnae_principal || "",
      email: empresa.email || "",
      telefone: empresa.telefone || "",
      uf: empresa.uf || "",
      faturamento_anual: empresa.faturamento_anual ? String(empresa.faturamento_anual) : "",
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
        uf: form.uf,
        faturamento_anual: form.faturamento_anual ? Number(form.faturamento_anual) : null,
      })
      .eq("id", editingEmpresa.id);
      
    if (!error) {
      setEditDialogOpen(false);
      setEditingEmpresa(null);
      setForm({ cnpj: "", razao_social: "", nome_fantasia: "", regime_tributario: "simples_nacional", cnae_principal: "", email: "", telefone: "", uf: "", faturamento_anual: "" });
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>CNPJ</Label>
                    <Input
                      value={formatCnpj(form.cnpj)}
                      onChange={(e) => setForm({ ...form, cnpj: e.target.value.replace(/\D/g, "").slice(0, 14) })}
                      placeholder="00.000.000/0000-00"
                      className="input-cnpj"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Regime Tributário</Label>
                    <Select
                      value={form.regime_tributario}
                      onValueChange={(v) => setForm({ ...form, regime_tributario: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="simples_nacional">Simples Nacional</SelectItem>
                        <SelectItem value="lucro_presumido">Lucro Presumido</SelectItem>
                        <SelectItem value="lucro_real">Lucro Real</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Razão Social</Label>
                  <Input
                    value={form.razao_social}
                    onChange={(e) => setForm({ ...form, razao_social: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nome Fantasia</Label>
                  <Input
                    value={form.nome_fantasia}
                    onChange={(e) => setForm({ ...form, nome_fantasia: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>UF</Label>
                    <Input
                      value={form.uf}
                      onChange={(e) => setForm({ ...form, uf: e.target.value.toUpperCase().slice(0, 2) })}
                      placeholder="SP"
                      maxLength={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Faturamento Anual (R$)</Label>
                    <Input
                      type="number"
                      value={form.faturamento_anual}
                      onChange={(e) => setForm({ ...form, faturamento_anual: e.target.value })}
                      placeholder="0,00"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>CNAE Principal</Label>
                    <Input
                      value={form.cnae_principal}
                      onChange={(e) => setForm({ ...form, cnae_principal: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input
                    value={form.telefone}
                    onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                    placeholder="(00) 00000-0000"
                  />
                </div>
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>CNPJ</Label>
                <Input
                  value={formatCnpj(form.cnpj)}
                  onChange={(e) => setForm({ ...form, cnpj: e.target.value.replace(/\D/g, "").slice(0, 14) })}
                  placeholder="00.000.000/0000-00"
                  className="input-cnpj"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Regime Tributário</Label>
                <Select
                  value={form.regime_tributario}
                  onValueChange={(v) => setForm({ ...form, regime_tributario: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="simples_nacional">Simples Nacional</SelectItem>
                    <SelectItem value="lucro_presumido">Lucro Presumido</SelectItem>
                    <SelectItem value="lucro_real">Lucro Real</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Razão Social</Label>
              <Input
                value={form.razao_social}
                onChange={(e) => setForm({ ...form, razao_social: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Nome Fantasia</Label>
              <Input
                value={form.nome_fantasia}
                onChange={(e) => setForm({ ...form, nome_fantasia: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>UF</Label>
                <Input
                  value={form.uf}
                  onChange={(e) => setForm({ ...form, uf: e.target.value.toUpperCase().slice(0, 2) })}
                  placeholder="SP"
                  maxLength={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Faturamento Anual (R$)</Label>
                <Input
                  type="number"
                  value={form.faturamento_anual}
                  onChange={(e) => setForm({ ...form, faturamento_anual: e.target.value })}
                  placeholder="0,00"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>CNAE Principal</Label>
                <Input
                  value={form.cnae_principal}
                  onChange={(e) => setForm({ ...form, cnae_principal: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input
                value={form.telefone}
                onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                placeholder="(00) 00000-0000"
              />
            </div>
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
