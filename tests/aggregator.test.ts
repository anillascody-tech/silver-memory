import { describe, expect, it } from "vitest";
import { aggregateJobs } from "../src/core/analytics/aggregator";
import type { NormalizedJob } from "../src/shared/types/jobs";

function field<T>(value: T | null) {
  return { value, source: value === null ? "missing" : "parsed" } as const;
}

const sampleJobs: NormalizedJob[] = [
  {
    id: "1",
    title: field("Java后端"),
    city: field("上海"),
    salaryMinK: field(20),
    salaryMaxK: field(30),
    salaryMonths: field(14),
    expLevel: field("3-5年"),
    degree: field("本科"),
    companySize: field("1000-9999人"),
    fundingStage: field("B轮"),
    skills: field(["Java", "Spring Boot", "MySQL"])
  },
  {
    id: "2",
    title: field("Java开发"),
    city: field("上海"),
    salaryMinK: field(15),
    salaryMaxK: field(25),
    salaryMonths: field(13),
    expLevel: field("1-3年"),
    degree: field("本科"),
    companySize: field("500-999人"),
    fundingStage: field("已上市"),
    skills: field(["Java", "Redis", "Kafka"])
  },
  {
    id: "3",
    title: field("后端工程师"),
    city: field("上海"),
    salaryMinK: field(null),
    salaryMaxK: field(null),
    salaryMonths: field(null),
    expLevel: field("经验不限"),
    degree: field("大专"),
    companySize: field("100-499人"),
    fundingStage: field("A轮"),
    skills: field(["Java", "Spring Boot", "Docker"])
  }
];

describe("aggregateJobs", () => {
  it("computes salary statistics", () => {
    const aggregates = aggregateJobs(sampleJobs);

    expect(aggregates.salary.sampleCount).toBe(2);
    expect(aggregates.salary.meanK).toBe(22.5);
    expect(aggregates.salary.medianK).toBe(22.5);
    expect(aggregates.salary.p25K).toBe(21.25);
    expect(aggregates.salary.p75K).toBe(23.75);
  });

  it("computes distributions and skills", () => {
    const aggregates = aggregateJobs(sampleJobs);

    expect(aggregates.expDistribution[0].key).toBe("3-5年");
    expect(aggregates.degreeDistribution[0].key).toBe("本科");
    expect(aggregates.skillsTop[0]).toEqual({ skill: "Java", count: 3 });
    expect(aggregates.skillCombosTop.length).toBeGreaterThan(0);
  });

  it("returns jdhs with explanations", () => {
    const aggregates = aggregateJobs(sampleJobs);

    expect(aggregates.jdhs.score).toBeGreaterThanOrEqual(0);
    expect(aggregates.jdhs.score).toBeLessThanOrEqual(100);
    expect(aggregates.jdhs.explanation).toHaveLength(4);
  });
});
