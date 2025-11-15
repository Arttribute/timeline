import type { Metadata } from "next";
import { Space_Mono } from "next/font/google";
import "./globals.css";
import PrivyProviders from "@/components/providers/PrivyProviders";

const space_mono = Space_Mono({
  weight: ["400", "700"],
  subsets: ["latin"],
  display: "swap",
  fallback: ["Helvetica", "Arial", "sans-serif"],
});

export const metadata: Metadata = {
  title: "Timeline - Social Deduction Card Game",
  description:
    "A dynamic social deduction game set in any historical period. Play with humans and AI agents.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={space_mono.className}>
        <PrivyProviders>{children}</PrivyProviders>
      </body>
    </html>
  );
}
