import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Suspense } from "react";
import PWA from "@/components/PWA";
import { NavigationProgress } from "@/components/NavigationProgress";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Smart Pocket - แอพรายรับรายจ่ายอัจฉริยะ",
  description: "จดบันทึกรายรับรายจ่ายด้วย AI สแกนสลิปอัตโนมัติ",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "รายรับรายจ่าย",
    statusBarStyle: "default"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        <PWA />
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
