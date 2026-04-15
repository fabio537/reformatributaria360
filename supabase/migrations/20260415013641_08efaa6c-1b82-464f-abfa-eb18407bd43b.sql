-- Create enums
CREATE TYPE public.app_role AS ENUM ('admin', 'funcionario', 'cliente');
CREATE TYPE public.regime_tributario AS ENUM ('simples_nacional', 'lucro_presumido', 'lucro_real');

-- Update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT '',
  telefone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- User Roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Empresas
CREATE TABLE public.empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cnpj TEXT NOT NULL UNIQUE,
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT,
  regime_tributario regime_tributario NOT NULL DEFAULT 'simples_nacional',
  cnae_principal TEXT,
  cnaes_secundarios TEXT[],
  endereco TEXT,
  telefone TEXT,
  email TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER update_empresas_updated_at BEFORE UPDATE ON public.empresas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Empresa-Usuarios
CREATE TABLE public.empresa_usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(empresa_id, user_id)
);

-- Produtos
CREATE TABLE public.produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  ncm TEXT NOT NULL,
  descricao TEXT NOT NULL,
  aliquota_ipi NUMERIC(5,2) DEFAULT 0,
  aliquota_pis NUMERIC(5,2) DEFAULT 0,
  aliquota_cofins NUMERIC(5,2) DEFAULT 0,
  aliquota_icms NUMERIC(5,2) DEFAULT 0,
  valor_mensal NUMERIC(15,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER update_produtos_updated_at BEFORE UPDATE ON public.produtos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Servicos
CREATE TABLE public.servicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  codigo_servico TEXT NOT NULL,
  descricao TEXT NOT NULL,
  aliquota_iss NUMERIC(5,2) DEFAULT 0,
  aliquota_pis NUMERIC(5,2) DEFAULT 0,
  aliquota_cofins NUMERIC(5,2) DEFAULT 0,
  valor_mensal NUMERIC(15,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER update_servicos_updated_at BEFORE UPDATE ON public.servicos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Creditos de Aquisição
CREATE TABLE public.creditos_aquisicao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  fornecedor TEXT NOT NULL,
  ncm TEXT,
  descricao TEXT,
  valor_mensal NUMERIC(15,2) DEFAULT 0,
  aliquota_pis NUMERIC(5,2) DEFAULT 0,
  aliquota_cofins NUMERIC(5,2) DEFAULT 0,
  aliquota_icms NUMERIC(5,2) DEFAULT 0,
  aliquota_ipi NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER update_creditos_updated_at BEFORE UPDATE ON public.creditos_aquisicao FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Simulacoes
CREATE TABLE public.simulacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  parametros JSONB NOT NULL DEFAULT '{}',
  resultados JSONB NOT NULL DEFAULT '{}',
  ano_inicio INTEGER DEFAULT 2026,
  ano_fim INTEGER DEFAULT 2033,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER update_simulacoes_updated_at BEFORE UPDATE ON public.simulacoes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Artigos Legais
CREATE TABLE public.artigos_legais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  conteudo TEXT NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'geral',
  tags TEXT[],
  autor_id UUID REFERENCES auth.users(id),
  publicado BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER update_artigos_updated_at BEFORE UPDATE ON public.artigos_legais FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Fontes de Atualização
CREATE TABLE public.fontes_atualizacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  url TEXT,
  resumo TEXT,
  fonte TEXT NOT NULL DEFAULT 'manual',
  categoria TEXT DEFAULT 'geral',
  data_publicacao TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER update_fontes_updated_at BEFORE UPDATE ON public.fontes_atualizacao FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Security definer functions (tables exist now)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin', 'funcionario'))
$$;

CREATE OR REPLACE FUNCTION public.user_belongs_to_empresa(_user_id uuid, _empresa_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.empresa_usuarios WHERE user_id = _user_id AND empresa_id = _empresa_id)
$$;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, nome)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresa_usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creditos_aquisicao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artigos_legais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fontes_atualizacao ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Staff can view all profiles" ON public.profiles FOR SELECT USING (public.is_staff(auth.uid()));
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User roles policies
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Empresas policies
CREATE POLICY "Staff can view all empresas" ON public.empresas FOR SELECT USING (public.is_staff(auth.uid()));
CREATE POLICY "Clients can view own empresa" ON public.empresas FOR SELECT USING (public.user_belongs_to_empresa(auth.uid(), id));
CREATE POLICY "Admins can insert empresas" ON public.empresas FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Staff can update empresas" ON public.empresas FOR UPDATE USING (public.is_staff(auth.uid()));
CREATE POLICY "Admins can delete empresas" ON public.empresas FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Empresa_usuarios policies
CREATE POLICY "Staff can manage empresa_usuarios" ON public.empresa_usuarios FOR ALL USING (public.is_staff(auth.uid()));
CREATE POLICY "Users can view own vinculo" ON public.empresa_usuarios FOR SELECT USING (auth.uid() = user_id);

-- Produtos policies
CREATE POLICY "Staff can manage produtos" ON public.produtos FOR ALL USING (public.is_staff(auth.uid()));
CREATE POLICY "Clients can view own produtos" ON public.produtos FOR SELECT USING (public.user_belongs_to_empresa(auth.uid(), empresa_id));

-- Servicos policies
CREATE POLICY "Staff can manage servicos" ON public.servicos FOR ALL USING (public.is_staff(auth.uid()));
CREATE POLICY "Clients can view own servicos" ON public.servicos FOR SELECT USING (public.user_belongs_to_empresa(auth.uid(), empresa_id));

-- Creditos policies
CREATE POLICY "Staff can manage creditos" ON public.creditos_aquisicao FOR ALL USING (public.is_staff(auth.uid()));
CREATE POLICY "Clients can view own creditos" ON public.creditos_aquisicao FOR SELECT USING (public.user_belongs_to_empresa(auth.uid(), empresa_id));

-- Simulacoes policies
CREATE POLICY "Staff can manage simulacoes" ON public.simulacoes FOR ALL USING (public.is_staff(auth.uid()));
CREATE POLICY "Clients can view own simulacoes" ON public.simulacoes FOR SELECT USING (public.user_belongs_to_empresa(auth.uid(), empresa_id));

-- Artigos policies
CREATE POLICY "Anyone authenticated can view published artigos" ON public.artigos_legais FOR SELECT TO authenticated USING (publicado = true);
CREATE POLICY "Staff can view all artigos" ON public.artigos_legais FOR SELECT USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can manage artigos" ON public.artigos_legais FOR ALL USING (public.is_staff(auth.uid()));

-- Fontes policies
CREATE POLICY "Anyone authenticated can view fontes" ON public.fontes_atualizacao FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can manage fontes" ON public.fontes_atualizacao FOR ALL USING (public.is_staff(auth.uid()));

-- Indexes
CREATE INDEX idx_empresa_usuarios_user ON public.empresa_usuarios(user_id);
CREATE INDEX idx_empresa_usuarios_empresa ON public.empresa_usuarios(empresa_id);
CREATE INDEX idx_produtos_empresa ON public.produtos(empresa_id);
CREATE INDEX idx_servicos_empresa ON public.servicos(empresa_id);
CREATE INDEX idx_creditos_empresa ON public.creditos_aquisicao(empresa_id);
CREATE INDEX idx_simulacoes_empresa ON public.simulacoes(empresa_id);
CREATE INDEX idx_artigos_categoria ON public.artigos_legais(categoria);
CREATE INDEX idx_fontes_categoria ON public.fontes_atualizacao(categoria);