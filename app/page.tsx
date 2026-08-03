"use client";

import Link from "next/link";
import { CmsImage } from "@/components/CmsImage";
import { AssetBrowser } from "@/components/AssetBrowser";
import { AnnouncementList } from "@/components/AnnouncementList";
import { TabungDashboard } from "@/components/TabungDashboard";
import { Icon } from "@/components/Icon";
import { useApp } from "@/components/Providers";
import { useContent } from "@/components/ContentProvider";
import { t } from "@/lib/i18n";

export default function HomePage() {
  const { language, labels } = useApp();
  const { content } = useContent();
  return <>
    <section className="hero"><div className="hero__pattern"/><div className="container hero__grid"><div className="hero__content"><span className="eyebrow eyebrow--light">{t(content.hero.eyebrow, language)}</span><h1>{t(content.hero.title, language)}</h1><p>{t(content.hero.description, language)}</p><div className="hero__actions"><Link href={content.hero.primaryButton.href} className="button button--accent">{t(content.hero.primaryButton.label, language)}<Icon name="arrow" size={17}/></Link><Link href={content.hero.secondaryButton.href} className="button button--ghost">{t(content.hero.secondaryButton.label, language)}</Link></div><div className="trust-row"><span><Icon name="check" size={16}/>{language === "bm" ? "Aliran kerja digital" : "Digital workflow"}</span><span><Icon name="shield" size={16}/>{language === "bm" ? "Jejak audit penuh" : "Full audit trail"}</span><span><Icon name="chart" size={16}/>{language === "bm" ? "Data masa nyata" : "Real-time data"}</span></div></div><div className="hero__visual"><div className="hero__orbit hero__orbit--one"/><div className="hero__orbit hero__orbit--two"/><CmsImage src={content.site.logoUrl || "/lfx-mark.svg"} alt="HiPER" width={340} height={340} loading="eager"/></div></div></section>
    <section className="quick-modules"><div className="container module-grid">{content.features.map((feature, index) => <Link href={feature.href} className="module-card" key={feature.id}><span className="module-card__number">0{index + 1}</span><span className="module-card__icon"><Icon name={feature.icon}/></span><h2>{t(feature.title, language)}</h2><p>{t(feature.description, language)}</p><span className="text-link">{labels.learnMore}<Icon name="arrow" size={16}/></span></Link>)}</div></section>
    <section className="section"><div className="container"><div className="section-heading-row"><div className="section-heading"><span className="eyebrow">iAset</span><h2>{language === "bm" ? "Aset kampus, sedia untuk digunakan." : "Campus assets, ready when needed."}</h2><p>{language === "bm" ? "Ketersediaan aset dipaparkan secara terbuka dan dikemas kini apabila penyerahan atau pemulangan direkodkan." : "Availability is publicly visible and updates when handover or return is recorded."}</p></div></div><AssetBrowser compact/></div></section>
    <section className="section section--soft"><div className="container"><div className="section-heading"><span className="eyebrow">Tabung Jumaat</span><h2>{language === "bm" ? "Ketelusan yang boleh dilihat, bukan sekadar dijanjikan." : "Transparency you can see, not merely promise."}</h2></div><TabungDashboard compact/><div className="section-action"><Link href="/tabung-jumaat" className="button button--outline">{labels.publicTransparency}<Icon name="arrow" size={17}/></Link></div></div></section>
    <section className="section"><div className="container"><div className="section-heading-row"><div className="section-heading"><span className="eyebrow">Treasury Announcement Centre</span><h2>{language === "bm" ? "Makluman rasmi, tersusun dan mudah dikongsi." : "Official notices, organised and shareable."}</h2></div><Link href="/announcements" className="text-link">{labels.viewAll}<Icon name="arrow" size={16}/></Link></div><AnnouncementList compact/></div></section>
    <section className="cta-section"><div className="container cta-section__inner"><div><span className="eyebrow eyebrow--light">Hab Perbendaharaan Digital</span><h2>{t(content.site.tagline, language)}</h2><p>{t(content.site.description, language)}</p></div><Link href="/organisation" className="button button--accent">{language === "bm" ? "Kenali pejabat kami" : "Meet our office"}<Icon name="arrow" size={17}/></Link></div></section>
  </>;
}
