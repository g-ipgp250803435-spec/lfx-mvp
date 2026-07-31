"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Language } from "@/lib/types";
import { ui } from "@/lib/i18n";

const AppContext = createContext<{
  language: Language;
  setLanguage: (language: Language) => void;
  theme: "light" | "dark";
  toggleTheme: () => void;
  labels: typeof ui.bm | typeof ui.en;
}>({ language: "bm", setLanguage: () => {}, theme: "light", toggleTheme: () => {}, labels: ui.bm });

export function Providers({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("bm");
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const savedLanguage = localStorage.getItem("lfx-language") as Language | null;
    const savedTheme = localStorage.getItem("lfx-theme") as "light" | "dark" | null;
    const preferredDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLanguageState(savedLanguage === "en" ? "en" : "bm");
    setTheme(savedTheme || (preferredDark ? "dark" : "light"));
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.lang = language === "bm" ? "ms" : "en";
  }, [theme, language]);

  const value = useMemo(() => ({
    language,
    setLanguage: (next: Language) => { setLanguageState(next); localStorage.setItem("lfx-language", next); },
    theme,
    toggleTheme: () => setTheme((current) => {
      const next = current === "dark" ? "light" : "dark";
      localStorage.setItem("lfx-theme", next);
      return next;
    }),
    labels: ui[language]
  }), [language, theme]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useApp = () => useContext(AppContext);
