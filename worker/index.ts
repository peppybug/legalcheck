/**
 * Legalcheck lookup service (Cloudflare Worker).
 * POST /check {activity, country} → a freshly researched answer, marked live (not reviewed by a person).
 * Answers are cached for 30 days per data centre, and each visitor gets a limited number of new lookups.
 */
import Anthropic from "@anthropic-ai/sdk";
import { runCheck } from "../lib/check";
import { setApiKey, ResearchError } from "../lib/research";
import { COUNTRY_CODES } from "../lib/countries";
import { normalize } from "../lib/match";

interface Env {
  ANTHROPIC_API_KEY: string;
  ALLOWED_ORIGINS: string;
  LIMITER: { limit(opts: { key: string }): Promise<{ success: boolean }> };
}

const CACHE_SECONDS = 30 * 24 * 60 * 60;

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const origin = request.headers.get("Origin") ?? "";
    const allowed = env.ALLOWED_ORIGINS.split(",").map((o) => o.trim());
    const cors: Record<string, string> = {
      "Access-Control-Allow-Origin": allowed.includes(origin) ? origin : allowed[0],
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      Vary: "Origin",
    };
    const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
      new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...cors, ...extra } });

    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (url.pathname === "/" && request.method === "GET") return json({ ok: true });
    if (url.pathname !== "/check" || request.method !== "POST") return json({ error: "Not found" }, 404);
    if (!allowed.includes(origin)) return json({ error: "Not allowed" }, 403);

    const body = (await request.json().catch(() => null)) as { activity?: unknown; country?: unknown } | null;
    const activity = typeof body?.activity === "string" ? body.activity.trim() : "";
    const country = typeof body?.country === "string" ? body.country.toUpperCase() : "";
    if (activity.length < 3 || activity.length > 200) return json({ error: "Describe the activity in 3 to 200 characters." }, 400);
    if (!COUNTRY_CODES.has(country)) return json({ error: "Pick a country from the list." }, 400);

    // Same question, same country → serve the cached answer.
    const cache = caches.default;
    const cacheKey = new Request(`https://cache.legalcheck/check/${country}/${encodeURIComponent(normalize(activity))}`);
    const hit = await cache.match(cacheKey);
    if (hit) return json(await hit.json());

    const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
    const { success } = await env.LIMITER.limit({ key: ip });
    if (!success) return json({ error: "Too many new questions at once. Wait a minute and try again." }, 429, { "Retry-After": "60" });

    try {
      setApiKey(env.ANTHROPIC_API_KEY);
      const result = { ...(await runCheck(activity, country)), live: true };
      ctx.waitUntil(
        cache.put(
          cacheKey,
          new Response(JSON.stringify(result), { headers: { "Cache-Control": `public, max-age=${CACHE_SECONDS}` } }),
        ),
      );
      return json(result);
    } catch (err) {
      console.error(err);
      if (err instanceof ResearchError) return json({ error: "We couldn’t research this one. Try rephrasing it." }, 422);
      // Say which setup problem it is (never echo keys or upstream messages to visitors).
      if (err instanceof Anthropic.AuthenticationError) return json({ error: "The service isn’t set up correctly.", code: "api_key_invalid" }, 503);
      if (err instanceof Anthropic.PermissionDeniedError) return json({ error: "The service isn’t set up correctly.", code: "api_permission" }, 503);
      if (err instanceof Anthropic.RateLimitError) return json({ error: "We’re busy right now. Try again in a minute.", code: "rate_limited" }, 503);
      if (err instanceof Anthropic.BadRequestError && /credit|billing|balance/i.test(err.message))
        return json({ error: "The service is temporarily unavailable.", code: "out_of_credit" }, 503);
      if (err instanceof Anthropic.APIError) return json({ error: "Something went wrong. Please try again in a minute.", code: `api_${err.status}` }, 502);
      return json({ error: "Something went wrong. Please try again in a minute." }, 502);
    }
  },
};
