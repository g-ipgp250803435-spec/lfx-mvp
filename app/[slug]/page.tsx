"use client";

import { CmsImage } from "@/components/CmsImage";
import { notFound, useParams } from "next/navigation";
import { PageHero } from "@/components/PageHero";
import { useApp } from "@/components/Providers";
import { useContent } from "@/components/ContentProvider";
import { t } from "@/lib/i18n";

export default function CustomPage() {
  const params = useParams<{ slug: string }>();
  const { content, loading } = useContent();
  const { language } = useApp();
  const page = content.customPages.find((item) => item.slug === params.slug && item.published);
  if (loading) return <div className="empty-state page-loading">Loading…</div>;
  if (!page) return notFound();
  return <><PageHero eyebrow={{bm:"LEGASI FINANCE X",en:"LEGASI FINANCE X"}} title={page.title} description={page.summary}/><section className="section"><div className="container container--narrow content-page">{page.heroImage && <CmsImage src={page.heroImage} alt="" width={1000} height={560}/>} {page.sections.map((section) => <article key={section.id}><h2>{t(section.heading, language)}</h2><p>{t(section.body, language)}</p>{section.imageUrl && <CmsImage src={section.imageUrl} alt="" width={900} height={500}/>} {section.buttonHref && <a className="button" href={section.buttonHref}>{t(section.buttonLabel, language)}</a>}</article>)}</div></section></>;
}
