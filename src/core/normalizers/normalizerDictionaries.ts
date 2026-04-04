export const DEGREE_KEYWORDS = ["初中及以下", "中专/中技", "高中", "大专", "本科", "硕士", "博士"] as const;

export const EXP_KEYWORDS = ["经验不限", "在校/应届", "1年以内", "1-3年", "3-5年", "5-10年", "10年以上"] as const;

export const COMPANY_SIZE_PATTERNS = [
  /^\d+-\d+人$/,
  /^\d+人以下$/,
  /^\d+人以上$/
] as const;

export const FUNDING_STAGE_KEYWORDS = [
  "未融资",
  "天使轮",
  "A轮",
  "B轮",
  "C轮",
  "D轮及以上",
  "已上市",
  "不需要融资"
] as const;

export const SKILL_DICTIONARY = [
  "Java",
  "Spring",
  "Spring Boot",
  "Spring Cloud",
  "MySQL",
  "Redis",
  "Kafka",
  "Docker",
  "Kubernetes",
  "Elasticsearch",
  "微服务",
  "Linux",
  "Git",
  "RPC",
  "Netty",
  "消息队列"
] as const;
