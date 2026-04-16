
CREATE TABLE public.checklist_reforma (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  item_key text NOT NULL,
  concluido boolean NOT NULL DEFAULT false,
  observacao text,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid,
  UNIQUE (empresa_id, item_key)
);

ALTER TABLE public.checklist_reforma ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage checklist" ON public.checklist_reforma
  FOR ALL USING (public.is_staff(auth.uid()));

CREATE POLICY "Clients can view own checklist" ON public.checklist_reforma
  FOR SELECT USING (public.user_belongs_to_empresa(auth.uid(), empresa_id));

CREATE TRIGGER update_checklist_reforma_updated_at
  BEFORE UPDATE ON public.checklist_reforma
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
