'use client';

import { usePrivy } from '@privy-io/react-auth';
import Dashboard from './dashboard';
import { useState } from 'react';

export default function LoginButton()
{
  const { login, authenticated, user, logout } = usePrivy();
  const [showUserMenu, setShowUserMenu] = useState(false);

  if (authenticated) {
    return (
      <div className="flex flex-col w-full">
        <div className="flex justify-between items-center mb-6 p-4 bg-secondary rounded-lg">
          <div className="flex items-center gap-3">
            {user?.email ? (
              <></>
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                {user?.email?.address?.charAt(0)?.toUpperCase() ||
                  user?.wallet?.address?.substring(0, 2) || '?'}
              </div>
            )}
            <div>
              <p className="font-medium">
                {user?.email?.address || user?.wallet?.address?.substring(0, 6) + '...' +
                  user?.wallet?.address?.substring(user?.wallet?.address.length - 4)}
              </p>
              <button
                onClick={() => logout()}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Log out
              </button>
            </div>
          </div>
        </div>
        <Dashboard />
      </div>
    );
  }

  return (
    <button
      onClick={login}
      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
    >
      Login with Privy
    </button>
  );
}