import { useState, useCallback, useMemo } from "react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Upload, Download, AlertCircle, Check, FileWarning } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ENTITY_FIELDS,
  type Entity,
  type ImportField,
  processRow,
  buildDedupKey,
  type ProcessedRow,
} from "@/lib/import-schemas";

interface LegacyFieldDef {
  key: string;
  label: string;
  required?: boolean;
}

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tableName: string;
  /** Quando informado, ativa validação por entidade (Zod + parsers BR). */
  entity?: Entity;
  /** Campos para o modo legado (sem `entity`). */
  fields?: LegacyFieldDef[];
  extraData?: Record<string, unknown>;
  onSuccess: () => void;
  templateFileName?: string;
}

type DupStrategy = "substituir" | "ignorar";

export function ImportDialog({
  open,
  onOpenChange,
  tableName,
  entity,
  fields,
  extraData = {},
  onSuccess,
  templateFileName = "template",
}: ImportDialogProps) {
  const [step, setStep] = useState<"upload" | "map" | "preview">("upload");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<unknown[][]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [processed, setProcessed] = useState<ProcessedRow[]>([]);
  const [dupKeys, setDupKeys] = useState<Set<string>>(new Set());
  const [dupStrategy, setDupStrategy] = useState<DupStrategy>("ignorar");
  const [importing, setImporting] = useState(false);

  // Campos efetivos: por entidade (preferido) ou legado
  const effectiveFields: ImportField[] = useMemo(() => {
    if (entity) return ENTITY_FIELDS[entity];
    return (fields ?? []).map((f) => ({
      key: f.key,
      label: f.label,
      type: "text",
      required: f.required,
    }));
  }, [entity, fields]);

  const reset = () => {
    setStep("upload");
    setHeaders([]);
    setRows([]);
    setMapping({});
    setProcessed([]);
    setDupKeys(new Set());
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
        const json: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false });
        if (json.length < 2) {
          toast.error("Arquivo vazio ou sem dados.");
          return;
        }
        const h = (json[0] as unknown[]).map((v) => String(v ?? ""));
        setHeaders(h);
        setRows(
          json.slice(1).filter((r) => (r as unknown[]).some((c) => c != null && c !== ""))
        );
        // Auto-map por label
        const autoMap: Record<string, string> = {};
        effectiveFields.forEach((f) => {
          const match = h.find(
            (hdr) =>
              hdr.toLowerCase().trim() === f.label.toLowerCase().trim() ||
              hdr.toLowerCase().trim() === f.key.toLowerCase().trim()
          );
          if (match) autoMap[f.key] = match;
        });
        setMapping(autoMap);
        setStep("map");
      };
      reader.readAsArrayBuffer(file);
    },
    [effectiveFields]
  );

  const handleDownloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([effectiveFields.map((f) => f.label)]);
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, `${templateFileName}.xlsx`);
  };

  const requiredMissing = effectiveFields
    .filter((f) => f.required && !mapping[f.key])
    .map((f) => f.label);

  const handleGoToPreview = async () => {
    if (requiredMissing.length > 0) {
      toast.error(`Mapeie os campos obrigatórios: ${requiredMissing.join(", ")}`);
      return;
    }

    // Monta raw por linha
    const rawRows: Record<string, unknown>[] = rows.map((row) => {
      const obj: Record<string, unknown> = {};
      effectiveFields.forEach((f) => {
        const col = mapping[f.key];
        if (col) {
          const idx = headers.indexOf(col);
          if (idx >= 0) obj[f.key] = row[idx] ?? null;
        }
      });
      return obj;
    });

    // Validação por entidade ou passagem direta (legado)
    const proc: ProcessedRow[] = rawRows.map((raw, i) => {
      if (entity) return processRow(entity, raw, i, extraData);
      return {
        index: i,
        raw,
        data: { ...extraData, ...raw },
        errors: [],
        warnings: [],
      };
    });

    // Detecção de duplicados por (empresa_id, competencia, ncm)
    const candidateKeys = new Map<string, ProcessedRow[]>();
    proc.forEach((p) => {
      const k = buildDedupKey(p.data);
      if (!k) return;
      const arr = candidateKeys.get(k) ?? [];
      arr.push(p);
      candidateKeys.set(k, arr);
    });

    const dup = new Set<string>();
    // Duplicados internos no próprio arquivo
    candidateKeys.forEach((arr, k) => {
      if (arr.length > 1) dup.add(k);
    });

    // Duplicados contra o banco
    const empresaId = (extraData as Record<string, unknown>).empresa_id as string | undefined;
    if (empresaId && (tableName === "produtos" || tableName === "creditos_aquisicao")) {
      const competencias = Array.from(
        new Set(
          proc
            .map((p) => p.data.competencia)
            .filter((c): c is string => typeof c === "string")
        )
      );
      const ncms = Array.from(
        new Set(
          proc.map((p) => p.data.ncm).filter((n): n is string => typeof n === "string")
        )
      );
      if (competencias.length > 0 && ncms.length > 0) {
        const { data: existentes } = await supabase
          .from(tableName as "produtos" | "creditos_aquisicao")
          .select("ncm, competencia")
          .eq("empresa_id", empresaId)
          .in("competencia", competencias)
          .in("ncm", ncms);
        (existentes ?? []).forEach((e: { ncm: string | null; competencia: string | null }) => {
          if (e.ncm && e.competencia) {
            dup.add(`${empresaId}|${e.competencia}|${e.ncm}`);
          }
        });
      }
    }

    setProcessed(proc);
    setDupKeys(dup);
    setStep("preview");
  };

  const isDup = (p: ProcessedRow) => {
    const k = buildDedupKey(p.data);
    return k ? dupKeys.has(k) : false;
  };

  const validRows = processed.filter((p) => p.errors.length === 0);
  const invalidRows = processed.filter((p) => p.errors.length > 0);
  const rowsToImport = validRows.filter((p) => (isDup(p) && dupStrategy === "ignorar" ? false : true));
  const rowsToReplace = validRows.filter((p) => isDup(p) && dupStrategy === "substituir");

  const handleDownloadRejected = () => {
    const rows = invalidRows.map((p) => ({
      linha: p.index + 2, // +2: 1-indexed + cabeçalho
      erros: p.errors.join("; "),
      avisos: p.warnings.join("; "),
      ...p.raw,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rejeitadas");
    XLSX.writeFile(wb, `${templateFileName}_rejeitadas.xlsx`);
  };

  const handleImport = async () => {
    if (rowsToImport.length === 0) {
      toast.error("Nenhuma linha válida para importar.");
      return;
    }
    setImporting(true);
    try {
      // Substituir: apaga as linhas existentes que casam com a chave
      if (rowsToReplace.length > 0 && (tableName === "produtos" || tableName === "creditos_aquisicao")) {
        const empresaId = (extraData as Record<string, unknown>).empresa_id as string;
        for (const r of rowsToReplace) {
          await supabase
            .from(tableName as "produtos" | "creditos_aquisicao")
            .delete()
            .eq("empresa_id", empresaId)
            .eq("competencia", r.data.competencia as string)
            .eq("ncm", r.data.ncm as string);
        }
      }

      const payload = rowsToImport.map((p) => p.data);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await supabase.from(tableName as any).insert(payload as any);
      if (error) {
        toast.error("Erro na importação: " + error.message);
      } else {
        toast.success(`${payload.length} registros importados com sucesso!`);
        onSuccess();
        onOpenChange(false);
        reset();
      }
    } finally {
      setImporting(false);
    }
  };

  const mappedFields = effectiveFields.filter((f) => mapping[f.key]);
  const hasDuplicates = dupKeys.size > 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Dados {entity ? `— ${entity}` : ""}</DialogTitle>
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
            {entity && (
              <p className="text-xs text-muted-foreground">
                Dica: valores monetários em formato brasileiro (1.234,56), alíquotas com ou sem "%",
                NCM com ou sem pontuação, competência em MM/AAAA ou AAAA-MM.
              </p>
            )}
          </div>
        )}

        {step === "map" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Associe as colunas do arquivo aos campos do sistema:
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              {effectiveFields.map((f) => (
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
              <Button onClick={handleGoToPreview}>
                Validar e visualizar ({rows.length} linhas)
              </Button>
            </div>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">Total: {processed.length}</Badge>
              <Badge className="bg-emerald-600 hover:bg-emerald-600">
                Válidas: {validRows.length}
              </Badge>
              {invalidRows.length > 0 && (
                <Badge variant="destructive">Com erro: {invalidRows.length}</Badge>
              )}
              {processed.some((p) => p.warnings.length > 0) && (
                <Badge className="bg-amber-500 hover:bg-amber-500 text-black">
                  Com aviso: {processed.filter((p) => p.warnings.length > 0).length}
                </Badge>
              )}
              {hasDuplicates && (
                <Badge variant="outline">Duplicadas: {dupKeys.size}</Badge>
              )}
            </div>

            {hasDuplicates && (
              <div className="rounded-md border p-3 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <FileWarning className="h-4 w-4 text-amber-500" />
                  Foram encontradas linhas duplicadas por (empresa, competência, NCM).
                </div>
                <RadioGroup
                  value={dupStrategy}
                  onValueChange={(v) => setDupStrategy(v as DupStrategy)}
                  className="flex gap-6"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="ignorar" id="dup-ignorar" />
                    <Label htmlFor="dup-ignorar" className="text-sm">
                      Ignorar duplicadas
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="substituir" id="dup-substituir" />
                    <Label htmlFor="dup-substituir" className="text-sm">
                      Substituir existentes
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            )}

            <div className="overflow-auto max-h-[45vh] border rounded-md">
              <Table>
                <TableHeader className="sticky top-0 bg-background">
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead className="w-24">Status</TableHead>
                    {mappedFields.map((f) => (
                      <TableHead key={f.key}>{f.label}</TableHead>
                    ))}
                    <TableHead>Mensagens</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {processed.map((p) => {
                    const hasErr = p.errors.length > 0;
                    const hasWarn = p.warnings.length > 0;
                    const dup = isDup(p);
                    const rowClass = hasErr
                      ? "bg-destructive/10"
                      : hasWarn || dup
                        ? "bg-amber-100/60 dark:bg-amber-950/30"
                        : "";
                    return (
                      <TableRow key={p.index} className={rowClass}>
                        <TableCell className="text-xs text-muted-foreground">
                          {p.index + 2}
                        </TableCell>
                        <TableCell>
                          {hasErr ? (
                            <Badge variant="destructive" className="text-xs">
                              Erro
                            </Badge>
                          ) : dup ? (
                            <Badge className="bg-amber-500 hover:bg-amber-500 text-black text-xs">
                              Duplicada
                            </Badge>
                          ) : hasWarn ? (
                            <Badge className="bg-amber-500 hover:bg-amber-500 text-black text-xs">
                              Aviso
                            </Badge>
                          ) : (
                            <Badge className="bg-emerald-600 hover:bg-emerald-600 text-xs">
                              OK
                            </Badge>
                          )}
                        </TableCell>
                        {mappedFields.map((f) => (
                          <TableCell key={f.key} className="text-xs">
                            {String(p.data[f.key] ?? p.raw[f.key] ?? "—")}
                          </TableCell>
                        ))}
                        <TableCell className="text-xs">
                          {[...p.errors, ...p.warnings].join(" • ")}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-wrap justify-between gap-2">
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep("map")}>
                  Voltar
                </Button>
                {invalidRows.length > 0 && (
                  <Button variant="outline" onClick={handleDownloadRejected}>
                    <Download className="h-4 w-4 mr-2" />
                    Baixar rejeitadas ({invalidRows.length})
                  </Button>
                )}
              </div>
              <Button
                onClick={handleImport}
                disabled={rowsToImport.length === 0 || importing}
              >
                <Check className="h-4 w-4 mr-2" />
                Importar {rowsToImport.length} linha(s) válida(s)
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
