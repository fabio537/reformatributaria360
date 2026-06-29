import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type CenarioVariant = "blue" | "green" | "amber";

const fmtBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const palette: Record<
  CenarioVariant,
  {
    card: string;
    header: string;
    iconBg: string;
    label: string;
    title: string;
    stepNum: string;
    divider: string;
    totalBar: string;
    highlight: string;
    accent: string;
    creditBox: string;
    creditLabel: string;
    creditValue: string;
    tag: string;
  }
> = {
  blue: {
    card: "bg-[#13192a] border border-[#1e2d4a]",
    header: "bg-[#0e1b35] border-b border-[#1e2d4a]",
    iconBg: "bg-[#1a3060]",
    label: "text-[#4d7bc4]",
    title: "text-[#7ab0f0]",
    stepNum: "bg-[#1a3060] text-[#7ab0f0]",
    divider: "border-[#1e2d4a]",
    totalBar: "bg-[#0e1b35] border-t border-[#1e2d4a]",
    highlight: "text-[#7ab0f0]",
    accent: "text-[#4d7bc4]",
    creditBox: "bg-[#0a2040] border border-[#1e3d6e]",
    creditLabel: "text-[#4d7bc4]",
    creditValue: "text-[#7ab0f0]",
    tag: "bg-[#1a3060] text-[#7ab0f0] border border-[#2a4580]",
  },
  green: {
    card: "bg-[#0f1a12] border border-[#1e3a22]",
    header: "bg-[#0b1410] border-b border-[#1e3a22]",
    iconBg: "bg-[#1a2a10]",
    label: "text-[#2a6040]",
    title: "text-[#60c07a]",
    stepNum: "bg-[#1a2a10] text-[#60c07a]",
    divider: "border-[#1e3a22]",
    totalBar: "bg-[#0b1410] border-t border-[#1e3a22]",
    highlight: "text-[#60c07a]",
    accent: "text-[#40a060]",
    creditBox: "bg-[#081510] border border-[#1e3a22]",
    creditLabel: "text-[#2a6040]",
    creditValue: "text-[#60c07a]",
    tag: "bg-[#1a2a10] text-[#6ab84a] border border-[#3a5020]",
  },
  amber: {
    card: "bg-[#1a1408] border border-[#3d2f0a]",
    header: "bg-[#120f05] border-b border-[#3d2f0a]",
    iconBg: "bg-[#3d2800]",
    label: "text-[#c4820a]",
    title: "text-[#f0b840]",
    stepNum: "bg-[#3d2800] text-[#f0b840]",
    divider: "border-[#3d2f0a]",
    totalBar: "bg-[#120f05] border-t border-[#3d2f0a]",
    highlight: "text-[#f0b840]",
    accent: "text-[#c4820a]",
    creditBox: "bg-[#1a1000] border border-[#5c3a00]",
    creditLabel: "text-[#c4820a]",
    creditValue: "text-[#f0b840]",
    tag: "bg-[#3d2800] text-[#f0b840] border border-[#5c3a00]",
  },
};

export interface CenarioRow {
  label: ReactNode;
  value: number | string;
  tone?: "default" | "sub" | "highlight" | "accent" | "muted";
  tag?: string;
}

export interface CenarioStep {
  title: string;
  rows: CenarioRow[];
  note?: string;
}

export interface CenarioBreakdownProps {
  variant: CenarioVariant;
  label: string;
  title: string;
  icon: ReactNode;
  steps: CenarioStep[];
  totalLabel: string;
  totalValue: number;
  credit?: {
    label: string;
    value: number;
    sub?: string;
  };
}

function Row({ row, variant }: { row: CenarioRow; variant: CenarioVariant }) {
  const p = palette[variant];
  const valueClass = cn(
    "font-semibold tabular-nums text-[12px]",
    row.tone === "sub" && "text-[#636c80] text-[10.5px] font-normal",
    row.tone === "highlight" && p.highlight,
    row.tone === "accent" && p.accent,
    row.tone === "muted" && "text-[#636c80]",
    (!row.tone || row.tone === "default") && "text-[#e8eaf0]",
  );
  const labelClass = cn(
    "text-[12px]",
    row.tone === "sub" ? "text-[#636c80] text-[10.5px]" : "text-[#9ba3b5]",
  );
  return (
    <div className="flex justify-between items-center py-[3px]">
      <span className={labelClass}>
        {row.label}
        {row.tag && (
          <span
            className={cn(
              "inline-block text-[9.5px] font-semibold px-1.5 py-px rounded ml-1.5 align-middle",
              p.tag,
            )}
          >
            {row.tag}
          </span>
        )}
      </span>
      <span className={valueClass}>
        {typeof row.value === "number" ? fmtBRL(row.value) : row.value}
      </span>
    </div>
  );
}

