import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

export type AppRole = "admin" | "funcionario" | "cliente";

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  session: Session | null;
  roles: AppRole[];
  hasRole: (role: AppRole) => boolean;
  isStaff: () => boolean;
  isAdmin: () => boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, nome: string) => Promise<void>;
  logout: () => Promise<void>;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRoles = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    if (data) {
      setRoles(data.map((r: { role: AppRole }) => r.role));
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => fetchRoles(session.user.id), 0);
        } else {
          setRoles([]);
        }
        setIsLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchRoles(session.user.id);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchRoles]);

  const hasRole = useCallback((role: AppRole) => roles.includes(role), [roles]);
  const isStaff = useCallback(() => roles.includes("admin") || roles.includes("funcionario"), [roles]);
  const isAdmin = useCallback(() => roles.includes("admin"), [roles]);

  const login = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signup = useCallback(async (email: string, password: string, nome: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nome } },
    });
    if (error) throw error;
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return {
    isAuthenticated: !!session,
    isLoading,
    user,
    session,
    roles,
    hasRole,
    isStaff,
    isAdmin,
    login,
    signup,
    logout,
  };
}
