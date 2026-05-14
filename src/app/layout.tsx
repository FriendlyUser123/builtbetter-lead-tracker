import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BuiltBetter Lead Tracker",
  description: "Local-first manual lead tracking for BuiltBetter.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
