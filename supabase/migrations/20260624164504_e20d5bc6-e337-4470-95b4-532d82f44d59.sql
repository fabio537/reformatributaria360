DO $$ BEGIN
  CREATE TYPE public.perfil_clientes AS ENUM ('B2B', 'B2C', 'MISTO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS perfil_clientes public.perfil_clientes,
  ADD COLUMN IF NOT EXISTS perfil_b2b_pct NUMERIC(5,2) DEFAULT 0 CHECK (perfil_b2b_pct >= 0 AND perfil_b2b_pct <= 100);

COMMENT ON COLUMN public.empresas.perfil_clientes IS 'Perfil dos clientes para análise Simples Nacional Dentro/Fora do DAS';
COMMENT ON COLUMN public.empresas.perfil_b2b_pct IS 'Quando perfil_clientes = MISTO, % aproximado de faturamento B2B (0-100)';