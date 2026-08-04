"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CmsImage } from "@/components/CmsImage";
import { GoogleAuth, type SignedInUser } from "@/components/GoogleAuth";
import { MediaUploader } from "@/components/MediaUploader";
import { RejectionDialog } from "@/components/RejectionDialog";
import { TabungChart, AssetUtilisationChart } from "@/components/LightweightCharts";
import { normalizePageBlocks, normalizeOrgItem } from "@/lib/block-utils";
import { Icon } from "@/components/Icon";
import { QrScanner } from "@/components/QrScanner";
import { StatusBadge } from "@/components/StatusBadge";
import { useApp } from "@/components/Providers";
import { useContent } from "@/components/ContentProvider";
import { apiGet, apiPost, isDemoMode } from "@/lib/api";
import { demoStore } from "@/lib/demo-store";
import { formatDate, money, uid } from "@/lib/format";
import type { Announcement, Asset, IkesApplication, Loan, LocalizedText, MenuItem, PageBlock, SiteContent, TabungRecord, OrgItem } from "@/lib/types";

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

  // Force dark theme on mount for the login screen, restore preference on unmount or authentication
  useEffect(() => {
    const savedTheme = localStorage.getItem("lfx-theme") as "light" | "dark" | null;
    const preferredDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const userThemePreference = savedTheme || (preferredDark ? "dark" : "light");

    if (!user || !session) {
      document.documentElement.dataset.theme = "dark";
    } else {
      document.documentElement.dataset.theme = userThemePreference;
    }

    return () => {
      // Restore standard preference upon unmount/leaving admin route
      document.documentElement.dataset.theme = userThemePreference;
    };
  }, [user, session]);

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [rejectingLoanId, setRejectingLoanId] = useState<string | null>(null);
  const [rejectingIkesId, setRejectingIkesId] = useState<string | null>(null);

  const [organisationItems, setOrganisationItems] = useState<OrgItem[]>([]);
  const [organisationOfficers, setOrganisationOfficers] = useState<any[]>([]);

  const loadOrgItems = useCallback(async () => {
    try {
      if (isDemoMode) {
        const data = demoStore.getOrganisationItems() as any;
        setOrganisationItems((data.items || []).map(normalizeOrgItem));
        setOrganisationOfficers(data.officers || []);
      } else {
        const res = await apiGet<any>("organisation/get");
        if (res.ok && res.data) {
          setOrganisationItems((res.data.items || []).map(normalizeOrgItem));
          setOrganisationOfficers(res.data.officers || []);
        }
      }
    } catch (e) {
      console.error("Failed to load organization items", e);
    }
  }, []);

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
    if (!user) {
      setTimeout(() => {
        setSession(null);
      }, 0);
      return;
    }
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

  useEffect(() => {
    if (session?.role === "ADMIN") {
      setTimeout(() => {
        void loadData();
      }, 0);
    }
  }, [session, loadData]);

  useEffect(() => {
    if (session?.role === "ADMIN") {
      setTimeout(() => {
        void loadOrgItems();
      }, 0);
    }
  }, [session, loadOrgItems]);

  const run = async (operation: () => Promise<void>, success: string) => {
    setBusy(true); setFlash(null);
    try { await operation(); setFlash({ type: "success", text: success }); }
    catch (error) { setFlash({ type: "error", text: error instanceof Error ? error.message : "Operation failed" }); }
    finally { setBusy(false); }
  };

  const saveContent = () => run(async () => {
    const email = content.site.officialEmail || "";
    if (email.trim() !== "") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error(language === "bm" ? "Masukkan alamat e-mel yang sah." : "Please enter a valid email address.");
      }
    }
    if (isDemoMode) demoStore.saveContent(content);
    else if (user) await apiPost("content/save", { idToken: user.idToken, content });
    await refresh();
  }, language === "bm" ? "Kandungan laman berjaya disimpan." : "Website content saved.");

  const saveAssets = () => run(async () => {
    if (isDemoMode) demoStore.saveAssets(assets);
    else if (user) await apiPost("assets/save", { idToken: user.idToken, assets });
  }, language === "bm" ? "Senarai aset disimpan." : "Asset list saved.");

  const loanDecision = (loanId: string, decision: "APPROVED" | "REJECTED") => {
    if (decision === "REJECTED") {
      setRejectingLoanId(loanId);
      return;
    }
    return run(async () => {
      if (isDemoMode) {
        const next = loans.map((loan) => loan.loan_id === loanId ? { ...loan, status: decision, approved_by: user?.email || "demo.admin@ipg.edu.my", qr_code_url: decision === "APPROVED" ? `/loan/verify?loanId=${loan.loan_id}&token=demo` : "" } as Loan : loan);
        setLoans(next); demoStore.saveLoans(next);
      } else if (user) { await apiPost("loan/approve", { idToken: user.idToken, loan_id: loanId, decision, reason: "" }); await loadData(); }
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
    const item = ikes.find((a) => a.application_id === applicationId);
    if (!item) return;

    if (status === "REJECTED") {
      setRejectingIkesId(applicationId);
      return;
    }

    let amountApproved = 0;
    let repaymentTermDays = 0;
    let paymentDate = "";

    if (status === "APPROVED") {
      const amtStr = window.prompt("Enter approved amount (RM):", String(item.amount_requested));
      if (amtStr === null) return;
      amountApproved = Number(amtStr);
      if (isNaN(amountApproved) || amountApproved <= 0) {
        setFlash({ type: "error", text: "Approved amount must be a positive number." });
        return;
      }
      const termStr = window.prompt("Enter repayment term in days:", "3");
      if (termStr === null) return;
      repaymentTermDays = parseInt(termStr, 10);
      if (isNaN(repaymentTermDays) || repaymentTermDays <= 0) {
        setFlash({ type: "error", text: "Repayment term must be a positive integer." });
        return;
      }
    } else if (status === "PAID") {
      const defaultDate = new Date().toISOString().slice(0, 10);
      const dateStr = window.prompt("Enter payment date (YYYY-MM-DD):", defaultDate);
      if (dateStr === null) return;
      paymentDate = dateStr.trim();
      if (!paymentDate) {
        setFlash({ type: "error", text: "Payment date is required." });
        return;
      }
    }

    return run(async () => {
      if (isDemoMode) {
        const next = ikes.map((app) => {
          if (app.application_id === applicationId) {
            const patch: Partial<IkesApplication> = {
              status,
              approved_by: user?.email || "demo.admin@ipg.edu.my"
            };
            if (status === "APPROVED") {
              patch.amount_approved = amountApproved;
              patch.repayment_term_days = repaymentTermDays;
              patch.outstanding_amount = amountApproved;
              patch.amount_repaid = 0;
              patch.decision_date = new Date().toISOString().slice(0, 10);
            } else if (status === "PAID") {
              patch.payment_date = paymentDate;
              const termDays = app.repayment_term_days || 0;
              if (termDays > 0) {
                const pDate = new Date(paymentDate);
                pDate.setDate(pDate.getDate() + termDays);
                patch.repayment_due_date = pDate.toISOString().slice(0, 10);
              }
              patch.amount_repaid = app.amount_repaid || 0;
              patch.outstanding_amount = Math.max(0, (app.amount_approved || 0) - (patch.amount_repaid || 0));
            } else if (status === "REPAID") {
              patch.amount_repaid = app.amount_approved || 0;
              patch.outstanding_amount = 0;
            }
            return { ...app, ...patch } as IkesApplication;
          }
          return app;
        });
        setIkes(next);
        demoStore.saveIkes(next);
      } else if (user) {
        if (status === "APPROVED") {
          await apiPost("ikes/approve", {
            idToken: user.idToken,
            application_id: applicationId,
            decision: "APPROVED",
            amount_approved: amountApproved,
            repayment_term_days: repaymentTermDays
          });
        } else if (status === "PAID") {
          await apiPost("ikes/status", {
            idToken: user.idToken,
            application_id: applicationId,
            status: "PAID",
            payment_date: paymentDate
          });
        } else {
          await apiPost("ikes/status", {
            idToken: user.idToken,
            application_id: applicationId,
            status: "REPAID"
          });
        }
        await loadData();
      }
    }, `iKES status changed to ${status}.`);
  };

  const ikesRepayment = (applicationId: string) => {
    const amtStr = window.prompt("Enter repayment amount (RM):");
    if (amtStr === null) return;
    const amt = Number(amtStr);
    if (isNaN(amt) || amt <= 0) {
      setFlash({ type: "error", text: "Invalid repayment amount." });
      return;
    }
    const dateStr = window.prompt("Enter repayment date (YYYY-MM-DD, optional):", new Date().toISOString().slice(0, 10));
    if (dateStr === null) return;

    return run(async () => {
      if (isDemoMode) {
        const next = ikes.map((item) => {
          if (item.application_id === applicationId) {
            const currentRepaid = item.amount_repaid || 0;
            const approved = item.amount_approved || 0;
            const newRepaid = currentRepaid + amt;
            const newOutstanding = Math.max(0, approved - newRepaid);
            const status = newOutstanding <= 0 ? "REPAID" : "PAID";
            return {
              ...item,
              status,
              amount_repaid: newRepaid,
              outstanding_amount: newOutstanding
            } as IkesApplication;
          }
          return item;
        });
        setIkes(next);
        demoStore.saveIkes(next);
      } else if (user) {
        await apiPost("ikes/repayment", {
          idToken: user.idToken,
          application_id: applicationId,
          amount: amt,
          repayment_date: dateStr.trim() || undefined
        });
        await loadData();
      }
    }, `Repayment of RM${amt.toFixed(2)} recorded.`);
  };

  const ikesDelete = (applicationId: string) => run(async () => {
    try {
      if (isDemoMode) {
        const next = ikes.filter((item) => item.application_id !== applicationId);
        setIkes(next); demoStore.saveIkes(next);
      } else if (user) {
        await apiPost("ikes/delete", { idToken: user.idToken, application_id: applicationId });
        const next = ikes.filter((item) => item.application_id !== applicationId);
        setIkes(next);
      }
    } catch {
      throw new Error(language === "bm" ? "Rekod permohonan tidak dapat dipadamkan. Sila cuba lagi." : "iKES record could not be deleted. Please try again.");
    }
  }, language === "bm" ? "Rekod permohonan iKES berjaya dipadamkan." : "iKES application record successfully deleted.");

  const saveTabungRecord = (record: Omit<TabungRecord, "record_id" | "recorded_by">) => run(async () => {
    if (isDemoMode) {
      const next = [{ ...record, record_id: uid("TBG"), recorded_by: user?.email || "demo.admin@ipg.edu.my" }, ...tabung];
      setTabung(next); demoStore.saveTabung(next);
    } else if (user) { await apiPost("tabung/record", { idToken: user.idToken, ...record }); await loadData(); }
  }, language === "bm" ? "Rekod Tabung Jumaat ditambah." : "Friday Fund record added.");

  const deleteTabungRecord = (recordId: string) => run(async () => {
    if (isDemoMode) {
      const next = tabung.filter((r) => r.record_id !== recordId);
      setTabung(next);
      demoStore.saveTabung(next);
    } else if (user) {
      await apiPost("tabung/delete", { idToken: user.idToken, record_id: recordId });
      await loadData();
    }
  }, language === "bm" ? "Rekod Tabung Jumaat berjaya dipadamkan." : "Friday Fund record successfully deleted.");

  const toggleTabungVisibility = async (recordId: string, displayOnPublic: boolean) => {
    setBusy(true);
    try {
      if (isDemoMode) {
        const next = tabung.map((r) => r.record_id === recordId ? { ...r, display_on_public: displayOnPublic ? "true" : "false" } : r);
        setTabung(next);
        demoStore.saveTabung(next);
      } else if (user) {
        await apiPost("tabung/toggle-visibility", { idToken: user.idToken, record_id: recordId, display_on_public: displayOnPublic ? "true" : "false" });
        await loadData();
      }
    } catch (e) {
      setFlash({ type: "error", text: e instanceof Error ? e.message : "Failed to toggle visibility" });
    } finally {
      setBusy(false);
    }
  };

  const saveAnnouncements = () => run(async () => {
    if (isDemoMode) demoStore.saveAnnouncements(announcements);
    else if (user) await apiPost("announcements/saveAll", { idToken: user.idToken, announcements });
  }, language === "bm" ? "Pengumuman disimpan." : "Announcements saved.");

  const saveOrgItems = async (itemsToSave: OrgItem[], officersToSave: any[]) => {
    return run(async () => {
      // Filter out completely empty placeholder rows (i.e. rows without non-empty title)
      const validItems = itemsToSave.filter(item => item.title && item.title.trim() !== "");
      if (validItems.length === 0) {
        throw new Error(language === "bm" ? "Sekurang-kurangnya satu item organisasi diperlukan." : "At least one organisation item is required.");
      }

      // Validate unique codes
      const codes = new Set<string>();
      for (const item of validItems) {
        if (!item.title.trim()) {
          throw new Error("Title is required for all items.");
        }
        if (isNaN(item.member_count) || item.member_count <= 0 || !Number.isInteger(item.member_count)) {
          throw new Error("Member count must be a positive whole number.");
        }
        const code = item.code.trim();
        if (code) {
          if (codes.has(code)) {
            throw new Error(`Duplicate non-empty code: ${code}`);
          }
          codes.add(code);
        }
      }

      // Convert or normalize to keep both id/type and item_id/item_type fields
      const itemsWithBothFields = validItems.map((item) => ({
        ...item,
        id: item.id || item.item_id || "",
        type: item.type || item.item_type || "UNIT",
        item_id: item.item_id || item.id || "",
        item_type: item.item_type || item.type || "UNIT"
      }));

      const payload = {
        items: itemsWithBothFields,
        officers: officersToSave
      };

      if (isDemoMode) {
        demoStore.saveOrganisationItems(payload);
        setOrganisationItems(itemsWithBothFields);
        setOrganisationOfficers(officersToSave);
      } else if (user) {
        await apiPost("organisation/saveAll", { idToken: user.idToken, payload });
        await loadOrgItems();
      }
    }, language === "bm" ? "Kandungan organisasi berjaya disimpan." : "Organisation content saved.");
  };

  if (!user || !session) return <div className="admin-login"><div className="admin-login__panel"><Image src="/lfx-mark.svg" alt="HiPER" width={90} height={90}/><span className="eyebrow">v1.0</span><h1>HiPER Studio</h1><p>{language === "bm" ? "Log masuk menggunakan akaun DELIMa Pentadbir." : "Sign in using the Administrator's DELIMa account."}</p><GoogleAuth onUser={setUser}/>{checking && <p className="muted">Verifying role…</p>}<FlashMessage flash={flash}/></div></div>;

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
    {mobileMenuOpen && <div className="admin-sidebar-backdrop" onClick={() => setMobileMenuOpen(false)} />}
    <aside className={`admin-sidebar ${mobileMenuOpen ? "admin-sidebar--open" : ""}`}>
      <div className="admin-sidebar-mobile-header" style={{ display: "none", justifyContent: "space-between", alignItems: "center", width: "100%", borderBottom: "1px solid var(--admin-sidebar-border)", paddingBottom: "16px", marginBottom: "8px" }}>
        <div className="admin-brand" style={{ border: 0, paddingBottom: 0 }}><Image src="/lfx-mark.svg" alt="HiPER" width={42} height={42}/><span><strong style={{ fontSize: "1.1rem" }}>HiPER Studio</strong><small>{session.email}</small></span></div>
        <button className="admin-sidebar-close" onClick={() => setMobileMenuOpen(false)} aria-label="Close menu" style={{ background: "transparent", border: 0, color: "var(--admin-sidebar-text)", cursor: "pointer", display: "flex", alignItems: "center" }}><Icon name="close" size={20}/></button>
      </div>
      <div className="admin-brand admin-sidebar-desktop-header"><Image src="/lfx-mark.svg" alt="HiPER" width={52} height={52}/><span><strong>HiPER Studio</strong><small>{session.email}</small></span></div>
      <nav>{tabs.map((item) => <button key={item.id} className={tab === item.id ? "active" : ""} onClick={() => { setTab(item.id); setFlash(null); setMobileMenuOpen(false); }}><Icon name={item.icon}/>{language === "bm" ? item.bm : item.en}</button>)}</nav>
      <Link href="/" className="admin-back"><Icon name="arrow" size={17}/>{language === "bm" ? "Lihat portal" : "View portal"}</Link>
    </aside>
    <main className="admin-main">
      <div className="admin-mobile-topbar" style={{ display: "none", alignItems: "center", gap: "12px", marginBottom: "20px", borderBottom: "1px solid var(--line)", paddingBottom: "12px" }}>
        <button className="button button--small button--outline" onClick={() => setMobileMenuOpen(true)} style={{ minHeight: "36px", padding: "6px 12px" }}><Icon name="menu" size={18}/> Menu</button>
        <span style={{ font: "600 1.25rem var(--serif)", color: "var(--brand-2)" }}>HiPER Studio</span>
      </div>
      <header className="admin-topbar"><div><span className="eyebrow">Office Operating System</span><h1>{tabs.find((item) => item.id === tab)?.[language]}</h1></div><span className="mode-pill">{isDemoMode ? "DEMO" : "LIVE"}</span></header><FlashMessage flash={flash}/>
      {tab === "overview" && <Overview assets={assets} loans={loans} ikes={ikes} tabung={tabung} busy={busy}/>}
      {tab === "content" && <ContentEditor content={content} setContent={setContent} onSave={saveContent} idToken={user?.idToken || ""} busy={busy}/>}
      {tab === "assets" && <AssetAdmin assets={assets} setAssets={setAssets} loans={loans} onSave={saveAssets} onDecision={loanDecision} onScan={scanLoan} idToken={user?.idToken || ""} busy={busy}/>}
      {tab === "ikes" && <IkesAdmin applications={ikes} onStatus={ikesDecision} onRepay={ikesRepayment} onDelete={ikesDelete} busy={busy}/>}
      {tab === "tabung" && <TabungAdmin records={tabung} onCreate={saveTabungRecord} onDelete={deleteTabungRecord} onToggleVisibility={toggleTabungVisibility} busy={busy}/>}
      {tab === "announcements" && <AnnouncementAdmin items={announcements} setItems={setAnnouncements} onSave={saveAnnouncements} idToken={user?.idToken || ""} busy={busy}/>}
      {tab === "organisation" && (
        <OrganisationEditor
          items={organisationItems}
          setItems={setOrganisationItems}
          officers={organisationOfficers}
          setOfficers={setOrganisationOfficers}
          onSave={saveOrgItems}
          busy={busy}
        />
      )}
    </main>

    <RejectionDialog
      isOpen={rejectingLoanId !== null}
      title={language === "bm" ? `Tolak Permohonan iAset ${rejectingLoanId}` : `Reject iAset Request ${rejectingLoanId}`}
      onClose={() => setRejectingLoanId(null)}
      onSubmit={async (reason) => {
        if (!rejectingLoanId) return;
        await run(async () => {
          if (isDemoMode) {
            const next = loans.map((loan) => loan.loan_id === rejectingLoanId ? { ...loan, status: "REJECTED", approved_by: user?.email || "demo.admin@ipg.edu.my" } as Loan : loan);
            setLoans(next); demoStore.saveLoans(next);
          } else if (user) {
            await apiPost("loan/approve", { idToken: user.idToken, loan_id: rejectingLoanId, decision: "REJECTED", reason });
            await loadData();
          }
        }, `Loan rejected.`);
      }}
    />

    <RejectionDialog
      isOpen={rejectingIkesId !== null}
      title={language === "bm" ? `Tolak Permohonan iKES ${rejectingIkesId}` : `Reject iKES Application ${rejectingIkesId}`}
      onClose={() => setRejectingIkesId(null)}
      onSubmit={async (reason) => {
        if (!rejectingIkesId) return;
        await run(async () => {
          if (isDemoMode) {
            const next = ikes.map((app) => app.application_id === rejectingIkesId ? { ...app, status: "REJECTED", rejection_reason: reason, notes: reason ? `${app.notes || ""}${app.notes ? " | " : ""}Admin: ${reason}` : app.notes, approved_by: user?.email || "demo.admin@ipg.edu.my" } as IkesApplication : app);
            setIkes(next); demoStore.saveIkes(next);
          } else if (user) {
            await apiPost("ikes/approve", { idToken: user.idToken, application_id: rejectingIkesId, decision: "REJECTED", reason });
            await loadData();
          }
        }, `iKES application rejected.`);
      }}
    />
  </div>;
}

function Overview({ assets, loans, ikes, tabung, busy }: { assets: Asset[]; loans: Loan[]; ikes: IkesApplication[]; tabung: TabungRecord[]; busy?: boolean }) {
  const balance = tabung.reduce((sum, item) => sum + (item.type === "COLLECTION" ? Number(item.amount) : -Number(item.amount)), 0);
  const metrics = [
    { label: "Assets available", value: assets.filter((item) => item.status === "AVAILABLE").length, icon: "briefcase" },
    { label: "Loans pending", value: loans.filter((item) => item.status === "PENDING").length, icon: "clock" },
    { label: "iKES pending", value: ikes.filter((item) => item.status === "PENDING").length, icon: "heart" },
    { label: "Friday Fund balance", value: money(balance), icon: "wallet" }
  ];

  // Calculate sum of outstanding repayments from iKES applications
  const totalExpectedReturns = ikes.reduce((sum, item) => {
    const amt = typeof item.outstanding_amount === "number"
      ? item.outstanding_amount
      : parseFloat(String(item.outstanding_amount || 0));
    return sum + (Number.isNaN(amt) ? 0 : amt);
  }, 0);

  const activeRepayments = ikes
    .filter((item) => (item.outstanding_amount || 0) > 0)
    .sort((a, b) => (a.repayment_due_date || "").localeCompare(b.repayment_due_date || ""));

  return (
    <>
      <div className="admin-metrics">
        {metrics.map((item) => (
          <article key={item.label}>
            <span>
              <Icon name={item.icon} />
            </span>
            <strong>{item.value}</strong>
            <small>{item.label}</small>
          </article>
        ))}
      </div>

      <div className="admin-grid" style={{ marginBottom: "24px" }}>
        <section className="admin-card" style={{ padding: "20px" }}>
          <TabungChart records={tabung} />
        </section>
        <section className="admin-card" style={{ padding: "20px" }}>
          <AssetUtilisationChart assets={assets} />
        </section>
      </div>

      <div className="admin-grid">
        <section className="admin-card">
          <div className="admin-card__heading" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2>Expected returns</h2>
            <strong style={{ fontSize: "1.2rem", color: "var(--brand-2)" }}>
              {busy && ikes.length === 0 ? "..." : money(totalExpectedReturns)}
            </strong>
          </div>
          <div className="admin-list">
            {busy && ikes.length === 0 ? (
              <div style={{ padding: "16px", textAlign: "center", color: "var(--muted)" }}>
                Loading expected returns...
              </div>
            ) : activeRepayments.length > 0 ? (
              activeRepayments.slice(0, 6).map((app) => (
                <article key={app.application_id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <strong>{app.user_name || app.user_id}</strong>
                    <span>{app.type} · {app.application_id}</span>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <strong style={{ display: "block", color: "var(--brand-2)" }}>{money(app.outstanding_amount || 0)}</strong>
                    <small style={{ color: "var(--muted)", fontSize: "0.7rem" }}>
                      Due: {app.repayment_due_date ? formatDate(app.repayment_due_date) : "—"}
                    </small>
                  </div>
                </article>
              ))
            ) : (
              <div className="empty-state" style={{ padding: "16px", textAlign: "center", color: "var(--muted)" }}>
                RM0.00
              </div>
            )}
          </div>
        </section>

        <section className="admin-card">
          <div className="admin-card__heading">
            <h2>Pending applications</h2>
          </div>
          <div className="admin-list">
            {[
              ...loans.filter((item) => item.status === "PENDING").map((item) => ({ id: item.loan_id, title: item.asset_name || item.asset_id, meta: "iAset" })),
              ...ikes.filter((item) => item.status === "PENDING").map((item) => ({ id: item.application_id, title: `${item.type} · ${money(item.amount_requested)}`, meta: "iKES" }))
            ]
              .slice(0, 8)
              .map((item) => (
                <article key={item.id}>
                  <div>
                    <strong>{item.title}</strong>
                    <span>{item.id}</span>
                  </div>
                  <em>{item.meta}</em>
                </article>
              ))}
          </div>
        </section>
      </div>
    </>
  );
}

function ContentEditor({ content, setContent, onSave, busy, idToken }: { content: SiteContent; setContent: (content: SiteContent) => void; onSave: () => void; busy: boolean; idToken: string }) {
  const updateSite = (patch: Partial<SiteContent["site"]>) => setContent({ ...content, site: { ...content.site, ...patch } });
  const updateMenu = (index: number, patch: Partial<MenuItem>) => { const navigation = [...content.navigation]; navigation[index] = { ...navigation[index], ...patch }; setContent({ ...content, navigation }); };
  const deleteMenu = (index: number) => setContent({ ...content, navigation: content.navigation.filter((_, i) => i !== index) });
  const addMenu = () => setContent({ ...content, navigation: [...content.navigation, { id: uid("nav"), label: { bm: "Menu baharu", en: "New menu" }, href: "/", enabled: true }] });
  const updateFooterLink = (index: number, patch: Partial<MenuItem>) => { const links = [...content.footer.links]; links[index] = { ...links[index], ...patch }; setContent({ ...content, footer: { ...content.footer, links } }); };
  const addFooterLink = () => setContent({ ...content, footer: { ...content.footer, links: [...content.footer.links, { id: uid("footer"), label: { bm: "Pautan baharu", en: "New link" }, href: "/", enabled: true }] } });
  const addPage = () => setContent({ ...content, customPages: [...content.customPages, { id: uid("page"), slug: `page-${content.customPages.length + 1}`, title: { bm: "Halaman Baharu", en: "New Page" }, summary: { bm: "Ringkasan halaman", en: "Page summary" }, published: false, sections: [{ id: uid("section"), heading: { bm: "Tajuk Seksyen", en: "Section Heading" }, body: { bm: "Kandungan halaman.", en: "Page content." } }] }] });
  return <div className="admin-editor">
    <section className="admin-card">
      <div className="admin-card__heading">
        <div>
          <h2>Media Studio</h2>
          <p>Upload files securely to Google Drive and apply them to the configuration.</p>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
        <MediaUploader
          purpose="logo"
          idToken={idToken}
          currentUrl={content.site.logoUrl}
          onUploadSuccess={(url) => setContent({ ...content, site: { ...content.site, logoUrl: url } })}
          onRemove={() => setContent({ ...content, site: { ...content.site, logoUrl: "" } })}
          label="Website Logo"
        />
        <MediaUploader
          purpose="favicon"
          idToken={idToken}
          currentUrl={content.site.faviconUrl}
          onUploadSuccess={(url) => setContent({ ...content, site: { ...content.site, faviconUrl: url } })}
          onRemove={() => setContent({ ...content, site: { ...content.site, faviconUrl: "" } })}
          label="Favicon"
        />
        <MediaUploader
          purpose="donation_qr"
          idToken={idToken}
          currentUrl={content.donation.qrImageUrl}
          onUploadSuccess={(url) => setContent({ ...content, donation: { ...content.donation, qrImageUrl: url } })}
          onRemove={() => setContent({ ...content, donation: { ...content.donation, qrImageUrl: "" } })}
          label="Donation QR"
        />
      </div>
    </section>
    <section className="admin-card"><div className="admin-card__heading"><div><h2>Site identity</h2><p>Brand, logo, favicon and colours.</p></div></div><div className="form-grid"><label><span>Website name</span><input value={content.site.name} onChange={(e) => updateSite({ name: e.target.value })}/></label><label><span>Short name</span><input value={content.site.shortName} onChange={(e) => updateSite({ shortName: e.target.value })}/></label><label><span>Logo URL</span><input value={content.site.logoUrl} onChange={(e) => updateSite({ logoUrl: e.target.value })}/></label><label><span>Favicon URL</span><input value={content.site.faviconUrl} onChange={(e) => updateSite({ faviconUrl: e.target.value })}/></label><label><span>Primary colour</span><div className="colour-field"><input type="color" value={content.site.primaryColor} onChange={(e) => updateSite({ primaryColor: e.target.value })}/><input value={content.site.primaryColor} onChange={(e) => updateSite({ primaryColor: e.target.value })}/></div></label><label><span>Accent colour</span><div className="colour-field"><input type="color" value={content.site.accentColor} onChange={(e) => updateSite({ accentColor: e.target.value })}/><input value={content.site.accentColor} onChange={(e) => updateSite({ accentColor: e.target.value })}/></div></label></div><LocalizedInputs label="Tagline" value={content.site.tagline} onChange={(tagline) => updateSite({ tagline })}/><LocalizedInputs label="Description" multiline value={content.site.description} onChange={(description) => updateSite({ description })}/></section>
    <section className="admin-card"><div className="admin-card__heading"><div><h2>Homepage hero</h2><p>Edit the main message and buttons.</p></div></div><LocalizedInputs label="Eyebrow" value={content.hero.eyebrow} onChange={(eyebrow) => setContent({ ...content, hero: { ...content.hero, eyebrow } })}/><LocalizedInputs label="Title" value={content.hero.title} onChange={(title) => setContent({ ...content, hero: { ...content.hero, title } })}/><LocalizedInputs label="Description" multiline value={content.hero.description} onChange={(description) => setContent({ ...content, hero: { ...content.hero, description } })}/><div className="form-grid"><label><span>Primary link</span><input value={content.hero.primaryButton.href} onChange={(e) => setContent({ ...content, hero: { ...content.hero, primaryButton: { ...content.hero.primaryButton, href: e.target.value } } })}/></label><label><span>Secondary link</span><input value={content.hero.secondaryButton.href} onChange={(e) => setContent({ ...content, hero: { ...content.hero, secondaryButton: { ...content.hero.secondaryButton, href: e.target.value } } })}/></label></div><LocalizedInputs label="Primary button" value={content.hero.primaryButton.label} onChange={(label) => setContent({ ...content, hero: { ...content.hero, primaryButton: { ...content.hero.primaryButton, label } } })}/><LocalizedInputs label="Secondary button" value={content.hero.secondaryButton.label} onChange={(label) => setContent({ ...content, hero: { ...content.hero, secondaryButton: { ...content.hero.secondaryButton, label } } })}/></section>
    <section className="admin-card"><div className="admin-card__heading"><div><h2>Navigation</h2><p>Names, links, visibility and ordering.</p></div><button className="button button--small button--outline" onClick={addMenu}><Icon name="plus" size={16}/>Add menu</button></div><div className="repeat-list">{content.navigation.map((item, index) => <article key={item.id}><div className="repeat-list__fields"><input aria-label="BM label" value={item.label.bm} onChange={(e) => updateMenu(index, { label: { ...item.label, bm: e.target.value } })}/><input aria-label="EN label" value={item.label.en} onChange={(e) => updateMenu(index, { label: { ...item.label, en: e.target.value } })}/><input aria-label="Link" value={item.href} onChange={(e) => updateMenu(index, { href: e.target.value })}/><label className="check-field"><input type="checkbox" checked={item.enabled} onChange={(e) => updateMenu(index, { enabled: e.target.checked })}/>Visible</label></div><button className="danger-icon" onClick={() => deleteMenu(index)}><Icon name="trash" size={17}/></button></article>)}</div></section>
    <section className="admin-card"><div className="admin-card__heading"><div><h2>Notice bar</h2><p>Control the announcement strip above the main header.</p></div><label className="check-field"><input type="checkbox" checked={content.notice.enabled} onChange={(e) => setContent({ ...content, notice: { ...content.notice, enabled: e.target.checked } })}/>Enabled</label></div><LocalizedInputs label="Label" value={content.notice.label} onChange={(label) => setContent({ ...content, notice: { ...content.notice, label } })}/><LocalizedInputs label="Notice text" value={content.notice.text} onChange={(text) => setContent({ ...content, notice: { ...content.notice, text } })}/><label><span>Notice link</span><input value={content.notice.href} onChange={(e) => setContent({ ...content, notice: { ...content.notice, href: e.target.value } })}/></label></section>
    <section className="admin-card"><div className="admin-card__heading"><div><h2>Homepage modules</h2><p>Edit the four primary feature cards.</p></div></div><div className="page-editor-list">{content.features.map((feature,index) => <article key={feature.id}><div className="form-grid"><label><span>Icon name</span><input value={feature.icon} onChange={(e) => { const features=[...content.features]; features[index]={...feature,icon:e.target.value}; setContent({...content,features}); }}/></label><label><span>Link</span><input value={feature.href} onChange={(e) => { const features=[...content.features]; features[index]={...feature,href:e.target.value}; setContent({...content,features}); }}/></label></div><LocalizedInputs label="Title" value={feature.title} onChange={(title) => { const features=[...content.features]; features[index]={...feature,title}; setContent({...content,features}); }}/><LocalizedInputs label="Description" multiline value={feature.description} onChange={(description) => { const features=[...content.features]; features[index]={...feature,description}; setContent({...content,features}); }}/></article>)}</div></section>
    <section className="admin-card"><div className="admin-card__heading"><div><h2>Footer</h2><p>Edit footer text, address and links.</p></div><button className="button button--small button--outline" onClick={addFooterLink}><Icon name="plus" size={16}/>Add footer link</button></div><LocalizedInputs label="About" multiline value={content.footer.about} onChange={(about) => setContent({ ...content, footer: { ...content.footer, about } })}/><label><span>Office address</span><textarea rows={5} value={content.footer.address} onChange={(e) => setContent({ ...content, footer: { ...content.footer, address: e.target.value } })}/></label>{content.footer.address && content.footer.address.trim().length > 0 && (
      <div style={{ marginTop: "8px", padding: "12px", background: "var(--surface-muted)", border: "1px solid var(--border)", borderRadius: "8px", marginBottom: "15px" }}>
        <small style={{ display: "block", marginBottom: "6px", textTransform: "uppercase", fontSize: "0.68rem", color: "var(--brand-2)", fontWeight: "bold" }}>Address Preview</small>
        <div style={{ fontSize: "0.84rem", lineHeight: "1.4", color: "var(--text-primary)" }}>
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
                return <div key={idx} style={{ fontWeight: "bold" }}>{trimmed}</div>;
              }
              return <div key={idx}>{trimmed}</div>;
            }).filter(el => el !== null);
          })()}
        </div>
      </div>
    )}<label><span>Alamat E-mel Pejabat</span><input type="text" value={content.site.officialEmail || ""} placeholder="email@example.com" onChange={(e) => setContent({ ...content, site: { ...content.site, officialEmail: e.target.value } })}/></label><LocalizedInputs label="Copyright" value={content.footer.copyright} onChange={(copyright) => setContent({ ...content, footer: { ...content.footer, copyright } })}/><div className="repeat-list">{content.footer.links.map((item,index) => <article key={item.id}><div className="repeat-list__fields"><input value={item.label.bm} aria-label="Footer BM" onChange={(e) => updateFooterLink(index,{label:{...item.label,bm:e.target.value}})}/><input value={item.label.en} aria-label="Footer EN" onChange={(e) => updateFooterLink(index,{label:{...item.label,en:e.target.value}})}/><input value={item.href} aria-label="Footer link" onChange={(e) => updateFooterLink(index,{href:e.target.value})}/><label className="check-field"><input type="checkbox" checked={item.enabled} onChange={(e) => updateFooterLink(index,{enabled:e.target.checked})}/>Visible</label></div><button className="danger-icon" onClick={() => setContent({...content,footer:{...content.footer,links:content.footer.links.filter((_,i)=>i!==index)}})}><Icon name="trash" size={17}/></button></article>)}</div></section>
    <section className="admin-card"><div className="admin-card__heading"><div><h2>Friday Fund donation</h2><p>Public donation method and weekly target.</p></div></div><LocalizedInputs label="Heading" value={content.donation.heading} onChange={(heading) => setContent({ ...content, donation: { ...content.donation, heading } })}/><LocalizedInputs label="Description" multiline value={content.donation.description} onChange={(description) => setContent({ ...content, donation: { ...content.donation, description } })}/><div className="form-grid"><label><span>Weekly target (RM)</span><input type="number" value={content.donation.target} onChange={(e) => setContent({ ...content, donation: { ...content.donation, target: Number(e.target.value) } })}/></label><label><span>Payment link</span><input value={content.donation.paymentUrl} onChange={(e) => setContent({ ...content, donation: { ...content.donation, paymentUrl: e.target.value } })}/></label><label><span>Bank</span><input value={content.donation.bankName} onChange={(e) => setContent({ ...content, donation: { ...content.donation, bankName: e.target.value } })}/></label><label><span>Account name</span><input value={content.donation.accountName} onChange={(e) => setContent({ ...content, donation: { ...content.donation, accountName: e.target.value } })}/></label><label><span>Account number</span><input value={content.donation.accountNumber} onChange={(e) => setContent({ ...content, donation: { ...content.donation, accountNumber: e.target.value } })}/></label><label><span>QR image URL</span><input value={content.donation.qrImageUrl} onChange={(e) => setContent({ ...content, donation: { ...content.donation, qrImageUrl: e.target.value } })}/></label></div></section>
    <section className="admin-card">
      <div className="admin-card__heading">
        <div>
          <h2>Custom pages</h2>
          <p>Add and build bilingual, block-based information pages.</p>
        </div>
        <button className="button button--small button--outline" onClick={addPage}>
          <Icon name="plus" size={16} /> Add page
        </button>
      </div>
      <div className="page-editor-list">
        {content.customPages.map((page, pageIndex) => {
          // Normalize blocks on-the-fly for editing
          const blocks = normalizePageBlocks(page);

          const updateBlocks = (nextBlocks: PageBlock[]) => {
            const pages = [...content.customPages];
            pages[pageIndex] = { ...page, blocks: nextBlocks };
            setContent({ ...content, customPages: pages });
          };

          const addBlock = (type: PageBlock["type"]) => {
            let newBlock: PageBlock;
            const newId = uid("blk");

            if (type === "richText") {
              newBlock = { type: "richText", id: newId, content: { bm: "", en: "" } };
            } else if (type === "image") {
              newBlock = { type: "image", id: newId, imageUrl: "", alt: { bm: "", en: "" }, caption: { bm: "", en: "" }, isDecorative: false };
            } else if (type === "cta") {
              newBlock = { type: "cta", id: newId, title: { bm: "", en: "" }, description: { bm: "", en: "" }, label: { bm: "Klik disini", en: "Click here" }, href: "", variant: "primary" };
            } else if (type === "faq") {
              newBlock = { type: "faq", id: newId, items: [] };
            } else {
              newBlock = { type: "documents", id: newId, title: { bm: "", en: "" }, items: [] };
            }

            updateBlocks([...blocks, newBlock]);
          };

          const deleteBlock = (bIndex: number) => {
            updateBlocks(blocks.filter((_, idx) => idx !== bIndex));
          };

          const moveBlock = (bIndex: number, direction: "up" | "down") => {
            if (direction === "up" && bIndex === 0) return;
            if (direction === "down" && bIndex === blocks.length - 1) return;
            const next = [...blocks];
            const swapIdx = direction === "up" ? bIndex - 1 : bIndex + 1;
            const temp = next[bIndex];
            next[bIndex] = next[swapIdx];
            next[swapIdx] = temp;
            updateBlocks(next);
          };

          return (
            <article key={page.id} style={{ border: "1px solid var(--line)", padding: "20px", borderRadius: "8px", marginBottom: "24px", background: "var(--bg)" }}>
              <div className="page-editor-list__top">
                <strong>/{page.slug}</strong>
                <label className="check-field">
                  <input
                    type="checkbox"
                    checked={page.published}
                    onChange={(e) => {
                      const pages = [...content.customPages];
                      pages[pageIndex] = { ...page, published: e.target.checked };
                      setContent({ ...content, customPages: pages });
                    }}
                  />
                  Published
                </label>
                <button
                  className="danger-icon"
                  type="button"
                  onClick={() =>
                    setContent({
                      ...content,
                      customPages: content.customPages.filter((_, i) => i !== pageIndex)
                    })
                  }
                >
                  <Icon name="trash" size={17} />
                </button>
              </div>

              <div className="form-grid">
                <label>
                  <span>Slug</span>
                  <input
                    value={page.slug}
                    onChange={(e) => {
                      const pages = [...content.customPages];
                      pages[pageIndex] = { ...page, slug: e.target.value.replace(/[^a-z0-9-]/g, "-") };
                      setContent({ ...content, customPages: pages });
                    }}
                  />
                </label>
                <label>
                  <span>Hero image URL</span>
                  <input
                    value={page.heroImage || ""}
                    onChange={(e) => {
                      const pages = [...content.customPages];
                      pages[pageIndex] = { ...page, heroImage: e.target.value };
                      setContent({ ...content, customPages: pages });
                    }}
                  />
                </label>
              </div>

              <LocalizedInputs
                label="Page title"
                value={page.title}
                onChange={(title) => {
                  const pages = [...content.customPages];
                  pages[pageIndex] = { ...page, title };
                  setContent({ ...content, customPages: pages });
                }}
              />
              <LocalizedInputs
                label="Summary"
                multiline
                value={page.summary}
                onChange={(summary) => {
                  const pages = [...content.customPages];
                  pages[pageIndex] = { ...page, summary };
                  setContent({ ...content, customPages: pages });
                }}
              />

              {/* Block List Editor */}
              <div style={{ marginTop: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
                <h4 style={{ color: "var(--brand-2)", borderBottom: "1px solid var(--line)", paddingBottom: "8px", margin: 0 }}>
                  Page Blocks ({blocks.length})
                </h4>

                {blocks.map((block, bIndex) => {
                  const updateBlockValue = (patchedBlock: PageBlock) => {
                    const next = [...blocks];
                    next[bIndex] = patchedBlock;
                    updateBlocks(next);
                  };

                  return (
                    <div
                      key={block.id}
                      style={{
                        padding: "16px",
                        border: "1px solid var(--line)",
                        borderRadius: "6px",
                        background: "var(--soft-bg)",
                        position: "relative"
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "12px",
                          borderBottom: "1px dashed var(--line)",
                          paddingBottom: "8px"
                        }}
                      >
                        <strong style={{ textTransform: "uppercase", fontSize: "0.8rem", color: "var(--brand-2)" }}>
                          Block #{bIndex + 1}: {block.type}
                        </strong>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button
                            type="button"
                            className="button button--small button--outline"
                            style={{ padding: "2px 8px" }}
                            disabled={bIndex === 0}
                            onClick={() => moveBlock(bIndex, "up")}
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            className="button button--small button--outline"
                            style={{ padding: "2px 8px" }}
                            disabled={bIndex === blocks.length - 1}
                            onClick={() => moveBlock(bIndex, "down")}
                          >
                            ▼
                          </button>
                          <button
                            type="button"
                            className="danger-icon"
                            style={{ padding: "4px" }}
                            onClick={() => deleteBlock(bIndex)}
                          >
                            <Icon name="trash" size={16} />
                          </button>
                        </div>
                      </div>

                      {block.type === "richText" && (
                        <LocalizedInputs
                          label="Content (Markdown supported)"
                          multiline
                          value={block.content}
                          onChange={(content) => updateBlockValue({ ...block, content })}
                        />
                      )}

                      {block.type === "image" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                          <label className="check-field">
                            <input
                              type="checkbox"
                              checked={block.isDecorative || false}
                              onChange={(e) => updateBlockValue({ ...block, isDecorative: e.target.checked })}
                            />
                            <span>Decorative Image (hides alternative text)</span>
                          </label>

                          <MediaUploader
                            purpose="logo"
                            idToken={idToken}
                            currentUrl={block.imageUrl}
                            onUploadSuccess={(url) => updateBlockValue({ ...block, imageUrl: url })}
                            onRemove={() => updateBlockValue({ ...block, imageUrl: "" })}
                            label="Image File"
                          />

                          {!block.isDecorative && (
                            <LocalizedInputs
                              label="Alternative Text *"
                              value={block.alt}
                              onChange={(alt) => updateBlockValue({ ...block, alt })}
                            />
                          )}

                          <LocalizedInputs
                            label="Caption"
                            value={block.caption || { bm: "", en: "" }}
                            onChange={(caption) => updateBlockValue({ ...block, caption })}
                          />
                        </div>
                      )}

                      {block.type === "cta" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                          <LocalizedInputs
                            label="Title"
                            value={block.title}
                            onChange={(title) => updateBlockValue({ ...block, title })}
                          />
                          <LocalizedInputs
                            label="Description"
                            multiline
                            value={block.description || { bm: "", en: "" }}
                            onChange={(description) => updateBlockValue({ ...block, description })}
                          />
                          <LocalizedInputs
                            label="Button Label"
                            value={block.label}
                            onChange={(label) => updateBlockValue({ ...block, label })}
                          />
                          <div className="form-grid">
                            <label>
                              <span>Button link (href)</span>
                              <input
                                value={block.href}
                                onChange={(e) => updateBlockValue({ ...block, href: e.target.value })}
                              />
                            </label>
                            <label>
                              <span>Variant</span>
                              <select
                                value={block.variant || "primary"}
                                onChange={(e) => updateBlockValue({ ...block, variant: e.target.value as "primary" | "secondary" })}
                              >
                                <option value="primary">Primary</option>
                                <option value="secondary">Secondary</option>
                              </select>
                            </label>
                          </div>
                        </div>
                      )}

                      {block.type === "faq" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                          {block.items.map((item, qIndex) => {
                            const updateFaqItem = (patchedItem: typeof item) => {
                              const nextItems = [...block.items];
                              nextItems[qIndex] = patchedItem;
                              updateBlockValue({ ...block, items: nextItems });
                            };

                            return (
                              <div
                                key={item.id}
                                style={{
                                  border: "1px dashed var(--line)",
                                  padding: "12px",
                                  borderRadius: "4px",
                                  background: "var(--bg)",
                                  position: "relative"
                                }}
                              >
                                <button
                                  type="button"
                                  className="danger-icon"
                                  style={{ position: "absolute", top: "8px", right: "8px" }}
                                  onClick={() => {
                                    const nextItems = block.items.filter((_, idx) => idx !== qIndex);
                                    updateBlockValue({ ...block, items: nextItems });
                                  }}
                                >
                                  <Icon name="close" size={16} />
                                </button>
                                <LocalizedInputs
                                  label="Question"
                                  value={item.question}
                                  onChange={(question) => updateFaqItem({ ...item, question })}
                                />
                                <LocalizedInputs
                                  label="Answer"
                                  multiline
                                  value={item.answer}
                                  onChange={(answer) => updateFaqItem({ ...item, answer })}
                                />
                              </div>
                            );
                          })}
                          <button
                            type="button"
                            className="button button--small button--outline"
                            onClick={() => {
                              const newItem = { id: uid("faq-item"), question: { bm: "", en: "" }, answer: { bm: "", en: "" } };
                              updateBlockValue({ ...block, items: [...block.items, newItem] });
                            }}
                          >
                            + Add FAQ Item
                          </button>
                        </div>
                      )}

                      {block.type === "documents" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                          <LocalizedInputs
                            label="Document List Title"
                            value={block.title || { bm: "", en: "" }}
                            onChange={(title) => updateBlockValue({ ...block, title })}
                          />

                          {block.items.map((item, dIndex) => {
                            const updateDocItem = (patchedItem: typeof item) => {
                              const nextItems = [...block.items];
                              nextItems[dIndex] = patchedItem;
                              updateBlockValue({ ...block, items: nextItems });
                            };

                            return (
                              <div
                                key={item.id}
                                style={{
                                  border: "1px dashed var(--line)",
                                  padding: "12px",
                                  borderRadius: "4px",
                                  background: "var(--bg)",
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: "8px"
                                }}
                              >
                                <div style={{ display: "flex", justifyContent: "space-between" }}>
                                  <span style={{ fontSize: "0.8rem", fontWeight: "bold" }}>Document #{dIndex + 1}</span>
                                  <button
                                    type="button"
                                    className="danger-icon"
                                    onClick={() => {
                                      const nextItems = block.items.filter((_, idx) => idx !== dIndex);
                                      updateBlockValue({ ...block, items: nextItems });
                                    }}
                                  >
                                    <Icon name="close" size={16} />
                                  </button>
                                </div>
                                <LocalizedInputs
                                  label="Title"
                                  value={item.title}
                                  onChange={(title) => updateDocItem({ ...item, title })}
                                />

                                <MediaUploader
                                  purpose="announcement_pdf"
                                  idToken={idToken}
                                  currentUrl={item.url}
                                  onUploadSuccess={(url) => updateDocItem({ ...item, url })}
                                  onRemove={() => updateDocItem({ ...item, url: "" })}
                                  label="Document File (PDF)"
                                />

                                <div className="form-grid">
                                  <label>
                                    <span>File Type (e.g. PDF)</span>
                                    <input
                                      value={item.fileType || ""}
                                      onChange={(e) => updateDocItem({ ...item, fileType: e.target.value })}
                                    />
                                  </label>
                                  <label>
                                    <span>File Size (optional)</span>
                                    <input
                                      value={item.fileSize || ""}
                                      onChange={(e) => updateDocItem({ ...item, fileSize: e.target.value })}
                                    />
                                  </label>
                                </div>
                              </div>
                            );
                          })}
                          <button
                            type="button"
                            className="button button--small button--outline"
                            onClick={() => {
                              const newItem = { id: uid("doc-item"), title: { bm: "", en: "" }, url: "", fileType: "PDF" };
                              updateBlockValue({ ...block, items: [...block.items, newItem] });
                            }}
                          >
                            + Add Document File
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}

                <div style={{ borderTop: "1px solid var(--line)", paddingTop: "12px", display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "0.9rem", fontWeight: "bold" }}>Add Block:</span>
                  <button type="button" className="button button--small button--outline" onClick={() => addBlock("richText")}>+ Rich Text</button>
                  <button type="button" className="button button--small button--outline" onClick={() => addBlock("image")}>+ Image</button>
                  <button type="button" className="button button--small button--outline" onClick={() => addBlock("cta")}>+ CTA</button>
                  <button type="button" className="button button--small button--outline" onClick={() => addBlock("faq")}>+ FAQ</button>
                  <button type="button" className="button button--small button--outline" onClick={() => addBlock("documents")}>+ Documents</button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
    <div className="sticky-save"><button disabled={busy} className="button" onClick={onSave}><Icon name="save" size={17}/>{busy ? "Saving…" : "Save website content"}</button></div>
  </div>;
}

function AssetAdmin({ assets, setAssets, loans, onSave, onDecision, onScan, idToken, busy }: { assets: Asset[]; setAssets: (assets: Asset[]) => void; loans: Loan[]; onSave: () => void; onDecision: (id: string, decision: "APPROVED" | "REJECTED") => void; onScan: (value: string) => void; idToken: string; busy: boolean }) {
  const [scan, setScan] = useState("");
  const pending = loans.filter((loan) => loan.status === "PENDING");
  const addAsset = () => setAssets([...assets, { asset_id: uid("AST").toUpperCase(), name: "New asset", category: "General", image_url: "/asset-placeholder.svg", status: "AVAILABLE", description: "" }]);
  return <div className="admin-editor"><section className="admin-card"><div className="admin-card__heading"><div><h2>Pending loan requests</h2><p>Approve or reject with a full audit record.</p></div></div><div className="data-table"><div className="data-table__head"><span>Applicant</span><span>Asset / purpose</span><span>Dates</span><span>Action</span></div>{pending.map((loan) => <div className="data-table__row" key={loan.loan_id}><span><strong>{loan.user_name || loan.user_id}</strong><small>{loan.loan_id}</small></span><span><strong>{loan.asset_name || loan.asset_id}</strong><small>{loan.purpose}</small></span><span><small>{loan.date_borrowed} → {loan.date_returned_expected}</small></span><span className="row-actions"><button disabled={busy} className="approve-button" onClick={() => onDecision(loan.loan_id, "APPROVED")}><Icon name="check" size={15}/>Approve</button><button disabled={busy} className="reject-button" onClick={() => onDecision(loan.loan_id, "REJECTED")}><Icon name="close" size={15}/>Reject</button></span></div>)}</div>{!pending.length && <div className="empty-state">No pending requests.</div>}</section>
    <section className="admin-card"><div className="admin-card__heading"><div><h2>QR handover / return</h2><p>Approved → Active → Returned. The asset status follows automatically.</p></div></div><div className="scan-panel"><label><span>QR URL or loan ID</span><input value={scan} onChange={(e) => setScan(e.target.value)} placeholder="LON-... or scanned URL"/></label><button disabled={!scan || busy} className="button" onClick={() => onScan(scan)}>Process scan</button><QrScanner onScan={(value) => { setScan(value); onScan(value); }}/></div></section>
    <section className="admin-card"><div className="admin-card__heading"><div><h2>Asset register</h2><p>Edit status, picture URL and asset details.</p></div><button className="button button--small button--outline" onClick={addAsset}><Icon name="plus" size={16}/>Add asset</button></div><div className="asset-admin-list">{assets.map((asset, index) => <article key={asset.asset_id}><CmsImage src={asset.image_url || "/asset-placeholder.svg"} alt="" width={68} height={68}/><div className="asset-admin-fields"><input value={asset.asset_id} onChange={(e) => { const next = [...assets]; next[index] = { ...asset, asset_id: e.target.value }; setAssets(next); }}/><input value={asset.name} onChange={(e) => { const next = [...assets]; next[index] = { ...asset, name: e.target.value }; setAssets(next); }}/><input value={asset.category} onChange={(e) => { const next = [...assets]; next[index] = { ...asset, category: e.target.value }; setAssets(next); }}/><select value={asset.status} onChange={(e) => { const next = [...assets]; next[index] = { ...asset, status: e.target.value as Asset["status"] }; setAssets(next); }}><option>AVAILABLE</option><option>ON_LOAN</option><option>DAMAGED</option><option>MAINTENANCE</option></select><input className="wide" value={asset.image_url} placeholder="Image URL" onChange={(e) => { const next = [...assets]; next[index] = { ...asset, image_url: e.target.value }; setAssets(next); }}/><textarea className="wide" value={asset.description} placeholder="Description" onChange={(e) => { const next = [...assets]; next[index] = { ...asset, description: e.target.value }; setAssets(next); }}/>
      <div className="wide" style={{ marginTop: "8px" }}>
        <MediaUploader
          purpose="asset_image"
          idToken={idToken}
          currentUrl={asset.image_url}
          onUploadSuccess={(url) => { const next = [...assets]; next[index] = { ...asset, image_url: url }; setAssets(next); }}
          onRemove={() => { const next = [...assets]; next[index] = { ...asset, image_url: "" }; setAssets(next); }}
          label="Asset Image"
        />
      </div>
    </div><button className="danger-icon" onClick={() => setAssets(assets.filter((_, i) => i !== index))}><Icon name="trash" size={17}/></button></article>)}</div><div className="admin-card__footer"><button disabled={busy} className="button" onClick={onSave}><Icon name="save" size={17}/>Save assets</button></div></section></div>;
}

function IkesAdmin({
  applications,
  onStatus,
  onRepay,
  onDelete,
  busy
}: {
  applications: IkesApplication[];
  onStatus: (id: string, status: IkesApplication["status"]) => void;
  onRepay: (id: string) => void;
  onDelete: (id: string) => Promise<void>;
  busy: boolean;
}) {
  const { language } = useApp();
  const [selectedApp, setSelectedApp] = useState<IkesApplication | null>(null);
  const [copied, setCopied] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const appToDelete = applications.find((a) => a.application_id === deleteConfirmId);

  return (
    <section className="admin-card">
      <div className="admin-card__heading">
        <div>
          <h2>iKES applications</h2>
          <p>Approval records only. No bank transaction is performed by the system.</p>
        </div>
      </div>
      <div className="data-table data-table--ikes">
        <div className="data-table__head">
          <span>Applicant</span>
          <span>Application</span>
          <span>Notes / proof / dates</span>
          <span>Status & action</span>
        </div>
        {applications
          .sort((a, b) => b.request_date.localeCompare(a.request_date))
          .map((item) => {
            const hasRepaymentInfo = ["APPROVED", "PAID", "REPAID"].includes(item.status);
            return (
              <div className="data-table__row" key={item.application_id} style={{ position: "relative" }}>
                <span>
                  <button
                    onClick={() => setSelectedApp(item)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "inherit",
                      textAlign: "left",
                      cursor: "pointer",
                      padding: 0,
                      display: "block",
                      width: "100%"
                    }}
                  >
                    <strong style={{ textDecoration: "underline", color: "var(--brand-2)" }}>
                      {item.user_name || item.user_id}
                    </strong>
                  </button>
                  <small style={{ display: "block", marginTop: "4px" }}>
                    {item.application_id} · {formatDate(item.request_date)}
                  </small>
                </span>
                <span>
                  <strong>
                    {item.type} · {money(item.amount_requested)}
                  </strong>
                  {hasRepaymentInfo && item.amount_approved !== undefined && (
                    <div style={{ marginTop: "4px", fontSize: "0.8rem", color: "var(--muted)" }}>
                      <div>Approved: {money(item.amount_approved)}</div>
                      {item.repayment_term_days !== undefined && (
                        <div>Term: {item.repayment_term_days} days</div>
                      )}
                    </div>
                  )}
                </span>
                <span>
                  <small style={{ display: "block", marginBottom: "4px" }}>
                    {item.notes || "—"}
                  </small>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                    {item.ticket_proof_url && (
                      <a
                        className="text-link"
                        href={item.ticket_proof_url}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: "0.8rem" }}
                      >
                        View proof
                      </a>
                    )}
                    {item.bank_name && item.bank_account_masked && (
                      <span style={{ fontSize: "0.78rem", background: "#f0fdf4", color: "#166534", padding: "2px 6px", borderRadius: "4px" }}>
                        {item.bank_name} ({item.bank_account_masked})
                      </span>
                    )}
                  </div>
                  {item.rejection_reason && (
                    <div style={{ color: "#913737", fontSize: "0.8rem", fontWeight: 600, marginTop: "4px" }}>
                      Rejected: {item.rejection_reason}
                    </div>
                  )}
                  {hasRepaymentInfo && (
                    <div style={{ fontSize: "0.8rem", color: "var(--muted)", borderTop: "1px dashed var(--line)", paddingTop: "4px", marginTop: "4px" }}>
                      {item.decision_date && <div>Decided: {formatDate(item.decision_date)}</div>}
                      {item.payment_date && <div>Paid out: {formatDate(item.payment_date)}</div>}
                      {item.repayment_due_date && <div>Due date: {formatDate(item.repayment_due_date)}</div>}
                    </div>
                  )}
                </span>
                <span>
                  <StatusBadge status={item.status} />
                  <select
                    disabled={busy || ["REJECTED", "REPAID"].includes(item.status)}
                    value={item.status}
                    onChange={(e) => onStatus(item.application_id, e.target.value as IkesApplication["status"])}
                    style={{ marginTop: "6px" }}
                  >
                    {(item.status === "PENDING"
                      ? ["PENDING", "APPROVED", "REJECTED"]
                      : item.status === "APPROVED"
                      ? ["APPROVED", "PAID"]
                      : item.status === "PAID"
                      ? ["PAID", "REPAID"]
                      : [item.status]
                    ).map((status) => (
                      <option key={status}>{status}</option>
                    ))}
                  </select>

                  {item.status === "PAID" && (
                    <div style={{ marginTop: "8px", width: "100%" }}>
                      <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: "4px" }}>
                        <div>Repaid: {money(item.amount_repaid || 0)}</div>
                        <div>Outstanding: {money(item.outstanding_amount ?? (item.amount_approved ?? 0))}</div>
                      </div>
                      <button
                        disabled={busy}
                        className="button button--small button--outline"
                        style={{ padding: "4px 8px", fontSize: "0.78rem", width: "100%", justifyContent: "center" }}
                        onClick={() => onRepay(item.application_id)}
                      >
                        <Icon name="plus" size={12} style={{ marginRight: "4px" }} /> Record Repayment
                      </button>
                    </div>
                  )}

                  {item.status === "REPAID" && item.amount_repaid !== undefined && (
                    <div style={{ marginTop: "4px", fontSize: "0.78rem", color: "var(--muted)" }}>
                      <div>Fully repaid: {money(item.amount_repaid)}</div>
                    </div>
                  )}

                  {item.is_overdue && (
                    <div
                      style={{
                        marginTop: "8px",
                        color: "#913737",
                        fontSize: "0.78rem",
                        fontWeight: "bold",
                        background: "rgba(145, 55, 55, 0.08)",
                        padding: "4px 8px",
                        borderRadius: "4px",
                        width: "100%",
                        textAlign: "center"
                      }}
                    >
                      OVERDUE WARNING
                    </div>
                  )}

                  <button
                    disabled={busy}
                    className="danger-icon"
                    style={{ marginTop: "8px", width: "100%", height: "36px", display: "flex", justifyContent: "center", alignItems: "center", gap: "6px" }}
                    onClick={() => setDeleteConfirmId(item.application_id)}
                    title={language === "bm" ? "Padam" : "Delete"}
                  >
                    <Icon name="trash" size={16} />
                    <span style={{ fontSize: "0.8rem", fontWeight: "bold" }}>{language === "bm" ? "Padam" : "Delete"}</span>
                  </button>
                </span>
              </div>
            );
          })}
      </div>

      {selectedApp && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 1000,
          padding: "16px"
        }}>
          <div style={{
            backgroundColor: "var(--surface)",
            color: "var(--text-primary)",
            borderRadius: "8px",
            width: "100%",
            maxWidth: "650px",
            boxShadow: "var(--shadow)",
            padding: "24px",
            maxHeight: "90vh",
            overflowY: "auto",
            border: "1px solid var(--line)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--line)", paddingBottom: "12px", marginBottom: "20px" }}>
              <h3 style={{ margin: 0 }}>
                {language === "bm" ? `Butiran Permohonan — ${selectedApp.application_id}` : `Application Details — ${selectedApp.application_id}`}
              </h3>
              <button
                onClick={() => { setSelectedApp(null); setCopied(false); }}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--muted)",
                  padding: "4px"
                }}
              >
                <Icon name="close" size={20} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              {/* Section 1: Student Information */}
              <div className="ikes-info-card" style={{
                backgroundColor: "var(--surface)",
                border: "1px solid var(--line)",
                borderRadius: "8px",
                padding: "20px",
                boxShadow: "var(--shadow-sm)"
              }}>
                <h4 style={{
                  fontSize: "1rem",
                  color: "var(--brand-2)",
                  borderBottom: "1px solid var(--line)",
                  paddingBottom: "4px",
                  marginBottom: "12px",
                  fontWeight: "bold",
                  marginTop: 0
                }}>
                  {language === "bm" ? "Maklumat Pelajar" : "Student Information"}
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "0.85rem" }}>
                  <div style={{ wordBreak: "break-word" }}>
                    <span style={{ display: "block", color: "var(--muted)", fontSize: "0.75rem", textTransform: "uppercase" }}>
                      {language === "bm" ? "Nama Penuh Pelajar" : "Student Full Name"}
                    </span>
                    <strong>{selectedApp.user_name || "—"}</strong>
                  </div>
                  <div style={{ wordBreak: "break-all" }}>
                    <span style={{ display: "block", color: "var(--muted)", fontSize: "0.75rem", textTransform: "uppercase" }}>
                      {language === "bm" ? "Emel Pelajar" : "Student Email"}
                    </span>
                    <strong>{selectedApp.user_id || "—"}</strong>
                  </div>
                  <div>
                    <span style={{ display: "block", color: "var(--muted)", fontSize: "0.75rem", textTransform: "uppercase" }}>
                      {language === "bm" ? "Ambilan" : "Intake"}
                    </span>
                    <strong>{selectedApp.intake || "—"}</strong>
                  </div>
                  <div>
                    <span style={{ display: "block", color: "var(--muted)", fontSize: "0.75rem", textTransform: "uppercase" }}>
                      {language === "bm" ? "Kelas" : "Class"}
                    </span>
                    <strong>{selectedApp.class_name || "—"}</strong>
                  </div>
                  <div>
                    <span style={{ display: "block", color: "var(--muted)", fontSize: "0.75rem", textTransform: "uppercase" }}>
                      {language === "bm" ? "Nombor Telefon" : "Phone Number"}
                    </span>
                    <strong>{selectedApp.phone_number || "—"}</strong>
                  </div>
                </div>
              </div>

              {/* Section 2: Bank Information */}
              <div className="ikes-info-card" style={{
                backgroundColor: "var(--surface)",
                border: "1px solid var(--line)",
                borderRadius: "8px",
                padding: "20px",
                boxShadow: "var(--shadow-sm)"
              }}>
                <h4 style={{
                  fontSize: "1rem",
                  color: "var(--brand-2)",
                  borderBottom: "1px solid var(--line)",
                  paddingBottom: "4px",
                  marginBottom: "12px",
                  fontWeight: "bold",
                  marginTop: 0
                }}>
                  {language === "bm" ? "Maklumat Bank" : "Bank Information"}
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "0.85rem" }}>
                  <div>
                    <span style={{ display: "block", color: "var(--muted)", fontSize: "0.75rem", textTransform: "uppercase" }}>
                      {language === "bm" ? "Nama Bank" : "Bank Name"}
                    </span>
                    <strong>{selectedApp.bank_name || "—"}</strong>
                  </div>
                  <div>
                    <span style={{ display: "block", color: "var(--muted)", fontSize: "0.75rem", textTransform: "uppercase" }}>
                      {language === "bm" ? "Nombor Akaun Bank" : "Bank Account Number"}
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", wordBreak: "break-all" }}>
                      <strong style={{ fontSize: "1rem", color: "var(--brand-2)" }}>
                        {selectedApp.bank_account_number || selectedApp.bank_account_masked || "—"}
                      </strong>
                      {(selectedApp.bank_account_number || selectedApp.bank_account_masked) && (
                        <button
                          onClick={async () => {
                            const val = selectedApp.bank_account_number || selectedApp.bank_account_masked || "";
                            if (val) {
                              await navigator.clipboard.writeText(val);
                              setCopied(true);
                              setTimeout(() => setCopied(false), 2000);
                            }
                          }}
                          style={{
                            padding: "2px 8px",
                            fontSize: "0.7rem",
                            cursor: "pointer",
                            background: "var(--line)",
                            border: "1px solid var(--muted)",
                            borderRadius: "4px",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px"
                          }}
                        >
                          {copied ? (language === "bm" ? "Disalin!" : "Copied!") : (language === "bm" ? "Salin" : "Copy")}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Application Information */}
              <div className="ikes-info-card" style={{
                backgroundColor: "var(--surface)",
                border: "1px solid var(--line)",
                borderRadius: "8px",
                padding: "20px",
                boxShadow: "var(--shadow-sm)"
              }}>
                <h4 style={{
                  fontSize: "1rem",
                  color: "var(--brand-2)",
                  borderBottom: "1px solid var(--line)",
                  paddingBottom: "4px",
                  marginBottom: "12px",
                  fontWeight: "bold",
                  marginTop: 0
                }}>
                  {language === "bm" ? "Maklumat Permohonan" : "Application Information"}
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "0.85rem" }}>
                  <div>
                    <span style={{ display: "block", color: "var(--muted)", fontSize: "0.75rem", textTransform: "uppercase" }}>
                      {language === "bm" ? "Kategori iKES" : "iKES Category"}
                    </span>
                    <strong>{selectedApp.type || "—"}</strong>
                  </div>
                  <div>
                    <span style={{ display: "block", color: "var(--muted)", fontSize: "0.75rem", textTransform: "uppercase" }}>
                      {language === "bm" ? "Jumlah Dimohon" : "Amount Requested"}
                    </span>
                    <strong>{money(selectedApp.amount_requested)}</strong>
                  </div>
                  <div>
                    <span style={{ display: "block", color: "var(--muted)", fontSize: "0.75rem", textTransform: "uppercase" }}>
                      {language === "bm" ? "Tarikh Permohonan" : "Application Date"}
                    </span>
                    <strong>{formatDate(selectedApp.request_date)}</strong>
                  </div>
                  <div>
                    <span style={{ display: "block", color: "var(--muted)", fontSize: "0.75rem", textTransform: "uppercase" }}>
                      {language === "bm" ? "Bukti Tiket" : "Ticket Proof"}
                    </span>
                    {selectedApp.ticket_proof_url ? (
                      <a
                        href={selectedApp.ticket_proof_url}
                        target="_blank"
                        rel="noreferrer"
                        style={{ textDecoration: "underline", color: "var(--brand-2)", fontWeight: "bold" }}
                      >
                        {language === "bm" ? "Lihat Bukti Tiket" : "View Ticket Proof"}
                      </a>
                    ) : (
                      <span>—</span>
                    )}
                  </div>
                  <div style={{ gridColumn: "span 2", wordBreak: "break-word" }}>
                    <span style={{ display: "block", color: "var(--muted)", fontSize: "0.75rem", textTransform: "uppercase" }}>
                      {language === "bm" ? "Nota Pelajar" : "Student Notes"}
                    </span>
                    <div style={{ marginTop: "4px", background: "var(--soft-bg)", padding: "8px", borderRadius: "4px" }}>
                      {selectedApp.notes || "—"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 4: Decision and Repayment */}
              <div className="ikes-info-card" style={{
                backgroundColor: "var(--surface)",
                border: "1px solid var(--line)",
                borderRadius: "8px",
                padding: "20px",
                boxShadow: "var(--shadow-sm)"
              }}>
                <h4 style={{
                  fontSize: "1rem",
                  color: "var(--brand-2)",
                  borderBottom: "1px solid var(--line)",
                  paddingBottom: "4px",
                  marginBottom: "12px",
                  fontWeight: "bold",
                  marginTop: 0
                }}>
                  {language === "bm" ? "Keputusan & Bayaran Balik" : "Decision & Repayment"}
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "0.85rem" }}>
                  <div>
                    <span style={{ display: "block", color: "var(--muted)", fontSize: "0.75rem", textTransform: "uppercase" }}>
                      {language === "bm" ? "Status Semasa" : "Current Status"}
                    </span>
                    <div style={{ marginTop: "4px" }}><StatusBadge status={selectedApp.status} /></div>
                  </div>
                  <div>
                    <span style={{ display: "block", color: "var(--muted)", fontSize: "0.75rem", textTransform: "uppercase" }}>
                      {language === "bm" ? "Jumlah Diluluskan" : "Amount Approved"}
                    </span>
                    <strong>{selectedApp.amount_approved !== undefined ? money(selectedApp.amount_approved) : "—"}</strong>
                  </div>
                  <div>
                    <span style={{ display: "block", color: "var(--muted)", fontSize: "0.75rem", textTransform: "uppercase" }}>
                      {language === "bm" ? "Tarikh Keputusan" : "Decision Date"}
                    </span>
                    <strong>{selectedApp.decision_date ? formatDate(selectedApp.decision_date) : "—"}</strong>
                  </div>
                  <div>
                    <span style={{ display: "block", color: "var(--muted)", fontSize: "0.75rem", textTransform: "uppercase" }}>
                      {language === "bm" ? "Tarikh Bayaran" : "Payment Date"}
                    </span>
                    <strong>{selectedApp.payment_date ? formatDate(selectedApp.payment_date) : "—"}</strong>
                  </div>
                  <div>
                    <span style={{ display: "block", color: "var(--muted)", fontSize: "0.75rem", textTransform: "uppercase" }}>
                      {language === "bm" ? "Tarikh Akhir Bayaran Balik" : "Repayment Due Date"}
                    </span>
                    <strong>{selectedApp.repayment_due_date ? formatDate(selectedApp.repayment_due_date) : "—"}</strong>
                  </div>
                  <div>
                    <span style={{ display: "block", color: "var(--muted)", fontSize: "0.75rem", textTransform: "uppercase" }}>
                      {language === "bm" ? "Jumlah Dibayar Balik" : "Amount Repaid"}
                    </span>
                    <strong>{selectedApp.amount_repaid !== undefined ? money(selectedApp.amount_repaid) : "—"}</strong>
                  </div>
                  <div>
                    <span style={{ display: "block", color: "var(--muted)", fontSize: "0.75rem", textTransform: "uppercase" }}>
                      {language === "bm" ? "Baki Terhutang" : "Outstanding Amount"}
                    </span>
                    <strong>
                      {selectedApp.outstanding_amount !== undefined ? money(selectedApp.outstanding_amount) : (
                        selectedApp.amount_approved !== undefined ? money(Math.max(0, selectedApp.amount_approved - (selectedApp.amount_repaid || 0))) : "—"
                      )}
                    </strong>
                  </div>
                  <div>
                    <span style={{ display: "block", color: "var(--muted)", fontSize: "0.75rem", textTransform: "uppercase" }}>
                      {language === "bm" ? "Administrator Meluluskan" : "Approving Administrator"}
                    </span>
                    <strong>{selectedApp.approved_by || "—"}</strong>
                  </div>
                  {selectedApp.rejection_reason && (
                    <div style={{ gridColumn: "span 2", wordBreak: "break-word" }}>
                      <span style={{ display: "block", color: "var(--muted)", fontSize: "0.75rem", textTransform: "uppercase" }}>
                        {language === "bm" ? "Sebab Penolakan" : "Sebab Penolakan"}
                      </span>
                      <div style={{ marginTop: "4px", background: "rgba(145, 55, 55, 0.08)", padding: "8px", borderRadius: "4px", color: "#913737", fontWeight: "bold" }}>
                        {selectedApp.rejection_reason}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div style={{ marginTop: "28px", display: "flex", justifyContent: "flex-end", borderTop: "1px solid var(--line)", paddingTop: "16px" }}>
              <button
                onClick={() => { setSelectedApp(null); setCopied(false); }}
                style={{
                  padding: "8px 20px",
                  backgroundColor: "var(--line)",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontWeight: "bold"
                }}
              >
                {language === "bm" ? "Tutup" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation dialog overlay */}
      {appToDelete && (
        <div className="modal-backdrop" onClick={() => setDeleteConfirmId(null)} style={{ display: "flex" }}>
          <div className="officer-modal" onClick={(e) => e.stopPropagation()} style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
            <h3 style={{ margin: "0 0 12px 0", font: "600 1.5rem var(--serif)", color: "var(--text-primary)" }}>
              {language === "bm" ? "Padam rekod permohonan iKES?" : "Delete iKES application record?"}
            </h3>
            <p style={{ margin: "16px 0", color: "var(--muted)", fontSize: "0.9rem" }}>
              {language === "bm"
                ? "Tindakan ini akan memadamkan rekod permohonan yang dipilih. Tindakan ini tidak boleh dibatalkan."
                : "This action will delete the selected application record. This action cannot be undone."}
            </p>
            <div style={{ margin: "16px 0", textAlign: "left", fontSize: "0.85rem", border: "1px solid var(--line)", padding: "12px", borderRadius: "8px", background: "var(--soft-bg)" }}>
              <div><strong>{language === "bm" ? "Nama Pemohon:" : "Applicant Name:"}</strong> {appToDelete.user_name || appToDelete.user_id}</div>
              <div><strong>{language === "bm" ? "Rujukan Permohonan:" : "Application Reference Number:"}</strong> {appToDelete.application_id}</div>
              <div><strong>{language === "bm" ? "Tarikh Permohonan:" : "Application Date:"}</strong> {formatDate(appToDelete.request_date)}</div>
              <div><strong>{language === "bm" ? "Status Semasa:" : "Current Status:"}</strong> <StatusBadge status={appToDelete.status} /></div>
            </div>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center", marginTop: "24px" }}>
              <button
                type="button"
                className="button button--outline"
                onClick={() => setDeleteConfirmId(null)}
              >
                {language === "bm" ? "Batal" : "Cancel"}
              </button>
              <button
                type="button"
                className="button"
                style={{ background: "red", borderColor: "red", color: "white" }}
                onClick={async () => {
                  await onDelete(appToDelete.application_id);
                  if (selectedApp?.application_id === appToDelete.application_id) {
                    setSelectedApp(null);
                  }
                  setDeleteConfirmId(null);
                }}
              >
                {language === "bm" ? "Padam Rekod" : "Delete Record"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function TabungAdmin({
  records,
  onCreate,
  onDelete,
  onToggleVisibility,
  busy
}: {
  records: TabungRecord[];
  onCreate: (record: Omit<TabungRecord, "record_id" | "recorded_by">) => void;
  onDelete: (recordId: string) => void;
  onToggleVisibility: (recordId: string, visible: boolean) => void;
  busy: boolean;
}) {
  const { language } = useApp();
  const [form, setForm] = useState<Omit<TabungRecord, "record_id" | "recorded_by">>({ type: "COLLECTION", amount: 0, date: new Date().toISOString().slice(0,10), description: "", recipient: "" });
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const recordToDelete = records.find(r => r.record_id === deleteConfirmId);

  return (
    <div className="admin-grid">
      <section className="admin-card">
        <div className="admin-card__heading">
          <div>
            <h2>Add record</h2>
            <p>Every collection and distribution becomes part of the public report.</p>
          </div>
        </div>
        <form className="application-form" onSubmit={(e) => { e.preventDefault(); onCreate(form); setForm({ ...form, amount: 0, description: "", recipient: "" }); }}>
          <label>
            <span>Type</span>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as TabungRecord["type"] })}>
              <option>COLLECTION</option>
              <option>DISTRIBUTION</option>
            </select>
          </label>
          <label>
            <span>Amount (RM)</span>
            <input required type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}/>
          </label>
          <label>
            <span>Date</span>
            <input required type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}/>
          </label>
          <label>
            <span>Description / purpose</span>
            <textarea required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}/>
          </label>
          {form.type === "DISTRIBUTION" && (
            <label>
              <span>Recipient (optional)</span>
              <input value={form.recipient || ""} onChange={(e) => setForm({ ...form, recipient: e.target.value })}/>
            </label>
          )}
          <button disabled={busy} className="button" type="submit">
            <Icon name="plus" size={17}/>Add record
          </button>
        </form>
      </section>

      <section className="admin-card">
        <div className="admin-card__heading">
          <h2>Recent records</h2>
        </div>
        <div className="admin-list">
          {records.slice().sort((a,b) => b.date.localeCompare(a.date)).slice(0,12).map((record) => {
            const isPublic = record.display_on_public === true || record.display_on_public === "true" || record.display_on_public === undefined || record.display_on_public === "";
            return (
              <article key={record.record_id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <strong>{record.description}</strong>
                  <span>{record.type} · {formatDate(record.date)}</span>
                  <div style={{ marginTop: "4px" }}>
                    <label className="check-field" style={{ margin: 0, padding: 0, fontSize: "0.75rem" }}>
                      <input
                        type="checkbox"
                        checked={isPublic}
                        onChange={(e) => onToggleVisibility(record.record_id, e.target.checked)}
                        disabled={busy}
                      />
                      <span>{language === "bm" ? "Paparkan pada halaman awam" : "Display on public page"}</span>
                    </label>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <b className={record.type === "COLLECTION" ? "positive" : "negative"}>
                    {record.type === "COLLECTION" ? "+" : "−"}{money(record.amount)}
                  </b>
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmId(record.record_id)}
                    className="danger-icon"
                    style={{ background: "transparent", border: "none", cursor: "pointer", padding: "4px" }}
                    title={language === "bm" ? "Padam" : "Delete"}
                  >
                    <Icon name="trash" size={17} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Delete confirmation dialog overlay */}
      {recordToDelete && (
        <div className="modal-backdrop" onClick={() => setDeleteConfirmId(null)} style={{ display: "flex" }}>
          <div className="officer-modal" onClick={(e) => e.stopPropagation()} style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
            <h3 style={{ margin: "0 0 12px 0", font: "600 1.5rem var(--serif)", color: "var(--text-primary)" }}>
              {language === "bm"
                ? `Padam rekod ${recordToDelete.description}?`
                : `Delete record ${recordToDelete.description}?`}
            </h3>
            <p style={{ margin: "16px 0", color: "var(--muted)", fontSize: "0.9rem" }}>
              {language === "bm"
                ? "Tindakan ini akan memadamkan rekod yang dipilih. Tindakan ini tidak boleh dibatalkan."
                : "This action will delete the selected record. This action cannot be undone."}
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center", marginTop: "24px" }}>
              <button
                type="button"
                className="button button--outline"
                onClick={() => setDeleteConfirmId(null)}
              >
                {language === "bm" ? "Batal" : "Cancel"}
              </button>
              <button
                type="button"
                className="button"
                style={{ background: "red", borderColor: "red", color: "white" }}
                onClick={() => {
                  onDelete(recordToDelete.record_id);
                  setDeleteConfirmId(null);
                }}
              >
                {language === "bm" ? "Padam Rekod" : "Delete Record"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AnnouncementAdmin({ items, setItems, onSave, idToken, busy }: { items: Announcement[]; setItems: (items: Announcement[]) => void; onSave: () => void; idToken: string; busy: boolean }) {
  const { language } = useApp();
  const add = () => setItems([{ announcement_id: uid("ANN").toUpperCase(), title: { bm: "Pengumuman baharu", en: "New announcement" }, content: { bm: "Kandungan pengumuman.", en: "Announcement content." }, category: "General", attachment_url: "", publish_date: new Date().toISOString().slice(0,10), created_by: "", responsible_officer: "", image_url: "" }, ...items]);
  return <section className="admin-card"><div className="admin-card__heading"><div><h2>Announcement Centre</h2><p>Create bilingual notices, categories and PDF links.</p></div><button className="button button--small button--outline" onClick={add}><Icon name="plus" size={16}/>New announcement</button></div><div className="announcement-editor">{items.map((item,index) => <article key={item.announcement_id}><div className="page-editor-list__top"><strong>{item.announcement_id}</strong><button className="danger-icon" onClick={() => setItems(items.filter((_,i) => i !== index))}><Icon name="trash" size={17}/></button></div><LocalizedInputs label="Title" value={item.title} onChange={(title) => { const next=[...items]; next[index]={...item,title}; setItems(next); }}/><LocalizedInputs label="Content" multiline value={item.content} onChange={(content) => { const next=[...items]; next[index]={...item,content}; setItems(next); }}/><div className="form-grid"><label><span>Category</span><input value={item.category} onChange={(e) => { const next=[...items]; next[index]={...item,category:e.target.value}; setItems(next); }}/></label><label><span>Publish date</span><input type="date" value={item.publish_date} onChange={(e) => { const next=[...items]; next[index]={...item,publish_date:e.target.value}; setItems(next); }}/></label><label><span>Attachment URL</span><input value={item.attachment_url} onChange={(e) => { const next=[...items]; next[index]={...item,attachment_url:e.target.value}; setItems(next); }}/></label><label><span>Responsible officer</span><input value={item.responsible_officer || ""} onChange={(e) => { const next=[...items]; next[index]={...item,responsible_officer:e.target.value}; setItems(next); }}/></label></div>
    {(() => {
      const currentType = item.image_url ? "POSTER" : (item.attachment_url ? "DOCUMENT" : "POSTER");
      return (
        <div style={{ marginTop: "16px", border: "1px solid var(--line)", borderRadius: "8px", padding: "16px", background: "var(--soft)" }}>
          <strong style={{ display: "block", fontSize: "0.85rem", color: "var(--brand-2)", marginBottom: "12px", textTransform: "uppercase" }}>
            {language === "bm" ? "Media Pengumuman" : "Announcement Media"}
          </strong>
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "center", marginBottom: "16px" }}>
            <label style={{ display: "flex", flexDirection: "row", gap: "8px", alignItems: "center", cursor: "pointer", fontSize: "0.85rem" }}>
              <input
                type="radio"
                name={`media-type-${item.announcement_id}`}
                checked={currentType === "POSTER"}
                onChange={() => {
                  const next = [...items];
                  next[index] = { ...item };
                  setItems(next);
                }}
              />
              <span>{language === "bm" ? "Poster Pengumuman (Gambar PNG, JPG)" : "Announcement Poster (Image)"}</span>
            </label>
            <label style={{ display: "flex", flexDirection: "row", gap: "8px", alignItems: "center", cursor: "pointer", fontSize: "0.85rem" }}>
              <input
                type="radio"
                name={`media-type-${item.announcement_id}`}
                checked={currentType === "DOCUMENT"}
                onChange={() => {
                  const next = [...items];
                  next[index] = { ...item };
                  setItems(next);
                }}
              />
              <span>{language === "bm" ? "Dokumen Lampiran (PDF)" : "Document Attachment (PDF)"}</span>
            </label>
          </div>

          <div>
            {currentType === "POSTER" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <MediaUploader
                  purpose="announcement_image"
                  idToken={idToken}
                  currentUrl={item.image_url || ""}
                  onUploadSuccess={(url) => { const next = [...items]; next[index] = { ...item, image_url: url }; setItems(next); }}
                  onRemove={() => { const next = [...items]; next[index] = { ...item, image_url: "" }; setItems(next); }}
                  label={language === "bm" ? "Muat naik Poster Pengumuman" : "Upload Announcement Poster"}
                />
                <small style={{ color: "var(--muted)", fontSize: "0.75rem" }}>
                  {language === "bm" ? "Poster dalam format PNG, JPG atau JPEG. Maksimum 10 MB." : "Poster in PNG, JPG or JPEG format. Max 10 MB."}
                </small>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <MediaUploader
                  purpose="announcement_pdf"
                  idToken={idToken}
                  currentUrl={item.attachment_url || ""}
                  onUploadSuccess={(url) => { const next = [...items]; next[index] = { ...item, attachment_url: url }; setItems(next); }}
                  onRemove={() => { const next = [...items]; next[index] = { ...item, attachment_url: "" }; setItems(next); }}
                  label={language === "bm" ? "Muat naik Dokumen Lampiran" : "Upload Document Attachment"}
                />
                <small style={{ color: "var(--muted)", fontSize: "0.75rem" }}>
                  {language === "bm" ? "Dokumen lampiran dalam format PDF. Maksimum 2.5 MB." : "Document attachment in PDF format. Max 2.5 MB."}
                </small>
              </div>
            )}
          </div>
        </div>
      );
    })()}
  </article>)}</div><div className="admin-card__footer"><button disabled={busy} className="button" onClick={onSave}><Icon name="save" size={17}/>Save announcements</button></div></section>;
}

function OrganisationEditor({
  items,
  setItems,
  officers,
  setOfficers,
  onSave,
  busy
}: {
  items: OrgItem[];
  setItems: (items: OrgItem[]) => void;
  officers: any[];
  setOfficers: (officers: any[]) => void;
  onSave: (items: OrgItem[], officers: any[]) => Promise<void>;
  busy: boolean;
}) {
  const { language } = useApp();
  const [activeSubTab, setActiveSubTab] = useState<"units" | "officers" | "preview">("units");

  // --- UNIT OPERATIONS ---
  const addUnit = () => {
    const nextSortOrder = items.length > 0 ? Math.max(...items.map(i => i.sort_order || 0)) + 1 : 1;
    setItems([
      ...items,
      {
        id: uid("org"),
        type: "UNIT",
        title: "New Item",
        code: "",
        member_count: 1,
        sort_order: nextSortOrder,
        is_active: true
      }
    ]);
  };

  const updateUnit = (id: string, patch: Partial<OrgItem>) => {
    const next = items.map((item) => item.id === id ? { ...item, ...patch } : item);
    setItems(next);
  };

  const removeUnit = (id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    const confirm = window.confirm(`Are you sure you want to remove "${item.title || "this item"}"?`);
    if (confirm) {
      setItems(items.filter((i) => i.id !== id));
    }
  };

  const moveUnit = (id: string, direction: "up" | "down") => {
    const sorted = [...items].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    const index = sorted.findIndex((i) => i.id === id);
    if (index === -1) return;
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === sorted.length - 1) return;

    const swapWith = direction === "up" ? index - 1 : index + 1;
    const currentItem = sorted[index];
    const targetItem = sorted[swapWith];

    const tempOrder = currentItem.sort_order;
    currentItem.sort_order = targetItem.sort_order;
    targetItem.sort_order = tempOrder;

    const next = items.map((item) => {
      if (item.id === currentItem.id) return currentItem;
      if (item.id === targetItem.id) return targetItem;
      return item;
    });
    setItems(next);
  };

  // --- OFFICER OPERATIONS ---
  const addOfficer = () => {
    const nextSortOrder = officers.length > 0 ? Math.max(...officers.map(o => o.sortOrder || 1)) + 1 : 1;
    setOfficers([
      ...officers,
      {
        id: uid("off"),
        name: "New Officer",
        position: "Pegawai",
        photoUrl: "",
        unitId: items[0]?.id || "",
        sortOrder: nextSortOrder,
        isActive: true,
        email: "officer@student.ipgm.edu.my",
        responsibilities: "Tanggungjawab kerja pegawai"
      }
    ]);
  };

  const updateOfficer = (id: string, patch: Partial<any>) => {
    const next = officers.map((officer) => officer.id === id ? { ...officer, ...patch } : officer);
    setOfficers(next);
  };

  const removeOfficer = (id: string) => {
    const officer = officers.find((o) => o.id === id);
    if (!officer) return;
    const confirm = window.confirm(`Are you sure you want to remove officer "${officer.name || "this officer"}"?`);
    if (confirm) {
      setOfficers(officers.filter((o) => o.id !== id));
    }
  };

  // --- TREE CHART DATA MAP ---
  const activeItems = items.filter(i => i.is_active);
  const activeOfficers = officers.filter(o => o.isActive);

  // Treasurer (lowest sort_order leadership item, or code BAK)
  const treasurerItem = activeItems
    .filter(i => i.type === "LEADERSHIP")
    .sort((a, b) => a.sort_order - b.sort_order)[0];
  const treasurerOfficer = treasurerItem ? activeOfficers.find(o => o.unitId === treasurerItem.id) : null;

  // Deputy Treasurer (second lowest sort_order leadership item, or code NBAK)
  const deputyItem = activeItems
    .filter(i => i.type === "LEADERSHIP")
    .sort((a, b) => a.sort_order - b.sort_order)[1];
  const deputyOfficer = deputyItem ? activeOfficers.find(o => o.unitId === deputyItem.id) : null;

  // Units
  const unitItems = activeItems
    .filter(i => i.type === "UNIT")
    .sort((a, b) => a.sort_order - b.sort_order);

  return (
    <section className="admin-card">
      <style>{`
        .subtab-buttons {
          display: flex;
          gap: 12px;
          border-bottom: 1px solid var(--line);
          margin-bottom: 24px;
          padding-bottom: 12px;
        }
        .subtab-buttons button {
          padding: 8px 16px;
          border-radius: 6px;
          border: 1px solid var(--line);
          background: var(--surface);
          color: var(--text-secondary);
          font-weight: bold;
        }
        .subtab-buttons button.active {
          background: var(--brand);
          color: white;
          border-color: var(--brand);
        }
        .org-preview-container {
          background: var(--surface-muted);
          border: 1px solid var(--line);
          border-radius: 12px;
          padding: 32px 16px;
          overflow-x: auto;
          width: 100%;
          min-height: 400px;
        }

        .org-chart-tree {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 32px;
          width: 100%;
        }

        .org-chart-node {
          background: var(--bg);
          border: 1px solid var(--line);
          border-radius: 8px;
          padding: 16px;
          width: 240px;
          text-align: center;
          position: relative;
          box-shadow: var(--shadow-sm);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          margin: 0 auto;
        }

        .org-chart-node img {
          width: 80px;
          height: 80px;
          object-fit: cover;
          border-radius: 50%;
          border: 3px solid var(--brand-2);
          background: var(--brand-soft);
        }

        .org-chart-node .node-position {
          color: var(--brand-2);
          font-size: 0.68rem;
          font-weight: 850;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          line-height: 1.2;
        }

        .org-chart-node .node-name {
          font-size: 1rem;
          font-weight: bold;
          color: var(--text-primary);
          line-height: 1.25;
        }

        .org-chart-node .node-details {
          font-size: 0.75rem;
          color: var(--muted);
        }

        .org-chart-line-v {
          width: 2px;
          height: 32px;
          background: var(--line);
          margin: 0 auto;
        }

        .org-chart-branches {
          display: flex;
          justify-content: center;
          gap: 32px;
          width: 100%;
          position: relative;
        }

        .org-chart-branch {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 24px;
          position: relative;
        }

        .org-chart-branch::before {
          content: "";
          position: absolute;
          top: -32px;
          left: 50%;
          transform: translateX(-50%);
          width: 2px;
          height: 32px;
          background: var(--line);
        }

        .org-chart-branch::after {
          content: "";
          position: absolute;
          top: -32px;
          height: 2px;
          background: var(--line);
          width: 100%;
        }

        .org-chart-branch:first-child::after {
          left: 50%;
          width: 50%;
        }

        .org-chart-branch:last-child::after {
          right: 50%;
          width: 50%;
        }

        .org-chart-branch:only-child::after {
          display: none;
        }

        .org-chart-unit-card {
          background: var(--brand-soft);
          border: 1px solid var(--brand-2);
          color: var(--brand-2);
          font-size: 0.78rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 6px 12px;
          border-radius: 6px;
          text-align: center;
          min-width: 160px;
          z-index: 10;
        }

        .org-chart-members {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        @media (max-width: 960px) {
          .org-chart-branches {
            flex-direction: column;
            align-items: center;
            gap: 48px;
          }

          .org-chart-branch {
            width: 100%;
          }

          .org-chart-branch::before,
          .org-chart-branch::after {
            display: none;
          }

          .org-chart-members {
            width: 100%;
            align-items: center;
          }
        }
      `}</style>

      <div className="admin-card__heading" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2>{language === "bm" ? "Carta Organisasi & Unit" : "Organisation Chart & Units"}</h2>
          <p>{language === "bm" ? "Urus perbendaharaan dalam sistem visual hierarki yang kemas." : "Manage the treasury in a neat hierarchical visual system."}</p>
        </div>
        <div>
          {activeSubTab === "units" && (
            <button className="button button--small button--outline" onClick={addUnit}>
              <Icon name="plus" size={16} /> {language === "bm" ? "Tambah Unit/Jawatan" : "Add Unit/Position"}
            </button>
          )}
          {activeSubTab === "officers" && (
            <button className="button button--small button--outline" onClick={addOfficer}>
              <Icon name="plus" size={16} /> {language === "bm" ? "Tambah Pegawai" : "Add Officer"}
            </button>
          )}
        </div>
      </div>

      <div className="subtab-buttons">
        <button className={activeSubTab === "units" ? "active" : ""} onClick={() => setActiveSubTab("units")}>
          {language === "bm" ? "1. Unit & Jawatan" : "1. Units & Positions"}
        </button>
        <button className={activeSubTab === "officers" ? "active" : ""} onClick={() => setActiveSubTab("officers")}>
          {language === "bm" ? "2. Pegawai Pasukan" : "2. Team Officers"}
        </button>
        <button className={activeSubTab === "preview" ? "active" : ""} onClick={() => setActiveSubTab("preview")}>
          {language === "bm" ? "3. Pratinjau Carta" : "3. Chart Preview"}
        </button>
      </div>

      {activeSubTab === "units" && (
        <div className="organisation-editor" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {[...items]
            .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
            .map((item, index, arr) => (
              <article
                key={item.id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                  padding: "16px",
                  border: "1px solid var(--line)",
                  borderRadius: "8px",
                  background: item.is_active ? "var(--bg)" : "var(--soft-bg)",
                  opacity: item.is_active ? 1 : 0.7,
                  position: "relative"
                }}
              >
                <div style={{ display: "flex", gap: "12px", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      disabled={index === 0}
                      onClick={() => moveUnit(item.id, "up")}
                      className="button button--small button--outline"
                      style={{ padding: "4px 8px" }}
                    >
                      ▲
                    </button>
                    <button
                      disabled={index === arr.length - 1}
                      onClick={() => moveUnit(item.id, "down")}
                      className="button button--small button--outline"
                      style={{ padding: "4px 8px" }}
                    >
                      ▼
                    </button>
                  </div>

                  <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                    <label className="check-field" style={{ margin: 0 }}>
                      <input
                        type="checkbox"
                        checked={item.is_active}
                        onChange={(e) => updateUnit(item.id, { is_active: e.target.checked })}
                      />
                      <span>Active</span>
                    </label>
                    <button
                      className="danger-icon"
                      onClick={() => removeUnit(item.id)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "red",
                        cursor: "pointer",
                        padding: "4px"
                      }}
                    >
                      <Icon name="trash" size={18} />
                    </button>
                  </div>
                </div>

                <div className="form-grid" style={{ gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <label>
                    <span>Type</span>
                    <select
                      value={item.type}
                      onChange={(e) => updateUnit(item.id, { type: e.target.value as "LEADERSHIP" | "UNIT" })}
                    >
                      <option value="LEADERSHIP">LEADERSHIP</option>
                      <option value="UNIT">UNIT</option>
                    </select>
                  </label>

                  <label>
                    <span>Code</span>
                    <input
                      type="text"
                      placeholder="e.g. BAK, U-DOPE"
                      value={item.code}
                      onChange={(e) => updateUnit(item.id, { code: e.target.value })}
                    />
                  </label>

                  <label style={{ gridColumn: "span 2" }}>
                    <span>Title</span>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Bendahari Agung Kehormat"
                      value={item.title}
                      onChange={(e) => updateUnit(item.id, { title: e.target.value })}
                    />
                  </label>

                  <label>
                    <span>Member Count</span>
                    <input
                      type="number"
                      min="1"
                      required
                      value={item.member_count}
                      onChange={(e) => updateUnit(item.id, { member_count: parseInt(e.target.value, 10) || 1 })}
                    />
                  </label>

                  <label>
                    <span>Sort Order</span>
                    <input
                      type="number"
                      value={item.sort_order}
                      onChange={(e) => updateUnit(item.id, { sort_order: parseInt(e.target.value, 10) || 1 })}
                    />
                  </label>
                </div>
              </article>
            ))}
        </div>
      )}

      {activeSubTab === "officers" && (
        <div className="organisation-editor" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {[...officers]
            .sort((a, b) => (a.sortOrder || 1) - (b.sortOrder || 1))
            .map((officer, index) => (
              <article
                key={officer.id || index}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                  padding: "16px",
                  border: "1px solid var(--line)",
                  borderRadius: "8px",
                  background: officer.isActive ? "var(--bg)" : "var(--soft-bg)",
                  opacity: officer.isActive ? 1 : 0.7,
                  position: "relative"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: "bold", color: "var(--brand-2)" }}>
                    Pegawai #{index + 1} : {officer.name}
                  </span>
                  <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                    <label className="check-field" style={{ margin: 0 }}>
                      <input
                        type="checkbox"
                        checked={officer.isActive}
                        onChange={(e) => updateOfficer(officer.id, { isActive: e.target.checked })}
                      />
                      <span>Active</span>
                    </label>
                    <button
                      className="danger-icon"
                      onClick={() => removeOfficer(officer.id)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "red",
                        cursor: "pointer",
                        padding: "4px"
                      }}
                    >
                      <Icon name="trash" size={18} />
                    </button>
                  </div>
                </div>

                <div className="form-grid" style={{ gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <label>
                    <span>Full Name</span>
                    <input
                      type="text"
                      required
                      value={officer.name}
                      onChange={(e) => updateOfficer(officer.id, { name: e.target.value })}
                    />
                  </label>

                  <label>
                    <span>Assigned Unit / Position</span>
                    <select
                      value={officer.unitId}
                      onChange={(e) => {
                        const selectedUnit = items.find(u => u.id === e.target.value);
                        updateOfficer(officer.id, {
                          unitId: e.target.value,
                          position: selectedUnit ? selectedUnit.title : officer.position
                        });
                      }}
                    >
                      <option value="">-- No Unit (None) --</option>
                      {items.map(unit => (
                        <option key={unit.id} value={unit.id}>
                          {unit.title} ({unit.code || "No Code"})
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span>Official Role Title (Manual Override if needed)</span>
                    <input
                      type="text"
                      value={officer.position}
                      onChange={(e) => updateOfficer(officer.id, { position: e.target.value })}
                    />
                  </label>

                  <label>
                    <span>Email Address</span>
                    <input
                      type="email"
                      value={officer.email || ""}
                      onChange={(e) => updateOfficer(officer.id, { email: e.target.value })}
                    />
                  </label>

                  <label style={{ gridColumn: "span 2" }}>
                    <span>Official Photo URL</span>
                    <input
                      type="text"
                      placeholder="Upload photo or paste URL"
                      value={officer.photoUrl || ""}
                      onChange={(e) => updateOfficer(officer.id, { photoUrl: e.target.value })}
                    />
                  </label>

                  <div style={{ gridColumn: "span 2", background: "var(--soft-bg)", padding: "12px", borderRadius: "8px", border: "1px dashed var(--line)" }}>
                    <MediaUploader
                      purpose="officer_photo"
                      idToken={sessionStorage.getItem("lfx-user") ? JSON.parse(sessionStorage.getItem("lfx-user")!).idToken : ""}
                      currentUrl={officer.photoUrl || ""}
                      onUploadSuccess={(url) => updateOfficer(officer.id, { photoUrl: url })}
                      onRemove={() => updateOfficer(officer.id, { photoUrl: "" })}
                      label={language === "bm" ? "Muat naik Gambar Pegawai" : "Upload Officer Photograph"}
                    />
                  </div>

                  <label style={{ gridColumn: "span 2" }}>
                    <span>Biography & Key Responsibilities</span>
                    <textarea
                      rows={3}
                      value={officer.responsibilities || ""}
                      onChange={(e) => updateOfficer(officer.id, { responsibilities: e.target.value })}
                    />
                  </label>

                  <label>
                    <span>Sort Order (Display priority)</span>
                    <input
                      type="number"
                      value={officer.sortOrder || 1}
                      onChange={(e) => updateOfficer(officer.id, { sortOrder: parseInt(e.target.value, 10) || 1 })}
                    />
                  </label>
                </div>
              </article>
            ))}
        </div>
      )}

      {activeSubTab === "preview" && (
        <div className="org-preview-container">
          <div className="org-chart-tree" style={{ "--branch-count": unitItems.length } as any}>
            {/* Level 1: Treasurer */}
            {treasurerOfficer ? (
              <div className="org-chart-node">
                <CmsImage
                  src={treasurerOfficer.photoUrl || "/officer-placeholder.svg"}
                  alt={treasurerOfficer.name}
                  width={100}
                  height={100}
                  variant="officer-avatar"
                />
                <span className="node-position">{treasurerOfficer.position}</span>
                <strong className="node-name">{treasurerOfficer.name}</strong>
                <small className="node-details">{treasurerOfficer.email}</small>
              </div>
            ) : (
              <div className="org-chart-node" style={{ borderStyle: "dashed" }}>
                <span className="node-position">BENDAHARI AGUNG</span>
                <strong className="node-name" style={{ opacity: 0.5 }}>— Belum Ditetapkan —</strong>
              </div>
            )}

            <div className="org-chart-line-v"></div>

            {/* Level 2: Deputy Treasurer */}
            {deputyOfficer ? (
              <div className="org-chart-node">
                <CmsImage
                  src={deputyOfficer.photoUrl || "/officer-placeholder.svg"}
                  alt={deputyOfficer.name}
                  width={100}
                  height={100}
                  variant="officer-avatar"
                />
                <span className="node-position">{deputyOfficer.position}</span>
                <strong className="node-name">{deputyOfficer.name}</strong>
                <small className="node-details">{deputyOfficer.email}</small>
              </div>
            ) : (
              <div className="org-chart-node" style={{ borderStyle: "dashed" }}>
                <span className="node-position">NAIB BENDAHARI AGUNG</span>
                <strong className="node-name" style={{ opacity: 0.5 }}>— Belum Ditetapkan —</strong>
              </div>
            )}

            <div className="org-chart-line-v"></div>

            {/* Level 3: Unit branches */}
            <div className="org-chart-branches">
              {unitItems.map((unit) => {
                const members = activeOfficers
                  .filter(o => o.unitId === unit.id)
                  .sort((a, b) => (a.sortOrder || 1) - (b.sortOrder || 1));

                return (
                  <div key={unit.id} className="org-chart-branch">
                    <div className="org-chart-unit-card">
                      {unit.title}
                      {unit.code && <span style={{ marginLeft: "6px", fontSize: "0.75rem", background: "var(--accent)", color: "var(--background)", padding: "1px 4px", borderRadius: "3px" }}>{unit.code}</span>}
                    </div>

                    <div className="org-chart-members">
                      {members.length > 0 ? (
                        members.map((member) => (
                          <div key={member.id} className="org-chart-node">
                            <CmsImage
                              src={member.photoUrl || "/officer-placeholder.svg"}
                              alt={member.name}
                              width={80}
                              height={80}
                              variant="officer-avatar"
                            />
                            <span className="node-position">{member.position}</span>
                            <strong className="node-name" style={{ fontSize: "1.05rem" }}>{member.name}</strong>
                            <small className="node-details" style={{ fontSize: "0.75rem" }}>{member.email}</small>
                          </div>
                        ))
                      ) : (
                        <div style={{ color: "var(--muted)", fontSize: "0.8rem", fontStyle: "italic", border: "1px dashed var(--line)", padding: "12px", borderRadius: "8px" }}>
                          No officers assigned
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="admin-card__footer" style={{ marginTop: "24px", paddingTop: "16px", borderTop: "1px solid var(--line)" }}>
        <button disabled={busy} className="button" onClick={() => onSave(items, officers)}>
          <Icon name="save" size={17} /> {busy ? "Saving..." : (language === "bm" ? "Simpan Organisasi" : "Save organisation")}
        </button>
      </div>
    </section>
  );
}
