import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listUserEmailsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    // Verify caller is admin
    const { data: callerRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (!callerRole) {
      throw new Error("Apenas administradores podem listar e-mails.");
    }

    const { createClient } = await import("@supabase/supabase-js");
    const adminClient = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Page through all users
    const emails: Record<string, string> = {};
    let page = 1;
    const perPage = 1000;
    while (true) {
      const { data, error } = await adminClient.auth.admin.listUsers({
        page,
        perPage,
      });
      if (error) {
        throw new Error(`Erro ao listar usuários: ${error.message}`);
      }
      for (const u of data.users) {
        if (u.email) emails[u.id] = u.email;
      }
      if (data.users.length < perPage) break;
      page += 1;
    }

    return { emails };
  });
