import { createFileRoute } from "@tanstack/react-router";
import { DollarSign } from "lucide-react";
import { PrecificacaoView } from "@/components/PrecificacaoView";

export const Route = createFileRoute("/_authenticated/precificacao")({
  head: () => ({
    meta: [
      { title: "Precificação por Produto — Reforma Tributária" },
      { name: "description", content: "Compare cenários de preço e margem para cada produto sob o novo regime IBS/CBS." },
    ],
  }),
  component: PrecificacaoPage,
});

function PrecificacaoPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
          <DollarSign className="h-7 w-7" />
          Precificação por Produto
        </h1>
        <p className="mt-1 text-muted-foreground">
          Compare “manter preço” vs “preservar margem” para cada produto, ano a ano da transição.
        </p>
      </div>
      <PrecificacaoView />
    </div>
  );
}
