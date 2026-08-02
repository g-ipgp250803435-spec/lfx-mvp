import type { Metadata, Viewport } from "next";
import { Providers } from "@/components/Providers";
import { ContentProvider } from "@/components/ContentProvider";
import { Header, Footer } from "@/components/SiteShell";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "LEGASI FINANCE X", template: "%s · LFX" },
  description: "One platform. All Treasury Office affairs.",
  applicationName: "LEGASI FINANCE X",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/favicon.svg" },
  openGraph: { title: "LEGASI FINANCE X", description: "One platform. All Treasury Office affairs.", type: "website", siteName: "LFX" }
};

export const viewport: Viewport = { themeColor: "#16080c", colorScheme: "light dark" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ms" suppressHydrationWarning><body><Providers><ContentProvider><Header/><main id="main-content">{children}</main><Footer/></ContentProvider></Providers></body></html>;
}
