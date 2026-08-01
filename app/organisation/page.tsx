"use client";

import { useEffect, useState, useCallback } from "react";
import { PageHero } from "@/components/PageHero";
import { useApp } from "@/components/Providers";
import { apiGet, isDemoMode } from "@/lib/api";
import { demoStore } from "@/lib/demo-store";
import { normalizeOrgItem } from "@/lib/block-utils";
import { Icon } from "@/components/Icon";
import type { OrgItem } from "@/lib/types";

export default function OrganisationPage() {
  const { language } = useApp();
  const [items, setItems] = useState<OrgItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrg = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      if (isDemoMode) {
        const rawItems = demoStore.getOrganisationItems();
        setItems((rawItems || []).map(normalizeOrgItem));
      } else {
        const res = await apiGet<OrgItem[]>("organisation/get");
        if (res.ok && res.data) {
          setItems((res.data || []).map(normalizeOrgItem));
        } else {
          throw new Error("Failed to load organisation data");
        }
      }
    } catch (e) {
      console.error("Organisation load error:", e);
      setError(e instanceof Error ? e.message : "Failed to load organisation data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchOrg();
  }, [fetchOrg]);

  const activeItems = (items || []).filter((item) => item.is_active);
  const leadership = activeItems
    .filter((item) => item.type === "LEADERSHIP")
    .sort((a, b) => a.sort_order - b.sort_order);
  const units = activeItems
    .filter((item) => item.type === "UNIT")
    .sort((a, b) => a.sort_order - b.sort_order);

  const getCountText = (count: number) => {
    if (language === "bm") {
      return `${count} orang`;
    }
    return `${count} ${count === 1 ? "person" : "people"}`;
  };

  return (
    <>
      <PageHero
        eyebrow={{
          bm: "Akauntabiliti bermula dengan manusia",
          en: "Accountability starts with people"
        }}
        title={{
          bm: "Organisasi Pejabat Bendahari Agung",
          en: "Office of the Treasurer-General"
        }}
        description={{
          bm: "Kenali pegawai, portfolio dan tanggungjawab rasmi pasukan perbendaharaan MPP.",
          en: "Meet the officers, portfolios and official responsibilities of the SRC Treasury team."
        }}
      />

      <section className="section section--soft">
        <div className="container" style={{ maxWidth: "800px", margin: "0 auto" }}>
          {loading && <p className="muted" style={{ textAlign: "center" }}>{language === "bm" ? "Memuatkan..." : "Loading..."}</p>}

          {error && (
            <div style={{ textAlign: "center", padding: "24px", display: "flex", flexDirection: "column", gap: "16px", alignItems: "center" }}>
              <div className="form-message form-message--error" style={{ width: "100%", maxWidth: "500px", margin: "0 auto" }}>
                {language === "bm" ? "Maklumat organisasi tidak dapat dimuatkan pada masa ini." : "Organisation information could not be loaded at this time."}
              </div>
              <button
                className="button button--outline button--small"
                onClick={() => { void fetchOrg(); }}
                style={{ marginTop: "8px" }}
              >
                {language === "bm" ? "Cuba Semula" : "Retry"}
              </button>
            </div>
          )}

          {!loading && !error && activeItems.length === 0 && (
            <div style={{ textAlign: "center", padding: "48px 24px", color: "var(--muted)" }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px", opacity: 0.5 }}>
                <Icon name="user" size={48} />
              </div>
              <p style={{ fontSize: "1.1rem" }}>
                {language === "bm" ? "Maklumat organisasi belum tersedia." : "Organisation information is not yet available."}
              </p>
            </div>
          )}

          {!loading && !error && activeItems.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
              {leadership.length > 0 && (
                <div>
                  <h2 style={{
                    fontSize: "1.5rem",
                    color: "#0d4d41",
                    borderBottom: "2px solid #0d4d41",
                    paddingBottom: "8px",
                    marginBottom: "16px"
                  }}>
                    {language === "bm" ? "Kepimpinan Perbendaharaan" : "Treasury Leadership"}
                  </h2>
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {leadership.map((item) => (
                      <div
                        key={item.id}
                        style={{
                          background: "var(--bg)",
                          border: "1px solid var(--line)",
                          padding: "16px",
                          borderRadius: "8px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center"
                        }}
                      >
                        <div>
                          <strong style={{ fontSize: "1.1rem" }}>{item.title}</strong>
                          {item.code && (
                            <span style={{
                              marginLeft: "8px",
                              background: "#0d4d41",
                              color: "#fff",
                              fontSize: "0.75rem",
                              padding: "2px 6px",
                              borderRadius: "4px",
                              fontWeight: "bold"
                            }}>
                              {item.code}
                            </span>
                          )}
                        </div>
                        <span style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
                          {getCountText(item.member_count)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {units.length > 0 && (
                <div>
                  <h2 style={{
                    fontSize: "1.5rem",
                    color: "#0d4d41",
                    borderBottom: "2px solid #0d4d41",
                    paddingBottom: "8px",
                    marginBottom: "16px"
                  }}>
                    {language === "bm" ? "Unit-Unit" : "Units"}
                  </h2>
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {units.map((item) => (
                      <div
                        key={item.id}
                        style={{
                          background: "var(--bg)",
                          border: "1px solid var(--line)",
                          padding: "16px",
                          borderRadius: "8px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center"
                        }}
                      >
                        <div>
                          <strong style={{ fontSize: "1.1rem" }}>{item.title}</strong>
                          {item.code && (
                            <span style={{
                              marginLeft: "8px",
                              background: "#0d4d41",
                              color: "#fff",
                              fontSize: "0.75rem",
                              padding: "2px 6px",
                              borderRadius: "4px",
                              fontWeight: "bold"
                            }}>
                              {item.code}
                            </span>
                          )}
                        </div>
                        <span style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
                          {item.code ? `${item.title} (${item.code}) — ${getCountText(item.member_count)}` : `${item.title} — ${getCountText(item.member_count)}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
