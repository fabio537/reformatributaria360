## Objetivo

Adicionar, na página **Simulador por NCM**, uma segunda aba — **"Simulação completa do produto"** — que executa o mesmo motor da Simulação Geral (`executarSimulacao`) só que para **um único produto**, devolvendo resumo, tabela ano a ano, gráfico, alertas e PDF — no mesmo formato da Simulação Geral.

A aba já existente vira **"Consulta rápida por NCM"** (alíquotas + cronograma de tributos), sem alterações.

---

## UX

### Estrutura da página `simulador-ncm.tsx`
Envolver o conteúdo atual em um `Tabs` (shadcn):

```text
┌──────────────────────────────────────────────────────────────┐
│ Simulador por NCM                                            │
├──────────────────────────────────────────────────────────────┤
│ [ Consulta rápida ] [ Simulação completa do produto ]        │
└──────────────────────────────────────────────────────────────┘
```

### Aba "Simulação completa do produto"

Card de parâmetros (mesma linguagem visual do simulador geral):

1. **Identificação do produto**
   - NCM, descrição, regime diferenciado, tipo de operação, destino, IS + alíquota IS.
2. **Valores e alíquotas atuais**
   - Valor mensal (R$), quantidade mensal.
   - Alíquotas atuais: PIS, COFINS, IPI, ICMS.
3. **Cenário da empresa (sintético)**
   - Regime tributário (Simples / Presumido / Real).
   - Faturamento anual (default = `valor_mensal × 12`, editável — necessário para faixa do Simples e nota de IPI sem inclusão).
   - Toggle IRPJ/CSLL com mesmas opções da simulação geral.
4. **Cenário da reforma**
   - RadioGroup escopo: CBS+IBS / Somente CBS.
   - Checkboxes de anos (2026–2033) com mesmos presets.

Botão **"Simular produto"** habilita quando NCM + valor estiverem preenchidos.

### Resultado (mesmo formato da Simulação Geral)
- Card de resumo: carga atual anual, carga nova anual em 2033, variação no último ano, créditos.
- Tabela "Detalhamento por Ano" (PIS, COFINS, IPI, ICMS, IRPJ, CSLL, CBS, IBS, IS, créditos, carga total, variação).
- Gráfico de barras empilhadas (mesmo do simulador geral).
- Lista de alertas.
- Botão **"Baixar PDF"** reutilizando `gerarRelatorioPDF`.

---

## Implementação

### Reaproveitamento de componentes
Hoje o resultado da Simulação Geral está inline em `src/routes/_authenticated/simulador.tsx`. Para evitar duplicação, **extrair o bloco de resultado** em um componente novo:

- `src/components/SimulacaoResultado.tsx` — recebe `resultado: ResultadoSimulacao`, opções de exibição (`mostrarIrpjCsll`, `escopoSomenteCbs`) e renderiza resumo + tabela + gráfico + alertas + botão PDF.
- `simulador.tsx` passa a importar e usar esse componente.
- A nova aba do simulador NCM usa o mesmo componente, garantindo paridade visual.

### Construção do input
Na nova aba, montar um `SimulacaoInput` sintético:

```ts
const input: SimulacaoInput = {
  empresa: {
    razao_social: descricao || `Produto NCM ${ncm}`,
    cnpj: "—",
    regime_tributario,
    uf: null, municipio: null,
    faturamento_anual,
    optante_simples_mei: regime_tributario === "simples_nacional",
    irpj_csll,
  },
  produtos: [{
    descricao, ncm,
    valor_mensal, quantidade_mensal,
    regime_diferenciado, tipo_operacao, destino_operacao,
    sujeito_imposto_seletivo, aliquota_is,
    aliquota_ipi, aliquota_pis, aliquota_cofins, aliquota_icms,
  }],
  servicos: [],
  creditos: [],
  escopo_reforma,
  anos_selecionados,
};
const resultado = executarSimulacao(input);
```

### Nada novo no motor
`executarSimulacao` já lida corretamente com 1 produto, sem serviços e sem créditos. Não precisa alterar `tax-engine.ts`.

### Persistência
A simulação por produto é **transitória** (não salva em `simulacoes`). Botão "Salvar" não faz parte desta aba (o usuário usa a Simulação Geral para isso). Sem migrations.

---

## Arquivos editados / criados

- **Criar** `src/components/SimulacaoResultado.tsx` — bloco de resultado compartilhado.
- **Editar** `src/routes/_authenticated/simulador.tsx` — substituir o bloco inline de resultado pelo novo componente.
- **Editar** `src/routes/_authenticated/simulador-ncm.tsx` — envolver em `Tabs`, criar a aba "Simulação completa do produto" com formulário e resultado.

Sem alterações em `tax-engine.ts`, `relatorio-pdf.ts` ou banco de dados.

---

## Resultado esperado

- O usuário entra em **/simulador-ncm**, vê duas abas.
- A aba **"Consulta rápida"** continua exatamente como está hoje.
- A aba **"Simulação completa do produto"** permite rodar a mesma simulação ano a ano que a Simulação Geral faz, mas para 1 produto isolado — útil para precificação, decisão de mix de produtos e para apresentar ao cliente o impacto de um SKU específico.