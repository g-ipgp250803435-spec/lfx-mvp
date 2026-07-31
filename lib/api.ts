import type { ApiResult } from "@/lib/types";

export const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE !== "false";

export async function apiGet<T>(action: string, params: Record<string, string> = {}): Promise<ApiResult<T>> {
  const query = new URLSearchParams({ action, ...params });
  const response = await fetch(`/api/lfx?${query.toString()}`, { cache: "no-store" });
  const result = (await response.json()) as ApiResult<T>;
  if (!response.ok || !result.ok) throw new Error(result.error || "API request failed");
  return result;
}

export async function apiPost<T>(action: string, payload: Record<string, unknown> = {}): Promise<ApiResult<T>> {
  const response = await fetch("/api/lfx", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload })
  });
  const result = (await response.json()) as ApiResult<T>;
  if (!response.ok || !result.ok) throw new Error(result.error || "API request failed");
  return result;
}
