

## Plano: Checklist de Ações para Reforma Tributária

O PDF enviado é uma declaração de cessão de imóvel (não relacionado). O conteúdo relevante vem da **imagem**, que lista ações de antecipação à reforma tributária. Vou criar uma funcionalidade de checklist por empresa.

### Itens do Checklist (extraídos da imagem)

17 itens organizados em 3 categorias:

**Preparação Interna**
1. Mapa do perfil de fornecedores e clientes
2. Saneamento de cadastros (itens, fornecedores, clientes)
3. Cálculo dos preços líquidos
4. Atualização do ERP (bases de cálculo, alíquotas, CST, cClassTrib)
5. Atualização das notas técnicas XML
6. Parâmetros no ERP (TES, Tabela Z, J1BTAX, TAXBRA)

**Estratégia Comercial**
7. Ecossistema de fornecedores/clientes — comunicação e preparação
8. Preparação de Pedidos de Compra (POs) com IBS/CBS
9. Gross Up com novos tributos na base dos antigos
10. Repassar aumento/redução de tributos ao mercado
11. Foco em fornecedores da CURVA A
12. Revisão de preços com contratos atualizados

**Decisões Estratégicas 2026-2027**
13. Alterar ou não alterar BC e preços em 2026?
14. 2026: Laboratório de preços, testes e (re)testes
15. Nota de débito/crédito, Multa e Juros, Ajustes de estorno
16. Recursos escassos e limitados — planejamento de equipe
17. Recuperação Tributária Acelerada (PIS/COFINS extintos em 2027)

### Alterações

#### 1. Banco de dados — tabela `checklist_reforma`
- Campos: `id`, `empresa_id` (FK), `item_key` (text, identificador fixo do item), `concluido` (boolean), `observacao` (text), `updated_at`, `updated_by`
- RLS: acesso vinculado ao `empresa_id` do usuário

#### 2. Componente `ChecklistReformaTab.tsx`
- Lista os 17 itens agrupados por categoria com checkboxes
- Cada item mostra: descrição, checkbox de conclusão, campo opcional de observação
- Barra de progresso geral (ex: "7 de 17 concluídos — 41%")
- Salva automaticamente ao marcar/desmarcar

#### 3. Página da empresa (`empresas.$empresaId.tsx`)
- Nova aba "Checklist" nas tabs existentes (entre Créditos e Simulações)

### Arquivos afetados
| Arquivo | Ação |
|---------|------|
| Migration SQL | Criar tabela `checklist_reforma` com RLS |
| `src/components/ChecklistReformaTab.tsx` | Novo componente |
| `src/routes/_authenticated/empresas.$empresaId.tsx` | Adicionar aba Checklist |

