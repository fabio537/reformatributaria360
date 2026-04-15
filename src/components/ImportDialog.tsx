import { useState, useCallback } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Upload, Download, AlertCircle, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface FieldDef {
  key: string;
  label: string;
  required?: boolean;
}

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tableName: string;
  fields: FieldDef[];
  extraData?: Record<string, unknown>;
  onSuccess: () => void;
  templateFileName?: string;
}

export function ImportDialog({
  open,
  onOpenChange,
  tableName,
  fields,
  extraData = {},
  onSuccess,
  templateFileName = "template",
}: ImportDialogProps) {
  const [step, setStep] = useState<"upload" | "map" | "preview">("upload");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});

  const reset = () => {
    setStep("upload");
    setHeaders([]);
    setRows([]);
    setMapping({});
  };

  const handleFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
        if (json.length < 2) {
          toast.error("Arquivo vazio ou sem dados.");
          return;
        }
        const h = json[0].map(String);
        setHeaders(h);
        setRows(json.slice(1).filter((r) => r.some((c) => c != null && c !== "")));
        // Auto-map by exact label match
        const autoMap: Record<string, string> = {};
        fields.forEach((f) => {
          const match = h.find(
            (hdr) => hdr.toLowerCase().trim() === f.label.toLowerCase().trim()
          );
          if (match) autoMap[f.key] = match;
        });
        setMapping(autoMap);
        setStep("map");
      };
      reader.readAsArrayBuffer(file);
    },
    [fields]
  );

  const handleDownloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([fields.map((f) => f.label)]);
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, `${templateFileName}.xlsx`);
  };

  const mappedData = rows.map((row) => {
    const obj: Record<string, unknown> = { ...extraData };
    fields.forEach((f) => {
      const col = mapping[f.key];
      if (col) {
        const idx = headers.indexOf(col);
        if (idx >= 0) obj[f.key] = row[idx] ?? null;
      }
    });
    return obj;
  });

  const requiredMissing = fields
    .filter((f) => f.required && !mapping[f.key])
    .map((f) => f.label);

  const handleImport = async () => {
    if (requiredMissing.length > 0) {
      toast.error(`Mapeie os campos obrigatórios: ${requiredMissing.join(", ")}`);
      return;
    }
    const { error } = await supabase.from(tableName as any).insert(mappedData as any);
    if (error) {
      toast.error("Erro na importação: " + error.message);
    } else {
      toast.success(`${mappedData.length} registros importados com sucesso!`);
      onSuccess();
      onOpenChange(false);
      reset();
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Dados</DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4 py-4">
            <div className="flex flex-col items-center gap-4 rounded-lg border-2 border-dashed p-8">
              <Upload className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Selecione um arquivo .xlsx, .xls ou .csv
              </p>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFile}
                className="text-sm"
              />
            </div>
            <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Baixar modelo de planilha
            </Button>
          </div>
        )}

        {step === "map" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Associe as colunas do arquivo aos campos do sistema:
            </p>
            <div className="grid gap-3">
              {fields.map((f) => (
                <div key={f.key} className="flex items-center gap-3">
                  <span className="text-sm w-40 truncate">
                    {f.label}
                    {f.required && <span className="text-destructive ml-1">*</span>}
                  </span>
                  <Select
                    value={mapping[f.key] || "_none_"}
                    onValueChange={(v) =>
                      setMapping((m) => ({ ...m, [f.key]: v === "_none_" ? "" : v }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Não mapeado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none_">— Não mapeado —</SelectItem>
                      {headers.map((h) => (
                        <SelectItem key={h} value={h}>
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            {requiredMissing.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                Campos obrigatórios não mapeados: {requiredMissing.join(", ")}
              </div>
            )}
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep("upload")}>
                Voltar
              </Button>
              <Button onClick={() => setStep("preview")}>
                Visualizar dados ({rows.length} linhas)
              </Button>
            </div>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Prévia dos primeiros 5 registros:
            </p>
            <div className="overflow-auto max-h-60">
              <Table>
                <TableHeader>
                  <TableRow>
                    {fields
                      .filter((f) => mapping[f.key])
                      .map((f) => (
                        <TableHead key={f.key}>{f.label}</TableHead>
                      ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mappedData.slice(0, 5).map((row, i) => (
                    <TableRow key={i}>
                      {fields
                        .filter((f) => mapping[f.key])
                        .map((f) => (
                          <TableCell key={f.key}>
                            {String(row[f.key] ?? "—")}
                          </TableCell>
                        ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="text-sm font-medium">
              Total: {mappedData.length} registros serão importados.
            </p>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep("map")}>
                Voltar
              </Button>
              <Button onClick={handleImport}>
                <Check className="h-4 w-4 mr-2" />
                Confirmar Importação
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
