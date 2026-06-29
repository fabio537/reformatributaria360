/**
 * Engine de Análise Comparativa de Cenários Tributários
 *
 * A partir de agregados mensais (tabela `competencias_fiscais`) projeta os 4
 * cenários típicos discutidos na transição 2026/2027:
 *  - A) Simples Nacional Atual (regime vigente, sem reforma)
 *  - B) Simples Nacional Híbrido 2027 (dentro do DAS + débito de CBS/IBS para
 *       clientes Regime Normal, com crédito recebido na entrada)
 *  - C) Lucro Presumido 2026 (sai do Simples, atual)
 *  - D) Lucro Presumido 2027 (PIS/COFINS extintos; CBS 8,7% + IBS líquido 0;
 *       ICMS mantido; com créditos de aquisições)
 *
 * Premissas de transição alinhadas ao `tax-engine.ts`:
 *  - 2027: CBS 8,7% líquido; IBS 0,1% débito = 0,1% crédito ⇒ líquido 0.
 *  - PIS/COFINS extintos em 2027; ICMS mantido integralmente.
 *  - Empresa do Simples NÃO se credita de insumos no cenário "dentro do DAS"
 *    mas, no híbrido, gera crédito para o cliente limitado à fração PIS+COFINS
 *    embutida no DAS (proxy da CBS — ver `cbsFracaoDAS`).
 */

import {
  ALIQUOTA_CBS_REF,
  CBS_REDUCAO_TRANSICAO_PP,
  cbsFracaoDAS,
} from "./tax-engine";

// Composição média do DAS Anexo I (Comércio) — mesma do tax-engine
const DAS_ANEXO_I_COMPOSICAO = {
  pis: 0.0276,
  cofins: 0.1274,
  ipi: 0,
  icms_iss: 0.34,
  outros: 0.505,
};

export interface CompetenciaFiscalRow {
  competencia: string; // YYYY-MM-DD
  receita_bruta: number;
  receita_clientes_regime_normal?: number | null;
  receita_clientes_outros?: number | null;
  aquisicoes_totais?: number | null;
  aquisicoes_fornecedores_regime_normal?: number | null;
  aquisicoes_fornecedores_simples?: number | null;
  folha_empregados?: number | null;
  inss_empregados?: number | null;
  inss_contribuinte_individual?: number | null;
  irpj_apurado?: number | null;
  csll_apurado?: number | null;
  pis_apurado?: number | null;
  cofins_apurado?: number | null;
  icms_apurado?: number | null;
  iss_apurado?: number | null;
  ipi_apurado?: number | null;
  das_total?: number | null;
}

export interface CenarioMes {
  competencia: string;
  receita_bruta: number;

  // Cenário A — Simples Nacional Atual
  sn_atual_total: number;
  sn_atual_das: number;
  sn_atual_inss: number;

  // Cenário B — Simples Híbrido 2027
  sn_hibrido_total: number;
  sn_hibrido_das_reduzido: number;
  sn_hibrido_cbs_debito: number;
  sn_hibrido_credito_recebido: number;
  sn_hibrido_inss: number;

  // Cenário C — Lucro Presumido 2026 (atual)
  lp_2026_total: number;
  lp_2026_pis_cofins: number;
  lp_2026_icms: number;
  lp_2026_irpj_csll: number;
  lp_2026_inss: number;

  // Cenário D — Lucro Presumido 2027
  lp_2027_total: number;
  lp_2027_cbs: number;
  lp_2027_icms: number;
  lp_2027_irpj_csll: number;
  lp_2027_inss: number;
}

export interface AnaliseComparativaResultado {
  meses: CenarioMes[];
  totais: {
    receita_bruta: number;
    sn_atual: number;
    sn_hibrido: number;
    lp_2026: number;
    lp_2027: number;
  };
  carga_efetiva: {
    sn_atual: number;
    sn_hibrido: number;
    lp_2026: number;
    lp_2027: number;
  };
  melhor_cenario_2027: "sn_atual" | "sn_hibrido" | "lp_2027";
  recomendacao: string;
  alertas: string[];
}

