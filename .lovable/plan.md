
## Objetivo

Tornar a aba **"Simulação completa do produto"** (em `/simulador-ncm`) uma simulação focada **no item** — alíquotas efetivas, carga por unidade, variação por produto, e **margem após impostos e insumos** — com a possibilidade de **salvar no histórico da empresa**, **gerar dashboard** e **relatório PDF** específicos do produto.

## Mudanças

### 1. Refoco da simulação no produto (não no faturamento da empresa)

Em `src/routes/_authenticated/simulador-ncm.tsx`, na aba "Simulação completa do produto":

- **Remover** os campos hoje voltados ao todo da empresa: `faturamento anual`, configuração de IRPJ/CSLL e a noção de "regime da empresa".
- **Manter apenas o regime tributário aplicável ao produto** (Simples Nacional / Lucro Presumido / Lucro Real) — afeta DAS vs PIS/COFINS/ICMS/IPI no cálculo do item.
- Para Simples Nacional, derivar `faturamento_anual` do próprio item (`valor_mensal * 12`) — assim a alíquota DAS reflete o item isoladamente. Adicionar nota explicativa.
- Os créditos de aquisição passam a ser apresentados como **"Insumos/aquisições vinculados a este produto"**, mantendo a estrutura atual.

### 2. Painel "Resultado por produto" (margem)

Criar `src/components/SimulacaoProdutoResultado.tsx`, exibido **acima** do `<SimulacaoResultado />` quando há resultado:

Para cada ano simulado (e em destaque para o último ano):
- **Valor de venda** — receita anual do item (`valor_mensal × 12`, ou com IPI somado quando aplicável, conforme já é feito no engine).
- **Impostos** — carga total líquida do item naquele ano (`carga_total` do `ResultadoAno`).
- **Insumos** — soma das aquisições vinculadas (`Σ valor_mensal × 12`) **líquida dos créditos** do ano (créditos atuais + IBS/CBS), refletindo o custo real de insumos.
- **Margem após Impostos e Insumos diretos** — `Valor de venda − Impostos − Insumos líquidos`, em R$ e em % sobre o valor de venda.

Visual:
- Quatro cartões de KPI no topo (valores do **último ano simulado**) com setas de variação contra o ano-base.
- Tabela ano a ano com as colunas: Ano · Valor de venda · Impostos · Insumos (líq.) · Margem (R$) · Margem (%).
- Mini-gráfico de linha mostrando a margem ao longo do cronograma.

Reaproveitar o `<SimulacaoResultado />` existente para o restante do dashboard (gráficos e detalhamento por tributo).

### 3. Salvar no histórico da empresa

- Importar `useLinkedEmpresa` e `useAuth`, e usar `supabase.from("simulacoes").insert(...)` no mesmo padrão de `simulador.tsx`.
- Marcar o registro incluindo no `parametros` JSON: `tipo: "produto_ncm"`, `produto: { ncm, descricao }`.
- `nome`: `"Produto NCM <ncm> — <descricao> — <data>"`.
- Passar `onSalvar`/`salvando`/`salvado` ao `<SimulacaoResultado />` (props já existentes).
- Sem empresa vinculada → botão Salvar desabilitado com tooltip explicativo.
- Histórico aparece automaticamente em `empresas.$empresaId.tsx` / `dashboard.tsx`.

### 4. Relatório PDF do produto

Em `src/lib/relatorio-pdf.ts`, adicionar parâmetro opcional `contexto?: { tipo: "produto"; ncm: string; descricao: string; insumosAnuais: number }`:

- Título → **"Relatório de Simulação por Produto"**.
- Substituir "Dados da Empresa" por **"Identificação do Produto"** (NCM, descrição, regime, valor mensal, alíquotas atuais).
- Adicionar nova seção **"Resultado financeiro por ano"** com Valor de venda · Impostos · Insumos (líq.) · Margem (R$) · Margem (%).
- Manter as seções existentes de resumo, detalhamento anual e composição tributária.

Em `SimulacaoResultado.tsx`, aceitar prop opcional `pdfContexto` repassada para `gerarRelatorioPDF`.

## Detalhes técnicos

- Nenhuma alteração no `tax-engine.ts`. O motor já trabalha com 1 produto e os créditos por ano já vêm em `ResultadoAno.creditos`.
- Nenhuma migração de banco — `simulacoes.parametros` e `simulacoes.resultados` são `jsonb`.
- Cálculo da margem fica no front (componente novo), a partir de `ResultadoSimulacao` + total de insumos brutos informados.
- A consulta rápida (Aba 1) **não muda**.

## Arquivos

- editar `src/routes/_authenticated/simulador-ncm.tsx`
- criar `src/components/SimulacaoProdutoResultado.tsx`
- editar `src/components/SimulacaoResultado.tsx` (prop `pdfContexto`)
- editar `src/lib/relatorio-pdf.ts` (parâmetro `contexto`)
