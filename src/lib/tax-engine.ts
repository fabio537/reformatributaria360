/**
 * Motor de Cálculo Tributário — Reforma Tributária
 *
 * Baseado em:
 * - EC 132/2023 (Emenda Constitucional da Reforma Tributária)
 * - LC 214/2025 (Lei Complementar do IBS/CBS), com destaque para arts. 344 e 347
 * - LC 227/2026 (Comitê Gestor do IBS — CGIBS, atualiza a LC 214/2025)
 *
 * Alíquotas de referência conforme LC 214/2025:
 * - CBS (Contribuição sobre Bens e Serviços – federal): 8,8%
 * - IBS (Imposto sobre Bens e Serviços – estadual/municipal): 17,7%
 * - Total referência: 26,5%
 *
 * Regra de transição 2027–2028 (LC 214/2025, arts. 344 e 347):
 * - CBS = alíquota de referência REDUZIDA em 0,1 ponto percentual (8,7%).
 * - IBS = 0,1% com arrecadação efetiva (0,05% estadual + 0,05% municipal),
 *   com direito a crédito pleno (não-cumulatividade).
 */

import { verificarNcmZfm } from "./ncm-zfm";

// ─── Alíquotas de Referência (LC 214/2025, Art. 9º) ───────────────────────

export const ALIQUOTA_CBS_REF = 0.088; // 8,8%
export const ALIQUOTA_IBS_REF = 0.177; // 17,7%
export const ALIQUOTA_TOTAL_REF = ALIQUOTA_CBS_REF + ALIQUOTA_IBS_REF; // 26,5%

/**
 * Redução de transição da CBS em 2027 e 2028 (LC 214/2025, art. 344).
 * A CBS desses dois anos corresponde à alíquota de referência reduzida
 * em 0,1 ponto percentual (8,7% em vez de 8,8%).
 */
export const CBS_REDUCAO_TRANSICAO_PP = 0.001;

/**
 * IBS de transição em 2027 e 2028 (LC 214/2025, art. 347): 0,1% efetivos
 * (0,05% estadual + 0,05% municipal), com não-cumulatividade plena.
 */
export const IBS_TRANSICAO_2027_2028 = 0.001;

// ─── Regimes Diferenciados (LC 214/2025, Arts. 257 a 312) ──────────────────

export type RegimeDiferenciado = "padrao" | "reducao_30" | "reducao_60" | "aliquota_zero" | "imune";

/** Fator multiplicador para cada regime diferenciado */
export const FATOR_REGIME: Record<RegimeDiferenciado, number> = {
  padrao: 1.0,
  reducao_30: 0.7,   // Redução de 30% — educação, saúde, dispositivos médicos, etc.
  reducao_60: 0.4,    // Redução de 60% — alimentos, higiene, agropecuários, etc.
  aliquota_zero: 0.0, // Alíquota zero — cesta básica nacional, etc.
  imune: 0.0,         // Imunidades constitucionais
};

// ─── Tabela DAS — Simples Nacional (LC 123/2006, Anexos I a V) ─────────────
// Faixas de faturamento com alíquota nominal e parcela a deduzir

interface FaixaDAS {
  limite: number;       // Limite superior de RBT12
  aliquota: number;     // Alíquota nominal
  deducao: number;      // Parcela a deduzir
}

// Anexo I — Comércio
const DAS_ANEXO_I: FaixaDAS[] = [
  { limite: 180000, aliquota: 0.04, deducao: 0 },
  { limite: 360000, aliquota: 0.073, deducao: 5940 },
  { limite: 720000, aliquota: 0.095, deducao: 13860 },
  { limite: 1800000, aliquota: 0.107, deducao: 22500 },
  { limite: 3600000, aliquota: 0.143, deducao: 87300 },
  { limite: 4800000, aliquota: 0.19, deducao: 378000 },
];

// Anexo III — Serviços (maioria)
const DAS_ANEXO_III: FaixaDAS[] = [
  { limite: 180000, aliquota: 0.06, deducao: 0 },
  { limite: 360000, aliquota: 0.112, deducao: 9360 },
  { limite: 720000, aliquota: 0.135, deducao: 17640 },
  { limite: 1800000, aliquota: 0.16, deducao: 35640 },
  { limite: 3600000, aliquota: 0.21, deducao: 125640 },
  { limite: 4800000, aliquota: 0.33, deducao: 648000 },
];

// ─── Composição interna do DAS (LC 123/2006, Anexos I e III) ───────────────
// Percentuais médios de cada tributo dentro da alíquota total do anexo.
// Anexo I (Comércio): IRPJ 5,5% | CSLL 3,5% | COFINS 12,74% | PIS 2,76% | CPP 41,5% | ICMS 34,0%
// Anexo III (Serviços): IRPJ 4,0% | CSLL 3,5% | COFINS 12,82% | PIS 2,78% | CPP 43,4% | ISS 33,5%
// Esses percentuais são aplicados sobre a alíquota efetiva apurada por faixa.

interface ComposicaoDAS {
  pis: number;
  cofins: number;
  icms_iss: number; // ICMS no Anexo I, ISS no Anexo III
  outros: number;   // IRPJ + CSLL + CPP (mantidos integralmente após 2027)
}

const COMPOSICAO_DAS_ANEXO_I: ComposicaoDAS = {
  pis: 0.0276,
  cofins: 0.1274,
  icms_iss: 0.34,
  outros: 0.055 + 0.035 + 0.415, // 0,505
};

const COMPOSICAO_DAS_ANEXO_III: ComposicaoDAS = {
  pis: 0.0278,
  cofins: 0.1282,
  icms_iss: 0.335,
  outros: 0.04 + 0.035 + 0.434, // 0,509
};

/**
 * Calcula a alíquota efetiva do DAS com base no faturamento (RBT12)
 */
