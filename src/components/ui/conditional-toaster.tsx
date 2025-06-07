"use client"

import { useLanguage } from "@/contexts/language-context";
import { Toaster } from "./toaster";

export function ConditionalToaster() {
  const { isLoading: languageLoading } = useLanguage();
  
  // No renderizar el Toaster hasta que el idioma esté sincronizado
  if (languageLoading) {
    return null;
  }
  
  return <Toaster />;
} 