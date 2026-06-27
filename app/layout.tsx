import type { Metadata } from "next";
import "./globals.css";
import { BrandProvider } from "@/lib/BrandContext";
import { headers } from "next/headers";

export async function generateMetadata(): Promise<Metadata> {
  const hostname = (await headers()).get("host") || "";
  const isOakleyJane = hostname.includes("oakleyjanetools.co.uk");
  return {
    title: isOakleyJane ? "Oakley Jane" : "InventoryTools",
    description: "AI-powered inventory tools",
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const hostname = (await headers()).get("host") || "";
  const isOakleyJane = hostname.includes("oakleyjanetools.co.uk");
  const iconHref = isOakleyJane ? "/brands/oakley-jane-logo.png" : "/favicon.svg?v=2";

  return (
    <html lang="en">
      <head>
        <link rel="icon" href={iconHref} />
        <link rel="shortcut icon" href={iconHref} />
      </head>
      <body>
        <BrandProvider>{children}</BrandProvider>
      </body>
    </html>
  );
}
