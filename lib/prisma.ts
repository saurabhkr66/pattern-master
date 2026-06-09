import { PrismaClient } from "@prisma/client";
import { PrismaNeonHTTP } from "@prisma/adapter-neon";

// DB_DRIVER selects the database transport. Both paths stay in this file
// permanently so the deployment is flippable by config alone — no code edit.
//
//   "neon-http" (DEFAULT) — Neon's stateless HTTP query protocol. Every query
//     is an independent fetch, so the instant the last in-flight request
//     completes Neon sees zero connections and its 5-minute scale-to-zero timer
//     starts. This is what the serverless/Vercel deployment must use; a plain
//     TCP client would storm Neon with connections from short-lived functions.
//     Requires a real Neon connection string (pooled `-pooler` is fine) and has
//     no interactive transactions / no `updateMany`.
//
//   "standard" — plain TCP PrismaClient reading DATABASE_URL / DIRECT_URL. Used
//     by the self-hosted VPS (one long-lived process + local Postgres) and for
//     local testing of that path against the Neon dev branch. Full Prisma
//     feature set (interactive transactions, updateMany) works here.
//
// Switch direction (VPS <-> Neon) by setting DB_DRIVER + the connection URLs —
// nothing in this file changes.
const driver = process.env.DB_DRIVER ?? "neon-http";

const prismaClientSingleton = () => {
  if (driver === "standard") {
    // Standard TCP client — reads url/directUrl from the schema's datasource.
    return new PrismaClient();
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is not set. The Neon HTTP adapter requires a Neon connection string at module load.",
    );
  }
  return new PrismaClient({
    adapter: new PrismaNeonHTTP(databaseUrl, {}),
  });
};

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

export { prisma };

if (process.env.NODE_ENV !== "production") globalThis.prismaGlobal = prisma;
