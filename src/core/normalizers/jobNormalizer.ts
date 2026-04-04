import type { RawJob, NormalizedJob, FieldState } from "../../shared/types/jobs";
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

function parseSkills(raw: RawJob): string[] {
  const corpus = [raw.title, raw.salaryText, raw.companyMeta, ...raw.tags].join(" ").toLowerCase();

  return SKILL_DICTIONARY.filter((skill) => corpus.includes(skill.toLowerCase()));
}

function normalizeJob(raw: RawJob): NormalizedJob {
  const salary = parseSalary(raw.salaryText);
  const degree = parseDegree(raw.tags);
  const expLevel = parseExpLevel(raw.tags);
  const companyMeta = parseCompanyMeta(raw.companyMeta);
  const skills = parseSkills(raw);

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
    }
  };
}

export function normalizeJobs(rawJobs: RawJob[]): NormalizedJob[] {
  return rawJobs.map((raw) => normalizeJob(raw));
}
