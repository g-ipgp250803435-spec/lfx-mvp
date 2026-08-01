"use client";

import { useEffect, useRef, useState } from "react";
import { useApp } from "@/components/Providers";

interface RejectionDialogProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
}

export function RejectionDialog({
  isOpen,
  title,
  onClose,
  onSubmit
}: RejectionDialogProps) {
  const { language } = useApp();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dialogRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const cancelBtnRef = useRef<HTMLButtonElement>(null);
  const submitBtnRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  // Store active element when dialog opens, return focus when closed
  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement as HTMLElement;
      // Focus textarea on open
      setTimeout(() => {
        textareaRef.current?.focus();
        setReason("");
        setError(null);
      }, 50);
    } else {
      if (triggerRef.current) {
        triggerRef.current.focus();
      }
    }
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen || busy) return;
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, busy, onClose]);

  // Trap focus
  const handleTabTrap = (e: React.KeyboardEvent) => {
    if (e.key !== "Tab") return;

    const focusableElements = [
      textareaRef.current,
      submitBtnRef.current,
      cancelBtnRef.current
    ].filter(Boolean) as HTMLElement[];

    if (focusableElements.length === 0) return;

    const first = focusableElements[0];
    const last = focusableElements[focusableElements.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) {
        last.focus();
        e.preventDefault();
      }
    } else {
      if (document.activeElement === last) {
        first.focus();
        e.preventDefault();
      }
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanReason = reason.trim();
    if (!cleanReason) {
      setError(
        language === "bm"
          ? "Sebab penolakan tidak boleh kosong."
          : "Rejection reason cannot be empty."
      );
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await onSubmit(cleanReason);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        backdropFilter: "blur(4px)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 2000,
        padding: "16px"
      }}
      onClick={() => {
        if (!busy) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="rejection-dialog-title"
        onKeyDown={handleTabTrap}
        style={{
          backgroundColor: "var(--bg)",
          color: "var(--text)",
          borderRadius: "8px",
          width: "100%",
          maxWidth: "500px",
          boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
          padding: "24px",
          border: "1px solid var(--line)"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="rejection-dialog-title" style={{ margin: 0, fontSize: "1.25rem", color: "#0d4d41" }}>
          {title}
        </h3>

        <form onSubmit={handleSubmit} style={{ marginTop: "16px" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <span style={{ fontWeight: "bold", fontSize: "0.9rem" }}>
              {language === "bm" ? "Sebab Penolakan *" : "Rejection Reason *"}
            </span>
            <textarea
              ref={textareaRef}
              rows={4}
              required
              disabled={busy}
              placeholder={
                language === "bm"
                  ? "Sila masukkan sebab penolakan..."
                  : "Please enter the reason for rejection..."
              }
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "4px",
                border: "1px solid var(--line)",
                background: "var(--soft-bg)",
                color: "var(--text)",
                fontSize: "0.9rem",
                fontFamily: "inherit"
              }}
            />
          </label>

          {error && (
            <div
              style={{
                marginTop: "12px",
                color: "#913737",
                fontSize: "0.85rem",
                background: "rgba(145, 55, 55, 0.08)",
                padding: "8px",
                borderRadius: "4px"
              }}
            >
              ⚠ {error}
            </div>
          )}

          <div style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end", gap: "12px" }}>
            <button
              ref={cancelBtnRef}
              type="button"
              disabled={busy}
              onClick={onClose}
              className="button button--outline"
              style={{ padding: "8px 16px" }}
            >
              {language === "bm" ? "Batal" : "Cancel"}
            </button>
            <button
              ref={submitBtnRef}
              type="submit"
              disabled={busy}
              className="button"
              style={{ padding: "8px 16px", backgroundColor: "#913737", borderColor: "#913737", color: "#fff" }}
            >
              {busy ? (language === "bm" ? "Memproses..." : "Processing...") : (language === "bm" ? "Tolak" : "Reject")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
