"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { CmsImage } from "@/components/CmsImage";
import { GoogleAuth, type SignedInUser } from "@/components/GoogleAuth";
import { Icon } from "@/components/Icon";
import { QrScanner } from "@/components/QrScanner";
import { StatusBadge } from "@/components/StatusBadge";
import { useApp } from "@/components/Providers";
import { useContent } from "@/components/ContentProvider";
import { apiGet, apiPost, isDemoMode } from "@/lib/api";
import { demoStore } from "@/lib/demo-store";
import { formatDate, money, uid } from "@/lib/format";
import type { Announcement, Asset, IkesApplication, Loan, LocalizedText, MenuItem, Officer, SiteContent, TabungRecord } from "@/lib/types";

type Tab = "overview" | "content" | "assets" | "ikes" | "tabung" | "announcements" | "organisation";
type Flash = { type: "success" | "error"; text: string } | null;

type SessionInfo = { email: string; name: string; role: string };

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

function LocalizedInputs({ label, value, onChange, multiline = false }: { label: string; value: LocalizedText; onChange: (value: LocalizedText) => void; multiline?: boolean }) {
  return <div className="localized-fields"><label><span>{label} · BM</span>{multiline ? <textarea rows={3} value={value.bm} onChange={(event) => onChange({ ...value, bm: event.target.value })}/> : <input value={value.bm} onChange={(event) => onChange({ ...value, bm: event.target.value })}/>}</label><label><span>{label} · EN</span>{multiline ? <textarea rows={3} value={value.en} onChange={(event) => onChange({ ...value, en: event.target.value })}/> : <input value={value.en} onChange={(event) => onChange({ ...value, en: event.target.value })}/>}</label></div>;
}

function FlashMessage({ flash }: { flash: Flash }) {
  return flash ? <div className={`form-message form-message--${flash.type}`}>{flash.text}</div> : null;
}

