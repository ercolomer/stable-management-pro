// 'use server'; // Commented out for static export
/*
/**
 * @fileOverview Initializes and exports the Genkit AI instance.
 */
/*
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
// import {firebase} from '@genkit-ai/firebase'; // Uncomment if you need Firebase integration with Genkit

// Ensure GOOGLE_API_KEY is set in your environment variables (e.g., .env.local)
if (!process.env.GOOGLE_API_KEY) {
  console.warn(
    'ACTION REQUIRED: GOOGLE_API_KEY environment variable not set. Genkit flows using Google AI models will likely fail. Please set it in your .env.local file or environment.'
  );
  // You might want to throw an error here if the key is absolutely critical for app startup
  // throw new Error("GOOGLE_API_KEY environment variable is required for Google AI plugin.");
}

export const ai = genkit({
  plugins: [
    googleAI({ apiKey: process.env.GOOGLE_API_KEY }), // Pass the API key
    // firebase(), // Example: firebase() for Firebase integration (auth, etc.)
  ],
  // Do NOT use logLevel here for Genkit v1.x
  // enableTracing: true, // Optional: Server-side tracing, useful for debugging Genkit flows
});

console.log('Genkit AI instance initialized in src/ai/genkit.ts');
*/
