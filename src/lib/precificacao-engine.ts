/**
 * Engine de precificação por produto.
 *
 * Para cada produto e para um ano selecionado do CRONOGRAMA_TRANSICAO:
 *  - Cenário A "Manter preço": preço fica igual; mostra nova margem e a variação vs. hoje.
 *  - Cenário B "Preservar margem": calcula o novo preço necessário para manter a margem atual.
 *
 * Considera o ganho de crédito pleno na entrada (IBS/CBS recuperáveis) como redução de custo
 * efetivo no novo regime, conforme parâmetro `credito_entrada_pct` informado por produto.
 */

import {
  CRONOGRAMA_TRANSICAO,
  ALIQUOTA_CBS_REF,
  ALIQUOTA_IBS_REF,
  FATOR_REGIME,
  type RegimeDiferenciado,
  type TransicaoAno,
} from "@/lib/tax-engine";

export interface ProdutoPrecificacao {
  id: string;
  ncm: string;
  descricao: string;
  regime_diferenciado: string | null;
  aliquota_pis: number | null;
  aliquota_cofins: number | null;
  aliquota_ipi: number | null;
  aliquota_icms: number | null;
  aliquota_ibs: number | null;
  aliquota_cbs: number | null;
  reducao_aplicada: number | null;
}

export interface ConfigPrecificacao {
  preco_venda_atual: number;
  custo: number;
  /** Alíquota (em %) de crédito de entrada recuperável no novo regime (IBS+CBS sobre o custo). */
  credito_entrada_pct: number;
}

export interface CenarioPrecificacaoResultado {
  ano: number;
  fase: string;
  /** Alíquotas em decimal (0.0 — 1.0) */
  carga_atual_pct: number;
  carga_nova_pct: number;
  /** Margem operacional hoje, em decimal (sobre o preço). */
  margem_hoje: number;
  custo_efetivo_novo: number;
  /** Cenário A — manter preço. */
  cenario_a: {
    preco: number;
    nova_margem: number;
    variacao_margem_pp: number; // pontos percentuais
  };
  /** Cenário B — preservar margem. */
  cenario_b: {
    preco_necessario: number;
    reajuste_pct: number; // em decimal (0.05 = 5%)
    nova_margem: number;
    viavel: boolean; // false quando (1 - t_n - margem_hoje) <= 0 → margem impossível
  };
}

const pct = (v: number | null | undefined): number => (Number(v) || 0) / 100;

function regimeOf(p: ProdutoPrecificacao): RegimeDiferenciado {
  const r = (p.regime_diferenciado ?? "padrao") as RegimeDiferenciado;
  return r in FATOR_REGIME ? r : "padrao";
}

/** Carga atual (% sobre receita) considerando os fatores de extinção do ano. */
function cargaAtualAno(ano: TransicaoAno, p: ProdutoPrecificacao): number {
  return (
    pct(p.aliquota_pis) * ano.pis_cofins_fator +
    pct(p.aliquota_cofins) * ano.pis_cofins_fator +
    pct(p.aliquota_ipi) * ano.ipi_fator +
    pct(p.aliquota_icms) * ano.icms_iss_fator
  );
}

/** Alíquota CBS+IBS efetiva do produto no ano (% sobre receita). */
function cargaNovaAno(ano: TransicaoAno, p: ProdutoPrecificacao): number {
  if (ano.sem_incidencia_real) return 0;
  const regime = regimeOf(p);
  const fator = FATOR_REGIME[regime] ?? 1.0;
  const baseCbs = p.aliquota_cbs ? pct(p.aliquota_cbs) : ALIQUOTA_CBS_REF * fator;
  const baseIbs = p.aliquota_ibs ? pct(p.aliquota_ibs) : ALIQUOTA_IBS_REF * fator;
  const reducao = 1 - pct(p.reducao_aplicada);
  const cbsFatorReducao = ano.cbs_reducao_pp > 0 ? 1 - ano.cbs_reducao_pp / ALIQUOTA_CBS_REF : 1;
  const cbs = ano.cbs_teste ? ano.cbs_pct : baseCbs * ano.cbs_pct * cbsFatorReducao * reducao;
  const ibs = ano.ibs_teste ? ano.ibs_pct : baseIbs * ano.ibs_pct * reducao;
  return cbs + ibs;
}

export function calcularPrecificacao(
  produto: ProdutoPrecificacao,
  config: ConfigPrecificacao,
  anoAlvo: number,
): CenarioPrecificacaoResultado {
  const ano =
    CRONOGRAMA_TRANSICAO.find((a) => a.ano === anoAlvo) ??
    CRONOGRAMA_TRANSICAO[CRONOGRAMA_TRANSICAO.length - 1];

  const P = Math.max(0, Number(config.preco_venda_atual) || 0);
  const C = Math.max(0, Number(config.custo) || 0);
  const credEntrada = Math.max(0, Math.min(1, pct(config.credito_entrada_pct)));

  // Carga "hoje" = fatores de 2025 (todos os impostos atuais cheios, sem IBS/CBS).
  const t_hoje =
    pct(produto.aliquota_pis) +
    pct(produto.aliquota_cofins) +
    pct(produto.aliquota_ipi) +
    pct(produto.aliquota_icms);

  // Margem operacional hoje (sobre preço): (P - C - P·t_hoje) / P
  const margem_hoje = P > 0 ? (P - C - P * t_hoje) / P : 0;

  // Cenário do ano-alvo
  const t_a = cargaAtualAno(ano, produto); // tributos atuais ainda vigentes naquele ano
  const t_n = cargaNovaAno(ano, produto); // IBS+CBS daquele ano
  const t_total_novo = t_a + t_n;

  // Custo efetivo no novo regime: crédito pleno de entrada reduz o custo.
  // No ano de transição, considera-se proporcional à fração do IBS/CBS efetivamente arrecadada.
  const credProp = ano.sem_incidencia_real ? 0 : credEntrada * Math.max(ano.cbs_pct, ano.ibs_pct);
  const custo_efetivo_novo = C * (1 - credProp);

  // Cenário A — preço inalterado
  const nova_margem_A = P > 0 ? (P - custo_efetivo_novo - P * t_total_novo) / P : 0;

  // Cenário B — preservar margem_hoje
  // (P' - custo_efetivo_novo - P'·t_total_novo) / P' = margem_hoje
  // => P' (1 - t_total_novo - margem_hoje) = custo_efetivo_novo
  const denom = 1 - t_total_novo - margem_hoje;
  const viavel = denom > 0.0001 && custo_efetivo_novo >= 0;
  const preco_necessario = viavel ? custo_efetivo_novo / denom : 0;
  const reajuste_pct = P > 0 && viavel ? (preco_necessario - P) / P : 0;
  const nova_margem_B = viavel ? margem_hoje : 0;

  return {
    ano: ano.ano,
    fase: ano.sem_incidencia_real ? "Teste (sem incidência)" : "Em transição",
    carga_atual_pct: t_a,
    carga_nova_pct: t_n,
    margem_hoje,
    custo_efetivo_novo,
    cenario_a: {
      preco: P,
      nova_margem: nova_margem_A,
      variacao_margem_pp: (nova_margem_A - margem_hoje) * 100,
    },
    cenario_b: {
      preco_necessario,
      reajuste_pct,
      nova_margem: nova_margem_B,
      viavel,
    },
  };
}

export const ANOS_PRECIFICACAO = CRONOGRAMA_TRANSICAO.map((a) => a.ano);
