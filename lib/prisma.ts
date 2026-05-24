import { PrismaClient } from "@prisma/client";

const prismaClientSingleton = () => {
  const base = process.env.DATABASE_URL ?? "";
  const params: Record<string, string> = {};
  if (!base.includes("pool_timeout")) params.pool_timeout = "30";
  if (!base.includes("connection_limit")) params.connection_limit = "10";
  if (!base.includes("connect_timeout")) params.connect_timeout = "15";
  const qs = Object.entries(params).map(([k, v]) => `${k}=${v}`).join("&");
  const url = qs ? `${base}${base.includes("?") ? "&" : "?"}${qs}` : base;
  return new PrismaClient({ datasources: { db: { url } } });
};

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

export { prisma };

if (process.env.NODE_ENV !== "production") globalThis.prismaGlobal = prisma;
