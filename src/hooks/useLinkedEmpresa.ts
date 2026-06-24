import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/AuthContext";

export interface LinkedEmpresaItem {
  id: string;
  razao_social: string | null;
  cnpj: string | null;
}

interface LinkedEmpresaContextValue {
  empresaId: string | null;
  razaoSocial: string | null;
  cnpj: string | null;
  empresas: LinkedEmpresaItem[];
  loading: boolean;
  hasLinkedEmpresa: boolean;
  hasMultipleEmpresas: boolean;
  isClient: boolean;
  isAdmin: boolean;
  setEmpresaId: (id: string) => void;
}

const STORAGE_KEY = "selected_empresa_id";

const LinkedEmpresaContext = createContext<LinkedEmpresaContextValue | null>(null);

export function EmpresaProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const [empresas, setEmpresas] = useState<LinkedEmpresaItem[]>([]);
  const [empresaId, setEmpresaIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function fetchEmpresas() {
      if (!auth.user) {
        if (active) {
          setEmpresas([]);
          setEmpresaIdState(null);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      let lista: LinkedEmpresaItem[] = [];

      if (auth.isAdmin()) {
        const { data } = await supabase
          .from("empresas")
          .select("id, razao_social, cnpj")
          .eq("ativo", true)
          .order("razao_social", { ascending: true });
        lista = (data ?? []) as LinkedEmpresaItem[];
      } else {
        const { data: vinculos } = await supabase
          .from("empresa_usuarios")
          .select("empresa_id")
          .eq("user_id", auth.user.id);
        const ids = (vinculos ?? []).map((v) => v.empresa_id);
        if (ids.length > 0) {
          const { data } = await supabase
            .from("empresas")
            .select("id, razao_social, cnpj")
            .in("id", ids)
            .order("razao_social", { ascending: true });
          lista = (data ?? []) as LinkedEmpresaItem[];
        }
      }

      if (!active) return;

      const stored = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
      const initial =
        (stored && lista.find((e) => e.id === stored)?.id) ||
        lista[0]?.id ||
        null;

      setEmpresas(lista);
      setEmpresaIdState(initial);
      setLoading(false);
    }

    fetchEmpresas();
    return () => {
      active = false;
    };
  }, [auth.user, auth.isAdmin]);

  const setEmpresaId = useCallback((id: string) => {
    setEmpresaIdState(id);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, id);
    }
  }, []);

  const value = useMemo<LinkedEmpresaContextValue>(() => {
    const current = empresas.find((e) => e.id === empresaId) ?? null;
    return {
      empresaId,
      razaoSocial: current?.razao_social ?? null,
      cnpj: current?.cnpj ?? null,
      empresas,
      loading,
      hasLinkedEmpresa: empresas.length > 0,
      hasMultipleEmpresas: empresas.length > 1,
      isClient: auth.hasRole("cliente"),
      isAdmin: auth.isAdmin(),
      setEmpresaId,
    };
  }, [empresas, empresaId, loading, auth, setEmpresaId]);

  return createElement(LinkedEmpresaContext.Provider, { value }, children);
}

export function useLinkedEmpresa(): LinkedEmpresaContextValue {
  const ctx = useContext(LinkedEmpresaContext);
  if (ctx) return ctx;
  // Fallback no-op state for pages rendered outside the provider (e.g. /login).
  return {
    empresaId: null,
    razaoSocial: null,
    cnpj: null,
    empresas: [],
    loading: false,
    hasLinkedEmpresa: false,
    hasMultipleEmpresas: false,
    isClient: false,
    isAdmin: false,
    setEmpresaId: () => {},
  };
}
