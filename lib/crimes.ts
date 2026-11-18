import type { CheckResult } from "./verdict";
import { normalize } from "./match";
import { inCountry } from "./countries";

/**
 * Serious crimes that are criminal offences in every country. These get an instant, general "Illegal" answer
 * even when the country hasn't been researched yet. Only add acts that are illegal everywhere without
 * meaningful exceptions for ordinary people.
 */
type Crime = { name: string; patterns: RegExp[]; note?: string };

const PERSON = "(someone|somebody|a person|people|a human|humans|a man|a woman|a child|children|my \\w+|another person)";

export const CRIMES: Crime[] = [
  {
    name: "Murder",
    patterns: [/\b(murder\w*|homicide|manslaughter|assassinat\w*)\b/, new RegExp(`\\bkill\\w*\\s+${PERSON}`)],
    note: "Using force in genuine self-defence can be lawful in narrow circumstances, which courts decide case by case.",
  },
  { name: "Theft", patterns: [/\b(theft|steal\w*|stole|stolen|shoplift\w*|pickpocket\w*)\b/] },
  { name: "Robbery", patterns: [/\b(robbery|robbing|rob|mugging|mug someone|armed robbery)\b/] },
  { name: "Burglary", patterns: [/\b(burglary|burgle\w*|break\w* into (a|someone s|somebody s) (house|home|car|flat|apartment))\b/] },
  {
    name: "Assault",
    patterns: [/\bassault\w*\b/, new RegExp(`\\b(hit|hitting|punch\\w*|beat\\w*|attack\\w*|stab\\w*)\\s+${PERSON}`)],
    note: "Using reasonable force in genuine self-defence can be lawful in narrow circumstances.",
  },
  { name: "Rape and sexual assault", patterns: [/\b(rape|raping|sexual assault|sexually assault\w*|sexual abuse)\b/] },
  { name: "Kidnapping", patterns: [/\b(kidnap\w*|abduct\w*|hostage)\b/] },
  { name: "Arson", patterns: [/\b(arson|set\w* fire to (a|someone s|somebody s|my neighbou?r s) (house|home|building|car))\b/] },
  { name: "Fraud", patterns: [/\b(fraud\w*|scam\w* people|scamming|embezzl\w*|identity theft)\b/] },
  { name: "Human trafficking", patterns: [/\b(human trafficking|trafficking (people|humans|women|children)|slavery|forced labou?r)\b/] },
  { name: "Child sexual abuse", patterns: [/\b(child (sexual )?abuse|child pornography|csam)\b/] },
  { name: "Bribery", patterns: [/\b(brib\w*)\b/] },
  { name: "Extortion and blackmail", patterns: [/\b(extort\w*|blackmail\w*)\b/] },
  { name: "Counterfeiting money", patterns: [/\b(counterfeit\w*|fake money|forg\w* (money|banknotes|notes|a passport|documents))\b/] },
  {
    name: "Drunk driving",
    patterns: [/\b(drunk driving|drink driving|driving (while )?drunk|drive drunk|driving under the influence|dui|dwi)\b/],
    note: "Every country sets a legal limit or bans driving after drinking entirely; the exact limit differs.",
  },
  { name: "Drug trafficking", patterns: [/\b(drug trafficking|trafficking drugs|smuggl\w* drugs|dealing (hard )?drugs|selling (cocaine|heroin|meth\w*))\b/] },
  { name: "Torture", patterns: [/\btortur\w*\b/] },
  { name: "Terrorism", patterns: [/\b(terroris\w*|bomb\w* (a|someone|people|the))\b/] },
];

export function findCrime(activity: string): Crime | null {
  const q = normalize(activity);
  return CRIMES.find((c) => c.patterns.some((p) => p.test(q))) ?? null;
}

/** A general answer for a serious crime, shown when the country's specific law hasn't been researched yet. */
export function crimeAnswer(crime: Crime, activity: string, country: string): CheckResult {
  const where = inCountry(country);
  return {
    verdict: "illegal",
    headline: `No. ${crime.name} is a crime in ${where}, as it is in every country.`,
    summary:
      `${crime.name} is a criminal offence everywhere in the world, and ${where} is no exception. ` +
      `The exact definition and penalties are set by the criminal law of ${where}.` +
      (crime.note ? ` ${crime.note}` : ""),
    conditions: [],
    penalties: "Usually a prison sentence. The exact penalty depends on the circumstances and on the law of the country or region.",
    regional_variation: "",
    laws: [],
    confidence: "high",
    country,
    activity,
    checkedAt: new Date().toISOString(),
    sources: [],
    general: true,
  };
}
