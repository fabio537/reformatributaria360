
GRANT SELECT, INSERT, UPDATE, DELETE ON public.competencias_fiscais TO authenticated;
GRANT ALL ON public.competencias_fiscais TO service_role;

-- Permitir que usuários vinculados à empresa também gerenciem suas próprias competências
DROP POLICY IF EXISTS "Empresa gerencia próprias competências" ON public.competencias_fiscais;
CREATE POLICY "Empresa gerencia próprias competências"
ON public.competencias_fiscais
FOR ALL
TO authenticated
USING (public.user_belongs_to_empresa(auth.uid(), empresa_id))
WITH CHECK (public.user_belongs_to_empresa(auth.uid(), empresa_id));
