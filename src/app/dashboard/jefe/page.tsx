
// src/app/dashboard/jefe/page.tsx
"use client";

import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Copy, Check, Users, PawPrint, ListChecks, CalendarRange, AlertCircle, Lightbulb } from "lucide-react"; 
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


const CustomHorseIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M3.5 21h17M5.5 21V11L12 3l6.5 8v10M12 11V3"/>
    <path d="M7.5 11a2.5 2.5 0 0 1-5 0V8.5a2.5 2.5 0 0 1 5 0V11Z"/>
    <path d="M16.5 11a2.5 2.5 0 0 1 5 0V8.5a2.5 2.5 0 0 1-5 0V11Z"/>
  </svg>
);


export default function JefeDashboardPage() {
  const { 
    user,
    userProfile, 
    loading: authLoading, 
    activeStableId, 
  } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const currentStableId = activeStableId;
  const currentStableName = userProfile?.stableName;
  
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.replace("/login");
      } else if (userProfile && userProfile.role !== 'jefe de cuadra') {
        router.replace('/dashboard/jinete');
      } else if (userProfile && userProfile.role === 'jefe de cuadra' && !currentStableId) {
        // AuthContext should handle redirection to /profile for jefe without stable
      }
    }
  }, [user, userProfile, authLoading, router, currentStableId]);
  
  const copyToClipboard = () => {
    if (currentStableId) {
      navigator.clipboard.writeText(currentStableId).then(() => {
        setCopied(true);
        toast({ title: "Copiado", description: "Código de la cuadra copiado al portapapeles." });
        setTimeout(() => setCopied(false), 2000);
      }).catch(err => {
        console.error('Error al copiar:', err);
        toast({ title: "Error", description: "No se pudo copiar el código.", variant: "destructive" });
      });
    }
  };

  if (authLoading) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  if (userProfile?.role === 'jefe de cuadra' && !currentStableId) {
    return (
        <div className="container mx-auto py-8 text-center">
             <Alert variant="default" className="max-w-lg mx-auto">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>No tienes una cuadra activa</AlertTitle>
                <AlertDescription>
                Por favor, ve a <Link href="/profile" className="text-primary underline">Mi Perfil / Cuadra</Link> para crear o gestionar tus cuadras.
                </AlertDescription>
            </Alert>
        </div>
    );
  }
  
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Panel del Jefe de Cuadra {currentStableName ? `(${currentStableName})` : ""}</h1>
      
      {currentStableId && (
        <Card className="mb-8 shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">Cuadra Activa: {currentStableName || "Cargando nombre..."}</CardTitle>
            <CardDescription>Gestiona tu cuadra y comparte el código con tus jinetes.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mt-2 flex items-center gap-2">
              <p className="text-sm text-muted-foreground">Código de la Cuadra (para jinetes):</p>
              <span className="font-mono text-sm bg-muted px-2 py-1 rounded-md text-foreground">{currentStableId}</span>
              <Button onClick={copyToClipboard} size="sm" variant="outline" disabled={!currentStableId}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                <span className="ml-2">{copied ? 'Copiado' : 'Copiar'}</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader><CardTitle className="flex items-center gap-2"><Users />Gestionar Jinetes</CardTitle></CardHeader>
          <CardContent><p className="text-muted-foreground text-sm">Aprobar solicitudes y ver jinetes de la cuadra.</p></CardContent>
          <CardFooter><Button variant="outline" asChild disabled={!currentStableId}><Link href="/dashboard/jefe/jinetes">Ir a Jinetes</Link></Button></CardFooter>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader><CardTitle className="flex items-center gap-2"><PawPrint />Gestionar Caballos</CardTitle></CardHeader>
          <CardContent><p className="text-muted-foreground text-sm">Añadir, editar y ver los caballos de la cuadra.</p></CardContent>
           <CardFooter><Button variant="outline" asChild disabled={!currentStableId}><Link href="/dashboard/jefe/caballos">Ir a Caballos</Link></Button></CardFooter>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader><CardTitle className="flex items-center gap-2"><ListChecks/>Gestionar Tareas</CardTitle></CardHeader>
          <CardContent><p className="text-muted-foreground text-sm">Crear y asignar tareas diarias para la cuadra.</p></CardContent>
           <CardFooter><Button variant="outline" asChild disabled={!currentStableId}><Link href="/dashboard/jefe/tareas">Ir a Tareas</Link></Button></CardFooter>
        </Card>
         <Card className="hover:shadow-md transition-shadow">
          <CardHeader><CardTitle className="flex items-center gap-2"><CustomHorseIcon className="h-6 w-6"/>Gestionar Montas</CardTitle></CardHeader>
          <CardContent><p className="text-muted-foreground text-sm">Asignar caballos a jinetes para montar.</p></CardContent>
           <CardFooter><Button variant="outline" asChild disabled={!currentStableId}><Link href="/dashboard/jefe/montas">Ir a Montas</Link></Button></CardFooter>
        </Card>
         <Card className="hover:shadow-md transition-shadow">
          <CardHeader><CardTitle className="flex items-center gap-2"><CalendarRange/>Calendario de Cuadra</CardTitle></CardHeader>
          <CardContent><p className="text-muted-foreground text-sm">Ver todas las actividades programadas de la cuadra.</p></CardContent>
          <CardFooter><Button variant="outline" asChild disabled={!currentStableId}><Link href="/dashboard/calendario">Ir al Calendario</Link></Button></CardFooter>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader><CardTitle className="flex items-center gap-2"><Lightbulb />Sugerir Plan de Entrenamiento (IA)</CardTitle></CardHeader>
          <CardContent><p className="text-muted-foreground text-sm">Obtener sugerencias de planes de entrenamiento para caballos.</p></CardContent>
          <CardFooter><Button variant="outline" asChild disabled={!currentStableId}><Link href="/training-plans">Ir a Planes IA</Link></Button></CardFooter>
        </Card>
      </div>
    </div>
  );
}
