// 'use server'; // Commented out for static export
/*
/**
 * @fileOverview A Genkit flow to suggest horse training plans.
 *
 * - suggestTrainingPlan - A function that handles the training plan suggestion.
 * - SuggestTrainingPlanInputSchema - The input type for the suggestTrainingPlan function.
 * - SuggestTrainingPlanOutputSchema - The return type for the suggestTrainingPlan function.
 */
/*
import {ai} from '@/ai/genkit';
import {z} from 'zod'; // Changed from 'genkit/zod'

export const SuggestTrainingPlanInputSchema = z.object({
  horseDescription: z.string().min(10, { message: "La descripción del caballo debe tener al menos 10 caracteres." }).describe("Detailed description of the horse, including age, breed, temperament, and current training level."),
  desiredOutcome: z.string().min(10, { message: "El resultado deseado debe tener al menos 10 caracteres." }).describe("The desired outcome of the training plan."),
});
export type SuggestTrainingPlanInput = z.infer<typeof SuggestTrainingPlanInputSchema>;

export const SuggestTrainingPlanOutputSchema = z.object({
  plan: z.string().describe("A suggested training plan based on the input."),
});
export type SuggestTrainingPlanOutput = z.infer<typeof SuggestTrainingPlanOutputSchema>;

export async function suggestTrainingPlan(input: SuggestTrainingPlanInput): Promise<SuggestTrainingPlanOutput> {
  console.log("[AI Flow] suggestTrainingPlan invoked with input:", JSON.stringify(input));
  try {
    const result = await suggestTrainingPlanFlow(input);
    console.log("[AI Flow] suggestTrainingPlan flow result:", JSON.stringify(result));
    return result;
  } catch (error) {
    console.error("[AI Flow] Error in suggestTrainingPlan:", error);
    // Re-throw or handle as appropriate for your application
    throw error;
  }
}

const trainingPrompt = ai.definePrompt({
  name: 'trainingPlanPrompt',
  input: { schema: SuggestTrainingPlanInputSchema },
  output: { schema: SuggestTrainingPlanOutputSchema },
  prompt: `Eres un experto entrenador de caballos. Basado en la siguiente descripción del caballo y el resultado deseado, genera un plan de entrenamiento semanal detallado.

  Descripción del Caballo:
  {{{horseDescription}}}

  Resultado Deseado:
  {{{desiredOutcome}}}

  Proporciona un plan de entrenamiento estructurado para una semana, con actividades diarias sugeridas.
  El plan debe ser claro, conciso, práctico y fácil de seguir.
  Responde únicamente con el plan de entrenamiento.
  `,
  config: {
    model: 'googleai/gemini-1.5-flash-latest', // Ensure this model is appropriate and available
    temperature: 0.7,
    // Example safety settings (adjust as needed)
    // safetySettings: [
    //   { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    //   { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    // ],
  }
});

const suggestTrainingPlanFlow = ai.defineFlow(
  {
    name: 'suggestTrainingPlanFlow',
    inputSchema: SuggestTrainingPlanInputSchema,
    outputSchema: SuggestTrainingPlanOutputSchema,
  },
  async (input) => {
    console.log("[AI Flow] Executing suggestTrainingPlanFlow with input:", JSON.stringify(input));
    
    // Check for GOOGLE_API_KEY at runtime if not already done broadly
    if (!process.env.GOOGLE_API_KEY) {
        console.error("[AI Flow] suggestTrainingPlanFlow: GOOGLE_API_KEY is not set. Aborting.");
        throw new Error("La clave API de Google no está configurada. No se puede generar el plan.");
    }

    const { output, usage } = await trainingPrompt(input);
    
    if (!output || !output.plan) {
      console.error("[AI Flow] suggestTrainingPlanFlow: No output or no plan in output from prompt. Output:", JSON.stringify(output));
      throw new Error("El modelo de IA no generó un plan de entrenamiento.");
    }
    console.log("[AI Flow] suggestTrainingPlanFlow: Prompt output received. Usage:", usage);
    return output;
  }
);
*/
