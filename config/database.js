
// database.js
// Centralized Prisma client instance for the app
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
    datasources: {
        db: {
            // Enable SSL if DATABASE_SSL is set (for production)
            ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined
        }
    }
});

export default prisma;
