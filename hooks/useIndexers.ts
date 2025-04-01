import { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';

type Indexer = {
    id: string;
    name: string;
    description: string;
    addresses: string[];
    connectionString: string;
    createdAt: Date;
    updatedAt: Date;
};

export function useIndexers()
{
    const [indexers, setIndexers] = useState<Indexer[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const { authenticated, getAccessToken } = usePrivy();

    const fetchIndexers = async () =>
    {
        setLoading(true);
        setError(null);

        if (!authenticated) {
            setError('User not authenticated');
            setLoading(false);
            return;
        }

        try {
            // Get Privy access token
            const token = await getAccessToken();

            const response = await fetch('/api/indexers', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error(`Error: ${response.status}`);
            }

            const data = await response.json();
            setIndexers(data.indexers);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load indexers');
            console.error('Error fetching indexers:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() =>
    {
        if (authenticated) {
            fetchIndexers();
        }
    }, [authenticated]);

    return { indexers, loading, error, refetch: fetchIndexers };
}
