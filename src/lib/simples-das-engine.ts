/**
 * Análise Simples Nacional — Dentro vs. Fora do DAS (ano 2027)
 *
 * Baseado em:
 * - LC 214/2025, arts. 41–43 e 344–347 (transição CBS/IBS)
 * - LC 123/2006, art. 18 (composição do DAS, Anexos I e III)
 *
 * Cenário A — DENTRO do DAS (regime unificado):
 *   A empresa segue recolhendo o DAS integral. A fração de IBS/CBS embutida
 *   no DAS é o crédito MÁXIMO que o cliente PJ pode aproveitar.
 *
 * Cenário B — POR FORA (regime regular/híbrido):
 *   O DAS é reduzido (saem PIS/COFINS — substituídos por CBS) e a empresa
 *   passa a recolher IBS/CBS POR FORA, à alíquota cheia do regime regular,
 *   com direito a CRÉDITO sobre os insumos. O cliente PJ recebe o crédito
 *   INTEGRAL destacado em nota.
 *
 * IMPORTANTE: estimativa de planejamento. A alíquota de referência será
 * calibrada anualmente pelo Senado; opção semestral, irrevogável no semestre.
 * Não se aplica a MEI (Anexo VII, valores fixos).
 */

import {
  ALIQUOTA_CBS_REF,
  ALIQUOTA_IBS_REF,
  CBS_REDUCAO_TRANSICAO_PP,
  IBS_TRANSICAO_2027_2028,
  FATOR_REGIME,
  type RegimeDiferenciado,
} from "./tax-engine";

// ─── Tabelas DAS (Anexos I — Comércio e III — Serviços) ───────────────────
interface FaixaDAS {
  limite: number;
  aliquota: number;
  deducao: number;
}

const DAS_ANEXO_I: FaixaDAS[] = [
  { limite: 180000, aliquota: 0.04, deducao: 0 },
  { limite: 360000, aliquota: 0.073, deducao: 5940 },
  { limite: 720000, aliquota: 0.095, deducao: 13860 },
  { limite: 1800000, aliquota: 0.107, deducao: 22500 },
  { limite: 3600000, aliquota: 0.143, deducao: 87300 },
  { limite: 4800000, aliquota: 0.19, deducao: 378000 },
];

const DAS_ANEXO_III: FaixaDAS[] = [
  { limite: 180000, aliquota: 0.06, deducao: 0 },
  { limite: 360000, aliquota: 0.112, deducao: 9360 },
  { limite: 720000, aliquota: 0.135, deducao: 17640 },
  { limite: 1800000, aliquota: 0.16, deducao: 35640 },
  { limite: 3600000, aliquota: 0.21, deducao: 125640 },
  { limite: 4800000, aliquota: 0.33, deducao: 648000 },
];

// Composição interna dos anexos
const COMP_I = { pis: 0.0276, cofins: 0.1274, icms: 0.34, outros: 0.505 };
const COMP_III = { pis: 0.0278, cofins: 0.1282, iss: 0.335, outros: 0.509 };

function aliqEfetivaDAS(rbt12: number, anexo: FaixaDAS[]): number {
  if (rbt12 <= 0) return 0;
  const faixa = anexo.find((f) => rbt12 <= f.limite) || anexo[anexo.length - 1];
  return (rbt12 * faixa.aliquota - faixa.deducao) / rbt12;
}

// ─── Alíquotas efetivas IBS/CBS no regime regular em 2027 ──────────────────
// CBS 2027 = 8,8% − 0,1 p.p. = 8,7%
// IBS 2027 = 0,1% efetivo (transição), aplicado em alíquota cheia
const CBS_2027 = ALIQUOTA_CBS_REF - CBS_REDUCAO_TRANSICAO_PP; // 0.087
const IBS_2027 = IBS_TRANSICAO_2027_2028; // 0.001
const ICMS_ISS_FATOR_2027 = 1.0; // mantidos integralmente em 2027

export const ANO_ANALISE = 2027;

// ─── Entradas ──────────────────────────────────────────────────────────────

export interface ItemFaturamento {
  /** "produto" usa Anexo I; "servico" usa Anexo III */
  tipo: "produto" | "servico";
  valor_mensal: number;
  regime_diferenciado: RegimeDiferenciado;
}

export interface ItemCredito {
  valor_mensal: number;
  regime_diferenciado_fornecedor: RegimeDiferenciado;
}

export type PerfilClientes = "B2B" | "B2C" | "MISTO";

