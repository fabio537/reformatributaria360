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

// ─── Cronograma de Transição (EC 132/2023, Art. 124 a 133) ─────────────────
// Define a proporção do sistema NOVO (IBS/CBS) e a redução do sistema ATUAL
// durante o período de transição 2026-2033.

export interface TransicaoAno {
  ano: number;
  /** Percentual da CBS aplicada (0 a 1). Em 2026-2028 é taxa-teste de 0.9% */
  cbs_pct: number;
  /** Se true, a CBS nesse ano é uma taxa-teste fixa (0.9%), não % da alíquota ref */
  cbs_teste: boolean;
  /** Percentual do IBS novo aplicado (0 a 1) */
  ibs_pct: number;
  /** Percentual de redução dos tributos atuais (PIS/COFINS/IPI/ICMS/ISS) */
  reducao_atual: number;
}

export const CRONOGRAMA_TRANSICAO: TransicaoAno[] = [
  // 2026-2028: Fase teste — CBS a 0,9% (fixa), tributos atuais mantidos integralmente
  { ano: 2026, cbs_pct: 0.009, cbs_teste: true, ibs_pct: 0, reducao_atual: 0 },
  { ano: 2027, cbs_pct: 0.009, cbs_teste: true, ibs_pct: 0, reducao_atual: 0 },
  { ano: 2028, cbs_pct: 0.009, cbs_teste: true, ibs_pct: 0, reducao_atual: 0 },
  // 2029-2032: Transição gradual — CBS integral, IBS crescente, atuais reduzidos
  { ano: 2029, cbs_pct: 1.0, cbs_teste: false, ibs_pct: 0.10, reducao_atual: 0.10 },
  { ano: 2030, cbs_pct: 1.0, cbs_teste: false, ibs_pct: 0.25, reducao_atual: 0.25 },
  { ano: 2031, cbs_pct: 1.0, cbs_teste: false, ibs_pct: 0.50, reducao_atual: 0.50 },
  { ano: 2032, cbs_pct: 1.0, cbs_teste: false, ibs_pct: 0.75, reducao_atual: 0.75 },
  // 2033: Sistema novo integral
  { ano: 2033, cbs_pct: 1.0, cbs_teste: false, ibs_pct: 1.0, reducao_atual: 1.0 },
];

// ─── Tipos de Entrada ──────────────────────────────────────────────────────

export interface ProdutoInput {
  descricao: string;
  ncm: string;
  valor_mensal: number;
  quantidade_mensal: number;
  regime_diferenciado: RegimeDiferenciado;
  tipo_operacao: string; // fabricacao, revenda, importacao
  // Alíquotas atuais
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
  // Alíquotas atuais
  aliquota_iss: number;
  aliquota_pis: number;
  aliquota_cofins: number;
}

export interface CreditoInput {
  fornecedor: string;
  descricao: string | null;
  ncm: string | null;
  valor_mensal: number;
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
  total: number;
}

export interface DetalheIbsCbs {
  cbs: number;
  ibs: number;
  total: number;
}

export interface CreditosDetalhe {
  creditos_atuais: number;    // PIS/COFINS/IPI/ICMS pagos nas aquisições
  creditos_ibs_cbs: number;   // Créditos do novo sistema (não-cumulatividade plena)
}

export interface ResultadoAno {
  ano: number;
  // Carga tributária bruta (antes de créditos)
  tributos_atuais_bruto: DetalheTributoAtual;
  ibs_cbs_bruto: DetalheIbsCbs;
  // Créditos
  creditos: CreditosDetalhe;
  // Carga líquida (após créditos)
  carga_atual_liquida: number;
  carga_nova_liquida: number;
  carga_total: number;
  // Economia ou aumento
  variacao: number; // positivo = aumento, negativo = economia
  variacao_pct: number;
  // Fase da transição
  fase: string;
}

export interface ResultadoSimulacao {
  empresa: string;
  cnpj: string;
  regime_tributario: string;
  faturamento_anual: number;
  // Resumo base (ano completo, sem transição)
  carga_atual_anual: number;
  carga_nova_anual: number;
  creditos_atuais_anual: number;
  creditos_novos_anual: number;
  // Detalhamento por ano da transição
  anos: ResultadoAno[];
  // Alertas e observações
  alertas: string[];
}

// ─── Motor de Cálculo ──────────────────────────────────────────────────────

/**
 * Calcula a alíquota efetiva IBS/CBS considerando regime diferenciado
 */
