import { TABELA_ANEXOS, PARTILHA_ATUAL, LIMITE_ISS, type FaixaSN, type PartilhaSN } from "./tabelas";
import type { AnexoSN, ComponentesTributos, MesReferencia } from "./tipos";

export function getFaixa(anexo: AnexoSN, rbt12: number): FaixaSN {
  const tabela = TABELA_ANEXOS[anexo];
  for (const faixa of tabela) {
    if (rbt12 <= faixa.ate) return faixa;
  }
  return tabela[tabela.length - 1];
}

export function calcularAliquotaEfetiva(rbt12: number, aliquota: number, deducao: number): number {
  if (rbt12 <= 0) return 0;
  const aliq = (rbt12 * aliquota - deducao) / rbt12;
  return Math.max(0, aliq);
}

export function calcularDAS(rbt_ano: number, aliqEfetiva: number): number {
  return rbt_ano * aliqEfetiva;
}

export function somarUltimos12Meses(dados: MesReferencia[], campo: keyof MesReferencia = "receita_bruta"): number {
  const ordenados = [...dados].sort((a, b) => a.competencia.localeCompare(b.competencia));
  const ult12 = ordenados.slice(-12);
  return ult12.reduce((acc, m) => acc + (Number((m as unknown as Record<string, unknown>)[campo as string] ?? 0) || 0), 0);
}

export function mediaMensal(dados: MesReferencia[], caminho: string): number {
  if (!dados.length) return 0;
  const soma = dados.reduce((acc, m) => acc + getNestedValue(m, caminho), 0);
  return soma / dados.length;
}

export function getNestedValue(obj: unknown, caminho: string): number {
  const parts = caminho.split(".");
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== "object") return 0;
    cur = (cur as Record<string, unknown>)[p];
  }
  return typeof cur === "number" && Number.isFinite(cur) ? cur : 0;
}

export function calcularFatorR(folha12m: number, rbt12: number): number {
  if (rbt12 <= 0) return 0;
  return folha12m / rbt12;
}

/**
 * Decompõe o DAS anual nos componentes conforme a partilha do Anexo.
 * Aplica limite ISS de 5% com redistribuição proporcional aos federais quando ultrapassado.
 */
export function decomporDAS(
  anexo: AnexoSN,
  faixa: FaixaSN,
  aliqEfetiva: number,
  receitaAnual: number,
): ComponentesTributos {
  const idx = Math.min(faixa.faixa, 5) - 1; // faixa 6 tratada fora
  const partilha: PartilhaSN = PARTILHA_ATUAL[anexo][idx];

  const das = receitaAnual * aliqEfetiva;

  let issFrac = partilha.iss ?? 0;
  const icmsFrac = partilha.icms ?? 0;
  const federaisFrac =
    (partilha.irpj ?? 0) +
    (partilha.csll ?? 0) +
    (partilha.cofins ?? 0) +
    (partilha.pis ?? 0) +
    (partilha.cpp ?? 0) +
    (partilha.ipi ?? 0);

  // Limite ISS 5%
  if (issFrac > 0) {
    const issEfetivo = aliqEfetiva * issFrac;
    if (issEfetivo > LIMITE_ISS && aliqEfetiva > 0) {
      const novoIssFrac = LIMITE_ISS / aliqEfetiva;
      const excedente = issFrac - novoIssFrac;
      issFrac = novoIssFrac;
      if (federaisFrac > 0) {
        const fatorRedist = 1 + excedente / federaisFrac;
        return build(fatorRedist, novoIssFrac, icmsFrac, partilha, das);
      }
    }
  }
  return build(1, issFrac, icmsFrac, partilha, das);
}

function build(fatorFed: number, issFrac: number, icmsFrac: number, p: PartilhaSN, das: number): ComponentesTributos {
  const comp: ComponentesTributos = {
    irpj: das * (p.irpj ?? 0) * fatorFed,
    csll: das * (p.csll ?? 0) * fatorFed,
    cofins: das * (p.cofins ?? 0) * fatorFed,
    pis: das * (p.pis ?? 0) * fatorFed,
    cpp: das * (p.cpp ?? 0) * fatorFed,
  };
  if (issFrac) comp.iss = das * issFrac;
  if (icmsFrac) comp.icms = das * icmsFrac;
  comp.das = (comp.irpj ?? 0) + (comp.csll ?? 0) + (comp.cofins ?? 0) + (comp.pis ?? 0) + (comp.cpp ?? 0) + (comp.iss ?? 0) + (comp.icms ?? 0);
  return comp;
}

export function somaComponentes(c: ComponentesTributos): number {
  return (
    (c.irpj ?? 0) +
    (c.csll ?? 0) +
    (c.pis ?? 0) +
    (c.cofins ?? 0) +
    (c.cpp ?? 0) +
    (c.inss_patronal ?? 0) +
    (c.icms ?? 0) +
    (c.iss ?? 0) +
    (c.cbs ?? 0) +
    (c.ibs ?? 0)
  );
}

export function derivarPercentualB2B(dados: MesReferencia[]): number {
  let b2b = 0;
  let b2c = 0;
  for (const m of dados) {
    b2b += m.receita_b2b ?? 0;
    b2c += m.receita_b2c ?? 0;
  }
  const total = b2b + b2c;
  if (total <= 0) return 0;
  return b2b / total;
}
