import type { Metadata } from "next";
import OjLoginClient from "./OjLoginClient";

export const metadata: Metadata = {
  title: "Oakley Jane",
  icons: {
    icon: "/brands/oakley-jane-logo.png",
    shortcut: "/brands/oakley-jane-logo.png",
  },
};

export default function OjLoginPage() {
  return <OjLoginClient />;
}
