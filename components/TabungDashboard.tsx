"use client";

import { useEffect, useMemo, useState } from "react";
import { CmsImage } from "@/components/CmsImage";
import { Icon } from "@/components/Icon";
import { useApp } from "@/components/Providers";
import { useContent } from "@/components/ContentProvider";
import { apiGet, isDemoMode } from "@/lib/api";
import { demoStore } from "@/lib/demo-store";
import { formatDate, money } from "@/lib/format";
import { t } from "@/lib/i18n";
import type { TabungRecord } from "@/lib/types";

export function TabungDashboard({ compact = false }: { compact?: boolean }) {
  const [records, setRecords] = useState<TabungRecord[]>([]);
  const { language, labels } = useApp();
  const { content } = useContent();

  useEffect(() => {
    const load = async () => {
      try { setRecords(isDemoMode ? demoStore.getTabung() : (await apiGet<TabungRecord[]>("tabung/list")).data || []); }
      catch { setRecords(demoStore.getTabung()); }
    };
    void load();
  }, []);

  const summary = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7)); startOfWeek.setHours(0, 0, 0, 0);
    const collections = records.filter((item) => item.type === "COLLECTION");
    const distributions = records.filter((item) => item.type === "DISTRIBUTION");
    const sum = (items: TabungRecord[]) => items.reduce((total, item) => total + Number(item.amount), 0);
    const thisWeek = sum(collections.filter((item) => new Date(item.date) >= startOfWeek));
    const monthCollections = sum(collections.filter((item) => { const d = new Date(item.date); return d.getFullYear() === currentYear && d.getMonth() === currentMonth; }));
    const monthDistributions = sum(distributions.filter((item) => { const d = new Date(item.date); return d.getFullYear() === currentYear && d.getMonth() === currentMonth; }));
    const annualCollections = sum(collections.filter((item) => new Date(item.date).getFullYear() === currentYear));
    const annualDistributions = sum(distributions.filter((item) => new Date(item.date).getFullYear() === currentYear));
    return { thisWeek, monthCollections, monthDistributions, annualBalance: annualCollections - annualDistributions, distributions: distributions.slice().sort((a, b) => b.date.localeCompare(a.date)) };
  }, [records]);
  const target = Number(content.donation.target || 500);
  const progress = Math.min(100, target ? (summary.thisWeek / target) * 100 : 0);

  return <div className={compact ? "tabung-dashboard tabung-dashboard--compact" : "tabung-dashboard"}>
    <div className="transparency-grid">
      <article className="fund-card fund-card--featured">
        <span>
          {language === "bm" ? "Minggu ini" : "This Week"}
          <span className="featured-sub-label">{language === "bm" ? "This Week" : "Minggu ini"}</span>
        </span>
        <strong>{money(summary.thisWeek)}</strong>
        <p>{language === "bm" ? `Sasaran mingguan ${money(target)}` : `Weekly target ${money(target)}`}</p>
        <div className="progress">
          <span style={{ width: `${progress}%` }}/>
        </div>
        <small>{progress.toFixed(0)}% {language === "bm" ? "daripada sasaran" : "of target"}</small>
      </article>
      <article className="fund-card"><Icon name="chart"/><span>{labels.collections} · {labels.thisMonth}</span><strong>{money(summary.monthCollections)}</strong></article>
      <article className="fund-card"><Icon name="wallet"/><span>{labels.distributions} · {labels.thisMonth}</span><strong>{money(summary.monthDistributions)}</strong></article>
      <article className="fund-card"><Icon name="shield"/><span>{labels.annualBalance}</span><strong>{money(summary.annualBalance)}</strong></article>
    </div>
    {!compact && <div className="donation-layout">
      <section className="donation-card"><div><span className="eyebrow">{labels.publicTransparency}</span><h2>{t(content.donation.heading, language)}</h2><p>{t(content.donation.description, language)}</p><a href={content.donation.paymentUrl} target="_blank" rel="noreferrer" className="button button--accent"><Icon name="external" size={17}/>{labels.donate}</a><div className="bank-details"><span>{content.donation.bankName}</span><strong>{content.donation.accountName}</strong><code>{content.donation.accountNumber}</code></div><small>{t(content.donation.note, language)}</small></div><div className="donation-qr"><CmsImage src={content.donation.qrImageUrl || "/duitnow-placeholder.svg"} alt="Donation QR" width={230} height={230}/><span>DuitNow QR</span></div></section>
      <section className="records-card"><div className="section-title"><div><span className="eyebrow">{labels.distributions}</span><h2>{labels.recentDistributions}</h2></div></div><div className="record-list">{summary.distributions.length ? summary.distributions.slice(0, 8).map((record) => <article key={record.record_id}><div><strong>{record.description}</strong><span>{formatDate(record.date, language === "bm" ? "ms-MY" : "en-GB")}{record.recipient ? ` · ${record.recipient}` : ""}</span></div><b>− {money(record.amount)}</b></article>) : <p className="muted">{labels.noResults}</p>}</div></section>
    </div>}
  </div>;
}
