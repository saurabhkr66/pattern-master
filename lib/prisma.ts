import { PrismaClient } from "@prisma/client";

const prismaClientSingleton = () => {
  // Increase pool_timeout to 30s (default is 10s) so burst traffic doesn't
  // throw P2024 before a queued request can be served.
  const base = process.env.DATABASE_URL ?? "";
  const url = base.includes("pool_timeout") ? base : `${base}${base.includes("?") ? "&" : "?"}pool_timeout=30`;
  return new PrismaClient({ datasources: { db: { url } } });
};

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

export { prisma };

if (process.env.NODE_ENV !== "production") globalThis.prismaGlobal = prisma;
