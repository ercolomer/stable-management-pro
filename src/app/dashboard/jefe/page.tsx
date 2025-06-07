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
import { useTranslations } from '@/hooks/use-translations';
import StableWrapper from "@/components/stable-wrapper";

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
  const [isMounted, setIsMounted] = useState(true);
  const t = useTranslations('dashboard');
  const tCommon = useTranslations('common');

  const currentStableId = activeStableId;
  const currentStableName = userProfile?.stableName;
  
  useEffect(() => {
    setIsMounted(true);
    
    if (!authLoading && isMounted) {
      if (!user) {
        router.replace("/login");
      } else if (userProfile && userProfile.role !== 'jefe de cuadra') {
        router.replace('/dashboard/jinete');
      } else if (userProfile && userProfile.role === 'jefe de cuadra' && !currentStableId) {
        // AuthContext should handle redirection to /profile for jefe without stable
      }
    }
    
    return () => {
      setIsMounted(false);
    };
  }, [user, userProfile, authLoading, router, currentStableId, isMounted]);
  
  const copyToClipboard = () => {
    if (!isMounted) return;
    
    if (currentStableId) {
      navigator.clipboard.writeText(currentStableId).then(() => {
        if (isMounted) {
          setCopied(true);
          if (toast) toast({ title: t('copied'), description: "Código de la cuadra copiado al portapapeles." });
          setTimeout(() => {
            if (isMounted) setCopied(false);
          }, 2000);
        }
      }).catch(err => {
        console.error('Error al copiar:', err);
        if (isMounted && toast) {
          toast({ title: tCommon('error'), description: "No se pudo copiar el código.", variant: "destructive" });
        }
      });
    }
  };

  // Protección temprana contra renderizado durante desmontaje
  if (!isMounted) {
    return null;
  }

  if (authLoading) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  if (userProfile?.role === 'jefe de cuadra' && !currentStableId) {
    return (
        <StableWrapper className="container mx-auto py-8 text-center">
             <Alert variant="default" className="max-w-lg mx-auto">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{t('noActiveStable')}</AlertTitle>
                <AlertDescription>
                {t('createManageStables')} <Link href="/profile" className="text-primary underline">{t('myProfileStable')}</Link> {t('toCreateManage')}
                </AlertDescription>
            </Alert>
        </StableWrapper>
    );
  }
  
  return (
    <StableWrapper className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">{t('bossDashboard')} {currentStableName ? `(${currentStableName})` : ""}</h1>
      
      {currentStableId && (
        <Card className="mb-8 shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">{t('activeStable')} {currentStableName || "Cargando nombre..."}</CardTitle>
            <CardDescription>Gestiona tu cuadra y comparte el código con tus jinetes.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mt-2 flex items-center gap-2">
              <p className="text-sm text-muted-foreground">{t('stableCode')}</p>
              <span className="font-mono text-sm bg-muted px-2 py-1 rounded-md text-foreground">{currentStableId}</span>
              <Button onClick={copyToClipboard} size="sm" variant="outline" disabled={!currentStableId}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                <span className="ml-2">{copied ? t('copied') : t('copy')}</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader><CardTitle className="flex items-center gap-2"><Users />{t('manageRiders')}</CardTitle></CardHeader>
          <CardContent><p className="text-muted-foreground text-sm">{t('approveRequests')}</p></CardContent>
          <CardFooter><Button variant="outline" asChild disabled={!currentStableId}><Link href="/dashboard/jefe/jinetes">{t('goToRiders')}</Link></Button></CardFooter>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader><CardTitle className="flex items-center gap-2"><PawPrint />{t('manageHorses')}</CardTitle></CardHeader>
          <CardContent><p className="text-muted-foreground text-sm">{t('addEditHorses')}</p></CardContent>
           <CardFooter><Button variant="outline" asChild disabled={!currentStableId}><Link href="/dashboard/jefe/caballos">{t('goToHorses')}</Link></Button></CardFooter>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader><CardTitle className="flex items-center gap-2"><ListChecks/>{t('manageTasks')}</CardTitle></CardHeader>
          <CardContent><p className="text-muted-foreground text-sm">{t('createAssignTasks')}</p></CardContent>
           <CardFooter><Button variant="outline" asChild disabled={!currentStableId}><Link href="/dashboard/jefe/tareas">{t('goToTasks')}</Link></Button></CardFooter>
        </Card>
         <Card className="hover:shadow-md transition-shadow">
          <CardHeader><CardTitle className="flex items-center gap-2"><CustomHorseIcon className="h-6 w-6"/>{t('manageRides')}</CardTitle></CardHeader>
          <CardContent><p className="text-muted-foreground text-sm">{t('assignCompleteRides')}</p></CardContent>
           <CardFooter><Button variant="outline" asChild disabled={!currentStableId}><Link href="/dashboard/jefe/montas">{t('goToRides')}</Link></Button></CardFooter>
        </Card>
         <Card className="hover:shadow-md transition-shadow">
          <CardHeader><CardTitle className="flex items-center gap-2"><CalendarRange/>{t('stableCalendar')}</CardTitle></CardHeader>
          <CardContent><p className="text-muted-foreground text-sm">{t('viewAllActivities')}</p></CardContent>
          <CardFooter><Button variant="outline" asChild disabled={!currentStableId}><Link href="/dashboard/calendario">{t('goToCalendar')}</Link></Button></CardFooter>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader><CardTitle className="flex items-center gap-2"><Lightbulb />{t('aiTrainingPlans')}</CardTitle></CardHeader>
          <CardContent><p className="text-muted-foreground text-sm">{t('getTrainingSuggestions')}</p></CardContent>
          <CardFooter><Button variant="outline" asChild disabled={!currentStableId}><Link href="/training-plans">{t('goToAiPlans')}</Link></Button></CardFooter>
        </Card>
      </div>
    </StableWrapper>
  );
}
