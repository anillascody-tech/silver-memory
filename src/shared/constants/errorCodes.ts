export const ERROR_CODES = {
  NOT_TARGET_PAGE: "NOT_TARGET_PAGE",
  NOT_LOGGED_IN: "NOT_LOGGED_IN",
  NO_JOB_CARD_FOUND: "NO_JOB_CARD_FOUND"
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
