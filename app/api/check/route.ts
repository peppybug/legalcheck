import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { COUNTRY_CODES } from "@/lib/countries";
import { runCheck, CheckError } from "@/lib/check";
import { cacheKey, getCached, setCached, rateLimited } from "@/lib/store";

export const maxDuration = 120;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const activity = typeof body?.activity === "string" ? body.activity.trim() : "";
  const country = typeof body?.country === "string" ? body.country.toUpperCase() : "";

  if (activity.length < 3 || activity.length > 200) {
    return NextResponse.json({ error: "Describe the activity in 3 to 200 characters." }, { status: 400 });
  }
  if (!COUNTRY_CODES.has(country)) {
    return NextResponse.json({ error: "Pick a country from the list." }, { status: 400 });
  }

  const key = cacheKey(activity, country);
  const cached = getCached(key);
  if (cached) return NextResponse.json({ ...cached, cached: true });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "local";
  if (rateLimited(ip)) {
    return NextResponse.json({ error: "Too many checks. Try again in an hour." }, { status: 429 });
  }

  try {
    const result = await runCheck(activity, country);
    setCached(key, result);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof CheckError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: "We're busy right now. Try again in a minute." }, { status: 503 });
    }
    if (err instanceof Anthropic.AuthenticationError) {
      console.error("Anthropic auth failed: check ANTHROPIC_API_KEY");
    } else {
      console.error(err);
    }
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
