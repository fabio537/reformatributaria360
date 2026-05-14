## Objetivo
Adicionar três controles de cenário ao Simulador Tributário:
1. **Escopo da Reforma**: rodar com apenas a CBS ou CBS + IBS.
2. **IRPJ/CSLL**: opção de incluir a tributação federal sobre o lucro na carga atual.
3. **Anos da simulação**: usuário escolhe quais anos do cronograma 2026–2033 entram no resultado.

Nenhum altera base legal/cronograma — apenas mudam a composição exibida e somada.

---

## 1. Escopo da Reforma (CBS only vs. CBS + IBS)

### UX
- Novo grupo "Escopo da Reforma" no card "Parâmetros da Simulação", com `RadioGroup`:
  - "CBS + IBS (padrão)" — comportamento atual.
  - "Somente CBS (federal)" — zera o IBS em todo o cronograma.
- Reflete em gráfico, tabela e PDF.

### Motor (`src/lib/tax-engine.ts`)
- Campo `escopo_reforma: "cbs_ibs" | "somente_cbs"` em `SimulacaoInput` (default `cbs_ibs`).
- No loop anual: se `somente_cbs`, força `ibsAno = 0` e remove o componente IBS dos créditos novos.
- Para Simples, o ICMS/ISS dentro do DAS segue inalterado (a opção só afeta o lado novo).
- Alerta automático identificando o cenário.

---

## 2. Inclusão opcional de IRPJ/CSLL na carga atual

### UX
- Bloco "Tributação sobre o lucro (IRPJ/CSLL)" com switch "Incluir IRPJ/CSLL".
- Campos por regime:
  - **Lucro Presumido**: presunção comércio (default 8%) e serviços (default 32%). IRPJ 15% + adicional 10% sobre lucro presumido acima de R$ 240.000/ano. CSLL 9% sobre presunção 12% (comércio) / 32% (serviços).
  - **Lucro Real**: campo "Lucro tributável anual estimado (R$)". IRPJ 15% + adicional 10% (acima de R$ 240k) e CSLL 9%.
  - **Simples Nacional**: opção desabilitada com aviso ("já incluídos no DAS").

### Motor
- Estender `EmpresaInput` com `irpj_csll: { incluir, presuncao_comercio?, presuncao_servicos?, lucro_real_anual? }`.
- Função `calcularIrpjCsllAnual(...)` retornando `{ irpj, csll }`.
- Estender `DetalheTributoAtual` com `irpj` e `csll`, somando ao `total`.
- IRPJ/CSLL **constantes em todos os anos** (a reforma do consumo não os afeta).

---

## 3. Seleção de anos da simulação

### UX
- Novo bloco "Anos a simular" no card de parâmetros, com:
  - Conjunto de checkboxes (toggles) para 2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033.
  - Atalhos: "Selecionar todos", "Limpar", e presets "Transição (2026–2028)", "Pleno (2033)".
  - Validação: pelo menos 1 ano selecionado para habilitar o botão "Simular".

### Motor
- Adicionar `anos_selecionados?: number[]` em `SimulacaoInput` (default = todos os anos do cronograma).
- Em `executarSimulacao`, filtrar `CRONOGRAMA_TRANSICAO` pelos anos escolhidos antes do loop.
- Recalcular `carga_atual_anual` / `carga_nova_anual` apenas para o escopo escolhido — manter os valores brutos "100%" como referência separada para o cabeçalho.

### UI / Resultado
- Gráficos, tabela e PDF passam a renderizar somente os anos selecionados.
- "Variação em 2033" passa a ser "Variação no último ano simulado" (rótulo dinâmico).
- Cabeçalho do PDF identifica o intervalo simulado.

---

## 4. Exibição dos novos valores

### Página Simulador (`src/routes/_authenticated/simulador.tsx`)
- Card "Carga Atual": linha extra "IRPJ/CSLL" quando incluído.
- Tabela "Detalhamento por Ano": coluna condicional "IRPJ/CSLL".
- Gráfico "Tributos Brutos": novas barras "IRPJ" e "CSLL" no stack atual (cores `chart-6/7` em `src/styles.css` se não existirem).
- `escopo = somente_cbs`: oculta barra/coluna "IBS".
- Tudo respeita os anos selecionados.

### Relatório PDF (`src/lib/relatorio-pdf.ts`)
- Colunas IRPJ/CSLL na composição anual.
- Cabeçalho com escopo escolhido, status IRPJ/CSLL e lista dos anos simulados.

---

## 5. Persistência
- `simulacoes.parametros` já é JSON livre — `escopo_reforma`, `irpj_csll` e `anos_selecionados` entram sem migration.

---

## Detalhes técnicos
- **Arquivos editados**: `src/lib/tax-engine.ts`, `src/routes/_authenticated/simulador.tsx`, `src/lib/relatorio-pdf.ts`, possivelmente `src/styles.css`.
- **Sem migrations**.
- **Compatibilidade**: defaults preservam o comportamento atual (CBS+IBS, IRPJ/CSLL off, todos os anos).

---

## Resultado esperado
- Usuário roda a simulação com "Somente CBS" para isolar o impacto federal.
- Ativa IRPJ/CSLL e visualiza a tributação federal total no card de carga atual, na tabela anual e no PDF.
- Escolhe os anos (ex.: só 2026–2028) e gráficos/tabela/PDF passam a refletir somente esse intervalo.
