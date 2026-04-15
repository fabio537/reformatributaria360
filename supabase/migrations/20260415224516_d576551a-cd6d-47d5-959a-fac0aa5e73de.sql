-- Add supplier regime field to creditos_aquisicao
ALTER TABLE public.creditos_aquisicao
ADD COLUMN regime_diferenciado_fornecedor text NOT NULL DEFAULT 'padrao';

-- Add export destination and selective tax fields to produtos
ALTER TABLE public.produtos
ADD COLUMN destino_operacao text NOT NULL DEFAULT 'mercado_interno',
ADD COLUMN sujeito_imposto_seletivo boolean NOT NULL DEFAULT false,
ADD COLUMN aliquota_is numeric DEFAULT 0;