/**
 * Decisões críticas 2026 → 2027 e 5 alertas da Live P&N Valorem (jun/2026).
 * Fonte: https://live-reforma-tributaria.lovable.app
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CalendarClock } from "lucide-react";

type Marco = {
  data: string;
  tipo: "DECISÃO" | "MARCO" | "PRAZO" | "ALERTA" | "VIRADA" | "VENCIMENTO";
  texto: string;
};

const MARCOS: Marco[] = [
  { data: "1º a 30/set/2026", tipo: "DECISÃO", texto: "Janela principal de opção pelo Simples Híbrido (por fora do DAS)" },
  { data: "14/set/2026", tipo: "MARCO", texto: "RFB e CGIBS enviam cálculo da alíquota CBS ao TCU" },
  { data: "30/nov/2026", tipo: "PRAZO", texto: "Cancelamento irretratável da opção Híbrida do SN" },
  { data: "15/dez/2026", tipo: "MARCO", texto: "Senado Federal fixa a alíquota da CBS para 2027" },
  { data: "31/dez/2026", tipo: "ALERTA", texto: "Prazo final EFD-Contribuições (PIS/Cofins) + inventário de estoques (Art. 381)" },
  { data: "01/jan/2027", tipo: "VIRADA", texto: "CBS plena · PIS/Cofins extintos · IPI zerado · IBS 0,1% (teste)" },
  { data: "26/fev/2027", tipo: "VENCIMENTO", texto: "1º vencimento da CBS (competência jan/2027)" },
  { data: "Março/2027", tipo: "DECISÃO", texto: "2ª janela de opção pelo Simples Híbrido (jul–dez/2027)" },
  { data: "30/jun/2027", tipo: "PRAZO", texto: "Apropriação do crédito presumido CBS sobre estoques (Art. 381)" },
  { data: "2º sem/2027", tipo: "MARCO", texto: "Split Payment Etapa 1 (facultativo, B2B, 7 arranjos)" },
];

const TIPO_COLOR: Record<Marco["tipo"], string> = {
  DECISÃO: "bg-blue-100 text-blue-800 border-blue-200",
  MARCO: "bg-slate-100 text-slate-800 border-slate-200",
  PRAZO: "bg-orange-100 text-orange-800 border-orange-200",
  ALERTA: "bg-red-100 text-red-800 border-red-200",
  VIRADA: "bg-purple-100 text-purple-800 border-purple-200",
  VENCIMENTO: "bg-amber-100 text-amber-800 border-amber-200",
};

const ALERTAS = [
  "CBS/IBS são por FORA — a estrutura do preço muda em jan/2027.",
  "Simples Nacional — decisão pelo Híbrido tem janela em set/2026 (curta e irretratável após 30/nov).",
  "IPI — créditos NÃO migram para CBS. Ressarcir agora via e-CAC antes da prescrição.",
  "EFD-Contribuições — regularizar até 31/12/2026 ou arriscar perda de créditos de PIS/Cofins.",
  "RS — posição favorável (CBS/IBS fora da base do ICMS em 2026). Monitorar PLP 16/2025 para 2027+.",
];

export function DecisoesCriticasCard() {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" />
            <CardTitle>Calendário de decisões críticas 2026 → 2027</CardTitle>
          </div>
          <CardDescription>
            Fonte: Live P&N Valorem — Reforma Tributária 2026 (jun/2026)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="relative border-l border-border ml-2 space-y-4">
            {MARCOS.map((m, i) => (
              <li key={i} className="ml-4">
                <div className="absolute -left-1.5 h-3 w-3 rounded-full border border-background bg-primary" />
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold tabular-nums">{m.data}</span>
                  <Badge variant="outline" className={`text-[10px] ${TIPO_COLOR[m.tipo]}`}>
                    {m.tipo}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">{m.texto}</p>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <CardTitle>5 alertas que não podem ser ignorados</CardTitle>
          </div>
          <CardDescription>Resumo executivo da Live</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {ALERTAS.map((a, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive font-bold text-xs">
                  {i + 1}
                </span>
                <span className="leading-snug">{a}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