export interface SimplesDasInput {
  faturamento_anual: number; // RBT12 estimado para 2027
  perfil_clientes: PerfilClientes;
  /** Percentual aproximado de faturamento B2B quando perfil = MISTO (0-100) */
  perfil_b2b_pct?: number;
  itens: ItemFaturamento[];
  creditos: ItemCredito[];
  /**
   * % da receita bruta gasto em insumos creditáveis (0–100). Usado para
   * estimar a base de crédito no cenário POR FORA quando `creditos` está vazio.
   */
  perc_insumos_creditaveis?: number;
}


// ─── Saídas ────────────────────────────────────────────────────────────────

export interface CenarioResultado {
  rotulo: string;
  // Desembolso da própria empresa
  das_mensal: number;
  ibs_cbs_pago_mensal: number;
  credito_insumos_mensal: number;
  desembolso_mensal: number;
  desembolso_anual: number;
  // Crédito transferido ao cliente PJ
  credito_cliente_mensal: number;
  credito_cliente_anual: number;
  /** Origem do crédito de insumos usado no cenário (B). */
  origem_credito_insumos?: "real" | "estimado" | "nenhum";
}


export interface SimplesDasResultado {
  ano: number;
  faturamento_mensal: number;
  faturamento_anual: number;
  carga_atual_2026_mensal: number;
  carga_atual_2026_anual: number;
  cenario_a: CenarioResultado; // DENTRO do DAS
  cenario_b: CenarioResultado; // POR FORA
  diferenca_desembolso_anual: number; // B - A (positivo = B custa mais)
  diferenca_credito_cliente_anual: number; // B - A (positivo = B entrega mais crédito)
  variacao_a_vs_2026_pct: number;
  variacao_b_vs_2026_pct: number;
  variacao_a_vs_2026_rs: number;
  variacao_b_vs_2026_rs: number;
  recomendacao: {
    cenario_recomendado: "A" | "B" | "AVALIAR";
    titulo: string;
    justificativa: string;
    trade_off: string;
  };
  alertas: string[];
}

// ─── Cálculo ───────────────────────────────────────────────────────────────

function calcularDasIntegral(input: SimplesDasInput): {
  das_mensal: number;
  produtos_mensal: number;
  servicos_mensal: number;
  composicao_pis_cofins_mensal: number; // parcela embutida no DAS
  composicao_ibs_cbs_equivalente_mensal: number; // = pis+cofins (substituídos) — crédito-teto
} {
  const produtos = input.itens.filter((i) => i.tipo === "produto");
  const servicos = input.itens.filter((i) => i.tipo === "servico");
  const fatProd = produtos.reduce((s, p) => s + p.valor_mensal, 0);
  const fatServ = servicos.reduce((s, p) => s + p.valor_mensal, 0);

  const aliqI = aliqEfetivaDAS(input.faturamento_anual, DAS_ANEXO_I);
  const aliqIII = aliqEfetivaDAS(input.faturamento_anual, DAS_ANEXO_III);

  const dasProd = fatProd * aliqI;
  const dasServ = fatServ * aliqIII;
  const das = dasProd + dasServ;

  // Parcela PIS+COFINS embutida (substituída pela CBS no novo regime).
  // O IBS substitui a parcela de ICMS/ISS, mas em 2027 essa parcela
  // permanece (transição) — só sai do DAS na opção pelo regime regular.
  const pisCofinsEmbutida =
    dasProd * (COMP_I.pis + COMP_I.cofins) +
    dasServ * (COMP_III.pis + COMP_III.cofins);

  // Crédito-teto: dentro do DAS, o cliente PJ só pode aproveitar como crédito
  // de CBS o que estiver embutido no DAS a título de CBS. Como a CBS substitui
  // PIS+COFINS, usamos essa fração como aproximação razoável.
  const creditoEquivalente = pisCofinsEmbutida;

  return {
    das_mensal: das,
    produtos_mensal: fatProd,
    servicos_mensal: fatServ,
    composicao_pis_cofins_mensal: pisCofinsEmbutida,
    composicao_ibs_cbs_equivalente_mensal: creditoEquivalente,
  };
}

function calcularCenarioA(input: SimplesDasInput): CenarioResultado {
  const d = calcularDasIntegral(input);
  return {
    rotulo: "DENTRO do DAS",
    das_mensal: d.das_mensal,
    ibs_cbs_pago_mensal: 0,
    credito_insumos_mensal: 0,
    desembolso_mensal: d.das_mensal,
    desembolso_anual: d.das_mensal * 12,
    credito_cliente_mensal: d.composicao_ibs_cbs_equivalente_mensal,
    credito_cliente_anual: d.composicao_ibs_cbs_equivalente_mensal * 12,
  };
}

