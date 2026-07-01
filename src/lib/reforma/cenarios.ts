import type {
  Alerta,
  ComponentesTributos,
  DadosCliente,
  MesFolha,
  MesIcmsLP,
  Parametros,
  ResultadoCenario,
} from "./tipos";
import {
  calcularAliquotaEfetiva,
  decomporDAS,
  derivarPercentualB2B,
  getFaixa,
  somaComponentes,
} from "./auxiliares";
import { calcularCreditoComercial } from "./credito-comercial";

function receitaAnual(cliente: DadosCliente): number {
  return cliente.dados_mensais.reduce((s, m) => s + (m.receita_bruta ?? 0), 0);
}

function baseEntradasAnual(cliente: DadosCliente): number {
  return cliente.dados_mensais.reduce((s, m) => s + (m.base_entradas_creditaveis ?? 0), 0);
}

function inssPatronal(folha: MesFolha[] | undefined, params: Parametros): number {
  if (!folha?.length) return 0;
  const baseAnual = folha.reduce(
    (s, m) => s + m.base_inss_empregados + m.base_inss_contribuintes + m.pro_labore,
    0,
  );
  return baseAnual * (0.2 + params.percentual_rat + params.percentual_terceiros);
}

function icmsLPAnual(icms: MesIcmsLP[] | undefined): number {
  if (!icms?.length) return 0;
  return icms.reduce((s, m) => s + (m.icms_apurado ?? 0), 0);
}

/* ---------------- Cenário 1: SN Atual ---------------- */
export function simularSimplesNacionalAtual(
  cliente: DadosCliente,
  _params: Parametros,
): ResultadoCenario {
  const alertas: Alerta[] = [];
  const rbt12 = cliente.rbt12;
  const receita = receitaAnual(cliente);
  const faixa = getFaixa(cliente.anexo, rbt12);
  const aliqEfetiva = calcularAliquotaEfetiva(rbt12, faixa.aliquota, faixa.deducao);
  const componentes = decomporDAS(cliente.anexo, faixa, aliqEfetiva, receita);
  const total = somaComponentes(componentes);

  return {
    cenario: "SN_ATUAL",
    rotulo: "Simples Nacional (atual)",
    receita_bruta_anual: receita,
    componentes,
    total_tributos: total,
    carga_efetiva: receita > 0 ? total / receita : 0,
    credito_comprador_percentual: 0,
    alertas,
    detalhes: { aliquota_efetiva: aliqEfetiva, faixa: faixa.faixa },
  };
}

/* ---------------- Cenário 2: SN "Por Dentro" 2027 ---------------- */
export function simularSimplesPorDentro2027(
  cliente: DadosCliente,
  params: Parametros,
): ResultadoCenario {
  const base = simularSimplesNacionalAtual(cliente, params);
  const c = { ...base.componentes };

  const pisCofins = (c.pis ?? 0) + (c.cofins ?? 0);
  const cbsIbs = pisCofins * params.fracao_cbs_dentro_pis_cofins;
  const totalRef = params.aliquota_cbs_referencia + params.aliquota_ibs_2027_2028;
  const fracaoCbs = totalRef > 0 ? params.aliquota_cbs_referencia / totalRef : 1;
  c.pis = 0;
  c.cofins = 0;
  c.cbs = cbsIbs * fracaoCbs;
  c.ibs = cbsIbs * (1 - fracaoCbs);
  c.das = (c.das ?? 0) - pisCofins + cbsIbs;

  const total = somaComponentes(c);
  const receita = base.receita_bruta_anual;
  const resultado: ResultadoCenario = {
    cenario: "SN_POR_DENTRO_2027",
    rotulo: "Simples Nacional 2027 (por dentro)",
    receita_bruta_anual: receita,
    componentes: c,
    total_tributos: total,
    carga_efetiva: receita > 0 ? total / receita : 0,
    credito_comprador_percentual: 0,
    alertas: [],
    detalhes: { ...base.detalhes },
  };
  resultado.credito_comprador_percentual = calcularCreditoComercial(resultado, receita);
  return resultado;
}

