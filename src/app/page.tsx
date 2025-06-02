
"use client";

import { useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation"; // Correct import for App Router
import { Loader2 } from "lucide-react";

export default function HomePage() {
  const { 
    user, 
    userProfile, 
    loading: authLoading, 
    activeRole, 
    activeStableId, 
    setNavigateToPath 
  } = useAuth();
  const router = useRouter(); // Use useRouter from next/navigation

  useEffect(() => {
    console.log(`[HomePage] Effect triggered. AuthLoading: ${authLoading}, User: ${!!user}, Profile: ${!!userProfile}, Role: ${activeRole}, StableID: ${activeStableId ? activeStableId.substring(0,5) : 'null'}`);

    if (authLoading) {
      console.log("[HomePage] Auth is loading. No action taken yet.");
      return; 
    }

    if (!user) {
      console.log("[HomePage] No user found. Requesting navigation to /login.");
      if (setNavigateToPath) setNavigateToPath("/login");
      return;
    }

    // User is authenticated, check profile and stable status
    if (!userProfile || !activeRole) {
      console.log("[HomePage] User authenticated, but no profile/role. Requesting navigation to /profile.");
      if (setNavigateToPath) setNavigateToPath("/profile");
      return;
    }

    // User has profile and role, check stable
    if (!activeStableId && !userProfile.requestedStableId) { // No stable and no pending request
      console.log("[HomePage] User has profile/role, but no stable and no request. Requesting navigation to /profile to join/create.");
      if (setNavigateToPath) setNavigateToPath("/profile");
      return;
    }
    
    // User has stable or a pending request, or is jefe de cuadra without stable (can create from profile)
    if (activeRole === "jefe de cuadra") {
      if (!activeStableId && !userProfile.requestedStableId) { // Jefe can be without stable and create one from profile
        console.log("[HomePage] Jefe de cuadra without stable or request. Requesting navigation to /profile.");
         if (setNavigateToPath) setNavigateToPath("/profile");
      } else { // Jefe has stable or request
        console.log("[HomePage] Jefe de cuadra. Requesting navigation to /dashboard/jefe.");
         if (setNavigateToPath) setNavigateToPath("/dashboard/jefe");
      }
    } else if (activeRole === "jinete") {
      if (!activeStableId && !userProfile.requestedStableId) { // Jinete must have stable or request one
         console.log("[HomePage] Jinete without stable or request. Requesting navigation to /profile.");
         if (setNavigateToPath) setNavigateToPath("/profile");
      } else { // Jinete has stable or request
        console.log("[HomePage] Jinete. Requesting navigation to /dashboard/jinete.");
        if (setNavigateToPath) setNavigateToPath("/dashboard/jinete");
      }
    } else {
      // Should not happen if role is defined and is one of the two
      console.warn("[HomePage] Unknown role or inconsistent state. Requesting navigation to /profile as fallback.");
      if (setNavigateToPath) setNavigateToPath("/profile");
    }

  }, [user, userProfile, authLoading, router, activeRole, activeStableId, setNavigateToPath]);

  if (authLoading || (!user && typeof window !== 'undefined')) { // Added typeof window check for initial SSR/hydration consideration
    // Show loader if auth is loading OR if there's no user yet (client-side, to avoid flash of content)
    return (
      <div className="flex h-screen flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Cargando HallConnect...</p>
      </div>
    );
  }

  // Fallback content if redirection hasn't happened or user is briefly in an intermediate state
  // This also helps if JS is disabled or slow to load, showing a sensible initial message.
  return (
    <div className="flex h-screen flex-col items-center justify-center p-4 text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <h1 className="mt-6 text-xl font-semibold text-foreground">Verificando tu sesión...</h1>
        <p className="mt-2 text-muted-foreground">
            Serás redirigido en breve. Si esto tarda mucho, por favor refresca la página o revisa tu conexión.
        </p>
    </div>
  );
}
