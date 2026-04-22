import {
  LayoutDashboard,
  Building2,
  Calculator,
  ClipboardList,
  BookOpen,
  Newspaper,
  Users,
  LogOut,
  PackageSearch,
} from "lucide-react";
import { Link, useLocation } from "@tanstack/react-router";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import type { AuthState } from "@/hooks/useAuth";

const mainItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Empresas", url: "/empresas", icon: Building2 },
  { title: "Simulador", url: "/simulador", icon: Calculator },
  { title: "Base Legal", url: "/base-legal", icon: BookOpen },
  { title: "Atualizações", url: "/atualizacoes", icon: Newspaper },
];

const clientItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Minha Empresa", url: "/minha-empresa", icon: Building2 },
  { title: "Checklist", url: "/checklist", icon: ClipboardList },
  { title: "Simulações", url: "/simulador", icon: Calculator },
  { title: "Simulador por NCM", url: "/simulador-ncm", icon: PackageSearch },
  { title: "Base Legal", url: "/base-legal", icon: BookOpen },
  { title: "Atualizações", url: "/atualizacoes", icon: Newspaper },
];

const adminItems = [
  { title: "Usuários", url: "/usuarios", icon: Users },
];

export function AppSidebar({ auth }: { auth: AuthState }) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const currentPath = location.pathname;
  const items = auth.hasRole("cliente") ? clientItems : mainItems;

  const isActive = (path: string) => currentPath.startsWith(path);

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            {!collapsed && (
              <span className="text-xs font-bold tracking-wider uppercase text-sidebar-primary">
                Reforma Tributária
              </span>
            )}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                  >
                    <Link to={item.url}>
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {auth.isAdmin() && (
          <SidebarGroup>
            <SidebarGroupLabel>
              {!collapsed && <span>Administração</span>}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.url)}
                      tooltip={item.title}
                    >
                      <Link to={item.url}>
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => auth.logout()} tooltip="Sair">
              <LogOut className="h-4 w-4" />
              {!collapsed && <span>Sair</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