// ─── Parâmetros (Lucro Presumido — Comércio) ───────────────────────────────
const LP_PRESUNCAO_COMERCIO = 0.08; // 8%
const LP_IRPJ = 0.15;
const LP_CSLL = 0.09;
const LP_PIS = 0.0065;
const LP_COFINS = 0.03;
const LP_ICMS_EFETIVO = 0.18; // padrão; aproximação — ajuste futuro por UF
export const CBS_2027_DEFAULT = ALIQUOTA_CBS_REF - CBS_REDUCAO_TRANSICAO_PP; // 8,7%
export const IBS_2027_DEFAULT = 0; // 0,1% débito = 0,1% crédito ⇒ líquido 0
const INSS_PATRONAL = 0.20; // patronal sobre folha (aproximação simplificada)

export interface AnaliseComparativaOpts {
  /** Alíquota CBS líquida usada em 2027 (default 8,7%). */
  cbsRate?: number;
  /** Alíquota IBS líquida em 2027 (default 0%, pois débito = crédito). */
  ibsRate?: number;
  /**
   * Quando true, projeta 12 meses a partir da média dos meses informados
   * (mantendo as competências reais e completando o restante até 12).
   */
  projetar12Meses?: boolean;
}


function aliquotaEfetivaDASMensal(rbt12: number): number {
  if (rbt12 <= 0) return 0;
  const tabela = [
    { limite: 180000, aliq: 0.04, ded: 0 },
    { limite: 360000, aliq: 0.073, ded: 5940 },
    { limite: 720000, aliq: 0.095, ded: 13860 },
    { limite: 1800000, aliq: 0.107, ded: 22500 },
    { limite: 3600000, aliq: 0.143, ded: 87300 },
    { limite: 4800000, aliq: 0.19, ded: 378000 },
  ];
  const f = tabela.find((x) => rbt12 <= x.limite) ?? tabela[tabela.length - 1];
  return (rbt12 * f.aliq - f.ded) / rbt12;
}

