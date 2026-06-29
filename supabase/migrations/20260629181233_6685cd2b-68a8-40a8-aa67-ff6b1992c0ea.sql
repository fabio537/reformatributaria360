
CREATE TABLE public.competencias_fiscais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  competencia date NOT NULL,
  receita_bruta numeric(18,2) NOT NULL DEFAULT 0,
  receita_clientes_regime_normal numeric(18,2) NOT NULL DEFAULT 0,
  receita_clientes_outros numeric(18,2) NOT NULL DEFAULT 0,
  aquisicoes_totais numeric(18,2) NOT NULL DEFAULT 0,
  aquisicoes_fornecedores_regime_normal numeric(18,2) NOT NULL DEFAULT 0,
  aquisicoes_fornecedores_simples numeric(18,2) NOT NULL DEFAULT 0,
  folha_empregados numeric(18,2) NOT NULL DEFAULT 0,
  inss_empregados numeric(18,2) NOT NULL DEFAULT 0,
  inss_contribuinte_individual numeric(18,2) NOT NULL DEFAULT 0,
  irpj_apurado numeric(18,2) NOT NULL DEFAULT 0,
  csll_apurado numeric(18,2) NOT NULL DEFAULT 0,
  pis_apurado numeric(18,2) NOT NULL DEFAULT 0,
  cofins_apurado numeric(18,2) NOT NULL DEFAULT 0,
  icms_apurado numeric(18,2) NOT NULL DEFAULT 0,
  iss_apurado numeric(18,2) NOT NULL DEFAULT 0,
  ipi_apurado numeric(18,2) NOT NULL DEFAULT 0,
  das_total numeric(18,2) NOT NULL DEFAULT 0,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, competencia)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.competencias_fiscais TO authenticated;
GRANT ALL ON public.competencias_fiscais TO service_role;

ALTER TABLE public.competencias_fiscais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Equipe vê todas as competências"
  ON public.competencias_fiscais FOR SELECT
  TO authenticated
  USING (public.is_staff(auth.uid()) OR public.user_belongs_to_empresa(auth.uid(), empresa_id));

CREATE POLICY "Equipe gerencia competências"
  ON public.competencias_fiscais FOR ALL
  TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

CREATE TRIGGER trg_competencias_fiscais_updated_at
  BEFORE UPDATE ON public.competencias_fiscais
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_competencias_empresa_periodo
  ON public.competencias_fiscais (empresa_id, competencia DESC);
