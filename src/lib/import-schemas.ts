import { z } from "zod";

// ---------- Parsers ----------

export function parseBRNumber(input: unknown): number | null {
  if (input == null || input === "") return null;
  if (typeof input === "number") return Number.isFinite(input) ? input : null;
  let s = String(input).trim();
  if (!s) return null;
  s = s.replace(/[R$\s]/g, "");
  // Formato BR: 1.234,56 ou 1234,56  → vírgula = decimal, ponto = milhar
  if (s.includes(",")) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if ((s.match(/\./g) || []).length > 1) {
    // 1.234.567 (sem decimais) → remover pontos de milhar
    s = s.replace(/\./g, "");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function parsePercent(input: unknown): number | null {
  if (input == null || input === "") return null;
  const s = String(input).replace("%", "").trim();
  return parseBRNumber(s);
}

export function parseNCM(input: unknown): { value: string | null; warning?: string } {
  if (input == null || input === "") return { value: null };
  const digits = String(input).replace(/[^\d]/g, "");
  if (digits.length === 0) return { value: null, warning: "NCM vazio" };
  if (digits.length !== 8) {
    return { value: digits, warning: `NCM com ${digits.length} dígitos (esperado 8)` };
  }
  return { value: digits };
}

export function parseCompetencia(input: unknown): string | null {
  if (input == null || input === "") return null;
  const s = String(input).trim();
  // MM/AAAA
  let m = s.match(/^(\d{1,2})[/\-](\d{4})$/);
  if (m) {
    const mes = Number(m[1]);
    const ano = Number(m[2]);
    if (mes < 1 || mes > 12) return null;
    return `${ano}-${String(mes).padStart(2, "0")}-01`;
  }
  // AAAA-MM ou AAAA/MM
  m = s.match(/^(\d{4})[/\-](\d{1,2})(?:[/\-]\d{1,2})?$/);
  if (m) {
    const ano = Number(m[1]);
    const mes = Number(m[2]);
    if (mes < 1 || mes > 12) return null;
    return `${ano}-${String(mes).padStart(2, "0")}-01`;
  }
  // Date serial do Excel? (raro nesse fluxo, mas tenta)
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  }
  return null;
}

function parseBool(input: unknown): boolean | null {
  if (input == null || input === "") return null;
  const s = String(input).toLowerCase().trim();
  if (["true", "sim", "s", "1", "yes", "y"].includes(s)) return true;
  if (["false", "nao", "não", "n", "0", "no"].includes(s)) return false;
  return null;
}

// ---------- Field definitions ----------

export type FieldType =
  | "text"
  | "number_br"
  | "percent"
  | "ncm"
  | "competencia"
  | "boolean"
  | "enum";

export interface ImportField {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  enumValues?: string[];
}

export type Entity =
  | "produtos"
  | "servicos"
  | "creditos_aquisicao"
  | "competencias_fiscais";

export const ENTITY_FIELDS: Record<Entity, ImportField[]> = {
  produtos: [
    { key: "descricao", label: "Descrição", type: "text", required: true },
    { key: "ncm", label: "NCM", type: "ncm", required: true },
    { key: "competencia", label: "Competência (MM/AAAA)", type: "competencia" },
    { key: "valor_mensal", label: "Valor Mensal", type: "number_br" },
    { key: "quantidade_mensal", label: "Quantidade Mensal", type: "number_br" },
    { key: "unidade", label: "Unidade", type: "text" },
    { key: "aliquota_icms", label: "Alíquota ICMS", type: "percent" },
    { key: "aliquota_pis", label: "Alíquota PIS", type: "percent" },
    { key: "aliquota_cofins", label: "Alíquota COFINS", type: "percent" },
    { key: "aliquota_ipi", label: "Alíquota IPI", type: "percent" },
    { key: "aliquota_ibs", label: "Alíquota IBS", type: "percent" },
    { key: "aliquota_cbs", label: "Alíquota CBS", type: "percent" },
    { key: "aliquota_is", label: "Alíquota IS", type: "percent" },
    { key: "cclasstrib", label: "cClassTrib", type: "text" },
    { key: "cst", label: "CST", type: "text" },
    { key: "regime_especial", label: "Regime Especial", type: "text" },
    { key: "reducao_aplicada", label: "Redução Aplicada (%)", type: "percent" },
    {
      key: "regime_diferenciado",
      label: "Regime Diferenciado",
      type: "enum",
      enumValues: ["padrao", "reducao_30", "reducao_60", "aliquota_zero"],
    },
    {
      key: "tipo_operacao",
      label: "Tipo Operação",
      type: "enum",
      enumValues: ["fabricacao", "revenda", "importacao"],
    },
    {
      key: "destino_operacao",
      label: "Destino",
      type: "enum",
      enumValues: ["mercado_interno", "exportacao"],
    },
    { key: "sujeito_imposto_seletivo", label: "Sujeito IS", type: "boolean" },
  ],
  servicos: [
    { key: "descricao", label: "Descrição", type: "text", required: true },
    { key: "codigo_servico", label: "Código Serviço", type: "text", required: true },
    { key: "competencia", label: "Competência (MM/AAAA)", type: "competencia" },
    { key: "valor_mensal", label: "Valor Mensal", type: "number_br" },
    { key: "aliquota_iss", label: "Alíquota ISS", type: "percent" },
    { key: "aliquota_pis", label: "Alíquota PIS", type: "percent" },
    { key: "aliquota_cofins", label: "Alíquota COFINS", type: "percent" },
    { key: "aliquota_ibs", label: "Alíquota IBS", type: "percent" },
    { key: "aliquota_cbs", label: "Alíquota CBS", type: "percent" },
    { key: "cclasstrib", label: "cClassTrib", type: "text" },
    {
      key: "regime_diferenciado",
      label: "Regime Diferenciado",
      type: "enum",
      enumValues: ["padrao", "reducao_30", "reducao_60", "aliquota_zero"],
    },
  ],
  creditos_aquisicao: [
    { key: "fornecedor", label: "Fornecedor", type: "text", required: true },
    { key: "descricao", label: "Descrição", type: "text" },
    { key: "ncm", label: "NCM", type: "ncm" },
    { key: "competencia", label: "Competência (MM/AAAA)", type: "competencia" },
    { key: "valor_mensal", label: "Valor Mensal", type: "number_br" },
    { key: "aliquota_icms", label: "Alíquota ICMS", type: "percent" },
    { key: "aliquota_pis", label: "Alíquota PIS", type: "percent" },
    { key: "aliquota_cofins", label: "Alíquota COFINS", type: "percent" },
    { key: "aliquota_ipi", label: "Alíquota IPI", type: "percent" },
    { key: "aliquota_ibs", label: "Alíquota IBS", type: "percent" },
    { key: "aliquota_cbs", label: "Alíquota CBS", type: "percent" },
    {
      key: "regime_fornecedor",
      label: "Regime Fornecedor",
      type: "enum",
      enumValues: ["padrao", "reducao_30", "reducao_60", "aliquota_zero"],
    },
  ],
};

// ---------- Zod schemas ----------

const baseNumeric = z.number().nullable().optional();
const baseText = z.string().min(1).nullable().optional();

export const ENTITY_ZOD: Record<Entity, z.ZodTypeAny> = {
  produtos: z.object({
    descricao: z.string().trim().min(1, "Descrição obrigatória").max(500),
    ncm: z.string().regex(/^\d{8}$/, "NCM deve ter 8 dígitos"),
    competencia: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Competência inválida")
      .nullable()
      .optional(),
    valor_mensal: baseNumeric,
    quantidade_mensal: baseNumeric,
    aliquota_icms: baseNumeric,
    aliquota_pis: baseNumeric,
    aliquota_cofins: baseNumeric,
    aliquota_ipi: baseNumeric,
    aliquota_ibs: baseNumeric,
    aliquota_cbs: baseNumeric,
    aliquota_is: baseNumeric,
    reducao_aplicada: baseNumeric,
  }).passthrough(),
  servicos: z.object({
    descricao: z.string().trim().min(1, "Descrição obrigatória").max(500),
    codigo_servico: z.string().trim().min(1, "Código obrigatório"),
    competencia: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Competência inválida")
      .nullable()
      .optional(),
    valor_mensal: baseNumeric,
    aliquota_iss: baseNumeric,
    aliquota_pis: baseNumeric,
    aliquota_cofins: baseNumeric,
    aliquota_ibs: baseNumeric,
    aliquota_cbs: baseNumeric,
  }).passthrough(),
  creditos_aquisicao: z.object({
    fornecedor: z.string().trim().min(1, "Fornecedor obrigatório").max(255),
    ncm: z
      .string()
      .regex(/^\d{8}$/, "NCM deve ter 8 dígitos")
      .nullable()
      .optional(),
    competencia: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Competência inválida")
      .nullable()
      .optional(),
    valor_mensal: baseNumeric,
    aliquota_icms: baseNumeric,
    aliquota_pis: baseNumeric,
    aliquota_cofins: baseNumeric,
    aliquota_ipi: baseNumeric,
    aliquota_ibs: baseNumeric,
    aliquota_cbs: baseNumeric,
  }).passthrough(),
};

// ---------- Row processing ----------

export interface ProcessedRow {
  index: number;
  raw: Record<string, unknown>;
  data: Record<string, unknown>;
  errors: string[];
  warnings: string[];
}

export function processRow(
  entity: Entity,
  raw: Record<string, unknown>,
  rowIndex: number,
  extraData: Record<string, unknown> = {},
): ProcessedRow {
  const fields = ENTITY_FIELDS[entity];
  const data: Record<string, unknown> = { ...extraData };
  const warnings: string[] = [];
  const errors: string[] = [];

  for (const f of fields) {
    const val = raw[f.key];
    const empty = val == null || val === "";

    if (empty) {
      if (f.required) errors.push(`${f.label}: obrigatório`);
      continue;
    }

    switch (f.type) {
      case "text":
        data[f.key] = String(val).trim();
        break;
      case "number_br": {
        const n = parseBRNumber(val);
        if (n === null) errors.push(`${f.label}: número inválido ("${val}")`);
        else data[f.key] = n;
        break;
      }
      case "percent": {
        const n = parsePercent(val);
        if (n === null) errors.push(`${f.label}: alíquota inválida ("${val}")`);
        else if (n < 0 || n > 100) warnings.push(`${f.label}: ${n}% fora do intervalo usual`);
        else data[f.key] = n;
        if (n !== null && n >= 0 && n <= 100) data[f.key] = n;
        break;
      }
      case "ncm": {
        const { value, warning } = parseNCM(val);
        if (warning) warnings.push(`NCM: ${warning}`);
        if (value && value.length === 8) data[f.key] = value;
        else if (f.required) errors.push(`NCM inválido ("${val}")`);
        else if (value) data[f.key] = value;
        break;
      }
      case "competencia": {
        const v = parseCompetencia(val);
        if (!v) errors.push(`Competência inválida ("${val}") — use MM/AAAA ou AAAA-MM`);
        else data[f.key] = v;
        break;
      }
      case "boolean": {
        const b = parseBool(val);
        if (b === null) warnings.push(`${f.label}: valor não reconhecido ("${val}")`);
        else data[f.key] = b;
        break;
      }
      case "enum": {
        const s = String(val).toLowerCase().trim();
        if (f.enumValues && !f.enumValues.includes(s)) {
          warnings.push(`${f.label}: "${val}" não é um valor padrão (${f.enumValues.join(", ")})`);
          data[f.key] = s;
        } else {
          data[f.key] = s;
        }
        break;
      }
    }
  }

  // Zod final
  if (errors.length === 0) {
    const result = ENTITY_ZOD[entity].safeParse(data);
    if (!result.success) {
      for (const issue of result.error.issues) {
        errors.push(`${issue.path.join(".")}: ${issue.message}`);
      }
    }
  }

  return { index: rowIndex, raw, data, errors, warnings };
}

export function buildDedupKey(row: Record<string, unknown>): string | null {
  const empresa = row.empresa_id;
  const comp = row.competencia;
  const ncm = row.ncm;
  if (!empresa || !comp || !ncm) return null;
  return `${empresa}|${comp}|${ncm}`;
}
