"use client";

import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LanguageSelector } from "@/components/language-selector";
import { Loader2 } from "lucide-react";
import { useTranslations } from 'next-intl';

export default function HomePage() {
  const t = useTranslations('common');
  const tHome = useTranslations('home');
  const { user, userProfile, loading: authLoading, activeRole, activeStableId, setNavigateToPath } = useAuth();
  const router = useRouter();

  useEffect(() => {
    console.log(`[HomePage] Effect triggered. AuthLoading: ${authLoading}, User: ${!!user}, Profile: ${!!userProfile}, Role: ${activeRole}, StableID: ${activeStableId ? activeStableId.substring(0,5) : 'null'}`);

    // Wait for auth to complete loading before making navigation decisions
    if (authLoading) {
      console.log("[HomePage] Auth still loading, waiting...");
      return;
    }

    // If no user, let them stay on this page to eventually be redirected to login
    if (!user) {
      console.log("[HomePage] No user, staying on homepage.");
      return;
    }

    // If user exists but profile is not loaded yet, wait
    if (!userProfile) {
      console.log("[HomePage] User exists but profile not loaded yet, waiting...");
      return;
    }

    // User is authenticated and profile is loaded
    console.log(`[HomePage] User and profile loaded. Role: ${activeRole}, StableId: ${activeStableId}, RequestedStableId: ${userProfile.requestedStableId}`);
    
    // User has stable or a pending request, or is jefe de cuadra without stable (can create from profile)
    if (activeRole === "jefe de cuadra") {
      if (!activeStableId && !userProfile.requestedStableId) { // Jefe can be without stable and create one from profile
        console.log("[HomePage] Jefe de cuadra without stable or request. Requesting navigation to /profile.");
         if (setNavigateToPath) setNavigateToPath('/profile');
      } else { // Jefe has stable or request
        console.log("[HomePage] Jefe de cuadra. Requesting navigation to /dashboard/jefe.");
         if (setNavigateToPath) setNavigateToPath('/dashboard/jefe');
      }
    } else if (activeRole === "jinete") {
      if (!activeStableId && !userProfile.requestedStableId) { // Jinete must have stable or request one
         console.log("[HomePage] Jinete without stable or request. Requesting navigation to /profile.");
         if (setNavigateToPath) setNavigateToPath('/profile');
      } else { // Jinete has stable or request
        console.log("[HomePage] Jinete. Requesting navigation to /dashboard/jinete.");
        if (setNavigateToPath) setNavigateToPath('/dashboard/jinete');
      }
    } else if (activeRole === "mozo de cuadra") {
      if (!activeStableId && !userProfile.requestedStableId) { // Mozo must have stable or request one
         console.log("[HomePage] Mozo de cuadra without stable or request. Requesting navigation to /profile.");
         if (setNavigateToPath) setNavigateToPath('/profile');
      } else { // Mozo has stable or request
        console.log("[HomePage] Mozo de cuadra. Requesting navigation to /dashboard/mozo.");
        if (setNavigateToPath) setNavigateToPath('/dashboard/mozo');
      }
    } else {
      // User has no role set - redirect to profile to choose
      console.log("[HomePage] User has no role set. Requesting navigation to /profile to choose role.");
      if (setNavigateToPath) setNavigateToPath('/profile');
    }

  }, [user, userProfile, authLoading, activeRole, activeStableId]);

  if (authLoading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center">
        <div className="absolute top-4 right-4">
          <LanguageSelector />
        </div>
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">{t('loading')} Connected Stable...</p>
        <div className="mt-8 p-4 bg-muted rounded-lg text-center max-w-md">
          <h3 className="font-semibold mb-2">🌍 {tHome('i18nWorking')}</h3>
          <p className="text-sm text-muted-foreground">
            {tHome('i18nDescription')}
          </p>
        </div>
      </div>
    );
  }

  // Si no hay usuario, mostrar la página de bienvenida con enlaces a login/registro
  if (!user) {
    return (
      <div className="flex h-screen flex-col items-center justify-center p-4 text-center">
        <div className="absolute top-4 right-4">
          <LanguageSelector />
        </div>
        <h1 className="text-4xl font-bold text-foreground mb-4">
          {tHome('welcome')} Connected Stable
        </h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-md">
          {tHome('description')}
        </p>
        <div className="space-y-4 w-full max-w-xs">
          <button 
            onClick={() => router.push('/login')}
            className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            {t('login')}
          </button>
          <button 
            onClick={() => router.push('/register')}
            className="w-full px-4 py-2 border border-border text-foreground rounded-lg hover:bg-accent transition-colors"
          >
            {t('register')}
          </button>
        </div>
        <div className="mt-8 p-4 bg-muted rounded-lg text-center max-w-md">
          <h3 className="font-semibold mb-2">🌍 {tHome('i18nWorking')}</h3>
          <p className="text-sm text-muted-foreground">
            {tHome('i18nDescription')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col items-center justify-center p-4 text-center">
        <div className="absolute top-4 right-4">
          <LanguageSelector />
        </div>
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <h1 className="mt-6 text-xl font-semibold text-foreground">
          {t('verifyingSession')}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {t('willBeRedirected')}
        </p>
        <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-lg text-center max-w-md">
          <h3 className="font-semibold mb-2 text-green-800">✅ {t('welcome')} to Connected Stable</h3>
          <p className="text-sm text-green-700">
            {tHome('englishAdded')}
          </p>
        </div>
    </div>
  );
}
