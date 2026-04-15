import { createFileRoute, redirect, Outlet } from "@tanstack/react-router";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: ({ context, location }) => {
    const auth = (context as any).auth;
    if (!auth?.isAuthenticated) {
      throw redirect({
        to: "/login",
        search: { redirect: location.href },
      });
    }
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { auth } = Route.useRouteContext() as any;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar auth={auth} />
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center border-b bg-card px-4 gap-3">
            <SidebarTrigger />
            <div className="flex-1" />
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                <span className="text-xs font-semibold text-primary-foreground">
                  {auth.user?.email?.charAt(0).toUpperCase() || "U"}
                </span>
              </div>
              <span className="text-sm text-muted-foreground hidden md:block">
                {auth.user?.email}
              </span>
            </div>
          </header>
          <main className="flex-1 p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
