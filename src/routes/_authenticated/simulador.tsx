import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/AuthContext";
import { useLinkedEmpresa } from "@/hooks/useLinkedEmpresa";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { SimulacaoResultado } from "@/components/SimulacaoResultado";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  executarSimulacao,
  ALIQUOTA_CBS_REF,
  ALIQUOTA_IBS_REF,
  ALIQUOTA_TOTAL_REF,
  CRONOGRAMA_TRANSICAO,
  FATOR_REGIME,
  type SimulacaoInput,
  type ResultadoSimulacao,
  type ProdutoInput,
  type ServicoInput,
  type CreditoInput,
  type EmpresaInput,
  type RegimeDiferenciado,
  type EscopoReforma,
  type IrpjCsllConfig,
} from "@/lib/tax-engine";
import { AlertTriangle, TrendingDown, TrendingUp, Info, Calculator, BookOpen, Package, Briefcase, Receipt, ExternalLink, Save, FileText } from "lucide-react";
import { toast } from "sonner";
import { Json } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/simulador")({
  head: () => ({
    meta: [
      { title: "Simulador Tributário — Reforma Tributária" },
      { name: "description", content: "Simule cenários da reforma tributária para sua empresa." },
    ],
  }),
  component: SimuladorPage,
});

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatPct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

const regimeLabels: Record<string, string> = {
  padrao: "Padrão (100%)",
  reducao_30: "Redução 30% (70%)",
  reducao_60: "Redução 60% (40%)",
  aliquota_zero: "Alíquota Zero",
  imune: "Imune",
};

const regimeTributarioLabels: Record<string, string> = {
  simples_nacional: "Simples Nacional",
  lucro_presumido: "Lucro Presumido",
  lucro_real: "Lucro Real",
};

interface EmpresaResumo {
  razao_social: string;
  regime_tributario: string;
  faturamento_anual: number;
  uf: string | null;
  optante_simples_mei: boolean;
  totalProdutos: number;
  totalServicos: number;
  totalCreditos: number;
  faturamentoProdutos: number;
  faturamentoServicos: number;
  valorCreditos: number;
}

