
-- 1. Coluna competencia + índices
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS competencia DATE;
ALTER TABLE public.servicos ADD COLUMN IF NOT EXISTS competencia DATE;
ALTER TABLE public.creditos_aquisicao ADD COLUMN IF NOT EXISTS competencia DATE;

CREATE INDEX IF NOT EXISTS idx_produtos_empresa_competencia ON public.produtos(empresa_id, competencia);
CREATE INDEX IF NOT EXISTS idx_servicos_empresa_competencia ON public.servicos(empresa_id, competencia);
CREATE INDEX IF NOT EXISTS idx_creditos_empresa_competencia ON public.creditos_aquisicao(empresa_id, competencia);

-- 2. Campos do novo regime em produtos
ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS cclasstrib TEXT,
  ADD COLUMN IF NOT EXISTS cst TEXT,
  ADD COLUMN IF NOT EXISTS aliquota_ibs NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS aliquota_cbs NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS regime_especial TEXT,
  ADD COLUMN IF NOT EXISTS reducao_aplicada NUMERIC(5,2) DEFAULT 0;

-- Replicação em servicos
ALTER TABLE public.servicos
  ADD COLUMN IF NOT EXISTS cclasstrib TEXT,
  ADD COLUMN IF NOT EXISTS aliquota_ibs NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS aliquota_cbs NUMERIC(5,2) DEFAULT 0;

-- 3. RLS já está habilitado nas três tabelas e usa user_belongs_to_empresa.
-- Nenhuma alteração de policy é necessária — colunas novas herdam o controle por linha existente.
