# Reforma Tributária 360 — Dossiê para Avaliação

> Documento gerado para auditoria técnica e funcional por agente externo (Claude).
> Última atualização: 2026-06-23.

## 1. Objetivo do produto

Plataforma SaaS para empresas brasileiras simularem o impacto da Reforma
Tributária (Lei Complementar 214/2025 — CBS, IBS, IS) sobre operações,
produtos (por NCM) e margem econômica, durante o período de transição
(2026–2033). Entrega:

- Simulação por **empresa** (faturamento agregado) e por **produto/NCM**.
- **Dashboard** com KPIs comparativos ano a ano.
- **Relatório PDF** exportável.
- **Histórico** de simulações vinculadas à empresa.
- **Checklist de adequação** e **base legal**.

### Personas
- **Admin** (consultoria): gerencia empresas e usuários, executa todas as simulações.
- **Funcionário** (consultoria): opera simulações e relatórios.
- **Cliente** (empresa final): visualiza apenas a própria empresa e seu histórico.

## 2. Stack

- **Front/SSR**: TanStack Start v1 + React 19 + Vite 7.
- **Estilo**: Tailwind v4 (via `src/styles.css`) + shadcn/ui + Radix.
- **Estado servidor**: TanStack Query.
- **Backend**: Lovable Cloud (Supabase) — Postgres + Auth + RLS.
- **Server logic**: `createServerFn` (TanStack) — sem Edge Functions.
- **PDF**: jsPDF + html2canvas.
- **Gráficos**: Recharts.
- **Deploy**: Cloudflare Workers (workerd) via Nitro.

## 3. Estrutura de rotas (`src/routes/`)

```
__root.tsx                       Shell (html/head/body), providers, Toaster
index.tsx                        Landing pública
login.tsx                        Auth (e-mail+senha, Google)
_authenticated.tsx               Gate: redireciona p/ /login se sem sessão
_authenticated/
  dashboard.tsx                  KPIs gerais
  empresas.tsx + index/$id       CRUD de empresas (admin/func)
  minha-empresa.tsx              Visão do cliente
  simulador.tsx                  Simulação por faturamento (empresa)
  simulador-ncm.tsx              Simulação por produto/NCM (foco do app)
  checklist.tsx                  Checklist de adequação
  base-legal.tsx                 Referências normativas
  atualizacoes.tsx               Changelog regulatório
  usuarios.tsx                   Admin de usuários (apenas role=admin)
  baixar-app.tsx                 PWA/instalação
```

## 4. Componentes-chave

- `src/components/SimulacaoProdutoResultado.tsx` — resultado **por unidade**
  do produto simulado (preço, alíquota efetiva, insumos líq., margem).
  IPI é tratado **“por fora”** (somado ao preço, não à carga).
- `src/components/SimulacaoResultado.tsx` — visão anual consolidada
  (referência secundária na tela de NCM).
- `src/components/Dashboard*` — KPIs e gráficos.
- `src/components/ui/*` — shadcn.

## 5. Lógica de negócio

### 5.1 Engine tributária — `src/lib/tax-engine.ts`
Calcula, por ano de transição:
- Tributos atuais: PIS, COFINS, ICMS, ISS, IPI (bruto e crédito).
- Tributos novos: CBS, IBS, IS (com alíquotas progressivas conforme cronograma LC 214/25).
- Créditos recuperáveis (não-cumulatividade plena no IBS/CBS).
- `carga_total` líquida por ano.

### 5.2 Cálculo por unidade (produto/NCM)
Em `SimulacaoProdutoResultado.tsx` e `src/lib/relatorio-pdf.ts`:
```
unidadeAnual = 12                            // 1 unid./mês de referência
precoUnit    = (valorVendaAnual + ipiAnual) / unidadeAnual   // IPI por fora
impostosUnit = ano.carga_total / unidadeAnual
insumosUnit  = (insumosAnuaisBruto - creditosRecuperados) / unidadeAnual
margemUnit   = precoUnit - impostosUnit - insumosUnit
aliqEfetiva  = impostosUnit / precoUnit
```

