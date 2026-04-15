import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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

const tipoOpLabels: Record<string, string> = {
  fabricacao: "Fabricação",
  revenda: "Revenda",
  importacao: "Importação",
};

const destinoLabels: Record<string, string> = {
  mercado_interno: "Mercado Interno",
  exportacao: "Exportação",
};

const importFields = [
  { key: "descricao", label: "Descrição", required: true },
  { key: "ncm", label: "NCM", required: true },
  { key: "valor_mensal", label: "Valor Mensal" },
  { key: "quantidade_mensal", label: "Quantidade Mensal" },
  { key: "unidade", label: "Unidade" },
  { key: "aliquota_icms", label: "Alíquota ICMS" },
  { key: "aliquota_pis", label: "Alíquota PIS" },
  { key: "aliquota_cofins", label: "Alíquota COFINS" },
  { key: "aliquota_ipi", label: "Alíquota IPI" },
  { key: "regime_diferenciado", label: "Regime Diferenciado" },
  { key: "tipo_operacao", label: "Tipo Operação" },
  { key: "destino_operacao", label: "Destino (mercado_interno/exportacao)" },
  { key: "sujeito_imposto_seletivo", label: "Sujeito IS (true/false)" },
  { key: "aliquota_is", label: "Alíquota IS %" },
];

const emptyForm = {
  descricao: "",
  ncm: "",
  valor_mensal: "",
  quantidade_mensal: "",
  unidade: "",
  aliquota_icms: "",
  aliquota_pis: "",
  aliquota_cofins: "",
  aliquota_ipi: "",
  regime_diferenciado: "padrao",
  tipo_operacao: "revenda",
  destino_operacao: "mercado_interno",
  sujeito_imposto_seletivo: false,
  aliquota_is: "",
};

export function ProdutosTab({ empresaId }: { empresaId: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const fetchItems = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("produtos")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("descricao");
    setItems(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, [empresaId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      empresa_id: empresaId,
      descricao: form.descricao,
      ncm: form.ncm,
      valor_mensal: Number(form.valor_mensal) || 0,
      quantidade_mensal: Number(form.quantidade_mensal) || 0,
      unidade: form.unidade || null,
      aliquota_icms: Number(form.aliquota_icms) || 0,
      aliquota_pis: Number(form.aliquota_pis) || 0,
      aliquota_cofins: Number(form.aliquota_cofins) || 0,
      aliquota_ipi: Number(form.aliquota_ipi) || 0,
      regime_diferenciado: form.regime_diferenciado,
      tipo_operacao: form.tipo_operacao,
      destino_operacao: form.destino_operacao,
      sujeito_imposto_seletivo: form.sujeito_imposto_seletivo,
      aliquota_is: Number(form.aliquota_is) || 0,
    };
    const { error } = await supabase.from("produtos").insert(payload as any);
    if (error) { toast.error(error.message); return; }
    toast.success("Produto adicionado!");
    setDialogOpen(false);
    setForm(emptyForm);
    fetchItems();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("produtos").delete().eq("id", id);
    if (error) toast.error(error.message);
    else fetchItems();
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
          <Upload className="h-4 w-4 mr-1" /> Importar
        </Button>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Novo Produto
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum produto cadastrado.</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[150px]">Descrição</TableHead>
                <TableHead className="min-w-[90px]">NCM</TableHead>
                <TableHead className="min-w-[120px] text-right">Valor Mensal</TableHead>
                <TableHead className="min-w-[100px]">Regime</TableHead>
                <TableHead className="min-w-[100px]">Operação</TableHead>
                <TableHead className="min-w-[120px]">Destino</TableHead>
                <TableHead className="min-w-[60px]">IS</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.descricao}</TableCell>
                  <TableCell>{p.ncm}</TableCell>
                  <TableCell className="tabular-nums text-right whitespace-nowrap">
                    {p.valor_mensal?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </TableCell>
                  <TableCell>{regimeDifLabels[p.regime_diferenciado] || p.regime_diferenciado}</TableCell>
                  <TableCell>{tipoOpLabels[p.tipo_operacao] || p.tipo_operacao}</TableCell>
                  <TableCell>{destinoLabels[p.destino_operacao] || p.destino_operacao}</TableCell>
                  <TableCell>{p.sujeito_imposto_seletivo ? `${p.aliquota_is}%` : "—"}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Produto</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Descrição *</Label>
                <Input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} required />
              </div>
              <div className="space-y-1">
                <Label>NCM *</Label>
                <Input value={form.ncm} onChange={(e) => setForm({ ...form, ncm: e.target.value })} required />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>Valor Mensal (R$)</Label>
                <Input type="number" step="0.01" value={form.valor_mensal} onChange={(e) => setForm({ ...form, valor_mensal: e.target.value })} className="input-numeric" />
              </div>
              <div className="space-y-1">
                <Label>Qtd. Mensal</Label>
                <Input type="number" value={form.quantidade_mensal} onChange={(e) => setForm({ ...form, quantidade_mensal: e.target.value })} className="input-numeric" />
              </div>
              <div className="space-y-1">
                <Label>Unidade</Label>
                <Input value={form.unidade} onChange={(e) => setForm({ ...form, unidade: e.target.value })} placeholder="un, kg, cx..." />
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
            <div className="grid grid-cols-3 gap-3">
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
              <div className="space-y-1">
                <Label>Tipo Operação</Label>
                <Select value={form.tipo_operacao} onValueChange={(v) => setForm({ ...form, tipo_operacao: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fabricacao">Fabricação</SelectItem>
                    <SelectItem value="revenda">Revenda</SelectItem>
                    <SelectItem value="importacao">Importação</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Destino</Label>
                <Select value={form.destino_operacao} onValueChange={(v) => setForm({ ...form, destino_operacao: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mercado_interno">Mercado Interno</SelectItem>
                    <SelectItem value="exportacao">Exportação</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="border rounded-lg p-3 space-y-2 bg-muted/30">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="is"
                  checked={form.sujeito_imposto_seletivo}
                  onCheckedChange={(v) => setForm({ ...form, sujeito_imposto_seletivo: !!v })}
                />
                <Label htmlFor="is" className="cursor-pointer">
                  Sujeito ao Imposto Seletivo (IS) — tabaco, bebidas alcoólicas, etc.
                </Label>
              </div>
              {form.sujeito_imposto_seletivo && (
                <div className="space-y-1 max-w-[200px]">
                  <Label>Alíquota IS %</Label>
                  <Input type="number" step="0.01" value={form.aliquota_is} onChange={(e) => setForm({ ...form, aliquota_is: e.target.value })} className="input-numeric" />
                </div>
              )}
            </div>
            <Button type="submit" className="w-full">Cadastrar</Button>
          </form>
        </DialogContent>
      </Dialog>

      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        tableName="produtos"
        fields={importFields}
        extraData={{ empresa_id: empresaId }}
        onSuccess={fetchItems}
        templateFileName="produtos_template"
      />
    </div>
  );
}
