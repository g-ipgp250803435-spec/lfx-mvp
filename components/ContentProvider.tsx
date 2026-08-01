"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { fallbackContent } from "@/lib/content";
import { apiGet, isDemoMode } from "@/lib/api";
import { demoStore } from "@/lib/demo-store";
import type { SiteContent } from "@/lib/types";

const ContentContext = createContext<{ content: SiteContent; loading: boolean; demo: boolean; refresh: () => Promise<void> }>({ content: fallbackContent, loading: false, demo: true, refresh: async () => {} });

export function ContentProvider({ children }: { children: React.ReactNode }) {
  const [content, setContent] = useState<SiteContent>(fallbackContent);
  const [loading, setLoading] = useState(true);
  const [demo, setDemo] = useState(isDemoMode);

  const refresh = async () => {
    setLoading(true);
    if (isDemoMode) {
      setContent(demoStore.getContent());
      setDemo(true);
      setLoading(false);
      return;
    }
    try {
      const result = await apiGet<SiteContent>("content/get");
      setContent(result.data || fallbackContent);
      setDemo(Boolean(result.demo));
    } catch {
      setContent(fallbackContent);
      setDemo(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.documentElement.style.setProperty("--brand", content.site.primaryColor);
    document.documentElement.style.setProperty("--accent", content.site.accentColor);
    let favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!favicon) { favicon = document.createElement("link"); favicon.rel = "icon"; document.head.appendChild(favicon); }
    favicon.href = content.site.faviconUrl || "/favicon.svg";
  }, [content]);

  useEffect(() => {
    setTimeout(() => {
      void refresh();
    }, 0);
    const handler = () => { if (isDemoMode) setContent(demoStore.getContent()); };
    window.addEventListener("lfx-demo-update", handler);
    return () => window.removeEventListener("lfx-demo-update", handler);
  }, []);

  return <ContentContext.Provider value={{ content, loading, demo, refresh }}>{children}</ContentContext.Provider>;
}

export const useContent = () => useContext(ContentContext);
