import defaultContent from "@/data/default-content.json";
import type { SiteContent } from "@/lib/types";

export const fallbackContent = defaultContent as SiteContent;

export async function getInitialContent(): Promise<SiteContent> {
  const isDemo = process.env.NEXT_PUBLIC_DEMO_MODE !== "false";
  if (isDemo) {
    return fallbackContent;
  }

  const url = process.env.LFX_API_URL;
  const key = process.env.LFX_API_KEY;

  if (!url) {
    return fallbackContent;
  }

  try {
    const target = new URL(url);
    target.searchParams.set("action", "content/get");
    if (key) {
      target.searchParams.set("api_key", key);
    }

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(target.toString(), {
      cache: "no-store",
      signal: controller.signal,
      redirect: "follow"
    });
    clearTimeout(id);

    if (response.ok) {
      const text = await response.text();
      const result = JSON.parse(text);
      if (result && result.ok && result.data) {
        return result.data as SiteContent;
      }
    }
    return fallbackContent;
  } catch (error) {
    console.error("Error fetching initial content on server:", error);
    return fallbackContent;
  }
}
