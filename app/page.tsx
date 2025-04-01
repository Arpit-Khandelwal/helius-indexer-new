"use client"

import { usePrivy } from "@privy-io/react-auth";
import LoginButton from './components/login-button';
import { cn } from '@/lib/utils';

export default function Home()
{
  const { ready } = usePrivy();

  if (!ready) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-pulse">Loading authentication...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <header className="mb-8">
          <h1 className="text-3xl font-bold">Helius Indexer</h1>
          <p className="text-muted-foreground">Index and analyze blockchain data</p>
        </header>

        <main className={cn("max-w-4xl mx-auto")}>
          <LoginButton />
        </main>
      </div>
    </div>
  );
}

