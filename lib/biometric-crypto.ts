import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const raw = process.env.BIOMETRIC_ENCRYPTION_KEY?.trim();
  if (raw) {
    const decoded = Buffer.from(raw, "base64");
    if (decoded.length === 32) return decoded;
    return createHash("sha256").update(raw).digest();
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("BIOMETRIC_ENCRYPTION_KEY é obrigatória em produção.");
  }

  return createHash("sha256").update("ehs-biometric-dev-key").digest();
}

export function encryptBiometricTemplate(templateBase64: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(templateBase64, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decryptBiometricTemplate(templateEnc: string): string {
  const key = getEncryptionKey();
  const payload = Buffer.from(templateEnc, "base64");
  const iv = payload.subarray(0, IV_LENGTH);
  const tag = payload.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const encrypted = payload.subarray(IV_LENGTH + TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}