### 5.3 Regime ZFM
`src/lib/ncm-zfm.ts` — tratamento da Zona Franca de Manaus por NCM.

### 5.4 Relatório PDF
`src/lib/relatorio-pdf.ts` — gera relatório com capa, contexto, tabela
por item (preço, impostos, alíq. efetiva, insumos, margem) e visão anual.

## 6. Modelo de dados (Postgres / Lovable Cloud)

Migrações em `supabase/migrations/`. Tabelas principais:

- `empresas` — cadastro (CNPJ, regime, UF, CNAE, faturamento).
- `empresa_usuarios` — vínculo N:N cliente↔empresa.
- `user_roles` — papéis (`admin` | `funcionario` | `cliente`).
- `simulacoes` — header da simulação (empresa, tipo, parâmetros).
- `simulacao_resultados` — resultado ano a ano (JSONB).
- `checklist_itens` / `checklist_respostas` — adequação.
- `atualizacoes_normativas` — changelog regulatório.

### Segurança
- **RLS habilitado em todas as tabelas `public.*`**.
- Roles via tabela `user_roles` + função `public.has_role(uuid, app_role)`
  (SECURITY DEFINER) — evita recursão de RLS e escalada de privilégio.
- Policies por role: admin/funcionario veem tudo; cliente só vê empresas
  vinculadas via `empresa_usuarios`.
- Auth: e-mail/senha + Google OAuth. Sem signup anônimo. Criação de usuário
  apenas via tela de Admin (`/usuarios`) chamando `createUserFn`
  (server fn protegida por `requireSupabaseAuth` + checagem de admin,
  usando service-role apenas no servidor).

## 7. Server functions (RPC TanStack)

`src/lib/*.functions.ts`:
- `create-user.functions.ts` — admin cria usuário + role + vínculo empresa.
- `update-user.functions.ts` — atualiza dados/role.
- `list-user-emails.functions.ts` — lista e-mails (admin).

Todas usam `.middleware([requireSupabaseAuth])` e validam role no handler.

## 8. Fluxos críticos para revisão

1. **Login → carregamento de role → roteamento** (`_authenticated.tsx`).
2. **Simulador NCM** (`/simulador-ncm`):
   - Form: NCM, UF origem/destino, valor de venda atual, alíquotas atuais,
     IPI (se incidente), insumos, créditos.
   - Output: painel por unidade + visão anual + salvar no histórico + PDF.
3. **Histórico**: simulações persistidas em `simulacoes` + `simulacao_resultados`.
4. **Dashboard**: agrega últimas simulações da empresa.
5. **CRUD usuários** com service-role no server fn.

## 9. Pontos sugeridos para o Claude revisar

- **Lógica fiscal** em `src/lib/tax-engine.ts` (cronograma CBS/IBS, créditos, IS).
- **IPI por fora** — coerência entre `SimulacaoProdutoResultado.tsx` e `relatorio-pdf.ts`.
- **RLS** — todas as migrações em `supabase/migrations/`; conferir GRANTs e policies.
- **Privilege escalation** — uso de service-role somente nos `.functions.ts` de admin.
- **UX do simulador** — clareza dos resultados por item vs. consolidado.
- **Acessibilidade** dos componentes Radix/shadcn.
- **Performance** do PDF (jsPDF + html2canvas) em simulações longas.
- **SSR safety** — nenhum import de browser-only em loaders.

## 10. Como rodar / acessar

- **Preview público**: https://reformatributaria360.lovable.app
- **Repo**: (conectar GitHub pelo Lovable e compartilhar o link)
- **Build local**: `bun install && bun run build:dev`
- **Usuário de teste**: criar via tela `/usuarios` (admin) — não compartilhar
  credenciais reais.

## 11. O que NÃO está em escopo de avaliação

- Integrações fiscais reais (SEFAZ, NF-e) — fora do MVP.
- Cálculo de Imposto Seletivo por produto específico — apenas estimativa.
- Multi-tenant por workspace — atualmente single-tenant por empresa.
