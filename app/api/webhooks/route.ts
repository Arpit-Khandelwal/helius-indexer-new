import { prisma } from "@/lib/prisma";

async function getAddresses(): Promise<string[]>
{
    const addresses = await prisma.indexer.findMany({
        select: {
            addresses: true,
        },
    }
    );
    return addresses.map((address) => address.addresses).flat();

    // make db call to get addresses
    // const addresses = await db.getAddresses();
    // For now, return a static list of addresses
    return [
        "GRQvj7x2DBn5d7JJTXjp7A3bDfC2yMBqSceT4cvDCbtM",
        "CKs1E69a2e9TmH4mKKLrXFF8kD3ZnwKjoEuXa6sz9WqX"
    ]
}

export async function POST(request: Request)
{
    const data = await request.json();
    console.log('Received webhook data:', data);

    const addresses: string[] = await getAddresses();

    for (const entry of data) {
        // find which address it contains
        const addressFound = addresses.find(address => entry.description.includes(address));

        if (addressFound) {
            console.log('Found address in webhook data:', entry.description);
            // Perform your action here, e.g., save to database
            await saveToDatabase(entry, addressFound);
        }
    }

    // Moved this outside the for loop
    return Response.json({
        success: true,
        message: 'Webhook processed successfully',
    }, { status: 200 });
}

async function saveToDatabase(entry: any, address: string)
{
    const result = await prisma.indexer.findFirst({
        where: {
            addresses: {
                has: address,
            },
        },
        select: {
            connectionString: true,
        }
    });

    if (!result || !result.connectionString) {
        console.error('No connection string found for address:', address);
        return;
    }

    const connectionString = result.connectionString;

    // use pg to connect and add data to the database
    const { Client } = require('pg');
    try {
        const client = new Client({
            connectionString: connectionString,
        });
        await client.connect();
        const initializeDB = `CREATE TABLE IF NOT EXISTS transactions (
            id SERIAL PRIMARY KEY,
            description TEXT,
            address TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`;
        await client.query(initializeDB);
        // Insert the data into the database
        const query = `INSERT INTO transactions (description, address) VALUES ($1, $2)`;
        const values = [entry.description, address];
        await client.query(query, values);
        await client.end();
    } catch (error) {
        console.error('Error connecting to database:', error);
    }

    return;
}
