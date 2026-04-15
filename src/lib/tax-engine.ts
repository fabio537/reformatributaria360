/**
 * Motor de Cálculo Tributário — Reforma Tributária
 * 
 * Baseado em:
 * - EC 132/2023 (Emenda Constitucional da Reforma Tributária)
 * - LC 214/2025 (Lei Complementar do IBS/CBS)
 * - LCP 227 (Comitê Gestor do IBS)
 * 
 * Alíquotas de referência conforme LC 214/2025:
 * - CBS (Contribuição sobre Bens e Serviços – federal): 8,8%
 * - IBS (Imposto sobre Bens e Serviços – estadual/municipal): 17,7%
 * - Total referência: 26,5%
 */

// ─── Alíquotas de Referência (LC 214/2025, Art. 9º) ───────────────────────

export const ALIQUOTA_CBS_REF = 0.088; // 8,8%
export const ALIQUOTA_IBS_REF = 0.177; // 17,7%
export const ALIQUOTA_TOTAL_REF = ALIQUOTA_CBS_REF + ALIQUOTA_IBS_REF; // 26,5%

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

/**
 * Calcula a alíquota efetiva do DAS com base no faturamento (RBT12)
 */
function aliquotaEfetivaDAS(rbt12: number, anexo: FaixaDAS[]): number {
  if (rbt12 <= 0) return 0;
  const faixa = anexo.find(f => rbt12 <= f.limite) || anexo[anexo.length - 1];
  // Alíquota efetiva = (RBT12 × Alíquota Nominal - Parcela a Deduzir) / RBT12
  return (rbt12 * faixa.aliquota - faixa.deducao) / rbt12;
}

// ─── Cronograma de Transição (EC 132/2023, Art. 124 a 133) ─────────────────

export interface TransicaoAno {
  ano: number;
  cbs_pct: number;
  cbs_teste: boolean;
  ibs_pct: number;
  reducao_atual: number;
}

