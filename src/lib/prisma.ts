import { PrismaClient } from "@/generated/prisma";

declare global {
	var prisma: PrismaClient | undefined;
}

const prisma = globalThis.prisma || new PrismaClient();
console.log("DATABASE_URL:", process.env.DATABASE_URL);

if (process.env.NODE_ENV === "development") {
	globalThis.prisma = prisma;
}

export default prisma;
