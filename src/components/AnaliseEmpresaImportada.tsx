import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { ArrowDown, ArrowUp, BarChart3, PackageSearch } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/format";
import {
  calcularCenarioAnual,
  agruparPorNcm,
  anosCompetenciaDisponiveis,
  type ProdutoLinha,
  type ServicoLinha,
  type NcmAgregado,
  type CenarioAno,
} from "@/lib/empresa-analise";

type SortKey = "valor_anual" | "carga_atual" | "carga_projetada" | "variacao_pct";

interface Props {
  empresaId: string;
  /** Esconde o card de "ano de competência" (útil em telas com filtro próprio). */
  hideFiltroAno?: boolean;
}

export function AnaliseEmpresaImportada({ empresaId, hideFiltroAno }: Props) {
  const [produtos, setProdutos] = useState<ProdutoLinha[]>([]);
  const [servicos, setServicos] = useState<ServicoLinha[]>([]);
  const [loading, setLoading] = useState(true);
  const [anoComp, setAnoComp] = useState<string>("todos");
  const [sortKey, setSortKey] = useState<SortKey>("variacao_pct");
  const [filtroMin, setFiltroMin] = useState<string>("");
  const [filtroMax, setFiltroMax] = useState<string>("");

  useEffect(() => {
    let cancel = false;
    async function fetchData() {
      setLoading(true);
      const [pRes, sRes] = await Promise.all([
        supabase
          .from("produtos")
          .select(
            "id,ncm,descricao,valor_mensal,competencia,regime_diferenciado,aliquota_pis,aliquota_cofins,aliquota_ipi,aliquota_icms,aliquota_ibs,aliquota_cbs,reducao_aplicada",
          )
          .eq("empresa_id", empresaId),
        supabase
          .from("servicos")
          .select(
            "id,descricao,valor_mensal,competencia,regime_diferenciado,aliquota_pis,aliquota_cofins,aliquota_iss,aliquota_ibs,aliquota_cbs",
          )
          .eq("empresa_id", empresaId),
      ]);
      if (cancel) return;
      setProdutos((pRes.data ?? []) as ProdutoLinha[]);
      setServicos((sRes.data ?? []) as ServicoLinha[]);
      setLoading(false);
    }
    fetchData();
    return () => {
      cancel = true;
    };
  }, [empresaId]);

  const anosDisponiveis = useMemo(
    () => anosCompetenciaDisponiveis(produtos, servicos),
    [produtos, servicos],
  );

  const anoSelecionado = anoComp === "todos" ? undefined : Number(anoComp);

  const cenario: CenarioAno[] = useMemo(
    () => calcularCenarioAnual(produtos, servicos, anoSelecionado),
    [produtos, servicos, anoSelecionado],
  );

  const ncmAgrupado = useMemo(
    () => agruparPorNcm(produtos, anoSelecionado),
    [produtos, anoSelecionado],
  );

  const ncmFiltrado = useMemo(() => {
    const min = filtroMin === "" ? -Infinity : Number(filtroMin);
    const max = filtroMax === "" ? Infinity : Number(filtroMax);
    const items = ncmAgrupado.filter(
      (n) => n.variacao_pct >= min && n.variacao_pct <= max,
    );
    items.sort((a, b) => Math.abs(b[sortKey]) - Math.abs(a[sortKey]));
    return items;
  }, [ncmAgrupado, sortKey, filtroMin, filtroMax]);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Carregando dados da empresa…
        </CardContent>
      </Card>
    );
  }

  const totalAtual2033 = cenario[cenario.length - 1]?.carga_atual ?? 0;
  const totalNova2033 = cenario[cenario.length - 1]?.carga_nova ?? 0;
  const varTotal = totalNova2033 - totalAtual2033;
  const varTotalPct = totalAtual2033 > 0 ? (varTotal / totalAtual2033) * 100 : 0;

  if (produtos.length === 0 && servicos.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4" />
            Análise dos itens importados
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Nenhum produto ou serviço cadastrado nesta empresa. Importe via aba de
          produtos/serviços para visualizar o cenário anual e a análise por NCM.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── Cenário anual ─── */}
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Cenário anual da empresa (2026–2033)
            </CardTitle>
            <CardDescription>
              Carga tributária atual vs. projetada na reforma, aplicada item-a-item aos
              produtos e serviços cadastrados, ano-a-ano pelo cronograma da LC 214/2025.
            </CardDescription>
          </div>
          {!hideFiltroAno && anosDisponiveis.length > 0 && (
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Competência</Label>
              <Select value={anoComp} onValueChange={setAnoComp}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas</SelectItem>
                  {anosDisponiveis.map((a) => (
                    <SelectItem key={a} value={String(a)}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Carga atual (2033, ref.)</p>
              <p className="text-lg font-semibold">{formatCurrency(totalAtual2033)}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Carga nova (2033)</p>
              <p className="text-lg font-semibold">{formatCurrency(totalNova2033)}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Variação</p>
              <p
                className={`text-lg font-semibold flex items-center gap-1 ${
                  varTotal > 0 ? "text-destructive" : "text-emerald-600"
                }`}
              >
                {varTotal > 0 ? (
                  <ArrowUp className="h-4 w-4" />
                ) : (
                  <ArrowDown className="h-4 w-4" />
                )}
                {formatCurrency(Math.abs(varTotal))} ({varTotalPct.toFixed(1)}%)
              </p>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={cenario} margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="ano" tick={{ fontSize: 12 }} />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  labelFormatter={(label) => `Ano ${label}`}
                />
                <Legend />
                <Line
                  type="monotone"
                  name="Carga atual"
                  dataKey="carga_atual"
                  stroke="hsl(var(--chart-3))"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  name="Carga nova (CBS+IBS)"
                  dataKey="carga_nova"
                  stroke="hsl(var(--chart-1))"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* ─── Análise por NCM ─── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PackageSearch className="h-5 w-5" />
            Análise por NCM
          </CardTitle>
          <CardDescription>
            Itens agrupados pelo NCM informado. Carga projetada usa o regime/redução de
            cada produto no cenário pleno (2033).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Ordenar por</Label>
              <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="variacao_pct">Maior variação %</SelectItem>
                  <SelectItem value="carga_atual">Maior carga atual</SelectItem>
                  <SelectItem value="carga_projetada">Maior carga projetada</SelectItem>
                  <SelectItem value="valor_anual">Maior faturamento</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Variação mín. (%)</Label>
              <Input
                type="number"
                className="w-28"
                value={filtroMin}
                onChange={(e) => setFiltroMin(e.target.value)}
                placeholder="-100"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Variação máx. (%)</Label>
              <Input
                type="number"
                className="w-28"
                value={filtroMax}
                onChange={(e) => setFiltroMax(e.target.value)}
                placeholder="100"
              />
            </div>
            <Badge variant="secondary" className="ml-auto">
              {ncmFiltrado.length} NCM(s)
            </Badge>
          </div>

          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>NCM</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Regime</TableHead>
                  <TableHead className="text-right">Faturamento anual</TableHead>
                  <TableHead className="text-right">Carga atual</TableHead>
                  <TableHead className="text-right">Carga projetada</TableHead>
                  <TableHead className="text-right">Variação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ncmFiltrado.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-6 text-center text-sm text-muted-foreground">
                      Nenhum NCM no filtro selecionado.
                    </TableCell>
                  </TableRow>
                )}
                {ncmFiltrado.map((n: NcmAgregado) => {
                  const pos = n.variacao > 0;
                  return (
                    <TableRow key={n.ncm}>
                      <TableCell className="font-mono text-xs">{n.ncm}</TableCell>
                      <TableCell className="text-xs">{n.descricao}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {n.regime}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums">
                        {formatCurrency(n.valor_anual)}
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums">
                        {formatCurrency(n.carga_atual)}
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums">
                        {formatCurrency(n.carga_projetada)}
                      </TableCell>
                      <TableCell
                        className={`text-right text-xs tabular-nums font-medium ${
                          pos ? "text-destructive" : "text-emerald-600"
                        }`}
                      >
                        {pos ? "+" : ""}
                        {n.variacao_pct.toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