export function calcularAnaliseComparativa(
  rows: CompetenciaFiscalRow[],
): AnaliseComparativaResultado {
  const ordenadas = [...rows].sort((a, b) => a.competencia.localeCompare(b.competencia));
  const receitaAnualizada =
    ordenadas.reduce((s, r) => s + (r.receita_bruta || 0), 0) * (12 / Math.max(1, ordenadas.length));

  const aliqDAS = aliquotaEfetivaDASMensal(receitaAnualizada);
  const cbsFracao = cbsFracaoDAS(DAS_ANEXO_I_COMPOSICAO);

  const meses: CenarioMes[] = ordenadas.map((r) => {
    const receita = r.receita_bruta || 0;
    const mixB2B =
      receita > 0 && r.receita_clientes_regime_normal != null
        ? (r.receita_clientes_regime_normal || 0) / receita
        : 0.5;
    const aquisicoesRN = r.aquisicoes_fornecedores_regime_normal || 0;
    const folha = r.folha_empregados || 0;
    const inssBase = (r.inss_empregados || 0) + (r.inss_contribuinte_individual || 0);
    const inss = inssBase > 0 ? inssBase : folha * INSS_PATRONAL;

    // A) SN Atual
    const das = r.das_total ?? receita * aliqDAS;
    const sn_atual_total = das + inss;

    // B) SN Híbrido 2027
    // DAS reduzido: tira PIS+COFINS (≈ cbsFracao da fração do DAS).
    const das_reduzido = das * (1 - cbsFracao);
    // CBS débito apenas sobre receita de clientes Regime Normal (B2B precisa de crédito).
    const cbs_debito = receita * mixB2B * CBS_2027;
    // Crédito recebido na entrada: aquisições de fornecedores Regime Normal × CBS_2027
    const credito_recebido = aquisicoesRN * CBS_2027;
    const cbs_liquido_pagar = Math.max(0, cbs_debito - credito_recebido);
    const sn_hibrido_total = das_reduzido + cbs_liquido_pagar + inss;

    // C) Lucro Presumido 2026 (atual)
    const lp_pis_cofins = receita * (LP_PIS + LP_COFINS);
    const icms_pago = r.icms_apurado ?? Math.max(0, receita * LP_ICMS_EFETIVO - aquisicoesRN * LP_ICMS_EFETIVO);
    const base_presumida = receita * LP_PRESUNCAO_COMERCIO;
    const lp_irpj_csll = base_presumida * (LP_IRPJ + LP_CSLL);
    const lp_inss = folha * INSS_PATRONAL;
    const lp_2026_total = lp_pis_cofins + icms_pago + lp_irpj_csll + lp_inss;

    // D) Lucro Presumido 2027 — PIS/COFINS extintos; CBS 8,7% líquida; ICMS mantido.
    const cbs_2027_debito = receita * CBS_2027;
    const cbs_2027_credito = aquisicoesRN * CBS_2027;
    const cbs_2027_liquida = Math.max(0, cbs_2027_debito - cbs_2027_credito);
    const lp_2027_total = cbs_2027_liquida + icms_pago + lp_irpj_csll + lp_inss;

    return {
      competencia: r.competencia,
      receita_bruta: receita,
      sn_atual_total,
      sn_atual_das: das,
      sn_atual_inss: inss,
      sn_hibrido_total,
      sn_hibrido_das_reduzido: das_reduzido,
      sn_hibrido_cbs_debito: cbs_debito,
      sn_hibrido_credito_recebido: credito_recebido,
      sn_hibrido_inss: inss,
      lp_2026_total,
      lp_2026_pis_cofins: lp_pis_cofins,
      lp_2026_icms: icms_pago,
      lp_2026_irpj_csll: lp_irpj_csll,
      lp_2026_inss: lp_inss,
      lp_2027_total,
      lp_2027_cbs: cbs_2027_liquida,
      lp_2027_icms: icms_pago,
      lp_2027_irpj_csll: lp_irpj_csll,
      lp_2027_inss: lp_inss,
    };
  });

  const totais = meses.reduce(
    (acc, m) => ({
      receita_bruta: acc.receita_bruta + m.receita_bruta,
      sn_atual: acc.sn_atual + m.sn_atual_total,
      sn_hibrido: acc.sn_hibrido + m.sn_hibrido_total,
      lp_2026: acc.lp_2026 + m.lp_2026_total,
      lp_2027: acc.lp_2027 + m.lp_2027_total,
    }),
    { receita_bruta: 0, sn_atual: 0, sn_hibrido: 0, lp_2026: 0, lp_2027: 0 },
  );

  const carga_efetiva = {
    sn_atual: totais.receita_bruta > 0 ? totais.sn_atual / totais.receita_bruta : 0,
    sn_hibrido: totais.receita_bruta > 0 ? totais.sn_hibrido / totais.receita_bruta : 0,
    lp_2026: totais.receita_bruta > 0 ? totais.lp_2026 / totais.receita_bruta : 0,
    lp_2027: totais.receita_bruta > 0 ? totais.lp_2027 / totais.receita_bruta : 0,
  };

  // Decisão: melhor cenário em 2027 entre SN Atual, SN Híbrido e LP 2027
  const opcoes2027 = [
    { k: "sn_atual" as const, v: totais.sn_atual },
    { k: "sn_hibrido" as const, v: totais.sn_hibrido },
    { k: "lp_2027" as const, v: totais.lp_2027 },
  ].sort((a, b) => a.v - b.v);

  const melhor = opcoes2027[0].k;

  const alertas: string[] = [];
  if (ordenadas.length < 6) {
    alertas.push(
      `Amostra de ${ordenadas.length} mês(es). Recomenda-se 6+ competências para projeção anual confiável.`,
    );
  }
  if (ordenadas.some((r) => r.receita_clientes_regime_normal == null)) {
    alertas.push(
      "Mix B2B/B2C não informado em algumas competências — assumido 50% como padrão.",
    );
  }

  const fmt = (n: number) => (n * 100).toFixed(2) + "%";
  const ganhoSNHib = totais.sn_atual - totais.sn_hibrido;
  const recomendacao =
    melhor === "sn_atual"
      ? `Manter Simples Nacional Atual permanece o mais econômico em 2027 (carga ${fmt(
          carga_efetiva.sn_atual,
        )}).`
      : melhor === "sn_hibrido"
        ? `Aderir ao Simples Híbrido 2027 reduz a carga em R$ ${ganhoSNHib.toFixed(
            2,
          )} no período (carga ${fmt(carga_efetiva.sn_hibrido)}). Indicado para mix B2B elevado.`
        : `Migrar para Lucro Presumido em 2027 é o cenário mais econômico (carga ${fmt(
            carga_efetiva.lp_2027,
          )}). Avaliar impacto operacional da mudança de regime.`;

  return {
    meses,
    totais,
    carga_efetiva,
    melhor_cenario_2027: melhor,
    recomendacao,
    alertas,
  };
}
