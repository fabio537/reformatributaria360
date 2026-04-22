import { createFileRoute, Link } from "@tanstack/react-router";
import { ClipboardList, ExternalLink } from "lucide-react";
import { ChecklistReformaTab } from "@/components/ChecklistReformaTab";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLinkedEmpresa } from "@/hooks/useLinkedEmpresa";
import { formatCnpj } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/checklist")({
  head: () => ({
    meta: [
      { title: "Checklist da Reforma — Reforma Tributária" },
      { name: "description", content: "Acompanhe as ações prioritárias da empresa vinculada frente à reforma tributária." },
    ],
  }),
  component: ChecklistPage,
});

function ChecklistPage() {
  const linkedEmpresa = useLinkedEmpresa();

  if (linkedEmpresa.loading) {
    return <p className="text-sm text-muted-foreground">Carregando checklist...</p>;
  }

  if (!linkedEmpresa.empresaId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Checklist</CardTitle>
          <CardDescription>Não há empresa vinculada para exibir o checklist.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
            <ClipboardList className="h-7 w-7" />
            Checklist da Reforma
          </h1>
          <p className="mt-1 text-muted-foreground">
            {linkedEmpresa.razaoSocial}
            {linkedEmpresa.cnpj ? ` • ${formatCnpj(linkedEmpresa.cnpj)}` : ""}
          </p>
        </div>
        <Link to="/empresas/$empresaId" params={{ empresaId: linkedEmpresa.empresaId }}>
          <Button variant="outline">
            <ExternalLink className="mr-2 h-4 w-4" />
            Abrir empresa
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Etapas prioritárias</CardTitle>
          <CardDescription>
            Registre o andamento das ações necessárias para a empresa frente à reforma tributária.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChecklistReformaTab empresaId={linkedEmpresa.empresaId} />
        </CardContent>
      </Card>
    </div>
  );
}