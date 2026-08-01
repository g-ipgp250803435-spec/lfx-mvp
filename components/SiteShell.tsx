"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import { CmsImage } from "@/components/CmsImage";
import { useApp } from "@/components/Providers";
import { useContent } from "@/components/ContentProvider";
import { t } from "@/lib/i18n";

export function Header() {
  const { language, setLanguage, theme, toggleTheme, labels } = useApp();
  const { content, demo } = useContent();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  if (pathname.startsWith("/admin")) return null;

  return <>
    <a className="skip-link" href="#main-content">Skip to content</a>
    <div className="official-bar">
      <div className="container official-bar__inner">
        <span><Icon name="shield" size={15} /> {labels.portal}</span>
        <span className={`mode-pill ${demo ? "mode-pill--demo" : ""}`}>{demo ? labels.demo : labels.live}</span>
      </div>
    </div>
    {content.notice.enabled && <div className="notice-bar"><div className="container"><strong>{t(content.notice.label, language)}</strong><span>{t(content.notice.text, language)}</span><Link href={content.notice.href}>{labels.learnMore}<Icon name="arrow" size={15}/></Link></div></div>}
    <header className="header">
      <div className="container header__main">
        <Link href="/" className="brand">
          <CmsImage src={content.site.logoUrl || "/lfx-mark.svg"} alt="LFX" width={54} height={54} loading="eager"/>
          <span><strong>{content.site.shortName}</strong><small>{t(content.site.tagline, language)}</small></span>
        </Link>
        <div className="header__actions">
          <div className="language-switch" role="group" aria-label="Language">
            <button className={language === "bm" ? "active" : ""} onClick={() => setLanguage("bm")}>BM</button>
            <button className={language === "en" ? "active" : ""} onClick={() => setLanguage("en")}>EN</button>
          </div>
          <button className="icon-button" onClick={toggleTheme} aria-label={theme === "dark" ? labels.lightMode : labels.darkMode}><Icon name={theme === "dark" ? "sun" : "moon"}/></button>
          <Link href="/permohonan" className="button button--small button--outline"><Icon name="briefcase" size={17}/>{language === "bm" ? "Permohonan Saya" : "My Applications"}</Link>
          <Link href="/admin" className="button button--small button--outline"><Icon name="user" size={17}/>{labels.admin}</Link>
          <button className="menu-button" onClick={() => setOpen(!open)} aria-label={open ? labels.closeMenu : labels.openMenu}><Icon name={open ? "close" : "menu"}/></button>
        </div>
      </div>
      <nav className={`nav ${open ? "nav--open" : ""}`}>
        <div className="container nav__inner">
          {content.navigation.filter((item) => item.enabled).map((item) => <Link key={item.id} href={item.href} onClick={() => setOpen(false)} className={item.href === "/" ? pathname === "/" ? "active" : "" : pathname.startsWith(item.href) ? "active" : ""}>{t(item.label, language)}</Link>)}
        </div>
      </nav>
    </header>
  </>;
}

export function Footer() {
  const pathname = usePathname();
  const { language } = useApp();
  const { content } = useContent();
  if (pathname.startsWith("/admin")) return null;
  return <footer className="footer">
    <div className="container footer__grid">
      <div className="footer__brand"><CmsImage src={content.site.logoUrl || "/lfx-mark.svg"} alt="LFX" width={68} height={68}/><div><strong>{content.site.name}</strong><p>{t(content.footer.about, language)}</p></div></div>
      <div><h3>{language === "bm" ? "Pautan" : "Links"}</h3>{content.footer.links.filter((item) => item.enabled).map((item) => <Link key={item.id} href={item.href}>{t(item.label, language)}</Link>)}</div>
      <div><h3>{language === "bm" ? "Hubungi" : "Contact"}</h3><p>{content.footer.address}</p><a href={`mailto:${content.site.officialEmail}`}>{content.site.officialEmail}</a></div>
    </div>
    <div className="container footer__bottom"><span>© {new Date().getFullYear()} {t(content.footer.copyright, language)}</span><span>LEGASI FINANCE X · v1.0</span></div>
  </footer>;
}
