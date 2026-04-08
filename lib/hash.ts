// src/lib/hash.ts
import crypto from 'crypto';

export function generateSemanticHash(text: string): string {
    // Normalize the text (lowercase, remove extra spaces) to catch slight variations
    const normalizedText = text.toLowerCase().replace(/\s+/g, ' ').trim();
    return crypto.createHash('sha256').update(normalizedText).digest('hex');
}