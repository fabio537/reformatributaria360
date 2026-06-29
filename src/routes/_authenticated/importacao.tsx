import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Upload, LineChart, Info } from "lucide-react";
import { useLinkedEmpresa } from "@/hooks/useLinkedEmpresa";
import { ImportDialog } from "@/components/ImportDialog";

export const Route = createFileRoute("/_authenticated/importacao")({
  head: () => ({
    meta: [
      { title: "Importação de Competências Fiscais | Reforma Tributária" },
      {
        name: "description",
        content:
          "Importe planilhas mensais (Saídas, Entradas, Folha e Impostos apurados) para alimentar a Análise Comparativa de cenários.",
      },
    ],
  }),
  component: ImportacaoPage,
});

function ImportacaoPage() {
  const { empresaId, razaoSocial } = useLinkedEmpresa();
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Importação de Competências Fiscais
        </h1>
        <p className="text-sm text-muted-foreground">
          {razaoSocial ?? "Empresa"} — alimente o sistema com as competências mensais
          para gerar a Análise Comparativa e os dashboards.
        </p>
      </div>

      {!empresaId && (
        <Alert variant="destructive">
          <Info className="h-4 w-4" />
          <AlertTitle>Selecione uma empresa</AlertTitle>
          <AlertDescription>
            Escolha uma empresa no seletor do topo para habilitar a importação.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Planilha mensal</CardTitle>
          <CardDescription>
            O modelo (.xlsx) com as abas Saídas, Entradas, Folha e Impostos apurados
            pode ser baixado dentro do importador. O sistema valida os campos e
            faz a deduplicação por competência.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button onClick={() => setOpen(true)} disabled={!empresaId}>
            <Upload className="h-4 w-4 mr-2" /> Importar Competências
          </Button>
          <Button asChild variant="outline">
            <Link to="/analise-comparativa">
              <LineChart className="h-4 w-4 mr-2" /> Ver Análise Comparativa
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Como funciona</AlertTitle>
        <AlertDescription>
          Cada linha corresponde a uma competência (mês/ano). Importações repetidas
          de uma mesma competência atualizam os valores existentes. Após importar,
          acesse o dashboard de Análise Comparativa para visualizar a projeção entre
          SN Atual, SN Híbrido 2027, LP 2026 e LP 2027.
        </AlertDescription>
      </Alert>

      <ImportDialog
        open={open}
        onOpenChange={setOpen}
        tableName="competencias_fiscais"
        entity="competencias_fiscais"
        extraData={{ empresa_id: empresaId }}
        onSuccess={() => setOpen(false)}
        templateFileName="competencias-fiscais"
      />
    </div>
  );
}
