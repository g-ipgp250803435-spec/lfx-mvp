"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Icon } from "@/components/Icon";
import { useApp } from "@/components/Providers";
import { apiGet, isDemoMode } from "@/lib/api";
import { demoStore } from "@/lib/demo-store";
import { formatDate } from "@/lib/format";
import { t } from "@/lib/i18n";
import type { Announcement } from "@/lib/types";
import { MediaImage } from "@/components/CmsImage";

export function AnnouncementList({ compact = false }: { compact?: boolean }) {
  const [items, setItems] = useState<Announcement[]>([]);
  const [category, setCategory] = useState("ALL");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { language, labels } = useApp();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (isDemoMode) {
        setItems(demoStore.getAnnouncements());
      } else {
        const res = await apiGet<Announcement[]>("announcements/list", { t: Date.now().toString() });
        setItems(res.data || []);
      }
    } catch (err) {
      console.error("[Diagnostics Error] failed to load announcements:", err);
      if (!isDemoMode) {
        setError(
          language === "bm"
            ? "Maklumat pengumuman tidak dapat diperoleh. Sila cuba lagi."
            : "Announcement information could not be retrieved. Please try again."
        );
      } else {
        setItems(demoStore.getAnnouncements());
      }
    } finally {
      setLoading(false);
    }
  }, [language]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const categories = ["ALL", ...Array.from(new Set(items.map((item) => item.category)))];

  const visible = useMemo(() => {
    return items
      .filter((item) => category === "ALL" || item.category === category)
      .sort((a, b) => b.publish_date.localeCompare(a.publish_date))
      .slice(0, compact ? 3 : 100);
  }, [items, category, compact]);

  const share = (item: Announcement) => {
    const url = `${window.location.origin}/announcements#${item.announcement_id}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(`${t(item.title, language)} ${url}`)}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div>
      {/* Styles for responsive layout and zoom modal */}
      <style>{`
        .announcement-item-container {
          display: grid;
          gap: 20px;
          grid-template-columns: 1fr;
          width: 100%;
        }

        .announcement-item-with-poster {
          display: grid;
          grid-template-columns: 280px 1fr;
          gap: 24px;
          align-items: start;
          width: 100%;
        }

        .announcement-poster-wrapper {
          background: rgba(var(--brand-2-rgb, 145, 55, 55), 0.04);
          border: 1px solid var(--line);
          border-radius: 8px;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          width: 100%;
          min-height: 180px;
          position: relative;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .announcement-poster-wrapper:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-sm);
        }

        .announcement-poster-img {
          width: 100%;
          height: auto;
          max-height: 380px;
          object-fit: contain;
          display: block;
        }

        @media (max-width: 768px) {
          .announcement-list article {
            display: flex !important;
            flex-direction: column !important;
            gap: 16px !important;
            grid-template-columns: none !important;
          }

          .announcement-list__date {
            display: none !important;
          }

          .announcement-item-with-poster {
            grid-template-columns: 1fr !important;
            gap: 16px !important;
            display: flex !important;
            flex-direction: column !important;
          }

          .announcement-item-with-poster .announcement-poster-wrapper {
            order: -1 !important; /* Ensure poster is at the top on mobile */
          }

          .announcement-details-container {
            display: flex !important;
            flex-direction: column !important;
          }

          .announcement-title {
            order: 1 !important;
            margin: 8px 0 4px !important;
          }

          .announcement-list__meta {
            order: 2 !important;
            margin-bottom: 8px !important;
          }

          .announcement-text {
            order: 3 !important;
          }

          .announcement-actions {
            order: 4 !important;
            margin-top: 16px !important;
          }
        }

        /* Modal backdrop for zoom view */
        .zoom-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.85);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          padding: 24px;
          backdrop-filter: blur(8px);
        }

        .zoom-modal-content {
          position: relative;
          max-width: 90vw;
          max-height: 90vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .zoom-modal-close-btn {
          position: absolute;
          top: -48px;
          right: 0;
          background: var(--surface);
          border: 1px solid var(--line);
          color: var(--text-primary);
          border-radius: 50%;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: var(--shadow);
          transition: background-color 0.2s;
        }

        .zoom-modal-close-btn:hover {
          background: var(--line);
        }

        .zoom-poster-img {
          max-width: 100%;
          max-height: 85vh;
          object-fit: contain;
          border-radius: 8px;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.5);
        }
      `}</style>

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
      ) : (
        <>
          {!compact && (
            <div className="filter-chips">
              {categories.map((item) => (
                <button
                  key={item}
                  className={category === item ? "active" : ""}
                  onClick={() => setCategory(item)}
                >
                  {item === "ALL" ? (language === "bm" ? "Semua" : "All") : item}
                </button>
              ))}
            </div>
          )}

          <div className="announcement-list">
            {visible.length ? (
          visible.map((item) => {
            const announcementMedia =
              item.image_url ||
              (item as unknown as Record<string, string>).posterMedia ||
              (item as unknown as Record<string, string>).media ||
              (item as unknown as Record<string, string>).legacyAttachment ||
              (item.attachment_url && /\.(png|jpg|jpeg|webp|gif|svg)/i.test(item.attachment_url) ? item.attachment_url : null) ||
              null;

            const hasPoster = !!announcementMedia;

            return (
              <article id={item.announcement_id} key={item.announcement_id}>
                {/* Always show the date on the left side on desktop */}
                <div className="announcement-list__date">
                  <strong>{new Date(item.publish_date).getDate()}</strong>
                  <span>
                    {new Intl.DateTimeFormat(language === "bm" ? "ms-MY" : "en-GB", {
                      month: "short"
                    }).format(new Date(item.publish_date))}
                  </span>
                </div>

                <div className={hasPoster ? "announcement-item-with-poster" : "announcement-item-container"}>
                  {hasPoster && (
                    <div
                      className="announcement-poster-wrapper"
                      onClick={() => setSelectedImage(announcementMedia)}
                      title={language === "bm" ? "Klik untuk besarkan" : "Click to enlarge"}
                    >
                      <MediaImage
                        src={announcementMedia}
                        alt={language === "bm" ? `Poster pengumuman: ${t(item.title, language)}` : `Announcement poster: ${t(item.title, language)}`}
                        className="announcement-poster-img"
                        variant="poster"
                        loading="lazy"
                      />
                    </div>
                  )}

                  <div className="announcement-details-container" style={{ width: "100%" }}>
                    <div className="announcement-list__meta">
                      <span>{item.category}</span>
                      <time>{formatDate(item.publish_date, language === "bm" ? "ms-MY" : "en-GB")}</time>
                    </div>

                    <h3 className="announcement-title" style={{ margin: "8px 0 6px", font: "600 1.65rem/1.1 var(--serif)" }}>{t(item.title, language)}</h3>
                    <p className="announcement-text">{t(item.content, language)}</p>

                    <div className="announcement-actions">
                      {item.attachment_url && item.attachment_url !== announcementMedia && (
                        <a href={item.attachment_url} target="_blank" rel="noreferrer" className="text-link">
                          <Icon name="file" size={16} />
                          {language === "bm" ? "Lampiran" : "Attachment"}
                        </a>
                      )}
                      <button onClick={() => share(item)} className="text-link">
                        <Icon name="external" size={16} />
                        WhatsApp
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })
        ) : (
          <div className="empty-state">{labels.noResults}</div>
        )}
      </div>
        </>
      )}

      {/* Enlarged image zoom modal overlay */}
      {selectedImage && (
        <div className="zoom-modal-backdrop" onClick={() => setSelectedImage(null)}>
          <div className="zoom-modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              className="zoom-modal-close-btn"
              onClick={() => setSelectedImage(null)}
              aria-label={language === "bm" ? "Tutup" : "Close"}
            >
              <Icon name="close" size={20} />
            </button>
            <MediaImage
              src={selectedImage}
              alt={language === "bm" ? "Poster Pengumuman Penuh" : "Full Announcement Poster"}
              className="zoom-poster-img"
              variant="full-view"
            />
          </div>
        </div>
      )}
    </div>
  );
}
