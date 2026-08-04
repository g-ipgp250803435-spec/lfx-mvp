"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { Icon } from "@/components/Icon";
import { CmsImage } from "@/components/CmsImage";
import { useApp } from "@/components/Providers";
import { useContent } from "@/components/ContentProvider";
import { t } from "@/lib/i18n";

export function Header() {
  const { language, setLanguage, theme, toggleTheme, labels } = useApp();
  const { content } = useContent();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const wasOpenRef = useRef(open);

  useEffect(() => {
    if (wasOpenRef.current && !open) {
      menuButtonRef.current?.focus();
    }
    wasOpenRef.current = open;
  }, [open]);

  // Close on Escape key press
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  // Lock body scroll when navigation drawer is open on mobile
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (pathname.startsWith("/admin")) return null;

  const menuLabel = open
    ? (language === "bm" ? "Tutup menu navigasi" : "Close navigation menu")
    : (language === "bm" ? "Buka menu navigasi" : "Open navigation menu");

  return <>
    <a className="skip-link" href="#main-content">Skip to content</a>
    {content.notice.enabled && <div className="notice-bar"><div className="container"><strong>{t(content.notice.label, language)}</strong><span>{t(content.notice.text, language)}</span><Link href={content.notice.href}>{labels.learnMore}<Icon name="arrow" size={15}/></Link></div></div>}
    <header className="header">
      <div className="container header__main">
        <Link href="/" className="brand">
          <CmsImage src={content.site.logoUrl || "/lfx-mark.svg"} alt="HiPER" width={54} height={54} loading="eager"/>
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
          <button
            ref={menuButtonRef}
            className="menu-button"
            onClick={() => setOpen(!open)}
            aria-label={menuLabel}
            aria-expanded={open}
            aria-controls="navigation-menu"
          >
            <Icon name={open ? "close" : "menu"}/>
          </button>
        </div>
      </div>
      <nav id="navigation-menu" className={`nav ${open ? "nav--open" : ""}`}>
        <div className="container nav__inner">
          {content.navigation.filter((item) => item.enabled).map((item) => <Link key={item.id} href={item.href} onClick={() => setOpen(false)} className={item.href === "/" ? pathname === "/" ? "active" : "" : pathname.startsWith(item.href) ? "active" : ""}>{t(item.label, language)}</Link>)}

          <hr className="nav-divider mobile-only" style={{ border: "0", borderTop: "1px solid var(--line)", margin: "12px 16px", width: "calc(100% - 32px)" }} />

          <div className="nav-mobile-section mobile-only" style={{ width: "100%" }}>
            <div className="nav-mobile-language-switch" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", minHeight: "44px" }}>
              <div className="language-switch" role="group" aria-label="Language" style={{ display: "flex" }}>
                <button
                  className={language === "bm" ? "active" : ""}
                  onClick={() => setLanguage("bm")}
                  aria-label="Bahasa Melayu"
                  aria-current={language === "bm" ? "true" : "false"}
                  style={{ minWidth: "44px", minHeight: "36px" }}
                >
                  BM
                </button>
                <button
                  className={language === "en" ? "active" : ""}
                  onClick={() => setLanguage("en")}
                  aria-label="English"
                  aria-current={language === "en" ? "true" : "false"}
                  style={{ minWidth: "44px", minHeight: "36px" }}
                >
                  EN
                </button>
              </div>
            </div>
          </div>

          <Link
            href="/permohonan"
            onClick={() => setOpen(false)}
            className={`mobile-only ${pathname.startsWith("/permohonan") ? "active" : ""}`}
            style={{ display: "flex", gap: "8px", alignItems: "center" }}
          >
            <Icon name="briefcase" size={17}/>
            {language === "bm" ? "Permohonan Saya" : "My Applications"}
          </Link>

          <Link
            href="/admin"
            onClick={() => setOpen(false)}
            className={`mobile-only ${pathname.startsWith("/admin") ? "active" : ""}`}
            style={{ display: "flex", gap: "8px", alignItems: "center" }}
          >
            <Icon name="user" size={17}/>
            {labels.admin}
          </Link>
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
      <div className="footer__brand"><CmsImage src={content.site.logoUrl || "/lfx-mark.svg"} alt="HiPER" className="footer-logo"/><div><strong>{content.site.name}</strong><p>{t(content.footer.about, language)}</p></div></div>
      <div><h3>{language === "bm" ? "Pautan" : "Links"}</h3>{content.footer.links.filter((item) => item.enabled).map((item) => <Link key={item.id} href={item.href}>{t(item.label, language)}</Link>)}</div>
      {((content.footer.address && content.footer.address.trim().length > 0) || (content.site.officialEmail && content.site.officialEmail.trim().length > 0)) && (
        <div>
          <h3>{language === "bm" ? "Hubungi" : "Contact"}</h3>
          {content.footer.address && content.footer.address.trim().length > 0 && (
            <div className="footer-address" style={{ fontSize: ".84rem", lineHeight: "1.4", color: "var(--footer-link-color)" }}>
              {(() => {
                const address = content.footer.address || "";
                const lines = address.split("\n");
                let foundFirstNonEmpty = false;
                return lines.map((line, idx) => {
                  const trimmed = line.trim();
                  if (!trimmed) {
                    if (!foundFirstNonEmpty) return null;
                    return <br key={idx} />;
                  }
                  if (!foundFirstNonEmpty) {
                    foundFirstNonEmpty = true;
                    return <div key={idx} className="footer-address-bold" style={{ fontWeight: "bold" }}>{trimmed}</div>;
                  }
                  return <div key={idx} className="footer-address-line" style={{ fontWeight: "normal" }}>{trimmed}</div>;
                }).filter((el) => el !== null);
              })()}
            </div>
          )}
          {content.site.officialEmail && content.site.officialEmail.trim().length > 0 && (
            <a href={`mailto:${content.site.officialEmail}`}>{content.site.officialEmail}</a>
          )}
        </div>
      )}
    </div>
    <div className="container footer__bottom">
      <span>© {new Date().getFullYear()} {t(content.footer.copyright, language)}</span>
      <div className="footer-status" aria-label={language === "bm" ? "Status Operasi HiPER: Sistem Beroperasi" : "HiPER Operations Status: Systems Operational"}>
        <span className="live-dot" />
        <span><strong>HiPER Operations</strong> · <small>{language === "bm" ? "Sistem beroperasi" : "Systems operational"}</small></span>
      </div>
      <span>Hab Perbendaharaan Digital · v1.0</span>
    </div>
  </footer>;
}
