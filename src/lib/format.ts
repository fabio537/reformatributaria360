/** Format a raw CNPJ string as 00.000.000/0000-00 */
export function formatCnpj(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

/** Strip CNPJ formatting, returning only digits */
export function stripCnpj(value: string): string {
  return value.replace(/\D/g, "").slice(0, 14);
}

/** Format a numeric string/number as Brazilian currency display: 1.234.567,89 */
export function formatCurrency(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num) || num === 0) return "";
  return num.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Parse a Brazilian-formatted currency string back to a plain numeric string */
export function parseCurrency(formatted: string): string {
  const cleaned = formatted.replace(/\./g, "").replace(",", ".");
  const numeric = cleaned.replace(/[^\d.\-]/g, "");
  const num = parseFloat(numeric);
  if (isNaN(num)) return "";
  return String(num);
}