function calcularCenarioB(input: SimplesDasInput): CenarioResultado {
  const d = calcularDasIntegral(input);

  // DAS reduzido: remove PIS+COFINS (substituídos pela CBS por fora).
  // Em 2027 o ICMS/ISS continuam no DAS (icms_iss_fator = 1).
  const dasReduzido = d.das_mensal - d.composicao_pis_cofins_mensal;

  // IBS/CBS por fora — alíquota cheia do regime regular em 2027, aplicada
  // sobre cada item com o fator do regime diferenciado correspondente.
  let debitoIbsCbs = 0;
  let creditoClienteIntegral = 0;
  for (const it of input.itens) {
    const fator = FATOR_REGIME[it.regime_diferenciado] ?? 1.0;
    const aliq = (CBS_2027 + IBS_2027 * ICMS_ISS_FATOR_2027) * fator;
    debitoIbsCbs += it.valor_mensal * aliq;
    creditoClienteIntegral += it.valor_mensal * aliq;
  }

  // Crédito sobre insumos: alíquota do FORNECEDOR (não-cumulatividade).
  let creditoInsumos = 0;
  let origemCredito: "real" | "estimado" | "nenhum" = "nenhum";
  if (input.creditos.length > 0) {
    for (const c of input.creditos) {
      const fator = FATOR_REGIME[c.regime_diferenciado_fornecedor] ?? 1.0;
      const aliq = (CBS_2027 + IBS_2027 * ICMS_ISS_FATOR_2027) * fator;
      creditoInsumos += c.valor_mensal * aliq;
    }
    origemCredito = "real";
  } else {
    // Fallback sem histórico: estima base = faturamento_mensal * pct (regime padrão).
    const pct = Math.max(0, Math.min(100, input.perc_insumos_creditaveis ?? 0)) / 100;
    const fatMensalItens = input.itens.reduce((s, i) => s + i.valor_mensal, 0);
    if (pct > 0 && fatMensalItens > 0) {
      const baseCredito = fatMensalItens * pct;
      const aliq = CBS_2027 + IBS_2027 * ICMS_ISS_FATOR_2027; // fator padrão = 1
      creditoInsumos = baseCredito * aliq;
      origemCredito = "estimado";
    }
  }

  const ibsCbsLiquido = Math.max(0, debitoIbsCbs - creditoInsumos);
  const desembolso = dasReduzido + ibsCbsLiquido;

  return {
    rotulo: "POR FORA (regime regular)",
    das_mensal: dasReduzido,
    ibs_cbs_pago_mensal: ibsCbsLiquido,
    credito_insumos_mensal: creditoInsumos,
    desembolso_mensal: desembolso,
    desembolso_anual: desembolso * 12,
    credito_cliente_mensal: creditoClienteIntegral,
    credito_cliente_anual: creditoClienteIntegral * 12,
    origem_credito_insumos: origemCredito,
  };
}


function gerarRecomendacao(
  input: SimplesDasInput,
  a: CenarioResultado,
  b: CenarioResultado,
): SimplesDasResultado["recomendacao"] {
  const diffDesembolso = b.desembolso_anual - a.desembolso_anual; // + = B mais caro
  const diffCredito = b.credito_cliente_anual - a.credito_cliente_anual; // + = B entrega mais crédito

  const pctB2B =
    input.perfil_clientes === "B2B"
      ? 100
      : input.perfil_clientes === "B2C"
        ? 0
        : Math.max(0, Math.min(100, input.perfil_b2b_pct ?? 50));

  const fmt = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

  // Trade-off textual (sempre)
  let tradeOff: string;
  if (diffDesembolso >= 0 && diffCredito >= 0) {
    tradeOff = `Optando POR FORA, você desembolsa ${fmt(diffDesembolso)} a mais por ano, mas entrega ${fmt(diffCredito)} a mais de crédito ao seu cliente.`;
  } else if (diffDesembolso < 0 && diffCredito >= 0) {
    tradeOff = `Optando POR FORA, você desembolsa ${fmt(-diffDesembolso)} a MENOS por ano E entrega ${fmt(diffCredito)} a mais de crédito ao seu cliente.`;
  } else if (diffDesembolso >= 0 && diffCredito < 0) {
    tradeOff = `Optando POR FORA, você desembolsa ${fmt(diffDesembolso)} a mais e ainda entrega ${fmt(-diffCredito)} a MENOS de crédito — cenário desfavorável.`;
  } else {
    tradeOff = `Optando POR FORA, você desembolsa ${fmt(-diffDesembolso)} a menos por ano (cliente recebe ${fmt(-diffCredito)} a menos de crédito).`;
  }

  // Regras
  // 1) Se B é mais barato e entrega mais crédito → B
  if (diffDesembolso <= 0 && diffCredito > 0) {
    return {
      cenario_recomendado: "B",
      titulo: "Recomendado: POR FORA do DAS",
      justificativa:
        "O cenário regular reduz (ou mantém) o desembolso da empresa E aumenta o crédito transferido ao cliente. Vantagem em qualquer perfil.",
      trade_off: tradeOff,
    };
  }

  // 2) B2C puro / MISTO com baixo B2B (<25%) → A
  if (pctB2B < 25) {
    return {
      cenario_recomendado: "A",
      titulo: "Recomendado: DENTRO do DAS",
      justificativa: `Com ${pctB2B === 0 ? "clientes finais (B2C)" : `apenas ${pctB2B}% de clientes B2B`}, o crédito de IBS/CBS adicional praticamente não se converte em competitividade. A simplicidade do DAS unificado tende a compensar.`,
      trade_off: tradeOff,
    };
  }

  // 3) B2B puro ou alto B2B (≥60%) → B (se desembolso adicional for justificável)
  if (pctB2B >= 60) {
    if (diffDesembolso <= 0) {
      return {
        cenario_recomendado: "B",
        titulo: "Recomendado: POR FORA do DAS",
        justificativa: `Perfil predominantemente B2B (${pctB2B}%): o cliente PJ aproveita crédito integral, e nesta simulação o desembolso da empresa ${diffDesembolso === 0 ? "não muda" : "diminui"}.`,
        trade_off: tradeOff,
      };
    }
    return {
      cenario_recomendado: "B",
      titulo: "Tende a favorecer: POR FORA do DAS",
      justificativa: `Perfil predominantemente B2B (${pctB2B}%). O desembolso da empresa sobe, mas o crédito integral ao cliente aumenta a competitividade comercial — geralmente compensa quando o ganho de crédito ao cliente supera o custo adicional da empresa.`,
      trade_off: tradeOff,
    };
  }

  // 4) MISTO intermediário (25%–60%) → AVALIAR
  return {
    cenario_recomendado: "AVALIAR",
    titulo: "Avaliação necessária",
    justificativa: `Perfil misto (${pctB2B}% B2B): decisão depende de quanto vale repassar crédito ao cliente PJ vs. o custo adicional para a empresa. Considere também a complexidade operacional do regime regular (apuração, créditos, obrigações acessórias).`,
    trade_off: tradeOff,
  };
}

