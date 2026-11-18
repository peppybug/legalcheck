import { z } from "zod";

export const VERDICTS = ["legal", "illegal", "restricted", "depends", "unclear"] as const;

export const VerdictSchema = z.object({
  verdict: z.enum(VERDICTS),
  headline: z.string(),
  summary: z.string(),
  conditions: z.array(z.string()),
  penalties: z.string(),
  regional_variation: z.string(),
  laws: z.array(
    z.object({
      name: z.string(),
      section: z.string(),
      year: z.string(),
      url: z.string(),
    }),
  ),
  confidence: z.enum(["high", "medium", "low"]),
});

export type Verdict = z.infer<typeof VerdictSchema>;

export type CheckResult = Verdict & {
  country: string;
  activity: string;
  checkedAt: string;
  sources: { title: string; url: string }[];
  /** Built-in general answer (serious crimes), not researched for this country. */
  general?: boolean;
};
