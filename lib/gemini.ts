// src/lib/gemini.ts
import { GoogleGenerativeAI } from '@google/generative-ai';

if (!process.env.GEMINI_API_KEY) {
    throw new Error("Missing GEMINI_API_KEY in .env");
}

// Initialize the SDK
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// We use 2.5-flash for speed and cost-efficiency
export const geminiModel = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    tools: [],
    generationConfig: { 
        responseMimeType: "application/json",
        maxOutputTokens: 2000,
        // @ts-ignore - Disable hidden thinking to prevent output token costs
        thinkingConfig: { thinkingBudget: 0 },
    }
});