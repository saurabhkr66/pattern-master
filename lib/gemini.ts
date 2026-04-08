// src/lib/gemini.ts
import { GoogleGenerativeAI } from '@google/generative-ai';

if (!process.env.GEMINI_API_KEY) {
    throw new Error("Missing GEMINI_API_KEY in .env");
}

// Initialize the SDK
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// We use 1.5-flash as planned for speed and cost-efficiency
export const geminiModel = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    // Force JSON response to prevent parsing errors
    generationConfig: { responseMimeType: "application/json" }
});