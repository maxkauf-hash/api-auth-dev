import { PrismaClient } from "@prisma/client";

const prismaClientSingleton = () => {
  return new PrismaClient();
};

const globalWithPrisma = global;
export const db = globalWithPrisma.prismaGlobal || prismaClientSingleton();

if (process.env.NODE_ENV !== "production") {
  globalWithPrisma.prismaGlobal = db;
}

export default db;
