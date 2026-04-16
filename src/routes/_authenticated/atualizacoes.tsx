import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, ExternalLink, Newspaper, Globe, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/_authenticated/atualizacoes")({
  head: () => ({
    meta: [
      { title: "Atualizações — Reforma Tributária" },
      { name: "description", content: "Feed de notícias e atualizações sobre a reforma tributária." },
    ],
  }),
  component: AtualizacoesPage,
});

const PORTAIS_GOVERNAMENTAIS = [
  {
    nome: "Ministério da Fazenda",
    url: "https://www.gov.br/fazenda/pt-br/acesso-a-informacao/acoes-e-programas/reforma-tributaria",
    desc: "Portal oficial com notas técnicas, simuladores e calendário de regulamentações",
    cor: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  },
  {
    nome: "Receita Federal",
    url: "https://www.gov.br/receitafederal/pt-br/assuntos/reforma-tributaria",
    desc: "Instruções normativas, CBS, obrigações acessórias e NF-e",
    cor: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  },
  {
    nome: "Senado Federal",
    url: "https://www12.senado.leg.br/noticias/assuntos/reforma-tributaria",
    desc: "Tramitação de PLPs, audiências públicas e votações",
    cor: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  },
  {
    nome: "Câmara dos Deputados",
    url: "https://www.camara.leg.br/noticias/reforma-tributaria",
    desc: "Emendas, destaques e regulamentação complementar",
    cor: "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200",
  },
  {
    nome: "Diário Oficial da União",
    url: "https://www.in.gov.br/servicos/diario-oficial-da-uniao",
    desc: "Publicações oficiais: leis, decretos, portarias e resoluções do CGIBS",
    cor: "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200",
  },
  {
    nome: "CONFAZ",
    url: "https://www.confaz.fazenda.gov.br/",
    desc: "Convênios e protocolos para transição ICMS → IBS",
    cor: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
  },
];

function AtualizacoesPage() {
  const auth = useAuth();
  const [fontes, setFontes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    titulo: "",
    url: "",
    resumo: "",
    categoria: "geral",
  });

  const fetchFontes = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("fontes_atualizacao")
      .select("*")
      .order("data_publicacao", { ascending: false });
    setFontes(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchFontes(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("fontes_atualizacao").insert({
      titulo: form.titulo,
      url: form.url || null,
      resumo: form.resumo || null,
      categoria: form.categoria,
      fonte: "manual",
    } as any);
    if (!error) {
      setDialogOpen(false);
      setForm({ titulo: "", url: "", resumo: "", categoria: "geral" });
      fetchFontes();
    }
  };

  // Separar portais governamentais e demais fontes
  const portaisDb = fontes.filter((f) => f.categoria === "Portal Governamental" || f.categoria === "Legislação Oficial");
  const noticias = fontes.filter((f) => f.categoria !== "Portal Governamental" && f.categoria !== "Legislação Oficial");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Atualizações</h1>
          <p className="text-muted-foreground mt-1">Notícias e fontes oficiais sobre a reforma tributária</p>
        </div>
        {auth.isStaff() && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nova Fonte
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Fonte</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label>Título</Label>
                  <Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>URL</Label>
                  <Input type="url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://..." />
                </div>
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Input value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Resumo</Label>
                  <Textarea value={form.resumo} onChange={(e) => setForm({ ...form, resumo: e.target.value })} rows={4} />
                </div>
                <Button type="submit" className="w-full">Adicionar</Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Portais Governamentais — Acesso Rápido */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Portais Governamentais</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Acesse diretamente os portais oficiais para acompanhar a regulamentação em tempo real.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PORTAIS_GOVERNAMENTAIS.map((portal) => (
            <a
              key={portal.nome}
              href={portal.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group block"
            >
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardContent className="pt-4 pb-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge className={portal.cor}>{portal.nome}</Badge>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{portal.desc}</p>
                </CardContent>
              </Card>
            </a>
          ))}
        </div>
      </div>

      {/* Fontes do banco de dados */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Newspaper className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Fontes e Notícias</h2>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : fontes.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Newspaper className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Nenhuma atualização disponível.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {fontes.map((f) => (
              <Card key={f.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{f.titulo}</CardTitle>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="secondary" className="text-xs">{f.categoria}</Badge>
                      <Badge variant="outline" className="text-xs">{f.fonte}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {f.resumo && (
                    <p className="text-sm text-muted-foreground mb-3">{f.resumo}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      {f.data_publicacao ? new Date(f.data_publicacao).toLocaleDateString("pt-BR") : "—"}
                    </p>
                    {f.url && (
                      <a
                        href={f.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary flex items-center gap-1 hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Abrir fonte
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
