import type { Aggregates } from "../../shared/types/aggregates";
import type { NormalizedJob, QueryContext, RawJob } from "../../shared/types/jobs";

export interface AiQuestionPayload {
  question: string;
  queryContext: QueryContext;
  aggregates: Aggregates;
  normalizedJobs: NormalizedJob[];
  rawJobs: RawJob[];
}

function maskCompanyName(name: string): string {
  if (name.length <= 2) return "***";
  // 保留最后两个字（常为行业后缀如"科技"/"互联网"），前面替换为星号
  return "***" + name.slice(-2);
}

function pickRepresentativeSamples(rawJobs: RawJob[], limit = 5): RawJob[] {
  return rawJobs.slice(0, limit);
}

export function buildAnalysisPrompt(payload: AiQuestionPayload): string {
  const samples = pickRepresentativeSamples(payload.rawJobs).map((job) => ({
    id: job.id,
    title: job.title,
    salary: job.salaryText,
    company: maskCompanyName(job.companyName), // 脱敏公司名，不上传原始名称
    tags: job.tags
  }));

  return [
    "你是一名招聘市场分析助手。",
    "你必须仅基于我给出的结构化数据与样本回答，不得捏造不存在的事实。",
    "当数据不足时，要明确写出【数据不足】。",
    "回答格式必须包含：",
    "1) 结论摘要（3-5条）",
    "2) 关键数据依据（引用具体指标）",
    "3) 技能要求洞察（Top技能、技能组合）",
    "4) 风险与偏差提示",
    "5) 样本引用（使用 Job# 编号）",
    "",
    `用户问题: ${payload.question}`,
    `查询上下文: ${JSON.stringify(payload.queryContext, null, 2)}`,
    `聚合指标: ${JSON.stringify(payload.aggregates, null, 2)}`,
    `样本职位: ${JSON.stringify(samples, null, 2)}`
  ].join("\n");
}
