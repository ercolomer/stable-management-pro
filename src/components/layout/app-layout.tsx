
"use client";
import type { PropsWithChildren } from "react";
import React, { useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Loader2, AlertCircle, LogOut, User, Settings, Users, PawPrint, ListChecks, CalendarRange, Lightbulb, ChevronDown, Trash2, ChevronsLeftRight, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { LogoIcon } from "@/components/icons/logo-icon";
import {
  SidebarProvider,
  Sidebar,
  SidebarTrigger,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarSeparator,
  SidebarInset,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSubContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const CustomHorseIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M3.5 21h17M5.5 21V11L12 3l6.5 8v10M12 11V3"/>
    <path d="M7.5 11a2.5 2.5 0 0 1-5 0V8.5a2.5 2.5 0 0 1 5 0V11Z"/>
    <path d="M16.5 11a2.5 2.5 0 0 1 5 0V8.5a2.5 2.5 0 0 1-5 0V11Z"/>
  </svg>
);


function UserNav() {
  const { 
    user, 
    userProfile, 
    signOut, 
    linkedAccounts, 
    switchAccount, 
    isSwitchingAccount,
    removeAccountFromSwitcher,
    addAccountToSwitcher, 
  } = useAuth();
  const router = useRouter();

  if (!user || !userProfile) {
    return null;
  }

  const handleSwitchAccount = async (targetUid: string) => {
    if (user.uid === targetUid) return;
    await switchAccount(targetUid);
  };
  
  const handleRemoveAccount = (uidToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation(); 
    e.preventDefault(); 
    removeAccountFromSwitcher(uidToRemove);
  };
  
  const sortedLinkedAccounts = useMemo(() => {
    if (!linkedAccounts) return [];
    return [...linkedAccounts].sort((a, b) => {
      if (a.uid === user.uid) return -1;
      if (b.uid === user.uid) return 1;
      return (a.displayName || a.email || '').localeCompare(b.displayName || b.email || '');
    });
  }, [linkedAccounts, user.uid]);


  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage 
              src={userProfile.photoURL || `https://placehold.co/32x32.png?text=${userProfile.displayName ? userProfile.displayName.substring(0,1).toUpperCase() : 'U'}`} 
              alt={userProfile.displayName || "Avatar"} 
              data-ai-hint={userProfile.dataAiHint || "person portrait"}
            />
            <AvatarFallback>{userProfile.displayName ? userProfile.displayName.substring(0,1).toUpperCase() : "U"}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{userProfile.displayName || "Usuario"}</p>
            <p className="text-xs leading-none text-muted-foreground">{userProfile.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => router.push('/profile')}>
            <User className="mr-2 h-4 w-4" />
            <span>Mi Perfil / Cuadra</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push('/settings')}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Ajustes</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        
        {sortedLinkedAccounts && sortedLinkedAccounts.length > 0 && (
           <>
            <DropdownMenuSeparator />
             <DropdownMenuSub>
                <DropdownMenuSubTrigger disabled={isSwitchingAccount}>
                    <ChevronsLeftRight className="mr-2 h-4 w-4" />
                    <span>Cambiar Cuenta</span>
                    {isSwitchingAccount && <Loader2 className="ml-auto h-4 w-4 animate-spin" />}
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                    <DropdownMenuSubContent>
                         <DropdownMenuRadioGroup 
                            value={user.uid} 
                            onValueChange={handleSwitchAccount}
                          >
                            {sortedLinkedAccounts.map(acc => (
                                <DropdownMenuRadioItem 
                                  key={acc.uid} 
                                  value={acc.uid} 
                                  className="flex items-center justify-between pr-1"
                                  disabled={isSwitchingAccount || user.uid === acc.uid}
                                >
                                    <div className="flex items-center gap-2">
                                        <Avatar className="h-6 w-6">
                                            <AvatarImage src={acc.photoURL || `https://placehold.co/24x24.png?text=${acc.displayName ? acc.displayName.substring(0,1).toUpperCase() : (acc.email ? acc.email.substring(0,1).toUpperCase() : 'U')}`} alt={acc.displayName || "Avatar"} data-ai-hint={acc.dataAiHint || "person"}/>
                                            <AvatarFallback className="text-xs">{acc.displayName ? acc.displayName.substring(0,1).toUpperCase() : (acc.email ? acc.email.substring(0,1).toUpperCase() : 'U')}</AvatarFallback>
                                        </Avatar>
                                        <span className="truncate max-w-[120px]">{acc.displayName || acc.email}</span>
                                    </div>
                                    {user.uid !== acc.uid && (
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                                        onClick={(e) => handleRemoveAccount(acc.uid, e)}
                                        title="Desvincular esta cuenta del selector"
                                        disabled={isSwitchingAccount}
                                      >
                                        <Trash2 className="h-3 w-3"/>
                                      </Button>
                                    )}
                                </DropdownMenuRadioItem>
                            ))}
                         </DropdownMenuRadioGroup>
                         <DropdownMenuSeparator />
                         <DropdownMenuItem onClick={() => {
                            if (user && addAccountToSwitcher) addAccountToSwitcher(user, userProfile); 
                            router.push('/login');
                         }}>
                            Añadir otra cuenta
                         </DropdownMenuItem>
                    </DropdownMenuSubContent>
                </DropdownMenuPortal>
             </DropdownMenuSub>
           </>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut} disabled={isSwitchingAccount}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Cerrar Sesión</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MainNav() {
  const { activeRole, activeStableId } = useAuth();
  const pathname = usePathname();
  const { isMobile, state: sidebarState } = useSidebar();

  const isActive = (path: string) => pathname === path;

  const jefeLinks = [
    { href: "/dashboard/jefe", label: "Panel Jefe", icon: Target },
    { href: "/dashboard/jefe/jinetes", label: "Jinetes", icon: Users },
    { href: "/dashboard/jefe/caballos", label: "Caballos", icon: PawPrint },
    { href: "/dashboard/jefe/tareas", label: "Tareas", icon: ListChecks },
    { href: "/dashboard/jefe/montas", label: "Montas", icon: CustomHorseIcon },
  ];

  const jineteLinks = [
    { href: "/dashboard/jinete", label: "Panel Jinete", icon: Target },
    { href: "/dashboard/jinete/caballos", label: "Caballos", icon: PawPrint },
    { href: "/dashboard/jinete/tareas", label: "Tareas", icon: ListChecks },
    { href: "/dashboard/jinete/montas", label: "Montas", icon: CustomHorseIcon },
  ];

  const generalLinks = [
    { href: "/dashboard/calendario", label: "Calendario Cuadra", icon: CalendarRange },
    { href: "/training-plans", label: "Planes IA", icon: Lightbulb },
  ];

  return (
    <SidebarContent>
      <SidebarMenu>
        {activeStableId && (
          <>
            {activeRole === 'jefe de cuadra' && (
              <SidebarGroup>
                <SidebarGroupLabel>Jefe de Cuadra</SidebarGroupLabel>
                {jefeLinks.map(link => (
                  <SidebarMenuItem key={link.href}>
                    <SidebarMenuButton asChild isActive={isActive(link.href)} tooltip={link.label}>
                      <Link href={link.href}><link.icon /><span>{link.label}</span></Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarGroup>
            )}
            {activeRole === 'jinete' && (
              <SidebarGroup>
                <SidebarGroupLabel>Jinete</SidebarGroupLabel>
                {jineteLinks.map(link => (
                  <SidebarMenuItem key={link.href}>
                    <SidebarMenuButton asChild isActive={isActive(link.href)} tooltip={link.label}>
                      <Link href={link.href}><link.icon /><span>{link.label}</span></Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarGroup>
            )}
             <SidebarSeparator />
            <SidebarGroup>
                <SidebarGroupLabel>General</SidebarGroupLabel>
                 {generalLinks.map(link => (
                  <SidebarMenuItem key={link.href}>
                    <SidebarMenuButton asChild isActive={isActive(link.href)} tooltip={link.label}>
                      <Link href={link.href}><link.icon /><span>{link.label}</span></Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
            </SidebarGroup>
          </>
        )}
        {!activeStableId && activeRole && (
            <SidebarGroup>
                 <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => { if(typeof window !== undefined) window.location.href = '/profile';}} tooltip="Configurar Cuadra">
                        <AlertCircle/><span>Configurar Cuadra</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarGroup>
        )}
      </SidebarMenu>
    </SidebarContent>
  );
}


export function AppLayout({ children }: PropsWithChildren) {
  const authContext = useAuth();
  const router = useRouter();

  if (!authContext) {
    console.error("[AppLayout] CRITICAL: AuthContext is undefined. This is a severe issue.");
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'hsl(var(--destructive))', color: 'hsl(var(--destructive-foreground))', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', textAlign: 'center' }}>
        <h1>Error Crítico: AuthContext no disponible.</h1>
        <p>La aplicación no puede funcionar sin el contexto de autenticación. Por favor, revisa la consola del desarrollador para más detalles sobre por qué AuthProvider podría no estar envolviendo esta parte de la aplicación, o si AuthProvider mismo está fallando en su inicialización.</p>
      </div>
    );
  }

  const {
    user,
    userProfile,
    loading: authLoading,
    isSwitchingAccount,
    setNavigateToPath,
  } = authContext;

  useEffect(() => {
    if (user && !userProfile && !authLoading && !isSwitchingAccount) {
      console.warn(`[AppLayout] CRITICAL STATE (useEffect): Auth loaded, Firebase user UID: ${user.uid} exists, BUT UserProfile is missing. Attempting redirect to /profile.`);
      if (setNavigateToPath) {
        setNavigateToPath("/profile");
      } else {
        console.warn("[AppLayout] setNavigateToPath not available, using direct router.push for /profile redirect.");
        router.push("/profile");
      }
    }
  }, [user, userProfile, authLoading, router, isSwitchingAccount, setNavigateToPath]);

  if (authLoading || isSwitchingAccount) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-foreground">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-muted-foreground">{isSwitchingAccount ? "Cambiando cuenta..." : "Cargando aplicación..."}</p>
      </div>
    );
  }
  
  if (user && !userProfile && !authLoading && !isSwitchingAccount) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background text-foreground p-4 text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg font-semibold text-foreground">Verificando perfil de usuario...</p>
        <p className="text-muted-foreground">Serás redirigido para completar tu perfil si es necesario.</p>
      </div>
    );
  }

  if (!user && !authLoading) {
      return <>{children}</>; 
  }

  return (
    <SidebarProvider defaultOpen>
      <Sidebar collapsible="icon">
        <SidebarHeader className="p-3">
          <Link href="/" className="flex items-center gap-2 text-lg font-semibold text-sidebar-foreground hover:text-sidebar-accent-foreground transition-colors">
            <LogoIcon className="h-7 w-7" />
            <span className="group-data-[collapsible=icon]:hidden">HallConnect</span>
          </Link>
        </SidebarHeader>
        <MainNav />
        <SidebarFooter className="p-2">
          {/* Footer content if any */}
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
           <div className="md:hidden"> 
            <SidebarTrigger />
          </div>
          <div className="flex-1">
            {/* Page title or breadcrumbs can go here */}
          </div>
          <UserNav />
        </header>
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
