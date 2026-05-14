"use client";
import PusherClient from "pusher-js";

let clientSingleton: PusherClient | null = null;

export function getPusherClient(): PusherClient | null {
  if (clientSingleton) return clientSingleton;
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
  if (!key || !cluster) return null;
  clientSingleton = new PusherClient(key, { cluster });
  return clientSingleton;
}

export function mockChannel(mockId: string): string {
  return `mock-${mockId}`;
}

export const PUSHER_EVENTS = {
  SUBMIT: "submit",
  ACTIVE: "active",
} as const;
