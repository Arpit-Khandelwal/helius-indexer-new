import { NextResponse } from 'next/server';

export async function POST(request: Request)
{
    try {
        const data = await request.json();

        // Validate the required fields
        if (!data.indexerId || !data.address || !data.eventType) {
            return NextResponse.json(
                { message: 'Missing required fields' },
                { status: 400 }
            );
        }

        // In a real implementation, this would send the data to the 
        // Helius webhook or directly to the client's database
        console.log('Test indexer data received:', data);

        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 500));

        // In a production environment, you would:
        // 1. Format the data according to the expected schema
        // 2. Make an API call to Helius or process the data directly
        // 3. Store test results for reference

        return NextResponse.json({
            success: true,
            message: 'Test data processed successfully',
            data: {
                indexerId: data.indexerId,
                timestamp: new Date().toISOString(),
                processed: true
            }
        });
    } catch (error) {
        console.error('Error processing test webhook:', error);

        return NextResponse.json(
            { message: 'Error processing test data' },
            { status: 500 }
        );
    }
}
