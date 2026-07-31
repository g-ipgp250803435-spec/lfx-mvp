"use client";

import { useApp } from "@/components/Providers";
import type { LocalizedText } from "@/lib/types";
import { t } from "@/lib/i18n";

export function PageHero({ eyebrow, title, description, actions }: { eyebrow: LocalizedText; title: LocalizedText; description: LocalizedText; actions?: React.ReactNode }) {
  const { language } = useApp();
  return <section className="page-hero"><div className="page-hero__pattern"/><div className="container"><span className="eyebrow eyebrow--light">{t(eyebrow, language)}</span><h1>{t(title, language)}</h1><p>{t(description, language)}</p>{actions && <div className="page-hero__actions">{actions}</div>}</div></section>;
}