export function AdminStudio() {
  const { language } = useApp();
  const { content: publicContent, refresh } = useContent();
  const [user, setUser] = useState<SignedInUser | null>(null);
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [checking, setChecking] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");
  const [content, setContent] = useState<SiteContent>(clone(publicContent));
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [ikes, setIkes] = useState<IkesApplication[]>([]);
  const [tabung, setTabung] = useState<TabungRecord[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [flash, setFlash] = useState<Flash>(null);
  const [busy, setBusy] = useState(false);

  const loadData = useCallback(async () => {
    if (isDemoMode) {
      setContent(clone(demoStore.getContent()));
      setAssets(demoStore.getAssets()); setLoans(demoStore.getLoans()); setIkes(demoStore.getIkes()); setTabung(demoStore.getTabung()); setAnnouncements(demoStore.getAnnouncements());
      return;
    }
    if (!user) return;
    const idToken = user.idToken;
    const [contentResult, assetResult, loanResult, ikesResult, tabungResult, announcementResult] = await Promise.all([
      apiGet<SiteContent>("content/get"),
      apiPost<Asset[]>("assets/list", { scope: "admin", idToken }),
      apiPost<Loan[]>("loans/all", { idToken }),
      apiPost<IkesApplication[]>("ikes/all", { idToken }),
      apiGet<TabungRecord[]>("tabung/list"),
      apiGet<Announcement[]>("announcements/list")
    ]);
    setContent(clone(contentResult.data || publicContent));
    setAssets(assetResult.data || []); setLoans(loanResult.data || []); setIkes(ikesResult.data || []); setTabung(tabungResult.data || []); setAnnouncements(announcementResult.data || []);
  }, [user, publicContent]);

  useEffect(() => {
    if (!user) { setSession(null); return; }
    const verify = async () => {
      setChecking(true); setFlash(null);
      try {
        if (isDemoMode) setSession({ email: user.email, name: user.name, role: "ADMIN" });
        else setSession((await apiPost<SessionInfo>("session/me", { idToken: user.idToken })).data || null);
      } catch (error) { setSession(null); setFlash({ type: "error", text: error instanceof Error ? error.message : "Access denied" }); }
      finally { setChecking(false); }
    };
    void verify();
  }, [user]);

  useEffect(() => { if (session?.role === "ADMIN") void loadData(); }, [session, loadData]);

  const run = async (operation: () => Promise<void>, success: string) => {
    setBusy(true); setFlash(null);
    try { await operation(); setFlash({ type: "success", text: success }); }
    catch (error) { setFlash({ type: "error", text: error instanceof Error ? error.message : "Operation failed" }); }
    finally { setBusy(false); }
  };

  const uploadMedia = async (file: File) => {
    if (file.size > 2.5 * 1024 * 1024) throw new Error("Maximum file size is 2.5 MB.");
    const data = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file); });
    if (isDemoMode) return data;
    if (!user) throw new Error("Sign in required.");
    const result = await apiPost<{ url: string }>("file/upload", { idToken: user.idToken, file: { name: file.name, mimeType: file.type, data }, prefix: "LFX_MEDIA" });
    if (!result.data?.url) throw new Error("Upload did not return a URL.");
    return result.data.url;
  };

  const saveContent = () => run(async () => {
    if (isDemoMode) demoStore.saveContent(content);
    else if (user) await apiPost("content/save", { idToken: user.idToken, content });
    await refresh();
  }, language === "bm" ? "Kandungan laman berjaya disimpan." : "Website content saved.");

  const saveAssets = () => run(async () => {
    if (isDemoMode) demoStore.saveAssets(assets);
    else if (user) await apiPost("assets/save", { idToken: user.idToken, assets });
  }, language === "bm" ? "Senarai aset disimpan." : "Asset list saved.");

  const loanDecision = (loanId: string, decision: "APPROVED" | "REJECTED") => {
    const reason = decision === "REJECTED" ? window.prompt("Reason for rejection:") : "";
    if (decision === "REJECTED" && reason === null) return;
    return run(async () => {
      if (isDemoMode) {
        const next = loans.map((loan) => loan.loan_id === loanId ? { ...loan, status: decision, approved_by: user?.email || "demo.admin@ipg.edu.my", qr_code_url: decision === "APPROVED" ? `/loan/verify?loanId=${loan.loan_id}&token=demo` : "" } as Loan : loan);
        setLoans(next); demoStore.saveLoans(next);
      } else if (user) { await apiPost("loan/approve", { idToken: user.idToken, loan_id: loanId, decision, reason: reason || "" }); await loadData(); }
    }, `Loan ${decision.toLowerCase()}.`);
  };

  const scanLoan = (raw: string) => run(async () => {
    let loanId = raw.trim();
    try { const parsed = new URL(raw); loanId = parsed.searchParams.get("loanId") || loanId; } catch { /* direct ID */ }
    if (isDemoMode) {
      const target = loans.find((loan) => loan.loan_id === loanId);
      if (!target) throw new Error("Loan not found");
      if (!['APPROVED', 'ACTIVE'].includes(target.status)) throw new Error(`Loan status ${target.status} cannot be scanned.`);
      const becomingActive = target.status === "APPROVED";
      const nextLoans = loans.map((loan) => loan.loan_id === loanId ? { ...loan, status: becomingActive ? "ACTIVE" : "RETURNED", date_borrowed: becomingActive ? (loan.date_borrowed || new Date().toISOString().slice(0, 10)) : loan.date_borrowed, date_returned_actual: becomingActive ? "" : new Date().toISOString().slice(0, 10) } as Loan : loan);
      const nextAssets = assets.map((asset) => asset.asset_id === target.asset_id ? { ...asset, status: becomingActive ? "ON_LOAN" : "AVAILABLE" } as Asset : asset);
      setLoans(nextLoans); setAssets(nextAssets); demoStore.saveLoans(nextLoans); demoStore.saveAssets(nextAssets);
    } else if (user) { await apiPost("loan/scan", { idToken: user.idToken, qr_payload: raw }); await loadData(); }
  }, language === "bm" ? "Status pinjaman dikemas kini." : "Loan status updated.");

  const ikesDecision = (applicationId: string, status: IkesApplication["status"]) => {
    const reason = status === "REJECTED" ? window.prompt("Reason for rejection (required):") : "";
    if (status === "REJECTED" && (!reason || !reason.trim())) { if (reason !== null) setFlash({ type: "error", text: "A rejection reason is required." }); return; }
    return run(async () => {
      if (isDemoMode) {
        const next = ikes.map((item) => item.application_id === applicationId ? { ...item, status, approved_by: user?.email || "demo.admin@ipg.edu.my", notes: reason ? `${item.notes}${item.notes ? " | " : ""}Admin: ${reason}` : item.notes } : item);
        setIkes(next); demoStore.saveIkes(next);
      } else if (user) { await apiPost(status === "APPROVED" || status === "REJECTED" ? "ikes/approve" : "ikes/status", { idToken: user.idToken, application_id: applicationId, decision: status, status, reason: reason || "" }); await loadData(); }
    }, `iKES status changed to ${status}.`);
  };

  const saveTabungRecord = (record: Omit<TabungRecord, "record_id" | "recorded_by">) => run(async () => {
    if (isDemoMode) {
      const next = [{ ...record, record_id: uid("TBG"), recorded_by: user?.email || "demo.admin@ipg.edu.my" }, ...tabung];
      setTabung(next); demoStore.saveTabung(next);
    } else if (user) { await apiPost("tabung/record", { idToken: user.idToken, ...record }); await loadData(); }
  }, language === "bm" ? "Rekod Tabung Jumaat ditambah." : "Friday Fund record added.");

  const saveAnnouncements = () => run(async () => {
    if (isDemoMode) demoStore.saveAnnouncements(announcements);
    else if (user) await apiPost("announcements/saveAll", { idToken: user.idToken, announcements });
  }, language === "bm" ? "Pengumuman disimpan." : "Announcements saved.");

  if (!user || !session) return <div className="admin-login"><div className="admin-login__panel"><Image src="/lfx-mark.svg" alt="LFX" width={90} height={90}/><span className="eyebrow">LFX Secure Access</span><h1>Content & Operations Studio</h1><p>{language === "bm" ? "Log masuk menggunakan akaun Google kampus yang disenaraikan sebagai ADMIN dalam tbl_users." : "Sign in using a campus Google account listed as ADMIN in tbl_users."}</p><GoogleAuth onUser={setUser}/>{checking && <p className="muted">Verifying role…</p>}<FlashMessage flash={flash}/></div></div>;

  const tabs: Array<{ id: Tab; icon: string; bm: string; en: string }> = [
    { id: "overview", icon: "chart", bm: "Ringkasan", en: "Overview" },
    { id: "content", icon: "edit", bm: "Kandungan", en: "Content" },
    { id: "assets", icon: "briefcase", bm: "iAset", en: "iAset" },
    { id: "ikes", icon: "heart", bm: "iKES", en: "iKES" },
    { id: "tabung", icon: "wallet", bm: "Tabung", en: "Fund" },
    { id: "announcements", icon: "megaphone", bm: "Pengumuman", en: "Announcements" },
    { id: "organisation", icon: "user", bm: "Organisasi", en: "Organisation" }
  ];

  return <div className="admin-shell">
    <aside className="admin-sidebar"><div className="admin-brand"><Image src="/lfx-mark.svg" alt="LFX" width={52} height={52}/><span><strong>LFX Studio</strong><small>{session.email}</small></span></div><nav>{tabs.map((item) => <button key={item.id} className={tab === item.id ? "active" : ""} onClick={() => { setTab(item.id); setFlash(null); }}><Icon name={item.icon}/>{language === "bm" ? item.bm : item.en}</button>)}</nav><a href="/" className="admin-back"><Icon name="arrow" size={17}/>{language === "bm" ? "Lihat portal" : "View portal"}</a></aside>
    <main className="admin-main"><header className="admin-topbar"><div><span className="eyebrow">Office Operating System</span><h1>{tabs.find((item) => item.id === tab)?.[language]}</h1></div><span className="mode-pill">{isDemoMode ? "DEMO" : "LIVE"}</span></header><FlashMessage flash={flash}/>
      {tab === "overview" && <Overview assets={assets} loans={loans} ikes={ikes} tabung={tabung}/>} 
      {tab === "content" && <ContentEditor content={content} setContent={setContent} onSave={saveContent} onUpload={uploadMedia} busy={busy}/>} 
      {tab === "assets" && <AssetAdmin assets={assets} setAssets={setAssets} loans={loans} onSave={saveAssets} onDecision={loanDecision} onScan={scanLoan} busy={busy}/>} 
      {tab === "ikes" && <IkesAdmin applications={ikes} onStatus={ikesDecision} busy={busy}/>} 
      {tab === "tabung" && <TabungAdmin records={tabung} onCreate={saveTabungRecord} busy={busy}/>} 
      {tab === "announcements" && <AnnouncementAdmin items={announcements} setItems={setAnnouncements} onSave={saveAnnouncements} busy={busy}/>} 
      {tab === "organisation" && <OrganisationEditor content={content} setContent={setContent} onSave={saveContent} busy={busy}/>} 
    </main>
  </div>;
}

