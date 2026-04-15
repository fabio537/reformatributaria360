import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

const regimeDifLabels: Record<string, string> = {
  padrao: "Padrão",
  reducao_30: "Redução 30%",
  reducao_60: "Redução 60%",
  aliquota_zero: "Alíquota Zero",
};

const importFields = [
  { key: "descricao", label: "Descrição", required: true },
  { key: "codigo_servico", label: "Código Serviço", required: true },
  { key: "valor_mensal", label: "Valor Mensal" },
  { key: "aliquota_iss", label: "Alíquota ISS" },
  { key: "aliquota_pis", label: "Alíquota PIS" },
  { key: "aliquota_cofins", label: "Alíquota COFINS" },
  { key: "regime_diferenciado", label: "Regime Diferenciado" },
  { key: "tipo_servico", label: "Tipo Serviço" },
];

const emptyForm = {
  descricao: "",
  codigo_servico: "",
  valor_mensal: "",
  aliquota_iss: "",
  aliquota_pis: "",
  aliquota_cofins: "",
  regime_diferenciado: "padrao",
  tipo_servico: "",
};

export function ServicosTab({ empresaId }: { empresaId: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("servicos")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("descricao");
    setItems(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [empresaId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      empresa_id: empresaId,
      descricao: form.descricao,
      codigo_servico: form.codigo_servico,
      valor_mensal: Number(form.valor_mensal) || 0,
      aliquota_iss: Number(form.aliquota_iss) || 0,
      aliquota_pis: Number(form.aliquota_pis) || 0,
      aliquota_cofins: Number(form.aliquota_cofins) || 0,
      regime_diferenciado: form.regime_diferenciado,
      tipo_servico: form.tipo_servico || null,
    };
    const { error } = await supabase.from("servicos").insert(payload as any);
    if (error) { toast.error(error.message); return; }
    toast.success("Serviço adicionado!");
    setDialogOpen(false);
    setForm(emptyForm);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("servicos").delete().eq("id", id);
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
          <Plus className="h-4 w-4 mr-1" /> Novo Serviço
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum serviço cadastrado.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Descrição</TableHead>
              <TableHead>Código</TableHead>
              <TableHead>Valor Mensal</TableHead>
              <TableHead>ISS %</TableHead>
              <TableHead>Regime</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.descricao}</TableCell>
                <TableCell>{s.codigo_servico}</TableCell>
                <TableCell>
                  {s.valor_mensal?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </TableCell>
                <TableCell>{s.aliquota_iss}%</TableCell>
                <TableCell>{regimeDifLabels[s.regime_diferenciado] || s.regime_diferenciado}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)}>
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
            <DialogTitle>Novo Serviço</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Descrição *</Label>
                <Input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} required />
              </div>
              <div className="space-y-1">
                <Label>Código Serviço *</Label>
                <Input value={form.codigo_servico} onChange={(e) => setForm({ ...form, codigo_servico: e.target.value })} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Valor Mensal (R$)</Label>
                <Input type="number" step="0.01" value={form.valor_mensal} onChange={(e) => setForm({ ...form, valor_mensal: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Tipo Serviço</Label>
                <Input value={form.tipo_servico} onChange={(e) => setForm({ ...form, tipo_servico: e.target.value })} placeholder="Consultoria, TI..." />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>ISS %</Label>
                <Input type="number" step="0.01" value={form.aliquota_iss} onChange={(e) => setForm({ ...form, aliquota_iss: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>PIS %</Label>
                <Input type="number" step="0.01" value={form.aliquota_pis} onChange={(e) => setForm({ ...form, aliquota_pis: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>COFINS %</Label>
                <Input type="number" step="0.01" value={form.aliquota_cofins} onChange={(e) => setForm({ ...form, aliquota_cofins: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Regime Diferenciado</Label>
              <Select value={form.regime_diferenciado} onValueChange={(v) => setForm({ ...form, regime_diferenciado: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="padrao">Padrão</SelectItem>
                  <SelectItem value="reducao_30">Redução 30%</SelectItem>
                  <SelectItem value="reducao_60">Redução 60%</SelectItem>
                  <SelectItem value="aliquota_zero">Alíquota Zero</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full">Cadastrar</Button>
          </form>
        </DialogContent>
      </Dialog>

      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        tableName="servicos"
        fields={importFields}
        extraData={{ empresa_id: empresaId }}
        onSuccess={fetchData}
        templateFileName="servicos_template"
      />
    </div>
  );
}
