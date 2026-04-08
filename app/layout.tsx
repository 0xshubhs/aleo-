import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "@provablehq/aleo-wallet-adaptor-react-ui/dist/styles.css";
import { ClientWalletProvider } from "./wallet/ClientWalletProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SilentBid — Privacy-Focused Sealed-Bid Auctions on Aleo",
  description: "SilentBid uses Aleo zero-knowledge proofs for sealed-bid privacy. Fair, MEV-resistant auctions onchain.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <ClientWalletProvider>{children}</ClientWalletProvider>
      </body>
    </html>
  );
}
