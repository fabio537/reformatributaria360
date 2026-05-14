
## Objetivo

Na **Simulação completa do produto** (`/simulador-ncm` → aba "Simulação completa do produto"), o foco da apresentação deve ser o **resultado tributário e econômico do item** — alíquotas efetivas, carga por unidade, margem unitária e variação percentual ao longo da transição — e **não** os valores anualizados de faturamento e carga.

Os totais anuais continuam sendo calculados internamente (o motor precisa deles para DAS, IRPJ/CSLL etc. e para o PDF), mas **deixam de ser o destaque visual**.

## Mudanças

### 1. Novo painel "Resultado por item" — substitui `SimulacaoProdutoResultado`

Reescrever `src/components/SimulacaoProdutoResultado.tsx` para apresentar tudo em base **unitária e percentual**, considerando o ano-base (primeiro ano simulado) e o ano-alvo (último ano simulado, normalmente 2033):

**Quatro KPIs (ano-alvo):**
- **Preço de venda do item** (R$/unid.) — `valor_mensal / quantidade_mensal`. Quando `quantidade_mensal = 0`, exibir como "por operação" usando `valor_mensal` cheio.
- **Carga tributária do item** (R$/unid. e % sobre o preço) — `carga_total_ano / (quantidade_mensal × 12)`.
- **Insumos por item** (R$/unid., líquido de créditos) — `(insumos_brutos − créditos) / (quantidade × 12)`.
- **Margem por item** (R$/unid. e % sobre o preço) — `preço − carga_unit − insumos_unit`.

Cada KPI mostra a **variação vs. ano-base** em pontos percentuais (alíquota efetiva) e em R$/unid. (margem). Ícones de tendência (`TrendingUp`/`Down`) com cor semântica.

**Gráfico principal — "Alíquota efetiva sobre o item" (linha, %):**
- Eixo Y em **%** (carga_total / venda).
- Linhas: "Tributos atuais (efetivo)", "IBS/CBS (efetivo)", "Carga total efetiva".
- Permite ver a curva de migração ao longo de 2026–2033 sem depender da escala em R$.

**Gráfico secundário — "Composição do preço unitário" (barras empilhadas, R$/unid.):**
- Para cada ano: Margem · Insumos (líq.) · Impostos.
- Fica claro qual fatia do preço unitário é tributo, insumo e margem em cada ano.

**Tabela ano a ano (por unidade / %):**
| Ano | Fase | Preço (R$/unid.) | Impostos (R$/unid.) | Alíq. efetiva | Insumos (R$/unid.) | Margem (R$/unid.) | Margem (%) | Δ Margem vs base |

Remover do painel as colunas/cards que mostram totais anuais brutos do produto (Valor de venda anual, Impostos anuais R$ etc.). Esses dados continuam aparecendo no `<SimulacaoResultado />` abaixo, agora rotulado como "Visão anual consolidada (referência)".

### 2. Pequenos ajustes de UX em `simulador-ncm.tsx`

- Tornar `quantidade_mensal` o input principal junto a `valor_mensal` (mesmo bloco "Valores e alíquotas atuais"), com texto de apoio: *"Necessário para calcular preço unitário, carga por unidade e margem por item."* Se ficar em 0, o painel cai para modo "por operação".
- Reordenar a tela de resultado para colocar `<SimulacaoProdutoResultado />` como destaque e o `<SimulacaoResultado />` recolhido em um `<details>`/seção secundária com o título *"Visão anual consolidada (referência)"*.
- Sem mudança no `executarSimulacao`, no `tax-engine.ts` ou em migrações.

### 3. PDF do produto

Em `src/lib/relatorio-pdf.ts`, quando `contexto.tipo === "produto"`:
- Antes da seção atual "Resultado Financeiro por Ano", inserir **"Resultado por item"** com Preço unitário · Carga unit. · Alíq. efetiva · Insumos unit. · Margem unit. · Margem %.
- Manter as seções subsequentes como referência anual.
- Adicionar `quantidade_mensal` ao `RelatorioContextoProduto` (campo opcional). Em `simulador-ncm.tsx`, repassar `quantidade_mensal` ao montar o `pdfContexto`.

## Detalhes técnicos

- Cálculos por unidade ficam todos no front (`SimulacaoProdutoResultado.tsx` e `relatorio-pdf.ts`), derivando de `ResultadoSimulacao.anos[].carga_total`, `creditos` e do `valor_mensal` / `quantidade_mensal` informados.
- Alíquota efetiva = `carga_total / (valor_mensal × 12)` — invariante a unidades, então funciona mesmo quando `quantidade_mensal = 0`.
- Quando `quantidade_mensal = 0`, os KPIs e a tabela exibem "R$ / operação" (usando `valor_mensal`) em vez de "R$ / unidade", e o card de preço unitário muda o rótulo. Sem branch novo no engine.
- Nenhum campo novo no banco; `parametros` JSON já carrega `quantidade_mensal`.

## Arquivos

- editar `src/components/SimulacaoProdutoResultado.tsx` (reescrita do painel)
- editar `src/routes/_authenticated/simulador-ncm.tsx` (destaque do painel + repassar `quantidade_mensal` ao PDF)
- editar `src/lib/relatorio-pdf.ts` (nova seção "Resultado por item" + campo opcional `quantidade_mensal`)
