import { NextResponse } from 'next/server';
import { PrivyClient } from '@privy-io/server-auth';
import { prisma } from '@/lib/prisma';

// Initialize Privy client
const privy = new PrivyClient(
    process.env.NEXT_PUBLIC_PRIVY_APP_ID as string,
    process.env.NEXT_PUBLIC_PRIVY_APP_SECRET as string
);

export async function POST(request: Request)
{
    try {
        const { authToken } = await request.json();

        // Verify the auth token
        const verifiedClaims = await privy.verifyAuthToken(authToken);
        if (!verifiedClaims) {
            return NextResponse.json({ success: false, message: 'Invalid authentication token' }, { status: 401 });
        }

        const { userId } = verifiedClaims;

        // Get user data from Privy
        const privyUser = await privy.getUser(userId);

        if (!privyUser) {
            return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
        }

        // Find wallet addresses linked to the user
        let walletAddress = privyUser.wallet?.address;

        if (!walletAddress) {
            return NextResponse.json({
                success: false,
                message: 'No wallet address found for user'
            }, { status: 400 });
        }

        // Create or update the user in our database
        const user = await prisma.user.upsert({
            where: { walletAddress },
            update: {}, // No updates needed, just ensure it exists
            create: {
                walletAddress,
            },
        });

        return NextResponse.json({
            success: true,
            user
        }, { status: 200 });

    } catch (error) {
        console.error('Error processing authentication:', error);
        return NextResponse.json({
            success: false,
            message: 'Internal server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
