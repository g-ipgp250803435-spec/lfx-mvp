"use client";

import { CmsImage } from "@/components/CmsImage";
import { notFound, useParams } from "next/navigation";
import { PageHero } from "@/components/PageHero";
import { useApp } from "@/components/Providers";
import { useContent } from "@/components/ContentProvider";
import { t } from "@/lib/i18n";
import { normalizePageBlocks, renderFormattedText, validateUrl } from "@/lib/block-utils";

export default function CustomPage() {
  const params = useParams<{ slug: string }>();
  const { content, loading } = useContent();
  const { language } = useApp();
  const page = content.customPages.find((item) => item.slug === params.slug && item.published);

  if (loading) return <div className="empty-state page-loading">Loading…</div>;
  if (!page) return notFound();

  // Normalize sections list to typed blocks list on the fly
  const blocks = normalizePageBlocks(page);

  return (
    <>
      <PageHero eyebrow={{ bm: "Hab Perbendaharaan Digital", en: "Hab Perbendaharaan Digital" }} title={page.title} description={page.summary} />
      <section className="section">
        <div className="container container--narrow content-page">
          {page.heroImage && (
            <div style={{ marginBottom: "32px", borderRadius: "8px", overflow: "hidden" }}>
              <CmsImage src={page.heroImage} alt="" width={1000} height={560} />
            </div>
          )}

          {blocks.map((block) => {
            switch (block.type) {
              case "richText":
                return (
                  <div key={block.id} className="block-rich-text" style={{ marginBottom: "24px" }}>
                    {renderFormattedText(t(block.content, language))}
                  </div>
                );

              case "image":
                return (
                  <div key={block.id} className="block-image" style={{ marginBottom: "24px" }}>
                    <CmsImage
                      src={block.imageUrl}
                      alt={block.isDecorative ? "" : t(block.alt, language)}
                      width={900}
                      height={500}
                    />
                    {!block.isDecorative && block.caption && (
                      <p style={{ fontSize: "0.85rem", color: "var(--muted)", textAlign: "center", marginTop: "6px" }}>
                        {t(block.caption, language)}
                      </p>
                    )}
                  </div>
                );

              case "cta":
                return (
                  <div
                    key={block.id}
                    className="block-cta"
                    style={{
                      padding: "24px",
                      border: "1px solid var(--line)",
                      borderRadius: "8px",
                      background: "var(--soft-bg)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px",
                      marginTop: "24px",
                      marginBottom: "24px"
                    }}
                  >
                    <h3 style={{ color: "var(--brand-2)", margin: 0 }}>{t(block.title, language)}</h3>
                    {block.description && <p style={{ margin: 0, fontSize: "0.95rem" }}>{t(block.description, language)}</p>}
                    <a
                      className={`button ${block.variant === "secondary" ? "button--outline" : ""}`}
                      href={validateUrl(block.href)}
                      style={{ alignSelf: "flex-start", marginTop: "4px" }}
                    >
                      {t(block.label, language)}
                    </a>
                  </div>
                );

              case "faq":
                return (
                  <div key={block.id} className="block-faq" style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "24px", marginBottom: "24px" }}>
                    {block.items.map((item) => (
                      <details
                        key={item.id}
                        style={{
                          border: "1px solid var(--line)",
                          borderRadius: "6px",
                          padding: "16px",
                          background: "var(--bg)",
                          cursor: "pointer"
                        }}
                      >
                        <summary style={{ fontWeight: "bold", color: "var(--brand-2)", userSelect: "none" }}>
                          {t(item.question, language)}
                        </summary>
                        <div style={{ marginTop: "12px", borderTop: "1px dashed var(--line)", paddingTop: "12px", cursor: "default" }}>
                          {renderFormattedText(t(item.answer, language))}
                        </div>
                      </details>
                    ))}
                  </div>
                );

              case "documents":
                return (
                  <div
                    key={block.id}
                    className="block-documents"
                    style={{
                      border: "1px solid var(--line)",
                      borderRadius: "8px",
                      padding: "24px",
                      background: "var(--soft-bg)",
                      marginTop: "24px",
                      marginBottom: "24px"
                    }}
                  >
                    {block.title && (
                      <h3 style={{ color: "var(--brand-2)", margin: "0 0 16px 0", fontSize: "1.1rem" }}>
                        {t(block.title, language)}
                      </h3>
                    )}
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      {block.items.map((item) => (
                        <div
                          key={item.id}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            borderBottom: "1px dashed var(--line)",
                            paddingBottom: "12px"
                          }}
                        >
                          <div>
                            <span style={{ fontWeight: "bold" }}>{t(item.title, language)}</span>
                            {item.fileType && (
                              <span
                                style={{
                                  marginLeft: "8px",
                                  background: "var(--line)",
                                  padding: "2px 6px",
                                  borderRadius: "4px",
                                  fontSize: "0.75rem",
                                  fontWeight: "bold"
                                }}
                              >
                                {item.fileType}
                              </span>
                            )}
                          </div>
                          <a
                            href={validateUrl(item.url)}
                            className="button button--small button--outline"
                            target="_blank"
                            rel="noreferrer"
                          >
                            {language === "bm" ? "Muat turun" : "Download"}
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                );

              default:
                // Safely ignore unknown block types to prevent public page crashes
                return null;
            }
          })}
        </div>
      </section>
    </>
  );
}
