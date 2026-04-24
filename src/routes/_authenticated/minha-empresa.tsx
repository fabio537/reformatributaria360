import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Building2, ArrowRight } from "lucide-react";
import { useLinkedEmpresa } from "@/hooks/useLinkedEmpresa";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCnpj } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/minha-empresa")({
  head: () => ({
    meta: [
      { title: "Minhas Empresas — Reforma Tributária" },
      { name: "description", content: "Acesso rápido às empresas vinculadas." },
    ],
  }),
  component: MinhaEmpresaPage,
});

function MinhaEmpresaPage() {
  const navigate = useNavigate();
  const linkedEmpresa = useLinkedEmpresa();

  // Quando há apenas uma empresa, redireciona direto para o detalhe
  useEffect(() => {
    if (
      !linkedEmpresa.loading &&
      linkedEmpresa.empresaId &&
      !linkedEmpresa.hasMultipleEmpresas
    ) {
      navigate({
        to: "/empresas/$empresaId",
        params: { empresaId: linkedEmpresa.empresaId },
        replace: true,
      });
    }
  }, [
    linkedEmpresa.empresaId,
    linkedEmpresa.loading,
    linkedEmpresa.hasMultipleEmpresas,
    navigate,
  ]);

  if (linkedEmpresa.loading) {
    return <p className="text-sm text-muted-foreground">Carregando empresas...</p>;
  }

  if (!linkedEmpresa.hasLinkedEmpresa) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Minhas Empresas
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

  // Lista (admin com várias empresas)
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Building2 className="h-6 w-6" />
          Minhas Empresas
        </h1>
        <p className="text-sm text-muted-foreground">
          {linkedEmpresa.isAdmin
            ? "Como administrador, você tem acesso a todas as empresas cadastradas."
            : "Empresas vinculadas ao seu usuário."}
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {linkedEmpresa.empresas.map((empresa) => (
          <Card key={empresa.id} className="hover:border-primary transition-colors">
            <CardHeader className="pb-3">
              <CardTitle className="text-base truncate">
                {empresa.razao_social ?? "Empresa sem nome"}
              </CardTitle>
              {empresa.cnpj && (
                <CardDescription className="font-mono text-xs">
                  {formatCnpj(empresa.cnpj)}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <Button asChild size="sm" className="w-full">
                <Link
                  to="/empresas/$empresaId"
                  params={{ empresaId: empresa.id }}
                >
                  Acessar
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
