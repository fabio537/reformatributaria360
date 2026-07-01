import type { Alerta, DadosCliente, Parametros, ResultadoSimulacao } from "./tipos";
import { PARAMETROS_PADRAO } from "./parametros-padrao";
import {
  simularSimplesNacionalAtual,
  simularSimplesPorDentro2027,
  simularSimplesHibrido2027,
  simularLucroPresumido,
} from "./cenarios";

export function gerarAlertas(cliente: DadosCliente, params: Parametros): Alerta[] {
  const a: Alerta[] = [];
  const LIMITE = 4_800_000;
  const SUBLIMITE = 3_600_000;
  if (cliente.rbt12 > LIMITE) {
    a.push({
      nivel: "error",
      codigo: "RBT12_EXCEDIDO",
      mensagem: "RBT12 acima de R$ 4.800.000 — cliente desenquadrado do Simples Nacional.",
    });
  } else if (cliente.rbt12 >= LIMITE * 0.95) {
    a.push({
      nivel: "warn",
      codigo: "RBT12_PROXIMO_LIMITE",
      mensagem: `RBT12 (R$ ${cliente.rbt12.toLocaleString("pt-BR")}) está a menos de 5% do limite do Simples Nacional (R$ 4.800.000). Risco de desenquadramento.`,
    });
  }
  if (cliente.rbt12 > SUBLIMITE && cliente.rbt12 <= LIMITE) {
    a.push({
      nivel: "warn",
      codigo: "SUBLIMITE_ESTADUAL_EXCEDIDO",
      mensagem: "RBT12 acima do sublimite de R$ 3.600.000 — ICMS/ISS devem ser recolhidos fora do DAS (regime normal).",
    });
  } else if (cliente.rbt12 >= SUBLIMITE * 0.95 && cliente.rbt12 <= SUBLIMITE) {
    a.push({
      nivel: "info",
      codigo: "SUBLIMITE_PROXIMO",
      mensagem: `RBT12 está a menos de 5% do sublimite estadual (R$ 3.600.000). Monitore para não perder o recolhimento unificado de ICMS/ISS.`,
    });
  }
  if (cliente.dados_mensais.length >= 3) {
    const ultimos = cliente.dados_mensais.slice(-3);
    const mediaMensal = ultimos.reduce((s, m) => s + m.receita_bruta, 0) / ultimos.length;
    const projecao12m = mediaMensal * 12;
    if (projecao12m > LIMITE && cliente.rbt12 <= LIMITE) {
      a.push({
        nivel: "warn",
        codigo: "PROJECAO_EXCEDE_LIMITE",
        mensagem: `Projeção 12m com base nos últimos 3 meses (R$ ${projecao12m.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}) ultrapassa o limite do Simples Nacional.`,
      });
    } else if (projecao12m > SUBLIMITE && cliente.rbt12 <= SUBLIMITE) {
      a.push({
        nivel: "info",
        codigo: "PROJECAO_EXCEDE_SUBLIMITE",
        mensagem: `Projeção 12m com base nos últimos 3 meses (R$ ${projecao12m.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}) ultrapassa o sublimite estadual.`,
      });
    }
  }
  if (params.aliquota_cbs_referencia < 0.05 || params.aliquota_cbs_referencia > 0.15) {
    a.push({
      nivel: "warn",
      codigo: "CBS_FORA_FAIXA",
      mensagem: "Alíquota CBS fora da faixa esperada (5%–15%).",
    });
  }
  if (!cliente.dados_mensais.length) {
    a.push({
      nivel: "error",
      codigo: "SEM_DADOS_MENSAIS",
      mensagem: "Nenhum mês de referência informado.",
    });
  }
  return a;
}

export function rodarSimulacaoCompleta(
  cliente: DadosCliente,
  parametros: Parametros = PARAMETROS_PADRAO,
): ResultadoSimulacao {
  const alertas_globais = gerarAlertas(cliente, parametros);
  const cenarios = [
    simularSimplesNacionalAtual(cliente, parametros),
    simularSimplesPorDentro2027(cliente, parametros),
    simularSimplesHibrido2027(cliente, parametros),
    simularLucroPresumido(cliente, parametros, { comReforma: false }),
    simularLucroPresumido(cliente, parametros, { comReforma: true }),
  ];
  return { cliente, parametros, cenarios, alertas_globais };
}
