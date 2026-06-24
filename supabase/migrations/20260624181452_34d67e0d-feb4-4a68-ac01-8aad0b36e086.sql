ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS perc_insumos_creditaveis NUMERIC(5,2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.empresas.perc_insumos_creditaveis IS
  'Percentual da receita bruta correspondente a insumos/aquisições geradores de crédito de IBS/CBS. Usado para estimar créditos quando não há histórico importado em creditos_aquisicao.';