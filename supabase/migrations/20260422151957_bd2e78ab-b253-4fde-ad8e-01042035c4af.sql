DROP POLICY IF EXISTS "Clients can view own checklist" ON public.checklist_reforma;

CREATE POLICY "Clients can view own checklist"
ON public.checklist_reforma
FOR SELECT
TO authenticated
USING (public.user_belongs_to_empresa(auth.uid(), empresa_id));

CREATE POLICY "Clients can create own checklist items"
ON public.checklist_reforma
FOR INSERT
TO authenticated
WITH CHECK (public.user_belongs_to_empresa(auth.uid(), empresa_id));

CREATE POLICY "Clients can update own checklist items"
ON public.checklist_reforma
FOR UPDATE
TO authenticated
USING (public.user_belongs_to_empresa(auth.uid(), empresa_id))
WITH CHECK (public.user_belongs_to_empresa(auth.uid(), empresa_id));