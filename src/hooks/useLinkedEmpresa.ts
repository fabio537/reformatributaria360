import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/AuthContext";

interface LinkedEmpresaState {
  empresaId: string | null;
  razaoSocial: string | null;
  cnpj: string | null;
  loading: boolean;
}

export function useLinkedEmpresa() {
  const auth = useAuth();
  const [state, setState] = useState<LinkedEmpresaState>({
    empresaId: null,
    razaoSocial: null,
    cnpj: null,
    loading: true,
  });

  useEffect(() => {
    let active = true;

    async function fetchLinkedEmpresa() {
      if (!auth.user) {
        if (active) {
          setState({ empresaId: null, razaoSocial: null, cnpj: null, loading: false });
        }
        return;
      }

      const { data: vinculo } = await supabase
        .from("empresa_usuarios")
        .select("empresa_id")
        .eq("user_id", auth.user.id)
        .limit(1)
        .maybeSingle();

      if (!vinculo?.empresa_id) {
        if (active) {
          setState({ empresaId: null, razaoSocial: null, cnpj: null, loading: false });
        }
        return;
      }

      const { data: empresa } = await supabase
        .from("empresas")
        .select("id, razao_social, cnpj")
        .eq("id", vinculo.empresa_id)
        .maybeSingle();

      if (active) {
        setState({
          empresaId: empresa?.id ?? vinculo.empresa_id,
          razaoSocial: empresa?.razao_social ?? null,
          cnpj: empresa?.cnpj ?? null,
          loading: false,
        });
      }
    }

    setState((current) => ({ ...current, loading: true }));
    fetchLinkedEmpresa();

    return () => {
      active = false;
    };
  }, [auth.user]);

  return useMemo(
    () => ({
      ...state,
      hasLinkedEmpresa: !!state.empresaId,
      isClient: auth.hasRole("cliente"),
    }),
    [auth, state]
  );
}