import React from "react";
import type { CustomPage, PageBlock, OrgItem } from "@/lib/types";

// URL Security Validator
export function validateUrl(url: string): string {
  if (!url) return "";
  const trimmed = url.trim();
  if (trimmed.toLowerCase().startsWith("javascript:")) {
    return "#";
  }
  return trimmed;
}

// Markdown-to-React Safe Parser (to avoid dangerouslySetInnerHTML)
export function renderFormattedText(text: string) {
  if (!text) return null;
  const paragraphs = text.split("\n\n");

  return paragraphs.map((para, i) => {
    const trimmed = para.trim();
    if (!trimmed) return null;

    if (trimmed.startsWith("### ")) {
      return (
        <h3 key={i} style={{ color: "var(--brand-2)", marginTop: "20px", marginBottom: "10px", fontSize: "1.2rem", fontWeight: "bold" }}>
          {trimmed.slice(4)}
        </h3>
      );
    }
    if (trimmed.startsWith("## ")) {
      return (
        <h2 key={i} style={{ color: "var(--brand-2)", marginTop: "24px", marginBottom: "12px", fontSize: "1.4rem", fontWeight: "bold" }}>
          {trimmed.slice(3)}
        </h2>
      );
    }
    if (trimmed.startsWith("# ")) {
      return (
        <h1 key={i} style={{ color: "var(--brand-2)", marginTop: "28px", marginBottom: "16px", fontSize: "1.6rem", fontWeight: "bold" }}>
          {trimmed.slice(2)}
        </h1>
      );
    }

    // Process inline bold and links
    const parts: React.ReactNode[] = [];
    let currentIndex = 0;

    // Pattern to match bold **text** or links [label](url)
    const pattern = /(\*\*.*?\*\*|\[.*?\]\(.*?\))/g;
    let match;
    let matchCount = 0;

    // Execute regex matching manually
    while ((match = pattern.exec(trimmed)) !== null) {
      const matchStr = match[0];
      const matchIndex = match.index;

      if (matchIndex > currentIndex) {
        parts.push(trimmed.slice(currentIndex, matchIndex));
      }

      if (matchStr.startsWith("**") && matchStr.endsWith("**")) {
        parts.push(<strong key={`b-${matchCount}`}>{matchStr.slice(2, -2)}</strong>);
      } else if (matchStr.startsWith("[")) {
        const textEnd = matchStr.indexOf("]");
        const label = matchStr.slice(1, textEnd);
        const url = matchStr.slice(textEnd + 2, -1);
        parts.push(
          <a
            key={`a-${matchCount}`}
            href={validateUrl(url)}
            className="text-link"
            target="_blank"
            rel="noreferrer"
            style={{ textDecoration: "underline", color: "var(--brand-2)", fontWeight: "bold" }}
          >
            {label}
          </a>
        );
      }

      currentIndex = pattern.lastIndex;
      matchCount++;
    }

    if (currentIndex < trimmed.length) {
      parts.push(trimmed.slice(currentIndex));
    }

    return (
      <p key={i} style={{ marginBottom: "12px", lineHeight: "1.6" }}>
        {parts}
      </p>
    );
  });
}

// Normalization layer mapping CustomPageSection to PageBlock
export function normalizePageBlocks(page: CustomPage): PageBlock[] {
  if (page.blocks && page.blocks.length > 0) {
    return page.blocks;
  }

  const blocks: PageBlock[] = [];
  if (page.sections && page.sections.length > 0) {
    page.sections.forEach((section, index) => {
      // heading
      const headingText = (section.heading.bm || section.heading.en) ? `### ${section.heading.bm || ""}\n\n` : "";

      blocks.push({
        type: "richText",
        id: `${section.id || index}-rich`,
        content: {
          bm: headingText + (section.body.bm || ""),
          en: (section.heading.en ? `### ${section.heading.en}\n\n` : "") + (section.body.en || "")
        }
      });

      if (section.imageUrl) {
        blocks.push({
          type: "image",
          id: `${section.id || index}-img`,
          imageUrl: section.imageUrl,
          alt: { bm: "Imej seksyen", en: "Section image" },
          isDecorative: true
        });
      }

      if (section.buttonHref) {
        blocks.push({
          type: "cta",
          id: `${section.id || index}-cta`,
          title: section.heading,
          label: section.buttonLabel || { bm: "Klik disini", en: "Click here" },
          href: section.buttonHref,
          variant: "primary"
        });
      }
    });
  }

  return blocks;
}

// Normalization function to support both modern and legacy/database schema OrgItems
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeOrgItem(item: any): OrgItem {
  if (!item) {
    return {
      id: "",
      type: "UNIT",
      title: "",
      code: "",
      member_count: 1,
      sort_order: 1,
      is_active: true
    };
  }

  const id = item.item_id || item.id || "";
  const type = (item.item_type || item.type || "UNIT").toUpperCase() as "LEADERSHIP" | "UNIT";
  const is_active = item.is_active !== undefined ? (item.is_active === true || item.is_active === "true" || item.is_active === 1 || item.is_active === "1") : true;

  return {
    id,
    type,
    item_id: id,
    item_type: type,
    title: item.title || "",
    code: item.code || "",
    member_count: item.member_count !== undefined ? Number(item.member_count) : 1,
    sort_order: item.sort_order !== undefined ? Number(item.sort_order) : 1,
    is_active,
    parent_id: item.parent_id || "",
    updated_at: item.updated_at || "",
    updated_by: item.updated_by || ""
  };
}
