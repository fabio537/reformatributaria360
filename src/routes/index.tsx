import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/AuthContext";
import { useLinkedEmpresa } from "@/hooks/useLinkedEmpresa";

export const Route = createFileRoute("/")({
  component: IndexRedirect,
});

function IndexRedirect() {
  const auth = useAuth();
  const navigate = useNavigate();
  const linkedEmpresa = useLinkedEmpresa();

  useEffect(() => {
    if (!auth.isLoading && !linkedEmpresa.loading) {
      if (!auth.isAuthenticated) {
        navigate({ to: "/login" });
        return;
      }

      if (auth.hasRole("cliente") && linkedEmpresa.empresaId) {
        navigate({ to: "/minha-empresa" });
        return;
      }

      navigate({ to: "/dashboard" });
    }
  }, [auth, linkedEmpresa.empresaId, linkedEmpresa.loading, navigate]);

  return null;
}
