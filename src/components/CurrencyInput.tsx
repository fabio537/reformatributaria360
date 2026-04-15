import * as React from "react";
import { Input } from "@/components/ui/input";
import { formatCurrency, parseCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

type CurrencyInputProps = Omit<React.ComponentProps<"input">, "onChange" | "value" | "type"> & {
  /** Raw numeric string (e.g. "24536353.94") */
  value: string;
  /** Called with the raw numeric string */
  onValueChange: (raw: string) => void;
};

/**
 * Input that displays values formatted as Brazilian currency (1.234,56)
 * and stores the raw numeric string internally.
 */
export function CurrencyInput({ value, onValueChange, className, ...props }: CurrencyInputProps) {
  const [display, setDisplay] = React.useState(() => formatCurrency(value));
  const [focused, setFocused] = React.useState(false);

  // Sync display when value changes externally (and not focused)
  React.useEffect(() => {
    if (!focused) {
      setDisplay(formatCurrency(value));
    }
  }, [value, focused]);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setFocused(true);
    // Show raw number for easier editing
    const num = parseFloat(value);
    if (!isNaN(num) && num !== 0) {
      setDisplay(String(num));
    }
    props.onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setFocused(false);
    const raw = parseCurrency(display);
    onValueChange(raw);
    setDisplay(formatCurrency(raw));
    props.onBlur?.(e);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setDisplay(v);
    // Live-update raw value
    const raw = parseCurrency(v);
    onValueChange(raw);
  };

  return (
    <Input
      {...props}
      inputMode="decimal"
      value={display}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className={cn("tabular-nums text-right", className)}
      placeholder={props.placeholder ?? "0,00"}
    />
  );
}
