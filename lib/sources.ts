import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { countryName } from "./countries";
import { research } from "./research";

export const CountrySourcesSchema = z.object({
  legal_system: z.string(),
  official_languages: z.array(z.string()),
  portals: z.array(z.object({ name: z.string(), url: z.string(), description: z.string() })),
  gazette_name: z.string(),
  gazette_url: z.string(),
  constitution_name: z.string(),
  constitution_url: z.string(),
  regional_law_note: z.string(),
  confidence: z.enum(["high", "medium", "low"]),
});

export type CountrySources = z.infer<typeof CountrySourcesSchema> & {
  country: string;
  checkedAt: string;
  sources: { title: string; url: string }[];
};

const SYSTEM = `You build the law-source directory for Legalcheck.app. For one country, find where its law is officially published online.

Find, using web search:
- portals: the official government websites where the country's legislation can be read (national legislation database, codes, consolidated acts). Include the main portal first, then at most three others (for example a separate portal for regulations, or the official English translation if one exists). Only government, parliament or official publisher sites; no commercial databases, law firms or Wikipedia. Each with a one-sentence description of what it contains and its language.
- gazette: the official gazette where new laws are published, with its URL.
- constitution: the name of the current constitution (or basic laws) and an official URL for its text.
- legal_system: e.g. "Civil law", "Common law", "Mixed: civil law and customary law", "Islamic law and civil law".
- official_languages: the languages legislation is published in.
- regional_law_note: one sentence on whether states, provinces or regions make their own laws, or an empty string if not relevant.

Rules: verify every URL by finding it in search results; never guess or construct a URL. Leave a field empty rather than invent it. Set confidence to reflect how sure you are that the URLs are official and current.

When you are done, call submit_country_sources exactly once.`;

const tool: Anthropic.Beta.BetaTool = {
  name: "submit_country_sources",
  description: "Submit the official law sources for the country.",
  strict: true,
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "legal_system",
      "official_languages",
      "portals",
      "gazette_name",
      "gazette_url",
      "constitution_name",
      "constitution_url",
      "regional_law_note",
      "confidence",
    ],
    properties: {
      legal_system: { type: "string" },
      official_languages: { type: "array", items: { type: "string" } },
      portals: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["name", "url", "description"],
          properties: { name: { type: "string" }, url: { type: "string" }, description: { type: "string" } },
        },
      },
      gazette_name: { type: "string" },
      gazette_url: { type: "string" },
      constitution_name: { type: "string" },
      constitution_url: { type: "string" },
      regional_law_note: { type: "string" },
      confidence: { type: "string", enum: ["high", "medium", "low"] },
    },
  },
};

export async function researchCountry(code: string): Promise<CountrySources> {
  const { data, sources } = await research({
    system: SYSTEM,
    prompt: `Country: ${countryName(code)} (${code})\nToday's date: ${new Date().toISOString().slice(0, 10)}`,
    tool,
    schema: CountrySourcesSchema,
    maxSearches: 8,
  });
  return { ...data, country: code, checkedAt: new Date().toISOString(), sources };
}