function aliquotaEfetivaDAS(rbt12: number, anexo: FaixaDAS[]): number {
  if (rbt12 <= 0) return 0;
  const faixa = anexo.find(f => rbt12 <= f.limite) || anexo[anexo.length - 1];
  // Alíquota efetiva = (RBT12 × Alíquota Nominal - Parcela a Deduzir) / RBT12
  return (rbt12 * faixa.aliquota - faixa.deducao) / rbt12;
}

// ─── Cronograma de Transição (EC 132/2023 + LC 214/2025 arts. 344 e 347) ───
//
// 2026: TESTE — CBS 0,9% + IBS 0,1% (compensáveis com PIS/COFINS).
//        NÃO HÁ INCIDÊNCIA REAL. Tributos atuais mantidos integralmente.
//
// 2027 e 2028: início da arrecadação efetiva (LC 214/2025, arts. 344 e 347).
//        CBS = alíquota de referência REDUZIDA em 0,1 p.p. (~8,7%).
//        IBS = 0,1% efetivos (0,05% UF + 0,05% município), com crédito pleno.
//        PIS e COFINS EXTINTOS. IPI ZERADO (exceto ZFM). ICMS/ISS mantidos.
//        Imposto Seletivo (IS) instituído.
//
// 2029-2032: CBS 100%. IBS em transição (10%, 25%, 50%, 75%).
//        ICMS e ISS reduzidos proporcionalmente. IPI permanece zerado (exceto ZFM).
//
// 2033: IBS 100%. ICMS e ISS extintos. IPI zerado (exceto ZFM).

export interface TransicaoAno {
  ano: number;
  /** Percentual da CBS aplicado (0.009 = teste 0,9%; 1.0 = alíquota plena 8,8%) */
  cbs_pct: number;
  /** Se true, CBS é alíquota-teste fixa (não proporcional à alíquota de referência) */
  cbs_teste: boolean;
  /** Redução em pontos percentuais da CBS (0,001 em 2027–2028, LC 214/2025 art. 344) */
  cbs_reducao_pp: number;
  /** Percentual do IBS aplicado (0 a 1.0 da alíquota de referência 17,7%) */
  ibs_pct: number;
  /** Se true, IBS é alíquota-teste fixa */
  ibs_teste: boolean;
  /** Fator de manutenção de PIS/COFINS (1.0 = mantido; 0 = extinto) */
  pis_cofins_fator: number;
  /** Fator de manutenção de ICMS/ISS (1.0 = mantido; 0 = extinto) */
  icms_iss_fator: number;
  /** Fator de manutenção de IPI (1.0 = mantido; 0 = extinto). A partir de 2027 o IPI é zerado (exceto ZFM). */
  ipi_fator: number;
  /** Se true, as alíquotas-teste NÃO geram incidência real (são compensáveis com tributos atuais) */
  sem_incidencia_real: boolean;
}

// IBS 0,1% em 2027/2028 expresso como % da alíquota de referência
const IBS_PCT_TRANSICAO = IBS_TRANSICAO_2027_2028 / ALIQUOTA_IBS_REF; // ≈ 0,00565

export const CRONOGRAMA_TRANSICAO: TransicaoAno[] = [
  // 2026: Teste — CBS 0,9%, IBS 0,1%. Sem incidência real (compensáveis).
  {
    ano: 2026,
    cbs_pct: 0.009, cbs_teste: true, cbs_reducao_pp: 0,
    ibs_pct: 0.001, ibs_teste: true,
    pis_cofins_fator: 1.0,
    icms_iss_fator: 1.0,
    ipi_fator: 1.0,
    sem_incidencia_real: true,
  },
  // 2027: CBS = ref - 0,1 p.p. (~8,7%). IBS 0,1% efetivo com crédito pleno.
  {
    ano: 2027,
    cbs_pct: 1.0, cbs_teste: false, cbs_reducao_pp: CBS_REDUCAO_TRANSICAO_PP,
    ibs_pct: IBS_PCT_TRANSICAO, ibs_teste: false,
    pis_cofins_fator: 0.0,
    icms_iss_fator: 1.0,
    ipi_fator: 0.0,
    sem_incidencia_real: false,
  },
  // 2028: idem 2027.
  {
    ano: 2028,
    cbs_pct: 1.0, cbs_teste: false, cbs_reducao_pp: CBS_REDUCAO_TRANSICAO_PP,
    ibs_pct: IBS_PCT_TRANSICAO, ibs_teste: false,
    pis_cofins_fator: 0.0,
    icms_iss_fator: 1.0,
    ipi_fator: 0.0,
    sem_incidencia_real: false,
  },
  // 2029: CBS 100%. IBS 10%. ICMS/ISS reduzidos 10%. IPI zerado.
  {
    ano: 2029,
    cbs_pct: 1.0, cbs_teste: false, cbs_reducao_pp: 0,
    ibs_pct: 0.10, ibs_teste: false,
    pis_cofins_fator: 0.0,
    icms_iss_fator: 0.90,
    ipi_fator: 0.0,
    sem_incidencia_real: false,
  },
  // 2030: CBS 100%. IBS 25%. ICMS/ISS reduzidos 25%. IPI zerado.
  {
    ano: 2030,
    cbs_pct: 1.0, cbs_teste: false, cbs_reducao_pp: 0,
    ibs_pct: 0.25, ibs_teste: false,
    pis_cofins_fator: 0.0,
    icms_iss_fator: 0.75,
    ipi_fator: 0.0,
    sem_incidencia_real: false,
  },
  // 2031: CBS 100%. IBS 50%. ICMS/ISS reduzidos 50%. IPI zerado.
  {
    ano: 2031,
    cbs_pct: 1.0, cbs_teste: false, cbs_reducao_pp: 0,
    ibs_pct: 0.50, ibs_teste: false,
    pis_cofins_fator: 0.0,
    icms_iss_fator: 0.50,
    ipi_fator: 0.0,
    sem_incidencia_real: false,
  },
  // 2032: CBS 100%. IBS 75%. ICMS/ISS reduzidos 75%. IPI zerado.
  {
    ano: 2032,
    cbs_pct: 1.0, cbs_teste: false, cbs_reducao_pp: 0,
    ibs_pct: 0.75, ibs_teste: false,
    pis_cofins_fator: 0.0,
    icms_iss_fator: 0.25,
    ipi_fator: 0.0,
    sem_incidencia_real: false,
  },
  // 2033: IBS 100%. ICMS/ISS extintos. IPI zerado.
  {
    ano: 2033,
    cbs_pct: 1.0, cbs_teste: false, cbs_reducao_pp: 0,
    ibs_pct: 1.0, ibs_teste: false,
    pis_cofins_fator: 0.0,
    icms_iss_fator: 0.0,
    ipi_fator: 0.0,
    sem_incidencia_real: false,
  },
];

