import { describe, expect, it } from "vitest";
import { buildAnalysisPrompt } from "../src/core/ai/promptBuilder";
import type { Aggregates } from "../src/shared/types/aggregates";
import type { NormalizedJob, RawJob } from "../src/shared/types/jobs";

const aggregates: Aggregates = {
  salary: { meanK: 22, medianK: 21, p25K: 18, p75K: 25, sampleCount: 2 },
  expDistribution: [{ key: "3-5年", count: 1, ratio: 0.5 }],
  degreeDistribution: [{ key: "本科", count: 2, ratio: 1 }],
  companySizeDistribution: [{ key: "1000-9999人", count: 1, ratio: 0.5 }],
  fundingStageDistribution: [{ key: "B轮", count: 1, ratio: 0.5 }],
  skillsTop: [{ skill: "Java", count: 2 }],
  skillCombosTop: [{ pair: "Java + Spring Boot", count: 1 }],
  jdhs: {
    score: 75,
    factors: {
      salaryCompetitiveness: 70,
      barrierFriendliness: 80,
      techModernity: 78,
      companyStability: 72
    },
    explanation: ["薪资竞争力: 70", "门槛友好度: 80", "技术现代度: 78", "公司稳定性: 72"]
  }
};

const normalizedJobs: NormalizedJob[] = [];
const rawJobs: RawJob[] = [
  {
    id: "job_1",
    title: "Java后端开发",
    salaryText: "20-30K·14薪",
    tags: ["3-5年", "本科"],
    companyName: "某科技",
    companyMeta: "1000-9999人·B轮",
    locationText: "上海",
    sourceUrl: "https://www.zhipin.com/web/geek/job"
  }
];

describe("buildAnalysisPrompt", () => {
  it("contains required sections and payload", () => {
    const prompt = buildAnalysisPrompt({
      question: "帮我分析上海 Java 后端岗位趋势",
      queryContext: { city: "上海", keyword: "Java后端" },
      aggregates,
      normalizedJobs,
      rawJobs
    });

    expect(prompt).toContain("结论摘要");
    expect(prompt).toContain("聚合指标");
    expect(prompt).toContain("Job#");
    expect(prompt).toContain("上海");
  });
});
