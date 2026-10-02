import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Footer } from "@/components/shell/footer";
import { TopBar } from "@/components/shell/top-bar";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://pforte.bkstechnologies.de"),
  title: { default: "Pforte · API Gateway & Rate-Limiting", template: "%s · Pforte" },
  description:
    "Control Panel für ein API-Gateway vor einem Legacy-System: Live-Verkehr, Regeln für Ratenbegrenzung und Cache, Payload-Umwandlung und Circuit Breaker. Eine Demo von BKS Technologies.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#111a2a" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="de" className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <body className="min-h-dvh font-sans">
        <TopBar />
        <main className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6 sm:py-6">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