// ─── Tipos de Entrada ──────────────────────────────────────────────────────

export interface ProdutoInput {
  descricao: string;
  ncm: string;
  valor_mensal: number;
  quantidade_mensal: number;
  regime_diferenciado: RegimeDiferenciado;
  tipo_operacao: string;
  destino_operacao: string; // mercado_interno | exportacao
  sujeito_imposto_seletivo: boolean;
  aliquota_is: number;
  aliquota_ipi: number;
  aliquota_pis: number;
  aliquota_cofins: number;
  aliquota_icms: number;
}

export interface ServicoInput {
  descricao: string;
  codigo_servico: string;
  valor_mensal: number;
  regime_diferenciado: RegimeDiferenciado;
  tipo_servico: string;
  aliquota_iss: number;
  aliquota_pis: number;
  aliquota_cofins: number;
}

export interface CreditoInput {
  fornecedor: string;
  descricao: string | null;
  ncm: string | null;
  valor_mensal: number;
  regime_diferenciado_fornecedor: RegimeDiferenciado;
  aliquota_ipi: number;
  aliquota_pis: number;
  aliquota_cofins: number;
  aliquota_icms: number;
}

export interface IrpjCsllConfig {
  incluir: boolean;
  presuncao_comercio?: number; // % (Lucro Presumido) — default 8
  presuncao_servicos?: number; // % (Lucro Presumido) — default 32
  lucro_real_anual?: number;   // R$ (Lucro Real)
}

export interface EmpresaInput {
  razao_social: string;
  cnpj: string;
  regime_tributario: "simples_nacional" | "lucro_presumido" | "lucro_real";
  uf: string | null;
  municipio: string | null;
  faturamento_anual: number;
  optante_simples_mei: boolean;
  irpj_csll?: IrpjCsllConfig;
}

export type EscopoReforma = "cbs_ibs" | "somente_cbs";

export interface SimulacaoInput {
  empresa: EmpresaInput;
  produtos: ProdutoInput[];
  servicos: ServicoInput[];
  creditos: CreditoInput[];
  escopo_reforma?: EscopoReforma;
  anos_selecionados?: number[];
}

// ─── Tipos de Saída ────────────────────────────────────────────────────────

export interface DetalheTributoAtual {
  pis: number;
  cofins: number;
  ipi: number;
  icms: number;
  iss: number;
  das: number; // Para Simples Nacional
  irpj: number;
  csll: number;
  total: number;
}

export interface DetalheIbsCbs {
  cbs: number;
  ibs: number;
  is: number; // Imposto Seletivo
  total: number;
}

export interface CreditosDetalhe {
  creditos_atuais: number;
  creditos_ibs_cbs: number;
}

export interface ResultadoAno {
  ano: number;
  tributos_atuais_bruto: DetalheTributoAtual;
  ibs_cbs_bruto: DetalheIbsCbs;
  creditos: CreditosDetalhe;
  carga_atual_liquida: number;
  carga_nova_liquida: number;
  carga_total: number;
  variacao: number;
  variacao_pct: number;
  fase: string;
}

export interface ResultadoSimulacao {
  empresa: string;
  cnpj: string;
  regime_tributario: string;
  faturamento_anual: number;
  carga_atual_anual: number;
  carga_nova_anual: number;
  creditos_atuais_anual: number;
  creditos_novos_anual: number;
  anos: ResultadoAno[];
  alertas: string[];
}

export interface SimulacaoNcmInput {
  ncm: string;
  descricao?: string;
  valor: number;
  regime_diferenciado: RegimeDiferenciado;
  sujeito_imposto_seletivo?: boolean;
  aliquota_is?: number;
  aliquota_ipi_atual?: number;
  aliquota_pis_atual?: number;
  aliquota_cofins_atual?: number;
  aliquota_icms_atual?: number;
}

export interface SimulacaoNcmAno {
  ano: number;
  aliquota_cbs: number;
  aliquota_ibs: number;
  aliquota_total_nova: number;
  tributos_descontinuados: string[];
  tributos_mantidos: string[];
  observacao: string;
}

export interface ResultadoSimulacaoNcm {
  ncm: string;
  descricao: string;
  aliquota_cbs_estimada: number;
  aliquota_ibs_estimada: number;
  aliquota_total_estimada: number;
  valor_referencia: number;
  setor_zfm: string | null;
  cronograma: SimulacaoNcmAno[];
  alertas: string[];
}

// ─── Motor de Cálculo ──────────────────────────────────────────────────────

function aliquotaEfetiva(regime: RegimeDiferenciado): { cbs: number; ibs: number; total: number } {
  const fator = FATOR_REGIME[regime] ?? 1.0;
  return {
    cbs: ALIQUOTA_CBS_REF * fator,
    ibs: ALIQUOTA_IBS_REF * fator,
    total: ALIQUOTA_TOTAL_REF * fator,
  };
}

/**
 * Calcula tributos atuais mensais sobre produtos.
 * Para Simples Nacional, usa tabela DAS em vez de alíquotas individuais.
 * Retorna também a composição do DAS para tratamento da Reforma a partir de 2027.
 */
