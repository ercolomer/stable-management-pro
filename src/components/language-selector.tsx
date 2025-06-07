"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Globe, ChevronDown, Check } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import { useLocale } from "next-intl";

const languages = [
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
] as const;

interface LanguageSelectorProps {
  isCompact?: boolean;
}

export function LanguageSelector({ isCompact = false }: LanguageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { locale: contextLocale, setLocale, isLoading } = useLanguage();
  const nextIntlLocale = useLocale();

  // Debug logging - usando useEffect para evitar logs en cada render
  useEffect(() => {
    console.log(`[LanguageSelector] 🔍 Mounted - contextLocale: ${contextLocale}, nextIntlLocale: ${nextIntlLocale}, isLoading: ${isLoading}`);
  }, []); // Solo al montar

  // Use nextIntlLocale as the source of truth
  const currentLocale = nextIntlLocale || contextLocale;
  
  // Memoizar el idioma actual para evitar recálculos
  const currentLanguage = useMemo(
    () => languages.find(lang => lang.code === currentLocale) || languages[0],
    [currentLocale]
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen]);

  const handleLanguageChange = (languageCode: string) => {
    console.log(`[LanguageSelector] 🔄 Cambiando idioma a: ${languageCode}`);
    
    // Cerrar dropdown inmediatamente
    setIsOpen(false);
    
    // Cambiar idioma solo si es diferente
    if (languageCode !== currentLocale) {
      setLocale(languageCode as 'es' | 'en' | 'de');
    }
  };

  const handleToggleDropdown = () => {
    console.log(`[LanguageSelector] Toggling dropdown: ${!isOpen}`);
    setIsOpen(!isOpen);
  };

  if (isLoading) {
    return (
      <Button
        variant="outline"
        size={isCompact ? "sm" : "default"}
        disabled
        className={cn(
          "gap-2",
          isCompact ? "h-8 px-2" : "h-10 px-3"
        )}
      >
        <Globe className="h-4 w-4 animate-pulse" />
        {!isCompact && <span>...</span>}
      </Button>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="outline"
        size={isCompact ? "sm" : "default"}
        onClick={handleToggleDropdown}
        className={cn(
          "gap-2",
          isCompact ? "h-8 px-2" : "h-10 px-3"
        )}
        aria-label="Seleccionar idioma"
        aria-expanded={isOpen}
      >
        <span className="text-base">{currentLanguage.flag}</span>
        {!isCompact && (
          <>
            <span>{currentLanguage.name}</span>
            <ChevronDown className={cn(
              "h-4 w-4 transition-transform",
              isOpen && "rotate-180"
            )} />
          </>
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-1 w-40 rounded-md border bg-popover p-1 shadow-md animate-in fade-in-0 zoom-in-95">
          {languages.map((language) => (
            <button
              key={language.code}
              onClick={() => handleLanguageChange(language.code)}
              className={cn(
                "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                currentLocale === language.code && "bg-accent text-accent-foreground"
              )}
              aria-label={`Cambiar a ${language.name}`}
            >
              <span className="text-base">{language.flag}</span>
              <span className="flex-1 text-left">{language.name}</span>
              {currentLocale === language.code && <Check className="h-4 w-4" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
