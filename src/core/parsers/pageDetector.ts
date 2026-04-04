import type { PageType } from "../../shared/types/jobs";

export function detectPageType(url: string): PageType {
  if (url.includes("/web/geek/job")) {
    return "job_list";
  }

  return "non_target";
}
