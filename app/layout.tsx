import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";

export const metadata: Metadata = {
  title: "MK Studio",
  description: "영화 평론가 MK의 개인 포스팅 작업실",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <div className="flex flex-1 flex-col overflow-hidden">
            <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
              {children}
            </main>
          </div>
        </div>
        <MobileNav />
      </body>
    </html>
  );
}
