import Pusher from "pusher";

declare global {
  var __pusherServer: Pusher | undefined;
}

function makeServer(): Pusher | null {
  const appId = process.env.PUSHER_APP_ID;
  const key = process.env.PUSHER_KEY;
  const secret = process.env.PUSHER_SECRET;
  const cluster = process.env.PUSHER_CLUSTER;
  if (!appId || !key || !secret || !cluster) return null;
  return new Pusher({ appId, key, secret, cluster, useTLS: true });
}

export const pusherServer: Pusher | null =
  globalThis.__pusherServer ?? makeServer();
if (process.env.NODE_ENV !== "production" && pusherServer)
  globalThis.__pusherServer = pusherServer;

export function mockChannel(mockId: string): string {
  return `mock-${mockId}`;
}

export const PUSHER_EVENTS = {
  SUBMIT: "submit",
  ACTIVE: "active",
} as const;
