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
import { Plus, Search, BookOpen } from "lucide-react";

export const Route = createFileRoute("/_authenticated/base-legal")({
  head: () => ({
    meta: [
      { title: "Base Legal — Reforma Tributária" },
      { name: "description", content: "Biblioteca de artigos e legislação sobre a reforma tributária." },
    ],
  }),
  component: BaseLegalPage,
});

function BaseLegalPage() {
  const auth = useAuth();
  const [artigos, setArtigos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    titulo: "",
    conteudo: "",
    categoria: "geral",
    tags: "",
  });

  const fetchArtigos = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("artigos_legais")
      .select("*")
      .order("created_at", { ascending: false });
    setArtigos(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchArtigos(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const tags = form.tags.split(",").map((t) => t.trim()).filter(Boolean);
    const { error } = await supabase.from("artigos_legais").insert({
      titulo: form.titulo,
      conteudo: form.conteudo,
      categoria: form.categoria,
      tags,
      autor_id: auth.user?.id,
      publicado: true,
    } as any);
    if (!error) {
      setDialogOpen(false);
      setForm({ titulo: "", conteudo: "", categoria: "geral", tags: "" });
      fetchArtigos();
    }
  };

  const filtered = artigos.filter(
    (a) =>
      a.titulo?.toLowerCase().includes(search.toLowerCase()) ||
      a.categoria?.toLowerCase().includes(search.toLowerCase())
  );

  const categorias = ["IBS", "CBS", "Transição", "Créditos", "Simples Nacional", "Geral"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Base Legal</h1>
          <p className="text-muted-foreground mt-1">Artigos e legislação sobre a reforma tributária</p>
        </div>
        {auth.isStaff() && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo Artigo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Criar Artigo</DialogTitle>
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
                  <Label>Categoria</Label>
                  <Input
                    value={form.categoria}
                    onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                    placeholder="Ex: IBS, CBS, Transição"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tags (separadas por vírgula)</Label>
                  <Input
                    value={form.tags}
                    onChange={(e) => setForm({ ...form, tags: e.target.value })}
                    placeholder="Ex: IBS, alíquota, transição"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Conteúdo</Label>
                  <Textarea
                    value={form.conteudo}
                    onChange={(e) => setForm({ ...form, conteudo: e.target.value })}
                    rows={8}
                    required
                  />
                </div>
                <Button type="submit" className="w-full">Publicar</Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar artigos..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Nenhum artigo encontrado.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filtered.map((artigo) => (
            <Card key={artigo.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{artigo.titulo}</CardTitle>
                  <Badge variant="secondary">{artigo.categoria}</Badge>
                </div>
                {artigo.tags?.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {artigo.tags.map((tag: string) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-4">
                  {artigo.conteudo}
                </p>
                <p className="text-xs text-muted-foreground mt-3">
                  {new Date(artigo.created_at).toLocaleDateString("pt-BR")}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
