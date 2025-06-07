import { useRouter, usePathname } from 'next/navigation';
import { useCallback } from 'react';

export function useChangeLocale() {
  const router = useRouter();
  const pathname = usePathname();

  const changeLocale = useCallback((newLocale: string) => {
    // Guardar en localStorage y cookie
    localStorage.setItem('preferred-locale', newLocale);
    document.cookie = `preferred-locale=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
    
    // Opción 1: Recargar la página (más simple, funciona con next-intl)
    window.location.reload();
    
    // Opción 2: Navegar sin recargar (requiere configuración adicional)
    // router.push(pathname);
    // router.refresh();
  }, [pathname, router]);

  return changeLocale;
}
