import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Building2 } from "lucide-react";
import { useLinkedEmpresa } from "@/hooks/useLinkedEmpresa";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/minha-empresa")({
  head: () => ({
    meta: [
      { title: "Minha Empresa — Reforma Tributária" },
      { name: "description", content: "Acesso rápido aos dados da empresa vinculada." },
    ],
  }),
  component: MinhaEmpresaPage,
});

function MinhaEmpresaPage() {
  const navigate = useNavigate();
  const linkedEmpresa = useLinkedEmpresa();

  useEffect(() => {
    if (!linkedEmpresa.loading && linkedEmpresa.empresaId) {
      navigate({
        to: "/empresas/$empresaId",
        params: { empresaId: linkedEmpresa.empresaId },
        replace: true,
      });
    }
  }, [linkedEmpresa.empresaId, linkedEmpresa.loading, navigate]);

  if (linkedEmpresa.loading) {
    return <p className="text-sm text-muted-foreground">Carregando empresa vinculada...</p>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Minha Empresa
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Nenhuma empresa está vinculada a este usuário no momento.
        </p>
      </CardContent>
    </Card>
  );
}