function Overview({ assets, loans, ikes, tabung }: { assets: Asset[]; loans: Loan[]; ikes: IkesApplication[]; tabung: TabungRecord[] }) {
  const balance = tabung.reduce((sum, item) => sum + (item.type === "COLLECTION" ? Number(item.amount) : -Number(item.amount)), 0);
  const metrics = [
    { label: "Assets available", value: assets.filter((item) => item.status === "AVAILABLE").length, icon: "briefcase" },
    { label: "Loans pending", value: loans.filter((item) => item.status === "PENDING").length, icon: "clock" },
    { label: "iKES pending", value: ikes.filter((item) => item.status === "PENDING").length, icon: "heart" },
    { label: "Friday Fund balance", value: money(balance), icon: "wallet" }
  ];
  return <><div className="admin-metrics">{metrics.map((item) => <article key={item.label}><span><Icon name={item.icon}/></span><strong>{item.value}</strong><small>{item.label}</small></article>)}</div><div className="admin-grid"><section className="admin-card"><div className="admin-card__heading"><h2>Expected returns</h2></div><div className="admin-list">{loans.filter((item) => item.status === "ACTIVE").slice(0, 6).map((loan) => <article key={loan.loan_id}><div><strong>{loan.asset_name || loan.asset_id}</strong><span>{loan.user_name || loan.user_id}</span></div><time>{formatDate(loan.date_returned_expected)}</time></article>)}</div></section><section className="admin-card"><div className="admin-card__heading"><h2>Pending applications</h2></div><div className="admin-list">{[...loans.filter((item) => item.status === "PENDING").map((item) => ({ id: item.loan_id, title: item.asset_name || item.asset_id, meta: "iAset" })), ...ikes.filter((item) => item.status === "PENDING").map((item) => ({ id: item.application_id, title: `${item.type} · ${money(item.amount_requested)}`, meta: "iKES" }))].slice(0, 8).map((item) => <article key={item.id}><div><strong>{item.title}</strong><span>{item.id}</span></div><em>{item.meta}</em></article>)}</div></section></div></>;
}

