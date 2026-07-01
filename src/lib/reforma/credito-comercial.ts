import type { ResultadoCenario } from "./tipos";

/**
 * Crédito comercial que o comprador (contribuinte de CBS/IBS ou PIS/Cofins não-cumulativo)
 * aproveita ao adquirir do cliente SN/LP.
 *
 * - SN Atual: 0 (não gera crédito destacado).
 * - SN "Por Dentro": (CBS+IBS embutidos)/Receita.
 * - SN Híbrido: alíquota cheia de CBS+IBS, pois é destacada.
 * - LP 2026: 9,25% (PIS+Cofins não-cumulativos).
 * - LP 2027: alíquota cheia CBS+IBS.
 */
export function calcularCreditoComercial(cenario: ResultadoCenario, receitaAnual: number): number {
  if (receitaAnual <= 0) return 0;
  const cbs = cenario.componentes.cbs ?? 0;
  const ibs = cenario.componentes.ibs ?? 0;
  const pis = cenario.componentes.pis ?? 0;
  const cofins = cenario.componentes.cofins ?? 0;

  switch (cenario.cenario) {
    case "SN_ATUAL":
      return 0;
    case "SN_POR_DENTRO_2027":
      return (cbs + ibs) / receitaAnual;
    case "SN_HIBRIDO_2027":
      return (cbs + ibs) / receitaAnual;
    case "LP_2026":
      return (pis + cofins) / receitaAnual;
    case "LP_2027":
      return (cbs + ibs) / receitaAnual;
    default:
      return 0;
  }
}
