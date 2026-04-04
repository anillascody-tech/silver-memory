import type { Aggregates } from "../../shared/types/aggregates";
import type { QueryContext } from "../../shared/types/jobs";

function top3(items: Array<{ key: string; count: number }>) {
  return items.slice(0, 3).map((item) => `${item.key}(${item.count})`).join("、") || "暂无";
}

function topSkills(items: Array<{ skill: string; count: number }>) {
  return items.slice(0, 5).map((item) => `${item.skill}(${item.count})`).join("、") || "暂无";
}

export function buildReport(context: QueryContext, aggregates: Aggregates): string {
  return [
    `# 岗位洞察报告`,
    ``,
    `- 城市：${context.city ?? "未知"}`,
    `- 关键词：${context.keyword ?? "未知"}`,
    `- 样本：${aggregates.salary.sampleCount}（有薪资样本）`,
    ``,
    `## 薪资概览`,
    `- 均值：${aggregates.salary.meanK ?? "N/A"}K`,
    `- 中位数：${aggregates.salary.medianK ?? "N/A"}K`,
    `- P25/P75：${aggregates.salary.p25K ?? "N/A"}K / ${aggregates.salary.p75K ?? "N/A"}K`,
    ``,
    `## 结构分布`,
    `- 经验要求Top3：${top3(aggregates.expDistribution)}`,
    `- 学历要求Top3：${top3(aggregates.degreeDistribution)}`,
    `- 公司规模Top3：${top3(aggregates.companySizeDistribution)}`,
    `- 融资阶段Top3：${top3(aggregates.fundingStageDistribution)}`,
    ``,
    `## 技能要求`,
    `- 热门技能Top5：${topSkills(aggregates.skillsTop)}`,
    `- 技能组合Top3：${aggregates.skillCombosTop.slice(0, 3).map((item) => `${item.pair}(${item.count})`).join("、") || "暂无"}`,
    ``,
    `## JDHS`,
    `- 综合得分：${aggregates.jdhs.score}`,
    `- 因子：薪资竞争力 ${aggregates.jdhs.factors.salaryCompetitiveness} / 门槛友好度 ${aggregates.jdhs.factors.barrierFriendliness} / 技术现代度 ${aggregates.jdhs.factors.techModernity} / 公司稳定性 ${aggregates.jdhs.factors.companyStability}`,
    ``,
    `## 风险提示`,
    `- 本报告仅基于当前页面样本，不代表全市场。`,
    `- 若样本量不足，请切换筛选条件后重新采集。`
  ].join("\n");
}
