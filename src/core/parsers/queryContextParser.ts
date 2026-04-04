import type { QueryContext } from "../../shared/types/jobs";

export function parseQueryContext(url: string, doc: Document): QueryContext {
  const parsedUrl = new URL(url);
  const keyword = parsedUrl.searchParams.get("query") ?? undefined;

  const cityNode = doc.querySelector(".city-area-current, .city-label, .city-name");
  const city = cityNode?.textContent?.trim() || parsedUrl.searchParams.get("city") || undefined;

  return { city, keyword };
}
