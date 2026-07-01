// Tabelas dos Anexos do Simples Nacional.
// Todos os valores conforme LC 123/2006. Partilhas conforme CGSN 140/2018.
// TODO revalidar partilhas dos Anexos III/IV/V com CGSN 140/2018 antes de produção.

import type { AnexoSN } from "./tipos";

export interface FaixaSN {
  faixa: 1 | 2 | 3 | 4 | 5 | 6;
  ate: number;
  aliquota: number;
  deducao: number;
}

export const TABELA_ANEXOS: Record<AnexoSN, FaixaSN[]> = {
  I: [
    { faixa: 1, ate: 180_000, aliquota: 0.04, deducao: 0 },
    { faixa: 2, ate: 360_000, aliquota: 0.073, deducao: 5_940 },
    { faixa: 3, ate: 720_000, aliquota: 0.095, deducao: 13_860 },
    { faixa: 4, ate: 1_800_000, aliquota: 0.107, deducao: 22_500 },
    { faixa: 5, ate: 3_600_000, aliquota: 0.143, deducao: 87_300 },
    { faixa: 6, ate: 4_800_000, aliquota: 0.19, deducao: 378_000 },
  ],
  II: [
    { faixa: 1, ate: 180_000, aliquota: 0.045, deducao: 0 },
    { faixa: 2, ate: 360_000, aliquota: 0.078, deducao: 5_940 },
    { faixa: 3, ate: 720_000, aliquota: 0.10, deducao: 13_860 },
    { faixa: 4, ate: 1_800_000, aliquota: 0.112, deducao: 22_500 },
    { faixa: 5, ate: 3_600_000, aliquota: 0.147, deducao: 85_500 },
    { faixa: 6, ate: 4_800_000, aliquota: 0.30, deducao: 720_000 },
  ],
  III: [
    { faixa: 1, ate: 180_000, aliquota: 0.06, deducao: 0 },
    { faixa: 2, ate: 360_000, aliquota: 0.112, deducao: 9_360 },
    { faixa: 3, ate: 720_000, aliquota: 0.135, deducao: 17_640 },
    { faixa: 4, ate: 1_800_000, aliquota: 0.16, deducao: 35_640 },
    { faixa: 5, ate: 3_600_000, aliquota: 0.21, deducao: 125_640 },
    { faixa: 6, ate: 4_800_000, aliquota: 0.33, deducao: 648_000 },
  ],
  IV: [
    { faixa: 1, ate: 180_000, aliquota: 0.045, deducao: 0 },
    { faixa: 2, ate: 360_000, aliquota: 0.09, deducao: 8_100 },
    { faixa: 3, ate: 720_000, aliquota: 0.102, deducao: 12_420 },
    { faixa: 4, ate: 1_800_000, aliquota: 0.14, deducao: 39_780 },
    { faixa: 5, ate: 3_600_000, aliquota: 0.22, deducao: 183_780 },
    { faixa: 6, ate: 4_800_000, aliquota: 0.33, deducao: 828_000 },
  ],
  V: [
    { faixa: 1, ate: 180_000, aliquota: 0.155, deducao: 0 },
    { faixa: 2, ate: 360_000, aliquota: 0.18, deducao: 4_500 },
    { faixa: 3, ate: 720_000, aliquota: 0.195, deducao: 9_900 },
    { faixa: 4, ate: 1_800_000, aliquota: 0.205, deducao: 17_100 },
    { faixa: 5, ate: 3_600_000, aliquota: 0.23, deducao: 62_100 },
    { faixa: 6, ate: 4_800_000, aliquota: 0.305, deducao: 540_000 },
  ],
};

export interface PartilhaSN {
  irpj: number;
  csll: number;
  cofins: number;
  pis: number;
  cpp: number;
  icms?: number;
  iss?: number;
  ipi?: number;
}

