/**
 * Client-side offline backup for in-progress test answers.
 *
 * The server-side draft (Redis via lib/draft.ts) is the source of truth, but it
 * is only reachable over the network. When a student's connection drops mid-test
 * — local power cut, flaky cellular — the autosave PATCH fails and, if the page
 * then reloads, every answer since the last *successful* server save is gone.
 *
 * This module mirrors the same DraftState into the browser's IndexedDB on every
 * answer change. IndexedDB writes are local and survive a reload, so the engine
 * can:
 *   1. recover answers on mount after an offline crash, and
 *   2. replay the buffered state to the server once the connection returns.
 *
 * Keyed by the same draftId/attemptId the server uses, so there is never any
 * cross-attempt collision. The `synced` flag records whether the most recent
 * local write has been acknowledged by the server — an unsynced entry means
 * there are answers the server has not seen yet.
 *
 * Everything here is best-effort: IndexedDB can be unavailable (private mode,
 * old WebView, quota). Every call swallows its own errors so a storage failure
 * can never break the test — it just degrades to the old server-only behaviour.
 */

const DB_NAME = "pattern-test-drafts";
const STORE = "drafts";
const DB_VERSION = 1;

export interface LocalDraftRecord {
  draftId: string;
  state: unknown;
  ts: number;
  synced: boolean;
}

function hasIndexedDB(): boolean {
  return typeof indexedDB !== "undefined";
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "draftId" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(
  db: IDBDatabase,
  mode: IDBTransactionMode
): IDBObjectStore {
  return db.transaction(STORE, mode).objectStore(STORE);
}

/**
 * Mirror the current draft state locally. `ts` is a client clock stamp used only
 * to order local-vs-local writes; it is never compared against server time.
 */
export async function saveLocalDraft(
  draftId: string,
  state: unknown,
  synced: boolean,
  ts: number
): Promise<void> {
  if (!hasIndexedDB() || !draftId) return;
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const store = tx(db, "readwrite");
      const record: LocalDraftRecord = { draftId, state, ts, synced };
      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    db.close();
  } catch (e) {
    console.warn("[localDraft] saveLocalDraft failed", e);
  }
}

/** Read the local backup for this attempt, or null if none / unavailable. */
export async function loadLocalDraft(
  draftId: string
): Promise<LocalDraftRecord | null> {
  if (!hasIndexedDB() || !draftId) return null;
  try {
    const db = await openDB();
    const record = await new Promise<LocalDraftRecord | null>((resolve, reject) => {
      const req = tx(db, "readonly").get(draftId);
      req.onsuccess = () => resolve((req.result as LocalDraftRecord) ?? null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return record;
  } catch (e) {
    console.warn("[localDraft] loadLocalDraft failed", e);
    return null;
  }
}

/** Drop the local backup once the attempt is submitted (or on natural reset). */
export async function clearLocalDraft(draftId: string): Promise<void> {
  if (!hasIndexedDB() || !draftId) return;
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const req = tx(db, "readwrite").delete(draftId);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    db.close();
  } catch (e) {
    console.warn("[localDraft] clearLocalDraft failed", e);
  }
}
