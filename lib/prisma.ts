import { PrismaClient } from "@prisma/client";
import { PrismaNeonHTTP } from "@prisma/adapter-neon";

// Stateless HTTPS transport via Neon's HTTP query protocol. Every query is
// an independent fetch — no persistent TCP/WebSocket connections — so the
// instant the last in-flight request completes, Neon sees zero connections
// and the 5-minute scale-to-zero timer starts.
//
// Tradeoffs:
//   - Requires a real Neon connection string (pooled `-pooler` is fine). It
//     will NOT work against a plain local Postgres — use WebSocket
//     (`PrismaNeon`) or restore the standard TCP client for that case.
//   - No interactive transactions over HTTP. The codebase has zero
//     `$transaction` usage today; if a future route needs atomicity, switch
//     that route to the WebSocket adapter or standard pooled Prisma.
//
// DATABASE_URL keeps pointing at Neon's pooler endpoint. DIRECT_URL is
// unaffected and is still used by `prisma migrate` over TCP at deploy time.
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is not set. The Neon HTTP adapter requires a Neon connection string at module load.",
  );
}

const prismaClientSingleton = () =>
  new PrismaClient({
    adapter: new PrismaNeonHTTP(databaseUrl, {}),
  });

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

export { prisma };

if (process.env.NODE_ENV !== "production") globalThis.prismaGlobal = prisma;
