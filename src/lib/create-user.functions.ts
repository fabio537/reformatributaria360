import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const createUserFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      email: string;
      password: string;
      nome: string;
      role: "admin" | "funcionario" | "cliente";
      empresa_id?: string;
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
      throw new Error("Apenas administradores podem criar usuários.");
    }

    // Use service role client for admin operations
    const { createClient } = await import("@supabase/supabase-js");
    const adminClient = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Create user via admin API
    const { data: newUser, error: createError } =
      await adminClient.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true,
        user_metadata: { nome: data.nome },
      });

    if (createError) {
      throw new Error(`Erro ao criar usuário: ${createError.message}`);
    }

    const newUserId = newUser.user.id;

    // Assign role
    const { error: roleError } = await adminClient
      .from("user_roles")
      .insert({ user_id: newUserId, role: data.role });

    if (roleError) {
      throw new Error(`Erro ao atribuir perfil: ${roleError.message}`);
    }

    // Link to empresa if cliente
    if (data.role === "cliente" && data.empresa_id) {
      const { error: linkError } = await adminClient
        .from("empresa_usuarios")
        .insert({ user_id: newUserId, empresa_id: data.empresa_id });

      if (linkError) {
        throw new Error(`Erro ao vincular empresa: ${linkError.message}`);
      }
    }

    return { success: true, userId: newUserId };
  });
