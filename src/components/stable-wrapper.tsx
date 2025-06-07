"use client";

import React, { useEffect, useRef, useState } from 'react';

interface StableWrapperProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
}

/**
 * StableWrapper ayuda a prevenir errores de DOM durante las transiciones
 * manteniendo una referencia estable del contenedor DOM
 */
export const StableWrapper: React.FC<StableWrapperProps> = ({ 
  children, 
  className = "",
  id 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    // Pequeño delay para asegurar que el DOM esté estable antes de mostrar contenido
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 10);

    return () => {
      clearTimeout(timer);
      setIsVisible(false);
      setIsMounted(false);
    };
  }, []);

  // Si no está montado, no renderizar nada
  if (!isMounted) {
    return null;
  }

  return (
    <div 
      ref={containerRef}
      className={`stable-wrapper ${className}`}
      id={id}
      style={{
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 0.1s ease-in-out'
      }}
    >
      {isVisible && children}
    </div>
  );
};

export default StableWrapper; 