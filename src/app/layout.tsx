import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";

// The GeistSans object from 'geist/font/sans' directly provides the .variable class
// No need to call it as a function or specify subsets here.

export const metadata: Metadata = {
  title: 'DataCleanse - Customer Deduplication',
  description: 'Identify and manage duplicate customer records with DataCleanse.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={GeistSans.variable}>
      <body className={`font-sans antialiased`}> {/* font-sans in globals.css will use the --font-geist-sans variable */}
        {children}
        <Toaster />
      </body>
    </html>
  );
}
