"use client";

import { fallbackContent } from "@/lib/content";
import { mockAnnouncements, mockAssets, mockIkes, mockLoans, mockTabung } from "@/data/mock";
import type { Announcement, Asset, IkesApplication, Loan, SiteContent, TabungRecord, OrgItem, OrgOfficer } from "@/lib/types";

const keys = {
  content: "lfx-demo-content",
  assets: "lfx-demo-assets",
  loans: "lfx-demo-loans",
  ikes: "lfx-demo-ikes",
  tabung: "lfx-demo-tabung",
  announcements: "lfx-demo-announcements",
  organisationItems: "lfx-demo-organisation-items"
};

export const defaultOrgItems: OrgItem[] = [
  { id: "org-1", type: "LEADERSHIP", title: "Bendahari Agung Kehormat", code: "BAK", member_count: 1, sort_order: 1, is_active: true },
  { id: "org-2", type: "LEADERSHIP", title: "Naib Bendahari Agung Kehormat", code: "NBAK", member_count: 1, sort_order: 2, is_active: true },
  { id: "org-3", type: "UNIT", title: "Unit Perancangan & Kesatuan", code: "U-PERK", member_count: 1, sort_order: 3, is_active: true },
  { id: "org-4", type: "UNIT", title: "Unit Data & Operasi", code: "U-DOPE", member_count: 2, sort_order: 4, is_active: true },
  { id: "org-5", type: "UNIT", title: "Unit Aset & Inventori", code: "U-SAVE", member_count: 2, sort_order: 5, is_active: true }
];

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
  getOrganisationItems: () => {
    const raw = read<{ items: OrgItem[]; officers: OrgOfficer[] } | null>(keys.organisationItems, null);
    const defaultItems = defaultOrgItems;
    const defaultOfficers: OrgOfficer[] = [
      {
        id: "officer-1",
        name: "Muhammad Haris Bin Azman",
        position: "Bendahari Agung Kehormat",
        photoUrl: "",
        unitId: "org-1",
        sortOrder: 1,
        isActive: true,
        email: "haris@student.ipgm.edu.my",
        responsibilities: "Mengetuai Pejabat Bendahari Agung, menetapkan belanjawan tahunan, dan mengurus akaun rasmi JPP IPGKKB."
      },
      {
        id: "officer-2",
        name: "Nur Aisya Binti Mohd Ridzuan",
        position: "Naib Bendahari Agung Kehormat",
        photoUrl: "",
        unitId: "org-2",
        sortOrder: 1,
        isActive: true,
        email: "aisya@student.ipgm.edu.my",
        responsibilities: "Membantu pengurusan belanjawan harian, menyelia program iKES dan iAset, serta menyediakan laporan bulanan."
      }
    ];
    if (!raw) {
      return { items: defaultItems, officers: defaultOfficers };
    }
    if (Array.isArray(raw)) {
      return { items: raw, officers: defaultOfficers };
    }
    if (!raw.items) raw.items = defaultItems;
    if (!raw.officers) raw.officers = defaultOfficers;
    return raw;
  },
  saveOrganisationItems: (value: { items: OrgItem[]; officers: OrgOfficer[] }) => write(keys.organisationItems, value),
  reset: () => Object.values(keys).forEach((key) => localStorage.removeItem(key))
};
