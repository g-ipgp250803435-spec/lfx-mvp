"use client";

import { fallbackContent } from "@/lib/content";
import { mockAnnouncements, mockAssets, mockIkes, mockLoans, mockTabung } from "@/data/mock";
import type { Announcement, Asset, IkesApplication, Loan, SiteContent, TabungRecord } from "@/lib/types";

const keys = {
  content: "lfx-demo-content",
  assets: "lfx-demo-assets",
  loans: "lfx-demo-loans",
  ikes: "lfx-demo-ikes",
  tabung: "lfx-demo-tabung",
  announcements: "lfx-demo-announcements"
};

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

function write<T>(key: string, value: T): T {
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent("lfx-demo-update", { detail: key }));
  return value;
}

export const demoStore = {
  getContent: () => read<SiteContent>(keys.content, fallbackContent),
  saveContent: (value: SiteContent) => write(keys.content, value),
  getAssets: () => read<Asset[]>(keys.assets, mockAssets),
  saveAssets: (value: Asset[]) => write(keys.assets, value),
  getLoans: () => read<Loan[]>(keys.loans, mockLoans),
  saveLoans: (value: Loan[]) => write(keys.loans, value),
  getIkes: () => read<IkesApplication[]>(keys.ikes, mockIkes),
  saveIkes: (value: IkesApplication[]) => write(keys.ikes, value),
  getTabung: () => read<TabungRecord[]>(keys.tabung, mockTabung),
  saveTabung: (value: TabungRecord[]) => write(keys.tabung, value),
  getAnnouncements: () => read<Announcement[]>(keys.announcements, mockAnnouncements),
  saveAnnouncements: (value: Announcement[]) => write(keys.announcements, value),
  reset: () => Object.values(keys).forEach((key) => localStorage.removeItem(key))
};
