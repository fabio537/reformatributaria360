import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Calculator,
  CheckCircle2,
  Info,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useLinkedEmpresa } from "@/hooks/useLinkedEmpresa";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  calcularSimplesDas,
  type PerfilClientes,
  type SimplesDasInput,
  type SimplesDasResultado,
} from "@/lib/simples-das-engine";

export const Route = createFileRoute("/_authenticated/simples-das")({
  head: () => ({
    meta: [
      { title: "Simples Nacional — Dentro vs. Fora do DAS | Reforma Tributária" },
      {
        name: "description",
        content:
          "Compare recolher IBS/CBS dentro do DAS unificado ou por fora no regime regular em 2027. Recomendação baseada no perfil de clientes.",
      },
    ],
  }),
  component: SimplesDasPage,
});

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

function fmtPct(v: number, digits = 1) {
  const s = (v * 100).toFixed(digits);
  return `${v >= 0 ? "+" : ""}${s}%`;
}

interface EmpresaData {
  id: string;
  razao_social: string | null;
  regime_tributario: string;
  optante_simples_mei: boolean;
  faturamento_anual: number | null;
  perfil_clientes: PerfilClientes | null;
  perfil_b2b_pct: number | null;
  perc_insumos_creditaveis: number | null;
}


function SimplesDasPage() {
  const linked = useLinkedEmpresa();
  const [empresa, setEmpresa] = useState<EmpresaData | null>(null);
  const [itens, setItens] = useState<SimplesDasInput["itens"]>([]);
  const [creditos, setCreditos] = useState<SimplesDasInput["creditos"]>([]);
  const [loading, setLoading] = useState(false);

  // Edits locais (perfil) com salvamento no banco
  const [perfilClientes, setPerfilClientes] = useState<PerfilClientes | "">("");
  const [perfilB2bPct, setPerfilB2bPct] = useState<string>("");
  const [percInsumos, setPercInsumos] = useState<string>("");
  const [savingPerfil, setSavingPerfil] = useState(false);


  useEffect(() => {
    const empresaId = linked.empresaId;
    if (!empresaId) return;
    let active = true;
    setLoading(true);
    (async () => {
      const [{ data: emp, error: e1 }, { data: prods }, { data: servs }, { data: creds }] =
        await Promise.all([
          supabase
            .from("empresas")
            .select(
              "id, razao_social, regime_tributario, optante_simples_mei, faturamento_anual, perfil_clientes, perfil_b2b_pct, perc_insumos_creditaveis",
            )
            .eq("id", empresaId)
            .maybeSingle(),

          supabase
            .from("produtos")
            .select("valor_mensal, regime_diferenciado")
            .eq("empresa_id", empresaId),
          supabase
            .from("servicos")
            .select("valor_mensal, regime_diferenciado")
            .eq("empresa_id", empresaId),
          supabase
            .from("creditos_aquisicao")
            .select("valor_mensal, regime_diferenciado_fornecedor")
            .eq("empresa_id", empresaId),
        ]);
      if (!active) return;
      if (e1) toast.error("Falha ao carregar empresa");
      const empData = emp as unknown as EmpresaData | null;
      setEmpresa(empData);
      setPerfilClientes((empData?.perfil_clientes as PerfilClientes | null) ?? "");
      setPerfilB2bPct(empData?.perfil_b2b_pct != null ? String(empData.perfil_b2b_pct) : "");
      setPercInsumos(
        empData?.perc_insumos_creditaveis != null ? String(empData.perc_insumos_creditaveis) : "",
      );

      setItens([
        ...((prods ?? []) as any[]).map((p) => ({
          tipo: "produto" as const,
          valor_mensal: Number(p.valor_mensal) || 0,
          regime_diferenciado: (p.regime_diferenciado ?? "padrao") as any,
        })),
        ...((servs ?? []) as any[]).map((s) => ({
          tipo: "servico" as const,
          valor_mensal: Number(s.valor_mensal) || 0,
          regime_diferenciado: (s.regime_diferenciado ?? "padrao") as any,
        })),
      ]);
      setCreditos(
        ((creds ?? []) as any[]).map((c) => ({
          valor_mensal: Number(c.valor_mensal) || 0,
          regime_diferenciado_fornecedor: (c.regime_diferenciado_fornecedor ?? "padrao") as any,
        })),
      );
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [linked.empresaId]);

  const resultado: SimplesDasResultado | null = useMemo(() => {
    if (!empresa) return null;
    const perfil = (perfilClientes || empresa.perfil_clientes || "B2C") as PerfilClientes;
    const fatItens = itens.reduce((s, i) => s + i.valor_mensal, 0) * 12;
    const fatAnual = empresa.faturamento_anual || fatItens || 0;
    if (fatAnual <= 0 || itens.length === 0) return null;
    return calcularSimplesDas({
      faturamento_anual: fatAnual,
      perfil_clientes: perfil,
      perfil_b2b_pct: Number(perfilB2bPct) || 0,
      itens,
      creditos,
      perc_insumos_creditaveis:
        Number(percInsumos) || Number(empresa.perc_insumos_creditaveis) || 0,
    });
  }, [empresa, itens, creditos, perfilClientes, perfilB2bPct, percInsumos]);

  async function salvarPerfil() {
    if (!empresa) return;
    if (!perfilClientes) {
      toast.error("Selecione um perfil de clientes");
      return;
    }
    setSavingPerfil(true);
    const percInsumosNum = Math.max(0, Math.min(100, Number(percInsumos) || 0));
    const { error } = await supabase
      .from("empresas")
      .update({
        perfil_clientes: perfilClientes,
        perfil_b2b_pct: perfilClientes === "MISTO" ? Number(perfilB2bPct) || 0 : 0,
        perc_insumos_creditaveis: percInsumosNum,
      } as any)
      .eq("id", empresa.id);
    setSavingPerfil(false);
    if (error) {
      toast.error("Falha ao salvar perfil");
      return;
    }
    toast.success("Perfil de clientes salvo");
    setEmpresa({
      ...empresa,
      perfil_clientes: perfilClientes,
      perfil_b2b_pct: perfilClientes === "MISTO" ? Number(perfilB2bPct) || 0 : 0,
      perc_insumos_creditaveis: percInsumosNum,
    });
  }


  if (!linked.empresaId) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Simples Nacional — Dentro vs. Fora do DAS</h1>
        <Alert>
          <AlertDescription>Selecione uma empresa para visualizar a análise.</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (loading || !empresa) {
    return <p className="text-sm text-muted-foreground">Carregando…</p>;
  }

  const isSimples =
    empresa.regime_tributario === "simples_nacional" || empresa.optante_simples_mei;

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Calculator className="h-6 w-6 text-primary" />
          Simples Nacional — Dentro vs. Fora do DAS
        </h1>
        <p className="text-sm text-muted-foreground">
          {empresa.razao_social} · Análise focada em <strong>2027</strong> (primeira janela
          de decisão: setembro/2026).
        </p>
      </header>

      {!isSimples && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Empresa fora do Simples Nacional</AlertTitle>
          <AlertDescription>
            Esta análise é destinada a optantes do Simples Nacional. Os números são exibidos
            apenas para fins de planejamento hipotético.
          </AlertDescription>
        </Alert>
      )}

      {/* Perfil de clientes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" /> Perfil de clientes
          </CardTitle>
          <CardDescription>
            Essencial para a análise competitiva: o crédito de IBS/CBS só vira vantagem real
            quando o cliente é PJ (B2B).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3 md:items-end">
            <div className="space-y-2">
              <Label>Perfil</Label>
              <Select
                value={perfilClientes || undefined}
                onValueChange={(v) => setPerfilClientes(v as PerfilClientes)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="B2B">B2B — vende para empresas</SelectItem>
                  <SelectItem value="B2C">B2C — vende para consumidor final</SelectItem>
                  <SelectItem value="MISTO">MISTO — ambos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {perfilClientes === "MISTO" && (
              <div className="space-y-2">
                <Label>% B2B aproximado</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={perfilB2bPct}
                  onChange={(e) => setPerfilB2bPct(e.target.value)}
                  placeholder="Ex.: 40"
                />
              </div>
            )}
            <div className="space-y-2 md:col-span-3">
              <Label htmlFor="perc-insumos-sd">
                Percentual de insumos creditáveis sobre a receita bruta (%)
              </Label>
              <Input
                id="perc-insumos-sd"
                type="number"
                min={0}
                max={100}
                step="0.01"
                inputMode="decimal"
                value={percInsumos}
                onChange={(e) => setPercInsumos(e.target.value)}
                placeholder="Ex.: 40"
              />
              <p className="text-xs text-muted-foreground">
                Use quando não há histórico de compras importado. Ex.: se 40% da sua receita é
                gasta em insumos e aquisições que geram crédito, informe <strong>40</strong>.
                Aplica-se ao cenário <strong>POR FORA</strong> (regime regular). Quando houver
                créditos cadastrados, eles têm prioridade sobre essa estimativa.
              </p>
            </div>
            <div>
              <Button onClick={salvarPerfil} disabled={savingPerfil || !perfilClientes}>
                {savingPerfil ? "Salvando…" : "Salvar perfil"}
              </Button>
            </div>

          </div>
        </CardContent>
      </Card>

      {!resultado && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Cadastre produtos/serviços e o faturamento anual da empresa para gerar a análise.
          </AlertDescription>
        </Alert>
      )}

      {resultado && <ResultadoAnalise resultado={resultado} />}

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Observações importantes</AlertTitle>
        <AlertDescription>
          <ul className="list-disc pl-5 space-y-1 text-sm">
            <li>
              A opção pelo regime regular é <strong>semestral</strong> (janelas de abril e
              setembro) e <strong>irrevogável dentro do semestre</strong>. A 1ª opção é em{" "}
              <strong>setembro/2026</strong>, com efeito a partir de janeiro/2027.
            </li>
            <li>
              Valores são <strong>estimativa de planejamento</strong>, sujeitos à
              regulamentação e à calibração anual da alíquota de referência pelo Senado.
              Recomendamos <strong>validação por profissional contábil/tributário</strong>.
            </li>
            <li>
              <strong>Não se aplica a MEI</strong> (Anexo VII): opção em janeiro, valores
              fixos.
            </li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
}

function ResultadoAnalise({ resultado }: { resultado: SimplesDasResultado }) {
  const { cenario_a: a, cenario_b: b, recomendacao } = resultado;

  const chartData = [
    {
      grupo: "Carga 2026 (DAS atual)",
      desembolso: resultado.carga_atual_2026_anual,
      credito_cliente: 0,
    },
    {
      grupo: "2027 — DENTRO do DAS",
      desembolso: a.desembolso_anual,
      credito_cliente: a.credito_cliente_anual,
    },
    {
      grupo: "2027 — POR FORA",
      desembolso: b.desembolso_anual,
      credito_cliente: b.credito_cliente_anual,
    },
  ];

  const recBadge =
    recomendacao.cenario_recomendado === "A"
      ? { label: "DENTRO do DAS", color: "bg-blue-600" }
      : recomendacao.cenario_recomendado === "B"
        ? { label: "POR FORA", color: "bg-emerald-600" }
        : { label: "AVALIAR", color: "bg-amber-600" };

  return (
    <div className="space-y-6">
      {/* Recomendação */}
      <Card className="border-primary/40">
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              {recomendacao.titulo}
            </CardTitle>
            <Badge className={`${recBadge.color} text-white`}>{recBadge.label}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>{recomendacao.justificativa}</p>
          <p className="rounded-md bg-muted p-3 text-foreground">
            <strong>Trade-off: </strong>
            {recomendacao.trade_off}
          </p>
        </CardContent>
      </Card>

      {/* Cards comparativos */}
      <div className="grid gap-4 md:grid-cols-2">
        <CenarioCard
          titulo="Cenário A — DENTRO do DAS"
          subtitulo="Regime unificado: IBS/CBS embutidos no DAS"
          cenario={a}
          variacao_rs={resultado.variacao_a_vs_2026_rs}
          variacao_pct={resultado.variacao_a_vs_2026_pct}
          tom="blue"
        />
        <CenarioCard
          titulo="Cenário B — POR FORA"
          subtitulo="Regime regular: IBS/CBS por fora com créditos integrais"
          cenario={b}
          variacao_rs={resultado.variacao_b_vs_2026_rs}
          variacao_pct={resultado.variacao_b_vs_2026_pct}
          tom="emerald"
        />
      </div>

      {/* Gráfico */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Comparativo anual (R$)</CardTitle>
          <CardDescription>
            Desembolso tributário da empresa vs. crédito transferido ao cliente PJ.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="grupo" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(v) => fmtBRL(v as number)} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => fmtBRL(Number(v) || 0)} />
              <Legend />
              <Bar dataKey="desembolso" name="Desembolso anual" fill="hsl(var(--primary))">
                {chartData.map((_, i) => (
                  <Cell key={i} />
                ))}
              </Bar>
              <Bar dataKey="credito_cliente" name="Crédito ao cliente PJ" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Alertas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" /> Premissas e ressalvas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {resultado.alertas.map((a, i) => (
              <li key={i} className="text-muted-foreground">
                {a}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function CenarioCard({
  titulo,
  subtitulo,
  cenario,
  variacao_rs,
  variacao_pct,
  tom,
}: {
  titulo: string;
  subtitulo: string;
  cenario: SimplesDasResultado["cenario_a"];
  variacao_rs: number;
  variacao_pct: number;
  tom: "blue" | "emerald";
}) {
  const up = variacao_rs > 0;
  const TrendIcon = up ? TrendingUp : TrendingDown;
  const trendColor = up ? "text-red-600" : "text-emerald-600";
  const accent = tom === "blue" ? "border-blue-300" : "border-emerald-300";
  return (
    <Card className={accent}>
      <CardHeader>
        <CardTitle className="text-base">{titulo}</CardTitle>
        <CardDescription>{subtitulo}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <Linha label="DAS (mensal)" valor={fmtBRL(cenario.das_mensal)} />
        {cenario.ibs_cbs_pago_mensal > 0 && (
          <>
            <Linha
              label="IBS/CBS por fora (líquido, mensal)"
              valor={fmtBRL(cenario.ibs_cbs_pago_mensal)}
            />
            <Linha
              label="Crédito sobre insumos (mensal)"
              valor={`− ${fmtBRL(cenario.credito_insumos_mensal)}`}
              muted
            />
            {cenario.origem_credito_insumos === "estimado" && (
              <div>
                <Badge variant="secondary" className="text-[10px]">
                  crédito estimado (sem histórico)
                </Badge>
              </div>
            )}
            {cenario.origem_credito_insumos === "nenhum" && (
              <div>
                <Badge variant="destructive" className="text-[10px]">
                  sem créditos — carga superestimada
                </Badge>
              </div>
            )}
          </>
        )}

        <div className="border-t pt-3 space-y-1">
          <div className="flex items-baseline justify-between">
            <span className="font-medium">Desembolso anual</span>
            <span className="text-lg font-bold">{fmtBRL(cenario.desembolso_anual)}</span>
          </div>
          <div className={`flex items-center gap-1 text-xs ${trendColor}`}>
            <TrendIcon className="h-3.5 w-3.5" />
            <span>
              {up ? "Aumento" : "Redução"} de {fmtBRL(Math.abs(variacao_rs))} ({fmtPct(variacao_pct)})
              vs. DAS atual de 2026
            </span>
          </div>
        </div>
        <div className="rounded-md bg-muted p-3 space-y-1">
          <div className="flex items-baseline justify-between">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              Crédito ao cliente PJ (anual)
            </span>
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
          </div>
          <p className="text-lg font-semibold text-emerald-700">
            {fmtBRL(cenario.credito_cliente_anual)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function Linha({
  label,
  valor,
  muted,
}: {
  label: string;
  valor: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between">
      <span className={muted ? "text-muted-foreground" : ""}>{label}</span>
      <span className={muted ? "text-muted-foreground" : "font-medium"}>{valor}</span>
    </div>
  );
}
