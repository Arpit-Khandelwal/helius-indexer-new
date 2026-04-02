'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useState, useEffect, useCallback } from 'react';

// Define event types enum
const EVENT_TYPES = [
    { value: 'nft_sale', label: 'NFT Sale' },
    { value: 'nft_mint', label: 'NFT Mint' },
    { value: 'nft_list', label: 'NFT List' },
    { value: 'balance_transfer', label: 'Balance Transfer' },
    { value: 'swap', label: 'Token Swap' },
    { value: 'program_call', label: 'Program Call' }
];

// Define interface for indexer API response
interface IndexerApiResponse
{
    id: string;
    name?: string;
    postgresUrl?: string;
    connectionString: string;
    solanaAddress?: string;
    addresses?: string[];
    eventTypes?: string[];
    events?: string[];
    filter?: string;
    status?: string;
    transactions?: number;
    createdAt?: string;
    updatedAt?: string;
}

// make interface for indexer
interface Indexer
{
    id: string;
    name: string;
    postgresUrl: string;
    solanaAddress: string;
    eventTypes: string[];
    filter: string;
    status: string;
    transactions: number;
}

export default function Dashboard()
{
    const { user, getAccessToken, authenticated } = usePrivy();
    const [showAddIndexerModal, setShowAddIndexerModal] = useState(false);
    const [indexerName, setIndexerName] = useState('');
    const [postgresUrl, setPostgresUrl] = useState('');
    const [solanaAddress, setSolanaAddress] = useState('');
    const [eventTypes, setEventTypes] = useState<string[]>([]);
    const [indexerFilter, setIndexerFilter] = useState('');
    const [indexers, setIndexers] = useState<Indexer[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingIndexers, setIsFetchingIndexers] = useState(false);
    const [error, setError] = useState('');
    const [testingIndexerId, setTestingIndexerId] = useState<string | null>(null);

    // Function to fetch indexers from the API
    const fetchIndexers = useCallback(async () =>
    {
        if (!authenticated) {
            console.log('Not authenticated, skipping indexer fetch');
            return;
        }

        setIsFetchingIndexers(true);
        try {
            console.log('Fetching indexers...');
            const authToken = await getAccessToken();

            console.log('Got access token, making API request');
            const response = await fetch('/api/indexers', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                }
            });

            console.log('API response status:', response.status);

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Error response:', errorData);
                throw new Error(errorData.message || errorData.error || 'Failed to fetch indexers');
            }

            const data = await response.json();
            console.log('Fetched indexers data:', data);

            // Transform data if needed to match the Indexer interface
            const fetchedIndexers: Indexer[] = data.indexers.map((indexer: IndexerApiResponse) => ({
                id: indexer.id,
                name: indexer.name || `Indexer ${indexer.id.substring(0, 6)}`,
                postgresUrl: indexer.postgresUrl || indexer.connectionString,
                solanaAddress: indexer.solanaAddress || (indexer.addresses && indexer.addresses.length > 0 ? indexer.addresses[0] : ''),
                eventTypes: indexer.eventTypes || indexer.events || [],
                filter: indexer.filter || '',
                status: indexer.status || 'active',
                transactions: indexer.transactions || 0
            }));

            console.log('Processed indexers for UI:', fetchedIndexers);
            setIndexers(fetchedIndexers);
        } catch (err) {
            console.error('Error fetching indexers:', err);
            setError(err instanceof Error ? err.message : 'An error occurred while fetching indexers');
        } finally {
            setIsFetchingIndexers(false);
        }
    }, [authenticated, getAccessToken]);

    // Fetch indexers when the component mounts and when authentication status changes
    useEffect(() =>
    {
        console.log('Dashboard mounted or auth changed, authenticated:', authenticated);

        // Only attempt to fetch if the user is authenticated
        if (authenticated) {
            fetchIndexers();
        }
    }, [authenticated, fetchIndexers]);

    // Add another useEffect to handle user object changes
    useEffect(() =>
    {
        console.log('User object changed:', user);

        // If we have a user object and we're authenticated, make sure we have the indexers
        if (user && authenticated && indexers.length === 0 && !isFetchingIndexers) {
            console.log('User available but no indexers, fetching again');
            fetchIndexers();
        }
    }, [user, authenticated, fetchIndexers, indexers.length, isFetchingIndexers]);

    const handleAddIndexer = async () =>
    {
        if (indexerName.trim() && postgresUrl.trim()) {
            setIsLoading(true);
            setError('');

            try {
                const authToken = await getAccessToken();
                const response = await fetch('/api/indexers', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        name: indexerName,
                        postgresUrl: postgresUrl,
                        solanaAddress: solanaAddress,
                        eventTypes: eventTypes,
                        filter: indexerFilter,
                        authToken: authToken
                    }),
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || 'Failed to create indexer');
                }

                // After successfully adding an indexer, refresh the list
                await fetchIndexers();
                setIndexerName('');
                setPostgresUrl('');
                setSolanaAddress('');
                setEventTypes([]);
                setIndexerFilter('');
                setShowAddIndexerModal(false);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An error occurred while creating the indexer');
                console.error('Error creating indexer:', err);
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handleEventTypeToggle = (eventType: string) =>
    {
        if (eventTypes.includes(eventType)) {
            setEventTypes(eventTypes.filter(type => type !== eventType));
        } else {
            setEventTypes([...eventTypes, eventType]);
        }
    };

    const testIndexer = async (indexer: Indexer) =>
    {
        try {
            setTestingIndexerId(indexer.id);
            // Create mock transaction data based on the indexer's configured event types
            const mockEventType = indexer.eventTypes.length > 0
                ? indexer.eventTypes[0]
                : 'nft_sale';

            // Prepare the mock transaction data
            const mockData = {
                indexerId: indexer.id,
                address: indexer.solanaAddress || "DRpbCBMxVnDK7maPM5tGv6MvB3v1sRMC86PZ8okm21hy",
                eventType: mockEventType,
                timestamp: new Date().toISOString(),
                testRun: true
            };

            // Send the test data to the webhook endpoint
            const response = await fetch('/api/webhook/test', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(mockData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to test indexer');
            }

            alert('Test successful! Mock transaction sent to indexer.');
        } catch (err) {
            console.error('Error testing indexer:', err);
            alert('Error testing indexer: ' + (err instanceof Error ? err.message : 'Unknown error'));
        } finally {
            setTestingIndexerId(null);
        }
    };

    const viewLogs = (_indexer: Indexer) =>
    {
        // This functionality will be implemented later
        alert('Log viewing will be implemented in a future update.');
    };

    return (
        <div className="p-6 bg-card text-card-foreground rounded-lg shadow-sm">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Dashboard</h1>
                <button
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    onClick={() => setShowAddIndexerModal(true)}
                >
                    Add Indexer
                </button>
            </div>
            <div className="space-y-6">
                <div className="bg-secondary p-4 rounded-md">
                    <h2 className="font-medium mb-2">User Information</h2>
                    <div className="grid grid-cols-1 gap-2">
                        {user?.email && (
                            <p className="text-sm">
                                <span className="text-muted-foreground">Email:</span> {user.email.address}
                            </p>
                        )}
                        {user?.wallet && (
                            <p className="text-sm">
                                <span className="text-muted-foreground">Wallet:</span> {user.wallet.address}
                            </p>
                        )}
                    </div>
                </div>

                <div className="bg-secondary p-4 rounded-md">
                    <h2 className="font-medium mb-2">Helius Indexer</h2>
                    <p className="text-sm text-muted-foreground mb-4">
                        Welcome to the Helius Indexer dashboard. Here you can monitor and analyze blockchain data.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* <div className="p-4 bg-accent rounded-md">
                            <h3 className="text-sm font-medium">Indexed Transactions</h3>
                            <p className="text-2xl font-bold">
                                {indexers.reduce((sum, indexer) => sum + indexer.transactions, 0)}
                            </p>
                        </div> */}
                        <div className="p-4 bg-accent rounded-md">
                            <h3 className="text-sm font-medium">Active Indexers</h3>
                            <p className="text-2xl font-bold">
                                {isFetchingIndexers ?
                                    <span className="text-sm">Loading...</span> :
                                    indexers.length
                                }
                            </p>
                        </div>
                        <div className="p-4 bg-accent rounded-md">
                            <h3 className="text-sm font-medium">Status</h3>
                            <p className="text-emerald-500 font-medium">Ready</p>
                        </div>
                    </div>
                </div>

                {/* Show loading state when fetching indexers */}
                {isFetchingIndexers && (
                    <div className="flex justify-center items-center py-8">
                        <p className="text-muted-foreground">Loading indexers...</p>
                    </div>
                )}

                {/* Show a message if no indexers are found after loading */}
                {!isFetchingIndexers && indexers.length === 0 && (
                    <div className="bg-secondary p-6 rounded-md text-center">
                        <h3 className="font-medium mb-2">No Indexers Found</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            You haven&apos;t created any indexers yet. Click the &quot;Add Indexer&quot; button to get started.
                        </p>
                    </div>
                )}

                {/* Show indexers table if we have data */}
                {!isFetchingIndexers && indexers.length > 0 && (
                    <div className="bg-secondary p-4 rounded-md">
                        <h2 className="font-medium mb-4">Your Indexers</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-muted text-left">
                                    <tr>
                                        <th className="p-2">Name</th>
                                        <th className="p-2">Postgres URL</th>
                                        <th className="p-2">Solana Address</th>
                                        <th className="p-2">Event Types</th>
                                        <th className="p-2">Status</th>
                                        <th className="p-2">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {indexers.map(indexer => (
                                        <tr key={indexer.id} className="border-t border-muted">
                                            <td className="p-2">{indexer.name}</td>
                                            <td className="p-2">
                                                <code className="bg-muted px-1 py-0.5 rounded text-xs truncate max-w-[150px] inline-block">
                                                    {indexer.postgresUrl}
                                                </code>
                                            </td>
                                            <td className="p-2">
                                                {indexer.solanaAddress ? (
                                                    <code className="bg-muted px-1 py-0.5 rounded text-xs">
                                                        {indexer.solanaAddress.substring(0, 4)}...{indexer.solanaAddress.substring(indexer.solanaAddress.length - 4)}
                                                    </code>
                                                ) : (
                                                    <span className="text-muted-foreground text-xs">Not specified</span>
                                                )}
                                            </td>
                                            <td className="p-2">
                                                <div className="flex flex-wrap gap-1">
                                                    {indexer.eventTypes && indexer.eventTypes.length > 0 ? (
                                                        indexer.eventTypes.map((type, idx) => (
                                                            <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                                {EVENT_TYPES.find(t => t.value === type)?.label || type}
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <span className="text-muted-foreground text-xs">All events</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-2">
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                    {indexer.status}
                                                </span>
                                            </td>
                                            <td className="p-2">
                                                <div className="flex space-x-2">
                                                    <button
                                                        className="text-xs text-green-600 hover:text-green-800"
                                                        onClick={() => testIndexer(indexer)}
                                                        disabled={testingIndexerId === indexer.id}
                                                    >
                                                        {testingIndexerId === indexer.id ? 'Testing...' : 'Test'}
                                                    </button>
                                                    <button
                                                        className="text-xs text-purple-600 hover:text-purple-800"
                                                        onClick={() => viewLogs(indexer)}
                                                    >
                                                        Logs
                                                    </button>
                                                    <button
                                                        className="text-xs text-blue-600 hover:text-blue-800"
                                                        onClick={() =>
                                                        {
                                                            setIndexers(indexers.filter(i => i.id !== indexer.id));
                                                        }}
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Add Indexer Modal */}
            {showAddIndexerModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-card p-6 rounded-lg shadow-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
                        <h3 className="text-xl font-bold mb-4">Add New Indexer</h3>

                        {error && (
                            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                                <p>{error}</p>
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    Indexer Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    className="w-full p-2 border border-input rounded-md bg-background"
                                    placeholder="Enter indexer name"
                                    value={indexerName}
                                    onChange={(e) => setIndexerName(e.target.value)}
                                    disabled={isLoading}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    Postgres URL <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    className="w-full p-2 border border-input rounded-md bg-background"
                                    placeholder="postgresql://username:password@host:port/database"
                                    value={postgresUrl}
                                    onChange={(e) => setPostgresUrl(e.target.value)}
                                    disabled={isLoading}
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                    Connection string for your PostgreSQL database
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    Solana Address
                                </label>
                                <input
                                    type="text"
                                    className="w-full p-2 border border-input rounded-md bg-background"
                                    placeholder="Enter Solana address to monitor"
                                    value={solanaAddress}
                                    onChange={(e) => setSolanaAddress(e.target.value)}
                                    disabled={isLoading}
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                    Filter events for a specific Solana address
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    Event Types
                                </label>
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                    {EVENT_TYPES.map(type => (
                                        <label key={type.value} className="flex items-center space-x-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="rounded border-gray-300"
                                                checked={eventTypes.includes(type.value)}
                                                onChange={() => handleEventTypeToggle(type.value)}
                                                disabled={isLoading}
                                            />
                                            <span className="text-sm">{type.label}</span>
                                        </label>
                                    ))}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Leave all unchecked to index all event types
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    Custom Filter Expression (optional)
                                </label>
                                <textarea
                                    className="w-full p-2 border border-input rounded-md bg-background"
                                    placeholder="E.g. program = 'xyz123...'"
                                    rows={3}
                                    value={indexerFilter}
                                    onChange={(e) => setIndexerFilter(e.target.value)}
                                    disabled={isLoading}
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                    Advanced: Define custom filters to specify which blockchain transactions to index
                                </p>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 mt-6">
                            <button
                                className="px-4 py-2 border border-input rounded-md hover:bg-muted transition-colors"
                                onClick={() => setShowAddIndexerModal(false)}
                                disabled={isLoading}
                            >
                                Cancel
                            </button>
                            <button
                                className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors ${(!indexerName.trim() || !postgresUrl.trim() || isLoading)
                                    ? 'opacity-50 cursor-not-allowed'
                                    : ''
                                    }`}
                                onClick={handleAddIndexer}
                                disabled={!indexerName.trim() || !postgresUrl.trim() || isLoading}
                            >
                                {isLoading ? 'Creating...' : 'Add Indexer'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
