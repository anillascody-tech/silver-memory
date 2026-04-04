import type { Aggregates } from "./aggregates";
import type { ErrorCode } from "../constants/errorCodes";

export type PageType = "job_list" | "non_target";

export interface RawJob {
  id: string;
  title: string;
  salaryText: string;
  tags: string[];
  companyName: string;
  companyMeta: string;
  locationText: string;
  sourceUrl: string;
}

export type FieldSource = "parsed" | "missing";

/** 技能命中的来源字段，用于"可解释"追溯 */
export type SkillHitSource = "title" | "salaryText" | "companyMeta" | "tags";

export interface FieldState<T> {
  value: T | null;
  source: FieldSource;
}

export interface SkillMatch {
  skill: string;
  hitSource: SkillHitSource;
}

export interface NormalizedJob {
  id: string;
  title: FieldState<string>;
  city: FieldState<string>;
  salaryMinK: FieldState<number>;
  salaryMaxK: FieldState<number>;
  salaryMonths: FieldState<number>;
  expLevel: FieldState<string>;
  degree: FieldState<string>;
  companySize: FieldState<string>;
  fundingStage: FieldState<string>;
  skills: FieldState<string[]>;
  /** 技能命中来源（可解释），与 skills.value 一一对应 */
  skillMatches: SkillMatch[];
}

export interface QueryContext {
  city?: string;
  keyword?: string;
}

export interface CollectSuccess {
  ok: true;
  pageType: PageType;
  isLoggedIn: boolean;
  rawJobs: RawJob[];
  normalizedJobs: NormalizedJob[];
  aggregates: Aggregates;
  queryContext: QueryContext;
}

export interface CollectFailure {
  ok: false;
  pageType: PageType;
  isLoggedIn: boolean;
  errorCode: ErrorCode;
  message: string;
}

export type CollectResponse = CollectSuccess | CollectFailure;
