import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { PrivyAuthProvider } from "./providers/privy-provider";
import AuthHandler from '@/components/AuthHandler';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Helius Indexer",
  description: "Index and analyze blockchain data",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
})
{
  return (
    <html lang="en">
      <body className={inter.className}>
        <PrivyAuthProvider>
        <AuthHandler />
          {children}
        </PrivyAuthProvider>
      </body>
    </html>
  );
}