function ContentEditor({ content, setContent, onSave, onUpload, busy }: { content: SiteContent; setContent: (content: SiteContent) => void; onSave: () => void; onUpload: (file: File) => Promise<string>; busy: boolean }) {
  const [mediaTarget, setMediaTarget] = useState<"logo" | "favicon" | "donation">("logo");
  const [mediaBusy, setMediaBusy] = useState(false);
  const [mediaMessage, setMediaMessage] = useState("");
  const handleMedia = async (file: File) => {
    setMediaBusy(true); setMediaMessage("");
    try {
      const url = await onUpload(file);
      if (mediaTarget === "logo") setContent({ ...content, site: { ...content.site, logoUrl: url } });
      else if (mediaTarget === "favicon") setContent({ ...content, site: { ...content.site, faviconUrl: url } });
      else setContent({ ...content, donation: { ...content.donation, qrImageUrl: url } });
      setMediaMessage("Uploaded and applied. Save website content to publish.");
    } catch (error) { setMediaMessage(error instanceof Error ? error.message : "Upload failed"); } finally { setMediaBusy(false); }
  };
  const updateSite = (patch: Partial<SiteContent["site"]>) => setContent({ ...content, site: { ...content.site, ...patch } });
  const updateMenu = (index: number, patch: Partial<MenuItem>) => { const navigation = [...content.navigation]; navigation[index] = { ...navigation[index], ...patch }; setContent({ ...content, navigation }); };
  const deleteMenu = (index: number) => setContent({ ...content, navigation: content.navigation.filter((_, i) => i !== index) });
  const addMenu = () => setContent({ ...content, navigation: [...content.navigation, { id: uid("nav"), label: { bm: "Menu baharu", en: "New menu" }, href: "/", enabled: true }] });
  const updateFooterLink = (index: number, patch: Partial<MenuItem>) => { const links = [...content.footer.links]; links[index] = { ...links[index], ...patch }; setContent({ ...content, footer: { ...content.footer, links } }); };
  const addFooterLink = () => setContent({ ...content, footer: { ...content.footer, links: [...content.footer.links, { id: uid("footer"), label: { bm: "Pautan baharu", en: "New link" }, href: "/", enabled: true }] } });
  const addPage = () => setContent({ ...content, customPages: [...content.customPages, { id: uid("page"), slug: `page-${content.customPages.length + 1}`, title: { bm: "Halaman Baharu", en: "New Page" }, summary: { bm: "Ringkasan halaman", en: "Page summary" }, published: false, sections: [{ id: uid("section"), heading: { bm: "Tajuk Seksyen", en: "Section Heading" }, body: { bm: "Kandungan halaman.", en: "Page content." } }] }] });
  return <div className="admin-editor">
    <section className="admin-card"><div className="admin-card__heading"><div><h2>Media uploader</h2><p>Upload to Google Drive and apply to a key visual field.</p></div></div><div className="media-uploader"><select value={mediaTarget} onChange={(e) => setMediaTarget(e.target.value as "logo" | "favicon" | "donation")}><option value="logo">Website logo</option><option value="favicon">Favicon</option><option value="donation">Donation QR</option></select><label className="button button--outline"><Icon name="upload" size={17}/>{mediaBusy ? "Uploading…" : "Choose file"}<input hidden disabled={mediaBusy} type="file" accept="image/*" onChange={(e) => { const file=e.target.files?.[0]; if(file) void handleMedia(file); e.currentTarget.value=""; }}/></label></div>{mediaMessage && <p className="muted">{mediaMessage}</p>}</section>
    <section className="admin-card"><div className="admin-card__heading"><div><h2>Site identity</h2><p>Brand, logo, favicon and colours.</p></div></div><div className="form-grid"><label><span>Website name</span><input value={content.site.name} onChange={(e) => updateSite({ name: e.target.value })}/></label><label><span>Short name</span><input value={content.site.shortName} onChange={(e) => updateSite({ shortName: e.target.value })}/></label><label><span>Logo URL</span><input value={content.site.logoUrl} onChange={(e) => updateSite({ logoUrl: e.target.value })}/></label><label><span>Favicon URL</span><input value={content.site.faviconUrl} onChange={(e) => updateSite({ faviconUrl: e.target.value })}/></label><label><span>Primary colour</span><div className="colour-field"><input type="color" value={content.site.primaryColor} onChange={(e) => updateSite({ primaryColor: e.target.value })}/><input value={content.site.primaryColor} onChange={(e) => updateSite({ primaryColor: e.target.value })}/></div></label><label><span>Accent colour</span><div className="colour-field"><input type="color" value={content.site.accentColor} onChange={(e) => updateSite({ accentColor: e.target.value })}/><input value={content.site.accentColor} onChange={(e) => updateSite({ accentColor: e.target.value })}/></div></label></div><LocalizedInputs label="Tagline" value={content.site.tagline} onChange={(tagline) => updateSite({ tagline })}/><LocalizedInputs label="Description" multiline value={content.site.description} onChange={(description) => updateSite({ description })}/></section>
    <section className="admin-card"><div className="admin-card__heading"><div><h2>Homepage hero</h2><p>Edit the main message and buttons.</p></div></div><LocalizedInputs label="Eyebrow" value={content.hero.eyebrow} onChange={(eyebrow) => setContent({ ...content, hero: { ...content.hero, eyebrow } })}/><LocalizedInputs label="Title" value={content.hero.title} onChange={(title) => setContent({ ...content, hero: { ...content.hero, title } })}/><LocalizedInputs label="Description" multiline value={content.hero.description} onChange={(description) => setContent({ ...content, hero: { ...content.hero, description } })}/><div className="form-grid"><label><span>Primary link</span><input value={content.hero.primaryButton.href} onChange={(e) => setContent({ ...content, hero: { ...content.hero, primaryButton: { ...content.hero.primaryButton, href: e.target.value } } })}/></label><label><span>Secondary link</span><input value={content.hero.secondaryButton.href} onChange={(e) => setContent({ ...content, hero: { ...content.hero, secondaryButton: { ...content.hero.secondaryButton, href: e.target.value } } })}/></label></div><LocalizedInputs label="Primary button" value={content.hero.primaryButton.label} onChange={(label) => setContent({ ...content, hero: { ...content.hero, primaryButton: { ...content.hero.primaryButton, label } } })}/><LocalizedInputs label="Secondary button" value={content.hero.secondaryButton.label} onChange={(label) => setContent({ ...content, hero: { ...content.hero, secondaryButton: { ...content.hero.secondaryButton, label } } })}/></section>
    <section className="admin-card"><div className="admin-card__heading"><div><h2>Navigation</h2><p>Names, links, visibility and ordering.</p></div><button className="button button--small button--outline" onClick={addMenu}><Icon name="plus" size={16}/>Add menu</button></div><div className="repeat-list">{content.navigation.map((item, index) => <article key={item.id}><div className="repeat-list__fields"><input aria-label="BM label" value={item.label.bm} onChange={(e) => updateMenu(index, { label: { ...item.label, bm: e.target.value } })}/><input aria-label="EN label" value={item.label.en} onChange={(e) => updateMenu(index, { label: { ...item.label, en: e.target.value } })}/><input aria-label="Link" value={item.href} onChange={(e) => updateMenu(index, { href: e.target.value })}/><label className="check-field"><input type="checkbox" checked={item.enabled} onChange={(e) => updateMenu(index, { enabled: e.target.checked })}/>Visible</label></div><button className="danger-icon" onClick={() => deleteMenu(index)}><Icon name="trash" size={17}/></button></article>)}</div></section>
    <section className="admin-card"><div className="admin-card__heading"><div><h2>Notice bar</h2><p>Control the announcement strip above the main header.</p></div><label className="check-field"><input type="checkbox" checked={content.notice.enabled} onChange={(e) => setContent({ ...content, notice: { ...content.notice, enabled: e.target.checked } })}/>Enabled</label></div><LocalizedInputs label="Label" value={content.notice.label} onChange={(label) => setContent({ ...content, notice: { ...content.notice, label } })}/><LocalizedInputs label="Notice text" value={content.notice.text} onChange={(text) => setContent({ ...content, notice: { ...content.notice, text } })}/><label><span>Notice link</span><input value={content.notice.href} onChange={(e) => setContent({ ...content, notice: { ...content.notice, href: e.target.value } })}/></label></section>
    <section className="admin-card"><div className="admin-card__heading"><div><h2>Homepage modules</h2><p>Edit the four primary feature cards.</p></div></div><div className="page-editor-list">{content.features.map((feature,index) => <article key={feature.id}><div className="form-grid"><label><span>Icon name</span><input value={feature.icon} onChange={(e) => { const features=[...content.features]; features[index]={...feature,icon:e.target.value}; setContent({...content,features}); }}/></label><label><span>Link</span><input value={feature.href} onChange={(e) => { const features=[...content.features]; features[index]={...feature,href:e.target.value}; setContent({...content,features}); }}/></label></div><LocalizedInputs label="Title" value={feature.title} onChange={(title) => { const features=[...content.features]; features[index]={...feature,title}; setContent({...content,features}); }}/><LocalizedInputs label="Description" multiline value={feature.description} onChange={(description) => { const features=[...content.features]; features[index]={...feature,description}; setContent({...content,features}); }}/></article>)}</div></section>
    <section className="admin-card"><div className="admin-card__heading"><div><h2>Footer</h2><p>Edit footer text, address and links.</p></div><button className="button button--small button--outline" onClick={addFooterLink}><Icon name="plus" size={16}/>Add footer link</button></div><LocalizedInputs label="About" multiline value={content.footer.about} onChange={(about) => setContent({ ...content, footer: { ...content.footer, about } })}/><label><span>Office address</span><input value={content.footer.address} onChange={(e) => setContent({ ...content, footer: { ...content.footer, address: e.target.value } })}/></label><LocalizedInputs label="Copyright" value={content.footer.copyright} onChange={(copyright) => setContent({ ...content, footer: { ...content.footer, copyright } })}/><div className="repeat-list">{content.footer.links.map((item,index) => <article key={item.id}><div className="repeat-list__fields"><input value={item.label.bm} aria-label="Footer BM" onChange={(e) => updateFooterLink(index,{label:{...item.label,bm:e.target.value}})}/><input value={item.label.en} aria-label="Footer EN" onChange={(e) => updateFooterLink(index,{label:{...item.label,en:e.target.value}})}/><input value={item.href} aria-label="Footer link" onChange={(e) => updateFooterLink(index,{href:e.target.value})}/><label className="check-field"><input type="checkbox" checked={item.enabled} onChange={(e) => updateFooterLink(index,{enabled:e.target.checked})}/>Visible</label></div><button className="danger-icon" onClick={() => setContent({...content,footer:{...content.footer,links:content.footer.links.filter((_,i)=>i!==index)}})}><Icon name="trash" size={17}/></button></article>)}</div></section>
    <section className="admin-card"><div className="admin-card__heading"><div><h2>Friday Fund donation</h2><p>Public donation method and weekly target.</p></div></div><LocalizedInputs label="Heading" value={content.donation.heading} onChange={(heading) => setContent({ ...content, donation: { ...content.donation, heading } })}/><LocalizedInputs label="Description" multiline value={content.donation.description} onChange={(description) => setContent({ ...content, donation: { ...content.donation, description } })}/><div className="form-grid"><label><span>Weekly target (RM)</span><input type="number" value={content.donation.target} onChange={(e) => setContent({ ...content, donation: { ...content.donation, target: Number(e.target.value) } })}/></label><label><span>Payment link</span><input value={content.donation.paymentUrl} onChange={(e) => setContent({ ...content, donation: { ...content.donation, paymentUrl: e.target.value } })}/></label><label><span>Bank</span><input value={content.donation.bankName} onChange={(e) => setContent({ ...content, donation: { ...content.donation, bankName: e.target.value } })}/></label><label><span>Account name</span><input value={content.donation.accountName} onChange={(e) => setContent({ ...content, donation: { ...content.donation, accountName: e.target.value } })}/></label><label><span>Account number</span><input value={content.donation.accountNumber} onChange={(e) => setContent({ ...content, donation: { ...content.donation, accountNumber: e.target.value } })}/></label><label><span>QR image URL</span><input value={content.donation.qrImageUrl} onChange={(e) => setContent({ ...content, donation: { ...content.donation, qrImageUrl: e.target.value } })}/></label></div></section>
    <section className="admin-card"><div className="admin-card__heading"><div><h2>Custom pages</h2><p>Add simple bilingual information pages.</p></div><button className="button button--small button--outline" onClick={addPage}><Icon name="plus" size={16}/>Add page</button></div><div className="page-editor-list">{content.customPages.map((page, pageIndex) => <article key={page.id}><div className="page-editor-list__top"><strong>/{page.slug}</strong><label className="check-field"><input type="checkbox" checked={page.published} onChange={(e) => { const pages = [...content.customPages]; pages[pageIndex] = { ...page, published: e.target.checked }; setContent({ ...content, customPages: pages }); }}/>Published</label><button className="danger-icon" onClick={() => setContent({ ...content, customPages: content.customPages.filter((_, i) => i !== pageIndex) })}><Icon name="trash" size={17}/></button></div><div className="form-grid"><label><span>Slug</span><input value={page.slug} onChange={(e) => { const pages = [...content.customPages]; pages[pageIndex] = { ...page, slug: e.target.value.replace(/[^a-z0-9-]/g, "-") }; setContent({ ...content, customPages: pages }); }}/></label><label><span>Hero image URL</span><input value={page.heroImage || ""} onChange={(e) => { const pages = [...content.customPages]; pages[pageIndex] = { ...page, heroImage: e.target.value }; setContent({ ...content, customPages: pages }); }}/></label></div><LocalizedInputs label="Page title" value={page.title} onChange={(title) => { const pages = [...content.customPages]; pages[pageIndex] = { ...page, title }; setContent({ ...content, customPages: pages }); }}/><LocalizedInputs label="Summary" multiline value={page.summary} onChange={(summary) => { const pages = [...content.customPages]; pages[pageIndex] = { ...page, summary }; setContent({ ...content, customPages: pages }); }}/>{page.sections.map((section, sectionIndex) => <div className="section-editor" key={section.id}><LocalizedInputs label={`Section ${sectionIndex + 1} heading`} value={section.heading} onChange={(heading) => { const pages = [...content.customPages]; const sections = [...page.sections]; sections[sectionIndex] = { ...section, heading }; pages[pageIndex] = { ...page, sections }; setContent({ ...content, customPages: pages }); }}/><LocalizedInputs label="Body" multiline value={section.body} onChange={(body) => { const pages = [...content.customPages]; const sections = [...page.sections]; sections[sectionIndex] = { ...section, body }; pages[pageIndex] = { ...page, sections }; setContent({ ...content, customPages: pages }); }}/></div>)}</article>)}</div></section>
    <div className="sticky-save"><button disabled={busy} className="button" onClick={onSave}><Icon name="save" size={17}/>{busy ? "Saving…" : "Save website content"}</button></div>
  </div>;
}

