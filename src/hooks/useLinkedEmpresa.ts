import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/AuthContext";

export interface LinkedEmpresaItem {
  id: string;
  razao_social: string | null;
  cnpj: string | null;
}

interface LinkedEmpresaState {
  empresaId: string | null;
  razaoSocial: string | null;
  cnpj: string | null;
  empresas: LinkedEmpresaItem[];
  loading: boolean;
}

export function useLinkedEmpresa() {
  const auth = useAuth();
  const [state, setState] = useState<LinkedEmpresaState>({
    empresaId: null,
    razaoSocial: null,
    cnpj: null,
    empresas: [],
    loading: true,
  });

  useEffect(() => {
    let active = true;

    async function fetchLinkedEmpresa() {
      if (!auth.user) {
        if (active) {
          setState({
            empresaId: null,
            razaoSocial: null,
            cnpj: null,
            empresas: [],
            loading: false,
          });
        }
        return;
      }

      // Admins ganham acesso a TODAS as empresas como "Minhas Empresas",
      // independente de qualquer vínculo em empresa_usuarios.
      if (auth.isAdmin()) {
        const { data: empresas } = await supabase
          .from("empresas")
          .select("id, razao_social, cnpj")
          .eq("ativo", true)
          .order("razao_social", { ascending: true });

        const lista = (empresas ?? []) as LinkedEmpresaItem[];
        const primeira = lista[0] ?? null;

        if (active) {
          setState({
            empresaId: primeira?.id ?? null,
            razaoSocial: primeira?.razao_social ?? null,
            cnpj: primeira?.cnpj ?? null,
            empresas: lista,
            loading: false,
          });
        }
        return;
      }

      const { data: vinculos } = await supabase
        .from("empresa_usuarios")
        .select("empresa_id")
        .eq("user_id", auth.user.id);

      const ids = (vinculos ?? []).map((v) => v.empresa_id);
      if (ids.length === 0) {
        if (active) {
          setState({
            empresaId: null,
            razaoSocial: null,
            cnpj: null,
            empresas: [],
            loading: false,
          });
        }
        return;
      }

      const { data: empresas } = await supabase
        .from("empresas")
        .select("id, razao_social, cnpj")
        .in("id", ids)
        .order("razao_social", { ascending: true });

      const lista = (empresas ?? []) as LinkedEmpresaItem[];
      const primeira = lista[0] ?? null;

      if (active) {
        setState({
          empresaId: primeira?.id ?? null,
          razaoSocial: primeira?.razao_social ?? null,
          cnpj: primeira?.cnpj ?? null,
          empresas: lista,
          loading: false,
        });
      }
    }

    setState((current) => ({ ...current, loading: true }));
    fetchLinkedEmpresa();

    return () => {
      active = false;
    };
  }, [auth.user, auth.isAdmin]);

  return useMemo(
    () => ({
      ...state,
      hasLinkedEmpresa: state.empresas.length > 0,
      hasMultipleEmpresas: state.empresas.length > 1,
      isClient: auth.hasRole("cliente"),
      isAdmin: auth.isAdmin(),
    }),
    [auth, state]
  );
}
