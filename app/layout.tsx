import type { Metadata } from "next";
import { DesktopNav, MobileNav } from "@/components/shared/AppNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lab Orders Lite",
  description: "Staff-facing lab order management system",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <DesktopNav />
        <MobileNav />
        <main className="min-h-screen bg-background pb-16 md:pl-[76px] md:pb-0">
          <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
