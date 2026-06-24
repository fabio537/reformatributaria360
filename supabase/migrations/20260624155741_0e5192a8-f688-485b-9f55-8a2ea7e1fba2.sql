
CREATE TABLE public.precificacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  preco_venda_atual NUMERIC(14,2) NOT NULL DEFAULT 0,
  custo NUMERIC(14,2) NOT NULL DEFAULT 0,
  margem_atual_pct NUMERIC(7,4),
  credito_entrada_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (produto_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.precificacao TO authenticated;
GRANT ALL ON public.precificacao TO service_role;

CREATE INDEX precificacao_empresa_idx ON public.precificacao(empresa_id);
CREATE INDEX precificacao_produto_idx ON public.precificacao(produto_id);

ALTER TABLE public.precificacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Membros da empresa podem ver precificacao"
  ON public.precificacao FOR SELECT TO authenticated
  USING (public.user_belongs_to_empresa(auth.uid(), empresa_id) OR public.is_staff(auth.uid()));

CREATE POLICY "Membros da empresa podem inserir precificacao"
  ON public.precificacao FOR INSERT TO authenticated
  WITH CHECK (public.user_belongs_to_empresa(auth.uid(), empresa_id) OR public.is_staff(auth.uid()));

CREATE POLICY "Membros da empresa podem atualizar precificacao"
  ON public.precificacao FOR UPDATE TO authenticated
  USING (public.user_belongs_to_empresa(auth.uid(), empresa_id) OR public.is_staff(auth.uid()))
  WITH CHECK (public.user_belongs_to_empresa(auth.uid(), empresa_id) OR public.is_staff(auth.uid()));

CREATE POLICY "Membros da empresa podem deletar precificacao"
  ON public.precificacao FOR DELETE TO authenticated
  USING (public.user_belongs_to_empresa(auth.uid(), empresa_id) OR public.is_staff(auth.uid()));

CREATE TRIGGER update_precificacao_updated_at
  BEFORE UPDATE ON public.precificacao
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
