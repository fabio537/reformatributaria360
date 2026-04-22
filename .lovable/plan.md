
## Plano de implementação

### Objetivo
Reorganizar a navegação para clientes com foco exclusivo na empresa vinculada e adicionar um novo simulador de alíquotas por produto/NCM no menu principal, sempre respeitando o vínculo usuário → empresa.

### 1. Reorganizar a navegação para perfil cliente
- Ajustar o menu lateral para ter comportamento diferente entre equipe interna e cliente.
- Para cliente, exibir uma navegação simplificada, orientada à própria empresa:
  - Dashboard
  - Minha Empresa
  - Checklist
  - Simulações
  - Simulador por NCM
  - Base Legal
  - Atualizações
- Para equipe interna, manter a visão administrativa atual, incluindo Empresas e Usuários.
- Renomear e reposicionar itens para reduzir a dependência de entrar em “Empresas” para acessar funcionalidades operacionais.

### 2. Centralizar a lógica de “empresa vinculada do cliente”
- Criar uma camada reutilizável para descobrir a empresa vinculada ao usuário autenticado.
- Usar essa lógica para:
  - direcionar o cliente à própria empresa;
  - filtrar telas que hoje dependem de seleção manual;
  - impedir que cliente navegue para dados de outra empresa.
- Revisar a proteção das rotas autenticadas para evitar exposição momentânea de conteúdo antes do redirecionamento.

### 3. Transformar o checklist em item principal do menu
- Criar uma rota principal dedicada ao checklist do cliente, usando automaticamente a empresa vinculada.
- Reaproveitar o componente existente do checklist.
- Manter a visualização contextual por empresa para staff, mas dar acesso direto ao cliente pelo menu principal.
- Exibir progresso geral e mensagens de contexto da empresa atual.

### 4. Melhorar a experiência “Minha Empresa”
- Criar uma rota principal “Minha Empresa” para clientes, levando diretamente ao detalhe da empresa vinculada.
- Para clientes, ocultar ações administrativas que não façam sentido.
- Para staff, manter a gestão completa por lista de empresas e detalhe individual.

### 5. Criar o novo “Simulador por NCM” no menu principal
- Adicionar uma nova página dedicada ao simulador de produto.
- Fluxo principal:
  - cliente informa NCM;
  - informa opcionalmente descrição, valor do produto e regime diferenciado;
  - sistema avalia enquadramento;
  - retorna alíquota estimada e cronograma de descontinuidade dos tributos atuais.
- O resultado deve mostrar, no mínimo:
  - alíquota estimada de CBS;
  - alíquota estimada de IBS;
  - alíquota total prevista;
  - manutenção/extinção de PIS, COFINS, IPI, ICMS e ISS por ano;
  - observações sobre IPI/ZFM quando aplicável;
  - alertas de limitação quando o NCM não permitir enquadramento confiável.

### 6. Reaproveitar e expandir o motor tributário
- Extrair do motor atual funções menores para cálculo unitário por produto/NCM.
- Aproveitar as regras já existentes de:
  - cronograma 2026–2033;
  - manutenção/extinção de tributos;
  - validação de NCM para IPI/ZFM;
  - regimes diferenciados.
- Criar uma saída específica para consulta rápida por produto, sem depender da simulação completa da empresa.

### 7. Ajustar permissões para clientes operarem o que é da própria empresa
- Revisar as políticas de acesso para garantir que o cliente possa:
  - visualizar seus dados;
  - acessar suas simulações;
  - usar checklist da própria empresa;
  - eventualmente registrar observações/checks, se esse for o comportamento esperado da tela principal.
- Manter o isolamento total entre empresas pelo vínculo existente.

### 8. Refinar a tela de simulações para perfil cliente
- Simplificar a página atual do simulador completo para clientes:
  - pré-selecionar automaticamente a empresa vinculada;
  - remover seleção de empresa quando houver apenas uma empresa permitida;
  - manter histórico apenas da própria empresa.
- Staff continua com capacidade de simular qualquer empresa permitida pelo papel.

### 9. Ajustes de UX
- Melhorar a hierarquia visual do menu e dos atalhos principais.
- Destacar claramente em cada tela qual empresa está sendo consultada.
- Reduzir cliques para cliente chegar em:
  - checklist;
  - dados da empresa;
  - simulações;
  - consulta por NCM.

## Arquivos e áreas afetadas
- `src/components/AppSidebar.tsx`
- `src/routes/_authenticated.tsx`
- `src/routes/_authenticated/empresas.index.tsx`
- `src/routes/_authenticated/empresas.$empresaId.tsx`
- `src/routes/_authenticated/simulador.tsx`
- `src/lib/tax-engine.ts`
- novo hook/helper para resolver empresa do usuário autenticado
- novas rotas dedicadas para:
  - checklist principal
  - minha empresa
  - simulador por NCM
- possível migration para ajustar permissões do checklist, se necessário

## Detalhes técnicos
- A navegação do cliente passará a ser orientada por contexto da empresa vinculada, não pela lista completa de empresas.
- O novo simulador por NCM será uma consulta rápida e independente da simulação completa, mas reutilizará o mesmo cronograma tributário já existente no motor.
- O comportamento de IPI continuará considerando a validação especial por NCM/ZFM já implementada.
- Caso o cliente deva marcar o checklist diretamente, será necessário ajustar a política de acesso do checklist para permitir atualização apenas na própria empresa vinculada.

## Resultado esperado
- Cliente entra no sistema e vê apenas conteúdos da própria empresa.
- Checklist passa a ser acessível diretamente no menu principal.
- Existe um novo simulador de produto por NCM no menu principal.
- O sistema retorna a alíquota prevista e mostra, ano a ano, quais tributos deixam de incidir ou permanecem aplicáveis.