function AssetAdmin({ assets, setAssets, loans, onSave, onDecision, onScan, busy }: { assets: Asset[]; setAssets: (assets: Asset[]) => void; loans: Loan[]; onSave: () => void; onDecision: (id: string, decision: "APPROVED" | "REJECTED") => void; onScan: (value: string) => void; busy: boolean }) {
  const [scan, setScan] = useState("");
  const pending = loans.filter((loan) => loan.status === "PENDING");
  const addAsset = () => setAssets([...assets, { asset_id: uid("AST").toUpperCase(), name: "New asset", category: "General", image_url: "/asset-placeholder.svg", status: "AVAILABLE", description: "" }]);
  return <div className="admin-editor"><section className="admin-card"><div className="admin-card__heading"><div><h2>Pending loan requests</h2><p>Approve or reject with a full audit record.</p></div></div><div className="data-table"><div className="data-table__head"><span>Applicant</span><span>Asset / purpose</span><span>Dates</span><span>Action</span></div>{pending.map((loan) => <div className="data-table__row" key={loan.loan_id}><span><strong>{loan.user_name || loan.user_id}</strong><small>{loan.loan_id}</small></span><span><strong>{loan.asset_name || loan.asset_id}</strong><small>{loan.purpose}</small></span><span><small>{loan.date_borrowed} → {loan.date_returned_expected}</small></span><span className="row-actions"><button disabled={busy} className="approve-button" onClick={() => onDecision(loan.loan_id, "APPROVED")}><Icon name="check" size={15}/>Approve</button><button disabled={busy} className="reject-button" onClick={() => onDecision(loan.loan_id, "REJECTED")}><Icon name="close" size={15}/>Reject</button></span></div>)}</div>{!pending.length && <div className="empty-state">No pending requests.</div>}</section>
    <section className="admin-card"><div className="admin-card__heading"><div><h2>QR handover / return</h2><p>Approved → Active → Returned. The asset status follows automatically.</p></div></div><div className="scan-panel"><label><span>QR URL or loan ID</span><input value={scan} onChange={(e) => setScan(e.target.value)} placeholder="LON-... or scanned URL"/></label><button disabled={!scan || busy} className="button" onClick={() => onScan(scan)}>Process scan</button><QrScanner onScan={(value) => { setScan(value); onScan(value); }}/></div></section>
    <section className="admin-card"><div className="admin-card__heading"><div><h2>Asset register</h2><p>Edit status, picture URL and asset details.</p></div><button className="button button--small button--outline" onClick={addAsset}><Icon name="plus" size={16}/>Add asset</button></div><div className="asset-admin-list">{assets.map((asset, index) => <article key={asset.asset_id}><CmsImage src={asset.image_url || "/asset-placeholder.svg"} alt="" width={68} height={68}/><div className="asset-admin-fields"><input value={asset.asset_id} onChange={(e) => { const next = [...assets]; next[index] = { ...asset, asset_id: e.target.value }; setAssets(next); }}/><input value={asset.name} onChange={(e) => { const next = [...assets]; next[index] = { ...asset, name: e.target.value }; setAssets(next); }}/><input value={asset.category} onChange={(e) => { const next = [...assets]; next[index] = { ...asset, category: e.target.value }; setAssets(next); }}/><select value={asset.status} onChange={(e) => { const next = [...assets]; next[index] = { ...asset, status: e.target.value as Asset["status"] }; setAssets(next); }}><option>AVAILABLE</option><option>ON_LOAN</option><option>DAMAGED</option><option>MAINTENANCE</option></select><input className="wide" value={asset.image_url} placeholder="Image URL" onChange={(e) => { const next = [...assets]; next[index] = { ...asset, image_url: e.target.value }; setAssets(next); }}/><textarea className="wide" value={asset.description} placeholder="Description" onChange={(e) => { const next = [...assets]; next[index] = { ...asset, description: e.target.value }; setAssets(next); }}/></div><button className="danger-icon" onClick={() => setAssets(assets.filter((_, i) => i !== index))}><Icon name="trash" size={17}/></button></article>)}</div><div className="admin-card__footer"><button disabled={busy} className="button" onClick={onSave}><Icon name="save" size={17}/>Save assets</button></div></section></div>;
}

