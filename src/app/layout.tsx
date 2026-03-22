import type { Metadata } from "next";
import { Bebas_Neue, Space_Grotesk } from "next/font/google";
import "./globals.css";

const headingFont = Bebas_Neue({
  subsets: ["latin"],
  variable: "--font-heading",
  weight: "400",
});

const bodyFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "Workout Challenge",
  description: "Public fitness challenges with simple session-based leaderboards.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta
          content="telephone=no, date=no, email=no, address=no"
          name="format-detection"
        />
      </head>
      <body
        className={`${headingFont.variable} ${bodyFont.variable}`}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
