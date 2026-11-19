import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Legalcheck: is it legal here?",
  description:
    "Type an activity, pick a country, and get a quick answer on whether it's legal there, with the laws behind it.",
  openGraph: {
    siteName: "Legalcheck",
    title: "Legalcheck: is it legal here?",
    description: "Before you do it, check the law.",
  },
};

export const viewport: Viewport = { themeColor: "#F4F1EC" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@700;800&family=Figtree:wght@400;500;600&family=Fraunces:ital,opsz,wght@1,9..144,500;1,9..144,600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
