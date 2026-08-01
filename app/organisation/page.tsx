"use client";

import { useEffect, useState } from "react";
import { PageHero } from "@/components/PageHero";
import { useApp } from "@/components/Providers";
import { apiGet, isDemoMode } from "@/lib/api";
import { demoStore } from "@/lib/demo-store";
import type { OrgItem } from "@/lib/types";
import { Icon } from "@/components/Icon";

export default function OrganisationPage() {
  const { language } = useApp();
  const [items, setItems] = useState<OrgItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrg = async () => {
      try {
        setLoading(true);
        if (isDemoMode) {
          setItems(demoStore.getOrganisationItems());
        } else {
          const res = await apiGet<OrgItem[]>("organisation/get");
          if (res.ok && res.data) {
            setItems(res.data);
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load organisation data");
      } finally {
        setLoading(false);
      }
    };
    fetchOrg();
  }, []);

  const activeItems = items.filter((item) => item.is_active);
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
          {error && <div className="form-message form-message--error">{error}</div>}

          {!loading && !error && (
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
