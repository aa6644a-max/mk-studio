import type { Metadata, Viewport } from "next";
import "./globals.css";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import ServiceWorker from "@/components/service-worker";

export const metadata: Metadata = {
  title: "MK Studio",
  description: "영화 평론가 MK의 개인 포스팅 작업실",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "MK Studio",
  },
};

export const viewport: Viewport = {
  themeColor: "#0066FF",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Black+Han+Sans&family=DM+Mono:wght@400;500&family=Noto+Sans+KR:wght@400;500;700;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <div className="flex flex-1 flex-col overflow-hidden">
            <main className="flex-1 overflow-y-auto">
              {children}
            </main>
          </div>
        </div>
        <MobileNav />
        <ServiceWorker />
      </body>
    </html>
  );
}
