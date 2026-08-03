"use client";

import { useEffect, useState, useCallback } from "react";
import { PageHero } from "@/components/PageHero";
import { useApp } from "@/components/Providers";
import { apiGet, isDemoMode } from "@/lib/api";
import { demoStore } from "@/lib/demo-store";
import { normalizeOrgItem } from "@/lib/block-utils";
import { Icon } from "@/components/Icon";
import type { OrgItem, OrgOfficer } from "@/lib/types";
import { t } from "@/lib/i18n";

import { CmsImage } from "@/components/CmsImage";

export default function OrganisationPage() {
  const { language } = useApp();
  const [items, setItems] = useState<OrgItem[]>([]);
  const [officers, setOfficers] = useState<OrgOfficer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOfficer, setSelectedOfficer] = useState<OrgOfficer | null>(null);

  const fetchOrg = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      let data: { items: OrgItem[]; officers: OrgOfficer[] } | null = null;
      if (isDemoMode) {
        data = demoStore.getOrganisationItems();
      } else {
        const res = await apiGet<{ items: OrgItem[]; officers: OrgOfficer[] }>("organisation/get");
        if (res.ok && res.data) {
          data = res.data;
        } else {
          throw new Error("Failed to load organisation data");
        }
      }
      if (data) {
        setItems((data.items || []).map(normalizeOrgItem));
        setOfficers(data.officers || []);
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
  const activeOfficers = (officers || []).filter((officer) => officer.isActive);

  // Treasurer (lowest sort_order leadership item)
  const treasurerItem = activeItems
    .filter((item) => item.type === "LEADERSHIP")
    .sort((a, b) => a.sort_order - b.sort_order)[0];
  const treasurerOfficer = treasurerItem ? activeOfficers.find((o) => o.unitId === treasurerItem.id) : null;

  // Vice Treasurer (second lowest sort_order leadership item)
  const deputyItem = activeItems
    .filter((item) => item.type === "LEADERSHIP")
    .sort((a, b) => a.sort_order - b.sort_order)[1];
  const deputyOfficer = deputyItem ? activeOfficers.find((o) => o.unitId === deputyItem.id) : null;

  // Units
  const unitItems = activeItems
    .filter((item) => item.type === "UNIT")
    .sort((a, b) => a.sort_order - b.sort_order);

  return (
    <>
      <style>{`
        /* Hierarchical Org Tree Styling */
        .public-org-tree {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 32px;
          width: 100%;
          margin-top: 24px;
        }

        .public-org-node {
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: var(--radius);
          padding: 24px;
          width: 280px;
          text-align: center;
          position: relative;
          box-shadow: var(--shadow-sm);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .public-org-node:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow);
        }

        .public-org-node img {
          width: 110px;
          height: 110px;
          object-fit: cover;
          border-radius: 50%;
          border: 3px solid var(--brand-2);
          background: var(--brand-soft);
        }

        .public-org-node .node-position {
          color: var(--brand-2);
          font-size: 0.72rem;
          font-weight: 850;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          line-height: 1.2;
        }

        .public-org-node .node-name {
          font: 600 1.25rem var(--serif);
          color: var(--text-primary);
          line-height: 1.25;
        }

        .public-org-node .node-details {
          font-size: 0.8rem;
          color: var(--muted);
        }

        .public-org-line-v {
          width: 2px;
          height: 32px;
          background: var(--line);
        }

        .public-org-branches {
          display: flex;
          justify-content: center;
          gap: 32px;
          width: 100%;
          position: relative;
        }

        .public-org-branch {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 24px;
          position: relative;
        }

        .public-org-branch::before {
          content: "";
          position: absolute;
          top: -32px;
          left: 50%;
          transform: translateX(-50%);
          width: 2px;
          height: 32px;
          background: var(--line);
        }

        .public-org-branch::after {
          content: "";
          position: absolute;
          top: -32px;
          height: 2px;
          background: var(--line);
          width: 100%;
        }

        .public-org-branch:first-child::after {
          left: 50%;
          width: 50%;
        }

        .public-org-branch:last-child::after {
          right: 50%;
          width: 50%;
        }

        .public-org-branch:only-child::after {
          display: none;
        }

        .public-org-unit-card {
          background: var(--brand-soft);
          border: 1px solid var(--line);
          border-radius: var(--radius-sm);
          padding: 12px 18px;
          text-align: center;
          font-weight: 700;
          color: var(--brand-2);
          font-size: 0.9rem;
          box-shadow: var(--shadow-sm);
        }

        .public-org-members {
          display: flex;
          flex-direction: column;
          gap: 20px;
          align-items: center;
          position: relative;
        }

        .public-org-members::before {
          content: "";
          width: 2px;
          background: var(--line);
          position: absolute;
          top: -24px;
          bottom: 20px;
          z-index: 0;
        }

        .public-org-members .public-org-node {
          z-index: 1;
        }

        @media (max-width: 960px) {
          .public-org-branches {
            flex-direction: column;
            align-items: center;
            gap: 48px;
          }
          .public-org-branch::after, .public-org-branch::before {
            display: none;
          }
          .public-org-branch {
            width: 100%;
          }
          .public-org-members::before {
            display: none;
          }
        }
      `}</style>

      <PageHero
        eyebrow={{
          bm: "Akauntabiliti bermula dengan manusia",
          en: "Accountability starts with people"
        }}
        title={{
          bm: "Organisasi Pejabat Bendahari Agung Kehormat",
          en: "Office of the Honorary Treasurer-General"
        }}
        description={{
          bm: "Kenali pegawai, portfolio dan tanggungjawab rasmi pasukan perbendaharaan JPP.",
          en: "Meet the officers, portfolios and official responsibilities of the SRC Treasury team."
        }}
      />

      <section className="section section--soft">
        <div className="container">
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
            <div className="public-org-tree" style={{ "--branch-count": unitItems.length } as React.CSSProperties}>
              {/* Level 1: Treasurer */}
              {treasurerOfficer ? (
                <button
                  className="public-org-node"
                  onClick={() => setSelectedOfficer(treasurerOfficer)}
                  aria-label={`${t(treasurerOfficer.position, language)}: ${treasurerOfficer.name}. Click for details.`}
                >
                  <CmsImage
                    src={treasurerOfficer.photoUrl || "/officer-placeholder.svg"}
                    alt={treasurerOfficer.name}
                    width={110}
                    height={110}
                    variant="officer-avatar"
                  />
                  <span className="node-position">{t(treasurerOfficer.position, language)}</span>
                  <strong className="node-name">{treasurerOfficer.name}</strong>
                  <small className="node-details">{treasurerOfficer.email}</small>
                </button>
              ) : (
                <div className="public-org-node" style={{ borderStyle: "dashed", cursor: "default" }}>
                  <span className="node-position">{language === "bm" ? "BENDAHARI AGUNG" : "TREASURER-GENERAL"}</span>
                  <strong className="node-name" style={{ opacity: 0.5 }}>
                    {language === "bm" ? "— Belum Ditetapkan —" : "— Unassigned —"}
                  </strong>
                </div>
              )}

              <div className="public-org-line-v"></div>

              {/* Level 2: Deputy Treasurer */}
              {deputyOfficer ? (
                <button
                  className="public-org-node"
                  onClick={() => setSelectedOfficer(deputyOfficer)}
                  aria-label={`${t(deputyOfficer.position, language)}: ${deputyOfficer.name}. Click for details.`}
                >
                  <CmsImage
                    src={deputyOfficer.photoUrl || "/officer-placeholder.svg"}
                    alt={deputyOfficer.name}
                    width={110}
                    height={110}
                    variant="officer-avatar"
                  />
                  <span className="node-position">{t(deputyOfficer.position, language)}</span>
                  <strong className="node-name">{deputyOfficer.name}</strong>
                  <small className="node-details">{deputyOfficer.email}</small>
                </button>
              ) : (
                <div className="public-org-node" style={{ borderStyle: "dashed", cursor: "default" }}>
                  <span className="node-position">{language === "bm" ? "NAIB BENDAHARI AGUNG" : "DEPUTY TREASURER-GENERAL"}</span>
                  <strong className="node-name" style={{ opacity: 0.5 }}>
                    {language === "bm" ? "— Belum Ditetapkan —" : "— Unassigned —"}
                  </strong>
                </div>
              )}

              <div className="public-org-line-v"></div>

              {/* Level 3: Unit branches */}
              <div className="public-org-branches">
                {unitItems.map((unit) => {
                  const members = activeOfficers
                    .filter((o) => o.unitId === unit.id)
                    .sort((a, b) => (a.sortOrder || 1) - (b.sortOrder || 1));

                  return (
                    <div key={unit.id} className="public-org-branch">
                      <div className="public-org-unit-card">
                        {unit.title}
                        {unit.code && (
                          <span style={{
                            marginLeft: "6px",
                            fontSize: "0.75rem",
                            background: "var(--accent)",
                            color: "var(--background)",
                            padding: "1px 4px",
                            borderRadius: "3px"
                          }}>
                            {unit.code}
                          </span>
                        )}
                      </div>

                      <div className="public-org-members">
                        {members.length > 0 ? (
                          members.map((member) => (
                            <button
                              key={member.id}
                              className="public-org-node"
                              onClick={() => setSelectedOfficer(member)}
                              aria-label={`${t(member.position, language)}: ${member.name}. Click for details.`}
                            >
                              <CmsImage
                                src={member.photoUrl || "/officer-placeholder.svg"}
                                alt={member.name}
                                width={110}
                                height={110}
                                variant="officer-avatar"
                              />
                              <span className="node-position">{t(member.position, language)}</span>
                              <strong className="node-name" style={{ fontSize: "1.05rem" }}>{member.name}</strong>
                              <small className="node-details" style={{ fontSize: "0.75rem" }}>{member.email}</small>
                            </button>
                          ))
                        ) : (
                          <div style={{ color: "var(--muted)", fontSize: "0.8rem", fontStyle: "italic", border: "1px dashed var(--line)", padding: "12px", borderRadius: "8px", background: "var(--surface)" }}>
                            {language === "bm" ? "Tiada pegawai ditetapkan" : "No officers assigned"}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Detail Overlay Modal */}
      {selectedOfficer && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={() => setSelectedOfficer(null)}
          style={{ display: "flex" }}
        >
          <section
            className="officer-modal"
            role="dialog"
            aria-modal="true"
            onMouseDown={(e) => e.stopPropagation()}
            style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
          >
            <button className="modal-close" onClick={() => setSelectedOfficer(null)} aria-label="Close modal">
              <Icon name="close" />
            </button>
            <div style={{ width: "140px", height: "140px", margin: "0 auto", overflow: "hidden", borderRadius: "50%", border: "3px solid var(--brand-2)" }}>
              <CmsImage
                src={selectedOfficer.photoUrl || "/officer-placeholder.svg"}
                alt={selectedOfficer.name}
                width={140}
                height={140}
              />
            </div>
            <span className="eyebrow" style={{ marginTop: "12px" }}>{t(selectedOfficer.position, language)}</span>
            <h2 style={{ marginTop: "8px" }}>{selectedOfficer.name}</h2>
            {selectedOfficer.email && (
              <a
                href={`mailto:${selectedOfficer.email}`}
                className="button button--outline"
                style={{ marginTop: "16px", marginBottom: "16px" }}
              >
                <Icon name="mail" size={17} />
                {selectedOfficer.email}
              </a>
            )}
            <div style={{ textAlign: "left", marginTop: "12px", borderTop: "1px solid var(--line)", paddingTop: "12px" }}>
              <strong style={{ fontSize: "0.85rem", color: "var(--brand-2)", textTransform: "uppercase" }}>
                {language === "bm" ? "Peranan & Tanggungjawab Kerja:" : "Role & Key Responsibilities:"}
              </strong>
              <p style={{ marginTop: "6px", fontSize: "0.95rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>
                {t(selectedOfficer.responsibilities, language) || "—"}
              </p>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
