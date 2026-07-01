/**
 * Engine de Análise Comparativa de Cenários Tributários (2027)
 *
 * Adaptador que expõe a API histórica (`CompetenciaFiscalRow` / `CenarioMes` /
 * `AnaliseComparativaResultado`) mas usa por baixo o motor de alta fidelidade
 * de `@/lib/reforma`:
 *   - Alíquota efetiva do DAS via faixas reais dos Anexos I–V (`getFaixa`,
 *     `calcularAliquotaEfetiva`).
 *   - Fração PIS/COFINS embutida no DAS extraída da partilha CGSN 140/2018
 *     (`decomporDAS`) — não mais uma proxy estática.
 *   - Parâmetros de reforma (CBS/IBS) alinhados a `PARAMETROS_PADRAO`.
 *
 * Cenários projetados por competência:
 *  A) Simples Nacional Atual (dentro do DAS)
 *  B) Simples Nacional Híbrido 2027 (DAS reduzido + CBS/IBS por fora sobre
 *     receita B2B, com crédito recebido nas aquisições Regime Normal)
 *  C) Lucro Presumido 2026 (atual)
 *  D) Lucro Presumido 2027 (PIS/COFINS extintos; CBS/IBS com créditos)
 */

import {
  getFaixa,
  calcularAliquotaEfetiva,
  decomporDAS,
  PARAMETROS_PADRAO,
  type AnexoSN,
} from "./reforma";

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

// ─── Parâmetros LP (Comércio) — mantidos para preservar semântica da UI ────
const LP_PRESUNCAO_COMERCIO = 0.08;
const LP_IRPJ = 0.15;
const LP_IRPJ_ADICIONAL = 0.10; // sobre parcela da base > 20k/mês (240k/ano)
const LP_IRPJ_LIMITE_MENSAL = 20_000;
const LP_CSLL = 0.09;
const LP_PIS = 0.0065;
const LP_COFINS = 0.03;
const LP_ICMS_EFETIVO = 0.18;
export const CBS_2027_DEFAULT = PARAMETROS_PADRAO.aliquota_cbs_referencia; // 8,8%
export const IBS_2027_DEFAULT = PARAMETROS_PADRAO.aliquota_ibs_2027_2028; // 0,1%
const INSS_PATRONAL =
  0.20 + PARAMETROS_PADRAO.percentual_rat + PARAMETROS_PADRAO.percentual_terceiros;

export interface AnaliseComparativaOpts {
  /** Alíquota CBS de referência para 2027 (default 8,8%). */
  cbsRate?: number;
  /** Alíquota IBS de referência para 2027 (default 0,1%). */
  ibsRate?: number;
  /** Anexo do Simples Nacional (default "I" — Comércio). */
  anexo?: AnexoSN;
  /**
   * Quando true, projeta 12 meses a partir da média dos meses informados
   * (mantendo as competências reais e completando o restante até 12).
   */
  projetar12Meses?: boolean;
}

function mediaProjetada(rows: CompetenciaFiscalRow[]): CompetenciaFiscalRow[] {
  if (rows.length === 0 || rows.length >= 12) return rows;
  const n = rows.length;
  const num = (k: keyof CompetenciaFiscalRow) =>
    rows.reduce((s, r) => s + (Number(r[k] ?? 0) || 0), 0) / n;

  const media: Omit<CompetenciaFiscalRow, "competencia"> = {
    receita_bruta: num("receita_bruta"),
    receita_clientes_regime_normal: num("receita_clientes_regime_normal"),
    receita_clientes_outros: num("receita_clientes_outros"),
    aquisicoes_totais: num("aquisicoes_totais"),
    aquisicoes_fornecedores_regime_normal: num("aquisicoes_fornecedores_regime_normal"),
    aquisicoes_fornecedores_simples: num("aquisicoes_fornecedores_simples"),
    folha_empregados: num("folha_empregados"),
    inss_empregados: num("inss_empregados"),
    inss_contribuinte_individual: num("inss_contribuinte_individual"),
    irpj_apurado: num("irpj_apurado"),
    csll_apurado: num("csll_apurado"),
    pis_apurado: num("pis_apurado"),
    cofins_apurado: num("cofins_apurado"),
    icms_apurado: num("icms_apurado"),
    iss_apurado: num("iss_apurado"),
    ipi_apurado: num("ipi_apurado"),
    das_total: num("das_total"),
  };

  const ultima = [...rows]
    .sort((a, b) => a.competencia.localeCompare(b.competencia))
    .at(-1)!;
  const [yStr, mStr] = ultima.competencia.split("-");
  let y = Number(yStr);
  let m = Number(mStr);
  const out = [...rows];
  while (out.length < 12) {
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
    const comp = `${y}-${String(m).padStart(2, "0")}-01`;
    out.push({ ...media, competencia: comp });
  }
  return out;
}

