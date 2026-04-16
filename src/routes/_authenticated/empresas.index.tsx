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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  EmpresaFormFields,
  getEmptyEmpresaForm,
  type EmpresaFormValues,
} from "@/components/EmpresaFormFields";
import { Plus, Search, ExternalLink, Pencil, FileDown } from "lucide-react";
import { toast } from "sonner";
import type { ResultadoSimulacao } from "@/lib/tax-engine";

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
  const [ultimaSimulacao, setUltimaSimulacao] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
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

    // Buscar última simulação de cada empresa
    const { data: sims } = await supabase
      .from("simulacoes")
      .select("id, empresa_id, nome, created_at, resultados")
      .order("created_at", { ascending: false });

    const map: Record<string, any> = {};
    sims?.forEach((s) => {
      if (!map[s.empresa_id]) map[s.empresa_id] = s;
    });
    setUltimaSimulacao(map);

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
      })
      .eq("id", editingEmpresa.id);

    if (!error) {
      setEditDialogOpen(false);
      setEditingEmpresa(null);
      setForm(getEmptyEmpresaForm());
      fetchEmpresas();
    }
  };

  const handleDownloadRelatorio = async (empresaId: string) => {
    const sim = ultimaSimulacao[empresaId];
    if (!sim?.resultados) return;
    setDownloading(empresaId);
    try {
      const { gerarRelatorioPDF } = await import("@/lib/relatorio-pdf");
      await gerarRelatorioPDF(sim.resultados as ResultadoSimulacao);
      toast.success("Relatório baixado!");
    } catch {
      toast.error("Erro ao gerar relatório");
    } finally {
      setDownloading(null);
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
          <p className="mt-1 text-muted-foreground">Gerencie as empresas clientes</p>
        </div>
        {auth.isAdmin() && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nova Empresa
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Cadastrar Empresa</DialogTitle>
                <DialogDescription>
                  Role até o fim: os campos de simulação ficam na seção “Dados para simulação”.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <EmpresaFormFields form={form} setForm={setForm} />
                <Button type="submit" className="w-full">Cadastrar</Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Empresa</DialogTitle>
            <DialogDescription>
              Os campos de simulação estão na segunda seção do formulário e agora ficam visíveis com rolagem.
            </DialogDescription>
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
                  <TableHead>Simulação</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((empresa) => (
                  <TableRow key={empresa.id}>
                    <TableCell className="font-medium">{empresa.razao_social}</TableCell>
                    <TableCell className="input-cnpj">{formatCnpj(empresa.cnpj)}</TableCell>
                    <TableCell>{empresa.uf || "—"}</TableCell>
                    <TableCell>{regimeLabels[empresa.regime_tributario] || empresa.regime_tributario}</TableCell>
                    <TableCell className="whitespace-nowrap text-right tabular-nums">
                      {empresa.faturamento_anual
                        ? Number(empresa.faturamento_anual).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                        : "—"}
                    </TableCell>
                    <TableCell>{empresa.cnae_principal || "—"}</TableCell>
                    <TableCell>
                      {ultimaSimulacao[empresa.id] ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1.5 text-xs"
                          disabled={downloading === empresa.id}
                          onClick={() => handleDownloadRelatorio(empresa.id)}
                          title={`Baixar relatório: ${ultimaSimulacao[empresa.id].nome}`}
                        >
                          <FileDown className="h-3.5 w-3.5" />
                          {downloading === empresa.id ? "Gerando…" : "PDF"}
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {canEdit && (
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(empresa)} title="Editar">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        <Link to="/empresas/$empresaId" params={{ empresaId: empresa.id }}>
                          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                            <ExternalLink className="h-3.5 w-3.5" />
                            Detalhes
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
