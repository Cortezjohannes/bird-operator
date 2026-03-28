import "server-only";

import crypto from "node:crypto";

import type { StoredOAuth2TokenBundle, StoredTokenEnvelope } from "@/src/features/x-auth/types";

function getEncryptionSecret() {
  return process.env.X_TOKEN_ENCRYPTION_KEY || "";
}

function deriveKey(secret: string) {
  return crypto.createHash("sha256").update(secret).digest();
}

export function isTokenEncryptionConfigured() {
  return getEncryptionSecret().trim().length >= 32;
}

export function encryptOAuth2TokenBundle(
  payload: StoredOAuth2TokenBundle,
): StoredTokenEnvelope {
  const secret = getEncryptionSecret();
  if (!isTokenEncryptionConfigured()) {
    throw new Error("X token encryption is not configured.");
  }

  const iv = crypto.randomBytes(12);
  const key = deriveKey(secret);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return {
    version: "v1",
    algorithm: "aes-256-gcm",
    iv: iv.toString("base64url"),
    ciphertext: ciphertext.toString("base64url"),
    tag: tag.toString("base64url"),
    keyId: "env",
  };
}

export function decryptOAuth2TokenBundle(
  envelope: StoredTokenEnvelope,
): StoredOAuth2TokenBundle | null {
  const secret = getEncryptionSecret();
  if (!isTokenEncryptionConfigured()) {
    return null;
  }

  try {
    const key = deriveKey(secret);
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      key,
      Buffer.from(envelope.iv, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(envelope.tag, "base64url"));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(envelope.ciphertext, "base64url")),
      decipher.final(),
    ]);
    return JSON.parse(decrypted.toString("utf8")) as StoredOAuth2TokenBundle;
  } catch {
    return null;
  }
}
