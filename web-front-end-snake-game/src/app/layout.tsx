import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "贪吃蛇",
  description: "经典贪吃蛇，本机最高分与成绩榜。",
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
