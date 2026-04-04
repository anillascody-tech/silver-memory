import { describe, expect, it } from "vitest";
import { buildReport } from "../src/core/ai/reportBuilder";
import type { Aggregates } from "../src/shared/types/aggregates";

const aggregates: Aggregates = {
  salary: { meanK: 28, medianK: 27, p25K: 22, p75K: 35, sampleCount: 30 },
  expDistribution: [{ key: "3-5年", count: 12, ratio: 0.4 }],
  degreeDistribution: [{ key: "本科", count: 22, ratio: 0.73 }],
  companySizeDistribution: [{ key: "1000-9999人", count: 10, ratio: 0.33 }],
  fundingStageDistribution: [{ key: "B轮", count: 8, ratio: 0.27 }],
  skillsTop: [{ skill: "Java", count: 25 }],
  skillCombosTop: [{ pair: "Java + Spring Boot", count: 10 }],
  jdhs: {
    score: 79,
    factors: {
      salaryCompetitiveness: 82,
      barrierFriendliness: 75,
      techModernity: 80,
      companyStability: 78
    },
    explanation: ["薪资竞争力: 82", "门槛友好度: 75", "技术现代度: 80", "公司稳定性: 78"]
  }
};

describe("buildReport", () => {
  it("contains sections and metrics", () => {
    const report = buildReport({ city: "上海", keyword: "Java后端" }, aggregates);

    expect(report).toContain("岗位洞察报告");
    expect(report).toContain("薪资概览");
    expect(report).toContain("JDHS");
    expect(report).toContain("27K");
  });
});
