'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import { FC, ReactNode } from 'react';

interface PrivyAuthProviderProps {
  children: ReactNode;
}

export const PrivyAuthProvider: FC<PrivyAuthProviderProps> = ({ children }) => {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID as string}
      config={{
        loginMethods: ['email', 'wallet'],
        appearance: {
          theme: 'dark',
          accentColor: '#3B82F6', // Blue color matching your UI
          logo: '/logo.png', // Replace with your actual logo path
        },
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
};