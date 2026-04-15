import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Plus, ExternalLink, Newspaper } from "lucide-react";

export const Route = createFileRoute("/_authenticated/atualizacoes")({
  head: () => ({
    meta: [
      { title: "Atualizações — Reforma Tributária" },
      { name: "description", content: "Feed de notícias e atualizações sobre a reforma tributária." },
    ],
  }),
  component: AtualizacoesPage,
});

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Atualizações</h1>
          <p className="text-muted-foreground mt-1">Notícias e fontes sobre a reforma tributária</p>
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
                  <Input
                    value={form.titulo}
                    onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>URL</Label>
                  <Input
                    type="url"
                    value={form.url}
                    onChange={(e) => setForm({ ...form, url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Input
                    value={form.categoria}
                    onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Resumo</Label>
                  <Textarea
                    value={form.resumo}
                    onChange={(e) => setForm({ ...form, resumo: e.target.value })}
                    rows={4}
                  />
                </div>
                <Button type="submit" className="w-full">Adicionar</Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
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
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{f.titulo}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{f.categoria}</Badge>
                    <Badge variant="outline">{f.fonte}</Badge>
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
  );
}
