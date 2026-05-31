"use client";

import { useState, useEffect } from "react";
import { BE } from "@/lib/theme";

function greetingForHour(hour: number): string {
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : hour < 21 ? "Good evening" : "Good night";
}

export default function Greeting({ firstName }: { firstName: string }) {
  // Computed after mount so it uses the *browser's* local time. Doing this on
  // the server would use the server's timezone (UTC on Netlify), which is why
  // it previously showed "Good morning" well past noon for IST users.
  const [greeting, setGreeting] = useState<string>("Hello");

  useEffect(() => {
    setGreeting(greetingForHour(new Date().getHours()));
  }, []);

  return (
    <h1 style={{ fontSize: 30, fontWeight: 600, letterSpacing: -0.6, margin: 0, fontFamily: BE.serif, color: BE.text }} className="db-h1">
      {greeting}, {firstName}.
    </h1>
  );
}
