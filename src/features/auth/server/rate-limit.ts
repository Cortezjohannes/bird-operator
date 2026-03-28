import "server-only";

interface BucketState {
  count: number;
  resetAt: number;
}

const loginBuckets = new Map<string, BucketState>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function getBucket(key: string) {
  const current = loginBuckets.get(key);
  const now = Date.now();

  if (!current || current.resetAt <= now) {
    const bucket = {
      count: 0,
      resetAt: now + WINDOW_MS,
    };
    loginBuckets.set(key, bucket);
    return bucket;
  }

  return current;
}

export function consumeLoginAttempt(key: string) {
  const bucket = getBucket(key);
  bucket.count += 1;

  return {
    allowed: bucket.count <= MAX_ATTEMPTS,
    retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - Date.now()) / 1000)),
  };
}

export function resetLoginAttempts(key: string) {
  loginBuckets.delete(key);
}
