
"use client";

import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
// Corregida la línea de importación: Se eliminó CustomHorseIcon as HorseIcon
import { Loader2, PawPrint, ListChecks, CalendarRange, AlertCircle } from "lucide-react"; 
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const CustomHorseIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M3.5 21h17M5.5 21V11L12 3l6.5 8v10M12 11V3"/>
    <path d="M7.5 11a2.5 2.5 0 0 1-5 0V8.5a2.5 2.5 0 0 1 5 0V11Z"/>
    <path d="M16.5 11a2.5 2.5 0 0 1 5 0V8.5a2.5 2.5 0 0 1-5 0V11Z"/>
  </svg>
);

export default function JineteDashboardPage() {
  const { 
    user, 
    userProfile, 
    loading: authLoading, 
    activeSimulationRole,
  } = useAuth();
  const router = useRouter();

  // Usamos userProfile.stableId para cuadra real, y MOCK_STABLE_ALPHA_ID para simulación de jineteConCuadra
  const isSimulatedJineteEnCuadra = activeSimulationRole === 'jineteConCuadra';
  const currentStableId = userProfile?.stableId;
  const currentStableName = userProfile?.stableName;

  useEffect(() => {
    if (!authLoading) {
      if (!user && !activeSimulationRole) { // Si no hay usuario real Y no hay simulación activa
        router.replace("/login");
      } else if (user && userProfile && userProfile.role && userProfile.role !== 'jinete' && !activeSimulationRole?.startsWith('jinete')) {
        // Si hay usuario real con perfil, pero su rol NO es jinete Y no está simulando ser jinete
        router.replace('/dashboard/jefe');
      }
      // AuthContext ya maneja la redirección a /profile si es jinete sin cuadra y sin solicitud.
    }
  }, [user, userProfile, authLoading, router, activeSimulationRole]);


  if (authLoading) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }
  
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Panel del Jinete {currentStableName ? `(Cuadra: ${currentStableName})` : ""}</h1>
      
      {currentStableId || isSimulatedJineteEnCuadra ? ( 
        <div>
          <Card className="mb-6 shadow-lg">
            <CardHeader>
                <CardTitle className="text-2xl">Bienvenido a: {currentStableName || (isSimulatedJineteEnCuadra ? "Cuadra Alfa (Simulada)" : "tu cuadra")}</CardTitle>
                <CardDescription>Aquí puedes gestionar tus actividades y las de la cuadra.</CardDescription>
            </CardHeader>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader><CardTitle className="flex items-center gap-2"><PawPrint />Gestionar Caballos</CardTitle></CardHeader>
              <CardContent><p className="text-muted-foreground text-sm">Añadir y ver caballos de la cuadra.</p></CardContent>
              <CardFooter><Button variant="outline" asChild disabled={!currentStableId && !isSimulatedJineteEnCuadra}><Link href="/dashboard/jinete/caballos">Ir a Caballos</Link></Button></CardFooter>
            </Card>
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader><CardTitle className="flex items-center gap-2"><ListChecks />Gestionar Tareas</CardTitle></CardHeader>
              <CardContent><p className="text-muted-foreground text-sm">Crear y completar tareas de la cuadra.</p></CardContent>
              <CardFooter><Button variant="outline" asChild disabled={!currentStableId && !isSimulatedJineteEnCuadra}><Link href="/dashboard/jinete/tareas">Ir a Tareas</Link></Button></CardFooter>
            </Card>
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader><CardTitle className="flex items-center gap-2"><CustomHorseIcon className="h-6 w-6"/>Gestionar Montas</CardTitle></CardHeader>
              <CardContent><p className="text-muted-foreground text-sm">Asignar y completar montas de la cuadra.</p></CardContent>
              <CardFooter><Button variant="outline" asChild disabled={!currentStableId && !isSimulatedJineteEnCuadra}><Link href="/dashboard/jinete/montas">Ir a Montas</Link></Button></CardFooter>
            </Card>
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader><CardTitle className="flex items-center gap-2"><CalendarRange/>Calendario de Cuadra</CardTitle></CardHeader>
              <CardContent><p className="text-muted-foreground text-sm">Ver todas las actividades de la cuadra.</p></CardContent>
              <CardFooter><Button variant="outline" asChild disabled={!currentStableId && !isSimulatedJineteEnCuadra}><Link href="/dashboard/calendario">Ir al Calendario</Link></Button></CardFooter>
            </Card>
          </div>
        </div>
      ) : userProfile?.requestedStableId && !activeSimulationRole ? ( 
         <Card className="shadow-lg">
            <CardHeader>
                <CardTitle>Solicitud Enviada</CardTitle>
                <CardDescription>
                Tu solicitud para unirte a la cuadra con código <span className="font-mono">{userProfile.requestedStableId}</span> está pendiente de aprobación.
                Ve a <Link href="/profile" className="text-primary underline">Mi Perfil / Cuadra</Link> para más detalles.
                </CardDescription>
            </CardHeader>
        </Card>
      ) : !activeSimulationRole && userProfile && userProfile.role === 'jinete' ? ( 
        <Alert variant="default" className="max-w-lg mx-auto">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>No perteneces a ninguna cuadra</AlertTitle>
            <AlertDescription>
            Por favor, ve a <Link href="/profile" className="text-primary underline">Mi Perfil / Cuadra</Link> para unirte a una.
            </AlertDescription>
        </Alert>
      ) : ( 
         <div className="text-center">
            <p className="text-muted-foreground mb-4">
              {activeSimulationRole === 'jineteSinCuadra' 
                ? 'Estás simulando ser un jinete sin cuadra. Ve a "Mi Perfil / Cuadra" para simular unirte a una.'
                : 'Parece que no estás en una cuadra. Ve a "Mi Perfil / Cuadra" para gestionar tus cuadras.'}
            </p>
            <Button asChild>
                <Link href="/profile">Ir a Mi Perfil / Cuadra</Link>
            </Button>
         </div>
      )
    }
    </div>
  );
}
