import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import ForumHeader from "@/components/ForumHeader";
import ChatAssistant from "@/components/ChatAssistant";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SkillHub | Skills 分享与交流社区",
  description: "发现、分享和交流可复用的 Skills；通过论坛、知识库与专题积累实践经验。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ForumHeader />
        <div className="flex-1">{children}</div>
        <ChatAssistant />
      </body>
    </html>
  );
}