function calcularTributosAtuaisProdutos(
  produtos: ProdutoInput[],
  regime: string,
  faturamentoAnual: number,
): Omit<DetalheTributoAtual, "iss" | "total" | "irpj" | "csll"> & {
  faturamento: number;
  ipi_zfm: number;
  ipi_nao_zfm: number;
  das_pis: number;
  das_cofins: number;
  das_icms: number;
  das_outros: number;
} {
  let pis = 0, cofins = 0, ipi = 0, icms = 0, das = 0, faturamento = 0;
  let ipi_zfm = 0, ipi_nao_zfm = 0;
  let das_pis = 0, das_cofins = 0, das_icms = 0, das_outros = 0;

  for (const p of produtos) {
    faturamento += p.valor_mensal;
  }

  if (regime === "simples_nacional" && faturamentoAnual > 0) {
    const aliqEfetiva = aliquotaEfetivaDAS(faturamentoAnual, DAS_ANEXO_I);
    das = faturamento * aliqEfetiva;
    const c = COMPOSICAO_DAS_ANEXO_I;
    das_pis = das * c.pis;
    das_cofins = das * c.cofins;
    das_icms = das * c.icms_iss;
    das_outros = das * c.outros;
  } else {
    for (const p of produtos) {
      const v = p.valor_mensal;
      pis += v * (p.aliquota_pis / 100);
      cofins += v * (p.aliquota_cofins / 100);
      const ipiProduto = v * (p.aliquota_ipi / 100);
      ipi += ipiProduto;
      icms += v * (p.aliquota_icms / 100);

      // Separar IPI por ZFM: produtos com NCM de ZFM mantêm IPI após 2027
      const { isZfm } = verificarNcmZfm(p.ncm);
      if (isZfm) {
        ipi_zfm += ipiProduto;
      } else {
        ipi_nao_zfm += ipiProduto;
      }
    }
  }

  return { pis, cofins, ipi, icms, das, faturamento, ipi_zfm, ipi_nao_zfm, das_pis, das_cofins, das_icms, das_outros };
}

/**
 * Calcula tributos atuais mensais sobre serviços
 */
function calcularTributosAtuaisServicos(
  servicos: ServicoInput[],
  regime: string,
  faturamentoAnual: number,
): {
  pis: number;
  cofins: number;
  iss: number;
  das: number;
  faturamento: number;
  das_pis: number;
  das_cofins: number;
  das_iss: number;
  das_outros: number;
} {
  let pis = 0, cofins = 0, iss = 0, das = 0, faturamento = 0;
  let das_pis = 0, das_cofins = 0, das_iss = 0, das_outros = 0;

  for (const s of servicos) {
    faturamento += s.valor_mensal;
  }

  if (regime === "simples_nacional" && faturamentoAnual > 0) {
    const aliqEfetiva = aliquotaEfetivaDAS(faturamentoAnual, DAS_ANEXO_III);
    das = faturamento * aliqEfetiva;
    const c = COMPOSICAO_DAS_ANEXO_III;
    das_pis = das * c.pis;
    das_cofins = das * c.cofins;
    das_iss = das * c.icms_iss;
    das_outros = das * c.outros;
  } else {
    for (const s of servicos) {
      const v = s.valor_mensal;
      pis += v * (s.aliquota_pis / 100);
      cofins += v * (s.aliquota_cofins / 100);
      iss += v * (s.aliquota_iss / 100);
    }
  }

  return { pis, cofins, iss, das, faturamento, das_pis, das_cofins, das_iss, das_outros };
}

/**
 * Calcula tributos IBS/CBS mensais sobre produtos.
 * Exportações são imunes de IBS/CBS (mas mantêm créditos).
 * Inclui Imposto Seletivo (IS) quando aplicável.
 */
function calcularIbsCbsProdutos(produtos: ProdutoInput[]): { cbs: number; ibs: number; is: number } {
  let cbs = 0, ibs = 0, is = 0;
  for (const p of produtos) {
    if (p.destino_operacao === "exportacao") continue;

    const aliq = aliquotaEfetiva(p.regime_diferenciado as RegimeDiferenciado);
    cbs += p.valor_mensal * aliq.cbs;
    ibs += p.valor_mensal * aliq.ibs;

    if (p.sujeito_imposto_seletivo && p.aliquota_is > 0) {
      is += p.valor_mensal * (p.aliquota_is / 100);
    }
  }
  return { cbs, ibs, is };
}

/**
 * Calcula tributos IBS/CBS mensais sobre serviços
 */
function calcularIbsCbsServicos(servicos: ServicoInput[]): { cbs: number; ibs: number } {
  let cbs = 0, ibs = 0;
  for (const s of servicos) {
    const aliq = aliquotaEfetiva(s.regime_diferenciado as RegimeDiferenciado);
    cbs += s.valor_mensal * aliq.cbs;
    ibs += s.valor_mensal * aliq.ibs;
  }
  return { cbs, ibs };
}

/**
 * Calcula créditos de aquisição.
 * 
 * Sistema atual: depende do regime tributário da empresa.
 * - Lucro Real: crédito integral de PIS/COFINS/ICMS/IPI (não-cumulativo)
 * - Lucro Presumido: crédito parcial de ICMS apenas (cumulativo para PIS/COFINS)
 * - Simples Nacional: sem créditos
 * 
 * Sistema novo (IBS/CBS): crédito com base no imposto efetivamente pago pelo
 * FORNECEDOR na etapa anterior (não-cumulatividade plena, LC 214/2025, Art. 28-46).
 */
