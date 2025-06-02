
"use client";

import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { Loader2 } from "lucide-react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace("/login");
      } else if (user && !userProfile?.role) {
        // Podría redirigir a una página para completar perfil o seleccionar rol si no se hizo en registro
        // Por ahora, si no hay rol, podría ser un estado inválido, redirigir a login o perfil.
        console.warn("Usuario autenticado pero sin rol definido.");
        router.replace("/profile"); 
      }
      // La lógica de redirección específica del rol (jefe vs jinete)
      // se maneja en la página principal (src/app/page.tsx)
      // y las páginas específicas del dashboard podrían verificar el rol si es necesario.
    }
  }, [user, userProfile, loading, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    // Este return es por si el useEffect no alcanza a redirigir antes del render.
    return null; 
  }
  
  // Aquí podríamos añadir una capa extra de verificación de rol si este layout es
  // genérico para todos los dashboards y las sub-rutas no lo hacen.
  // Por ejemplo: if (userProfile?.role !== 'rol_esperado_para_esta_ruta') router.replace('/acceso-denegado');

  return <>{children}</>;
}