function SimuladorPage() {
  const auth = useAuth();
  const linkedEmpresa = useLinkedEmpresa();
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [empresaId, setEmpresaId] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [resultado, setResultado] = useState<ResultadoSimulacao | null>(null);
  const [simulacaoInput, setSimulacaoInput] = useState<SimulacaoInput | null>(null);
  const [simulacaoSalvaId, setSimulacaoSalvaId] = useState<string | null>(null);
  const [resumoEmpresa, setResumoEmpresa] = useState<EmpresaResumo | null>(null);

  // Novos parâmetros de cenário
  const ANOS_CRONOGRAMA = CRONOGRAMA_TRANSICAO.map((t) => t.ano);
  const [escopoReforma, setEscopoReforma] = useState<EscopoReforma>("cbs_ibs");
  const [anosSelecionados, setAnosSelecionados] = useState<number[]>(ANOS_CRONOGRAMA);
  const [irpjCsll, setIrpjCsll] = useState<IrpjCsllConfig>({
    incluir: false,
    presuncao_comercio: 8,
    presuncao_servicos: 32,
    lucro_real_anual: 0,
  });

  useEffect(() => {
    supabase.from("empresas").select("id, razao_social, cnpj").order("razao_social").then(({ data }) => {
      const empresasDisponiveis = auth.hasRole("cliente") && linkedEmpresa.empresaId
        ? (data || []).filter((empresa) => empresa.id === linkedEmpresa.empresaId)
        : (data || []);

      setEmpresas(empresasDisponiveis);

      if (auth.hasRole("cliente") && linkedEmpresa.empresaId) {
        setEmpresaId(linkedEmpresa.empresaId);
      }
    });
  }, [auth, linkedEmpresa.empresaId]);

  // Buscar resumo quando empresa é selecionada
  useEffect(() => {
    if (!empresaId) {
      setResumoEmpresa(null);
      return;
    }
    (async () => {
      const [{ data: empresa }, { data: produtos }, { data: servicos }, { data: creditos }] = await Promise.all([
        supabase.from("empresas").select("*").eq("id", empresaId).single(),
        supabase.from("produtos").select("id, valor_mensal").eq("empresa_id", empresaId),
        supabase.from("servicos").select("id, valor_mensal").eq("empresa_id", empresaId),
        supabase.from("creditos_aquisicao").select("id, valor_mensal").eq("empresa_id", empresaId),
      ]);
      if (empresa) {
        setResumoEmpresa({
          razao_social: empresa.razao_social,
          regime_tributario: empresa.regime_tributario,
          faturamento_anual: Number(empresa.faturamento_anual) || 0,
          uf: empresa.uf,
          optante_simples_mei: empresa.optante_simples_mei || false,
          totalProdutos: produtos?.length || 0,
          totalServicos: servicos?.length || 0,
          totalCreditos: creditos?.length || 0,
          faturamentoProdutos: (produtos || []).reduce((s, p) => s + (Number(p.valor_mensal) || 0), 0),
          faturamentoServicos: (servicos || []).reduce((s, p) => s + (Number(p.valor_mensal) || 0), 0),
          valorCreditos: (creditos || []).reduce((s, p) => s + (Number(p.valor_mensal) || 0), 0),
        });
      }
    })();
  }, [empresaId]);

  const simular = async () => {
    if (!empresaId) return;
    setLoading(true);

    try {
      const [{ data: empresa }, { data: produtos }, { data: servicos }, { data: creditos }] = await Promise.all([
        supabase.from("empresas").select("*").eq("id", empresaId).single(),
        supabase.from("produtos").select("*").eq("empresa_id", empresaId),
        supabase.from("servicos").select("*").eq("empresa_id", empresaId),
        supabase.from("creditos_aquisicao").select("*").eq("empresa_id", empresaId),
      ]);

      if (!empresa) {
        toast.error("Empresa não encontrada");
        return;
      }

      const empresaInput: EmpresaInput = {
        razao_social: empresa.razao_social,
        cnpj: empresa.cnpj,
        regime_tributario: empresa.regime_tributario as EmpresaInput["regime_tributario"],
        uf: empresa.uf,
        municipio: empresa.municipio,
        faturamento_anual: Number(empresa.faturamento_anual) || 0,
        optante_simples_mei: empresa.optante_simples_mei || false,
        irpj_csll: irpjCsll,
      };

      const produtosInput: ProdutoInput[] = (produtos || []).map((p: any) => ({
        descricao: p.descricao,
        ncm: p.ncm,
        valor_mensal: Number(p.valor_mensal) || 0,
        quantidade_mensal: Number(p.quantidade_mensal) || 0,
        regime_diferenciado: (p.regime_diferenciado || "padrao") as RegimeDiferenciado,
        tipo_operacao: p.tipo_operacao || "revenda",
        destino_operacao: p.destino_operacao || "mercado_interno",
        sujeito_imposto_seletivo: p.sujeito_imposto_seletivo || false,
        aliquota_is: Number(p.aliquota_is) || 0,
        aliquota_ipi: Number(p.aliquota_ipi) || 0,
        aliquota_pis: Number(p.aliquota_pis) || 0,
        aliquota_cofins: Number(p.aliquota_cofins) || 0,
        aliquota_icms: Number(p.aliquota_icms) || 0,
      }));

      const servicosInput: ServicoInput[] = (servicos || []).map((s: any) => ({
        descricao: s.descricao,
        codigo_servico: s.codigo_servico,
        valor_mensal: Number(s.valor_mensal) || 0,
        regime_diferenciado: (s.regime_diferenciado || "padrao") as RegimeDiferenciado,
        tipo_servico: s.tipo_servico || "",
        aliquota_iss: Number(s.aliquota_iss) || 0,
        aliquota_pis: Number(s.aliquota_pis) || 0,
        aliquota_cofins: Number(s.aliquota_cofins) || 0,
      }));

      const creditosInput: CreditoInput[] = (creditos || []).map((c: any) => ({
        fornecedor: c.fornecedor,
        descricao: c.descricao,
        ncm: c.ncm,
        valor_mensal: Number(c.valor_mensal) || 0,
        regime_diferenciado_fornecedor: (c.regime_diferenciado_fornecedor || "padrao") as RegimeDiferenciado,
        aliquota_ipi: Number(c.aliquota_ipi) || 0,
        aliquota_pis: Number(c.aliquota_pis) || 0,
        aliquota_cofins: Number(c.aliquota_cofins) || 0,
        aliquota_icms: Number(c.aliquota_icms) || 0,
      }));

      const input: SimulacaoInput = {
        empresa: empresaInput,
        produtos: produtosInput,
        servicos: servicosInput,
        creditos: creditosInput,
        escopo_reforma: escopoReforma,
        anos_selecionados: anosSelecionados.length > 0 ? anosSelecionados : undefined,
      };

      const res = executarSimulacao(input);
      setResultado(res);
      setSimulacaoInput(input);
      setSimulacaoSalvaId(null);

      if (produtosInput.length === 0 && servicosInput.length === 0) {
        toast.warning("Nenhum produto ou serviço cadastrado. Cadastre os dados na página da empresa para uma simulação precisa.");
      } else {
        toast.success("Simulação concluída!");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao executar simulação");
    } finally {
      setLoading(false);
    }
  };

  const salvarSimulacao = async () => {
    if (!resultado || !auth.user || !empresaId || !simulacaoInput) return;
    setSaving(true);
    try {
      const nome = `Simulação ${resultado.empresa} — ${new Date().toLocaleDateString("pt-BR")}`;
      const { data, error } = await supabase.from("simulacoes").insert({
        nome,
        empresa_id: empresaId,
        user_id: auth.user.id,
        ano_inicio: 2026,
        ano_fim: 2033,
        parametros: simulacaoInput as unknown as Json,
        resultados: resultado as unknown as Json,
      }).select("id").single();

      if (error) throw error;
      setSimulacaoSalvaId(data.id);
      toast.success("Simulação salva com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar simulação");
    } finally {
      setSaving(false);
    }
  };

  const gerarRelatorio = async () => {
    if (!resultado) return;
    setGeneratingPdf(true);
    try {
      const { gerarRelatorioPDF } = await import("@/lib/relatorio-pdf");
      await gerarRelatorioPDF(resultado);
      toast.success("Relatório PDF gerado com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar relatório");
    } finally {
      setGeneratingPdf(false);
    }
  };

  const dadosGrafico = resultado?.anos.map((a) => ({
    ano: a.ano,
    "DAS": Math.round(a.tributos_atuais_bruto.das),
    "PIS/COFINS": Math.round(a.tributos_atuais_bruto.pis + a.tributos_atuais_bruto.cofins),
    "IPI": Math.round(a.tributos_atuais_bruto.ipi),
    "ICMS": Math.round(a.tributos_atuais_bruto.icms),
    "ISS": Math.round(a.tributos_atuais_bruto.iss),
    "IRPJ": Math.round(a.tributos_atuais_bruto.irpj),
    "CSLL": Math.round(a.tributos_atuais_bruto.csll),
    "CBS": Math.round(a.ibs_cbs_bruto.cbs),
    "IBS": Math.round(a.ibs_cbs_bruto.ibs),
    "IS": Math.round(a.ibs_cbs_bruto.is),
  })) || [];

  const incluiIrpjCsll = !!resultado?.anos.some(
    (a) => a.tributos_atuais_bruto.irpj > 0 || a.tributos_atuais_bruto.csll > 0
  );
  const apenasCbs = escopoReforma === "somente_cbs";


  const dadosCargaLiquida = resultado?.anos.map((a) => ({
    ano: a.ano,
    "Carga Atual": Math.round(a.carga_atual_liquida),
    "Carga IBS/CBS": Math.round(a.carga_nova_liquida),
    "Total": Math.round(a.carga_total),
    "Variação (%)": Number(a.variacao_pct.toFixed(1)),
  })) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Simulador Tributário</h1>
        <p className="text-muted-foreground mt-1">
          Motor de cálculo baseado na LC 214/2025, EC 132/2023 e LCP 227
        </p>
      </div>

      {/* ─── Parâmetros Base do Motor de Cálculo ──────────────── */}
      <Accordion type="single" collapsible defaultValue="parametros">
        <AccordionItem value="parametros">
          <AccordionTrigger className="text-base font-semibold">
            <span className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Parâmetros Base do Motor de Cálculo
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid gap-4 md:grid-cols-3 pt-2">
              {/* Alíquotas de Referência */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Alíquotas de Referência (LC 214/2025)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">CBS (federal)</span>
                    <Badge variant="secondary" className="tabular-nums">{formatPct(ALIQUOTA_CBS_REF)}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">IBS (estadual/municipal)</span>
                    <Badge variant="secondary" className="tabular-nums">{formatPct(ALIQUOTA_IBS_REF)}</Badge>
                  </div>
                  <div className="flex justify-between items-center border-t pt-2">
                    <span className="text-sm font-medium">Total Referência</span>
                    <Badge className="tabular-nums">{formatPct(ALIQUOTA_TOTAL_REF)}</Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Regimes Diferenciados */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Regimes Diferenciados</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {(Object.entries(FATOR_REGIME) as [RegimeDiferenciado, number][]).map(([regime, fator]) => (
                    <div key={regime} className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">{regimeLabels[regime]}</span>
                      <Badge variant="outline" className="tabular-nums">
                        {fator === 0 ? "0%" : `${(ALIQUOTA_TOTAL_REF * fator * 100).toFixed(1)}%`}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Cronograma de Transição */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Cronograma de Transição (EC 132/2023)</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="h-8 text-xs px-1">Ano</TableHead>
                        <TableHead className="h-8 text-xs px-1">CBS</TableHead>
                        <TableHead className="h-8 text-xs px-1">IBS</TableHead>
                        <TableHead className="h-8 text-xs px-1">PIS/COFINS</TableHead>
                        <TableHead className="h-8 text-xs px-1">ICMS/ISS</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {CRONOGRAMA_TRANSICAO.map((t) => (
                        <TableRow key={t.ano}>
                          <TableCell className="py-1 px-1 text-xs font-medium">{t.ano}</TableCell>
                          <TableCell className="py-1 px-1 text-xs tabular-nums">
                            {t.cbs_teste ? "0,9% (teste)" : formatPct(t.cbs_pct)}
                          </TableCell>
                          <TableCell className="py-1 px-1 text-xs tabular-nums">
                            {t.ibs_teste ? "0,1% (teste)" : formatPct(t.ibs_pct)}
                          </TableCell>
                          <TableCell className="py-1 px-1 text-xs tabular-nums">
                            {t.pis_cofins_fator === 0 ? "Extinto" : formatPct(t.pis_cofins_fator)}
                          </TableCell>
                          <TableCell className="py-1 px-1 text-xs tabular-nums">
                            {t.icms_iss_fator === 0 ? "Extinto" : formatPct(t.icms_iss_fator)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
            <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
              <Info className="h-3 w-3" />
              Valores fixos conforme legislação vigente. Não editáveis.
            </p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* ─── Seleção de empresa ──────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Parâmetros da Simulação
          </CardTitle>
          <CardDescription>
            {auth.hasRole("cliente")
              ? "Simulação da sua empresa vinculada com base nos cadastros já existentes"
              : "Selecione a empresa com produtos, serviços e créditos cadastrados"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end gap-4">
            <div className="space-y-2 flex-1 max-w-sm">
              <Label>Empresa</Label>
              {auth.hasRole("cliente") ? (
                <div className="flex h-10 items-center rounded-md border bg-muted/40 px-3 text-sm text-foreground">
                  {empresas[0]?.razao_social || "Empresa vinculada"}
                </div>
              ) : (
                <Select value={empresaId} onValueChange={setEmpresaId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    {empresas.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.razao_social}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <Button onClick={simular} disabled={!empresaId || loading || anosSelecionados.length === 0}>
              {loading ? "Calculando…" : "Simular"}
            </Button>
          </div>

          {/* Resumo dos dados cadastrados da empresa */}
          {resumoEmpresa && (
            <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Dados Base da Empresa</h3>
                <Link to="/empresas/$empresaId" params={{ empresaId }}>
                  <Button variant="outline" size="sm">
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Editar Dados
                  </Button>
                </Link>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <span className="text-xs text-muted-foreground">Regime</span>
                  <p className="text-sm font-medium">{regimeTributarioLabels[resumoEmpresa.regime_tributario] || resumoEmpresa.regime_tributario}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Faturamento Anual</span>
                  <p className="text-sm font-medium tabular-nums">{formatBRL(resumoEmpresa.faturamento_anual)}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">UF</span>
                  <p className="text-sm font-medium">{resumoEmpresa.uf || "—"}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Simples/MEI</span>
                  <p className="text-sm font-medium">{resumoEmpresa.optante_simples_mei ? "Sim" : "Não"}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 border-t pt-3">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{resumoEmpresa.totalProdutos} produto(s)</p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {formatBRL(resumoEmpresa.faturamentoProdutos)}/mês
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{resumoEmpresa.totalServicos} serviço(s)</p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {formatBRL(resumoEmpresa.faturamentoServicos)}/mês
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{resumoEmpresa.totalCreditos} crédito(s)</p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {formatBRL(resumoEmpresa.valorCreditos)}/mês
                    </p>
                  </div>
                </div>
              </div>

              {(resumoEmpresa.totalProdutos === 0 && resumoEmpresa.totalServicos === 0) && (
                <div className="flex items-center gap-2 rounded-md border border-warning/30 bg-warning/10 p-2 text-warning-foreground">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <p className="text-xs">
                    Nenhum produto ou serviço cadastrado. <Link to="/empresas/$empresaId" params={{ empresaId }} className="underline font-medium">Cadastre os dados</Link> para obter uma simulação precisa.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ─── Cenário: Escopo da Reforma ─── */}
          <div className="border rounded-lg p-4 space-y-3">
            <h3 className="text-sm font-semibold">Escopo da Reforma</h3>
            <RadioGroup
              value={escopoReforma}
              onValueChange={(v) => setEscopoReforma(v as EscopoReforma)}
              className="flex flex-col gap-2 sm:flex-row sm:gap-6"
            >
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <RadioGroupItem value="cbs_ibs" id="esc-cbs-ibs" />
                CBS + IBS (padrão)
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <RadioGroupItem value="somente_cbs" id="esc-cbs" />
                Somente CBS (federal)
              </label>
            </RadioGroup>
            <p className="text-xs text-muted-foreground">
              Use "Somente CBS" para isolar o impacto federal da reforma, removendo o IBS dos cálculos.
            </p>
          </div>

          {/* ─── Cenário: IRPJ/CSLL na carga atual ─── */}
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">Tributação sobre o lucro (IRPJ/CSLL)</h3>
                <p className="text-xs text-muted-foreground">
                  Inclua IRPJ e CSLL para visualizar a tributação federal total na carga atual.
                </p>
              </div>
              <Switch
                checked={irpjCsll.incluir}
                disabled={resumoEmpresa?.regime_tributario === "simples_nacional"}
                onCheckedChange={(v) => setIrpjCsll((s) => ({ ...s, incluir: v }))}
              />
            </div>

            {resumoEmpresa?.regime_tributario === "simples_nacional" && (
              <p className="text-xs text-warning-foreground bg-warning/10 border border-warning/30 rounded-md p-2">
                IRPJ e CSLL já estão incluídos no DAS do Simples Nacional — opção indisponível.
              </p>
            )}

            {irpjCsll.incluir && resumoEmpresa?.regime_tributario === "lucro_presumido" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Presunção comércio (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={irpjCsll.presuncao_comercio ?? 8}
                    onChange={(e) =>
                      setIrpjCsll((s) => ({ ...s, presuncao_comercio: Number(e.target.value) }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Presunção serviços (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={irpjCsll.presuncao_servicos ?? 32}
                    onChange={(e) =>
                      setIrpjCsll((s) => ({ ...s, presuncao_servicos: Number(e.target.value) }))
                    }
                  />
                </div>
              </div>
            )}

            {irpjCsll.incluir && resumoEmpresa?.regime_tributario === "lucro_real" && (
              <div className="space-y-1 max-w-sm">
                <Label className="text-xs">Lucro tributável anual estimado (R$)</Label>
                <Input
                  type="number"
                  step="1000"
                  value={irpjCsll.lucro_real_anual ?? 0}
                  onChange={(e) =>
                    setIrpjCsll((s) => ({ ...s, lucro_real_anual: Number(e.target.value) }))
                  }
                />
              </div>
            )}
          </div>

          {/* ─── Cenário: Anos a simular ─── */}
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-sm font-semibold">Anos a simular</h3>
              <div className="flex gap-1 flex-wrap">
                <Button type="button" variant="outline" size="sm" onClick={() => setAnosSelecionados(ANOS_CRONOGRAMA)}>
                  Todos
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setAnosSelecionados([2026, 2027, 2028])}>
                  Transição (2026–2028)
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setAnosSelecionados([2033])}>
                  Pleno (2033)
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setAnosSelecionados([])}>
                  Limpar
                </Button>
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
        </CardContent>
      </Card>

      {resultado && (
        <SimulacaoResultado
          resultado={resultado}
          escopoSomenteCbs={apenasCbs}
          onSalvar={salvarSimulacao}
          salvando={saving}
          salvado={!!simulacaoSalvaId}
        />
      )}
    </div>
  );
}
