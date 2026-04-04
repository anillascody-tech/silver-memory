import { collectRawJobs } from "../core/collectors/jobListCollector";
import { aggregateJobs } from "../core/analytics/aggregator";
import { normalizeJobs } from "../core/normalizers/jobNormalizer";
import { detectLoginStatus } from "../core/parsers/loginDetector";
import { detectPageType } from "../core/parsers/pageDetector";
import { parseQueryContext } from "../core/parsers/queryContextParser";
import { ERROR_CODES } from "../shared/constants/errorCodes";
import type { CollectResponse } from "../shared/types/jobs";

function collect(): CollectResponse {
  const pageType = detectPageType(window.location.href);
  const isLoggedIn = detectLoginStatus(document);

  if (pageType !== "job_list") {
    return {
      ok: false,
      pageType,
      isLoggedIn,
      errorCode: ERROR_CODES.NOT_TARGET_PAGE,
      message: "当前页面不是职位列表页，请进入职位搜索列表页后再试。"
    };
  }

  if (!isLoggedIn) {
    return {
      ok: false,
      pageType,
      isLoggedIn,
      errorCode: ERROR_CODES.NOT_LOGGED_IN,
      message: "请先登录 Boss 直聘后再开始分析。"
    };
  }

  const rawJobs = collectRawJobs(document, 30);
  if (rawJobs.length === 0) {
    return {
      ok: false,
      pageType,
      isLoggedIn,
      errorCode: ERROR_CODES.NO_JOB_CARD_FOUND,
      message: "未找到职位卡片，请滚动页面加载后重试。"
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

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "COLLECT_RAW_JOBS") {
    // collect() 为同步调用，直接发送响应并返回 false（无需保持端口开放）
    sendResponse(collect());
    return false;
  }

  return false;
});
