import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Offerss Admin",
  description: "Admin panel for Offerss e-commerce platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
