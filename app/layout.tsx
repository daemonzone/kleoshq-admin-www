import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/Nav";
import { isAdmin } from "@/lib/guard";

export const metadata: Metadata = { title: "SiteWitness Admin", robots: { index: false, follow: false } };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const admin = await isAdmin();
  return (
    <html lang="it" className="h-full antialiased">
      <body className="min-h-full">
        {admin && <Nav />}
        <main className="mx-auto w-full max-w-6xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
