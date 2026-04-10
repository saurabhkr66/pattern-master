// lib/deepseek.ts

export async function generateQuestionsWithDeepSeek(prompt: string) {
    const apiKey = process.env.DEEPSEEK_API_KEY;

    if (!apiKey) {
        throw new Error("Missing DEEPSEEK_API_KEY in .env");
    }

    try {
        console.log(`[DeepSeek] Initiating generation for prompt length: ${prompt.length}`);
        
        const response = await fetch("https://api.deepseek.com/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: "deepseek-chat", // or "deepseek-reasoner" for R1
                messages: [
                    {
                        role: "system",
                        content: "You are an expert examiner for technical exams like GATE, ISRO, and BARC. You must ALWAYS output ONLY valid JSON as requested, without any markdown formatting or explanations."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                response_format: {
                    type: "json_object"
                },
                temperature: 0.7,
                max_tokens: 2000,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("DeepSeek API Error:", errorData);
            throw new Error(`DeepSeek API error: ${response.statusText}`);
        }

        const data = await response.json();
        console.log("[DeepSeek] API Response successfully received.");
        const content = data.choices[0].message.content;
        
        // Clean markdown backticks if present (though response_format: json_object should prevent it)
        const cleanedContent = content.replace(/```json/g, "").replace(/```/g, "").trim();
        
        return JSON.parse(cleanedContent);
    } catch (error) {
        console.error("DeepSeek Generation failed:", error);
        throw error;
    }
}
