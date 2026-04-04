import type { FieldState, NormalizedJob } from "../../shared/types/jobs";

import type { Aggregates, DistributionItem, JdhsAggregate, SalaryAggregate, SkillCombo, SkillFrequency } from "../../shared/types/aggregates";

function round(value: number): number {
  return Number(value.toFixed(2));
}

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) {
    return 0;
  }

  const position = (sorted.length - 1) * q;
  const base = Math.floor(position);
  const rest = position - base;

  if (sorted[base + 1] === undefined) {
    return sorted[base];
  }

  return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
}

function valueOf<T>(field: FieldState<T>): T | null {
  return field.value;
}

function collectSalaryPoints(jobs: NormalizedJob[]): number[] {
  return jobs
    .map((job) => {
      const min = valueOf(job.salaryMinK);
      const max = valueOf(job.salaryMaxK);
      if (min === null || max === null) {
        return null;
      }

      return (min + max) / 2;
    })
    .filter((value): value is number => value !== null)
    .sort((a, b) => a - b);
}

function aggregateSalary(jobs: NormalizedJob[]): SalaryAggregate {
  const points = collectSalaryPoints(jobs);
  if (points.length === 0) {
    return {
      meanK: null,
      medianK: null,
      p25K: null,
      p75K: null,
      sampleCount: 0
    };
  }

  const sum = points.reduce((acc, value) => acc + value, 0);
  return {
    meanK: round(sum / points.length),
    medianK: round(quantile(points, 0.5)),
    p25K: round(quantile(points, 0.25)),
    p75K: round(quantile(points, 0.75)),
    sampleCount: points.length
  };
}

function aggregateDistribution(
  jobs: NormalizedJob[],
  selector: (job: NormalizedJob) => FieldState<string>
): DistributionItem[] {
  const counts = new Map<string, number>();
  let total = 0;

  jobs.forEach((job) => {
    const value = selector(job).value;
    if (!value) {
      return;
    }

    counts.set(value, (counts.get(value) ?? 0) + 1);
    total += 1;
  });

  return Array.from(counts.entries())
    .map(([key, count]) => ({ key, count, ratio: total > 0 ? round(count / total) : 0 }))
    .sort((a, b) => b.count - a.count);
}

function aggregateSkillFrequency(jobs: NormalizedJob[]): SkillFrequency[] {
  const counts = new Map<string, number>();
  jobs.forEach((job) => {
    const skills = job.skills.value ?? [];
    const dedup = Array.from(new Set(skills));
    dedup.forEach((skill) => {
      counts.set(skill, (counts.get(skill) ?? 0) + 1);
    });
  });

  return Array.from(counts.entries())
    .map(([skill, count]) => ({ skill, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

function aggregateSkillCombos(jobs: NormalizedJob[]): SkillCombo[] {
  const combos = new Map<string, number>();

  jobs.forEach((job) => {
    const skills = Array.from(new Set(job.skills.value ?? [])).sort();
    for (let i = 0; i < skills.length; i += 1) {
      for (let j = i + 1; j < skills.length; j += 1) {
        const pair = `${skills[i]} + ${skills[j]}`;
        combos.set(pair, (combos.get(pair) ?? 0) + 1);
      }
    }
  });

  return Array.from(combos.entries())
    .map(([pair, count]) => ({ pair, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

function scoreBySalary(salary: SalaryAggregate): number {
  if (salary.medianK === null) {
    return 50;
  }

  const normalized = Math.min(1, Math.max(0, (salary.medianK - 10) / 30));
  return round(normalized * 100);
}

function scoreByBarrier(jobs: NormalizedJob[]): number {
  const expHighPenalty = jobs.reduce((acc, job) => {
    const exp = job.expLevel.value ?? "";
    if (exp.includes("5") || exp.includes("10")) {
      return acc + 1;
    }

    return acc;
  }, 0);

  const degreeHighPenalty = jobs.reduce((acc, job) => {
    const degree = job.degree.value ?? "";
    if (degree.includes("硕士") || degree.includes("博士")) {
      return acc + 1;
    }

    return acc;
  }, 0);

  const total = jobs.length || 1;
  const penalty = (expHighPenalty + degreeHighPenalty) / (2 * total);
  return round((1 - penalty) * 100);
}

function scoreByTech(skillsTop: SkillFrequency[]): number {
  const modernSkills = ["Spring Boot", "Spring Cloud", "Docker", "Kubernetes", "Kafka", "微服务"];
  const hitCount = skillsTop.reduce((acc, item) => (modernSkills.includes(item.skill) ? acc + item.count : acc), 0);
  const total = skillsTop.reduce((acc, item) => acc + item.count, 0);
  if (total === 0) {
    return 50;
  }

  return round((hitCount / total) * 100);
}

function scoreByCompanyStability(
  sizeDistribution: DistributionItem[],
  fundingDistribution: DistributionItem[]
): number {
  const stableSizeKeys = ["100-499人", "500-999人", "1000-9999人", "10000人以上"];
  const stableFundingKeys = ["B轮", "C轮", "D轮及以上", "已上市"];

  const sizeScore = sizeDistribution.reduce(
    (acc, item) => (stableSizeKeys.includes(item.key) ? acc + item.ratio : acc),
    0
  );
  const fundingScore = fundingDistribution.reduce(
    (acc, item) => (stableFundingKeys.includes(item.key) ? acc + item.ratio : acc),
    0
  );

  return round(((sizeScore + fundingScore) / 2) * 100);
}

function buildJdhs(
  salary: SalaryAggregate,
  jobs: NormalizedJob[],
  skillsTop: SkillFrequency[],
  sizeDistribution: DistributionItem[],
  fundingDistribution: DistributionItem[]
): JdhsAggregate {
  const salaryCompetitiveness = scoreBySalary(salary);
  const barrierFriendliness = scoreByBarrier(jobs);
  const techModernity = scoreByTech(skillsTop);
  const companyStability = scoreByCompanyStability(sizeDistribution, fundingDistribution);

  const score = round(
    salaryCompetitiveness * 0.4 + barrierFriendliness * 0.2 + techModernity * 0.2 + companyStability * 0.2
  );

  return {
    score,
    factors: {
      salaryCompetitiveness,
      barrierFriendliness,
      techModernity,
      companyStability
    },
    explanation: [
      `薪资竞争力: ${salaryCompetitiveness}`,
      `门槛友好度: ${barrierFriendliness}`,
      `技术现代度: ${techModernity}`,
      `公司稳定性: ${companyStability}`
    ]
  };
}

export function aggregateJobs(normalizedJobs: NormalizedJob[]): Aggregates {
  const salary = aggregateSalary(normalizedJobs);
  const expDistribution = aggregateDistribution(normalizedJobs, (job) => job.expLevel);
  const degreeDistribution = aggregateDistribution(normalizedJobs, (job) => job.degree);
  const companySizeDistribution = aggregateDistribution(normalizedJobs, (job) => job.companySize);
  const fundingStageDistribution = aggregateDistribution(normalizedJobs, (job) => job.fundingStage);
  const skillsTop = aggregateSkillFrequency(normalizedJobs);
  const skillCombosTop = aggregateSkillCombos(normalizedJobs);
  const jdhs = buildJdhs(salary, normalizedJobs, skillsTop, companySizeDistribution, fundingStageDistribution);

  return {
    salary,
    expDistribution,
    degreeDistribution,
    companySizeDistribution,
    fundingStageDistribution,
    skillsTop,
    skillCombosTop,
    jdhs
  };
}