function calcularCreditos(
  creditos: CreditoInput[],
  regime: string,
): {
  atuais_mensal_pis_cofins: number;
  atuais_mensal_icms: number;
  atuais_mensal_ipi: number;
  novos_mensal_cbs: number;
  novos_mensal_ibs: number;
} {
  let atuais_pis_cofins = 0;
  let atuais_icms = 0;
  let atuais_ipi = 0;
  let novos_cbs = 0;
  let novos_ibs = 0;

  for (const c of creditos) {
    const v = c.valor_mensal;

    // Créditos no sistema atual
    if (regime === "lucro_real") {
      atuais_pis_cofins += v * ((c.aliquota_pis + c.aliquota_cofins) / 100);
      atuais_icms += v * (c.aliquota_icms / 100);
      atuais_ipi += v * (c.aliquota_ipi / 100);
    } else if (regime === "lucro_presumido") {
      // Lucro presumido: PIS/COFINS cumulativo (sem crédito). ICMS parcial.
      atuais_icms += v * ((c.aliquota_icms * 0.5) / 100);
    }
    // Simples Nacional: sem créditos no sistema atual

    // No novo sistema: crédito com base no regime do FORNECEDOR
    const aliqFornecedor = aliquotaEfetiva(
      (c.regime_diferenciado_fornecedor || "padrao") as RegimeDiferenciado
    );
    novos_cbs += v * aliqFornecedor.cbs;
    novos_ibs += v * aliqFornecedor.ibs;
  }

  return {
    atuais_mensal_pis_cofins: atuais_pis_cofins,
    atuais_mensal_icms: atuais_icms,
    atuais_mensal_ipi: atuais_ipi,
    novos_mensal_cbs: novos_cbs,
    novos_mensal_ibs: novos_ibs,
  };
}

/**
 * Gera alertas baseados na situação da empresa
 */
function gerarAlertas(input: SimulacaoInput): string[] {
  const alertas: string[] = [];
  const { empresa, produtos, servicos, creditos } = input;

  // Validação de faturamento
  const fatMensalCadastrado = produtos.reduce((s, p) => s + p.valor_mensal, 0)
    + servicos.reduce((s, s2) => s + s2.valor_mensal, 0);
  const fatAnualCalculado = fatMensalCadastrado * 12;
  if (empresa.faturamento_anual > 0 && fatAnualCalculado > 0) {
    const diff = Math.abs(empresa.faturamento_anual - fatAnualCalculado) / empresa.faturamento_anual;
    if (diff > 0.1) {
      alertas.push(
        `⚠️ Divergência de faturamento: declarado ${formatarBRL(empresa.faturamento_anual)}/ano, ` +
        `mas soma de produtos+serviços = ${formatarBRL(fatAnualCalculado)}/ano (diferença de ${(diff * 100).toFixed(0)}%). ` +
        `Verifique os dados cadastrados.`
      );
    }
  }

  if (empresa.optante_simples_mei || empresa.regime_tributario === "simples_nacional") {
    alertas.push(
      "Empresa optante pelo Simples Nacional/MEI: até 2026 o DAS é mantido integralmente (tabela por faixa). " +
      "A partir de 2027, as parcelas de PIS e COFINS são EXCLUÍDAS do DAS e a empresa passa a recolher a CBS POR FORA, " +
      "à alíquota plena (8,8% × fator do regime), sobre o faturamento. ICMS/ISS continuam dentro do DAS (regime do Simples). " +
      "Opcionalmente, a empresa pode aderir ao regime regular do IBS/CBS para aproveitar créditos integrais."
    );
  }

  if (empresa.regime_tributario === "lucro_presumido") {
    alertas.push(
      "No Lucro Presumido, PIS/COFINS são cumulativos (sem créditos). No novo sistema IBS/CBS, " +
      "todos os créditos serão aproveitáveis (não-cumulatividade plena), o que pode gerar economia significativa."
    );
  }

  // Produtos com NCM da ZFM — IPI mantido após 2027
  const produtosZfm = produtos.filter(p => verificarNcmZfm(p.ncm).isZfm);
  if (produtosZfm.length > 0) {
    const setores = Array.from(new Set(produtosZfm.map(p => verificarNcmZfm(p.ncm).setor))).filter(Boolean);
    alertas.push(
      `🏭 ${produtosZfm.length} produto(s) com NCM de setor da Zona Franca de Manaus (${setores.join(", ")}). ` +
      `O IPI desses produtos é MANTIDO após 2027 para preservar a competitividade da ZFM (EC 132/2023, Art. 126, §3º).`
    );
  }

  const produtosNaoZfm = produtos.filter(p => !verificarNcmZfm(p.ncm).isZfm && p.aliquota_ipi > 0);
  if (produtosNaoZfm.length > 0) {
    alertas.push(
      `📋 ${produtosNaoZfm.length} produto(s) com IPI que será EXTINTO a partir de 2027 (NCM fora dos setores ZFM).`
    );
  }

  // Créditos com fornecedor em regime diferenciado
  const creditosDiferenciados = creditos.filter(c => c.regime_diferenciado_fornecedor !== "padrao");
  if (creditosDiferenciados.length > 0) {
    alertas.push(
      `${creditosDiferenciados.length} crédito(s) de fornecedores com regime diferenciado. ` +
      `O crédito de IBS/CBS é proporcional ao imposto efetivamente pago pelo fornecedor.`
    );
  }

  // Exportações
  const exportacoes = produtos.filter(p => p.destino_operacao === "exportacao");
  if (exportacoes.length > 0) {
    const valorExport = exportacoes.reduce((s, p) => s + p.valor_mensal, 0);
    alertas.push(
      `${exportacoes.length} produto(s) para exportação (${formatarBRL(valorExport * 12)}/ano): ` +
      `imunes de IBS/CBS, mas mantêm direito a créditos das aquisições (LC 214/2025, Art. 5º, §1º).`
    );
  }

  // Imposto Seletivo
  const comIS = produtos.filter(p => p.sujeito_imposto_seletivo);
  if (comIS.length > 0) {
    alertas.push(
      `${comIS.length} produto(s) sujeito(s) ao Imposto Seletivo (IS). ` +
      `O IS incide sobre bens prejudiciais à saúde/meio ambiente (tabaco, bebidas, veículos, etc.). ` +
      `Incide uma única vez, sobre o produtor/importador (EC 132/2023, Art. 153, VIII).`
    );
  }

  const temReducao60 = [...produtos, ...servicos].some(
    (item) => (item as any).regime_diferenciado === "reducao_60"
  );
  if (temReducao60) {
    alertas.push(
      "Itens com redução de 60% (alimentos, higiene, agropecuários, saúde): alíquota efetiva de ~10,6% (40% de 26,5%). " +
      "Referência: LC 214/2025, Arts. 257-276."
    );
  }

  const temAliquotaZero = [...produtos, ...servicos].some(
    (item) => (item as any).regime_diferenciado === "aliquota_zero"
  );
  if (temAliquotaZero) {
    alertas.push(
      "Itens com alíquota zero (cesta básica nacional, Art. 8º LC 214/2025): isentos de IBS/CBS, " +
      "mas mantêm direito integral a créditos das aquisições."
    );
  }

  if (produtos.some((p) => p.tipo_operacao === "importacao")) {
    alertas.push(
      "Produtos importados: IBS/CBS incide na importação, com direito a crédito integral para o importador."
    );
  }

  if (empresa.faturamento_anual > 0 && empresa.faturamento_anual <= 4800000 && !empresa.optante_simples_mei) {
    alertas.push(
      "Faturamento dentro do limite do Simples Nacional (R$ 4,8 milhões). Considere avaliar a opção pelo Simples."
    );
  }

  // Alerta sobre a transição
  alertas.push(
    "📅 Cronograma da transição: 2026 = teste sem incidência real (CBS 0,9% + IBS 0,1% compensáveis com PIS/COFINS); " +
    "2027 = CBS 100%, PIS/COFINS e IPI extintos; " +
    "2029-2032 = IBS progressivo (10%→75%), ICMS/ISS reduzidos; " +
    "2033 = sistema novo integral."
  );

  alertas.push(
    "⚠️ IPI: a partir de 2027 o IPI é reduzido a zero para todos os produtos, EXCETO aqueles com " +
    "incidência mantida para preservar a competitividade da Zona Franca de Manaus (EC 132/2023, Art. 126, §3º)."
  );

  return alertas;
}

