export async function generateSemanticHash(text: string): Promise<string> {
    // Normalize the text (lowercase, remove extra spaces) to catch slight variations
    const normalizedText = text.toLowerCase().replace(/\s+/g, ' ').trim();
    const msgUint8 = new TextEncoder().encode(normalizedText);
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}