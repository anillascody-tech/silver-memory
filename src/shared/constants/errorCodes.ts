export const ERROR_CODES = {
  // 用户操作类
  NOT_TARGET_PAGE: "NOT_TARGET_PAGE",
  NOT_LOGGED_IN: "NOT_LOGGED_IN",
  NO_JOB_CARD_FOUND: "NO_JOB_CARD_FOUND",
  // 解析类
  PARSE_ERROR: "PARSE_ERROR",
  // 网络/通信类
  NETWORK_ERROR: "NETWORK_ERROR",
  // AI 模型类
  MODEL_ERROR: "MODEL_ERROR"
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
