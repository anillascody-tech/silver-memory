import type { RawJob, NormalizedJob, FieldState, SkillMatch, SkillHitSource } from "../../shared/types/jobs";
import {
  COMPANY_SIZE_PATTERNS,
  DEGREE_KEYWORDS,
  EXP_KEYWORDS,
  FUNDING_STAGE_KEYWORDS,
  SKILL_DICTIONARY
} from "./normalizerDictionaries";

function pickField<T>(value: T | null): FieldState<T> {
  if (value === null) {
    return { value: null, source: "missing" };
  }

  return { value, source: "parsed" };
}

function parseSalary(salaryText: string): {
  salaryMinK: FieldState<number>;
  salaryMaxK: FieldState<number>;
  salaryMonths: FieldState<number>;
} {
  const sanitized = salaryText.replace(/\s+/g, "");
  const salaryRangeMatch = sanitized.match(/(\d+)-(\d+)[kK]/);
  const salaryMonthsMatch = sanitized.match(/·(\d+)薪/);

  return {
    salaryMinK: pickField(salaryRangeMatch ? Number(salaryRangeMatch[1]) : null),
    salaryMaxK: pickField(salaryRangeMatch ? Number(salaryRangeMatch[2]) : null),
    salaryMonths: pickField(salaryMonthsMatch ? Number(salaryMonthsMatch[1]) : null)
  };
}

function parseDegree(tags: string[]): FieldState<string> {
  const degree = tags.find((tag) => DEGREE_KEYWORDS.some((keyword) => tag.includes(keyword))) ?? null;
  return pickField(degree);
}

function parseExpLevel(tags: string[]): FieldState<string> {
  const exp = tags.find((tag) => EXP_KEYWORDS.some((keyword) => tag.includes(keyword))) ?? null;
  return pickField(exp);
}

function parseCompanyMeta(companyMeta: string): { companySize: FieldState<string>; fundingStage: FieldState<string> } {
  const tokens = companyMeta
    .split(/[·|]/)
    .map((token) => token.trim())
    .filter(Boolean);

  const size = tokens.find((token) => COMPANY_SIZE_PATTERNS.some((pattern) => pattern.test(token))) ?? null;
  const funding = tokens.find((token) => FUNDING_STAGE_KEYWORDS.some((keyword) => token.includes(keyword))) ?? null;

  return {
    companySize: pickField(size),
    fundingStage: pickField(funding)
  };
}

function parseSkills(raw: RawJob): { skills: string[]; skillMatches: SkillMatch[] } {
  const fields: Array<{ key: SkillHitSource; text: string }> = [
    { key: "title", text: raw.title },
    { key: "salaryText", text: raw.salaryText },
    { key: "companyMeta", text: raw.companyMeta },
    ...raw.tags.map((tag) => ({ key: "tags" as SkillHitSource, text: tag }))
  ];

  const seen = new Set<string>();
  const skillMatches: SkillMatch[] = [];

  for (const skill of SKILL_DICTIONARY) {
    const lc = skill.toLowerCase();
    for (const field of fields) {
      if (field.text.toLowerCase().includes(lc) && !seen.has(skill)) {
        seen.add(skill);
        skillMatches.push({ skill, hitSource: field.key });
        break;
      }
    }
  }

  return { skills: skillMatches.map((m) => m.skill), skillMatches };
}

function normalizeJob(raw: RawJob): NormalizedJob {
  const salary = parseSalary(raw.salaryText);
  const degree = parseDegree(raw.tags);
  const expLevel = parseExpLevel(raw.tags);
  const companyMeta = parseCompanyMeta(raw.companyMeta);
  const { skills, skillMatches } = parseSkills(raw);

  return {
    id: raw.id,
    title: pickField(raw.title || null),
    city: pickField(raw.locationText || null),
    salaryMinK: salary.salaryMinK,
    salaryMaxK: salary.salaryMaxK,
    salaryMonths: salary.salaryMonths,
    expLevel,
    degree,
    companySize: companyMeta.companySize,
    fundingStage: companyMeta.fundingStage,
    skills: {
      value: skills.length > 0 ? skills : null,
      source: skills.length > 0 ? "parsed" : "missing"
    },
    skillMatches
  };
}

export function normalizeJobs(rawJobs: RawJob[]): NormalizedJob[] {
  return rawJobs.map((raw) => normalizeJob(raw));
}
