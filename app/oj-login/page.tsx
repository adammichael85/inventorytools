import type { Metadata } from "next";
import Auth from "../auth/page";

export const metadata: Metadata = {
  title: "Oakley Jane",
  icons: {
    icon: "/brands/oakley-jane-logo.png",
    shortcut: "/brands/oakley-jane-logo.png",
  },
};

export default function OjLoginPage() {
  return <Auth />;
}
