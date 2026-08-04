"use client";

import Link from "next/link";
import { CmsImage } from "@/components/CmsImage";
import { useEffect, useMemo, useState, useCallback } from "react";
import { Icon } from "@/components/Icon";
import { StatusBadge } from "@/components/StatusBadge";
import { useApp } from "@/components/Providers";
import { apiGet, isDemoMode } from "@/lib/api";
import { demoStore } from "@/lib/demo-store";
import type { Asset } from "@/lib/types";

export function AssetBrowser({ compact = false }: { compact?: boolean }) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { labels, language } = useApp();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (isDemoMode) {
        setAssets(demoStore.getAssets());
      } else {
        const res = await apiGet<Asset[]>("assets/list");
        setAssets(res.data || []);
      }
    } catch (err) {
      console.error("[Diagnostics Error] failed to load assets:", err);
      if (!isDemoMode) {
        setError(
          language === "bm"
            ? "Maklumat senarai aset tidak dapat diperoleh. Sila cuba lagi."
            : "Asset list information could not be retrieved. Please try again."
        );
      } else {
        setAssets(demoStore.getAssets());
      }
    } finally {
      setLoading(false);
    }
  }, [language]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const categories = ["ALL", ...Array.from(new Set(assets.map((asset) => asset.category)))];
  const filtered = useMemo(() => assets.filter((asset) => {
    const matchesQuery = `${asset.name} ${asset.description} ${asset.category}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (category === "ALL" || asset.category === category);
  }), [assets, query, category]);
  const visible = compact ? filtered.slice(0, 4) : filtered;

  return <div className="asset-browser">
    {!compact && <div className="filter-bar"><label><Icon name="search"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={labels.searchAssets}/></label><select value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item} value={item}>{item === "ALL" ? labels.allCategories : item}</option>)}</select></div>}
    {loading ? (
      <div className="empty-state">{labels.loading}</div>
    ) : error ? (
      <div style={{ textAlign: "center", padding: "24px", display: "flex", flexDirection: "column", gap: "16px", alignItems: "center" }}>
        <div className="form-message form-message--error" style={{ width: "100%", maxWidth: "500px", margin: "0 auto" }}>
          {error}
        </div>
        <button
          className="button button--outline button--small"
          onClick={() => { void load(); }}
          style={{ marginTop: "8px" }}
        >
          {language === "bm" ? "Cuba Semula" : "Retry"}
        </button>
      </div>
    ) : visible.length ? (
      <div className="asset-grid">{visible.map((asset) => <article className="asset-card" key={asset.asset_id}>
        <div className="asset-card__image"><CmsImage src={asset.image_url || "/asset-placeholder.svg"} alt={asset.name}/></div>
        <div className="asset-card__body"><div className="asset-card__meta"><span>{asset.category}</span><StatusBadge status={asset.status}/></div><h3>{asset.name}</h3><p>{asset.description}</p><div className="asset-card__actions"><small>{asset.asset_id}</small>{asset.status === "AVAILABLE" ? <Link className="text-link" href={`/iaset/apply?asset=${asset.asset_id}`}>{labels.apply}<Icon name="arrow" size={16}/></Link> : <span className="muted">{language === "bm" ? "Tidak boleh dimohon" : "Not requestable"}</span>}</div></div>
      </article>)}</div>
    ) : (
      <div className="empty-state">{labels.noResults}</div>
    )}
    {compact && <div className="section-action"><Link href="/iaset" className="button button--outline">{labels.viewAll}<Icon name="arrow" size={17}/></Link></div>}
  </div>;
}
