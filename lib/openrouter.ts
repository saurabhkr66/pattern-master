// lib/openrouter.ts

export async function generateQuestionsWithOpenRouter(prompt: string) {
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
        throw new Error("Missing OPENROUTER_API_KEY in .env");
    }

    try {
        console.log(`[OpenRouter] Initiating generation (Model: Gemma 2 27B)`);
        
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
                "HTTP-Referer": "https://patternmaster.ai",
                "X-Title": "PatternMaster AI",
            },
            body: JSON.stringify({
                model: "google/gemma-2-27b-it",
                messages: [
                    {
                        role: "system",
                        content: "Return ONLY valid JSON. No markdown."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 2000,           // 🔥 reduce further
                max_output_tokens: 2000,    // 🔥 keep both
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("OpenRouter API Error:", errorData);
            throw new Error(`OpenRouter API error: ${response.statusText}`);
        }

        const data = await response.json();
        console.log("[OpenRouter] API Response successfully received.");
        const content = data.choices[0].message.content;
        
        // Clean markdown backticks if present
        const cleanedContent = content.replace(/```json/g, "").replace(/```/g, "").trim();
        
        return JSON.parse(cleanedContent);
    } catch (error) {
        console.error("OpenRouter Generation failed:", error);
        throw error;
    }
}
