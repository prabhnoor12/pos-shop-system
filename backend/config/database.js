
// database.js
// Centralized Prisma client instance for the app
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default prisma;
