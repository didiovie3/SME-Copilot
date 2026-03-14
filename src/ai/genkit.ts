
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * Genkit instance for the Uruvia application.
 * This instance is used to define flows, prompts, and interact with Google AI models.
 * Ensure GOOGLE_GENAI_API_KEY or GEMINI_API_KEY is set in your environment variables.
 */
export const ai = genkit({
  plugins: [googleAI()],
});
