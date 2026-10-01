import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "CypherMed | Privacy-first medical records on Solana",
  description:
    "CypherMed gives patients control over who can access their medical records through encrypted storage and verifiable authorization.",
  metadataBase: new URL("https://app-three-rho-15.vercel.app"),
  openGraph: {
    title: "CypherMed | Privacy-first medical records on Solana",
    description:
      "Patient-controlled access to encrypted medical records, built on Solana.",
    url: "https://app-three-rho-15.vercel.app",
    siteName: "CypherMed",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "CypherMed | Privacy-first medical records on Solana",
    description:
      "Patient-controlled access to encrypted medical records, built on Solana.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
