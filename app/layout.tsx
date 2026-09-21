import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "igreen.ai — Every action adds up",
  description:
    "A global community turning everyday choices into measurable action for a thriving planet.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
