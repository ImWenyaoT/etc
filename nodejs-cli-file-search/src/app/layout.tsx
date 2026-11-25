import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "文件搜索",
  description: "按文件名查找指定文件夹中的文件",
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
