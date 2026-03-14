
'use server';
/**
 * @fileOverview Business Advice Generation Flow
 *
 * - generateAdvice - Analyzes business data and generates professional advice.
 * - GenerateAdviceInput - Input containing business name, industry, and simplified metrics.
 * - GenerateAdviceOutput - The generated advice string.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateAdviceInputSchema = z.object({
  businessName: z.string(),
  industry: z.string(),
  transactions: z.array(z.object({
    type: z.string(),
    amount: z.number(),
    category: z.string()
  })),
  inventory: z.array(z.object({
    name: z.string(),
    stock: z.number(),
    reorderPoint: z.number()
  }))
});
export type GenerateAdviceInput = z.infer<typeof GenerateAdviceInputSchema>;

const GenerateAdviceOutputSchema = z.object({
  advice: z.string().describe('The professional advice text for the business owner.')
});
export type GenerateAdviceOutput = z.infer<typeof GenerateAdviceOutputSchema>;

export async function generateAdvice(input: GenerateAdviceInput): Promise<GenerateAdviceOutput> {
  return generateAdviceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateAdvicePrompt',
  input: { schema: GenerateAdviceInputSchema },
  output: { schema: GenerateAdviceOutputSchema },
  prompt: `You are an expert business consultant at Harbor & Co.

Analyze the following data for "{{{businessName}}}" in the {{{industry}}} sector.

Recent Transactions:
{{#each transactions}}
- {{type}}: ₦{{amount}} ({{category}})
{{/each}}

Inventory Status:
{{#each inventory}}
- {{name}}: {{stock}} units (Reorder at {{reorderPoint}})
{{/each}}

Tasks:
1. Identify financial trends (e.g., high expenses in a specific category, strong sales).
2. Spot operational risks (e.g., low stock items).
3. Provide 3 actionable, professional bullet points of advice to help the owner grow or stabilize their business.
4. Keep the tone professional, encouraging, and concise.

Generate the advice text now.`
});

const generateAdviceFlow = ai.defineFlow(
  {
    name: 'generateAdviceFlow',
    inputSchema: GenerateAdviceInputSchema,
    outputSchema: GenerateAdviceOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
