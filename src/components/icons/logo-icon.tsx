
import type { SVGProps } from 'react';

export function LogoIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      width="32"
      height="32"
      aria-label="Logo de HallConnect"
      {...props}
    >
      {/* Ejemplo de un logo simple - puedes reemplazarlo con tu propio SVG */}
      <rect width="100" height="100" rx="20" fill="hsl(var(--primary))" />
      {/* Letra H estilizada */}
      <path 
        d="M25 20 V 80 M75 20 V 80 M25 50 H 75" 
        stroke="hsl(var(--primary-foreground))" 
        strokeWidth="12" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
       {/* Pequeño detalle simulando conexión o pista */}
      <circle cx="50" cy="50" r="8" fill="hsl(var(--background))" />
      <circle cx="50" cy="50" r="4" fill="hsl(var(--primary-foreground))" />
    </svg>
  );
}
