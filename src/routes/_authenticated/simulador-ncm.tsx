import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlertTriangle, BadgePercent, PackageSearch } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { simularAliquotaPorNcm, type RegimeDiferenciado } from "@/lib/tax-engine";
import { formatCurrency } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/simulador-ncm")({
  head: () => ({
    meta: [
      { title: "Simulador por NCM — Reforma Tributária" },
      { name: "description", content: "Consulte a alíquota estimada por NCM e o cronograma de descontinuidade dos tributos." },
    ],
  }),
  component: SimuladorNcmPage,
});

const regimeOptions: { value: RegimeDiferenciado; label: string }[] = [
  { value: "padrao", label: "Padrão" },
  { value: "reducao_30", label: "Redução de 30%" },
  { value: "reducao_60", label: "Redução de 60%" },
  { value: "aliquota_zero", label: "Alíquota zero" },
  { value: "imune", label: "Imune" },
];

function formatPct(value: number) {
  return `${(value * 100).toFixed(2)}%`;
}

function SimuladorNcmPage() {
  const [ncm, setNcm] = useState("");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("1000");
  const [regime, setRegime] = useState<RegimeDiferenciado>("padrao");
  const [sujeitoIS, setSujeitoIS] = useState(false);
  const [aliquotaIS, setAliquotaIS] = useState("0");
  const [resultadoVisivel, setResultadoVisivel] = useState(false);

  const resultado = useMemo(() => {
    if (!resultadoVisivel || !ncm.trim()) return null;

    return simularAliquotaPorNcm({
      ncm,
      descricao,
      valor: Number(valor) || 0,
      regime_diferenciado: regime,
      sujeito_imposto_seletivo: sujeitoIS,
      aliquota_is: Number(aliquotaIS) || 0,
    });
  }, [aliquotaIS, descricao, ncm, regime, resultadoVisivel, sujeitoIS, valor]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
          <PackageSearch className="h-7 w-7" />
          Simulador por NCM
        </h1>
        <p className="mt-1 text-muted-foreground">
          Consulte a alíquota estimada de CBS/IBS e visualize, ano a ano, os tributos que deixam de incidir.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Consulta rápida de produto</CardTitle>
          <CardDescription>Informe o NCM e, opcionalmente, complemente o cenário para refinar a leitura.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="ncm">NCM</Label>
            <Input id="ncm" value={ncm} onChange={(e) => setNcm(e.target.value)} placeholder="Ex.: 85171231" />
          </div>
          <div className="space-y-2 xl:col-span-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Input id="descricao" value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex.: Smartphone" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="valor">Valor de referência</Label>
            <Input id="valor" value={valor} onChange={(e) => setValor(e.target.value)} inputMode="decimal" />
          </div>
          <div className="space-y-2">
            <Label>Regime diferenciado</Label>
            <Select value={regime} onValueChange={(value) => setRegime(value as RegimeDiferenciado)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {regimeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="aliquota-is">Alíquota do IS (%)</Label>
            <Input id="aliquota-is" value={aliquotaIS} onChange={(e) => setAliquotaIS(e.target.value)} inputMode="decimal" disabled={!sujeitoIS} />
          </div>
          <div className="flex items-end xl:col-span-2">
            <label className="flex items-center gap-3 text-sm text-foreground">
              <Checkbox checked={sujeitoIS} onCheckedChange={(checked) => setSujeitoIS(Boolean(checked))} />
              Produto sujeito ao Imposto Seletivo
            </label>
          </div>
          <div className="flex items-end justify-end xl:col-span-4">
            <Button onClick={() => setResultadoVisivel(true)} disabled={!ncm.trim()}>
              <BadgePercent className="mr-2 h-4 w-4" />
              Simular NCM
            </Button>
          </div>
        </CardContent>
      </Card>

      {resultado && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>CBS estimada</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatPct(resultado.aliquota_cbs_estimada)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>IBS estimada</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatPct(resultado.aliquota_ibs_estimada)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Alíquota total prevista</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatPct(resultado.aliquota_total_estimada)}</div>
                <p className="mt-1 text-xs text-muted-foreground">Base de referência: {formatCurrency(resultado.valor_referencia || 0)}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{resultado.descricao}</CardTitle>
              <CardDescription>
                NCM {resultado.ncm}
                {resultado.setor_zfm ? ` • Setor com preservação de IPI na ZFM: ${resultado.setor_zfm}` : " • Sem enquadramento específico de ZFM"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {resultado.alertas.map((alerta) => (
                <div key={alerta} className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 p-3 text-sm">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning-foreground" />
                  <span>{alerta}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cronograma 2026–2033</CardTitle>
              <CardDescription>Leitura anual dos tributos mantidos e descontinuados para o item consultado.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="px-2 py-3 text-left">Ano</th>
                    <th className="px-2 py-3 text-right">CBS</th>
                    <th className="px-2 py-3 text-right">IBS</th>
                    <th className="px-2 py-3 text-right">Total</th>
                    <th className="px-2 py-3 text-left">Mantidos</th>
                    <th className="px-2 py-3 text-left">Descontinuados</th>
                    <th className="px-2 py-3 text-left">Observação</th>
                  </tr>
                </thead>
                <tbody>
                  {resultado.cronograma.map((linha) => (
                    <tr key={linha.ano} className="border-b align-top">
                      <td className="px-2 py-3 font-medium">{linha.ano}</td>
                      <td className="px-2 py-3 text-right tabular-nums">{formatPct(linha.aliquota_cbs)}</td>
                      <td className="px-2 py-3 text-right tabular-nums">{formatPct(linha.aliquota_ibs)}</td>
                      <td className="px-2 py-3 text-right tabular-nums">{formatPct(linha.aliquota_total_nova)}</td>
                      <td className="px-2 py-3">
                        <div className="flex flex-wrap gap-2">
                          {linha.tributos_mantidos.map((item) => (
                            <Badge key={item} variant="secondary">{item}</Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-2 py-3">
                        <div className="flex flex-wrap gap-2">
                          {linha.tributos_descontinuados.map((item) => (
                            <Badge key={item} variant="outline">{item}</Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-2 py-3 text-muted-foreground">{linha.observacao}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}