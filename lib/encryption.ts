import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!;

// We try to verify the key exists, but in some build environments it might not be present immediately.
// Ideally ensure ENCRYPTION_KEY is set in .env.local
if (!ENCRYPTION_KEY && process.env.NODE_ENV !== 'production') {
  console.warn('ENCRYPTION_KEY is not defined in environment variables');
}

export function encryptString(text: string): string {
    if (!ENCRYPTION_KEY) throw new Error('ENCRYPTION_KEY missing');
    return CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
}

export function decryptString(encryptedText: string): string {
    if (!ENCRYPTION_KEY) throw new Error('ENCRYPTION_KEY missing');
    const bytes = CryptoJS.AES.decrypt(encryptedText, ENCRYPTION_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
}

// Legacy support if needed, or aliases
export const encryptApiKey = encryptString;
export const decryptApiKey = decryptString;
