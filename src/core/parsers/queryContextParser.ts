import type { QueryContext } from "../../shared/types/jobs";

export function parseQueryContext(url: string, doc: Document): QueryContext {
  let parsedUrl: URL | null = null;
  try {
    parsedUrl = new URL(url);
  } catch {
    // 无效 URL 时降级为空上下文
  }

  const keyword = parsedUrl?.searchParams.get("query") ?? undefined;
  const cityNode = doc.querySelector(".city-area-current, .city-label, .city-name");
  const city = cityNode?.textContent?.trim() || parsedUrl?.searchParams.get("city") || undefined;

  return { city, keyword };
}
