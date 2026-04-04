import type { RawJob } from "../../shared/types/jobs";

const JOB_CARD_SELECTORS = [".job-card-wrapper", ".job-list-box .job-card-box", ".job-card-box"];

function readText(el: Element | null): string {
  return el?.textContent?.trim() ?? "";
}

export function collectRawJobs(doc: Document, maxCount = 30): RawJob[] {
  const cards = JOB_CARD_SELECTORS.flatMap((selector) => Array.from(doc.querySelectorAll(selector)));

  const uniqueCards = Array.from(new Set(cards)).slice(0, maxCount);

  return uniqueCards.map((card, index) => {
    const titleEl = card.querySelector(".job-name, .job-title, .job-name a");
    const salaryEl = card.querySelector(".salary, .job-salary");
    const tagEls = card.querySelectorAll(".tag-list li, .job-info .tag-item, .job-card-footer li");
    const companyEl = card.querySelector(".company-name, .boss-name, .company-text");
    const companyMetaEl = card.querySelector(".company-tag-list, .company-info, .company-labels");
    const locationEl = card.querySelector(".job-area, .job-address");

    return {
      id: `job_${index + 1}`,
      title: readText(titleEl),
      salaryText: readText(salaryEl),
      tags: Array.from(tagEls)
        .map((tag) => readText(tag))
        .filter(Boolean),
      companyName: readText(companyEl),
      companyMeta: readText(companyMetaEl),
      locationText: readText(locationEl),
      sourceUrl: window.location.href
    };
  });
}
