import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import { Analytics } from "@vercel/analytics/next";
import AssistantChat from "@/components/AssistantChat";

export const metadata: Metadata = {
  title: "Finnhouses Platform",
  description: "Finnhouses Real Estate — ระบบรวมทุก Tool",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body style={{ display: "flex", minHeight: "100vh", background: "#040811" }}>
        <Sidebar />
        <main className="platform-main">
          {children}
        </main>
        <AssistantChat />
        <Analytics />
      </body>
    </html>
  );
}
