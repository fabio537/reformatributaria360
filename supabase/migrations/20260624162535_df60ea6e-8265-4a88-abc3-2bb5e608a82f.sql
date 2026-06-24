-- ============================================================
-- SEED DE TESTE — dados fictícios para validar o simulador
-- Para remover todos os dados de teste manualmente, execute:
--   DELETE FROM public.empresas WHERE cnpj LIKE '99.%';
--   (cascata cuidará de produtos, servicos, creditos_aquisicao, empresa_usuarios)
-- ============================================================

DO $seed$
DECLARE
  v_admin uuid;
  v_e1 uuid;
  v_e2 uuid;
  v_e3 uuid;
  v_start date := '2025-07-01';
  v_end   date := '2026-06-01';
BEGIN
  -- 0) Limpeza idempotente: apaga seeds anteriores (CNPJs 99.*)
  DELETE FROM public.creditos_aquisicao
    WHERE empresa_id IN (SELECT id FROM public.empresas WHERE cnpj LIKE '99.%');
  DELETE FROM public.produtos
    WHERE empresa_id IN (SELECT id FROM public.empresas WHERE cnpj LIKE '99.%');
  DELETE FROM public.servicos
    WHERE empresa_id IN (SELECT id FROM public.empresas WHERE cnpj LIKE '99.%');
  DELETE FROM public.empresa_usuarios
    WHERE empresa_id IN (SELECT id FROM public.empresas WHERE cnpj LIKE '99.%');
  DELETE FROM public.empresas WHERE cnpj LIKE '99.%';

  -- Localiza usuário admin para vincular as empresas (opcional, só se existir)
  SELECT user_id INTO v_admin FROM public.user_roles WHERE role = 'admin' LIMIT 1;

  -- ============================================================
  -- EMPRESA 1 — Indústria, LUCRO REAL
  -- ============================================================
  INSERT INTO public.empresas (cnpj, razao_social, nome_fantasia, regime_tributario,
                               cnae_principal, uf, municipio, faturamento_anual, ativo)
  VALUES ('99.111.111/0001-11', '[TESTE] Indústria Modelo Ltda', '[TESTE] Indústria Modelo',
          'lucro_real', '2620-3/00', 'SP', 'São Paulo', 1920000, true)
  RETURNING id INTO v_e1;

  -- Produto 1: Notebook (padrao)
  INSERT INTO public.produtos (empresa_id, ncm, descricao, regime_diferenciado,
    aliquota_icms, aliquota_ipi, aliquota_pis, aliquota_cofins,
    aliquota_ibs, aliquota_cbs, cclasstrib, cst, regime_especial, reducao_aplicada,
    competencia, valor_mensal)
  SELECT v_e1, '84713012', 'Notebook', 'padrao',
    18, 5, 1.65, 7.6, 17.7, 8.8, '000001', '00', NULL, 0,
    d::date, ROUND((80000 * (0.9 + random() * 0.2))::numeric, 2)
  FROM generate_series(v_start, v_end, interval '1 month') d;

  -- Produto 2: Medicamento (reducao_60)
  INSERT INTO public.produtos (empresa_id, ncm, descricao, regime_diferenciado,
    aliquota_icms, aliquota_ipi, aliquota_pis, aliquota_cofins,
    aliquota_ibs, aliquota_cbs, cclasstrib, cst, regime_especial, reducao_aplicada,
    competencia, valor_mensal)
  SELECT v_e1, '30049099', 'Medicamento', 'reducao_60',
    12, 0, 1.65, 7.6, 7.08, 3.52, '000200', '20', 'reducao_60', 60,
    d::date, ROUND((50000 * (0.9 + random() * 0.2))::numeric, 2)
  FROM generate_series(v_start, v_end, interval '1 month') d;

  -- Produto 3: Arroz (aliquota_zero — cesta básica)
  INSERT INTO public.produtos (empresa_id, ncm, descricao, regime_diferenciado,
    aliquota_icms, aliquota_ipi, aliquota_pis, aliquota_cofins,
    aliquota_ibs, aliquota_cbs, cclasstrib, cst, regime_especial, reducao_aplicada,
    competencia, valor_mensal)
  SELECT v_e1, '10063021', 'Arroz', 'aliquota_zero',
    7, 0, 0, 0, 0, 0, '000400', '40', 'cesta_basica', 100,
    d::date, ROUND((30000 * (0.9 + random() * 0.2))::numeric, 2)
  FROM generate_series(v_start, v_end, interval '1 month') d;

  -- Créditos E1: insumo padrao
  INSERT INTO public.creditos_aquisicao (empresa_id, fornecedor, ncm, descricao,
    regime_diferenciado_fornecedor,
    aliquota_pis, aliquota_cofins, aliquota_icms, aliquota_ipi,
    competencia, valor_mensal)
  SELECT v_e1, 'Fornecedor Alfa Componentes Ltda', '85423100', 'Circuitos integrados',
    'padrao', 1.65, 7.6, 18, 5,
    d::date, ROUND((40000 * (0.9 + random() * 0.2))::numeric, 2)
  FROM generate_series(v_start, v_end, interval '1 month') d;

  -- Créditos E1: insumo reducao_60 (ex: insumo agrícola)
  INSERT INTO public.creditos_aquisicao (empresa_id, fornecedor, ncm, descricao,
    regime_diferenciado_fornecedor,
    aliquota_pis, aliquota_cofins, aliquota_icms, aliquota_ipi,
    competencia, valor_mensal)
  SELECT v_e1, 'Beta Insumos Agroindustriais SA', '38089329', 'Insumo agroindustrial',
    'reducao_60', 1.65, 7.6, 7, 0,
    d::date, ROUND((20000 * (0.9 + random() * 0.2))::numeric, 2)
  FROM generate_series(v_start, v_end, interval '1 month') d;

  -- ============================================================
  -- EMPRESA 2 — Serviços, LUCRO PRESUMIDO
  -- ============================================================
  INSERT INTO public.empresas (cnpj, razao_social, nome_fantasia, regime_tributario,
                               cnae_principal, uf, municipio, faturamento_anual, ativo)
  VALUES ('99.222.222/0001-22', '[TESTE] Serviços Profissionais SA', '[TESTE] Serviços Profissionais',
          'lucro_presumido', '7112-0/00', 'RJ', 'Rio de Janeiro', 1020000, true)
  RETURNING id INTO v_e2;

  -- Serviço 1: Consultoria de engenharia (reducao_30 — profissão regulamentada)
  INSERT INTO public.servicos (empresa_id, codigo_servico, descricao, regime_diferenciado,
    aliquota_iss, aliquota_pis, aliquota_cofins,
    aliquota_ibs, aliquota_cbs, cclasstrib,
    competencia, valor_mensal)
  SELECT v_e2, '0701', 'Consultoria de engenharia', 'reducao_30',
    5, 0.65, 3, 12.39, 6.16, '000300',
    d::date, ROUND((40000 * (0.9 + random() * 0.2))::numeric, 2)
  FROM generate_series(v_start, v_end, interval '1 month') d;

  -- Serviço 2: Saúde (reducao_60)
  INSERT INTO public.servicos (empresa_id, codigo_servico, descricao, regime_diferenciado,
    aliquota_iss, aliquota_pis, aliquota_cofins,
    aliquota_ibs, aliquota_cbs, cclasstrib,
    competencia, valor_mensal)
  SELECT v_e2, '0401', 'Serviço de saúde', 'reducao_60',
    3, 0.65, 3, 7.08, 3.52, '000200',
    d::date, ROUND((25000 * (0.9 + random() * 0.2))::numeric, 2)
  FROM generate_series(v_start, v_end, interval '1 month') d;

  -- Serviço 3: Educação (reducao_60)
  INSERT INTO public.servicos (empresa_id, codigo_servico, descricao, regime_diferenciado,
    aliquota_iss, aliquota_pis, aliquota_cofins,
    aliquota_ibs, aliquota_cbs, cclasstrib,
    competencia, valor_mensal)
  SELECT v_e2, '0801', 'Serviço de educação', 'reducao_60',
    2, 0.65, 3, 7.08, 3.52, '000200',
    d::date, ROUND((20000 * (0.9 + random() * 0.2))::numeric, 2)
  FROM generate_series(v_start, v_end, interval '1 month') d;

  -- Crédito pequeno E2 (serviço toma pouco crédito — proposital)
  INSERT INTO public.creditos_aquisicao (empresa_id, fornecedor, ncm, descricao,
    regime_diferenciado_fornecedor,
    aliquota_pis, aliquota_cofins, aliquota_icms, aliquota_ipi,
    competencia, valor_mensal)
  SELECT v_e2, 'Gama Materiais de Escritório Ltda', '48201000', 'Material de escritório',
    'padrao', 1.65, 7.6, 18, 0,
    d::date, ROUND((3000 * (0.9 + random() * 0.2))::numeric, 2)
  FROM generate_series(v_start, v_end, interval '1 month') d;

  -- ============================================================
  -- EMPRESA 3 — Pequeno negócio, SIMPLES NACIONAL
  -- ============================================================
  INSERT INTO public.empresas (cnpj, razao_social, nome_fantasia, regime_tributario,
                               cnae_principal, uf, municipio, faturamento_anual, optante_simples_mei, ativo)
  VALUES ('99.333.333/0001-33', '[TESTE] Comércio Local ME', '[TESTE] Comércio Local',
          'simples_nacional', '4712-1/00', 'MG', 'Belo Horizonte', 300000, true, true)
  RETURNING id INTO v_e3;

  -- Produto 1: item padrao (mercearia)
  INSERT INTO public.produtos (empresa_id, ncm, descricao, regime_diferenciado,
    aliquota_icms, aliquota_ipi, aliquota_pis, aliquota_cofins,
    aliquota_ibs, aliquota_cbs, cclasstrib, cst, regime_especial, reducao_aplicada,
    competencia, valor_mensal)
  SELECT v_e3, '21069090', 'Produto alimentício diverso', 'padrao',
    18, 0, 0, 0, 17.7, 8.8, '000001', '00', NULL, 0,
    d::date, ROUND((18000 * (0.9 + random() * 0.2))::numeric, 2)
  FROM generate_series(v_start, v_end, interval '1 month') d;

  -- Produto 2: item imune (livro)
  INSERT INTO public.produtos (empresa_id, ncm, descricao, regime_diferenciado,
    aliquota_icms, aliquota_ipi, aliquota_pis, aliquota_cofins,
    aliquota_ibs, aliquota_cbs, cclasstrib, cst, regime_especial, reducao_aplicada,
    competencia, valor_mensal)
  SELECT v_e3, '49019900', 'Livros', 'imune',
    0, 0, 0, 0, 0, 0, '000500', '41', 'imunidade', 100,
    d::date, ROUND((7000 * (0.9 + random() * 0.2))::numeric, 2)
  FROM generate_series(v_start, v_end, interval '1 month') d;

  -- ============================================================
  -- Vincula as 3 empresas ao usuário admin (se existir)
  -- ============================================================
  IF v_admin IS NOT NULL THEN
    INSERT INTO public.empresa_usuarios (empresa_id, user_id) VALUES
      (v_e1, v_admin), (v_e2, v_admin), (v_e3, v_admin);
  END IF;
END
$seed$;