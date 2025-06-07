"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Wand2, Lightbulb, AlertTriangle } from "lucide-react";
// import { suggestTrainingPlanAction, type SuggestTrainingPlanActionState } from "@/app/training-plans/actions"; // Commented out for static export
import { type SuggestTrainingPlanActionState } from "@/app/training-plans/actions";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from 'next-intl';

export default function TrainingPlanForm() {
  const t = useTranslations('training');
  const initialState: SuggestTrainingPlanActionState = { message: "", errors: {}, trainingPlan: "" };
  const [state, setState] = useState<SuggestTrainingPlanActionState>(initialState);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.message && !state.errors?.horseDescription && !state.errors?.desiredOutcome && !state.errors?._form && state.trainingPlan) {
      toast({
        title: "Plan Sugerido",
        description: state.message,
      });
    } else if (state.message && (state.errors?.horseDescription || state.errors?.desiredOutcome || state.errors?._form)) {
      toast({
        title: "Error en la Solicitud",
        description: state.errors?._form?.join(", ") || state.message || "Por favor, revisa los errores en el formulario.",
        variant: "destructive",
      });
    }
  }, [state, toast]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // const formData = new FormData(event.currentTarget);
    // startTransition(async () => {
    //   const result = await suggestTrainingPlanAction(initialState, formData);
    //   setState(result);
    // });
    
    // Temporary message for static export
    toast({
      title: t('temporarilyDisabled'),
      description: t('temporarilyDisabledDescription'),
      variant: "destructive",
    });
  };

  return (
    <div className="space-y-6">
      <Alert className="border-orange-200 bg-orange-50">
        <AlertTriangle className="h-4 w-4 text-orange-600" />
        <AlertTitle className="text-orange-800">{t('temporarilyDisabled')}</AlertTitle>
        <AlertDescription className="text-orange-700">
          {t('temporarilyDisabledDescription')}
        </AlertDescription>
      </Alert>
      
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
        <div>
          <Label htmlFor="horseDescription" className="block text-sm font-medium text-foreground mb-1">
            Descripción del Caballo (mín. 10 caracteres)
          </Label>
          <Textarea
            id="horseDescription"
            name="horseDescription"
            rows={4}
            className="w-full"
            placeholder="Ej: Potro de 3 años, raza indefinida, algo nervioso pero con buena disposición. Nivel de doma básico."
            required
            disabled={true} // Always disabled in static version
            aria-describedby={state.errors?.horseDescription ? "horseDescription-error" : undefined}
          />
          {state.errors?.horseDescription && (
            <p id="horseDescription-error" className="mt-1 text-xs text-destructive">{state.errors.horseDescription.join(", ")}</p>
          )}
        </div>

        <div>
          <Label htmlFor="desiredOutcome" className="block text-sm font-medium text-foreground mb-1">
            Resultado Deseado del Entrenamiento (mín. 10 caracteres)
          </Label>
          <Textarea
            id="desiredOutcome"
            name="desiredOutcome"
            rows={3}
            className="w-full"
            placeholder="Ej: Que el caballo acepte la silla y el jinete, y responda a las ayudas básicas (paso, trote, galope, paradas)."
            required
            disabled={true} // Always disabled in static version
            aria-describedby={state.errors?.desiredOutcome ? "desiredOutcome-error" : undefined}
          />
          {state.errors?.desiredOutcome && (
            <p id="desiredOutcome-error" className="mt-1 text-xs text-destructive">{state.errors.desiredOutcome.join(", ")}</p>
          )}
        </div>
        
        {state.errors?._form && (
            <Alert variant="destructive">
              <AlertTitle>Error General</AlertTitle>
              <AlertDescription>{state.errors._form.join(", ")}</AlertDescription>
            </Alert>
          )}

        <Button type="submit" className="w-full sm:w-auto" disabled={true}>
          <Wand2 className="mr-2 h-4 w-4" />
          Sugerir Plan de Entrenamiento (Temporalmente Deshabilitado)
        </Button>
      </form>
    </div>
  );
}
