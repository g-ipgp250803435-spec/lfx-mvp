import type { Metadata, Viewport } from "next";
import { Providers } from "@/components/Providers";
import { ContentProvider } from "@/components/ContentProvider";
import { Header, Footer } from "@/components/SiteShell";
import { getInitialContent } from "@/lib/content-server";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Hab Perbendaharaan Digital", template: "%s · HiPER" },
  description: "One platform. All Treasury Office affairs.",
  applicationName: "Hab Perbendaharaan Digital",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/favicon.svg" },
  openGraph: { title: "Hab Perbendaharaan Digital", description: "One platform. All Treasury Office affairs.", type: "website", siteName: "HiPER" }
};

export const viewport: Viewport = { themeColor: "#16080c", colorScheme: "light dark" };

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const initialContent = await getInitialContent();

  return (
    <html lang="ms" suppressHydrationWarning>
      <body>
        <Providers>
          <ContentProvider initialContent={initialContent}>
            <Header />
            <main id="main-content">{children}</main>
            <Footer />
          </ContentProvider>
        </Providers>
      </body>
    </html>
  );
}
