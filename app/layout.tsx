import type { Metadata } from "next";
import "./globals.css";

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
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body>{children}</body>
    </html>
  );
}
