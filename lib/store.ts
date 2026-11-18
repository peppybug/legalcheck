import type { CheckResult } from "./verdict";

// In-memory cache and rate limiter. Fine for one server; swap for Redis/Postgres in production.
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // laws don't change daily; refresh monthly
const cache = new Map<string, { at: number; result: CheckResult }>();

export function cacheKey(activity: string, country: string) {
  return `${country}:${activity.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim()}`;
}

export function getCached(key: string) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > TTL_MS) {
    cache.delete(key);
    return null;
  }
  return hit.result;
}

export function setCached(key: string, result: CheckResult) {
  cache.set(key, { at: Date.now(), result });
}

const hits = new Map<string, number[]>();
const WINDOW_MS = 60 * 60 * 1000;
const LIMIT = 20; // fresh lookups per IP per hour

export function rateLimited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= LIMIT) return true;
  recent.push(now);
  hits.set(ip, recent);
  return false;
}