export const CRONOGRAMA_TRANSICAO: TransicaoAno[] = [
  { ano: 2026, cbs_pct: 0.009, cbs_teste: true, ibs_pct: 0, reducao_atual: 0 },
  { ano: 2027, cbs_pct: 0.009, cbs_teste: true, ibs_pct: 0, reducao_atual: 0 },
  { ano: 2028, cbs_pct: 0.009, cbs_teste: true, ibs_pct: 0, reducao_atual: 0 },
  { ano: 2029, cbs_pct: 1.0, cbs_teste: false, ibs_pct: 0.10, reducao_atual: 0.10 },
  { ano: 2030, cbs_pct: 1.0, cbs_teste: false, ibs_pct: 0.25, reducao_atual: 0.25 },
  { ano: 2031, cbs_pct: 1.0, cbs_teste: false, ibs_pct: 0.50, reducao_atual: 0.50 },
  { ano: 2032, cbs_pct: 1.0, cbs_teste: false, ibs_pct: 0.75, reducao_atual: 0.75 },
  { ano: 2033, cbs_pct: 1.0, cbs_teste: false, ibs_pct: 1.0, reducao_atual: 1.0 },
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

export interface EmpresaInput {
  razao_social: string;
  cnpj: string;
  regime_tributario: "simples_nacional" | "lucro_presumido" | "lucro_real";
  uf: string | null;
  municipio: string | null;
  faturamento_anual: number;
  optante_simples_mei: boolean;
}

export interface SimulacaoInput {
  empresa: EmpresaInput;
  produtos: ProdutoInput[];
  servicos: ServicoInput[];
  creditos: CreditoInput[];
}

// ─── Tipos de Saída ────────────────────────────────────────────────────────

export interface DetalheTributoAtual {
  pis: number;
  cofins: number;
  ipi: number;
  icms: number;
  iss: number;
  das: number; // Para Simples Nacional
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
 */
function calcularTributosAtuaisProdutos(
  produtos: ProdutoInput[],
  regime: string,
  faturamentoAnual: number,
): Omit<DetalheTributoAtual, "iss" | "total"> & { faturamento: number } {
  let pis = 0, cofins = 0, ipi = 0, icms = 0, das = 0, faturamento = 0;

  for (const p of produtos) {
    faturamento += p.valor_mensal;
  }

  if (regime === "simples_nacional" && faturamentoAnual > 0) {
    // Simples Nacional: carga via DAS (Anexo I para comércio/indústria)
    const aliqEfetiva = aliquotaEfetivaDAS(faturamentoAnual, DAS_ANEXO_I);
    das = faturamento * aliqEfetiva;
  } else {
    for (const p of produtos) {
      const v = p.valor_mensal;
      pis += v * (p.aliquota_pis / 100);
      cofins += v * (p.aliquota_cofins / 100);
      ipi += v * (p.aliquota_ipi / 100);
      icms += v * (p.aliquota_icms / 100);
    }
  }

  return { pis, cofins, ipi, icms, das, faturamento };
}

/**
 * Calcula tributos atuais mensais sobre serviços
 */
function calcularTributosAtuaisServicos(
  servicos: ServicoInput[],
  regime: string,
  faturamentoAnual: number,
): { pis: number; cofins: number; iss: number; das: number; faturamento: number } {
  let pis = 0, cofins = 0, iss = 0, das = 0, faturamento = 0;

  for (const s of servicos) {
    faturamento += s.valor_mensal;
  }

  if (regime === "simples_nacional" && faturamentoAnual > 0) {
    const aliqEfetiva = aliquotaEfetivaDAS(faturamentoAnual, DAS_ANEXO_III);
    das = faturamento * aliqEfetiva;
  } else {
    for (const s of servicos) {
      const v = s.valor_mensal;
      pis += v * (s.aliquota_pis / 100);
      cofins += v * (s.aliquota_cofins / 100);
      iss += v * (s.aliquota_iss / 100);
    }
  }

  return { pis, cofins, iss, das, faturamento };
}

/**
 * Calcula tributos IBS/CBS mensais sobre produtos.
 * Exportações são imunes de IBS/CBS.
 * Inclui Imposto Seletivo (IS) quando aplicável.
 */
function calcularIbsCbsProdutos(produtos: ProdutoInput[]): { cbs: number; ibs: number; is: number } {
  let cbs = 0, ibs = 0, is = 0;
  for (const p of produtos) {
    // Exportações: imunidade de IBS/CBS
    if (p.destino_operacao === "exportacao") continue;

    const aliq = aliquotaEfetiva(p.regime_diferenciado as RegimeDiferenciado);
    cbs += p.valor_mensal * aliq.cbs;
    ibs += p.valor_mensal * aliq.ibs;

    // Imposto Seletivo
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
 * Sistema novo (IBS/CBS): crédito com base no imposto efetivamente pago pelo
 * FORNECEDOR na etapa anterior (não-cumulatividade plena, LC 214/2025, Art. 28-46).
 */
function calcularCreditos(
  creditos: CreditoInput[],
  regime: string,
): { atuais_mensal: number; novos_mensal: number } {
  let atuais = 0;
  let novos = 0;

  for (const c of creditos) {
    const v = c.valor_mensal;

    // Créditos no sistema atual
    if (regime === "lucro_real") {
      atuais += v * ((c.aliquota_pis + c.aliquota_cofins + c.aliquota_icms + c.aliquota_ipi) / 100);
    } else if (regime === "lucro_presumido") {
      atuais += v * ((c.aliquota_icms * 0.5) / 100);
    }
    // Simples Nacional: sem créditos no sistema atual

    // No novo sistema: crédito com base no regime do FORNECEDOR
    const aliqFornecedor = aliquotaEfetiva(
      (c.regime_diferenciado_fornecedor || "padrao") as RegimeDiferenciado
    );
    novos += v * aliqFornecedor.total;
  }

  return { atuais_mensal: atuais, novos_mensal: novos };
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

  if (empresa.optante_simples_mei) {
    alertas.push(
      "Empresa optante pelo Simples Nacional/MEI: a simulação do sistema atual usa a tabela DAS (alíquota efetiva por faixa). " +
      "No novo sistema, poderá optar por recolher IBS/CBS dentro do Simples ou migrar para o regime geral."
    );
  }

  if (empresa.regime_tributario === "lucro_presumido") {
    alertas.push(
      "No Lucro Presumido, PIS/COFINS são cumulativos (sem créditos). No novo sistema IBS/CBS, " +
      "todos os créditos serão aproveitáveis (não-cumulatividade plena), o que pode gerar economia significativa."
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
      `imunes de IBS/CBS, mas mantêm direito a créditos das aquisições.`
    );
  }

  // Imposto Seletivo
  const comIS = produtos.filter(p => p.sujeito_imposto_seletivo);
  if (comIS.length > 0) {
    alertas.push(
      `${comIS.length} produto(s) sujeito(s) ao Imposto Seletivo (IS). ` +
      `O IS incide sobre bens prejudiciais à saúde/meio ambiente (tabaco, bebidas, etc.).`
    );
  }

  const temReducao60 = [...produtos, ...servicos].some(
    (item) => (item as any).regime_diferenciado === "reducao_60"
  );
  if (temReducao60) {
    alertas.push(
      "Itens com redução de 60% (alimentos, higiene, agropecuários): alíquota efetiva de ~10,6% (40% de 26,5%)."
    );
  }

  const temAliquotaZero = [...produtos, ...servicos].some(
    (item) => (item as any).regime_diferenciado === "aliquota_zero"
  );
  if (temAliquotaZero) {
    alertas.push(
      "Itens com alíquota zero (cesta básica nacional): isentos de IBS/CBS, mas mantêm direito a créditos das aquisições."
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

  return alertas;
}

function formatarBRL(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function faseTransicao(t: TransicaoAno): string {
  if (t.cbs_teste) return "Fase teste (CBS 0,9%)";
  if (t.ibs_pct < 1.0) return `Transição (IBS ${(t.ibs_pct * 100).toFixed(0)}%)`;
  return "Sistema novo integral";
}

// ─── Função Principal ──────────────────────────────────────────────────────

export function executarSimulacao(input: SimulacaoInput): ResultadoSimulacao {
  const { empresa, produtos, servicos, creditos } = input;

  // 1. Calcular tributos mensais no sistema atual
  const tribProd = calcularTributosAtuaisProdutos(produtos, empresa.regime_tributario, empresa.faturamento_anual);
  const tribServ = calcularTributosAtuaisServicos(servicos, empresa.regime_tributario, empresa.faturamento_anual);

  const tributosAtuaisMensal: DetalheTributoAtual = {
    pis: tribProd.pis + tribServ.pis,
    cofins: tribProd.cofins + tribServ.cofins,
    ipi: tribProd.ipi,
    icms: tribProd.icms,
    iss: tribServ.iss,
    das: tribProd.das + tribServ.das,
    total: 0,
  };
  tributosAtuaisMensal.total =
    tributosAtuaisMensal.pis +
    tributosAtuaisMensal.cofins +
    tributosAtuaisMensal.ipi +
    tributosAtuaisMensal.icms +
    tributosAtuaisMensal.iss +
    tributosAtuaisMensal.das;

  // 2. Calcular IBS/CBS mensal no sistema novo (100%)
  const ibsCbsProd = calcularIbsCbsProdutos(produtos);
  const ibsCbsServ = calcularIbsCbsServicos(servicos);

  const ibsCbsMensal: DetalheIbsCbs = {
    cbs: ibsCbsProd.cbs + ibsCbsServ.cbs,
    ibs: ibsCbsProd.ibs + ibsCbsServ.ibs,
    is: ibsCbsProd.is,
    total: 0,
  };
  ibsCbsMensal.total = ibsCbsMensal.cbs + ibsCbsMensal.ibs + ibsCbsMensal.is;

  // 3. Calcular créditos
  const cred = calcularCreditos(creditos, empresa.regime_tributario);

  // 4. Valores anuais base
  const cargaAtualAnual = tributosAtuaisMensal.total * 12;
  const cargaNovaAnual = ibsCbsMensal.total * 12;
  const creditosAtuaisAnual = cred.atuais_mensal * 12;
  const creditosNovosAnual = cred.novos_mensal * 12;
  const cargaAtualLiquidaBase = cargaAtualAnual - creditosAtuaisAnual;

  // 5. Gerar resultados por ano da transição
  const fatMensal = tribProd.faturamento + tribServ.faturamento;

  const anos: ResultadoAno[] = CRONOGRAMA_TRANSICAO.map((t) => {
    const fatorAtual = 1 - t.reducao_atual;
    const tribAtualAno: DetalheTributoAtual = {
      pis: tributosAtuaisMensal.pis * fatorAtual * 12,
      cofins: tributosAtuaisMensal.cofins * fatorAtual * 12,
      ipi: tributosAtuaisMensal.ipi * fatorAtual * 12,
      icms: tributosAtuaisMensal.icms * fatorAtual * 12,
      iss: tributosAtuaisMensal.iss * fatorAtual * 12,
      das: tributosAtuaisMensal.das * fatorAtual * 12,
      total: tributosAtuaisMensal.total * fatorAtual * 12,
    };

    let cbsAno: number;
    if (t.cbs_teste) {
      cbsAno = fatMensal * t.cbs_pct * 12;
    } else {
      cbsAno = ibsCbsMensal.cbs * t.cbs_pct * 12;
    }
    const ibsAno = ibsCbsMensal.ibs * t.ibs_pct * 12;
    // IS acompanha a transição do IBS/CBS
    const isAno = ibsCbsMensal.is * (t.cbs_teste ? 0 : Math.max(t.cbs_pct, t.ibs_pct)) * 12;

    const ibsCbsAno: DetalheIbsCbs = {
      cbs: cbsAno,
      ibs: ibsAno,
      is: isAno,
      total: cbsAno + ibsAno + isAno,
    };

    const creditosAtuaisAno = cred.atuais_mensal * fatorAtual * 12;
    const creditosNovosAno = cred.novos_mensal * (t.cbs_teste ? t.cbs_pct / ALIQUOTA_CBS_REF : (t.cbs_pct * ALIQUOTA_CBS_REF + t.ibs_pct * ALIQUOTA_IBS_REF) / ALIQUOTA_TOTAL_REF) * 12;

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
    alertas: gerarAlertas(input),
  };
}
