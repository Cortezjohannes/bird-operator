import "server-only";

import crypto from "node:crypto";

function timingSafeEqual(left: string, right: string) {
  const leftBytes = Buffer.from(left, "base64url");
  const rightBytes = Buffer.from(right, "base64url");

  if (leftBytes.length !== rightBytes.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBytes, rightBytes);
}

export async function verifyPasswordHash(password: string, encodedHash: string) {
  const [scheme, salt, expected] = encodedHash.split("$");
  if (scheme !== "scrypt" || !salt || !expected) {
    return false;
  }

  const derivedKey = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (error, key) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(key as Buffer);
    });
  });

  return timingSafeEqual(derivedKey.toString("base64url"), expected);
}
