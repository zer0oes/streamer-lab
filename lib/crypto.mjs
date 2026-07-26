import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const KEY_LENGTH = 32;

export class EncryptionKeyError extends Error {}

/** Lit et decode TOKEN_ENCRYPTION_KEY (base64, 32 octets) au moment de l'usage. */
export function loadEncryptionKey(source = process.env.TOKEN_ENCRYPTION_KEY) {
  const raw = source?.trim();
  if (!raw) throw new EncryptionKeyError("TOKEN_ENCRYPTION_KEY manquante");
  const key = Buffer.from(raw, "base64");
  if (key.length !== KEY_LENGTH) {
    throw new EncryptionKeyError(`TOKEN_ENCRYPTION_KEY doit faire ${KEY_LENGTH} octets une fois decodee (base64), recu ${key.length}`);
  }
  return key;
}

/** Chiffre un texte en clair, retourne { ciphertext, iv, authTag } (tout en base64). */
export function encryptToken(plaintext, key = loadEncryptionKey()) {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(String(plaintext), "utf8"), cipher.final()]);
  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64")
  };
}

/** Dechiffre {ciphertext, iv, authTag} (base64) et retourne le texte en clair. Leve en cas d'alteration. */
export function decryptToken({ ciphertext, iv, authTag }, key = loadEncryptionKey()) {
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(authTag, "base64"));
  const plaintext = Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64")), decipher.final()]);
  return plaintext.toString("utf8");
}