/** Partilha atual (pré-reforma) por Anexo, faixas 1..5. Faixa 6 tratada à parte. */
export const PARTILHA_ATUAL: Record<AnexoSN, PartilhaSN[]> = {
  I: [
    { irpj: 0.055, csll: 0.035, cofins: 0.1274, pis: 0.0276, cpp: 0.415, icms: 0.34 },
    { irpj: 0.055, csll: 0.035, cofins: 0.1274, pis: 0.0276, cpp: 0.415, icms: 0.34 },
    { irpj: 0.055, csll: 0.035, cofins: 0.1274, pis: 0.0276, cpp: 0.415, icms: 0.335 },
    { irpj: 0.055, csll: 0.035, cofins: 0.1274, pis: 0.0276, cpp: 0.42, icms: 0.335 },
    { irpj: 0.055, csll: 0.035, cofins: 0.1274, pis: 0.0276, cpp: 0.42, icms: 0.335 },
  ],
  II: [
    { irpj: 0.055, csll: 0.035, cofins: 0.1151, pis: 0.0249, cpp: 0.375, icms: 0.32, ipi: 0.075 },
    { irpj: 0.055, csll: 0.035, cofins: 0.1151, pis: 0.0249, cpp: 0.375, icms: 0.32, ipi: 0.075 },
    { irpj: 0.055, csll: 0.035, cofins: 0.1151, pis: 0.0249, cpp: 0.375, icms: 0.32, ipi: 0.075 },
    { irpj: 0.055, csll: 0.035, cofins: 0.1151, pis: 0.0249, cpp: 0.375, icms: 0.32, ipi: 0.075 },
    { irpj: 0.055, csll: 0.035, cofins: 0.1151, pis: 0.0249, cpp: 0.375, icms: 0.32, ipi: 0.075 },
  ],
  III: [
    { irpj: 0.04, csll: 0.035, cofins: 0.1282, pis: 0.0278, cpp: 0.434, iss: 0.335 },
    { irpj: 0.04, csll: 0.035, cofins: 0.1405, pis: 0.0305, cpp: 0.434, iss: 0.32 },
    { irpj: 0.04, csll: 0.035, cofins: 0.1364, pis: 0.0296, cpp: 0.434, iss: 0.325 },
    { irpj: 0.04, csll: 0.035, cofins: 0.1364, pis: 0.0296, cpp: 0.434, iss: 0.325 },
    { irpj: 0.04, csll: 0.035, cofins: 0.1282, pis: 0.0278, cpp: 0.434, iss: 0.335 },
  ],
  IV: [
    { irpj: 0.18, csll: 0.152, cofins: 0.1703, pis: 0.0369, cpp: 0, iss: 0.44 },
    { irpj: 0.19, csll: 0.15, cofins: 0.1703, pis: 0.0369, cpp: 0, iss: 0.44 },
    { irpj: 0.20, csll: 0.15, cofins: 0.1703, pis: 0.0369, cpp: 0, iss: 0.43 },
    { irpj: 0.17, csll: 0.15, cofins: 0.1903, pis: 0.0413, cpp: 0, iss: 0.44 },
    { irpj: 0.235, csll: 0.15, cofins: 0.1613, pis: 0.035, cpp: 0, iss: 0.4187 },
  ],
  V: [
    { irpj: 0.25, csll: 0.15, cofins: 0.1410, pis: 0.0310, cpp: 0.2885, iss: 0.14 },
    { irpj: 0.23, csll: 0.15, cofins: 0.1410, pis: 0.0310, cpp: 0.2785, iss: 0.17 },
    { irpj: 0.24, csll: 0.15, cofins: 0.1492, pis: 0.0326, cpp: 0.2382, iss: 0.19 },
    { irpj: 0.21, csll: 0.15, cofins: 0.1410, pis: 0.0310, cpp: 0.2885, iss: 0.21 },
    { irpj: 0.23, csll: 0.125, cofins: 0.1410, pis: 0.0310, cpp: 0.2354, iss: 0.235 },
  ],
};

/** Limite ISS 5% conforme LC 123/2006 art. 18, §5º-C/D. */
export const LIMITE_ISS = 0.05;