/* ---------------- Cenário 3: SN Híbrido 2027 ---------------- */
export function simularSimplesHibrido2027(
  cliente: DadosCliente,
  params: Parametros,
): ResultadoCenario {
  const base = simularSimplesNacionalAtual(cliente, params);
  const c: ComponentesTributos = { ...base.componentes };

  const pisCofins = (c.pis ?? 0) + (c.cofins ?? 0);
  c.pis = 0;
  c.cofins = 0;
  c.das = (c.das ?? 0) - pisCofins;

  const receita = base.receita_bruta_anual;
  const baseSemIcms = receita * (1 - params.percentual_icms_medio);
  const baseEntradas = baseEntradasAnual(cliente);

  const debitoCbs = baseSemIcms * params.aliquota_cbs_referencia;
  const creditoCbs = baseEntradas * params.aliquota_cbs_referencia;
  const debitoIbs = baseSemIcms * params.aliquota_ibs_2027_2028;
  const creditoIbs = baseEntradas * params.aliquota_ibs_2027_2028;

  c.cbs = Math.max(0, debitoCbs - creditoCbs);
  c.ibs = Math.max(0, debitoIbs - creditoIbs);

  const total = somaComponentes(c);
  const resultado: ResultadoCenario = {
    cenario: "SN_HIBRIDO_2027",
    rotulo: "Simples Nacional 2027 (híbrido)",
    receita_bruta_anual: receita,
    componentes: c,
    total_tributos: total,
    carga_efetiva: receita > 0 ? total / receita : 0,
    credito_comprador_percentual: 0,
    alertas: [],
    detalhes: { ...base.detalhes, base_sem_icms: baseSemIcms, base_entradas: baseEntradas },
  };
  resultado.credito_comprador_percentual =
    params.aliquota_cbs_referencia + params.aliquota_ibs_2027_2028;
  return resultado;
}

/* ---------------- Cenários 4/5: Lucro Presumido ---------------- */
export function simularLucroPresumido(
  cliente: DadosCliente,
  params: Parametros,
  opts: { comReforma: boolean },
): ResultadoCenario {
  const alertas: Alerta[] = [];
  const receita = receitaAnual(cliente);
  const atividade = cliente.atividade_lp ?? "servicos";
  const presIrpj =
    atividade === "servicos"
      ? params.percentual_presuncao_irpj_servicos
      : params.percentual_presuncao_irpj_comercio;
  const presCsll =
    atividade === "servicos"
      ? params.percentual_presuncao_csll_servicos
      : params.percentual_presuncao_csll_comercio;

  const baseIrpj = receita * presIrpj;
  const baseCsll = receita * presCsll;

  const irpjBase = baseIrpj * 0.15;
  const excedente = Math.max(0, baseIrpj - 240_000);
  const irpjAdicional = excedente * 0.10;
  const irpj = irpjBase + irpjAdicional;
  const csll = baseCsll * 0.09;

  const componentes: ComponentesTributos = {
    irpj,
    csll,
    inss_patronal: inssPatronal(cliente.folha_mensal, params),
    icms: icmsLPAnual(cliente.icms_lp_mensal),
  };

  if (!opts.comReforma) {
    componentes.pis = receita * 0.0065;
    componentes.cofins = receita * 0.03;
  } else {
    const baseSemIcms = receita * (1 - params.percentual_icms_medio);
    const baseEntradas = baseEntradasAnual(cliente);
    componentes.cbs = Math.max(
      0,
      (baseSemIcms - baseEntradas) * params.aliquota_cbs_referencia,
    );
    componentes.ibs = Math.max(
      0,
      (baseSemIcms - baseEntradas) * params.aliquota_ibs_2027_2028,
    );
  }

  if (!cliente.icms_lp_mensal?.length) {
    alertas.push({
      nivel: "warn",
      codigo: "LP_ICMS_AUSENTE",
      mensagem: "ICMS mensal do LP não informado; cenário assumiu ICMS = 0.",
    });
  }
  if (!cliente.folha_mensal?.length) {
    alertas.push({
      nivel: "warn",
      codigo: "LP_FOLHA_AUSENTE",
      mensagem: "Folha mensal não informada; INSS Patronal = 0.",
    });
  }

  const total = somaComponentes(componentes);
  const resultado: ResultadoCenario = {
    cenario: opts.comReforma ? "LP_2027" : "LP_2026",
    rotulo: opts.comReforma ? "Lucro Presumido 2027 (reforma)" : "Lucro Presumido 2026",
    receita_bruta_anual: receita,
    componentes,
    total_tributos: total,
    carga_efetiva: receita > 0 ? total / receita : 0,
    credito_comprador_percentual: 0,
    alertas,
    detalhes: { presuncao_irpj: presIrpj, presuncao_csll: presCsll },
  };
  resultado.credito_comprador_percentual = calcularCreditoComercial(resultado, receita);
  return resultado;
}

export { derivarPercentualB2B };
