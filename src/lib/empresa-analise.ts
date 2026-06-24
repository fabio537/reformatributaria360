import {
  CRONOGRAMA_TRANSICAO,
  ALIQUOTA_CBS_REF,
  ALIQUOTA_IBS_REF,
  FATOR_REGIME,
  type RegimeDiferenciado,
  type TransicaoAno,
} from "@/lib/tax-engine";

export interface ProdutoLinha {
  id: string;
  ncm: string;
  descricao: string;
  valor_mensal: number | null;
  competencia: string | null;
  regime_diferenciado: string | null;
  aliquota_pis: number | null;
  aliquota_cofins: number | null;
  aliquota_ipi: number | null;
  aliquota_icms: number | null;
  aliquota_ibs: number | null;
  aliquota_cbs: number | null;
  reducao_aplicada: number | null;
}

export interface ServicoLinha {
  id: string;
  descricao: string;
  valor_mensal: number | null;
  competencia: string | null;
  regime_diferenciado: string | null;
  aliquota_pis: number | null;
  aliquota_cofins: number | null;
  aliquota_iss: number | null;
  aliquota_ibs: number | null;
  aliquota_cbs: number | null;
}

export interface CenarioAno {
  ano: number;
  carga_atual: number;
  carga_nova: number;
  variacao: number;
  variacao_pct: number;
  fase: string;
}

export interface NcmAgregado {
  ncm: string;
  descricao: string;
  qtd_itens: number;
  valor_anual: number;
  carga_atual: number;
  carga_projetada: number;
  variacao: number;
  variacao_pct: number;
  regime: string;
}

const pct = (v: number | null | undefined): number => (Number(v) || 0) / 100;
const num = (v: number | null | undefined): number => Number(v) || 0;

function regimeDeProduto(p: { regime_diferenciado: string | null }): RegimeDiferenciado {
  const r = (p.regime_diferenciado ?? "padrao") as RegimeDiferenciado;
  return r in FATOR_REGIME ? r : "padrao";
}

/** Calcula alíquotas CBS/IBS para um produto em um ano específico do cronograma. */
function aliquotaCbsIbsAno(
  ano: TransicaoAno,
  regime: RegimeDiferenciado,
  aliquotaCbsManual: number | null,
  aliquotaIbsManual: number | null,
  reducaoPct: number | null,
): { cbs: number; ibs: number } {
  const fator = FATOR_REGIME[regime] ?? 1.0;
  const baseCbs = aliquotaCbsManual ? pct(aliquotaCbsManual) : ALIQUOTA_CBS_REF * fator;
  const baseIbs = aliquotaIbsManual ? pct(aliquotaIbsManual) : ALIQUOTA_IBS_REF * fator;
  const reducao = 1 - pct(reducaoPct);

  const cbsFatorReducao = ano.cbs_reducao_pp > 0 ? 1 - ano.cbs_reducao_pp / ALIQUOTA_CBS_REF : 1;
  const cbs = ano.cbs_teste ? ano.cbs_pct : baseCbs * ano.cbs_pct * cbsFatorReducao * reducao;
  const ibs = ano.ibs_teste ? ano.ibs_pct : baseIbs * ano.ibs_pct * reducao;
  return { cbs, ibs };
}

/** Carga atual unitária aplicando fatores do ano (extinção gradual). */
function cargaAtualAno(
  ano: TransicaoAno,
  aliqPis: number,
  aliqCofins: number,
  aliqIpi: number,
  aliqIcmsIss: number,
): number {
  return (
    aliqPis * ano.pis_cofins_fator +
    aliqCofins * ano.pis_cofins_fator +
    aliqIpi * ano.ipi_fator +
    aliqIcmsIss * ano.icms_iss_fator
  );
}

/**
 * Agrega produtos+serviços e aplica CRONOGRAMA_TRANSICAO ano-a-ano (2026–2033).
 * Filtra por anoCompetencia quando informado.
 */
