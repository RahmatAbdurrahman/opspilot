import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "OpsPilot",
    template: "%s | OpsPilot",
  },
  description: "AI Revenue Operations Agent — know what needs attention and act on it faster.",
  keywords: ["revenue operations", "B2B", "AI", "invoices", "customers"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} antialiased`}>
        <div className="flex h-dvh overflow-clip bg-[hsl(var(--background))]">
          <Sidebar className="hidden md:flex" />
          <div className="flex min-w-0 flex-1 flex-col overflow-clip">
            <Topbar />
            <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