function IkesAdmin({ applications, onStatus, busy }: { applications: IkesApplication[]; onStatus: (id: string, status: IkesApplication["status"]) => void; busy: boolean }) {
  return <section className="admin-card"><div className="admin-card__heading"><div><h2>iKES applications</h2><p>Approval records only. No bank transaction is performed by the system.</p></div></div><div className="data-table data-table--ikes"><div className="data-table__head"><span>Applicant</span><span>Application</span><span>Notes / proof</span><span>Status & action</span></div>{applications.sort((a,b) => b.request_date.localeCompare(a.request_date)).map((item) => <div className="data-table__row" key={item.application_id}><span><strong>{item.user_name || item.user_id}</strong><small>{item.application_id} · {formatDate(item.request_date)}</small></span><span><strong>{item.type} · {money(item.amount_requested)}</strong></span><span><small>{item.notes || "—"}</small>{item.ticket_proof_url && <a className="text-link" href={item.ticket_proof_url} target="_blank" rel="noreferrer">View proof</a>}</span><span><StatusBadge status={item.status}/><select disabled={busy || ["REJECTED", "REPAID"].includes(item.status)} value={item.status} onChange={(e) => onStatus(item.application_id, e.target.value as IkesApplication["status"])}>{(item.status === "PENDING" ? ["PENDING", "APPROVED", "REJECTED"] : item.status === "APPROVED" ? ["APPROVED", "PAID"] : item.status === "PAID" ? ["PAID", "REPAID"] : [item.status]).map((status) => <option key={status}>{status}</option>)}</select></span></div>)}</div></section>;
}

