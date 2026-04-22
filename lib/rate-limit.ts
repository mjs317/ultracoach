/**
 * Lightweight rate limit. Uses Upstash REST if configured, otherwise
 * falls back to an in-process token bucket (good enough for a single instance).
 *
 * Window size and max are per-key. Returns { ok, remaining, resetMs }.
 */

type Bucket = { tokens: number; resetAt: number };
const mem = new Map<string, Bucket>();

export async function rateLimit(key: string, max = 5, windowSec = 3600) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    return upstashLimit(url, token, key, max, windowSec);
  }
  return memLimit(key, max, windowSec);
}

function memLimit(key: string, max: number, windowSec: number) {
  const now = Date.now();
  const b = mem.get(key);
  if (!b || b.resetAt < now) {
    const reset = now + windowSec * 1000;
    mem.set(key, { tokens: max - 1, resetAt: reset });
    return { ok: true, remaining: max - 1, resetMs: reset };
  }
  if (b.tokens <= 0) return { ok: false, remaining: 0, resetMs: b.resetAt };
  b.tokens -= 1;
  return { ok: true, remaining: b.tokens, resetMs: b.resetAt };
}

async function upstashLimit(
  url: string,
  token: string,
  key: string,
  max: number,
  windowSec: number
) {
  const k = `rl:${key}`;
  const incr = await fetch(`${url}/incr/${k}`, {
    headers: { authorization: `Bearer ${token}` },
  }).then((r) => r.json());
  const count = (incr as { result: number }).result;
  if (count === 1) {
    await fetch(`${url}/expire/${k}/${windowSec}`, {
      headers: { authorization: `Bearer ${token}` },
    });
  }
  return {
    ok: count <= max,
    remaining: Math.max(0, max - count),
    resetMs: Date.now() + windowSec * 1000,
  };
}
