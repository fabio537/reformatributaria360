import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

const CHECKLIST_ITEMS = [
  {
    categoria: "Preparação Interna",
    itens: [
      { key: "mapa_perfil", label: "Mapa do perfil de fornecedores e clientes" },
      { key: "saneamento_cadastros", label: "Saneamento de cadastros (itens, fornecedores, clientes)" },
      { key: "calculo_precos_liquidos", label: "Cálculo dos preços líquidos" },
      { key: "atualizacao_erp", label: "Atualização do ERP (bases de cálculo, alíquotas, CST, cClassTrib)" },
      { key: "notas_tecnicas_xml", label: "Atualização das notas técnicas XML" },
      { key: "parametros_erp", label: "Parâmetros no ERP (TES, Tabela Z, J1BTAX, TAXBRA)" },
      { key: "destaque_aliquotas_nf", label: "Destaque obrigatório de IBS/CBS na NF a partir de ago/2026 (exceto Simples em 2026)" },
    ],
  },
  {
    categoria: "Estratégia Comercial",
    itens: [
      { key: "ecossistema_comunicacao", label: "Ecossistema de fornecedores/clientes — comunicação e preparação" },
      { key: "pos_ibs_cbs", label: "Preparação de Pedidos de Compra (POs) com IBS/CBS" },
      { key: "gross_up", label: "Gross Up com novos tributos na base dos antigos" },
      { key: "repasse_tributos", label: "Repassar aumento/redução de tributos ao mercado" },
      { key: "curva_a", label: "Foco em fornecedores da CURVA A" },
      { key: "revisao_contratos", label: "Revisão de preços com contratos atualizados" },
    ],
  },
  {
    categoria: "Decisões Estratégicas 2026–2027",
    itens: [
      { key: "alterar_bc_2026", label: "Alterar ou não alterar BC e preços em 2026?" },
      { key: "laboratorio_precos", label: "2026: Laboratório de preços, testes e (re)testes" },
      { key: "nota_debito_credito", label: "Nota de débito/crédito, Multa e Juros, Ajustes de estorno" },
      { key: "recursos_equipe", label: "Recursos escassos e limitados — planejamento de equipe" },
      { key: "recuperacao_pis_cofins", label: "Recuperação Tributária Acelerada (PIS/COFINS extintos em 2027)" },
    ],
  },
  {
    categoria: "Live P&N Valorem — Ações até 31/12/2026 (URGENTE)",
    itens: [
      { key: "live_efd_pis_cofins", label: "🔴 Regularizar EFD-Contribuições e levantar saldo de PIS/Cofins acumulado (prazo 31/12/2026)" },
      { key: "live_ressarcir_ipi", label: "🔴 Monetizar créditos de IPI via ressarcimento administrativo no e-CAC (não migram para CBS)" },
      { key: "live_opcao_hibrido_set", label: "🔴 Avaliar opção pelo Simples Híbrido — janela 1º a 30/set/2026 (clientes B2B)" },
    ],
  },
  {
    categoria: "Live P&N Valorem — Prioridade Alta",
    itens: [
      { key: "live_inventario_estoque_381", label: "🟠 Inventário de estoques em 01/01/2027 para crédito presumido CBS (Art. 381 LC 214)" },
      { key: "live_erp_cclasstrib", label: "🟠 Atualizar ERP: CBS/IBS por fora, cClassTrib, layouts NF-e, nova base de cálculo" },
      { key: "live_simulacao_preco_rs", label: "🟠 Simular impacto na precificação com novo ICMS RS interno (17%) e CBS por fora" },
    ],
  },
  {
    categoria: "Live P&N Valorem — Prioridade Média",
    itens: [
      { key: "live_renegociacao_contratos", label: "🟡 Renegociar contratos com fornecedores e clientes considerando nova cadeia de créditos" },
      { key: "live_fornecedores_sn", label: "🟡 Avaliar se fornecedores do Simples precisam migrar para híbrido (impacto nos créditos de entrada)" },
      { key: "live_sefaz_rs_plp16", label: "🟡 Monitorar posição da SEFAZ/RS e PLP 16/2025 sobre CBS/IBS na base do ICMS para 2027" },
      { key: "live_split_art36", label: "🟡 Definir política de uso do Art. 36 (Split via comprador) em jan/2027 — risco de crédito podre" },
    ],
  },
];

const ALL_KEYS = CHECKLIST_ITEMS.flatMap((c) => c.itens.map((i) => i.key));

interface Props {
  empresaId: string;
}

type ItemState = { concluido: boolean; observacao: string };

export function ChecklistReformaTab({ empresaId }: Props) {
  const [items, setItems] = useState<Record<string, ItemState>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("checklist_reforma")
        .select("item_key, concluido, observacao")
        .eq("empresa_id", empresaId);

      const map: Record<string, ItemState> = {};
      ALL_KEYS.forEach((k) => (map[k] = { concluido: false, observacao: "" }));
      data?.forEach((r) => {
        map[r.item_key] = { concluido: r.concluido, observacao: r.observacao || "" };
      });
      setItems(map);
      setLoading(false);
    })();
  }, [empresaId]);

  const upsert = useCallback(
    async (key: string, patch: Partial<ItemState>) => {
      const current = items[key] || { concluido: false, observacao: "" };
      const next = { ...current, ...patch };
      setItems((prev) => ({ ...prev, [key]: next }));

      const { error } = await supabase.from("checklist_reforma").upsert(
        {
          empresa_id: empresaId,
          item_key: key,
          concluido: next.concluido,
          observacao: next.observacao || null,
        },
        { onConflict: "empresa_id,item_key" }
      );
      if (error) toast.error(error.message);
    },
    [empresaId, items]
  );

  if (loading) return <p className="text-sm text-muted-foreground">Carregando...</p>;

  const total = ALL_KEYS.length;
  const done = ALL_KEYS.filter((k) => items[k]?.concluido).length;
  const pct = Math.round((done / total) * 100);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">
            {done} de {total} concluídos — {pct}%
          </span>
        </div>
        <Progress value={pct} className="h-3" />
      </div>

      {CHECKLIST_ITEMS.map((cat) => (
        <div key={cat.categoria} className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {cat.categoria}
          </h3>
          <div className="space-y-2">
            {cat.itens.map((item) => {
              const state = items[item.key] || { concluido: false, observacao: "" };
              return (
                <div
                  key={item.key}
                  className="flex items-start gap-3 rounded-md border p-3"
                >
                  <Checkbox
                    checked={state.concluido}
                    onCheckedChange={(v) => upsert(item.key, { concluido: !!v })}
                    className="mt-0.5"
                  />
                  <div className="flex-1 space-y-1">
                    <span
                      className={`text-sm ${state.concluido ? "line-through text-muted-foreground" : ""}`}
                    >
                      {item.label}
                    </span>
                    <Input
                      placeholder="Observação..."
                      value={state.observacao}
                      onChange={(e) =>
                        setItems((prev) => ({
                          ...prev,
                          [item.key]: { ...state, observacao: e.target.value },
                        }))
                      }
                      onBlur={() => upsert(item.key, { observacao: state.observacao })}
                      className="h-7 text-xs"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
