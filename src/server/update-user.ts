import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const updateUserFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      target_user_id: string;
      nome?: string;
      telefone?: string | null;
      role?: "admin" | "funcionario" | "cliente";
      empresa_ids?: string[]; // full set of linked empresas (replaces existing)
      new_password?: string;
    }) => input
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Verify caller is admin
    const { data: callerRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (!callerRole) {
      throw new Error("Apenas administradores podem editar usuários.");
    }

    const { createClient } = await import("@supabase/supabase-js");
    const adminClient = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Update profile (nome / telefone)
    if (data.nome !== undefined || data.telefone !== undefined) {
      const profileUpdate: Record<string, unknown> = {};
      if (data.nome !== undefined) profileUpdate.nome = data.nome;
      if (data.telefone !== undefined) profileUpdate.telefone = data.telefone;

      const { error: profileError } = await adminClient
        .from("profiles")
        .update(profileUpdate)
        .eq("user_id", data.target_user_id);

      if (profileError) {
        throw new Error(`Erro ao atualizar perfil: ${profileError.message}`);
      }
    }

    // Update auth user (password)
    if (data.new_password) {
      if (data.new_password.length < 6) {
        throw new Error("A nova senha deve ter pelo menos 6 caracteres.");
      }
      const { error: authError } = await adminClient.auth.admin.updateUserById(
        data.target_user_id,
        { password: data.new_password }
      );
      if (authError) {
        throw new Error(`Erro ao redefinir senha: ${authError.message}`);
      }
    }

    // Replace role if provided
    if (data.role) {
      const { error: delRoleError } = await adminClient
        .from("user_roles")
        .delete()
        .eq("user_id", data.target_user_id);
      if (delRoleError) {
        throw new Error(`Erro ao limpar perfis: ${delRoleError.message}`);
      }

      const { error: insRoleError } = await adminClient
        .from("user_roles")
        .insert({ user_id: data.target_user_id, role: data.role });
      if (insRoleError) {
        throw new Error(`Erro ao atribuir novo perfil: ${insRoleError.message}`);
      }
    }

    // Replace empresa links if provided
    if (data.empresa_ids !== undefined) {
      const { error: delLinkError } = await adminClient
        .from("empresa_usuarios")
        .delete()
        .eq("user_id", data.target_user_id);
      if (delLinkError) {
        throw new Error(`Erro ao limpar vínculos: ${delLinkError.message}`);
      }

      if (data.empresa_ids.length > 0) {
        const rows = data.empresa_ids.map((empresa_id) => ({
          user_id: data.target_user_id,
          empresa_id,
        }));
        const { error: insLinkError } = await adminClient
          .from("empresa_usuarios")
          .insert(rows);
        if (insLinkError) {
          throw new Error(`Erro ao criar vínculos: ${insLinkError.message}`);
        }
      }
    }

    return { success: true };
  });
