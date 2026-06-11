import "server-only";

// Prisma's createMany() (like updateMany / $transaction) requests a transaction,
// which the Neon HTTP adapter rejects ("Transactions are not supported in HTTP
// mode"). Emulate it with parallel single create()s — each is a lone INSERT that
// needs no transaction. See the project_neon_http_no_updatemany memory.

// The standard TCP driver (self-hosted VPS) has the full feature set, so bulk
// write paths should branch on this and use native createMany there — a single
// multi-row INSERT instead of N parallel statements competing for the pool.
export const isStandardDriver = (process.env.DB_DRIVER ?? "neon-http") === "standard";

// A unique-constraint violation surfaces as Prisma's normalized "P2002" on most
// paths, but the Neon HTTP adapter sometimes throws the RAW Postgres SQLSTATE
// "23505" instead — accept either so skipDuplicates is reliable.
function isUniqueViolation(e: unknown): boolean {
  const code = (e as { code?: string } | null)?.code;
  return code === "P2002" || code === "23505";
}

/**
 * Insert many rows over the HTTP adapter. Runs the per-row create()s concurrently.
 * With `skipDuplicates`, a unique-constraint violation (P2002) on a row is swallowed
 * — mirroring createMany({ skipDuplicates: true }). Returns the number created.
 *
 * The caller supplies the create call so the row type is checked at the call site:
 *   await createEach(rows, (data) => prisma.x.create({ data, select: { id: true } }), { skipDuplicates: true });
 */
export async function createEach<T>(
  rows: T[],
  create: (data: T) => Promise<unknown>,
  opts: { skipDuplicates?: boolean } = {}
): Promise<number> {
  let created = 0;
  await Promise.all(
    rows.map(async (data) => {
      try {
        await create(data);
        created++;
      } catch (e) {
        if (opts.skipDuplicates && isUniqueViolation(e)) {
          return; // duplicate — skip, like skipDuplicates
        }
        throw e;
      }
    })
  );
  return created;
}
