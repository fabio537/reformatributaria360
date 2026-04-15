
-- Add new columns to empresas
ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS inscricao_estadual text,
  ADD COLUMN IF NOT EXISTS inscricao_municipal text,
  ADD COLUMN IF NOT EXISTS uf text,
  ADD COLUMN IF NOT EXISTS municipio text,
  ADD COLUMN IF NOT EXISTS faturamento_anual numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS optante_simples_mei boolean DEFAULT false;

-- Add new columns to produtos
ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS regime_diferenciado text DEFAULT 'padrao',
  ADD COLUMN IF NOT EXISTS unidade text,
  ADD COLUMN IF NOT EXISTS quantidade_mensal numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tipo_operacao text DEFAULT 'revenda';

-- Add new columns to servicos
ALTER TABLE public.servicos
  ADD COLUMN IF NOT EXISTS regime_diferenciado text DEFAULT 'padrao',
  ADD COLUMN IF NOT EXISTS tipo_servico text;
