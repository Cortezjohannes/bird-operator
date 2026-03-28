import type { AppSessionPayload } from "@/src/features/auth/types";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function bytesToBase64Url(bytes: Uint8Array) {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");
  }

  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");

  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(padded, "base64"));
  }

  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function verifySignatureSegment(
  segment: string,
  signature: string,
  secret: string,
) {
  const key = await importSigningKey(secret);
  return globalThis.crypto.subtle.verify(
    "HMAC",
    key,
    base64UrlToBytes(signature),
    encoder.encode(segment),
  );
}

async function importSigningKey(secret: string) {
  return globalThis.crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function signPayloadSegment(segment: string, secret: string) {
  const key = await importSigningKey(secret);
  const signature = await globalThis.crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(segment),
  );
  return bytesToBase64Url(new Uint8Array(signature));
}

export async function createSessionToken(
  payload: AppSessionPayload,
  secret: string,
) {
  const payloadSegment = bytesToBase64Url(
    encoder.encode(JSON.stringify(payload)),
  );
  const signatureSegment = await signPayloadSegment(payloadSegment, secret);
  return `${payloadSegment}.${signatureSegment}`;
}

export async function verifySessionToken(
  token: string,
  secret: string,
): Promise<AppSessionPayload | null> {
  const [payloadSegment, signatureSegment] = token.split(".");
  if (!payloadSegment || !signatureSegment) {
    return null;
  }

  const valid = await verifySignatureSegment(
    payloadSegment,
    signatureSegment,
    secret,
  );
  if (!valid) {
    return null;
  }

  try {
    const payload = JSON.parse(
      decoder.decode(base64UrlToBytes(payloadSegment)),
    ) as AppSessionPayload;

    if (
      typeof payload.id !== "string" ||
      typeof payload.email !== "string" ||
      (payload.role !== "owner" && payload.role !== "operator") ||
      typeof payload.iat !== "number" ||
      typeof payload.exp !== "number"
    ) {
      return null;
    }

    if (payload.exp * 1000 <= Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
