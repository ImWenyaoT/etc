import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "排序实验",
  description: "打乱数字再排序，查看用时和检查结果",
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
