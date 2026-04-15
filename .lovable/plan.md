

# Cadastro Completo de Empresa com Produtos, Serviços e Importação

## Resumo

Transformar a página de Empresas em uma experiência completa de cadastro e gestão, com página de detalhe por empresa contendo abas para dados gerais, produtos (NCM/TIPI), serviços, créditos de aquisição, e funcionalidade de importação via XLS/CSV.

## Alterações no Banco de Dados

Migração SQL para adicionar campos relevantes à simulação:

- **Tabela `empresas`**: adicionar `inscricao_estadual`, `inscricao_municipal`, `uf`, `municipio`, `faturamento_anual`, `optante_simples_mei` (boolean)
- **Tabela `produtos`**: adicionar `regime_diferenciado` (text, default 'padrao' — valores: padrao, reducao_30, reducao_60, aliquota_zero), `unidade`, `quantidade_mensal`, `tipo_operacao` (text: fabricacao, revenda, importacao)
- **Tabela `servicos`**: adicionar `regime_diferenciado` (text, default 'padrao'), `tipo_servico` (text)

## Nova Rota: Detalhe da Empresa

Criar `src/routes/_authenticated/empresas.$empresaId.tsx` — página de detalhe com abas (Tabs):

1. **Dados Gerais** — formulário de edição dos dados da empresa (todos os campos, incluindo novos)
2. **Produtos** — tabela CRUD de produtos com formulário inline/dialog + botão de importação XLS/CSV
3. **Serviços** — tabela CRUD de serviços com formulário inline/dialog + botão de importação XLS/CSV
4. **Créditos de Aquisição** — tabela CRUD de créditos (fornecedor, NCM, alíquotas, valor) + importação
5. **Simulações** — lista de simulações já realizadas para essa empresa

## Importação de Dados (XLS/CSV)

Componente reutilizável `src/components/ImportDialog.tsx`:

- Aceita arquivos `.xlsx`, `.xls`, `.csv`
- Usa a lib `xlsx` (SheetJS) para parsing no browser (já funciona no Worker)
- Mostra preview dos dados mapeados antes de confirmar
- Mapeamento de colunas configurável (o usuário associa colunas do arquivo aos campos do sistema)
- Insere os dados na tabela correspondente via Supabase client
- Modelos de planilha para download (templates em branco com cabeçalhos corretos)

## Atualização da Lista de Empresas

- Cada linha da tabela vira um link clicável para a página de detalhe (`/empresas/:empresaId`)
- Adicionar coluna "UF" e "Faturamento" na listagem
- Botão de edição e exclusão (admin)

## Arquivos Afetados

| Arquivo | Ação |
|---------|------|
| Migração SQL | Novos campos em empresas, produtos, servicos |
| `src/routes/_authenticated/empresas.tsx` | Atualizar listagem com links e novas colunas |
| `src/routes/_authenticated/empresas.$empresaId.tsx` | **Novo** — detalhe com abas |
| `src/components/ImportDialog.tsx` | **Novo** — importação XLS/CSV reutilizável |
| `src/components/ProdutosTab.tsx` | **Novo** — CRUD de produtos |
| `src/components/ServicosTab.tsx` | **Novo** — CRUD de serviços |
| `src/components/CreditosTab.tsx` | **Novo** — CRUD de créditos |
| `package.json` | Adicionar dependência `xlsx` |

## Dependência Nova

- **xlsx** (SheetJS): parsing de arquivos Excel/CSV no browser, sem necessidade de servidor

