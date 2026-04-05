import { aggregateJobs } from "../core/analytics/aggregator";
import { collectRawJobs } from "../core/collectors/jobListCollector";
import { normalizeJobs } from "../core/normalizers/jobNormalizer";
import { detectLoginStatus } from "../core/parsers/loginDetector";
import { detectPageType } from "../core/parsers/pageDetector";
import { parseQueryContext } from "../core/parsers/queryContextParser";
import { ERROR_CODES } from "../shared/constants/errorCodes";
import type { CollectResponse } from "../shared/types/jobs";

export function collectJobsFromPage(): CollectResponse {
  const pageType = detectPageType(window.location.href);
  const isLoggedIn = detectLoginStatus(document);

  if (pageType !== "job_list") {
    return {
      ok: false,
      pageType,
      isLoggedIn,
      errorCode: ERROR_CODES.NOT_TARGET_PAGE,
      message: "当前页面不是职位列表页，请切换到 Boss 直聘职位列表后再试。"
    };
  }

  if (!isLoggedIn) {
    return {
      ok: false,
      pageType,
      isLoggedIn,
      errorCode: ERROR_CODES.NOT_LOGGED_IN,
      message: "请先登录 Boss 直聘，再开始分析。"
    };
  }

  const rawJobs = collectRawJobs(document, 30);
  if (rawJobs.length === 0) {
    return {
      ok: false,
      pageType,
      isLoggedIn,
      errorCode: ERROR_CODES.NO_JOB_CARD_FOUND,
      message: "没有采集到职位卡片，请滚动页面加载更多职位后重试。"
    };
  }

  const normalizedJobs = normalizeJobs(rawJobs);
  const aggregates = aggregateJobs(normalizedJobs);

  return {
    ok: true,
    pageType,
    isLoggedIn,
    rawJobs,
    normalizedJobs,
    aggregates,
    queryContext: parseQueryContext(window.location.href, document)
  };
}

export function registerContentRuntime(): void {
  // 防止同一时刻多个 COLLECT_RAW_JOBS 消息并发触发重复解析
  let isCollecting = false;

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== "COLLECT_RAW_JOBS") {
      return false;
    }

    if (isCollecting) {
      sendResponse({
        ok: false,
        pageType: "non_target",
        isLoggedIn: false,
        errorCode: "COLLECTING_IN_PROGRESS",
        message: "正在采集中，请稍候再试。"
      });
      return false;
    }

    isCollecting = true;
    try {
      sendResponse(collectJobsFromPage());
    } finally {
      isCollecting = false;
    }
    return false;
  });
}
