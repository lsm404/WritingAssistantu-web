import type { Metadata } from "next";
import "./globals.css";
import "./tauri.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "写作助手 Web 工作台",
  description: "微信公众号智能创作工作台 Web 版",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
