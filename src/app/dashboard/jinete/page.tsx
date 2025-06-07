"use client";

import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
// Corregida la línea de importación: Se eliminó CustomHorseIcon as HorseIcon
import { Loader2, PawPrint, ListChecks, CalendarRange, AlertCircle } from "lucide-react"; 
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useTranslations } from 'next-intl';
import StableWrapper from "@/components/stable-wrapper";

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
  const [isMounted, setIsMounted] = useState(true);

  const t = useTranslations('dashboard');
  const tStable = useTranslations('stable');

  // Usamos userProfile.stableId para cuadra real, y MOCK_STABLE_ALPHA_ID para simulación de jineteConCuadra
  const isSimulatedJineteEnCuadra = activeSimulationRole === 'jineteConCuadra';
  const currentStableId = userProfile?.stableId;
  const currentStableName = userProfile?.stableName;

  useEffect(() => {
    setIsMounted(true);
    
    if (!authLoading && isMounted) {
      if (!user && !activeSimulationRole) { // Si no hay usuario real Y no hay simulación activa
        router.replace("/login");
      } else if (user && userProfile && userProfile.role && userProfile.role !== 'jinete' && !activeSimulationRole?.startsWith('jinete')) {
        // Si hay usuario real con perfil, pero su rol NO es jinete Y no está simulando ser jinete
        router.replace('/dashboard/jefe');
      }
      // AuthContext ya maneja la redirección a /profile si es jinete sin cuadra y sin solicitud.
    }
    
    return () => {
      setIsMounted(false);
    };
  }, [user, userProfile, authLoading, router, activeSimulationRole, isMounted]);

  // Protección temprana contra renderizado durante desmontaje
  if (!isMounted) {
    return null;
  }

  if (authLoading) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }
  
  return (
    <StableWrapper className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">{t('riderDashboard')} {currentStableName ? `(${tStable('title')} ${currentStableName})` : ""}</h1>
      
      {currentStableId || isSimulatedJineteEnCuadra ? ( 
        <div>
          <Card className="mb-6 shadow-lg">
            <CardHeader>
                <CardTitle className="text-2xl">{t('welcomeToStable')} {currentStableName || (isSimulatedJineteEnCuadra ? tStable('alfa') : tStable('yourStable'))}</CardTitle>
                <CardDescription>{t('manageActivities')}</CardDescription>
            </CardHeader>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader><CardTitle className="flex items-center gap-2"><PawPrint />{t('manageHorses')}</CardTitle></CardHeader>
              <CardContent><p className="text-muted-foreground text-sm">{t('addViewHorses')}</p></CardContent>
              <CardFooter><Button variant="outline" asChild disabled={!currentStableId && !isSimulatedJineteEnCuadra}><Link href="/dashboard/jinete/caballos">{t('goToHorses')}</Link></Button></CardFooter>
            </Card>
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader><CardTitle className="flex items-center gap-2"><ListChecks />{t('manageTasks')}</CardTitle></CardHeader>
              <CardContent><p className="text-muted-foreground text-sm">{t('createCompleteTasks')}</p></CardContent>
              <CardFooter><Button variant="outline" asChild disabled={!currentStableId && !isSimulatedJineteEnCuadra}><Link href="/dashboard/jinete/tareas">{t('goToTasks')}</Link></Button></CardFooter>
            </Card>
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader><CardTitle className="flex items-center gap-2"><CustomHorseIcon className="h-6 w-6"/>{t('manageRides')}</CardTitle></CardHeader>
              <CardContent><p className="text-muted-foreground text-sm">{t('assignCompleteRides')}</p></CardContent>
              <CardFooter><Button variant="outline" asChild disabled={!currentStableId && !isSimulatedJineteEnCuadra}><Link href="/dashboard/jinete/montas">{t('goToRides')}</Link></Button></CardFooter>
            </Card>
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader><CardTitle className="flex items-center gap-2"><CalendarRange/>{t('stableCalendar')}</CardTitle></CardHeader>
              <CardContent><p className="text-muted-foreground text-sm">{t('viewAllActivities')}</p></CardContent>
              <CardFooter><Button variant="outline" asChild disabled={!currentStableId && !isSimulatedJineteEnCuadra}><Link href="/dashboard/calendario">{t('goToCalendar')}</Link></Button></CardFooter>
            </Card>
          </div>
        </div>
      ) : userProfile?.requestedStableId && !activeSimulationRole ? ( 
         <Card className="shadow-lg">
            <CardHeader>
                <CardTitle>{t('requestSent')}</CardTitle>
                <CardDescription>
                {t('requestPending')} <span className="font-mono">{userProfile.requestedStableId}</span> {t('isPending')}
                {t('goToProfile')} <Link href="/profile" className="text-primary underline">{t('myProfileStable')}</Link> {t('forMoreDetails')}
                </CardDescription>
            </CardHeader>
        </Card>
      ) : !activeSimulationRole && userProfile && userProfile.role === 'jinete' ? ( 
        <Alert variant="default" className="max-w-lg mx-auto">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t('noBelongStable')}</AlertTitle>
            <AlertDescription>
            {t('pleaseJoinStable')} <Link href="/profile" className="text-primary underline">{t('myProfileStable')}</Link> {t('toJoin')}
            </AlertDescription>
        </Alert>
      ) : ( 
         <div className="text-center">
            <p className="text-muted-foreground mb-4">
              {activeSimulationRole === 'jineteSinCuadra' 
                ? t('simulatingRider')
                : t('notInStable')}
            </p>
            <Button asChild>
                <Link href="/profile">{t('goToMyProfile')}</Link>
            </Button>
         </div>
      )
    }
    </StableWrapper>
  );
}
