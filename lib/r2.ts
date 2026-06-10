import "server-only";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Cloudflare R2 (S3-compatible) — private storage for student answer photos.
// Students upload DIRECTLY to R2 via presigned PUT URLs (bypasses the function
// body limit); photos are read back only through short-lived signed GET URLs,
// never a public bucket URL. A bucket lifecycle rule deletes `answers/` objects
// after 6 months (DB keeps marks + feedback forever; only the image expires).
//
// Env: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET,
// optional R2_KEY_PREFIX (e.g. "dev/" so dev shares the bucket safely).

const PUT_URL_TTL_SECS = 600; // student has 10 min to finish one photo upload
const GET_URL_TTL_SECS = 3600; // viewing links live 1h (page re-signs per request)

let _client: S3Client | null = null;

export function isR2Configured(): boolean {
  return !!(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET
  );
}

function client(): S3Client {
  if (!_client) {
    if (!isR2Configured()) throw new Error("R2 is not configured (missing R2_* env vars)");
    _client = new S3Client({
      region: "auto",
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });
  }
  return _client;
}

const bucket = () => process.env.R2_BUCKET!;
const prefix = () => process.env.R2_KEY_PREFIX ?? "";

/**
 * Every object key of an attempt lives under this prefix — ownership checks are
 * a simple startsWith, and one student can never mint/reference another
 * attempt's objects.
 */
export function answerKeyPrefix(coachingId: string, testId: string, attemptId: string): string {
  return `${prefix()}answers/${coachingId}/${testId}/${attemptId}/`;
}

/** Unique object key for one answer photo (timestamp ⇒ re-uploads never collide). */
export function answerKey(
  coachingId: string,
  testId: string,
  attemptId: string,
  questionId: string,
  index: number
): string {
  return `${answerKeyPrefix(coachingId, testId, attemptId)}q${questionId}-${index}-${Date.now()}.jpg`;
}

/**
 * Presigned PUT URL for a direct browser→R2 upload. Content type and length are
 * part of the signature, so the client must upload exactly the bytes it declared
 * — compress FIRST, then ask for the URL.
 */
export async function presignAnswerPut(
  key: string,
  contentType: string,
  contentLength: number
): Promise<string> {
  return getSignedUrl(
    client(),
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      ContentType: contentType,
      ContentLength: contentLength,
    }),
    { expiresIn: PUT_URL_TTL_SECS }
  );
}

/** Short-lived signed GET URL for viewing a photo (student result / teacher review). */
export async function presignAnswerGet(key: string): Promise<string> {
  return getSignedUrl(client(), new GetObjectCommand({ Bucket: bucket(), Key: key }), {
    expiresIn: GET_URL_TTL_SECS,
  });
}

/** Sign many keys in parallel → { key: url }. */
export async function presignAnswerGets(keys: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(keys)];
  const urls = await Promise.all(unique.map((k) => presignAnswerGet(k)));
  return Object.fromEntries(unique.map((k, i) => [k, urls[i]]));
}

/**
 * Fetch an object's bytes as base64 for the Gemini grading call (server-side
 * SDK read — no signed-URL hop). Throws on a missing object; the worker turns
 * that into a flagged entry rather than failing the whole attempt.
 */
export async function getObjectBase64(
  key: string
): Promise<{ data: string; mimeType: string }> {
  const res = await client().send(new GetObjectCommand({ Bucket: bucket(), Key: key }));
  if (!res.Body) throw new Error(`R2 object has no body: ${key}`);
  const bytes = await res.Body.transformToByteArray();
  return {
    data: Buffer.from(bytes).toString("base64"),
    mimeType: res.ContentType ?? "image/jpeg",
  };
}
