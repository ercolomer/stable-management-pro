"use client";

import { useLanguage } from "@/contexts/language-context";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Languages, Check } from "lucide-react";
import { useTranslations } from '@/hooks/use-translations';

const languages = [
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
] as const;

export function LanguageSelector() {
  const { locale, setLocale, isLoading } = useLanguage();
  const t = useTranslations('navigation');

  const currentLanguage = languages.find(lang => lang.code === locale);

  const handleLanguageChange = async (newLocale: 'es' | 'en' | 'de') => {
    if (isLoading || newLocale === locale) return;
    
    // Log en desarrollo para debug
    if (process.env.NODE_ENV === 'development') {
      console.log(`[LanguageSelector] Cambiando de ${locale} a ${newLocale}`);
    }

    // En producción, mostrar feedback visual inmediato
    try {
      await setLocale(newLocale);
    } catch (error) {
      console.error('[LanguageSelector] Error al cambiar idioma:', error);
      
      // Método fallback para Firebase Hosting
      if (typeof window !== 'undefined') {
        // Configurar cookie directamente
        const isSecure = window.location.protocol === 'https:';
        const cookieValue = `preferred-locale=${newLocale}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=lax${isSecure ? '; Secure' : ''}`;
        document.cookie = cookieValue;
        
        // Guardar en localStorage también
        localStorage.setItem('preferred-locale', newLocale);
        
        // Log para debug
        if (process.env.NODE_ENV === 'development') {
          console.log(`[LanguageSelector] Cookie configurada directamente: ${cookieValue}`);
        }
        
        // Recargar página
        setTimeout(() => {
          window.location.reload();
        }, 200);
      }
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-9 w-9 p-0" 
          disabled={isLoading}
          title={t('changeLanguage')}
        >
          {isLoading ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            currentLanguage?.flag || <Languages className="h-4 w-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[120px]">
        {languages.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => handleLanguageChange(language.code)}
            className="flex items-center gap-2 cursor-pointer"
            disabled={isLoading}
          >
            <span className="text-lg">{language.flag}</span>
            <span className="flex-1">{language.name}</span>
            {locale === language.code && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
