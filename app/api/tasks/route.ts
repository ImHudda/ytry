import { NextResponse } from "next/server";

// API routes for scheduled tasks to read task data
// In a future version, this will read from Vercel Postgres
// For now, returns a placeholder since data is in localStorage

export async function GET() {
  return NextResponse.json({
    message: "Tasks API - data is stored client-side in localStorage for now",
    note: "Connect Vercel Postgres for server-side storage",
  });
}
