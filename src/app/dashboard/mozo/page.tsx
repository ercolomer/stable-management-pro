"use client";

import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, ListChecks, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from "next/link";

export default function MozoDeQuadraDashboardPage() {
  const { 
    user,
    userProfile, 
    loading: authLoading, 
    activeStableId, 
  } = useAuth();
  const router = useRouter();
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
      } else if (userProfile && userProfile.role !== 'mozo de cuadra') {
        // Redirigir a su dashboard correspondiente
        if (userProfile.role === 'jefe de cuadra') {
          router.replace('/dashboard/jefe');
        } else {
          router.replace('/dashboard/jinete');
        }
      } else if (userProfile && userProfile.role === 'mozo de cuadra' && !currentStableId) {
        // AuthContext should handle redirection to /profile for mozo without stable
      }
    }
    
    return () => {
      setIsMounted(false);
    };
  }, [user, userProfile, authLoading, router, currentStableId, isMounted]);

  // Protección temprana contra renderizado durante desmontaje
  if (!isMounted) {
    return null;
  }

  if (authLoading) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  if (userProfile?.role === 'mozo de cuadra' && !currentStableId) {
    return (
        <div className="container mx-auto py-8 text-center">
             <Alert variant="default" className="max-w-lg mx-auto">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{t('noActiveStable')}</AlertTitle>
                <AlertDescription>
                {t('createManageStables')} <Link href="/profile" className="text-primary underline">{t('myProfileStable')}</Link> {t('toCreateManage')}
                </AlertDescription>
            </Alert>
        </div>
    );
  }
  
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">{t('stableHandDashboard')} {currentStableName ? `(${currentStableName})` : ""}</h1>
      
      {currentStableId && (
        <Card className="mb-8 shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">{t('activeStable')} {currentStableName || "Cargando nombre..."}</CardTitle>
            <CardDescription>Como mozo de cuadra, puedes gestionar las tareas diarias de la cuadra.</CardDescription>
          </CardHeader>
        </Card>
      )}
      
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader><CardTitle className="flex items-center gap-2"><ListChecks/>{t('manageTasks')}</CardTitle></CardHeader>
          <CardContent><p className="text-muted-foreground text-sm">{t('createCompleteTasks')}</p></CardContent>
           <CardFooter><Button variant="outline" asChild disabled={!currentStableId}><Link href="/dashboard/mozo/tareas">{t('goToTasks')}</Link></Button></CardFooter>
        </Card>
      </div>
    </div>
  );
} 