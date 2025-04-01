import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { PrivyClient } from '@privy-io/server-auth';
import { Helius } from 'helius-sdk';
import { prisma } from '@/lib/prisma';

const helius = new Helius(process.env.NEXT_PUBLIC_HELIUS_API_KEY!);
const privy = new PrivyClient(
    process.env.NEXT_PUBLIC_PRIVY_APP_ID as string,
    process.env.PRIVY_APP_SECRET as string
);

async function addAddressToWebhook(address: string, eventTypes: string[]): Promise<boolean>
{
    const webhooksUpdate = await helius.appendAddressesToWebhook(
        process.env.NEXT_PUBLIC_HELIUS_WEBHOOK_ID!,
        [address],
    );

    return true;
}

// Validate Postgres connection string
async function validatePostgresConnection(connectionString: string): Promise<{ success: boolean; error?: string }>
{
    try {
        // Create a new pool with the connection string
        const pool = new Pool({ connectionString });

        // Try to connect to the database
        const client = await pool.connect();

        try {
            // Run a simple query to verify the connection
            await client.query('SELECT NOW()');
            return { success: true };
        } finally {
            // Release the client back to the pool
            client.release();
            // End the pool
            await pool.end();
        }
    } catch (error) {
        console.error('Error connecting to Postgres:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown database connection error'
        };
    }
}

export async function POST(request: Request)
{
    try {
        // Parse the request body
        const body = await request.json();
        const { name, postgresUrl, solanaAddress, eventTypes, filter, authToken } = body;

        // Verify user authentication if token provided
        let userId = null;
        if (authToken) {
            try {
                const verifiedClaims = await privy.verifyAuthToken(authToken);
                if (verifiedClaims) {
                    const privyUser = await privy.getUser(verifiedClaims.userId);
                    console.log('Privy user:', privyUser);
                    if (privyUser && privyUser.wallet) {
                        const walletAddress = privyUser.wallet.address

                        // Fetch or create user in our database
                        const user = await prisma.user.upsert({
                            where: { walletAddress },
                            update: {},
                            create: { walletAddress },
                        });

                        userId = user.id;
                    }
                }
            } catch (authError) {
                console.error('Authentication error:', authError);
            }
        }

        // Basic validation
        if (!name || !postgresUrl) {
            return NextResponse.json({
                success: false,
                message: 'Indexer name and Postgres URL are required'
            }, { status: 400 });
        }

        // Validate Postgres connection
        console.log(`Validating Postgres connection for indexer "${name}"...`);
        const dbValidation = await validatePostgresConnection(postgresUrl);

        if (!dbValidation.success) {
            return NextResponse.json({
                success: false,
                message: 'Failed to connect to PostgreSQL database',
                error: dbValidation.error
            }, { status: 400 });
        }

        // If solanaAddress is provided, add it to the webhook
        let webhookSuccess = true;
        if (solanaAddress) {
            console.log(`Adding address ${solanaAddress} to webhook for indexer "${name}"...`);
            webhookSuccess = await addAddressToWebhook(
                solanaAddress,
                Array.isArray(eventTypes) && eventTypes.length > 0 ? eventTypes : ['all']
            );

            if (!webhookSuccess) {
                return NextResponse.json({
                    success: false,
                    message: 'Failed to register address with webhook service'
                }, { status: 500 });
            }
        }

        // Create the indexer in the database
        const indexerData = {
            connectionString: postgresUrl,
            addresses: solanaAddress ? [solanaAddress] : [], // Store as array
            events: Array.isArray(eventTypes) ? eventTypes : [],
            status: 'active',
        };

        // If we have a user ID, associate the indexer with the user
        if (userId) {
            // Fix: Use userId in a way that matches your schema
            // This depends on how the relation is set up in your Prisma schema
            try {
                const indexer = await prisma.indexer.create({
                    data: {
                        ...indexerData,
                        userId: userId 
                    }
                });

                console.log(`Created indexer with ID ${indexer.id} for user ${userId}`);

                return NextResponse.json({
                    success: true,
                    message: 'Indexer created successfully and associated with user',
                    indexer
                }, { status: 201 });
            } catch (createError) {
                console.error('Error creating indexer with user association:', createError);
                return NextResponse.json({
                    success: false,
                    message: 'Failed to associate indexer with user',
                    error: createError instanceof Error ? createError.message : 'Unknown error'
                }, { status: 500 });
            }
        } else {
            // Create indexer without user association
            const indexer = await prisma.indexer.create({
                data: indexerData
            });

            return NextResponse.json({
                success: true,
                message: 'Indexer created successfully',
                indexer
            }, { status: 201 });
        }

    } catch (error) {
        console.error('Error creating indexer:', error);

        return NextResponse.json({
            success: false,
            message: 'Internal server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}

export async function GET(request: Request)
{
    try {
        // Extract auth token from Authorization header
        const authHeader = request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({
                error: "Not authenticated"
            }, { status: 401 });
        }

        const authToken = authHeader.substring(7); // Remove 'Bearer ' prefix

        // Verify the Privy auth token
        let walletAddress;
        try {
            const verifiedClaims = await privy.verifyAuthToken(authToken);
            if (!verifiedClaims) {
                return NextResponse.json({
                    error: "Invalid authentication token"
                }, { status: 401 });
            }

            const privyUser = await privy.getUser(verifiedClaims.userId);
            if (!privyUser || !privyUser.wallet) {
                return NextResponse.json({
                    error: "No wallet associated with user"
                }, { status: 400 });
            }

            walletAddress = privyUser.wallet.address;
        } catch (error) {
            console.error("Authentication error:", error);
            return NextResponse.json({
                error: "Authentication failed"
            }, { status: 401 });
        }

        // Find the user first
        const user = await prisma.user.findUnique({
            where: { walletAddress }
        });

        if (!user) {
            return NextResponse.json({
                error: "User not found"
            }, { status: 404 });
        }

        // Now find all indexers belonging to this user
        const indexers = await prisma.indexer.findMany({
            where: {
                userId: user.id
            },
            select: {
                id: true,
                addresses: true,
                connectionString: true,
                createdAt: true,
                updatedAt: true
            }
        });

        return NextResponse.json({
            indexers
        }, { status: 200 });
    } catch (error) {
        console.error("Error fetching indexers:", error);
        return NextResponse.json({
            error: "Failed to retrieve indexers"
        }, { status: 500 });
    }
}
