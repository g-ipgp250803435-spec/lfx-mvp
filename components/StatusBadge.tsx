"use client";

import { useApp } from "@/components/Providers";

export function StatusBadge({ status }: { status: string }) {
  const { labels } = useApp();
  const map: Record<string, string> = { AVAILABLE: labels.available, ON_LOAN: labels.onLoan, DAMAGED: labels.damaged, MAINTENANCE: labels.maintenance, PENDING: "Pending", APPROVED: "Approved", REJECTED: "Rejected", ACTIVE: "Active", RETURNED: "Returned", PAID: "Paid", REPAID: "Repaid" };
  return <span className={`status status--${status.toLowerCase()}`}>{map[status] || status}</span>;
}
