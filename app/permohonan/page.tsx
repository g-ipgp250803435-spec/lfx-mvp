"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PageHero } from "@/components/PageHero";
import { Icon } from "@/components/Icon";
import { useApp } from "@/components/Providers";
import { GoogleAuth, type SignedInUser } from "@/components/GoogleAuth";
import { apiPost, isDemoMode } from "@/lib/api";
import { demoStore } from "@/lib/demo-store";
import { formatDate, money } from "@/lib/format";
import type { IkesApplication, Loan } from "@/lib/types";

type ActiveTab = "iaset" | "ikes";

export default function StudentDashboardPage() {
  const { language } = useApp();
  const [user, setUser] = useState<SignedInUser | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("iaset");

  // States for iAset Loans
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loansLoading, setLoansLoading] = useState(false);
  const [loansError, setLoansError] = useState<string | null>(null);

  // States for iKES Applications
  const [ikes, setIkes] = useState<IkesApplication[]>([]);
  const [ikesLoading, setIkesLoading] = useState(false);
  const [ikesError, setIkesError] = useState<string | null>(null);

  const fetchLoans = useCallback(async (currentUser: SignedInUser | null) => {
    if (!currentUser) {
      setLoans([]);
      return;
    }
    setLoansLoading(true);
    setLoansError(null);
    try {
      if (isDemoMode) {
        const all = demoStore.getLoans();
        const mine = all.filter((loan) => loan.user_id.toLowerCase() === currentUser.email.toLowerCase());
        setLoans(mine);
      } else {
        const result = await apiPost<Loan[]>("loans/mine", { idToken: currentUser.idToken });
        setLoans(result.data || []);
      }
    } catch (err) {
      setLoansError(err instanceof Error ? err.message : "Failed to load loan history");
    } finally {
      setLoansLoading(false);
    }
  }, []);

  const fetchIkes = useCallback(async (currentUser: SignedInUser | null) => {
    if (!currentUser) {
      setIkes([]);
      return;
    }
    setIkesLoading(true);
    setIkesError(null);
    try {
      if (isDemoMode) {
        const all = demoStore.getIkes();
        const mine = all.filter((app) => app.user_id.toLowerCase() === currentUser.email.toLowerCase());
        setIkes(mine);
      } else {
        const result = await apiPost<IkesApplication[]>("ikes/mine", { idToken: currentUser.idToken });
        setIkes(result.data || []);
      }
    } catch (err) {
      setIkesError(err instanceof Error ? err.message : "Failed to load iKES applications");
    } finally {
      setIkesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      setTimeout(() => {
        void fetchLoans(user);
        void fetchIkes(user);
      }, 0);
    } else {
      setTimeout(() => {
        setLoans([]);
        setIkes([]);
      }, 0);
    }
  }, [user, fetchLoans, fetchIkes]);

  const mapLoanStatus = (status: string, lang: "bm" | "en") => {
    const mapping: Record<string, { bm: string; en: string }> = {
      PENDING: { bm: "Dalam Semakan", en: "Pending" },
      APPROVED: { bm: "Diluluskan", en: "Approved" },
      REJECTED: { bm: "Ditolak", en: "Rejected" },
      ACTIVE: { bm: "Aktif", en: "Active" },
      RETURNED: { bm: "Selesai Pulang", en: "Returned" }
    };
    return mapping[status]?.[lang] || status;
  };

  const mapIkesStatus = (status: string, lang: "bm" | "en") => {
    const mapping: Record<string, { bm: string; en: string }> = {
      PENDING: { bm: "Dalam Semakan", en: "Pending" },
      APPROVED: { bm: "Diluluskan", en: "Approved" },
      REJECTED: { bm: "Ditolak", en: "Rejected" },
      PAID: { bm: "Disalurkan", en: "Paid" },
      REPAID: { bm: "Selesai Bayar", en: "Repaid" }
    };
    return mapping[status]?.[lang] || status;
  };

  const getStatusClass = (status: string) => {
    return `status status--${status.toLowerCase()}`;
  };

  const refreshData = () => {
    if (user) {
      if (activeTab === "iaset") void fetchLoans(user);
      if (activeTab === "ikes") void fetchIkes(user);
    }
  };

  return (
    <>
      <PageHero
        eyebrow={{
          bm: "Urus & semak permohonan anda",
          en: "Manage & check your applications"
        }}
        title={{ bm: "Permohonan Saya", en: "My Applications" }}
        description={{
          bm: "Semak status dan sejarah pinjaman iAset serta bantuan kebajikan iKES anda di sini.",
          en: "Check the status and history of your iAset loans and iKES welfare applications here."
        }}
      />

      <section className="section">
        <div className="container">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px", marginBottom: "24px" }}>
            <div className="tab-buttons" style={{ display: "flex", gap: "12px" }}>
              <button
                className={`button ${activeTab === "iaset" ? "button--accent" : "button--outline"}`}
                onClick={() => setActiveTab("iaset")}
                style={{ padding: "8px 16px" }}
              >
                <Icon name="briefcase" size={16} style={{ marginRight: "8px" }} />
                iAset Loans
              </button>
              <button
                className={`button ${activeTab === "ikes" ? "button--accent" : "button--outline"}`}
                onClick={() => setActiveTab("ikes")}
                style={{ padding: "8px 16px" }}
              >
                <Icon name="heart" size={16} style={{ marginRight: "8px" }} />
                iKES Applications
              </button>
            </div>

            {user && (
              <button
                onClick={refreshData}
                className="button button--small button--outline"
                disabled={activeTab === "iaset" ? loansLoading : ikesLoading}
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <Icon name="refresh" size={14} />
                {language === "bm" ? "Segarkan" : "Refresh"}
              </button>
            )}
          </div>

          <GoogleAuth onUser={setUser} compact />

          {!user && (
            <p className="muted" style={{ marginTop: "24px" }}>
              {language === "bm"
                ? "Sila log masuk menggunakan Google untuk melihat permohonan anda."
                : "Please sign in with Google to view your applications."}
            </p>
          )}

          {user && activeTab === "iaset" && (
            <div style={{ marginTop: "24px" }}>
              {loansLoading && <p className="muted">{language === "bm" ? "Memuatkan..." : "Loading..."}</p>}
              {loansError && <div className="form-message form-message--error">{loansError}</div>}

              {!loansLoading && !loansError && loans.length === 0 && (
                <div className="empty-state" style={{ padding: "40px", border: "1px dashed var(--line)", borderRadius: "8px" }}>
                  {language === "bm" ? "Tiada rekod pinjaman iAset ditemui." : "No iAset loan records found."}
                </div>
              )}

              {!loansLoading && !loansError && loans.length > 0 && (
                <div className="student-ikes-grid" style={{ display: "grid", gridTemplateColumns: "1fr", gap: "20px" }}>
                  {loans.map((loan) => {
                    const hasPass = loan.status === "APPROVED" || loan.status === "ACTIVE";
                    return (
                      <div key={loan.loan_id} className="student-ikes-card" style={{ padding: "20px", border: "1px solid var(--line)", borderRadius: "8px", background: "var(--bg)" }}>
                        <div className="student-ikes-card__header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                          <div>
                            <strong className="student-ikes-card__title" style={{ fontSize: "1.2rem", display: "block" }}>
                              {loan.asset_name || loan.asset_id}
                            </strong>
                            <small className="muted" style={{ fontSize: "0.8rem" }}>
                              {loan.loan_id}
                            </small>
                          </div>
                          <span className={getStatusClass(loan.status)}>
                            {mapLoanStatus(loan.status, language)}
                          </span>
                        </div>

                        <div className="student-ikes-card__details" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "16px" }}>
                          <div className="student-ikes-card__item">
                            <span style={{ fontSize: "0.8rem", color: "var(--muted)", display: "block" }}>{language === "bm" ? "Tujuan Pinjaman" : "Purpose"}</span>
                            <strong>{loan.purpose}</strong>
                          </div>
                          <div className="student-ikes-card__item">
                            <span style={{ fontSize: "0.8rem", color: "var(--muted)", display: "block" }}>{language === "bm" ? "Tarikh Mohon" : "Request Date"}</span>
                            <strong>{formatDate(loan.request_date)}</strong>
                          </div>
                          <div className="student-ikes-card__item">
                            <span style={{ fontSize: "0.8rem", color: "var(--muted)", display: "block" }}>{language === "bm" ? "Tarikh Pinjam" : "Borrow Date"}</span>
                            <strong>{formatDate(loan.date_borrowed)}</strong>
                          </div>
                          <div className="student-ikes-card__item">
                            <span style={{ fontSize: "0.8rem", color: "var(--muted)", display: "block" }}>{language === "bm" ? "Jangka Pulang" : "Expected Return"}</span>
                            <strong>{formatDate(loan.date_returned_expected)}</strong>
                          </div>
                          {loan.date_returned_actual && (
                            <div className="student-ikes-card__item">
                              <span style={{ fontSize: "0.8rem", color: "var(--muted)", display: "block" }}>{language === "bm" ? "Tarikh Pulang Sebenar" : "Actual Return Date"}</span>
                              <strong>{formatDate(loan.date_returned_actual)}</strong>
                            </div>
                          )}
                        </div>

                        {hasPass && (
                          <div style={{ marginTop: "16px", borderTop: "1px solid var(--line)", paddingTop: "12px", display: "flex", justifyContent: "flex-end" }}>
                            {loan.qr_code_url ? (
                              <Link href={loan.qr_code_url} className="button button--small button--accent" style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                                <Icon name="qr" size={16} />
                                {language === "bm" ? "Penyata Digital Pass" : "Digital Pass"}
                              </Link>
                            ) : isDemoMode ? (
                              <Link href={`/loan/verify?loanId=${loan.loan_id}&token=demo`} className="button button--small button--accent" style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                                <Icon name="qr" size={16} />
                                {language === "bm" ? "Penyata Digital Pass (Demo)" : "Digital Pass (Demo)"}
                              </Link>
                            ) : null}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {user && activeTab === "ikes" && (
            <div style={{ marginTop: "24px" }}>
              {ikesLoading && <p className="muted">{language === "bm" ? "Memuatkan..." : "Loading..."}</p>}
              {ikesError && <div className="form-message form-message--error">{ikesError}</div>}

              {!ikesLoading && !ikesError && ikes.length === 0 && (
                <div className="empty-state" style={{ padding: "40px", border: "1px dashed var(--line)", borderRadius: "8px" }}>
                  {language === "bm" ? "Tiada rekod permohonan iKES ditemui." : "No iKES application records found."}
                </div>
              )}

              {!ikesLoading && !ikesError && ikes.length > 0 && (
                <div className="student-ikes-grid">
                  {ikes.map((app) => {
                    const isOverdue = app.is_overdue;
                    const hasRepaymentInfo = ["APPROVED", "PAID", "REPAID"].includes(app.status);

                    return (
                      <div
                        key={app.application_id}
                        className={`student-ikes-card ${
                          isOverdue ? "student-ikes-card--overdue" : ""
                        }`}
                      >
                        <div className="student-ikes-card__header">
                          <div>
                            <strong className="student-ikes-card__title">
                              {app.type === "CARE" ? "iKES Care" : "iKES Go-Home"}
                            </strong>
                            <small className="muted" style={{ fontSize: "0.78rem" }}>
                              {app.application_id}
                            </small>
                          </div>
                          <span className={getStatusClass(app.status)}>
                            {mapIkesStatus(app.status, language)}
                          </span>
                        </div>

                        <div className="student-ikes-card__details">
                          <div className="student-ikes-card__item">
                            <span>{language === "bm" ? "Jumlah Dimohon" : "Requested Amount"}</span>
                            <strong>{money(app.amount_requested)}</strong>
                          </div>

                          <div className="student-ikes-card__item">
                            <span>{language === "bm" ? "Jumlah Diluluskan" : "Approved Amount"}</span>
                            <strong>
                              {app.amount_approved !== undefined && app.amount_approved !== null
                                ? money(app.amount_approved)
                                : "—"}
                            </strong>
                          </div>

                          <div className="student-ikes-card__item">
                            <span>{language === "bm" ? "Kemasukan" : "Intake"}</span>
                            <strong>{app.intake || "—"}</strong>
                          </div>

                          <div className="student-ikes-card__item">
                            <span>{language === "bm" ? "Kelas" : "Class"}</span>
                            <strong>{app.class_name || "—"}</strong>
                          </div>

                          <div className="student-ikes-card__item">
                            <span>{language === "bm" ? "Akaun Bank" : "Bank Account"}</span>
                            <strong>
                              {app.bank_name && app.bank_account_masked
                                ? `${app.bank_name} (${app.bank_account_masked})`
                                : "—"}
                            </strong>
                          </div>

                          <div className="student-ikes-card__item">
                            <span>{language === "bm" ? "Tarikh Mohon" : "Request Date"}</span>
                            <strong>{formatDate(app.request_date)}</strong>
                          </div>

                          <div className="student-ikes-card__item">
                            <span>{language === "bm" ? "Tarikh Keputusan" : "Decision Date"}</span>
                            <strong>
                              {app.decision_date ? formatDate(app.decision_date) : "—"}
                            </strong>
                          </div>

                          {hasRepaymentInfo && (
                            <>
                              <div className="student-ikes-card__item">
                                <span>{language === "bm" ? "Tarikh Bayaran" : "Payment Date"}</span>
                                <strong>
                                  {app.payment_date ? formatDate(app.payment_date) : "—"}
                                </strong>
                              </div>

                              <div className="student-ikes-card__item">
                                <span>{language === "bm" ? "Tempoh Matang" : "Repayment Term"}</span>
                                <strong>
                                  {app.repayment_term_days !== undefined && app.repayment_term_days !== null
                                    ? `${app.repayment_term_days} ${language === "bm" ? "hari" : "days"}`
                                    : "—"}
                                </strong>
                              </div>

                              <div className="student-ikes-card__item">
                                <span>{language === "bm" ? "Tarikh Tamat Tempoh" : "Repayment Due Date"}</span>
                                <strong>
                                  {app.repayment_due_date ? formatDate(app.repayment_due_date) : "—"}
                                </strong>
                              </div>

                              <div className="student-ikes-card__item">
                                <span>{language === "bm" ? "Jumlah Dibayar" : "Amount Repaid"}</span>
                                <strong>
                                  {app.amount_repaid !== undefined && app.amount_repaid !== null
                                    ? money(app.amount_repaid)
                                    : "—"}
                                </strong>
                              </div>

                              <div className="student-ikes-card__item">
                                <span>{language === "bm" ? "Baki Tunggakan" : "Outstanding Amount"}</span>
                                <strong>
                                  {app.outstanding_amount !== undefined && app.outstanding_amount !== null
                                    ? money(app.outstanding_amount)
                                    : "—"}
                                </strong>
                              </div>
                            </>
                          )}

                          {app.status === "REJECTED" && app.rejection_reason && (
                            <div className="student-ikes-card__item" style={{ gridColumn: "span 2" }}>
                              <span>{language === "bm" ? "Sebab Ditolak" : "Rejection Reason"}</span>
                              <strong style={{ color: "#913737" }}>{app.rejection_reason}</strong>
                            </div>
                          )}

                          {app.notes && (
                            <div className="student-ikes-card__item" style={{ gridColumn: "span 2" }}>
                              <span>{language === "bm" ? "Catatan" : "Notes"}</span>
                              <small style={{ display: "block", marginTop: "2px" }}>{app.notes}</small>
                            </div>
                          )}
                        </div>

                        {isOverdue && (
                          <div className="overdue-warning-banner">
                            <Icon name="clock" size={16} />
                            <span>
                              {language === "bm"
                                ? "Peringatan: Tunggakan bayaran balik melebihi tempoh!"
                                : "Warning: Repayment is overdue!"}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
