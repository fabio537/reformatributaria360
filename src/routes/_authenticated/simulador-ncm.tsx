import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlertTriangle, BadgePercent, PackageSearch, Calculator, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  simularAliquotaPorNcm,
  executarSimulacao,
  CRONOGRAMA_TRANSICAO,
  type RegimeDiferenciado,
  type EscopoReforma,
  type ResultadoSimulacao,
  type SimulacaoInput,
} from "@/lib/tax-engine";
import { formatCurrency } from "@/lib/format";
import { SimulacaoResultado } from "@/components/SimulacaoResultado";
import { SimulacaoProdutoResultado } from "@/components/SimulacaoProdutoResultado";
import { AnaliseEmpresaImportada } from "@/components/AnaliseEmpresaImportada";
import { PrecificacaoView } from "@/components/PrecificacaoView";
import { CurrencyInput } from "@/components/CurrencyInput";

import { useAuth } from "@/hooks/AuthContext";
import { useLinkedEmpresa } from "@/hooks/useLinkedEmpresa";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { RelatorioContexto } from "@/lib/relatorio-pdf";

import { toast } from "sonner";

/** Aceita "10000", "10.000", "10000,50", "10.000,50" e retorna number. */
function parseNumBR(v: string | number | null | undefined): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const s = String(v).trim();
  if (!s) return 0;
  // Se tem vírgula, assume formato BR: remove pontos, troca vírgula por ponto
  const norm = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s.replace(/\.(?=\d{3}(\D|$))/g, "");
  const n = Number(norm);
  return Number.isFinite(n) ? n : 0;
}

type CreditoLinha = {
  id: string;
  fornecedor: string;
  valor_mensal: string;
  regime_diferenciado_fornecedor: RegimeDiferenciado;
  aliquota_icms: string;
  aliquota_pis: string;
  aliquota_cofins: string;
  aliquota_ipi: string;
};

const novaCreditoLinha = (): CreditoLinha => ({
  id: Math.random().toString(36).slice(2),
  fornecedor: "",
  valor_mensal: "",
  regime_diferenciado_fornecedor: "padrao",
  aliquota_icms: "",
  aliquota_pis: "",
  aliquota_cofins: "",
  aliquota_ipi: "",
});

