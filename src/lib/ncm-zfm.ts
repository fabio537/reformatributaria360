/**
 * NCMs com incidência de IPI mantida pós-2027 — Zona Franca de Manaus
 *
 * Conforme EC 132/2023, Art. 126, §3º, o IPI é reduzido a zero para todos os
 * produtos EXCETO aqueles cujos NCMs correspondem a setores industriais com
 * produção na Zona Franca de Manaus (ZFM), para preservar a competitividade.
 *
 * Esta lista contém os PREFIXOS de NCM (capítulos/posições do TIPI) que
 * mantêm incidência de IPI. A lista é baseada nos principais setores
 * industriais do Polo Industrial de Manaus (PIM).
 *
 * Referências:
 * - Decreto nº 10.979/2022 (TIPI)
 * - Suframa — Modelo ZFM
 * - EC 132/2023, Arts. 92-A, 126, §3º
 */

/**
 * Prefixos de NCM (2 ou 4 dígitos) de setores com produção na ZFM.
 * Produtos cujo NCM começa com esses prefixos MANTÊM a incidência de IPI.
 */
const NCM_PREFIXOS_ZFM: { prefixo: string; setor: string }[] = [
  // ── Polo Eletroeletrônico (maior setor do PIM) ──
  { prefixo: "8471", setor: "Informática (computadores, tablets)" },
  { prefixo: "8473", setor: "Partes e acessórios de informática" },
  { prefixo: "8517", setor: "Telefones celulares e smartphones" },
  { prefixo: "8518", setor: "Microfones, alto-falantes, amplificadores" },
  { prefixo: "8519", setor: "Aparelhos de gravação/reprodução de som" },
  { prefixo: "8521", setor: "Aparelhos de gravação/reprodução de vídeo" },
  { prefixo: "8525", setor: "Câmeras, transmissores de TV" },
  { prefixo: "8527", setor: "Receptores de radiodifusão" },
  { prefixo: "8528", setor: "Monitores e televisores" },
  { prefixo: "8529", setor: "Partes de aparelhos de TV, rádio" },
  { prefixo: "8531", setor: "Aparelhos elétricos de sinalização acústica/visual" },
  { prefixo: "8534", setor: "Circuitos impressos" },
  { prefixo: "8541", setor: "Diodos, transistores, semicondutores" },
  { prefixo: "8542", setor: "Circuitos integrados" },
  { prefixo: "8543", setor: "Máquinas e aparelhos elétricos diversos" },

  // ── Polo Duas Rodas ──
  { prefixo: "8711", setor: "Motocicletas" },
  { prefixo: "8712", setor: "Bicicletas" },
  { prefixo: "8714", setor: "Partes de motocicletas e bicicletas" },

  // ── Polo de Bebidas ──
  { prefixo: "2201", setor: "Águas minerais e gaseificadas" },
  { prefixo: "2202", setor: "Bebidas não alcoólicas (refrigerantes, sucos)" },

  // ── Polo Químico ──
  { prefixo: "3304", setor: "Produtos de beleza e maquiagem" },
  { prefixo: "3305", setor: "Preparações capilares" },
  { prefixo: "3306", setor: "Preparações para higiene bucal" },
  { prefixo: "3307", setor: "Preparações para barbear, desodorantes" },
  { prefixo: "3401", setor: "Sabões e detergentes" },

  // ── Polo de Plásticos ──
  { prefixo: "3923", setor: "Artigos de plástico para embalagem" },
  { prefixo: "3924", setor: "Artigos de plástico para uso doméstico" },

  // ── Polo de Componentes ──
  { prefixo: "8504", setor: "Transformadores, conversores, fontes de alimentação" },
  { prefixo: "8506", setor: "Pilhas e baterias" },
  { prefixo: "8507", setor: "Acumuladores elétricos (baterias recarregáveis)" },
  { prefixo: "8544", setor: "Fios, cabos e condutores elétricos" },

  // ── Polo Metalúrgico ──
  { prefixo: "7607", setor: "Folhas e tiras de alumínio" },
  { prefixo: "7612", setor: "Recipientes de alumínio (latas)" },

  // ── Polo Relojoeiro ──
  { prefixo: "9101", setor: "Relógios de pulso" },
  { prefixo: "9102", setor: "Relógios de pulso (não elétricos)" },
  { prefixo: "9108", setor: "Mecanismos de relojoaria" },

  // ── Polo Óptico ──
  { prefixo: "9001", setor: "Fibras ópticas, lentes" },
  { prefixo: "9002", setor: "Lentes montadas" },
  { prefixo: "9004", setor: "Óculos" },

  // ── Polo de Jogos e Brinquedos ──
  { prefixo: "9504", setor: "Consoles de videogames" },
  { prefixo: "9503", setor: "Brinquedos" },
];

/**
 * Verifica se um NCM pertence a um setor com produção na ZFM.
 * Produtos com NCM de ZFM mantêm incidência de IPI após 2027.
 *
 * @param ncm - Código NCM do produto (8 dígitos, pode conter pontos)
 * @returns Objeto com resultado da verificação e setor identificado
 */
export function verificarNcmZfm(ncm: string): { isZfm: boolean; setor: string | null } {
  // Normalizar: remover pontos, espaços e traços
  const ncmNorm = ncm.replace(/[\s.\-/]/g, "");

  if (ncmNorm.length < 4) {
    return { isZfm: false, setor: null };
  }

  // Verificar se o NCM começa com algum prefixo ZFM
  for (const entry of NCM_PREFIXOS_ZFM) {
    if (ncmNorm.startsWith(entry.prefixo)) {
      return { isZfm: true, setor: entry.setor };
    }
  }

  return { isZfm: false, setor: null };
}

/**
 * Retorna a lista completa de setores ZFM para exibição
 */
export function listarSetoresZfm(): { prefixo: string; setor: string }[] {
  return [...NCM_PREFIXOS_ZFM];
}