export function CenarioBreakdownCard({
  variant,
  label,
  title,
  icon,
  steps,
  totalLabel,
  totalValue,
  credit,
}: CenarioBreakdownProps) {
  const p = palette[variant];
  return (
    <div className={cn("rounded-xl overflow-hidden flex flex-col", p.card)}>
      <div className={cn("flex items-center gap-3 px-4 py-3", p.header)}>
        <div
          className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center text-[15px] flex-shrink-0",
            p.iconBg,
          )}
        >
          {icon}
        </div>
        <div>
          <div className={cn("text-[10px] font-semibold uppercase tracking-[0.08em]", p.label)}>
            {label}
          </div>
          <h2 className={cn("text-[14px] font-bold", p.title)}>{title}</h2>
        </div>
      </div>

      <div className="px-4 py-3.5 flex-1">
        {steps.map((step, i) => (
          <div key={i}>
            {i > 0 && <hr className={cn("border-t my-1.5", p.divider)} />}
            <div className="flex gap-2.5 items-start mb-2.5">
              <div
                className={cn(
                  "w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-px",
                  p.stepNum,
                )}
              >
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-semibold text-[#8892a4] uppercase tracking-[0.05em] mb-1">
                  {step.title}
                </div>
                {step.rows.map((row, j) => (
                  <Row key={j} row={row} variant={variant} />
                ))}
                {step.note && (
                  <div className="text-[10.5px] text-[#636c80] mt-1 leading-snug">{step.note}</div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className={cn("flex justify-between items-center px-4 py-2.5", p.totalBar)}>
        <span className="text-[11px] font-semibold text-[#8892a4]">{totalLabel}</span>
        <span className={cn("text-[18px] font-extrabold tabular-nums", p.highlight)}>
          {fmtBRL(totalValue)}
        </span>
      </div>

      {credit && (
        <div className={cn("rounded-lg mx-4 mb-4 mt-3 px-3 py-2.5", p.creditBox)}>
          <div
            className={cn(
              "text-[10px] font-semibold uppercase tracking-[0.06em] mb-1",
              p.creditLabel,
            )}
          >
            {credit.label}
          </div>
          <div className={cn("text-[20px] font-extrabold tabular-nums", p.creditValue)}>
            {fmtBRL(credit.value)}
          </div>
          {credit.sub && <div className="text-[10.5px] text-[#636c80] mt-0.5">{credit.sub}</div>}
        </div>
      )}
    </div>
  );
}

// ─── Comparativo de rodapé (3 colunas) ────────────────────────────────────
export interface ComparativoColuna {
  title: string;
  rows: { label: ReactNode; value: number | string; tone: "blue" | "amber" | "green" | "red" | "muted" }[];
  footer?: { label: ReactNode; value: number | string; tone: "green" | "red" | "amber" };
}

const compTone = {
  blue: "text-[#7ab0f0]",
  amber: "text-[#f0b840]",
  green: "text-[#4eca8b]",
  red: "text-[#e04c4c]",
  muted: "text-[#8892a4]",
};

export function ComparativoFooter({
  header,
  colunas,
  alert,
}: {
  header: string;
  colunas: ComparativoColuna[];
  alert?: ReactNode;
}) {
  return (
    <div className="bg-[#111520] border border-[#252d40] rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 bg-[#0d1020] border-b border-[#252d40] text-[10px] font-bold uppercase tracking-[0.08em] text-[#636c80]">
        {header}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#252d40]">
        {colunas.map((col, i) => (
          <div key={i} className="px-4 py-3.5">
            <div className="text-[10px] text-[#636c80] font-semibold uppercase tracking-[0.05em] mb-2.5">
              {col.title}
            </div>
            {col.rows.map((row, j) => (
              <div key={j} className="flex justify-between items-center py-[3px] text-[11.5px]">
                <span className="text-[#8892a4]">{row.label}</span>
                <span className={cn("font-semibold tabular-nums", compTone[row.tone])}>
                  {typeof row.value === "number" ? fmtBRL(row.value) : row.value}
                </span>
              </div>
            ))}
            {col.footer && (
              <div className="flex justify-between items-center mt-2 pt-2 border-t border-[#252d40] text-[11.5px]">
                <span className="text-[#8892a4] font-semibold">{col.footer.label}</span>
                <span
                  className={cn(
                    "font-bold tabular-nums text-[14px]",
                    col.footer.tone === "green" && "text-[#4eca8b]",
                    col.footer.tone === "red" && "text-[#e04c4c]",
                    col.footer.tone === "amber" && "text-[#f0b840]",
                  )}
                >
                  {typeof col.footer.value === "number" ? fmtBRL(col.footer.value) : col.footer.value}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
      {alert && (
        <div className="mx-4 mb-4 mt-1 bg-[#0d1f0e] border border-[#1a4020] rounded-lg px-3 py-2.5 text-[11.5px] text-[#5db86e] leading-relaxed">
          {alert}
        </div>
      )}
    </div>
  );
}

// ─── Barra de "badges" superior ───────────────────────────────────────────
export function BadgeRow({ badges }: { badges: { label: ReactNode; value?: ReactNode }[] }) {
  return (
    <div className="flex flex-wrap justify-center gap-2 my-3">
      {badges.map((b, i) => (
        <div
          key={i}
          className="bg-[#1c2030] border border-[#2d3348] rounded-full px-2.5 py-0.5 text-[10.5px] text-[#9ba3b5]"
        >
          {b.label}
          {b.value !== undefined && <b className="text-[#c8d0e0] ml-1">{b.value}</b>}
        </div>
      ))}
    </div>
  );
}
