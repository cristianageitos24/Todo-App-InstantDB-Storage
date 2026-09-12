import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Daylight — A little more clarity",
  description: "Your personal space to organize life, find focus, and make room for what matters.",
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
