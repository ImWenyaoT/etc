import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Trumpet",
  description: "关注感兴趣的人，分享你的近况。",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