export function calcularAnaliseComparativa(
  rows: CompetenciaFiscalRow[],
  opts: AnaliseComparativaOpts = {},
): AnaliseComparativaResultado {
  const cbsRate = opts.cbsRate ?? CBS_2027_DEFAULT;
  const ibsRate = opts.ibsRate ?? IBS_2027_DEFAULT;
  const anexo: AnexoSN = opts.anexo ?? "I";
  const totalReforma = cbsRate + ibsRate;

  const reais = [...rows].sort((a, b) => a.competencia.localeCompare(b.competencia));
  const ordenadas = opts.projetar12Meses ? mediaProjetada(reais) : reais;

  // RBT12 real (soma dos meses informados normalizada para 12) — dita a faixa do DAS.
  const receitaAnualizada =
    ordenadas.reduce((s, r) => s + (r.receita_bruta || 0), 0) *
    (12 / Math.max(1, ordenadas.length));

  // Faixa + alíquota efetiva do DAS (Anexos I–V reais).
  const faixa = getFaixa(anexo, receitaAnualizada);
  const aliqEfetivaDAS = calcularAliquotaEfetiva(
    receitaAnualizada,
    faixa.aliquota,
    faixa.deducao,
  );

  // Decompõe o DAS anualizado para extrair a fração PIS+COFINS (proxy da CBS por dentro).
  const compAnual = decomporDAS(anexo, faixa, aliqEfetivaDAS, receitaAnualizada);
  const dasAnual = compAnual.das ?? 0;
  const cbsFracaoDentroDAS =
    dasAnual > 0 ? ((compAnual.pis ?? 0) + (compAnual.cofins ?? 0)) / dasAnual : 0;

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

    // A) SN Atual — DAS = receita_mes × alíquota efetiva (RBT12).
    const das = r.das_total ?? receita * aliqEfetivaDAS;
    const sn_atual_total = das + inss;

    // B) SN Híbrido 2027 — retira PIS/COFINS do DAS e recolhe CBS/IBS por fora
    //    apenas sobre a parcela B2B (clientes Regime Normal), com crédito de
    //    aquisições Regime Normal.
    const das_reduzido = das * (1 - cbsFracaoDentroDAS);
    const cbs_debito = receita * mixB2B * totalReforma;
    const credito_recebido = aquisicoesRN * totalReforma;
    const cbs_liquido_pagar = Math.max(0, cbs_debito - credito_recebido);
    const sn_hibrido_total = das_reduzido + cbs_liquido_pagar + inss;

    // C) Lucro Presumido 2026
    const lp_pis_cofins = receita * (LP_PIS + LP_COFINS);
    const icms_pago =
      r.icms_apurado ??
      Math.max(0, receita * LP_ICMS_EFETIVO - aquisicoesRN * LP_ICMS_EFETIVO);
    const base_presumida = receita * LP_PRESUNCAO_COMERCIO;
    const irpj_base = base_presumida * LP_IRPJ;
    const irpj_adicional =
      Math.max(0, base_presumida - LP_IRPJ_LIMITE_MENSAL) * LP_IRPJ_ADICIONAL;
    const csll_devida = base_presumida * LP_CSLL;
    const lp_irpj_csll = irpj_base + irpj_adicional + csll_devida;
    const lp_inss = folha * INSS_PATRONAL;
    const lp_2026_total = lp_pis_cofins + icms_pago + lp_irpj_csll + lp_inss;

    // D) Lucro Presumido 2027 — PIS/COFINS extintos; CBS/IBS com crédito.
    const cbs_2027_debito = receita * totalReforma;
    const cbs_2027_credito = aquisicoesRN * totalReforma;
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

  const opcoes2027 = [
    { k: "sn_atual" as const, v: totais.sn_atual },
    { k: "sn_hibrido" as const, v: totais.sn_hibrido },
    { k: "lp_2027" as const, v: totais.lp_2027 },
  ].sort((a, b) => a.v - b.v);

  const melhor = opcoes2027[0].k;

  const alertas: string[] = [];
  if (ordenadas.some((r) => r.receita_clientes_regime_normal == null)) {
    alertas.push(
      "Mix B2B/B2C não informado em algumas competências — assumido 50% como padrão.",
    );
  }
  if (receitaAnualizada > 4_800_000) {
    alertas.push(
      "RBT12 projetado acima de R$ 4.800.000 — cliente desenquadrado do Simples Nacional.",
    );
  } else if (receitaAnualizada > 3_600_000) {
    alertas.push(
      "RBT12 projetado acima do sublimite de R$ 3.600.000 — ICMS/ISS devem ser recolhidos fora do DAS.",
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
