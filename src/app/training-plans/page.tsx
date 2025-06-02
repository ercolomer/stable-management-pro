
"use client"; // This page uses client-side components like TrainingPlanForm

import TrainingPlanForm from "@/components/training/training-plan-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb } from "lucide-react";

export default function TrainingPlansPage() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-bold flex items-center gap-2">
            <Lightbulb className="h-8 w-8 text-primary" />
            Sugerir Plan de Entrenamiento (IA)
          </CardTitle>
          <CardDescription>
            Describe tu caballo y tus objetivos para obtener un plan de entrenamiento semanal sugerido por IA.
            Asegúrate de tener configurada la variable de entorno GOOGLE_API_KEY.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TrainingPlanForm />
        </CardContent>
      </Card>
    </div>
  );
}
