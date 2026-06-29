import {
  Building2,
  Calculator,
  ClipboardList,
  BookOpen,
  Newspaper,
  Users,
  LogOut,
  PackageSearch,
  DollarSign,
  Scale,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InstallAppButton } from "@/components/InstallAppButton";
import type { AuthState } from "@/hooks/useAuth";
import { useLinkedEmpresa } from "@/hooks/useLinkedEmpresa";

const mainItems = [
  { title: "Empresas", url: "/empresas", icon: Building2 },
  { title: "Simulador", url: "/simulador", icon: Calculator },
  { title: "Base Legal", url: "/base-legal", icon: BookOpen },
  { title: "Atualizações", url: "/atualizacoes", icon: Newspaper },
  { title: "Baixar App", url: "/baixar-app", icon: Download },
];

const clientItems = [
  { title: "Minha Empresa", url: "/minha-empresa", icon: Building2 },
  { title: "Checklist", url: "/checklist", icon: ClipboardList },
  { title: "Simulações", url: "/simulador", icon: Calculator },
  { title: "Simulador NCM & Precificação", url: "/simulador-ncm", icon: PackageSearch },
  { title: "Simples: Dentro × Fora DAS", url: "/simples-das", icon: Scale },
  { title: "Base Legal", url: "/base-legal", icon: BookOpen },
  { title: "Atualizações", url: "/atualizacoes", icon: Newspaper },
  { title: "Baixar App", url: "/baixar-app", icon: Download },
];

const staffItems = [
  { title: "Empresas", url: "/empresas", icon: Building2 },
  { title: "Minha Empresa", url: "/minha-empresa", icon: Building2 },
  { title: "Checklist", url: "/checklist", icon: ClipboardList },
  { title: "Simulações", url: "/simulador", icon: Calculator },
  { title: "Simulador NCM & Precificação", url: "/simulador-ncm", icon: PackageSearch },
  { title: "Simples: Dentro × Fora DAS", url: "/simples-das", icon: Scale },
  { title: "Base Legal", url: "/base-legal", icon: BookOpen },
  { title: "Atualizações", url: "/atualizacoes", icon: Newspaper },
  { title: "Baixar App", url: "/baixar-app", icon: Download },
];


const adminItems = [
  { title: "Usuários", url: "/usuarios", icon: Users },
];

export function AppSidebar({ auth }: { auth: AuthState }) {
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const currentPath = location.pathname;
  const items = auth.hasRole("cliente") ? clientItems : auth.isStaff() ? staffItems : mainItems;
  const { empresas, empresaId, setEmpresaId, loading, razaoSocial } = useLinkedEmpresa();

  const isActive = (path: string) => currentPath.startsWith(path);

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            {!collapsed && (
              <span className="text-xs font-bold tracking-wider uppercase text-sidebar-primary">
                Empresa
              </span>
            )}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            {collapsed ? (
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={toggleSidebar}
                    tooltip={razaoSocial ?? "Selecionar empresa"}
                  >
                    <Building2 className="h-4 w-4" />
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            ) : (
              <div className="px-2 pb-2">
                {loading ? (
                  <div className="h-9 rounded-md bg-sidebar-accent/40 animate-pulse" />
                ) : empresas.length === 0 ? (
                  <p className="text-xs text-muted-foreground px-1">
                    Nenhuma empresa vinculada
                  </p>
                ) : (
                  <Select
                    value={empresaId ?? undefined}
                    onValueChange={setEmpresaId}
                  >
                    <SelectTrigger className="h-9 w-full text-sm">
                      <SelectValue placeholder="Selecionar empresa" />
                    </SelectTrigger>
                    <SelectContent>
                      {empresas.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          <span className="truncate">
                            {e.razao_social ?? e.cnpj ?? e.id}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}
          </SidebarGroupContent>
        </SidebarGroup>

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
