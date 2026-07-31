"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/Icon";
import { useApp } from "@/components/Providers";
import { apiGet, isDemoMode } from "@/lib/api";
import { demoStore } from "@/lib/demo-store";
import { formatDate } from "@/lib/format";
import { t } from "@/lib/i18n";
import type { Announcement } from "@/lib/types";

export function AnnouncementList({ compact = false }: { compact?: boolean }) {
  const [items, setItems] = useState<Announcement[]>([]);
  const [category, setCategory] = useState("ALL");
  const { language, labels } = useApp();
  useEffect(() => {
    const load = async () => {
      try { setItems(isDemoMode ? demoStore.getAnnouncements() : (await apiGet<Announcement[]>("announcements/list")).data || []); }
      catch { setItems(demoStore.getAnnouncements()); }
    };
    void load();
  }, []);
  const categories = ["ALL", ...Array.from(new Set(items.map((item) => item.category)))];
  const visible = useMemo(() => items.filter((item) => category === "ALL" || item.category === category).sort((a, b) => b.publish_date.localeCompare(a.publish_date)).slice(0, compact ? 3 : 100), [items, category, compact]);
  const share = (item: Announcement) => {
    const url = `${window.location.origin}/announcements#${item.announcement_id}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(`${t(item.title, language)} ${url}`)}`, "_blank", "noopener,noreferrer");
  };
  return <div>
    {!compact && <div className="filter-chips">{categories.map((item) => <button key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item === "ALL" ? (language === "bm" ? "Semua" : "All") : item}</button>)}</div>}
    <div className="announcement-list">{visible.length ? visible.map((item) => <article id={item.announcement_id} key={item.announcement_id}><div className="announcement-list__date"><strong>{new Date(item.publish_date).getDate()}</strong><span>{new Intl.DateTimeFormat(language === "bm" ? "ms-MY" : "en-GB", { month: "short" }).format(new Date(item.publish_date))}</span></div><div><div className="announcement-list__meta"><span>{item.category}</span><time>{formatDate(item.publish_date, language === "bm" ? "ms-MY" : "en-GB")}</time></div><h3>{t(item.title, language)}</h3><p>{t(item.content, language)}</p><div className="announcement-actions">{item.attachment_url && <a href={item.attachment_url} target="_blank" rel="noreferrer" className="text-link"><Icon name="file" size={16}/>{language === "bm" ? "Lampiran" : "Attachment"}</a>}<button onClick={() => share(item)} className="text-link"><Icon name="external" size={16}/>WhatsApp</button></div></div></article>) : <div className="empty-state">{labels.noResults}</div>}</div>
  </div>;
}
