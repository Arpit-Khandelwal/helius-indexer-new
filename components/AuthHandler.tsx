'use client';

import { useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';

export default function AuthHandler()
{
    const { authenticated, user, getAccessToken } = usePrivy();

    // Handle user login
    useEffect(() =>
    {
        const saveUserToDb = async () =>
        {
            if (authenticated && user) {
                try {
                    // Get auth token
                    const authToken = await getAccessToken();

                    // Send token to our backend
                    const response = await fetch('/api/auth/privy', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ authToken }),
                    });

                    const data = await response.json();
                    console.log('User saved to database:', data);
                } catch (error) {
                    console.error('Error saving user to database:', error);
                }
            }
        };

        saveUserToDb();
    }, [authenticated, user, getAccessToken]);

    return null; // This is an invisible handler component
}
