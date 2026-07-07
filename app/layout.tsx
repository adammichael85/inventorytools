import type { Metadata } from "next";
import "./globals.css";
import { BrandProvider } from "@/lib/BrandContext";

export const metadata: Metadata = {
  title: "InventoryTools",
  description: "AI-powered inventory tools",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico?v=3" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png?v=3" />
      </head>
      <body>
        <BrandProvider>{children}</BrandProvider>
      </body>
    </html>
  );
}
