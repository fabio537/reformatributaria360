

## Plano Revisado — Correções no Motor de Cálculo

### Correção Conceitual (Item 2)

Você está correto: o crédito de IBS/CBS é sobre o **imposto efetivamente pago pelo fornecedor na etapa anterior**, não sobre o regime de saída do adquirente. Um hospital (redução 60% na saída) que compra insumos tributados a 100% credita integralmente os 26,5%.

O motor atual (linha 278 do `tax-engine.ts`) aplica `ALIQUOTA_TOTAL_REF` (26,5%) em todos os créditos — isso está correto **apenas quando o fornecedor opera no regime padrão**. Para ser preciso, é necessário saber o regime tributário do fornecedor.

### Alterações

#### 1. Banco de dados — campo `regime_diferenciado_fornecedor` em `creditos_aquisicao`
- Novo campo `regime_diferenciado_fornecedor` (text, default `'padrao'`) na tabela `creditos_aquisicao`
- Valores possíveis: `padrao`, `reducao_30`, `reducao_60`, `aliquota_zero`
- Isso indica a alíquota que o fornecedor efetivamente pagou

#### 2. Motor de cálculo (`tax-engine.ts`)
- **Créditos novo sistema**: calcular com base no regime do fornecedor, não alíquota fixa 26,5%
  ```
  // Antes (incorreto para fornecedores com regime diferenciado):
  novos += v * ALIQUOTA_TOTAL_REF;
  
  // Depois (correto):
  const aliqFornecedor = aliquotaEfetiva(c.regime_diferenciado_fornecedor);
  novos += v * aliqFornecedor.total;
  ```
- **Tabela DAS** para Simples Nacional (item 1 do diagnóstico — permanece válido)
- **Exportações** isentas de IBS/CBS (item 5 — permanece válido)
- **Imposto Seletivo** para bens específicos (item 3 — permanece válido)
- **Validação de faturamento** cruzando com soma de produtos/serviços (item 4 — permanece válido)

#### 3. Interface de Créditos (`CreditosTab.tsx`)
- Adicionar campo "Regime do Fornecedor" (select) no formulário e na importação
- Opções: Padrão (100%), Redução 30%, Redução 60%, Alíquota Zero
- Exibir na tabela o regime informado

#### 4. Interface de Produtos (`ProdutosTab.tsx`)
- Adicionar campo `destino_operacao`: "Mercado Interno" ou "Exportação"
- Adicionar campo `sujeito_imposto_seletivo` (boolean) e `aliquota_is`

#### 5. Simulador (`simulador.tsx`)
- Checklist de prontidão pré-simulação
- Alerta se faturamento diverge > 10% da soma de produtos/serviços

### Arquivos afetados
| Arquivo | Ação |
|---------|------|
| Migration SQL | Novos campos em `creditos_aquisicao` e `produtos` |
| `src/lib/tax-engine.ts` | Correção de créditos, DAS, IS, exportações |
| `src/components/CreditosTab.tsx` | Campo regime do fornecedor |
| `src/components/ProdutosTab.tsx` | Campos destino e IS |
| `src/routes/_authenticated/simulador.tsx` | Checklist de validação |