function TabungAdmin({ records, onCreate, busy }: { records: TabungRecord[]; onCreate: (record: Omit<TabungRecord, "record_id" | "recorded_by">) => void; busy: boolean }) {
  const [form, setForm] = useState<Omit<TabungRecord, "record_id" | "recorded_by">>({ type: "COLLECTION", amount: 0, date: new Date().toISOString().slice(0,10), description: "", recipient: "" });
  return <div className="admin-grid"><section className="admin-card"><div className="admin-card__heading"><div><h2>Add record</h2><p>Every collection and distribution becomes part of the public report.</p></div></div><form className="application-form" onSubmit={(e) => { e.preventDefault(); onCreate(form); setForm({ ...form, amount: 0, description: "", recipient: "" }); }}><label><span>Type</span><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as TabungRecord["type"] })}><option>COLLECTION</option><option>DISTRIBUTION</option></select></label><label><span>Amount (RM)</span><input required type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}/></label><label><span>Date</span><input required type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}/></label><label><span>Description / purpose</span><textarea required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}/></label>{form.type === "DISTRIBUTION" && <label><span>Recipient (optional)</span><input value={form.recipient || ""} onChange={(e) => setForm({ ...form, recipient: e.target.value })}/></label>}<button disabled={busy} className="button" type="submit"><Icon name="plus" size={17}/>Add record</button></form></section><section className="admin-card"><div className="admin-card__heading"><h2>Recent records</h2></div><div className="admin-list">{records.slice().sort((a,b) => b.date.localeCompare(a.date)).slice(0,12).map((record) => <article key={record.record_id}><div><strong>{record.description}</strong><span>{record.type} · {formatDate(record.date)}</span></div><b className={record.type === "COLLECTION" ? "positive" : "negative"}>{record.type === "COLLECTION" ? "+" : "−"}{money(record.amount)}</b></article>)}</div></section></div>;
}

