
"use client";

// Este componente se refactorizará o eliminará.
// Por ahora, lo mantenemos simple.

import Link from "next/link";
import { Button } from "@/components/ui/button";

interface HorseProfileClientProps {
  horse?: { name: string }; // Simplificado
}

export default function HorseProfileClient({ horse }: HorseProfileClientProps) {
  if (!horse) {
    return (
      <div className="text-center text-muted-foreground">
        <p className="text-lg">Caballo no encontrado (en reconstrucción).</p>
        <Button asChild variant="link" className="mt-4">
          <Link href="/dashboard/jefe">Volver al Panel</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">{horse.name} (en reconstrucción)</h1>
       <p className="text-muted-foreground">
        La vista detallada del perfil del caballo se está rediseñando.
      </p>
    </div>
  );
}
