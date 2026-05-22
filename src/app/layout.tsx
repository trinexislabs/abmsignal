import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { Toaster } from "sonner";
import { SessionProvider } from "next-auth/react";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk" });

export const metadata: Metadata = {
  title: "ABMSignal — AI-Powered ABM Playbook Engine",
  description: "Generate launch-ready, hyper-personalized ABM playbooks with verified contacts, culturally-adapted outreach, and a complete execution checklist.",
  keywords: ["ABM", "Account-Based Marketing", "Sales", "Playbook", "AI", "B2B"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} font-sans antialiased`}
        style={{ background: '#0a0a0f', color: '#ffffff', minHeight: '100vh' }}
        suppressHydrationWarning
      >
        <SessionProvider>
          {children}
        </SessionProvider>
        <Toaster theme="dark" position="top-right" />
      </body>
    </html>
  );
}
