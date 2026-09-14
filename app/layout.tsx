import type { Metadata } from "next";
import "./globals.css";
import "./workroom.css";

export const metadata: Metadata = {
  title: "Workroom — Your work, under control",
  description: "Tasks, meeting notes, schedules, and focus. Your personal work organizer.",
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
