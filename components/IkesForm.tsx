"use client";

import { useState } from "react";
import { GoogleAuth, type SignedInUser } from "@/components/GoogleAuth";
import { Icon } from "@/components/Icon";
import { apiPost, isDemoMode } from "@/lib/api";
import { demoStore } from "@/lib/demo-store";
import { uid } from "@/lib/format";
import type { IkesApplication } from "@/lib/types";
import { useApp } from "@/components/Providers";

async function fileToPayload(file: File) {
  const data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  return { name: file.name, mimeType: file.type, data };
}

export function IkesForm() {
  const [user, setUser] = useState<SignedInUser | null>(null);
  const [type, setType] = useState<"CARE" | "GO_HOME">("CARE");
  const [amount, setAmount] = useState(50);
  const [notes, setNotes] = useState("");
  const [ticket, setTicket] = useState<File | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const { language, labels } = useApp();

  const changeType = (next: "CARE" | "GO_HOME") => { setType(next); setAmount(next === "CARE" ? 50 : 100); setTicket(null); };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); if (!user) return;
    if (type === "CARE" && ![30, 50].includes(amount)) return setMessage({ type: "error", text: "iKES Care is limited to RM30 or RM50." });
    if (type === "GO_HOME" && (amount <= 0 || amount > 100 || !ticket)) return setMessage({ type: "error", text: "iKES Go-Home requires ticket proof and is limited to RM100." });
    if (ticket && ticket.size > 2.5 * 1024 * 1024) return setMessage({ type: "error", text: "Ticket proof must be 2.5 MB or smaller." });
    setBusy(true); setMessage(null);
    try {
      let ticketProof: { name: string; mimeType: string; data: string } | undefined;
      if (ticket) ticketProof = await fileToPayload(ticket);
      if (isDemoMode) {
        const next: IkesApplication = { application_id: uid("IKES"), user_id: user.email, user_name: user.name, type, amount_requested: amount, ticket_proof_url: ticket ? `demo://${ticket.name}` : "", status: "PENDING", request_date: new Date().toISOString(), approved_by: "", notes };
        demoStore.saveIkes([next, ...demoStore.getIkes()]);
      } else await apiPost("ikes/apply", { idToken: user.idToken, type, amount_requested: amount, notes, ticket_proof: ticketProof });
      setMessage({ type: "success", text: language === "bm" ? "Permohonan iKES berjaya dihantar." : "Your iKES application has been submitted." });
      setNotes(""); setTicket(null);
    } catch (error) { setMessage({ type: "error", text: error instanceof Error ? error.message : "Submission failed" }); }
    finally { setBusy(false); }
  };

  return <div className="form-shell"><GoogleAuth onUser={setUser}/>{user && <form className="application-form" onSubmit={submit}>
    <div className="choice-grid"><button type="button" className={type === "CARE" ? "choice-card active" : "choice-card"} onClick={() => changeType("CARE")}><Icon name="heart"/><strong>iKES Care</strong><span>RM30 / RM50</span></button><button type="button" className={type === "GO_HOME" ? "choice-card active" : "choice-card"} onClick={() => changeType("GO_HOME")}><Icon name="briefcase"/><strong>iKES Go-Home</strong><span>{language === "bm" ? "Harga tiket sebenar · Maks. RM100" : "Actual ticket price · Max. RM100"}</span></button></div>
    <div className="form-grid"><label><span>{language === "bm" ? "Jumlah dimohon (RM)" : "Requested amount (RM)"}</span>{type === "CARE" ? <select value={amount} onChange={(e) => setAmount(Number(e.target.value))}><option value="30">RM30</option><option value="50">RM50</option></select> : <input type="number" min="1" max="100" step="0.01" value={amount} onChange={(e) => setAmount(Number(e.target.value))}/>}</label>
    {type === "GO_HOME" && <label><span>{language === "bm" ? "Bukti harga tiket" : "Ticket price proof"}</span><input required type="file" accept="image/*,.pdf" onChange={(e) => setTicket(e.target.files?.[0] || null)}/><small>PNG, JPG or PDF · maximum 2.5 MB</small></label>}
    <label className="form-grid__wide"><span>{language === "bm" ? "Catatan ringkas" : "Short notes"}</span><textarea rows={4} maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)}/></label></div>
    <div className="policy-notice"><Icon name="clock"/><span>{labels.repaymentNotice}</span></div>
    {message && <div className={`form-message form-message--${message.type}`}>{message.text}</div>}
    <button disabled={busy} className="button" type="submit"><Icon name="check" size={17}/>{busy ? labels.loading : labels.submit}</button>
  </form>}</div>;
}