function aliquotaEfetiva(regime: RegimeDiferenciado): { cbs: number; ibs: number; total: number } {
  const fator = FATOR_REGIME[regime] ?? 1.0;
  return {
    cbs: ALIQUOTA_CBS_REF * fator,
    ibs: ALIQUOTA_IBS_REF * fator,
    total: ALIQUOTA_TOTAL_REF * fator,
  };
}

/**
 * Calcula tributos atuais mensais sobre produtos
 */
function calcularTributosAtuaisProdutos(produtos: ProdutoInput[]): Omit<DetalheTributoAtual, "iss" | "total"> & { faturamento: number } {
  let pis = 0, cofins = 0, ipi = 0, icms = 0, faturamento = 0;
  for (const p of produtos) {
    const v = p.valor_mensal;
    faturamento += v;
    pis += v * (p.aliquota_pis / 100);
    cofins += v * (p.aliquota_cofins / 100);
    ipi += v * (p.aliquota_ipi / 100);
    icms += v * (p.aliquota_icms / 100);
  }
  return { pis, cofins, ipi, icms, faturamento };
}

/**
 * Calcula tributos atuais mensais sobre serviços
 */
function calcularTributosAtuaisServicos(servicos: ServicoInput[]): { pis: number; cofins: number; iss: number; faturamento: number } {
  let pis = 0, cofins = 0, iss = 0, faturamento = 0;
  for (const s of servicos) {
    const v = s.valor_mensal;
    faturamento += v;
    pis += v * (s.aliquota_pis / 100);
    cofins += v * (s.aliquota_cofins / 100);
    iss += v * (s.aliquota_iss / 100);
  }
  return { pis, cofins, iss, faturamento };
}

/**
 * Calcula tributos IBS/CBS mensais sobre produtos
 */
