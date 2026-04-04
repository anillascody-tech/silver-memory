export interface SalaryAggregate {
  meanK: number | null;
  medianK: number | null;
  p25K: number | null;
  p75K: number | null;
  sampleCount: number;
}

export interface DistributionItem {
  key: string;
  count: number;
  ratio: number;
}

export interface SkillFrequency {
  skill: string;
  count: number;
}

export interface SkillCombo {
  pair: string;
  count: number;
}

export interface JdhsAggregate {
  score: number;
  factors: {
    salaryCompetitiveness: number;
    barrierFriendliness: number;
    techModernity: number;
    companyStability: number;
  };
  explanation: string[];
}

export interface Aggregates {
  salary: SalaryAggregate;
  expDistribution: DistributionItem[];
  degreeDistribution: DistributionItem[];
  companySizeDistribution: DistributionItem[];
  fundingStageDistribution: DistributionItem[];
  skillsTop: SkillFrequency[];
  skillCombosTop: SkillCombo[];
  jdhs: JdhsAggregate;
}