export function calcularSimplesDas(input: SimplesDasInput): SimplesDasResultado {
  const fatMensal = input.itens.reduce((s, i) => s + i.valor_mensal, 0);
  const fatAnual = fatMensal * 12;

  // Carga atual de 2026 = DAS integral pela tabela
  const carga2026 = calcularDasIntegral(input);

  const a = calcularCenarioA(input);
  const b = calcularCenarioB(input);

  const variacao_a_rs = a.desembolso_anual - carga2026.das_mensal * 12;
  const variacao_b_rs = b.desembolso_anual - carga2026.das_mensal * 12;
  const base = carga2026.das_mensal * 12 || 1;

  const alertas: string[] = [
    "⚠️ Estimativa de planejamento. Os valores estão sujeitos à regulamentação infralegal e à calibração anual da alíquota de referência pelo Senado Federal. Recomenda-se validação por profissional contábil/tributário.",
    "📅 A opção pelo regime regular do IBS/CBS é SEMESTRAL (janelas de abril e setembro) e IRREVOGÁVEL dentro do semestre. A 1ª opção é em setembro/2026, com efeito a partir de janeiro/2027.",
    "🚫 Esta análise NÃO se aplica ao MEI (Anexo VII), que segue regras próprias com valores fixos e opção apenas em janeiro.",
    "ℹ️ Em 2027 o ICMS/ISS continuam dentro do DAS mesmo no cenário POR FORA (transição). O DAS reduzido remove apenas PIS/COFINS, que são substituídos pela CBS recolhida por fora.",
  ];

  if (input.creditos.length === 0) {
    alertas.push("Nenhum crédito de aquisição cadastrado — o cenário POR FORA tende a ser subestimado em vantagem. Cadastre os insumos para uma análise mais precisa.");
  }

  return {
    ano: ANO_ANALISE,
    faturamento_mensal: fatMensal,
    faturamento_anual: fatAnual,
    carga_atual_2026_mensal: carga2026.das_mensal,
    carga_atual_2026_anual: carga2026.das_mensal * 12,
    cenario_a: a,
    cenario_b: b,
    diferenca_desembolso_anual: b.desembolso_anual - a.desembolso_anual,
    diferenca_credito_cliente_anual: b.credito_cliente_anual - a.credito_cliente_anual,
    variacao_a_vs_2026_rs: variacao_a_rs,
    variacao_b_vs_2026_rs: variacao_b_rs,
    variacao_a_vs_2026_pct: variacao_a_rs / base,
    variacao_b_vs_2026_pct: variacao_b_rs / base,
    recomendacao: gerarRecomendacao(input, a, b),
    alertas,
  };
}
