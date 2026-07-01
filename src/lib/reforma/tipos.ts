// Tipos do simulador de reforma tributária (Simples Nacional)
// Baseado nos documentos 02 (Modelo de Dados) e 03 (Motor de Cálculo).
// Importado do projeto Simples Navigator.

export type AnexoSN = "I" | "II" | "III" | "IV" | "V";

export type CenarioId =
  | "SN_ATUAL"
  | "SN_POR_DENTRO_2027"
  | "SN_HIBRIDO_2027"
  | "LP_2026"
  | "LP_2027";

export interface MesReferencia {
  /** AAAA-MM */
  competencia: string;
  receita_bruta: number;
  receita_b2b?: number;
  receita_b2c?: number;
  das_total?: number;
  das_componentes?: {
    irpj?: number;
    csll?: number;
    pis?: number;
    cofins?: number;
    cpp?: number;
    icms?: number;
    iss?: number;
  };
  /** Compras / entradas com direito a crédito (base sem ICMS) */
  base_entradas_creditaveis?: number;
}

export interface MesFolha {
  competencia: string;
  base_inss_empregados: number;
  base_inss_contribuintes: number;
  pro_labore: number;
}

export interface MesIcmsLP {
  competencia: string;
  /** ICMS a recolher (débito - crédito) do regime normal */
  icms_apurado: number;
}

export interface DadosCliente {
  cnpj?: string;
  razao_social?: string;
  anexo: AnexoSN;
  rbt12: number;
  dados_mensais: MesReferencia[];
  folha_mensal?: MesFolha[];
  icms_lp_mensal?: MesIcmsLP[];
  /** Percentual de clientes B2B (0..1). Se ausente, deriva de receita_b2b/receita_b2c. */
  percentual_b2b?: number;
  /** Atividade para presunção IRPJ/CSLL */
  atividade_lp?: "servicos" | "comercio_industria";
}

export interface Parametros {
  aliquota_cbs_referencia: number;
  aliquota_ibs_2027_2028: number;
  fracao_cbs_dentro_pis_cofins: number;
  percentual_icms_medio: number;
  percentual_rat: number;
  percentual_terceiros: number;
  percentual_presuncao_irpj_servicos: number;
  percentual_presuncao_irpj_comercio: number;
  percentual_presuncao_csll_servicos: number;
  percentual_presuncao_csll_comercio: number;
}

export interface ComponentesTributos {
  irpj?: number;
  csll?: number;
  pis?: number;
  cofins?: number;
  cpp?: number;
  inss_patronal?: number;
  icms?: number;
  iss?: number;
  cbs?: number;
  ibs?: number;
  das?: number;
}

export interface Alerta {
  nivel: "info" | "warn" | "error";
  codigo: string;
  mensagem: string;
}

export interface ResultadoCenario {
  cenario: CenarioId;
  rotulo: string;
  receita_bruta_anual: number;
  componentes: ComponentesTributos;
  total_tributos: number;
  carga_efetiva: number;
  credito_comprador_percentual: number;
  alertas: Alerta[];
  detalhes?: Record<string, number | string>;
}

export interface ResultadoSimulacao {
  cliente: DadosCliente;
  parametros: Parametros;
  cenarios: ResultadoCenario[];
  alertas_globais: Alerta[];
}
