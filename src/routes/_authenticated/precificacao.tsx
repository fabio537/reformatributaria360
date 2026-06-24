import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { DollarSign, Save, AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLinkedEmpresa } from "@/hooks/useLinkedEmpresa";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/format";
import {
  ANOS_PRECIFICACAO,
  calcularPrecificacao,
  type ProdutoPrecificacao,
} from "@/lib/precificacao-engine";

export const Route = createFileRoute("/_authenticated/precificacao")({
  head: () => ({
    meta: [
      { title: "Precificação por Produto — Reforma Tributária" },
      { name: "description", content: "Compare cenários de preço e margem para cada produto sob o novo regime IBS/CBS." },
    ],
  }),
  component: PrecificacaoPage,
});

interface PrecRow {
  produto_id: string;
  preco_venda_atual: number;
  custo: number;
  credito_entrada_pct: number;
  dirty: boolean;
  saving?: boolean;
}

function pctFmt(v: number, digits = 2) {
  return `${(v * 100).toFixed(digits)}%`;
}

function PrecificacaoPage() {
  const linked = useLinkedEmpresa();
  const [produtos, setProdutos] = useState<ProdutoPrecificacao[]>([]);
  const [precs, setPrecs] = useState<Record<string, PrecRow>>({});
  const [ano, setAno] = useState<number>(2027);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!linked.empresaId) return;
    let active = true;
    setLoading(true);
    (async () => {
      const [{ data: prods, error: e1 }, { data: precsDb, error: e2 }] = await Promise.all([
        supabase
          .from("produtos")
          .select(
            "id, ncm, descricao, regime_diferenciado, aliquota_pis, aliquota_cofins, aliquota_ipi, aliquota_icms, aliquota_ibs, aliquota_cbs, reducao_aplicada",
          )
          .eq("empresa_id", linked.empresaId),
        supabase
          .from("precificacao")
          .select("produto_id, preco_venda_atual, custo, credito_entrada_pct")
          .eq("empresa_id", linked.empresaId),
      ]);
      if (!active) return;
      if (e1 || e2) {
        toast.error(`Erro ao carregar: ${e1?.message ?? e2?.message}`);
        setLoading(false);
        return;
      }
      setProdutos((prods ?? []) as ProdutoPrecificacao[]);
      const map: Record<string, PrecRow> = {};
      for (const p of precsDb ?? []) {
        map[p.produto_id] = {
          produto_id: p.produto_id,
          preco_venda_atual: Number(p.preco_venda_atual) || 0,
          custo: Number(p.custo) || 0,
          credito_entrada_pct: Number(p.credito_entrada_pct) || 0,
          dirty: false,
        };
      }
      setPrecs(map);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [linked.empresaId]);

  const getRow = (produtoId: string): PrecRow =>
    precs[produtoId] ?? {
      produto_id: produtoId,
      preco_venda_atual: 0,
      custo: 0,
      credito_entrada_pct: 0,
      dirty: false,
    };

  const updateRow = (produtoId: string, patch: Partial<PrecRow>) =>
    setPrecs((prev) => ({
      ...prev,
      [produtoId]: { ...getRow(produtoId), ...patch, dirty: true },
    }));

  const salvar = async (produtoId: string) => {
    if (!linked.empresaId) return;
    const row = getRow(produtoId);
    setPrecs((prev) => ({ ...prev, [produtoId]: { ...row, saving: true } }));
    const { error } = await supabase.from("precificacao").upsert(
      {
        empresa_id: linked.empresaId,
        produto_id: produtoId,
        preco_venda_atual: row.preco_venda_atual,
        custo: row.custo,
        credito_entrada_pct: row.credito_entrada_pct,
      },
      { onConflict: "produto_id" },
    );
    if (error) {
      toast.error(`Erro ao salvar: ${error.message}`);
      setPrecs((prev) => ({ ...prev, [produtoId]: { ...row, saving: false } }));
      return;
    }
    toast.success("Precificação salva");
    setPrecs((prev) => ({ ...prev, [produtoId]: { ...row, dirty: false, saving: false } }));
  };

  const resultados = useMemo(() => {
    return produtos.map((p) => {
      const row = getRow(p.id);
      const calc = calcularPrecificacao(
        p,
        {
          preco_venda_atual: row.preco_venda_atual,
          custo: row.custo,
          credito_entrada_pct: row.credito_entrada_pct,
        },
        ano,
      );
      return { produto: p, row, calc };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [produtos, precs, ano]);

  if (!linked.empresaId) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Vincule-se a uma empresa para utilizar a precificação por produto.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
          <DollarSign className="h-7 w-7" />
          Precificação por Produto
        </h1>
        <p className="mt-1 text-muted-foreground">
          Compare “manter preço” vs “preservar margem” para cada produto, ano a ano da transição.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Cenário do ano</CardTitle>
            <CardDescription>
              A engine aplica o cronograma de transição (2026–2033) e considera crédito pleno na
              entrada como redução de custo efetivo.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="ano">Ano</Label>
            <Select value={String(ano)} onValueChange={(v) => setAno(Number(v))}>
              <SelectTrigger id="ano" className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ANOS_PRECIFICACAO.map((a) => (
                  <SelectItem key={a} value={String(a)}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          {loading ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Carregando…</div>
          ) : produtos.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              Nenhum produto cadastrado para esta empresa.
            </div>
          ) : (
            <Table className="min-w-[1280px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Produto / NCM</TableHead>
                  <TableHead className="w-32">Preço atual</TableHead>
                  <TableHead className="w-32">Custo</TableHead>
                  <TableHead className="w-28">Créd. entrada %</TableHead>
                  <TableHead className="w-24">Margem hoje</TableHead>
                  <TableHead className="w-40 bg-muted/40">A · Manter preço</TableHead>
                  <TableHead className="w-44 bg-muted/40">B · Preservar margem</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resultados.map(({ produto, row, calc }) => (
                  <TableRow key={produto.id}>
                    <TableCell>
                      <div className="font-medium">{produto.descricao || "—"}</div>
                      <div className="text-xs text-muted-foreground">NCM {produto.ncm || "—"}</div>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        value={row.preco_venda_atual || ""}
                        onChange={(e) =>
                          updateRow(produto.id, { preco_venda_atual: Number(e.target.value) || 0 })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        value={row.custo || ""}
                        onChange={(e) => updateRow(produto.id, { custo: Number(e.target.value) || 0 })}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        value={row.credito_entrada_pct || ""}
                        onChange={(e) =>
                          updateRow(produto.id, { credito_entrada_pct: Number(e.target.value) || 0 })
                        }
                      />
                    </TableCell>
                    <TableCell className="text-sm tabular-nums">{pctFmt(calc.margem_hoje)}</TableCell>
                    <TableCell className="bg-muted/30">
                      <div className="text-sm">Preço: {formatCurrency(calc.cenario_a.preco)}</div>
                      <div className="text-sm">Nova margem: {pctFmt(calc.cenario_a.nova_margem)}</div>
                      <Badge
                        variant="outline"
                        className={
                          calc.cenario_a.variacao_margem_pp >= 0
                            ? "border-emerald-500 text-emerald-600"
                            : "border-red-500 text-red-600"
                        }
                      >
                        {calc.cenario_a.variacao_margem_pp >= 0 ? (
                          <TrendingUp className="mr-1 h-3 w-3" />
                        ) : (
                          <TrendingDown className="mr-1 h-3 w-3" />
                        )}
                        {calc.cenario_a.variacao_margem_pp.toFixed(2)} p.p.
                      </Badge>
                    </TableCell>
                    <TableCell className="bg-muted/30">
                      {calc.cenario_b.viavel ? (
                        <>
                          <div className="text-sm">Novo preço: {formatCurrency(calc.cenario_b.preco_necessario)}</div>
                          <div className="text-sm">Margem mantida: {pctFmt(calc.cenario_b.nova_margem)}</div>
                          <Badge
                            variant="outline"
                            className={
                              calc.cenario_b.reajuste_pct >= 0
                                ? "border-amber-500 text-amber-600"
                                : "border-emerald-500 text-emerald-600"
                            }
                          >
                            Reajuste: {(calc.cenario_b.reajuste_pct * 100).toFixed(2)}%
                          </Badge>
                        </>
                      ) : (
                        <div className="flex items-start gap-1 text-xs text-muted-foreground">
                          <AlertTriangle className="mt-0.5 h-3 w-3 text-warning-foreground" />
                          Margem inviável sob esta carga.
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant={row.dirty ? "default" : "ghost"}
                        disabled={!row.dirty || row.saving}
                        onClick={() => salvar(produto.id)}
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