export const Route = createFileRoute("/_authenticated/simulador-ncm")({
  head: () => ({
    meta: [
      { title: "Simulador por NCM — Reforma Tributária" },
      { name: "description", content: "Consulte a alíquota estimada por NCM e simule o impacto da reforma em um produto específico." },
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
  const linkedEmpresa = useLinkedEmpresa();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
          <PackageSearch className="h-7 w-7" />
          Simulador NCM & Precificação
        </h1>
        <p className="mt-1 text-muted-foreground">
          Consulte alíquotas por NCM, simule um produto, analise os itens importados e
          precifique. Foco em 2027/2028, anos com regras consolidadas pela LC 214/2025.
        </p>
      </div>

      <Tabs defaultValue="consulta">
        <TabsList>
          <TabsTrigger value="consulta">Consulta rápida</TabsTrigger>
          <TabsTrigger value="completa">Simulação completa do produto</TabsTrigger>
          <TabsTrigger value="empresa" disabled={!linkedEmpresa.empresaId}>
            Análise da empresa
          </TabsTrigger>
          <TabsTrigger value="precificacao" disabled={!linkedEmpresa.empresaId}>
            Precificação
          </TabsTrigger>
        </TabsList>
        <TabsContent value="consulta" className="mt-6">
          <ConsultaRapidaTab />
        </TabsContent>
        <TabsContent value="completa" className="mt-6">
          <SimulacaoCompletaProdutoTab />
        </TabsContent>
        <TabsContent value="empresa" className="mt-6">
          {linkedEmpresa.empresaId ? (
            <AnaliseEmpresaImportada empresaId={linkedEmpresa.empresaId} />
          ) : (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Vincule-se a uma empresa para visualizar a análise dos itens importados.
              </CardContent>
            </Card>
          )}
        </TabsContent>
        <TabsContent value="precificacao" className="mt-6">
          <PrecificacaoView />
        </TabsContent>
      </Tabs>
    </div>
  );
}


// ─── Aba 1: Consulta rápida (conteúdo original) ────────────────────────────
function ConsultaRapidaTab() {
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

// ─── Aba 2: Simulação completa do produto ──────────────────────────────────
type RegimeTrib = "simples_nacional" | "lucro_presumido" | "lucro_real";

function SimulacaoCompletaProdutoTab() {
  const ANOS_CRONOGRAMA = CRONOGRAMA_TRANSICAO.map((t) => t.ano);
  const auth = useAuth();
  const linkedEmpresa = useLinkedEmpresa();

  // Identificação
  const [ncm, setNcm] = useState("");
  const [descricao, setDescricao] = useState("");
  const [regimeDif, setRegimeDif] = useState<RegimeDiferenciado>("padrao");
  const [tipoOperacao, setTipoOperacao] = useState("revenda");
  const [destinoOperacao, setDestinoOperacao] = useState("mercado_interno");
  const [sujeitoIS, setSujeitoIS] = useState(false);
  const [aliquotaIS, setAliquotaIS] = useState("0");

  // Valores e alíquotas atuais
  const [valorMensal, setValorMensal] = useState("10000");
  const [aliquotaPis, setAliquotaPis] = useState("1.65");
  const [aliquotaCofins, setAliquotaCofins] = useState("7.6");
  const [aliquotaIpi, setAliquotaIpi] = useState("0");
  const [aliquotaIcms, setAliquotaIcms] = useState("18");

  // Regime tributário aplicável ao produto (afeta DAS vs PIS/COFINS/ICMS/IPI)
  const [regimeTrib, setRegimeTrib] = useState<RegimeTrib>("lucro_real");

  // Cenário da reforma
  const [escopoReforma, setEscopoReforma] = useState<EscopoReforma>("cbs_ibs");
  const [anosSelecionados, setAnosSelecionados] = useState<number[]>([2027, 2028]);

  // Créditos de aquisição (insumos / mercadorias compradas)
  const [creditos, setCreditos] = useState<CreditoLinha[]>([]);

  const addCredito = () => setCreditos((prev) => [...prev, novaCreditoLinha()]);
  const removeCredito = (id: string) => setCreditos((prev) => prev.filter((c) => c.id !== id));
  const updateCredito = (id: string, patch: Partial<CreditoLinha>) =>
    setCreditos((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  const [resultado, setResultado] = useState<ResultadoSimulacao | null>(null);
  const [loading, setLoading] = useState(false);
  const [simulacaoInput, setSimulacaoInput] = useState<SimulacaoInput | null>(null);
  const [saving, setSaving] = useState(false);
  const [simulacaoSalvaId, setSimulacaoSalvaId] = useState<string | null>(null);

  const simular = () => {
    if (!ncm.trim() || !valorMensal) return;
    setLoading(true);

    try {
      const valorMensalNum = parseNumBR(valorMensal);
      // Faturamento sintético = item isolado (12× valor mensal). Mantém DAS coerente para SN.
      const fatAnualNum = valorMensalNum * 12;

      const input: SimulacaoInput = {
        empresa: {
          razao_social: descricao || `Produto NCM ${ncm}`,
          cnpj: "—",
          regime_tributario: regimeTrib,
          uf: null,
          municipio: null,
          faturamento_anual: fatAnualNum,
          optante_simples_mei: regimeTrib === "simples_nacional",
          irpj_csll: { incluir: false },
        },
        produtos: [
          {
            descricao: descricao || "Produto",
            ncm,
            valor_mensal: valorMensalNum,
            quantidade_mensal: 0,
            regime_diferenciado: regimeDif,
            tipo_operacao: tipoOperacao,
            destino_operacao: destinoOperacao,
            sujeito_imposto_seletivo: sujeitoIS,
            aliquota_is: parseNumBR(aliquotaIS),
            aliquota_ipi: parseNumBR(aliquotaIpi),
            aliquota_pis: parseNumBR(aliquotaPis),
            aliquota_cofins: parseNumBR(aliquotaCofins),
            aliquota_icms: parseNumBR(aliquotaIcms),
          },
        ],
        servicos: [],
        creditos: creditos
          .filter((c) => parseNumBR(c.valor_mensal) > 0)
          .map((c) => ({
            fornecedor: c.fornecedor || "Fornecedor",
            descricao: null,
            ncm: null,
            valor_mensal: parseNumBR(c.valor_mensal),
            regime_diferenciado_fornecedor: c.regime_diferenciado_fornecedor,
            aliquota_ipi: parseNumBR(c.aliquota_ipi),
            aliquota_pis: parseNumBR(c.aliquota_pis),
            aliquota_cofins: parseNumBR(c.aliquota_cofins),
            aliquota_icms: parseNumBR(c.aliquota_icms),
          })),
        escopo_reforma: escopoReforma,
        anos_selecionados: anosSelecionados.length > 0 ? anosSelecionados : undefined,
      };

      const res = executarSimulacao(input);
      setResultado(res);
      setSimulacaoInput(input);
      setSimulacaoSalvaId(null);
      toast.success("Simulação do produto concluída!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao simular produto");
    } finally {
      setLoading(false);
    }
  };

  const salvarSimulacao = async () => {
    if (!resultado || !auth.user || !linkedEmpresa.empresaId || !simulacaoInput) return;
    setSaving(true);
    try {
      const nome = `Produto NCM ${ncm}${descricao ? ` — ${descricao}` : ""} — ${new Date().toLocaleDateString("pt-BR")}`;
      const parametros = {
        ...simulacaoInput,
        tipo: "produto_ncm",
        produto: { ncm, descricao, valor_mensal: parseNumBR(valorMensal) },
      };
      const { data, error } = await supabase.from("simulacoes").insert({
        nome,
        empresa_id: linkedEmpresa.empresaId,
        user_id: auth.user.id,
        ano_inicio: anosSelecionados[0] ?? 2026,
        ano_fim: anosSelecionados[anosSelecionados.length - 1] ?? 2033,
        parametros: parametros as unknown as Json,
        resultados: resultado as unknown as Json,
      }).select("id").single();
      if (error) throw error;
      setSimulacaoSalvaId(data.id);
      toast.success("Simulação salva no histórico da empresa!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar simulação");
    } finally {
      setSaving(false);
    }
  };

  const apenasCbs = escopoReforma === "somente_cbs";
  const insumosMensaisBruto = creditos.reduce((acc, c) => acc + parseNumBR(c.valor_mensal), 0);

  const pdfContexto: RelatorioContexto | undefined = resultado
    ? {
        tipo: "produto",
        ncm,
        descricao: descricao || `Produto NCM ${ncm}`,
        regime: regimeTrib,
        valor_mensal: parseNumBR(valorMensal),
        
        aliquotas_atuais: {
          pis: parseNumBR(aliquotaPis),
          cofins: parseNumBR(aliquotaCofins),
          ipi: parseNumBR(aliquotaIpi),
          icms: parseNumBR(aliquotaIcms),
        },
        insumos_anuais: insumosMensaisBruto * 12,
      }
    : undefined;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Parâmetros do produto
          </CardTitle>
          <CardDescription>
            Configure um produto isolado e rode a mesma simulação do motor geral, ano a ano, para visualizar o impacto da reforma.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Identificação */}
          <div className="space-y-3 border rounded-lg p-4">
            <h3 className="text-sm font-semibold">Identificação do produto</h3>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2">
                <Label>NCM *</Label>
                <Input value={ncm} onChange={(e) => setNcm(e.target.value)} placeholder="Ex.: 85171231" />
              </div>
              <div className="space-y-2 xl:col-span-2">
                <Label>Descrição</Label>
                <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex.: Smartphone" />
              </div>
              <div className="space-y-2">
                <Label>Regime diferenciado</Label>
                <Select value={regimeDif} onValueChange={(v) => setRegimeDif(v as RegimeDiferenciado)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {regimeOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo de operação</Label>
                <Select value={tipoOperacao} onValueChange={setTipoOperacao}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="revenda">Revenda</SelectItem>
                    <SelectItem value="industrializacao">Industrialização</SelectItem>
                    <SelectItem value="importacao">Importação</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Destino</Label>
                <Select value={destinoOperacao} onValueChange={setDestinoOperacao}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mercado_interno">Mercado interno</SelectItem>
                    <SelectItem value="exportacao">Exportação</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Alíquota do IS (%)</Label>
                <Input
                  value={aliquotaIS}
                  onChange={(e) => setAliquotaIS(e.target.value)}
                  inputMode="decimal"
                  disabled={!sujeitoIS}
                />
              </div>
              <div className="flex items-end xl:col-span-2">
                <label className="flex items-center gap-3 text-sm">
                  <Checkbox checked={sujeitoIS} onCheckedChange={(c) => setSujeitoIS(Boolean(c))} />
                  Produto sujeito ao Imposto Seletivo
                </label>
              </div>
            </div>
          </div>

          {/* Valores e alíquotas atuais */}
          <div className="space-y-3 border rounded-lg p-4">
            <h3 className="text-sm font-semibold">Valores e alíquotas atuais</h3>
            <p className="text-xs text-muted-foreground">
              Informe o valor de venda <strong>sem IPI</strong>. Quando houver IPI, ele será calculado “por fora” e somado ao preço final.
            </p>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div className="space-y-2 md:col-span-2">
                <Label>Valor atual de venda do produto (R$) *</Label>
                <CurrencyInput value={valorMensal} onValueChange={setValorMensal} />
              </div>
              <div />
              <div className="space-y-2">
                <Label>PIS (%)</Label>
                <Input value={aliquotaPis} onChange={(e) => setAliquotaPis(e.target.value)} inputMode="decimal" />
              </div>
              <div className="space-y-2">
                <Label>COFINS (%)</Label>
                <Input value={aliquotaCofins} onChange={(e) => setAliquotaCofins(e.target.value)} inputMode="decimal" />
              </div>
              <div className="space-y-2">
                <Label>IPI (%)</Label>
                <Input value={aliquotaIpi} onChange={(e) => setAliquotaIpi(e.target.value)} inputMode="decimal" />
              </div>
              <div className="space-y-2">
                <Label>ICMS (%)</Label>
                <Input value={aliquotaIcms} onChange={(e) => setAliquotaIcms(e.target.value)} inputMode="decimal" />
              </div>
            </div>
          </div>

          {/* Regime tributário aplicável ao produto */}
          <div className="space-y-3 border rounded-lg p-4">
            <h3 className="text-sm font-semibold">Regime tributário aplicável ao produto</h3>
            <p className="text-xs text-muted-foreground">
              Define como os tributos atuais incidem sobre este item (DAS no Simples; PIS/COFINS/IPI/ICMS nos demais).
              Para Simples Nacional, a alíquota DAS é estimada considerando o item isolado (valor mensal × 12).
            </p>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div className="space-y-2">
                <Label>Regime</Label>
                <Select value={regimeTrib} onValueChange={(v) => setRegimeTrib(v as RegimeTrib)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="simples_nacional">Simples Nacional</SelectItem>
                    <SelectItem value="lucro_presumido">Lucro Presumido</SelectItem>
                    <SelectItem value="lucro_real">Lucro Real</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2 flex items-end">
                <p className="text-xs text-muted-foreground">
                  Receita anual considerada: <strong>{formatCurrency(parseNumBR(valorMensal) * 12)}</strong> (12× valor mensal do item).
                </p>
              </div>
            </div>
          </div>

          {/* Aquisições que geram crédito */}
          <div className="space-y-3 border rounded-lg p-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-semibold">Aquisições que geram crédito</h3>
                <p className="text-xs text-muted-foreground">
                  Insumos / mercadorias compradas para obter este produto. Geram crédito de ICMS, PIS/COFINS, IPI (regime atual) e CBS/IBS (regime novo, conforme o regime do fornecedor).
                </p>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={addCredito}>
                <Plus className="h-4 w-4 mr-1" /> Adicionar aquisição
              </Button>
            </div>

            {creditos.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Nenhuma aquisição informada — créditos serão considerados zero.</p>
            ) : (
              <div className="space-y-3">
                {creditos.map((c) => (
                  <div key={c.id} className="grid gap-2 md:grid-cols-12 items-end border rounded-md p-3 bg-muted/20">
                    <div className="md:col-span-3 space-y-1">
                      <Label className="text-xs">Fornecedor</Label>
                      <Input value={c.fornecedor} onChange={(e) => updateCredito(c.id, { fornecedor: e.target.value })} placeholder="Fornecedor X" />
                    </div>
                    <div className="md:col-span-2 space-y-1">
                      <Label className="text-xs">Valor mensal (R$)</Label>
                      <CurrencyInput value={c.valor_mensal} onValueChange={(v) => updateCredito(c.id, { valor_mensal: v })} />
                    </div>
                    <div className="md:col-span-2 space-y-1">
                      <Label className="text-xs">Regime fornecedor</Label>
                      <Select
                        value={c.regime_diferenciado_fornecedor}
                        onValueChange={(v) => updateCredito(c.id, { regime_diferenciado_fornecedor: v as RegimeDiferenciado })}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="padrao">Padrão (100%)</SelectItem>
                          <SelectItem value="reducao_30">Redução 30%</SelectItem>
                          <SelectItem value="reducao_60">Redução 60%</SelectItem>
                          <SelectItem value="aliquota_zero">Alíquota zero</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="md:col-span-1 space-y-1">
                      <Label className="text-xs">ICMS %</Label>
                      <Input inputMode="decimal" value={c.aliquota_icms} onChange={(e) => updateCredito(c.id, { aliquota_icms: e.target.value })} />
                    </div>
                    <div className="md:col-span-1 space-y-1">
                      <Label className="text-xs">PIS %</Label>
                      <Input inputMode="decimal" value={c.aliquota_pis} onChange={(e) => updateCredito(c.id, { aliquota_pis: e.target.value })} />
                    </div>
                    <div className="md:col-span-1 space-y-1">
                      <Label className="text-xs">COFINS %</Label>
                      <Input inputMode="decimal" value={c.aliquota_cofins} onChange={(e) => updateCredito(c.id, { aliquota_cofins: e.target.value })} />
                    </div>
                    <div className="md:col-span-1 space-y-1">
                      <Label className="text-xs">IPI %</Label>
                      <Input inputMode="decimal" value={c.aliquota_ipi} onChange={(e) => updateCredito(c.id, { aliquota_ipi: e.target.value })} />
                    </div>
                    <div className="md:col-span-1 flex justify-end">
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeCredito(c.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cenário da reforma */}
          <div className="space-y-3 border rounded-lg p-4">
            <h3 className="text-sm font-semibold">Escopo da reforma</h3>
            <RadioGroup
              value={escopoReforma}
              onValueChange={(v) => setEscopoReforma(v as EscopoReforma)}
              className="flex flex-col gap-2 sm:flex-row sm:gap-6"
            >
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <RadioGroupItem value="cbs_ibs" id="prod-esc-cbs-ibs" />
                CBS + IBS (padrão)
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <RadioGroupItem value="somente_cbs" id="prod-esc-cbs" />
                Somente CBS (federal)
              </label>
            </RadioGroup>
          </div>

          <div className="space-y-3 border rounded-lg p-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-sm font-semibold">Anos a simular</h3>
              <div className="flex gap-1 flex-wrap">
                <Button type="button" variant="default" size="sm" onClick={() => setAnosSelecionados([2027, 2028])}>Foco 2027–2028</Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setAnosSelecionados(ANOS_CRONOGRAMA)}>Todos</Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setAnosSelecionados([2033])}>Pleno (2033)</Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setAnosSelecionados([])}>Limpar</Button>
              </div>

            </div>
            <div className="flex flex-wrap gap-3">
              {ANOS_CRONOGRAMA.map((ano) => {
                const checked = anosSelecionados.includes(ano);
                return (
                  <label key={ano} className="flex items-center gap-2 text-sm cursor-pointer border rounded-md px-3 py-1.5 hover:bg-muted/50">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(v) => {
                        setAnosSelecionados((prev) =>
                          v ? [...prev, ano].sort((a, b) => a - b) : prev.filter((a) => a !== ano)
                        );
                      }}
                    />
                    {ano}
                  </label>
                );
              })}
            </div>
            {anosSelecionados.length === 0 && (
              <p className="text-xs text-destructive">Selecione pelo menos um ano para habilitar a simulação.</p>
            )}
          </div>

          <div className="flex justify-end">
            <Button
              onClick={simular}
              disabled={!ncm.trim() || !valorMensal || anosSelecionados.length === 0 || loading}
            >
              <Calculator className="h-4 w-4 mr-1" />
              {loading ? "Calculando…" : "Simular produto"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {resultado && (
        <>
          <SimulacaoProdutoResultado
            resultado={resultado}
            valorMensalProduto={parseNumBR(valorMensal)}
            insumosMensaisBruto={insumosMensaisBruto}
            aliquotaIpiAtual={parseNumBR(aliquotaIpi)}
          />

          <details className="group rounded-lg border bg-muted/20">
            <summary className="cursor-pointer list-none px-4 py-3 flex items-center justify-between hover:bg-muted/40 transition-colors">
              <div>
                <h3 className="text-sm font-semibold">Visão anual consolidada (referência)</h3>
                <p className="text-xs text-muted-foreground">
                  Totais anuais do item, gráficos por tributo e ações de salvar/PDF.
                </p>
              </div>
              <span className="text-xs text-muted-foreground group-open:hidden">Expandir ▾</span>
              <span className="text-xs text-muted-foreground hidden group-open:inline">Recolher ▴</span>
            </summary>
            <div className="p-4 pt-2">
              <SimulacaoResultado
                resultado={resultado}
                escopoSomenteCbs={apenasCbs}
                pdfContexto={pdfContexto}
                onSalvar={linkedEmpresa.empresaId ? salvarSimulacao : undefined}
                salvando={saving}
                salvado={!!simulacaoSalvaId}
              />
              {!linkedEmpresa.empresaId && (
                <p className="text-xs text-muted-foreground text-right mt-2">
                  Vincule uma empresa para salvar esta simulação no histórico.
                </p>
              )}
            </div>
          </details>
        </>
      )}
    </div>
  );
}
