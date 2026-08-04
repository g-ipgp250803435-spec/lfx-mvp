"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { GoogleAuth, type SignedInUser } from "@/components/GoogleAuth";
import { Icon } from "@/components/Icon";
import { apiGet, apiPost, isDemoMode } from "@/lib/api";
import { demoStore } from "@/lib/demo-store";
import { uid } from "@/lib/format";
import type { Asset, Loan } from "@/lib/types";
import { useApp } from "@/components/Providers";

export function LoanForm() {
  const params = useSearchParams();
  const [user, setUser] = useState<SignedInUser | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const { language, labels } = useApp();
  const [form, setForm] = useState({ asset_id: params.get("asset") || "", purpose: "", date_borrowed: "", date_returned_expected: "" });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (isDemoMode) {
        setAssets(demoStore.getAssets());
      } else {
        const res = await apiGet<Asset[]>("assets/list");
        setAssets(res.data || []);
      }
    } catch (err) {
      console.error("[Diagnostics Error] failed to load assets:", err);
      if (!isDemoMode) {
        setError(
          language === "bm"
            ? "Maklumat senarai aset tidak dapat diperoleh. Sila cuba lagi."
            : "Asset list information could not be retrieved. Please try again."
        );
      } else {
        setAssets(demoStore.getAssets());
      }
    } finally {
      setLoading(false);
    }
  }, [language]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return;
    setBusy(true); setMessage(null);
    try {
      if (isDemoMode) {
        const asset = assets.find((item) => item.asset_id === form.asset_id);
        const next: Loan = { loan_id: uid("LON"), asset_id: form.asset_id, asset_name: asset?.name, user_id: user.email, user_name: user.name, purpose: form.purpose, request_date: new Date().toISOString(), approved_by: "", status: "PENDING", qr_code_url: "", date_borrowed: form.date_borrowed, date_returned_expected: form.date_returned_expected, date_returned_actual: "" };
        demoStore.saveLoans([next, ...demoStore.getLoans()]);
      } else await apiPost("loan/request", { idToken: user.idToken, ...form });
      setMessage({ type: "success", text: language === "bm" ? "Permohonan berjaya dihantar." : "Application submitted successfully." });
      setForm({ asset_id: "", purpose: "", date_borrowed: "", date_returned_expected: "" });
    } catch (error) { setMessage({ type: "error", text: error instanceof Error ? error.message : "Submission failed" }); }
    finally { setBusy(false); }
  };

  return <div className="form-shell">
    <GoogleAuth onUser={setUser}/>
    {user && (
      loading ? (
        <p className="muted" style={{ padding: "24px 0" }}>
          {language === "bm" ? "Memuatkan senarai aset..." : "Loading assets list..."}
        </p>
      ) : error ? (
        <div style={{ padding: "24px 0", display: "flex", flexDirection: "column", gap: "12px" }}>
          <div className="form-message form-message--error">{error}</div>
          <button type="button" className="button button--outline button--small" style={{ width: "fit-content" }} onClick={() => { void load(); }}>
            {language === "bm" ? "Cuba Semula" : "Retry"}
          </button>
        </div>
      ) : (
        <form className="application-form" onSubmit={submit}>
          <div className="form-grid"><label><span>{language === "bm" ? "Aset" : "Asset"}</span><select required value={form.asset_id} onChange={(e) => setForm({ ...form, asset_id: e.target.value })}><option value="">{language === "bm" ? "Pilih aset" : "Select an asset"}</option>{assets.filter((asset) => asset.status === "AVAILABLE").map((asset) => <option key={asset.asset_id} value={asset.asset_id}>{asset.name} · {asset.asset_id}</option>)}</select></label>
          <label className="form-grid__wide"><span>{language === "bm" ? "Tujuan pinjaman" : "Purpose"}</span><textarea required rows={4} maxLength={500} value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })}/></label>
          <label><span>{language === "bm" ? "Tarikh pinjam" : "Borrow date"}</span><input required type="date" value={form.date_borrowed} onChange={(e) => setForm({ ...form, date_borrowed: e.target.value })}/></label>
          <label><span>{language === "bm" ? "Tarikh pulang dijangka" : "Expected return"}</span><input required type="date" min={form.date_borrowed} value={form.date_returned_expected} onChange={(e) => setForm({ ...form, date_returned_expected: e.target.value })}/></label></div>
          {message && <div className={`form-message form-message--${message.type}`}>{message.text}</div>}
          <button disabled={busy} className="button" type="submit"><Icon name="check" size={17}/>{busy ? labels.loading : labels.submit}</button>
        </form>
      )
    )}
  </div>;
}
