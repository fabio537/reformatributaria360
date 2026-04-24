import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import { UserPlus, Shield, Users, Eye, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { createUserFn } from "@/server/create-user";
import { updateUserFn } from "@/server/update-user";

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

type UserRow = {
  id: string;
  user_id: string;
  nome: string;
  telefone: string | null;
  created_at: string;
  roles: string[];
  empresa_ids: string[];
  empresas: string[];
};

type EmpresaRow = { id: string; razao_social: string; nome_fantasia: string | null };

function UsuariosPage() {
  const createUser = useServerFn(createUserFn);
  const updateUser = useServerFn(updateUserFn);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [empresas, setEmpresas] = useState<EmpresaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [editForm, setEditForm] = useState({
    nome: "",
    telefone: "",
    role: "" as string,
    empresa_ids: [] as string[],
    new_password: "",
  });

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

    const combined: UserRow[] = (profiles || []).map((p: any) => {
      const userLinks = (links || []).filter((l: any) => l.user_id === p.user_id);
      return {
        id: p.id,
        user_id: p.user_id,
        nome: p.nome,
        telefone: p.telefone,
        created_at: p.created_at,
        roles: (roles || []).filter((r: any) => r.user_id === p.user_id).map((r: any) => r.role),
        empresa_ids: userLinks.map((l: any) => l.empresa_id),
        empresas: userLinks.map((l: any) => {
          const emp = (emps || []).find((e: any) => e.id === l.empresa_id);
          return emp ? emp.nome_fantasia || emp.razao_social : l.empresa_id;
        }),
      };
    });

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

  const openEdit = (u: UserRow) => {
    setEditing(u);
    setEditForm({
      nome: u.nome || "",
      telefone: u.telefone || "",
      role: u.roles[0] || "",
      empresa_ids: [...u.empresa_ids],
      new_password: "",
    });
    setEditOpen(true);
  };

  const toggleEmpresa = (empresaId: string, checked: boolean) => {
    setEditForm((prev) => ({
      ...prev,
      empresa_ids: checked
        ? [...prev.empresa_ids, empresaId]
        : prev.empresa_ids.filter((id) => id !== empresaId),
    }));
  };

  const handleUpdate = async () => {
    if (!editing) return;
    if (!editForm.nome.trim()) {
      toast.error("O nome é obrigatório.");
      return;
    }
    if (!editForm.role) {
      toast.error("Selecione o tipo de acesso.");
      return;
    }
    if (editForm.role === "cliente" && editForm.empresa_ids.length === 0) {
      toast.error("Vincule pelo menos uma empresa ao cliente.");
      return;
    }
    if (editForm.new_password && editForm.new_password.length < 6) {
      toast.error("A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setSubmitting(true);
    try {
      await updateUserFn({
        data: {
          target_user_id: editing.user_id,
          nome: editForm.nome.trim(),
          telefone: editForm.telefone.trim() || null,
          role: editForm.role as "admin" | "funcionario" | "cliente",
          empresa_ids:
            editForm.role === "cliente" ? editForm.empresa_ids : editForm.empresa_ids,
          new_password: editForm.new_password || undefined,
        },
      });
      toast.success("Usuário atualizado com sucesso!");
      setEditOpen(false);
      setEditing(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Erro ao atualizar usuário.");
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

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="edit-nome">Nome *</Label>
              <Input
                id="edit-nome"
                value={editForm.nome}
                onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-telefone">Telefone</Label>
              <Input
                id="edit-telefone"
                value={editForm.telefone}
                onChange={(e) => setEditForm({ ...editForm, telefone: e.target.value })}
                placeholder="(00) 00000-0000"
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo de Acesso *</Label>
              <Select
                value={editForm.role}
                onValueChange={(v) =>
                  setEditForm({
                    ...editForm,
                    role: v,
                    empresa_ids: v === "cliente" ? editForm.empresa_ids : [],
                  })
                }
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
              {editForm.role && (
                <p className="text-xs text-muted-foreground">
                  {roleDescriptions[editForm.role]}
                </p>
              )}
            </div>

            {editForm.role === "cliente" && (
              <div className="space-y-2">
                <Label>Empresas Vinculadas *</Label>
                <div className="max-h-48 overflow-y-auto space-y-2 rounded-md border p-3">
                  {empresas.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Nenhuma empresa cadastrada.</p>
                  ) : (
                    empresas.map((e) => (
                      <label
                        key={e.id}
                        className="flex items-start gap-2 cursor-pointer text-sm"
                      >
                        <Checkbox
                          checked={editForm.empresa_ids.includes(e.id)}
                          onCheckedChange={(c) => toggleEmpresa(e.id, !!c)}
                        />
                        <span>{e.nome_fantasia || e.razao_social}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="edit-password">Nova Senha (opcional)</Label>
              <Input
                id="edit-password"
                type="password"
                value={editForm.new_password}
                onChange={(e) =>
                  setEditForm({ ...editForm, new_password: e.target.value })
                }
                placeholder="Deixe em branco para manter a atual"
              />
              <p className="text-xs text-muted-foreground">
                Mínimo 6 caracteres. Preencha apenas se quiser redefinir.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setEditOpen(false)}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1"
                onClick={handleUpdate}
                disabled={submitting}
              >
                {submitting ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
                  <TableHead className="w-20 text-right">Ações</TableHead>
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
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(u)}
                        title="Editar usuário"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
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
