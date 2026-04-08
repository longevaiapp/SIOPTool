import OpenAI from "openai";
import { z } from "zod";

if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY environment variable is required");
}

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Call OpenAI and validate the JSON response with a Zod schema.
 *
 * IMPORTANT: AI recommends only — never auto-mutate critical records
 * based on the returned value (project rule #5).
 */
export async function callOpenAI<T>(
    prompt: string,
    schema: z.ZodSchema<T>,
    options?: {
        model?: string;
        temperature?: number;
    }
): Promise<T> {
    const response = await openai.chat.completions.create({
        model: options?.model ?? "gpt-4o",
        temperature: options?.temperature ?? 0.3,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("Empty response from OpenAI");

    const parsed: unknown = JSON.parse(content);
    return schema.parse(parsed);
}

export default openai;
