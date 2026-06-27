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
        <link rel="icon" href="/favicon.svg?v=2" type="image/svg+xml" />
        <link rel="shortcut icon" href="/favicon.svg?v=2" />
      </head>
      <body>
        <BrandProvider>{children}</BrandProvider>
      </body>
    </html>
  );
}
