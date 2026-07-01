import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/hooks/AuthContext";
import { EmpresaProvider } from "@/hooks/useLinkedEmpresa";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const auth = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!auth.isLoading && !auth.isAuthenticated) {
      navigate({ to: "/login" });
    }
  }, [auth.isLoading, auth.isAuthenticated, navigate]);

  if (auth.isLoading || !auth.isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <EmpresaProvider>
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AppSidebar auth={auth} />
          <div className="flex-1 flex flex-col min-w-0">
            <header className="h-16 flex items-center border-b border-border bg-card px-6 gap-4 sticky top-0 z-30 backdrop-blur supports-[backdrop-filter]:bg-card/85">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
              <div className="hidden md:flex flex-col leading-tight">
                <span className="eyebrow">Consultoria Tributária</span>
                <span className="font-serif text-base text-foreground">Reforma Tributária 360</span>
              </div>
              <div className="flex-1" />
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex flex-col text-right leading-tight">
                  <span className="text-sm font-medium text-foreground">
                    {auth.user?.email?.split("@")[0]}
                  </span>
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Sessão ativa
                  </span>
                </div>
                <div className="h-9 w-9 rounded-full bg-primary flex items-center justify-center ring-2 ring-accent/40">
                  <span className="text-xs font-semibold text-primary-foreground">
                    {auth.user?.email?.charAt(0).toUpperCase() || "U"}
                  </span>
                </div>
              </div>
            </header>
            <main className="flex-1 p-8 max-w-[1600px] w-full mx-auto">
              <Outlet />
            </main>
          </div>
        </div>
      </SidebarProvider>
    </EmpresaProvider>
  );
}
