import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuroraBackground } from "@/components/AuroraBackground";
import { SupabaseBridge } from "@/components/SupabaseBridge";
import { LiveSync } from "@/components/LiveSync";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Anchor — Everything, anchored.",
  description:
    "Anchor keeps your education, projects, reminders, notes and goals organised in one calm, interconnected workspace.",
};

export const viewport: Viewport = {
  themeColor: "#fafafb",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-dvh font-sans text-ink antialiased">
        <AuroraBackground />
        <SupabaseBridge />
        <LiveSync />
        {children}
      </body>
    </html>
  );
}
