import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
// ✅ 引入我們做好的三個元件
import { AIChatAssistant } from "@/components/AIChatAssistant";
import { ChatProvider } from "@/context/ChatContext";
import PageLayoutWrapper from "@/components/PageLayoutWrapper";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: 'Excel AI Ally',
  description: '學習 Excel 函數和數據分析技巧',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {/* ✅ 1. 用 ChatProvider 包住整個應用 */}
        <ChatProvider>
          
          {/* ✅ 2. 用 PageLayoutWrapper 包住 children */}
          <PageLayoutWrapper>
            {children}
          </PageLayoutWrapper>

          {/* ✅ 3. AI 助教放在這裡 (它會透過 Context 控制 PageLayoutWrapper) */}
          <AIChatAssistant />
          
        </ChatProvider>
      </body>
    </html>
  );
}