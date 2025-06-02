// 'use server'; // Commented out for static export

// import { suggestTrainingPlan, SuggestTrainingPlanInputSchema } from '@/ai/flows/suggest-training-plan';

// Define the state shape for the action
export interface SuggestTrainingPlanActionState {
  message: string;
  errors?: {
    horseDescription?: string[];
    desiredOutcome?: string[];
    _form?: string[]; // For general form errors
  };
  trainingPlan: string;
}

// Temporarily disabled for static export
/*
export async function suggestTrainingPlanAction(
  prevState: SuggestTrainingPlanActionState, // prevState might not be strictly needed if not using it to influence next state beyond errors
  formData: FormData
): Promise<SuggestTrainingPlanActionState> {
  console.log("[Server Action] suggestTrainingPlanAction: Received form data.");
  const rawFormData = {
    horseDescription: formData.get('horseDescription') as string,
    desiredOutcome: formData.get('desiredOutcome') as string,
  };

  const validatedFields = SuggestTrainingPlanInputSchema.safeParse(rawFormData);

  if (!validatedFields.success) {
    const fieldErrors = validatedFields.error.flatten().fieldErrors;
    console.error("[Server Action] suggestTrainingPlanAction: Validation failed", fieldErrors);
    return {
      message: "Error de validación. Por favor, revisa los campos.",
      errors: fieldErrors,
      trainingPlan: "",
    };
  }

  try {
    console.log("[Server Action] suggestTrainingPlanAction: Calling suggestTrainingPlan flow with validated data:", validatedFields.data);
    const result = await suggestTrainingPlan(validatedFields.data);
    console.log("[Server Action] suggestTrainingPlanAction: Flow returned result:", result);
    
    if (result && result.plan) {
      return {
        message: "Plan de entrenamiento sugerido:",
        trainingPlan: result.plan,
        errors: {}, // Clear previous errors
      };
    } else {
      console.error("[Server Action] suggestTrainingPlanAction: Flow returned no plan or unexpected result.");
      return {
        message: "No se pudo generar un plan de entrenamiento. El modelo no devolvió un plan.",
        trainingPlan: "",
        errors: { _form: ["El modelo no devolvió un plan de entrenamiento."] },
      };
    }
  } catch (error: any) {
    console.error("[Server Action] suggestTrainingPlanAction: Error calling flow:", error);
    let errorMessage = "Ocurrió un error desconocido al generar el plan de entrenamiento.";
    if (error.message) {
      errorMessage = error.message.includes("API key not valid") 
        ? "Error de API: La clave API de Google no es válida o no tiene los permisos necesarios."
        : error.message;
    }
    return {
      message: `Error al generar el plan: ${errorMessage}`,
      trainingPlan: "",
      errors: { _form: [errorMessage] },
    };
  }
}
*/
