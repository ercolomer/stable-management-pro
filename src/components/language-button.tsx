"use client";

import { useLanguage } from '@/contexts/language-context';
import { useTranslations } from '@/hooks/use-translations';
import { Globe, RefreshCw } from 'lucide-react';

export function LanguageButton() {
  const { locale, setLocale, isLoading } = useLanguage();
  const t = useTranslations('common');

  const languages = [
    { value: 'es', label: 'Español', flag: '🇪🇸' },
    { value: 'en', label: 'English', flag: '🇺🇸' },
    { value: 'de', label: 'Deutsch', flag: '🇩🇪' },
  ];

  const toggleLanguage = () => {
    const currentIndex = languages.findIndex(lang => lang.value === locale);
    const nextIndex = (currentIndex + 1) % languages.length;
    setLocale(languages[nextIndex].value as 'es' | 'en' | 'de');
  };

  const currentLanguage = languages.find(lang => lang.value === locale);

  return (
    <button
      onClick={toggleLanguage}
      disabled={isLoading}
      className="flex items-center gap-3 px-4 py-3 rounded-lg bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-primary/50 dark:hover:border-primary/50 shadow-lg hover:shadow-xl transition-all duration-300 min-w-[160px] disabled:opacity-50 disabled:cursor-not-allowed group"
      title={`${t('language')}: ${currentLanguage?.label} (Click para cambiar)`}
    >
      <Globe className="h-5 w-5 text-primary group-hover:text-primary/80 transition-colors" />
      <div className="flex items-center gap-2 flex-1">
        <span className="text-2xl">{currentLanguage?.flag}</span>
        <span className="font-semibold text-gray-700 dark:text-gray-200 group-hover:text-primary transition-colors">
          {currentLanguage?.label}
        </span>
      </div>
      <RefreshCw className="h-4 w-4 text-gray-500 group-hover:text-primary/70 transition-all duration-200 group-hover:rotate-180" />
    </button>
  );
} 