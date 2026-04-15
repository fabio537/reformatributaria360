import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
  funcionario: "Funcionário",
  cliente: "Cliente",
};

const roleColors: Record<string, "default" | "secondary" | "outline"> = {
  admin: "default",
  funcionario: "secondary",
  cliente: "outline",
};

function UsuariosPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .order("nome");

      const { data: roles } = await supabase
        .from("user_roles")
        .select("*");

      const combined = (profiles || []).map((p) => ({
        ...p,
        roles: (roles || []).filter((r: any) => r.user_id === p.user_id).map((r: any) => r.role),
      }));

      setUsers(combined);
      setLoading(false);
    };
    fetchUsers();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Usuários</h1>
        <p className="text-muted-foreground mt-1">Gerencie usuários e permissões</p>
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
                  <TableHead>Perfis</TableHead>
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
