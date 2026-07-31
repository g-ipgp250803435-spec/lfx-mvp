"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { isDemoMode } from "@/lib/api";
import { useApp } from "@/components/Providers";

export type SignedInUser = { email: string; name: string; picture?: string; idToken: string; demo?: boolean };

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (response: { credential: string }) => void; auto_select?: boolean }) => void;
          renderButton: (element: HTMLElement, config: Record<string, unknown>) => void;
          disableAutoSelect: () => void;
        };
      };
    };
  }
}

function decodeToken(token: string) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))) as { email?: string; name?: string; picture?: string };
    return { email: payload.email || "", name: payload.name || payload.email || "Google User", picture: payload.picture };
  } catch { return { email: "", name: "Google User" }; }
}

export function useSignedInUser() {
  const [user, setUser] = useState<SignedInUser | null>(null);
  useEffect(() => {
    const raw = sessionStorage.getItem("lfx-user");
    if (raw) { try { setUser(JSON.parse(raw) as SignedInUser); } catch { sessionStorage.removeItem("lfx-user"); } }
  }, []);
  const save = (next: SignedInUser | null) => {
    setUser(next);
    if (next) sessionStorage.setItem("lfx-user", JSON.stringify(next));
    else sessionStorage.removeItem("lfx-user");
  };
  return { user, setUser: save };
}

export function GoogleAuth({ onUser, compact = false }: { onUser?: (user: SignedInUser | null) => void; compact?: boolean }) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
  const buttonRef = useRef<HTMLDivElement>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const { user, setUser } = useSignedInUser();
  const { labels } = useApp();

  const update = (next: SignedInUser | null) => { setUser(next); onUser?.(next); };

  useEffect(() => { onUser?.(user); }, [user]);

  useEffect(() => {
    if (!scriptReady || !clientId || !buttonRef.current || !window.google || user) return;
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: ({ credential }) => {
        const profile = decodeToken(credential);
        update({ ...profile, idToken: credential });
      }
    });
    buttonRef.current.innerHTML = "";
    window.google.accounts.id.renderButton(buttonRef.current, { theme: "outline", size: compact ? "medium" : "large", shape: "pill", width: compact ? 220 : 310, text: "continue_with" });
  }, [scriptReady, clientId, compact, user]);

  if (user) return <div className="signed-user"><span className="signed-user__avatar">{user.picture ? <img src={user.picture} alt=""/> : <Icon name="user"/>}</span><span><small>{labels.signedInAs}</small><strong>{user.name}</strong><em>{user.email}</em></span><button className="text-button" onClick={() => { window.google?.accounts.id.disableAutoSelect(); update(null); }}>{labels.signOut}</button></div>;

  return <div className="auth-box">
    {clientId && <><Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" onLoad={() => setScriptReady(true)}/><div ref={buttonRef}/></>}
    {!clientId && <p className="muted">{labels.googleRequired}</p>}
    {isDemoMode && <button type="button" className="button button--outline" onClick={() => update({ email: "demo.user@ipg.edu.my", name: "Pengguna Demo", idToken: "demo-token", demo: true })}><Icon name="user" size={17}/>{labels.continueDemo}</button>}
  </div>;
}
