import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, UserPlus, Shield, Users, Eye } from "lucide-react";
import { toast } from "sonner";
import { createUserFn } from "@/server/create-user";

export const Route = createFileRoute("/_authenticated/usuarios")({
  head: () => ({
    meta: [
      { title: "Usuários — Reforma Tributária" },
      { name: "description", content: "Gestão de usuários e permissões." },
    ],
  }),
  component: UsuariosPage,
});

const roleLabels: Record<string, string> = {
  admin: "Administrador",
  funcionario: "Colaborador",
  cliente: "Cliente",
};

const roleColors: Record<string, "default" | "secondary" | "outline"> = {
  admin: "default",
  funcionario: "secondary",
  cliente: "outline",
};

const roleDescriptions: Record<string, string> = {
  admin: "Acesso total: empresas, dados, simulações e gestão de usuários",
  funcionario: "Edita e gerencia dados de todas as empresas, sem gestão de usuários",
  cliente: "Visualiza apenas a empresa vinculada",
};

function UsuariosPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    nome: "",
    email: "",
    password: "",
    role: "" as string,
    empresa_id: "",
  });

  const fetchData = async () => {
    setLoading(true);
    const [{ data: profiles }, { data: roles }, { data: emps }, { data: links }] =
      await Promise.all([
        supabase.from("profiles").select("*").order("nome"),
        supabase.from("user_roles").select("*"),
        supabase.from("empresas").select("id, razao_social, nome_fantasia").order("razao_social"),
        supabase.from("empresa_usuarios").select("*"),
      ]);

    const combined = (profiles || []).map((p) => ({
      ...p,
      roles: (roles || []).filter((r: any) => r.user_id === p.user_id).map((r: any) => r.role),
      empresas: (links || [])
        .filter((l: any) => l.user_id === p.user_id)
        .map((l: any) => {
          const emp = (emps || []).find((e: any) => e.id === l.empresa_id);
          return emp ? emp.nome_fantasia || emp.razao_social : l.empresa_id;
        }),
    }));

    setUsers(combined);
    setEmpresas(emps || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async () => {
    if (!form.nome || !form.email || !form.password || !form.role) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }
    if (form.password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (form.role === "cliente" && !form.empresa_id) {
      toast.error("Selecione a empresa para vincular o cliente.");
      return;
    }

    setSubmitting(true);
    try {
      await createUserFn({
        data: {
          email: form.email,
          password: form.password,
          nome: form.nome,
          role: form.role as "admin" | "funcionario" | "cliente",
          empresa_id: form.role === "cliente" ? form.empresa_id : undefined,
        },
      });
      toast.success("Usuário criado com sucesso!");
      setDialogOpen(false);
      setForm({ nome: "", email: "", password: "", role: "", empresa_id: "" });
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar usuário.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Usuários</h1>
          <p className="text-muted-foreground mt-1">Gerencie usuários e permissões</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Criar Novo Usuário</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  placeholder="Nome completo"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail *</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="email@exemplo.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha *</Label>
                <Input
                  id="password"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo de Acesso *</Label>
                <Select
                  value={form.role}
                  onValueChange={(v) => setForm({ ...form, role: v, empresa_id: "" })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cliente">
                      <div className="flex items-center gap-2">
                        <Eye className="h-3.5 w-3.5" />
                        Cliente
                      </div>
                    </SelectItem>
                    <SelectItem value="funcionario">
                      <div className="flex items-center gap-2">
                        <Users className="h-3.5 w-3.5" />
                        Colaborador
                      </div>
                    </SelectItem>
                    <SelectItem value="admin">
                      <div className="flex items-center gap-2">
                        <Shield className="h-3.5 w-3.5" />
                        Administrador
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                {form.role && (
                  <p className="text-xs text-muted-foreground">
                    {roleDescriptions[form.role]}
                  </p>
                )}
              </div>

              {form.role === "cliente" && (
                <div className="space-y-2">
                  <Label>Empresa Vinculada *</Label>
                  <Select
                    value={form.empresa_id}
                    onValueChange={(v) => setForm({ ...form, empresa_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a empresa" />
                    </SelectTrigger>
                    <SelectContent>
                      {empresas.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.nome_fantasia || e.razao_social}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Button
                className="w-full"
                onClick={handleCreate}
                disabled={submitting}
              >
                {submitting ? "Criando..." : "Criar Usuário"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Legenda de permissões */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {(["admin", "funcionario", "cliente"] as const).map((role) => (
          <Card key={role} className="border-dashed">
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant={roleColors[role]}>{roleLabels[role]}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{roleDescriptions[role]}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Usuários</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : users.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum usuário encontrado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead>Empresa(s)</TableHead>
                  <TableHead>Criado em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.nome}</TableCell>
                    <TableCell>{u.telefone || "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {u.roles.length === 0 ? (
                          <span className="text-xs text-muted-foreground">Sem perfil</span>
                        ) : (
                          u.roles.map((r: string) => (
                            <Badge key={r} variant={roleColors[r] || "outline"}>
                              {roleLabels[r] || r}
                            </Badge>
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {u.empresas.length > 0 ? (
                        <span className="text-sm">{u.empresas.join(", ")}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(u.created_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
