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
  DollarSign,
  Download,
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
import { InstallAppButton } from "@/components/InstallAppButton";
import type { AuthState } from "@/hooks/useAuth";

const mainItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Empresas", url: "/empresas", icon: Building2 },
  { title: "Simulador", url: "/simulador", icon: Calculator },
  { title: "Base Legal", url: "/base-legal", icon: BookOpen },
  { title: "Atualizações", url: "/atualizacoes", icon: Newspaper },
  { title: "Baixar App", url: "/baixar-app", icon: Download },
];

const clientItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Minha Empresa", url: "/minha-empresa", icon: Building2 },
  { title: "Checklist", url: "/checklist", icon: ClipboardList },
  { title: "Simulações", url: "/simulador", icon: Calculator },
  { title: "Simulador por NCM", url: "/simulador-ncm", icon: PackageSearch },
  { title: "Precificação", url: "/precificacao", icon: DollarSign },
  { title: "Base Legal", url: "/base-legal", icon: BookOpen },
  { title: "Atualizações", url: "/atualizacoes", icon: Newspaper },
  { title: "Baixar App", url: "/baixar-app", icon: Download },
];

const staffItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Empresas", url: "/empresas", icon: Building2 },
  { title: "Minha Empresa", url: "/minha-empresa", icon: Building2 },
  { title: "Checklist", url: "/checklist", icon: ClipboardList },
  { title: "Simulações", url: "/simulador", icon: Calculator },
  { title: "Simulador por NCM", url: "/simulador-ncm", icon: PackageSearch },
  { title: "Precificação", url: "/precificacao", icon: DollarSign },
  { title: "Base Legal", url: "/base-legal", icon: BookOpen },
  { title: "Atualizações", url: "/atualizacoes", icon: Newspaper },
  { title: "Baixar App", url: "/baixar-app", icon: Download },
];

const adminItems = [
  { title: "Usuários", url: "/usuarios", icon: Users },
];

export function AppSidebar({ auth }: { auth: AuthState }) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const currentPath = location.pathname;
  const items = auth.hasRole("cliente") ? clientItems : auth.isStaff() ? staffItems : mainItems;

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
        <div className="px-2 pb-2">
          <InstallAppButton collapsed={collapsed} />
        </div>
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
