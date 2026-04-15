import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
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
} from "@/components/ui/dialog";
import { Plus, Upload, Trash2 } from "lucide-react";
import { ImportDialog } from "./ImportDialog";
import { toast } from "sonner";

const importFields = [
  { key: "fornecedor", label: "Fornecedor", required: true },
  { key: "descricao", label: "Descrição" },
  { key: "ncm", label: "NCM" },
  { key: "valor_mensal", label: "Valor Mensal" },
  { key: "aliquota_icms", label: "Alíquota ICMS" },
  { key: "aliquota_pis", label: "Alíquota PIS" },
  { key: "aliquota_cofins", label: "Alíquota COFINS" },
  { key: "aliquota_ipi", label: "Alíquota IPI" },
];

const emptyForm = {
  fornecedor: "",
  descricao: "",
  ncm: "",
  valor_mensal: "",
  aliquota_icms: "",
  aliquota_pis: "",
  aliquota_cofins: "",
  aliquota_ipi: "",
};

export function CreditosTab({ empresaId }: { empresaId: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("creditos_aquisicao")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("fornecedor");
    setItems(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [empresaId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      empresa_id: empresaId,
      fornecedor: form.fornecedor,
      descricao: form.descricao || null,
      ncm: form.ncm || null,
      valor_mensal: Number(form.valor_mensal) || 0,
      aliquota_icms: Number(form.aliquota_icms) || 0,
      aliquota_pis: Number(form.aliquota_pis) || 0,
      aliquota_cofins: Number(form.aliquota_cofins) || 0,
      aliquota_ipi: Number(form.aliquota_ipi) || 0,
    };
    const { error } = await supabase.from("creditos_aquisicao").insert(payload as any);
    if (error) { toast.error(error.message); return; }
    toast.success("Crédito adicionado!");
    setDialogOpen(false);
    setForm(emptyForm);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("creditos_aquisicao").delete().eq("id", id);
    if (error) toast.error(error.message);
    else fetchData();
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
          <Upload className="h-4 w-4 mr-1" /> Importar
        </Button>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Novo Crédito
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum crédito cadastrado.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fornecedor</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>NCM</TableHead>
              <TableHead>Valor Mensal</TableHead>
              <TableHead>ICMS</TableHead>
              <TableHead>PIS</TableHead>
              <TableHead>COFINS</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.fornecedor}</TableCell>
                <TableCell>{c.descricao || "—"}</TableCell>
                <TableCell>{c.ncm || "—"}</TableCell>
                <TableCell className="tabular-nums text-right whitespace-nowrap">
                  {c.valor_mensal?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </TableCell>
                <TableCell className="tabular-nums text-right whitespace-nowrap">{c.aliquota_icms}%</TableCell>
                <TableCell className="tabular-nums text-right whitespace-nowrap">{c.aliquota_pis}%</TableCell>
                <TableCell className="tabular-nums text-right whitespace-nowrap">{c.aliquota_cofins}%</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo Crédito de Aquisição</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Fornecedor *</Label>
                <Input value={form.fornecedor} onChange={(e) => setForm({ ...form, fornecedor: e.target.value })} required />
              </div>
              <div className="space-y-1">
                <Label>NCM</Label>
                <Input value={form.ncm} onChange={(e) => setForm({ ...form, ncm: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Descrição</Label>
                <Input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Valor Mensal (R$)</Label>
                <Input type="number" step="0.01" value={form.valor_mensal} onChange={(e) => setForm({ ...form, valor_mensal: e.target.value })} className="input-numeric" />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label>ICMS %</Label>
                <Input type="number" step="0.01" value={form.aliquota_icms} onChange={(e) => setForm({ ...form, aliquota_icms: e.target.value })} className="input-numeric" />
              </div>
              <div className="space-y-1">
                <Label>PIS %</Label>
                <Input type="number" step="0.01" value={form.aliquota_pis} onChange={(e) => setForm({ ...form, aliquota_pis: e.target.value })} className="input-numeric" />
              </div>
              <div className="space-y-1">
                <Label>COFINS %</Label>
                <Input type="number" step="0.01" value={form.aliquota_cofins} onChange={(e) => setForm({ ...form, aliquota_cofins: e.target.value })} className="input-numeric" />
              </div>
              <div className="space-y-1">
                <Label>IPI %</Label>
                <Input type="number" step="0.01" value={form.aliquota_ipi} onChange={(e) => setForm({ ...form, aliquota_ipi: e.target.value })} className="input-numeric" />
              </div>
            </div>
            <Button type="submit" className="w-full">Cadastrar</Button>
          </form>
        </DialogContent>
      </Dialog>

      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        tableName="creditos_aquisicao"
        fields={importFields}
        extraData={{ empresa_id: empresaId }}
        onSuccess={fetchData}
        templateFileName="creditos_template"
      />
    </div>
  );
}
