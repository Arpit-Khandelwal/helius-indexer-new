import { PrismaClient } from '@prisma/client';

// Use a global variable to prevent multiple instances in development
declare global
{
    var prismaClient: PrismaClient | undefined;
}

// Create a singleton Prisma client
export const prisma = globalThis.prismaClient || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
    globalThis.prismaClient = prisma;
}