export function calcularCenarioAnual(
  produtos: ProdutoLinha[],
  servicos: ServicoLinha[],
  anoCompetencia?: number,
): CenarioAno[] {
  const filtroComp = (comp: string | null) => {
    if (!anoCompetencia) return true;
    if (!comp) return false;
    return new Date(comp).getFullYear() === anoCompetencia;
  };
  const prods = produtos.filter((p) => filtroComp(p.competencia));
  const servs = servicos.filter((s) => filtroComp(s.competencia));

  return CRONOGRAMA_TRANSICAO.map((ano) => {
    let cargaAtual = 0;
    let cargaNova = 0;

    for (const p of prods) {
      const valorAnual = num(p.valor_mensal) * 12;
      if (valorAnual <= 0) continue;
      const regime = regimeDeProduto(p);
      const atualPct = cargaAtualAno(
        ano,
        pct(p.aliquota_pis),
        pct(p.aliquota_cofins),
        pct(p.aliquota_ipi),
        pct(p.aliquota_icms),
      );
      cargaAtual += atualPct * valorAnual;

      if (!ano.sem_incidencia_real) {
        const { cbs, ibs } = aliquotaCbsIbsAno(
          ano,
          regime,
          p.aliquota_cbs,
          p.aliquota_ibs,
          p.reducao_aplicada,
        );
        cargaNova += (cbs + ibs) * valorAnual;
      }
    }

    for (const s of servs) {
      const valorAnual = num(s.valor_mensal) * 12;
      if (valorAnual <= 0) continue;
      const regime = regimeDeProduto(s);
      const atualPct = cargaAtualAno(
        ano,
        pct(s.aliquota_pis),
        pct(s.aliquota_cofins),
        0,
        pct(s.aliquota_iss),
      );
      cargaAtual += atualPct * valorAnual;
      if (!ano.sem_incidencia_real) {
        const { cbs, ibs } = aliquotaCbsIbsAno(ano, regime, s.aliquota_cbs, s.aliquota_ibs, null);
        cargaNova += (cbs + ibs) * valorAnual;
      }
    }

    const variacao = cargaNova - cargaAtual;
    const variacaoPct = cargaAtual > 0 ? (variacao / cargaAtual) * 100 : 0;
    return {
      ano: ano.ano,
      carga_atual: cargaAtual,
      carga_nova: cargaNova,
      variacao,
      variacao_pct: variacaoPct,
      fase: ano.sem_incidencia_real ? "Teste (sem incidência)" : "Em transição",
    };
  });
}

/**
 * Agrupa produtos por NCM e calcula carga atual vs projetada (2033 — regime pleno).
 */
export function agruparPorNcm(
  produtos: ProdutoLinha[],
  anoCompetencia?: number,
): NcmAgregado[] {
  const filtroComp = (comp: string | null) => {
    if (!anoCompetencia) return true;
    if (!comp) return false;
    return new Date(comp).getFullYear() === anoCompetencia;
  };
  const ano2033 = CRONOGRAMA_TRANSICAO[CRONOGRAMA_TRANSICAO.length - 1];

  const grupos = new Map<string, ProdutoLinha[]>();
  for (const p of produtos.filter((p) => filtroComp(p.competencia))) {
    const key = p.ncm || "—";
    const arr = grupos.get(key) ?? [];
    arr.push(p);
    grupos.set(key, arr);
  }

  const out: NcmAgregado[] = [];
  grupos.forEach((items, ncm) => {
    let valorAnual = 0;
    let cargaAtual = 0;
    let cargaProj = 0;
    const regimeRef = regimeDeProduto(items[0]);
    let descricao = items[0].descricao;

    for (const p of items) {
      const va = num(p.valor_mensal) * 12;
      if (va <= 0) continue;
      valorAnual += va;
      const atualPct =
        pct(p.aliquota_pis) +
        pct(p.aliquota_cofins) +
        pct(p.aliquota_ipi) +
        pct(p.aliquota_icms);
      cargaAtual += atualPct * va;

      const regime = regimeDeProduto(p);
      const { cbs, ibs } = aliquotaCbsIbsAno(
        ano2033,
        regime,
        p.aliquota_cbs,
        p.aliquota_ibs,
        p.reducao_aplicada,
      );
      cargaProj += (cbs + ibs) * va;
    }

    if (items.length > 1) descricao = `${items[0].descricao} (+${items.length - 1})`;

    const variacao = cargaProj - cargaAtual;
    const variacaoPct = cargaAtual > 0 ? (variacao / cargaAtual) * 100 : 0;
    out.push({
      ncm,
      descricao,
      qtd_itens: items.length,
      valor_anual: valorAnual,
      carga_atual: cargaAtual,
      carga_projetada: cargaProj,
      variacao,
      variacao_pct: variacaoPct,
      regime: regimeRef,
    });
  });

  return out;
}

export function anosCompetenciaDisponiveis(
  produtos: ProdutoLinha[],
  servicos: ServicoLinha[],
): number[] {
  const set = new Set<number>();
  [...produtos, ...servicos].forEach((r) => {
    if (r.competencia) {
      const y = new Date(r.competencia).getFullYear();
      if (Number.isFinite(y)) set.add(y);
    }
  });
  return Array.from(set).sort();
}
