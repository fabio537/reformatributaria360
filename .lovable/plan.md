
# Plataforma de Suporte à Reforma Tributária

## Visão Geral
App web para escritório contábil apoiar clientes nas decisões sobre a reforma tributária brasileira, com simulação de cenários, base legal, e busca de atualizações.

## 1. Autenticação e Controle de Acesso
- Login com email/senha via Supabase Auth
- 3 perfis de acesso usando tabela `user_roles`:
  - **Admin**: acesso total — cadastro de empresas, usuários, configurações
  - **Funcionário**: inserção de dados, análise, simulações de todas as empresas
  - **Cliente**: visualização apenas dos dados da sua própria empresa
- Rotas protegidas com layout `_authenticated` e guards por role

## 2. Banco de Dados (Supabase/Lovable Cloud)
- **profiles**: dados do usuário (nome, telefone)
- **user_roles**: perfis de acesso (admin, funcionario, cliente)
- **empresas**: CNPJ, razão social, regime tributário (Simples, Lucro Presumido, Lucro Real), CNAE principal/secundários
- **empresa_usuarios**: vínculo empresa ↔ usuário (para clientes verem só sua empresa)
- **produtos**: NCM/TIPI, descrição, alíquotas atuais (IPI, PIS, COFINS, ICMS)
- **servicos**: código de serviço, descrição, alíquotas ISS
- **creditos_aquisicao**: composição de créditos por empresa (fornecedor, NCM, valores)
- **simulacoes**: cenários salvos com parâmetros e resultados
- **artigos_legais**: base legal categorizada (artigos, leis, notas técnicas)
- **fontes_atualizacao**: links curados + conteúdo buscado por IA
- RLS em todas as tabelas — cliente vê apenas sua empresa

## 3. Cadastro de Empresas e Dados
- CRUD de empresas (admin cria, funcionário edita dados)
- Cadastro de produtos (NCM/TIPI) e serviços por empresa
- Cadastro de composição de créditos de aquisição
- **Importação**: upload de CSV/Excel do sistema Domínio
- **Manual**: formulários para funcionários inserirem dados
- Validação de CNPJ, NCM e campos obrigatórios

## 4. Simulador Tributário
- **Cenário atual vs IBS/CBS**: comparativo da carga tributária atual (PIS/COFINS/ICMS/ISS/IPI) com o novo modelo unificado
- **Fases da transição (2026-2033)**: simulação ano a ano com alíquotas progressivas conforme cronograma da reforma
- Considera: regime tributário, CNAE, produtos (TIPI), serviços, créditos
- Dashboard visual com gráficos comparativos (barras/linhas)
- Exportação dos resultados em PDF/Excel
- Histórico de simulações salvas por empresa

## 5. Base Legal e Conteúdo
- Biblioteca de artigos sobre a reforma tributária
- Categorização por tema (IBS, CBS, transição, créditos, etc.)
- Busca e filtros por palavras-chave
- Admin e funcionários podem adicionar/editar artigos

## 6. Fontes de Atualização (IA + Curadoria)
- Links curados manualmente pelo admin (RFB, portais tributários)
- Busca automática com IA: resumo de notícias e atualizações sobre a reforma
- Feed de atualizações na página inicial do app

## 7. Páginas e Navegação
- **Login** → tela de autenticação
- **Dashboard** → visão geral com alertas, últimas simulações, atualizações
- **Empresas** → listagem e cadastro (admin/funcionário)
- **Empresa Detalhe** → dados, produtos, serviços, créditos, simulações
- **Simulador** → formulário de simulação + resultados visuais
- **Base Legal** → biblioteca de artigos e legislação
- **Atualizações** → feed de notícias e fontes externas
- **Usuários** → gestão de usuários e permissões (admin)

## 8. Design
- Interface limpa e profissional, tema claro
- Sidebar com navegação principal
- Componentes shadcn/ui (tabelas, cards, formulários, gráficos)
- Responsivo para desktop e tablet
