import "server-only";

type Bucket = {
  count: number;
  resetAt: number;
};

const requestBuckets = new Map<string, Bucket>();
const statusBuckets = new Map<string, Bucket>();
const actionBuckets = new Map<string, Bucket>();

function takeFromBucket(
  store: Map<string, Bucket>,
  key: string,
  limit: number,
  windowMs: number,
) {
  const now = Date.now();
  const existing = store.get(key);

  if (!existing || existing.resetAt <= now) {
    const next = {
      count: 1,
      resetAt: now + windowMs,
    };
    store.set(key, next);
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  store.set(key, existing);
  return { allowed: true, retryAfterSeconds: 0 };
}

export function consumePairingRequestAttempt(key: string) {
  return takeFromBucket(requestBuckets, key, 10, 10 * 60 * 1000);
}

export function consumePairingStatusAttempt(key: string) {
  return takeFromBucket(statusBuckets, key, 120, 10 * 60 * 1000);
}

export function consumeOperatorActionAttempt(key: string) {
  return takeFromBucket(actionBuckets, key, 180, 60 * 1000);
}
