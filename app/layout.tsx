import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SupabaseRuntimeConfig } from "@/components/supabase-runtime-config";
import { getSupabasePublicConfig } from "@/lib/supabase/env";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Bloj Company LTD",
    template: "%s | Bloj Company LTD",
  },
  description: "Bloj Company LTD Employee Spotlight questionnaire and administrator review portal.",
  robots: { index: false, follow: false },
};

// Read Supabase env at request time so Vercel runtime vars reach the browser.
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: LayoutProps<"/">) {
  const { url, key } = getSupabasePublicConfig();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SupabaseRuntimeConfig url={url} anonKey={key} />
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
