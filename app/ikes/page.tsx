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
import type { IkesApplication } from "@/lib/types";

export default function IkesPage() {
  const { language } = useApp();
  const [user, setUser] = useState<SignedInUser | null>(null);
  const [applications, setApplications] = useState<IkesApplication[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchApplications = useCallback(async (currentUser: SignedInUser | null) => {
    if (!currentUser) {
      setApplications([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (isDemoMode) {
        // Simulate backend retrieval filtering only for current demo user's applications
        const all = demoStore.getIkes();
        const mine = all.filter((app) => app.user_id.toLowerCase() === currentUser.email.toLowerCase());
        setApplications(mine);
      } else {
        // Send idToken securely to get only current user's records from backend
        const result = await apiPost<IkesApplication[]>("ikes/mine", { idToken: currentUser.idToken });
        setApplications(result.data || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load applications");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setTimeout(() => {
      void fetchApplications(user);
    }, 0);
  }, [user, fetchApplications]);

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

  return (
    <>
      <PageHero
        eyebrow={{
          bm: "Pinjaman kebajikan tanpa faedah",
          en: "Interest-free welfare loan"
        }}
        title={{ bm: "iKES", en: "iKES" }}
        description={{
          bm: "Sokongan jangka pendek yang direkodkan dengan telus untuk membantu pelajar menghadapi keperluan mendesak.",
          en: "Transparent short-term support for students facing urgent needs."
        }}
        actions={
          <Link href="/ikes/apply" className="button button--accent">
            {language === "bm" ? "Mulakan permohonan" : "Start application"}
            <Icon name="arrow" size={17} />
          </Link>
        }
      />

      <section className="section">
        <div className="container">
          <div className="ikes-options">
            <article>
              <span>
                <Icon name="heart" />
              </span>
              <h2>iKES Care</h2>
              <strong>RM30 / RM50</strong>
              <p>
                {language === "bm"
                  ? "Kegunaan umum bagi keperluan kebajikan sementara."
                  : "General-purpose temporary welfare assistance."}
              </p>
            </article>
            <article>
              <span>
                <Icon name="briefcase" />
              </span>
              <h2>iKES Go-Home</h2>
              <strong>
                {language === "bm"
                  ? "Harga sebenar · maks. RM100"
                  : "Actual cost · max. RM100"}
              </strong>
              <p>
                {language === "bm"
                  ? "Bantuan tambang pulang dengan bukti harga tiket."
                  : "Travel assistance supported by ticket-price proof."}
              </p>
            </article>
          </div>
          <div className="policy-notice policy-notice--large">
            <Icon name="clock" />
            <span>
              {language === "bm"
                ? "Bayaran balik penuh mesti dibuat dalam tempoh 3 hari selepas elaun sara hidup dikreditkan."
                : "Full repayment must be made within 3 days after the subsistence allowance is credited."}
            </span>
          </div>

          <div className="student-ikes-section">
            <div className="student-ikes-header">
              <h2>
                {language === "bm" ? "Permohonan Saya" : "My Applications"}
              </h2>
              {user && (
                <div className="student-ikes-actions">
                  <button
                    onClick={() => void fetchApplications(user)}
                    className="student-ikes-refresh"
                    disabled={loading}
                  >
                    <Icon name="refresh" size={14} />
                    {language === "bm" ? "Segarkan" : "Refresh"}
                  </button>
                </div>
              )}
            </div>

            <GoogleAuth onUser={setUser} compact />

            {!user && (
              <p className="muted" style={{ marginTop: "16px" }}>
                {language === "bm"
                  ? "Sila log masuk menggunakan Google untuk melihat senarai permohonan iKES anda."
                  : "Please sign in with Google to view your list of iKES applications."}
              </p>
            )}

            {user && (
              <div style={{ marginTop: "24px" }}>
                {loading && <p className="muted">{language === "bm" ? "Memuatkan..." : "Loading..."}</p>}

                {error && <div className="form-message form-message--error">{error}</div>}

                {!loading && !error && applications.length === 0 && (
                  <div className="student-ikes-empty">
                    {language === "bm" ? "Tiada rekod permohonan ditemui." : "No application records found."}
                  </div>
                )}

                {!loading && !error && applications.length > 0 && (
                  <div className="student-ikes-grid">
                    {applications.map((app) => {
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
        </div>
      </section>
    </>
  );
}
