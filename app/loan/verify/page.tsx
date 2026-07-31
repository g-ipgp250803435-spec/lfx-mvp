"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { QrCodeCanvas } from "@/components/QrCodeCanvas";
import { Icon } from "@/components/Icon";
import { StatusBadge } from "@/components/StatusBadge";
import { apiGet, isDemoMode } from "@/lib/api";
import { demoStore } from "@/lib/demo-store";
import type { Loan } from "@/lib/types";

function LoanPass() {
  const params = useSearchParams();
  const loanId = params.get("loanId") || "";
  const token = params.get("token") || "";
  const [loan, setLoan] = useState<Loan | null>(null);
  const [url, setUrl] = useState("");
  useEffect(() => {
    setUrl(window.location.href);
    const load = async () => {
      if (!loanId) return;
      try {
        if (isDemoMode) setLoan(demoStore.getLoans().find((item) => item.loan_id === loanId) || null);
        else setLoan((await apiGet<Loan>("loan/status", { loanId, token })).data || null);
      } catch { setLoan(null); }
    };
    void load();
  }, [loanId, token]);
  return <section className="loan-pass"><div className="loan-pass__card"><div className="loan-pass__brand"><img src="/lfx-mark.svg" alt="LFX"/><span><strong>iAset Digital Pass</strong><small>LEGASI FINANCE X</small></span></div>{loan ? <><QrCodeCanvas value={url}/><span className="eyebrow">{loan.loan_id}</span><h1>{loan.asset_name || loan.asset_id}</h1><StatusBadge status={loan.status}/><dl><div><dt>Borrower</dt><dd>{loan.user_name || loan.user_id}</dd></div><div><dt>Expected return</dt><dd>{loan.date_returned_expected}</dd></div><div><dt>Purpose</dt><dd>{loan.purpose}</dd></div></dl><div className="policy-notice"><Icon name="qr"/><span>Present this QR code to the Treasury administrator during handover and return.</span></div></> : <div className="empty-state">Loan record could not be verified.</div>}</div></section>;
}

export default function LoanVerifyPage() { return <Suspense fallback={<div className="empty-state">Loading…</div>}><LoanPass/></Suspense>; }