function formatarBRL(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function faseTransicao(t: TransicaoAno): string {
  if (t.sem_incidencia_real) return "Teste sem incidência real (CBS 0,9% + IBS 0,1% compensáveis)";
  if (t.cbs_reducao_pp > 0) {
    return `CBS reduzida em ${(t.cbs_reducao_pp * 100).toFixed(1)} p.p. (~${((ALIQUOTA_CBS_REF - t.cbs_reducao_pp) * 100).toFixed(1)}%), IBS 0,1% efetivo com crédito pleno. IPI zerado (exceto ZFM).`;
  }
  if (t.ibs_pct < 1.0) return `Transição (IBS ${(t.ibs_pct * 100).toFixed(0)}%, ICMS/ISS ${(t.icms_iss_fator * 100).toFixed(0)}%)`;
  return "Sistema novo integral";
}

function nomeTributosMantidos(t: TransicaoAno, isZfm: boolean): { mantidos: string[]; descontinuados: string[] } {
  const mantidos: string[] = [];
  const descontinuados: string[] = [];

  if (t.pis_cofins_fator > 0) {
    mantidos.push("PIS", "COFINS");
  } else {
    descontinuados.push("PIS", "COFINS");
  }

  if (t.icms_iss_fator > 0) {
    mantidos.push("ICMS", "ISS");
  } else {
    descontinuados.push("ICMS", "ISS");
  }

  if (isZfm || t.ipi_fator > 0) {
    mantidos.push("IPI");
  } else {
    descontinuados.push("IPI");
  }

  return { mantidos, descontinuados };
}

export function simularAliquotaPorNcm(input: SimulacaoNcmInput): ResultadoSimulacaoNcm {
  const descricao = input.descricao?.trim() || "Produto informado";
  const valorReferencia = Math.max(0, input.valor || 0);
  const aliquotas = aliquotaEfetiva(input.regime_diferenciado);
  const { isZfm, setor } = verificarNcmZfm(input.ncm);
  const alertas: string[] = [];

  if (input.ncm.replace(/\D/g, "").length < 8) {
    alertas.push("NCM informado com menos de 8 dígitos. O enquadramento é indicativo e pode exigir validação manual.");
  }

  if (input.regime_diferenciado !== "padrao") {
    alertas.push("A alíquota estimada considera o regime diferenciado selecionado para o produto.");
  }

  if (isZfm) {
    alertas.push(`O NCM informado se enquadra em setor com preservação de IPI na ZFM (${setor}).`);
  } else {
    alertas.push("O IPI tende a ser reduzido a zero a partir de 2027, salvo enquadramento específico em preservação da ZFM.");
  }

  if (input.sujeito_imposto_seletivo && (input.aliquota_is || 0) > 0) {
    alertas.push("Há incidência estimada de Imposto Seletivo para este item.");
  }

  const cronograma = CRONOGRAMA_TRANSICAO.map((ano) => {
    const cbsFatorReducao = ano.cbs_reducao_pp > 0 ? 1 - ano.cbs_reducao_pp / ALIQUOTA_CBS_REF : 1;
    const aliquotaCbs = ano.cbs_teste ? ano.cbs_pct : aliquotas.cbs * ano.cbs_pct * cbsFatorReducao;
    const aliquotaIbs = ano.ibs_teste ? ano.ibs_pct : aliquotas.ibs * ano.ibs_pct;
    const { mantidos, descontinuados } = nomeTributosMantidos(ano, isZfm);

    return {
      ano: ano.ano,
      aliquota_cbs: aliquotaCbs,
      aliquota_ibs: aliquotaIbs,
      aliquota_total_nova: ano.sem_incidencia_real ? 0 : aliquotaCbs + aliquotaIbs,
      tributos_mantidos: mantidos,
      tributos_descontinuados: descontinuados,
      observacao: ano.sem_incidencia_real
        ? "Fase teste, sem incidência econômica adicional no período."
        : faseTransicao(ano),
    };
  });

  return {
    ncm: input.ncm,
    descricao,
    aliquota_cbs_estimada: aliquotas.cbs,
    aliquota_ibs_estimada: aliquotas.ibs,
    aliquota_total_estimada: aliquotas.total,
    valor_referencia: valorReferencia,
    setor_zfm: setor,
    cronograma,
    alertas,
  };
}

/**
 * Calcula IRPJ + CSLL anuais conforme regime.
 * - Lucro Presumido: presunção sobre receita (comércio/serviços), IRPJ 15% +
 *   adicional 10% sobre lucro presumido acima de R$ 240.000/ano. CSLL 9% sobre
 *   presunção (12% comércio / 32% serviços).
 * - Lucro Real: aplica IRPJ 15% + adicional 10% (acima de R$ 240k) e CSLL 9%
 *   sobre o lucro tributável anual informado.
 * - Simples Nacional: já incluso no DAS — retorna zero.
 */
function calcularIrpjCsllAnual(
  empresa: EmpresaInput,
  faturamentoProdutosAnual: number,
  faturamentoServicosAnual: number,
): { irpj: number; csll: number } {
  const cfg = empresa.irpj_csll;
  if (!cfg || !cfg.incluir) return { irpj: 0, csll: 0 };
  if (empresa.regime_tributario === "simples_nacional") return { irpj: 0, csll: 0 };

  const ADICIONAL_LIMITE = 240000;

  if (empresa.regime_tributario === "lucro_presumido") {
    const presComercio = (cfg.presuncao_comercio ?? 8) / 100;
    const presServicos = (cfg.presuncao_servicos ?? 32) / 100;
    const lucroPresumidoIRPJ =
      faturamentoProdutosAnual * presComercio + faturamentoServicosAnual * presServicos;
    // CSLL: presunção fixa 12% comércio / 32% serviços
    const baseCsll =
      faturamentoProdutosAnual * 0.12 + faturamentoServicosAnual * 0.32;

    const irpj =
      lucroPresumidoIRPJ * 0.15 +
      Math.max(0, lucroPresumidoIRPJ - ADICIONAL_LIMITE) * 0.10;
    const csll = baseCsll * 0.09;
    return { irpj, csll };
  }

  // Lucro Real
  const lucro = Math.max(0, cfg.lucro_real_anual ?? 0);
  const irpj = lucro * 0.15 + Math.max(0, lucro - ADICIONAL_LIMITE) * 0.10;
  const csll = lucro * 0.09;
  return { irpj, csll };
}

// ─── Função Principal ──────────────────────────────────────────────────────

export function executarSimulacao(input: SimulacaoInput): ResultadoSimulacao {
  const { empresa, produtos, servicos, creditos } = input;
  const escopo: EscopoReforma = input.escopo_reforma ?? "cbs_ibs";
  const apenasCbs = escopo === "somente_cbs";

  // 1. Calcular tributos mensais no sistema atual (base 100%)
  const tribProd = calcularTributosAtuaisProdutos(produtos, empresa.regime_tributario, empresa.faturamento_anual);
  const tribServ = calcularTributosAtuaisServicos(servicos, empresa.regime_tributario, empresa.faturamento_anual);

  // IRPJ/CSLL anual (constante em todos os anos — não afetado pela reforma do consumo)
  const fatProdAnual = tribProd.faturamento * 12;
  const fatServAnual = tribServ.faturamento * 12;
  const irpjCsll = calcularIrpjCsllAnual(empresa, fatProdAnual, fatServAnual);

  const tributosAtuaisMensal: DetalheTributoAtual = {
    pis: tribProd.pis + tribServ.pis,
    cofins: tribProd.cofins + tribServ.cofins,
    ipi: tribProd.ipi,
    icms: tribProd.icms,
    iss: tribServ.iss,
    das: tribProd.das + tribServ.das,
    irpj: irpjCsll.irpj / 12,
    csll: irpjCsll.csll / 12,
    total: 0,
  };
  tributosAtuaisMensal.total =
    tributosAtuaisMensal.pis +
    tributosAtuaisMensal.cofins +
    tributosAtuaisMensal.ipi +
    tributosAtuaisMensal.icms +
    tributosAtuaisMensal.iss +
    tributosAtuaisMensal.das +
    tributosAtuaisMensal.irpj +
    tributosAtuaisMensal.csll;

  // 2. Calcular IBS/CBS mensal no sistema novo (alíquotas plenas)
  const ibsCbsProd = calcularIbsCbsProdutos(produtos);
  const ibsCbsServ = calcularIbsCbsServicos(servicos);

  const ibsCbsMensal: DetalheIbsCbs = {
    cbs: ibsCbsProd.cbs + ibsCbsServ.cbs,
    ibs: apenasCbs ? 0 : ibsCbsProd.ibs + ibsCbsServ.ibs,
    is: ibsCbsProd.is,
    total: 0,
  };
  ibsCbsMensal.total = ibsCbsMensal.cbs + ibsCbsMensal.ibs + ibsCbsMensal.is;

  // 3. Calcular créditos (separados por tipo de tributo)
  const cred = calcularCreditos(creditos, empresa.regime_tributario);

  // 4. Valores anuais base (sistema atual em regime pleno)
  const cargaAtualAnual = tributosAtuaisMensal.total * 12;
  const cargaNovaAnual = ibsCbsMensal.total * 12;
  const creditosAtuaisAnual = (cred.atuais_mensal_pis_cofins + cred.atuais_mensal_icms + cred.atuais_mensal_ipi) * 12;
  const creditosNovosAnual =
    (cred.novos_mensal_cbs + (apenasCbs ? 0 : cred.novos_mensal_ibs)) * 12;
  const cargaAtualLiquidaBase = cargaAtualAnual - creditosAtuaisAnual;

  // 5. Gerar resultados por ano da transição
  const fatMensal = tribProd.faturamento + tribServ.faturamento;

  const isSimples = empresa.regime_tributario === "simples_nacional";

  // Composição mensal do DAS (apenas Simples) — soma produtos + serviços
  const dasPisMensal = tribProd.das_pis + tribServ.das_pis;
  const dasCofinsMensal = tribProd.das_cofins + tribServ.das_cofins;
  const dasIcmsIssMensal = tribProd.das_icms + tribServ.das_iss;
  const dasOutrosMensal = tribProd.das_outros + tribServ.das_outros;

  // Filtrar anos selecionados (default: todos)
  const anosFiltro = input.anos_selecionados && input.anos_selecionados.length > 0
    ? CRONOGRAMA_TRANSICAO.filter((t) => input.anos_selecionados!.includes(t.ano))
    : CRONOGRAMA_TRANSICAO;

  const anos: ResultadoAno[] = anosFiltro.map((t) => {
    const ipiAno = (tribProd.ipi_zfm * 1.0 + tribProd.ipi_nao_zfm * t.ipi_fator) * 12;

    let dasAno: number;
    if (isSimples) {
      const dasMensalAno =
        dasPisMensal * t.pis_cofins_fator +
        dasCofinsMensal * t.pis_cofins_fator +
        dasIcmsIssMensal * t.icms_iss_fator +
        dasOutrosMensal;
      dasAno = dasMensalAno * 12;
    } else {
      dasAno = tributosAtuaisMensal.das * 12;
    }

    const tribAtualAno: DetalheTributoAtual = {
      pis: tributosAtuaisMensal.pis * t.pis_cofins_fator * 12,
      cofins: tributosAtuaisMensal.cofins * t.pis_cofins_fator * 12,
      ipi: ipiAno,
      icms: tributosAtuaisMensal.icms * t.icms_iss_fator * 12,
      iss: tributosAtuaisMensal.iss * t.icms_iss_fator * 12,
      das: dasAno,
      irpj: irpjCsll.irpj,
      csll: irpjCsll.csll,
      total: 0,
    };
    tribAtualAno.total =
      tribAtualAno.pis + tribAtualAno.cofins + tribAtualAno.ipi +
      tribAtualAno.icms + tribAtualAno.iss + tribAtualAno.das +
      tribAtualAno.irpj + tribAtualAno.csll;

    let cbsAno: number;
    if (t.cbs_teste) {
      cbsAno = fatMensal * t.cbs_pct * 12;
    } else {
      cbsAno = ibsCbsMensal.cbs * t.cbs_pct * 12;
    }

    let ibsAno: number;
    if (apenasCbs) {
      ibsAno = 0;
    } else if (t.ibs_teste) {
      ibsAno = fatMensal * t.ibs_pct * 12;
    } else if (isSimples) {
      ibsAno = 0;
    } else {
      // ibsCbsMensal.ibs já está zerado em apenasCbs (tratado acima)
      ibsAno = (ibsCbsProd.ibs + ibsCbsServ.ibs) * t.ibs_pct * 12;
    }

    const isAno = ibsCbsMensal.is * (t.cbs_teste ? 0 : 1.0) * 12;

    const ibsCbsAno: DetalheIbsCbs = {
      cbs: t.sem_incidencia_real ? 0 : cbsAno,
      ibs: t.sem_incidencia_real ? 0 : ibsAno,
      is: t.sem_incidencia_real ? 0 : isAno,
      total: t.sem_incidencia_real ? 0 : (cbsAno + ibsAno + isAno),
    };

    const creditosAtuaisAno =
      cred.atuais_mensal_pis_cofins * t.pis_cofins_fator * 12 +
      cred.atuais_mensal_icms * t.icms_iss_fator * 12 +
      cred.atuais_mensal_ipi * t.ipi_fator * 12;

    let creditosNovosAno: number;
    const credIbsMensal = apenasCbs ? 0 : cred.novos_mensal_ibs;
    if (t.sem_incidencia_real) {
      creditosNovosAno = 0;
    } else if (t.ibs_teste) {
      creditosNovosAno = (cred.novos_mensal_cbs * t.cbs_pct +
        credIbsMensal * (t.ibs_pct / ALIQUOTA_IBS_REF)) * 12;
    } else {
      creditosNovosAno = (cred.novos_mensal_cbs * t.cbs_pct +
        credIbsMensal * t.ibs_pct) * 12;
    }

    const creditosAno: CreditosDetalhe = {
      creditos_atuais: creditosAtuaisAno,
      creditos_ibs_cbs: creditosNovosAno,
    };

    const cargaAtualLiq = Math.max(0, tribAtualAno.total - creditosAtuaisAno);
    const cargaNovaLiq = Math.max(0, ibsCbsAno.total - creditosNovosAno);
    const cargaTotal = cargaAtualLiq + cargaNovaLiq;

    const variacao = cargaTotal - cargaAtualLiquidaBase;
    const variacaoPct = cargaAtualLiquidaBase > 0 ? (variacao / cargaAtualLiquidaBase) * 100 : 0;

    return {
      ano: t.ano,
      tributos_atuais_bruto: tribAtualAno,
      ibs_cbs_bruto: ibsCbsAno,
      creditos: creditosAno,
      carga_atual_liquida: cargaAtualLiq,
      carga_nova_liquida: cargaNovaLiq,
      carga_total: cargaTotal,
      variacao,
      variacao_pct: variacaoPct,
      fase: faseTransicao(t),
    };
  });

  const alertas = gerarAlertas(input);
  if (apenasCbs) {
    alertas.unshift("Cenário 'Somente CBS' selecionado — o IBS foi removido da simulação. Use para isolar o impacto federal da reforma.");
  }
  if (empresa.irpj_csll?.incluir && empresa.regime_tributario !== "simples_nacional") {
    alertas.unshift("IRPJ/CSLL incluídos na carga atual para visualização da tributação federal total. Esses tributos não são afetados pela reforma do consumo (incidem sobre o lucro).");
  }

  return {
    empresa: empresa.razao_social,
    cnpj: empresa.cnpj,
    regime_tributario: empresa.regime_tributario,
    faturamento_anual: empresa.faturamento_anual,
    carga_atual_anual: cargaAtualAnual,
    carga_nova_anual: cargaNovaAnual,
    creditos_atuais_anual: creditosAtuaisAnual,
    creditos_novos_anual: creditosNovosAnual,
    anos,
    alertas,
  };
}
