import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "文档转换",
  description: "粘贴文档，转成易读的 JSON。",
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
