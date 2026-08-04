"use client";

import { useEffect, useMemo, useState } from "react";
import { CmsImage } from "@/components/CmsImage";
import { Icon } from "@/components/Icon";
import { useApp } from "@/components/Providers";
import { useContent } from "@/components/ContentProvider";
import { apiGet, isDemoMode } from "@/lib/api";
import { demoStore } from "@/lib/demo-store";
import { formatDate, money, uid } from "@/lib/format";
import { t } from "@/lib/i18n";
import type { TabungRecord } from "@/lib/types";

export function TabungDashboard({ compact = false }: { compact?: boolean }) {
  const [records, setRecords] = useState<TabungRecord[]>([]);
  const { language, labels } = useApp();
  const { content } = useContent();

  // States for interactive donation amount selector
  const [selectedAmount, setSelectedAmount] = useState<number | "custom" | null>(null);
  const [customAmountText, setCustomAmountText] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmedAmount, setConfirmedAmount] = useState<number | null>(null);
  const [showSuccess, setShowSuccess] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content.donation.accountNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAmountSelect = (amount: number | "custom") => {
    setSelectedAmount(amount);
    setErrorMsg(null);
    if (amount !== "custom") {
      setCustomAmountText("");
    }
  };

  const handleCustomTextChange = (text: string) => {
    // Trim leading zeros and keep only numbers and up to 2 decimal places
    let cleaned = text.replace(/[^0-9.]/g, "");
    // Prevent multiple dots
    const dots = cleaned.split(".");
    if (dots.length > 2) {
      cleaned = dots[0] + "." + dots.slice(1).join("");
    }
    // Limit decimal precision to 2
    if (dots[1] && dots[1].length > 2) {
      cleaned = dots[0] + "." + dots[1].slice(0, 2);
    }
    // Trim unnecessary leading zeros unless it's "0." or "0"
    if (cleaned.startsWith("0") && cleaned.length > 1 && !cleaned.startsWith("0.")) {
      cleaned = cleaned.replace(/^0+/, "");
      if (cleaned.startsWith(".")) cleaned = "0" + cleaned;
    }
    setCustomAmountText(cleaned);
    setErrorMsg(null);
  };

  const handleDonateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (selectedAmount === null) {
      setErrorMsg(language === "bm" ? "Sila pilih jumlah sumbangan." : "Please select a donation amount.");
      return;
    }

    let finalAmt = 0;
    if (selectedAmount === "custom") {
      const parsed = parseFloat(customAmountText);
      if (!customAmountText || isNaN(parsed)) {
        setErrorMsg(language === "bm" ? "Masukkan amaun sumbangan yang sah." : "Enter a valid donation amount.");
        return;
      }
      if (parsed <= 0) {
        setErrorMsg(language === "bm" ? "Amaun sumbangan mestilah lebih daripada RM0.00." : "Donation amount must be greater than RM0.00.");
        return;
      }
      // Check for valid Ringgit (unsupported precision)
      const dotIndex = customAmountText.indexOf(".");
      if (dotIndex !== -1 && customAmountText.length - dotIndex - 1 > 2) {
        setErrorMsg(language === "bm" ? "Masukkan amaun sumbangan yang sah." : "Enter a valid donation amount.");
        return;
      }
      finalAmt = parsed;
    } else {
      finalAmt = selectedAmount;
    }

    setConfirmedAmount(finalAmt);
  };

  const handleConfirmFinal = async () => {
    if (confirmedAmount === null) return;
    setIsSubmitting(true);
    try {
      if (isDemoMode) {
        const newRecord: TabungRecord = {
          record_id: uid("TBG").toUpperCase(),
          type: "COLLECTION",
          amount: confirmedAmount,
          date: new Date().toISOString().slice(0, 10),
          description: language === "bm" ? "Sumbangan Tabung Jumaat (Mod Demo)" : "Friday Fund Donation (Demo Mode)",
          recorded_by: "demo.student@ipg.edu.my",
          recipient: ""
        };
        const existing = demoStore.getTabung();
        const updated = [newRecord, ...existing];
        demoStore.saveTabung(updated);
        setRecords(updated);
        setShowSuccess(true);
      } else {
        setShowSuccess(true);
      }
    } catch {
      setErrorMsg(language === "bm" ? "Ralat semasa memproses sumbangan. Sila cuba lagi." : "Error processing donation. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackToSelect = () => {
    setConfirmedAmount(null);
    setShowSuccess(false);
  };

  useEffect(() => {
    const load = async () => {
      try { setRecords(isDemoMode ? demoStore.getTabung() : (await apiGet<TabungRecord[]>("tabung/list")).data || []); }
      catch { setRecords(demoStore.getTabung()); }
    };
    void load();
  }, []);

  const summary = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7)); startOfWeek.setHours(0, 0, 0, 0);
    const collections = records.filter((item) => item.type === "COLLECTION");
    const distributions = records.filter((item) => item.type === "DISTRIBUTION");
    const sum = (items: TabungRecord[]) => items.reduce((total, item) => total + Number(item.amount), 0);
    const thisWeek = sum(collections.filter((item) => new Date(item.date) >= startOfWeek));
    const monthCollections = sum(collections.filter((item) => { const d = new Date(item.date); return d.getFullYear() === currentYear && d.getMonth() === currentMonth; }));
    const monthDistributions = sum(distributions.filter((item) => { const d = new Date(item.date); return d.getFullYear() === currentYear && d.getMonth() === currentMonth; }));
    const annualCollections = sum(collections.filter((item) => new Date(item.date).getFullYear() === currentYear));
    const annualDistributions = sum(distributions.filter((item) => new Date(item.date).getFullYear() === currentYear));
    return { thisWeek, monthCollections, monthDistributions, annualBalance: annualCollections - annualDistributions, distributions: distributions.slice().sort((a, b) => b.date.localeCompare(a.date)) };
  }, [records]);
  const target = Number(content.donation.target || 500);
  const progress = Math.min(100, target ? (summary.thisWeek / target) * 100 : 0);

  return <div className={compact ? "tabung-dashboard tabung-dashboard--compact" : "tabung-dashboard"}>
    <div className="transparency-grid">
      <article className="fund-card fund-card--featured">
        <span>
          {language === "bm" ? "Minggu ini" : "This Week"}
          <span className="featured-sub-label">{language === "bm" ? "This Week" : "Minggu ini"}</span>
        </span>
        <strong>{money(summary.thisWeek)}</strong>
        <p>{language === "bm" ? `Sasaran mingguan ${money(target)}` : `Weekly target ${money(target)}`}</p>
        <div className="progress">
          <span style={{ width: `${progress}%` }}/>
        </div>
        <small>{progress.toFixed(0)}% {language === "bm" ? "daripada sasaran" : "of target"}</small>
      </article>
      <article className="fund-card"><Icon name="chart"/><span>{labels.collections} · {labels.thisMonth}</span><strong>{money(summary.monthCollections)}</strong></article>
      <article className="fund-card"><Icon name="wallet"/><span>{labels.distributions} · {labels.thisMonth}</span><strong>{money(summary.monthDistributions)}</strong></article>
      <article className="fund-card"><Icon name="shield"/><span>{labels.annualBalance}</span><strong>{money(summary.annualBalance)}</strong></article>
    </div>
    {!compact && <div className="donation-layout">
      <section className="donation-card" style={{ gap: "25px" }}>
        {showSuccess ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px", width: "100%" }}>
            <div style={{ textAlign: "center", padding: "10px" }}>
              <div style={{ display: "inline-flex", background: "var(--success)", color: "white", borderRadius: "50%", padding: "12px", marginBottom: "15px" }}>
                <Icon name="check" size={32} />
              </div>
              <h2 style={{ margin: 0 }}>{language === "bm" ? "Sumbangan Berjaya!" : "Donation Successful!"}</h2>
              <p className="muted" style={{ marginTop: "8px" }}>
                {language === "bm"
                  ? `Terima kasih atas sumbangan anda sebanyak ${money(confirmedAmount || 0)}.`
                  : `Thank you for your generous donation of ${money(confirmedAmount || 0)}.`}
              </p>
            </div>

            <div style={{ border: "1px solid var(--line)", borderRadius: "8px", padding: "15px", background: "var(--background-elevated)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span className="muted">{language === "bm" ? "Penerima" : "Recipient"}</span>
                <strong>{content.donation.accountName}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span className="muted">{language === "bm" ? "Amaun Sumbangan" : "Donation Amount"}</span>
                <strong style={{ color: "var(--accent)", fontSize: "1.15rem" }}>{money(confirmedAmount || 0)}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span className="muted">{language === "bm" ? "Status" : "Status"}</span>
                <span className="status status--repaid">{language === "bm" ? "Selesai" : "Completed"}</span>
              </div>
            </div>

            {isDemoMode ? (
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", textAlign: "center", margin: 0 }}>
                {language === "bm"
                  ? "* Di dalam Mod Demo, baki kutipan minggu ini telah dikemas kini secara langsung di papan pemuka."
                  : "* In Demo Mode, the collection total for this week has been instantly updated on the dashboard."}
              </p>
            ) : (
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", textAlign: "center", margin: 0 }}>
                {language === "bm"
                  ? "* Sila lakukan pemindahan bank/QR sebanyak amaun di atas. Pihak pentadbir akan menyemak dan merekodkan sumbangan anda."
                  : "* Please complete the bank/QR transfer of the exact amount above. The administrator will verify and record your donation."}
              </p>
            )}

            <button onClick={handleBackToSelect} className="button button--outline" style={{ alignSelf: "center", minHeight: "44px" }}>
              {language === "bm" ? "Kembali" : "Go Back"}
            </button>
          </div>
        ) : confirmedAmount !== null ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px", width: "100%" }}>
            <div>
              <span className="eyebrow">{labels.publicTransparency}</span>
              <h2>{language === "bm" ? "Sahkan Sumbangan" : "Confirm Donation"}</h2>
              <p className="muted">{language === "bm" ? "Sila sahkan maklumat sumbangan anda di bawah sebelum meneruskan pembayaran." : "Please verify your donation details below before proceeding with the payment."}</p>
            </div>

            <div style={{ border: "1px dashed var(--line)", borderRadius: "8px", padding: "20px", background: "var(--background-elevated)" }}>
              <span style={{ fontSize: "0.8rem", textTransform: "uppercase", color: "var(--muted)", fontWeight: "bold", display: "block" }}>
                {language === "bm" ? "Jumlah sumbangan" : "Donation amount"}
              </span>
              <strong style={{ fontSize: "2.5rem", color: "var(--brand-2)", display: "block", marginTop: "4px" }}>
                {money(confirmedAmount)}
              </strong>
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <button type="button" onClick={handleBackToSelect} className="button button--outline" style={{ flex: 1, minHeight: "44px" }}>
                {language === "bm" ? "Kembali" : "Back"}
              </button>
              <button type="button" onClick={handleConfirmFinal} className="button button--accent" style={{ flex: 1, minHeight: "44px" }} disabled={isSubmitting}>
                {isSubmitting ? "..." : (language === "bm" ? "Sahkan" : "Confirm")}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleDonateSubmit} style={{ display: "flex", flexDirection: "column", gap: "15px", width: "100%" }}>
            <div>
              <span className="eyebrow">{labels.publicTransparency}</span>
              <h2>{t(content.donation.heading, language)}</h2>
              <p>{t(content.donation.description, language)}</p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: "bold", color: "var(--text-muted)" }}>
                {language === "bm" ? "Pilih jumlah sumbangan" : "Choose donation amount"}
              </span>
              <div className="donation-presets-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginBlock: "5px" }}>
                {[5, 10, 20, 50, 100, 200].map((amt) => {
                  const isSelected = selectedAmount === amt;
                  return (
                    <button
                      key={amt}
                      type="button"
                      className={`preset-btn ${isSelected ? "active" : ""}`}
                      onClick={() => handleAmountSelect(amt)}
                      aria-pressed={isSelected}
                      style={{
                        minHeight: "44px",
                        padding: "10px",
                        borderRadius: "8px",
                        border: isSelected ? "2px solid var(--accent)" : "1px solid var(--border)",
                        background: isSelected ? "var(--accent-soft)" : "var(--surface)",
                        color: isSelected ? "var(--accent)" : "var(--text-primary)",
                        fontWeight: "bold",
                        transition: "all 0.2s ease",
                        cursor: "pointer"
                      }}
                    >
                      {isSelected ? "✓ " : ""}{money(amt)}
                    </button>
                  );
                })}
                <button
                  type="button"
                  className={`preset-btn ${selectedAmount === "custom" ? "active" : ""}`}
                  onClick={() => handleAmountSelect("custom")}
                  aria-pressed={selectedAmount === "custom"}
                  style={{
                    minHeight: "44px",
                    padding: "10px",
                    borderRadius: "8px",
                    border: selectedAmount === "custom" ? "2px solid var(--accent)" : "1px solid var(--border)",
                    background: selectedAmount === "custom" ? "var(--accent-soft)" : "var(--surface)",
                    color: selectedAmount === "custom" ? "var(--accent)" : "var(--text-primary)",
                    fontWeight: "bold",
                    transition: "all 0.2s ease",
                    cursor: "pointer",
                    gridColumn: "span 3"
                  }}
                >
                  {selectedAmount === "custom" ? "✓ " : ""}{language === "bm" ? "Amaun lain" : "Custom amount"}
                </button>
              </div>
            </div>

            {selectedAmount === "custom" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label htmlFor="custom-donation-input" style={{ fontSize: "0.85rem", fontWeight: "bold", color: "var(--text-muted)" }}>
                  {language === "bm" ? "Masukkan amaun sumbangan" : "Enter donation amount"}
                </label>
                <div className="custom-amount-wrapper" style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  <span style={{ position: "absolute", left: "15px", fontWeight: "bold", color: "var(--text-primary)", pointerEvents: "none" }}>RM</span>
                  <input
                    id="custom-donation-input"
                    type="text"
                    inputMode="decimal"
                    value={customAmountText}
                    onChange={(e) => handleCustomTextChange(e.target.value)}
                    placeholder="0.00"
                    style={{
                      paddingLeft: "45px",
                      width: "100%",
                      height: "46px",
                      borderRadius: "8px",
                      border: "1px solid var(--border)",
                      background: "var(--surface)",
                      fontSize: "1.1rem",
                      fontWeight: "bold"
                    }}
                  />
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="form-message form-message--error" style={{ margin: "5px 0" }}>
                {errorMsg}
              </div>
            )}

            <button type="submit" className="button button--accent" style={{ width: "fit-content", minHeight: "44px" }}>
              <Icon name="external" size={17}/>
              {language === "bm" ? "Sumbang sekarang" : "Donate now"}
            </button>

            <small style={{ marginTop: "5px", display: "block", color: "var(--warning)" }}>{t(content.donation.note, language)}</small>
          </form>
        )}
        <div className="donation-qr-container" style={{ display: "flex", flexDirection: "column", gap: "15px", alignItems: "center", width: "100%" }}>
          <div className="donation-qr">
            <CmsImage
              src={content.donation.qrImageUrl || "/duitnow-placeholder.svg"}
              alt="Kod QR sumbangan Tabung Jumaat"
              width={230}
              height={230}
            />
            <span>DuitNow QR</span>
          </div>

          <div className="bank-details" style={{ marginTop: "0px", width: "100%", maxWidth: "280px" }}>
            <span>{content.donation.bankName}</span>
            <strong>{content.donation.accountName}</strong>
            <code style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
              <span>{content.donation.accountNumber}</span>
              <button
                type="button"
                onClick={handleCopy}
                title="Salin nombor akaun"
                style={{
                  background: "transparent",
                  border: 0,
                  cursor: "pointer",
                  color: "var(--brand-2)",
                  padding: "4px",
                  display: "inline-flex",
                  alignItems: "center"
                }}
              >
                <Icon name={copied ? "check" : "copy"} size={16} />
              </button>
            </code>
          </div>
        </div>
      </section>
      <section className="records-card"><div className="section-title"><div><span className="eyebrow">{labels.distributions}</span><h2>{labels.recentDistributions}</h2></div></div><div className="record-list">{summary.distributions.length ? summary.distributions.slice(0, 8).map((record) => <article key={record.record_id}><div><strong>{record.description}</strong><span>{formatDate(record.date, language === "bm" ? "ms-MY" : "en-GB")}{record.recipient ? ` · ${record.recipient}` : ""}</span></div><b>− {money(record.amount)}</b></article>) : <p className="muted">{labels.noResults}</p>}</div></section>
    </div>}
  </div>;
}