function AnnouncementAdmin({ items, setItems, onSave, busy }: { items: Announcement[]; setItems: (items: Announcement[]) => void; onSave: () => void; busy: boolean }) {
  const add = () => setItems([{ announcement_id: uid("ANN").toUpperCase(), title: { bm: "Pengumuman baharu", en: "New announcement" }, content: { bm: "Kandungan pengumuman.", en: "Announcement content." }, category: "General", attachment_url: "", publish_date: new Date().toISOString().slice(0,10), created_by: "", responsible_officer: "" }, ...items]);
  return <section className="admin-card"><div className="admin-card__heading"><div><h2>Announcement Centre</h2><p>Create bilingual notices, categories and PDF links.</p></div><button className="button button--small button--outline" onClick={add}><Icon name="plus" size={16}/>New announcement</button></div><div className="announcement-editor">{items.map((item,index) => <article key={item.announcement_id}><div className="page-editor-list__top"><strong>{item.announcement_id}</strong><button className="danger-icon" onClick={() => setItems(items.filter((_,i) => i !== index))}><Icon name="trash" size={17}/></button></div><LocalizedInputs label="Title" value={item.title} onChange={(title) => { const next=[...items]; next[index]={...item,title}; setItems(next); }}/><LocalizedInputs label="Content" multiline value={item.content} onChange={(content) => { const next=[...items]; next[index]={...item,content}; setItems(next); }}/><div className="form-grid"><label><span>Category</span><input value={item.category} onChange={(e) => { const next=[...items]; next[index]={...item,category:e.target.value}; setItems(next); }}/></label><label><span>Publish date</span><input type="date" value={item.publish_date} onChange={(e) => { const next=[...items]; next[index]={...item,publish_date:e.target.value}; setItems(next); }}/></label><label><span>Attachment URL</span><input value={item.attachment_url} onChange={(e) => { const next=[...items]; next[index]={...item,attachment_url:e.target.value}; setItems(next); }}/></label><label><span>Responsible officer</span><input value={item.responsible_officer || ""} onChange={(e) => { const next=[...items]; next[index]={...item,responsible_officer:e.target.value}; setItems(next); }}/></label></div></article>)}</div><div className="admin-card__footer"><button disabled={busy} className="button" onClick={onSave}><Icon name="save" size={17}/>Save announcements</button></div></section>;
}

function OrganisationEditor({ content, setContent, onSave, busy }: { content: SiteContent; setContent: (content: SiteContent) => void; onSave: () => void; busy: boolean }) {
  const add = () => setContent({ ...content, organisation: [...content.organisation, { id: uid("officer"), name: "New officer", position: { bm: "Jawatan", en: "Position" }, portfolio: { bm: "Portfolio", en: "Portfolio" }, email: "", responsibilities: { bm: "", en: "" }, photoUrl: "/officer-placeholder.svg", level: 2 }] });
  const update = (index: number, patch: Partial<Officer>) => { const organisation=[...content.organisation]; organisation[index]={...organisation[index],...patch}; setContent({...content,organisation}); };
  return <section className="admin-card"><div className="admin-card__heading"><div><h2>Organisation chart</h2><p>Level 1 appears above level 2, and so forth.</p></div><button className="button button--small button--outline" onClick={add}><Icon name="plus" size={16}/>Add officer</button></div><div className="organisation-editor">{content.organisation.map((officer,index) => <article key={officer.id}><CmsImage src={officer.photoUrl || "/officer-placeholder.svg"} alt="" width={84} height={84}/><div><div className="form-grid"><label><span>Name</span><input value={officer.name} onChange={(e) => update(index,{name:e.target.value})}/></label><label><span>Email</span><input type="email" value={officer.email} onChange={(e) => update(index,{email:e.target.value})}/></label><label><span>Photo URL</span><input value={officer.photoUrl} onChange={(e) => update(index,{photoUrl:e.target.value})}/></label><label><span>Chart level</span><input type="number" min="1" value={officer.level} onChange={(e) => update(index,{level:Number(e.target.value)})}/></label></div><LocalizedInputs label="Position" value={officer.position} onChange={(position)=>update(index,{position})}/><LocalizedInputs label="Portfolio" value={officer.portfolio} onChange={(portfolio)=>update(index,{portfolio})}/><LocalizedInputs label="Responsibilities" multiline value={officer.responsibilities} onChange={(responsibilities)=>update(index,{responsibilities})}/></div><button className="danger-icon" onClick={() => setContent({...content,organisation:content.organisation.filter((_,i)=>i!==index)})}><Icon name="trash" size={17}/></button></article>)}</div><div className="admin-card__footer"><button disabled={busy} className="button" onClick={onSave}><Icon name="save" size={17}/>Save organisation</button></div></section>;
}
