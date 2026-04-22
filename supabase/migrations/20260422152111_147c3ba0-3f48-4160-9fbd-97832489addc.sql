CREATE POLICY "Clients can create own simulacoes"
ON public.simulacoes
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND public.user_belongs_to_empresa(auth.uid(), empresa_id)
);