import Anthropic from "@anthropic-ai/sdk";
import type { z } from "zod";

const MODEL = "claude-opus-5-5";

// Created on first use. Node scripts read ANTHROPIC_API_KEY from the environment;
// the Cloudflare Worker passes its secret in with setApiKey().
let client: Anthropic | null = null;
export function setApiKey(apiKey: string) {
  client = new Anthropic({ apiKey });
}
const getClient = () => (client ??= new Anthropic());

export class ResearchError extends Error {}

/**
 * Lets Claude search the web, then forces the result through a strict tool so it comes back as validated JSON.
 * Shared by the legality answers and the country law-source research.
 */
export async function research<S extends z.ZodTypeAny>(opts: {
  system: string;
  prompt: string;
  tool: Anthropic.Beta.BetaTool;
  schema: S;
  maxSearches?: number;
}): Promise<{ data: z.infer<S>; sources: { title: string; url: string }[] }> {
  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: opts.prompt }];
  const sources = new Map<string, string>();

  // Web search runs server-side; a long search can come back as pause_turn and needs a resume.
  for (let turn = 0; turn < 4; turn++) {
    const response = await getClient().beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium" },
      system: opts.system,
      tools: [{ type: "web_search_20260209", name: "web_search", max_uses: opts.maxSearches ?? 6 }, opts.tool],
      tool_choice: { type: "auto" },
      messages,
    });

    for (const block of response.content) {
      if (block.type === "web_search_tool_result" && Array.isArray(block.content)) {
        for (const r of block.content) sources.set(r.url, r.title);
      }
    }

    if (response.stop_reason === "refusal") throw new ResearchError("Claude declined this request.");

    const call = response.content.find(
      (b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use" && b.name === opts.tool.name,
    );
    if (call) {
      const parsed = opts.schema.safeParse(call.input);
      if (!parsed.success) throw new ResearchError(`Malformed ${opts.tool.name} input: ${parsed.error.message}`);
      return { data: parsed.data, sources: [...sources].slice(0, 8).map(([url, title]) => ({ url, title })) };
    }

    messages.push({ role: "assistant", content: response.content });
    if (response.stop_reason !== "pause_turn") {
      messages.push({ role: "user", content: `Please call ${opts.tool.name} with your answer now.` });
    }
  }

  throw new ResearchError("Research did not finish.");
}
