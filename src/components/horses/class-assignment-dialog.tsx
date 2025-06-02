
"use client";

// Este componente se refactorizará o eliminará.
// Por ahora, lo mantenemos simple.

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface ClassAssignmentDialogProps {
  horseName: string;
  children: React.ReactNode; // Trigger element
}

export function ClassAssignmentDialog({ horseName, children }: ClassAssignmentDialogProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const handleSubmit = () => {
    toast({
      title: "Funcionalidad en Reconstrucción",
      description: `La asignación de clases para ${horseName} se está rediseñando.`,
    });
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Asignar {horseName} a una Clase (En Reconstrucción)</DialogTitle>
          <DialogDescription>
            Esta funcionalidad se está actualizando para el nuevo sistema.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
            <p className="text-muted-foreground text-center">Próximamente: Selección de clases.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled>Asignar (Deshabilitado)</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