function calcularIbsCbsProdutos(produtos: ProdutoInput[]): { cbs: number; ibs: number } {
  let cbs = 0, ibs = 0;
  for (const p of produtos) {
    const aliq = aliquotaEfetiva(p.regime_diferenciado as RegimeDiferenciado);
    cbs += p.valor_mensal * aliq.cbs;
    ibs += p.valor_mensal * aliq.ibs;
  }
  return { cbs, ibs };
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
 * Calcula créditos de aquisição no sistema atual e no novo sistema
 * 
 * No sistema atual: créditos limitados (PIS/COFINS cumulativo no Lucro Presumido,
 * não-cumulativo no Lucro Real; ICMS com restrições)
 * 
 * No novo sistema (IBS/CBS): não-cumulatividade plena — crédito amplo sobre
 * todas as aquisições tributadas (LC 214/2025, Art. 28 a 46)
 */
function calcularCreditos(
  creditos: CreditoInput[],
  regime: string,
): { atuais_mensal: number; novos_mensal: number } {
  let atuais = 0;
  let novos = 0;

  for (const c of creditos) {
    const v = c.valor_mensal;

    // Créditos no sistema atual dependem do regime tributário
    if (regime === "lucro_real") {
      // Lucro Real: PIS/COFINS não-cumulativo + créditos de ICMS/IPI
      atuais += v * ((c.aliquota_pis + c.aliquota_cofins + c.aliquota_icms + c.aliquota_ipi) / 100);
    } else if (regime === "lucro_presumido") {
      // Lucro Presumido: PIS/COFINS cumulativo (sem crédito), ICMS com restrições
      atuais += v * ((c.aliquota_icms * 0.5) / 100); // Crédito parcial de ICMS
    }
    // Simples Nacional: sem créditos no sistema atual

    // No novo sistema: crédito pleno sobre IBS/CBS pago nas aquisições
    // Alíquota de referência aplicada ao valor da aquisição
    novos += v * ALIQUOTA_TOTAL_REF;
  }

  return { atuais_mensal: atuais, novos_mensal: novos };
}

/**
 * Gera alertas baseados na situação da empresa
 */
function gerarAlertas(input: SimulacaoInput): string[] {
  const alertas: string[] = [];
  const { empresa, produtos, servicos } = input;

  if (empresa.optante_simples_mei) {
    alertas.push(
      "Empresa optante pelo Simples Nacional/MEI: poderá optar por recolher IBS/CBS dentro do Simples " +
      "ou migrar para o regime geral. A simulação considera o regime geral para comparação."
    );
  }

  if (empresa.regime_tributario === "lucro_presumido") {
    alertas.push(
      "No Lucro Presumido, PIS/COFINS são cumulativos (sem créditos). No novo sistema IBS/CBS, " +
      "todos os créditos serão aproveitáveis (não-cumulatividade plena), o que pode gerar economia significativa."
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

/**
 * Determina a fase da transição para exibição
 */
function faseTransicao(t: TransicaoAno): string {
  if (t.cbs_teste) return "Fase teste (CBS 0,9%)";
  if (t.ibs_pct < 1.0) return `Transição (IBS ${(t.ibs_pct * 100).toFixed(0)}%)`;
  return "Sistema novo integral";
}

// ─── Função Principal ──────────────────────────────────────────────────────

/**
 * Executa a simulação completa da reforma tributária para uma empresa
 */
export function executarSimulacao(input: SimulacaoInput): ResultadoSimulacao {
  const { empresa, produtos, servicos, creditos } = input;

  // 1. Calcular tributos mensais no sistema atual
  const tribProd = calcularTributosAtuaisProdutos(produtos);
  const tribServ = calcularTributosAtuaisServicos(servicos);

  const tributosAtuaisMensal: DetalheTributoAtual = {
    pis: tribProd.pis + tribServ.pis,
    cofins: tribProd.cofins + tribServ.cofins,
    ipi: tribProd.ipi,
    icms: tribProd.icms,
    iss: tribServ.iss,
    total: 0,
  };
  tributosAtuaisMensal.total =
    tributosAtuaisMensal.pis +
    tributosAtuaisMensal.cofins +
    tributosAtuaisMensal.ipi +
    tributosAtuaisMensal.icms +
    tributosAtuaisMensal.iss;

  // 2. Calcular IBS/CBS mensal no sistema novo (100%)
  const ibsCbsProd = calcularIbsCbsProdutos(produtos);
  const ibsCbsServ = calcularIbsCbsServicos(servicos);

  const ibsCbsMensal: DetalheIbsCbs = {
    cbs: ibsCbsProd.cbs + ibsCbsServ.cbs,
    ibs: ibsCbsProd.ibs + ibsCbsServ.ibs,
    total: 0,
  };
  ibsCbsMensal.total = ibsCbsMensal.cbs + ibsCbsMensal.ibs;

  // 3. Calcular créditos
  const cred = calcularCreditos(creditos, empresa.regime_tributario);

  // 4. Valores anuais base (sem transição)
  const cargaAtualAnual = tributosAtuaisMensal.total * 12;
  const cargaNovaAnual = ibsCbsMensal.total * 12;
  const creditosAtuaisAnual = cred.atuais_mensal * 12;
  const creditosNovosAnual = cred.novos_mensal * 12;

  // Carga líquida base para referência
  const cargaAtualLiquidaBase = cargaAtualAnual - creditosAtuaisAnual;

  // 5. Gerar resultados por ano da transição
  const anos: ResultadoAno[] = CRONOGRAMA_TRANSICAO.map((t) => {
    // Faturamento mensal total
    const fatMensal = tribProd.faturamento + tribServ.faturamento;

    // Tributos atuais no ano (reduzidos conforme transição)
    const fatorAtual = 1 - t.reducao_atual;
    const tribAtualAno: DetalheTributoAtual = {
      pis: tributosAtuaisMensal.pis * fatorAtual * 12,
      cofins: tributosAtuaisMensal.cofins * fatorAtual * 12,
      ipi: tributosAtuaisMensal.ipi * fatorAtual * 12,
      icms: tributosAtuaisMensal.icms * fatorAtual * 12,
      iss: tributosAtuaisMensal.iss * fatorAtual * 12,
      total: tributosAtuaisMensal.total * fatorAtual * 12,
    };

    // IBS/CBS no ano (proporcionais à transição)
    let cbsAno: number;
    if (t.cbs_teste) {
      // Fase teste: CBS é uma alíquota fixa de 0,9% sobre o faturamento
      cbsAno = fatMensal * t.cbs_pct * 12;
    } else {
      cbsAno = ibsCbsMensal.cbs * t.cbs_pct * 12;
    }
    const ibsAno = ibsCbsMensal.ibs * t.ibs_pct * 12;

    const ibsCbsAno: DetalheIbsCbs = {
      cbs: cbsAno,
      ibs: ibsAno,
      total: cbsAno + ibsAno,
    };

    // Créditos proporcionais
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
