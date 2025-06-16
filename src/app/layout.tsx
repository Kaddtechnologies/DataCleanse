import type { Metadata } from "next";
import Script from "next/script";
import { GeistSans } from "geist/font/sans";
import "./globals.css";

import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "Flowserve AI - Customer Deduplication",
  description: "Identify and manage duplicate customer records with Flowserve AI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={GeistSans.variable} suppressHydrationWarning={true}>
      <head>
        {/* Prevent flash‐of‐incorrect‐theme before React hydration */}
        <Script id="theme-init" strategy="beforeInteractive">
          {`(() => {
  try {
    const storageKey = 'dc-theme';
    const stored = localStorage.getItem(storageKey);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (stored === 'dark' || (!stored && prefersDark)) {
      document.documentElement.classList.add('dark');
    }
  } catch (_) {}
})();`}
        </Script>
      </head>
      <body className="font-sans antialiased transition-colors duration-300">
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
