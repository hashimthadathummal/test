import { NextResponse } from "next/server";
import { createAdminToken, isAdminCredential } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body || !isAdminCredential(body.username, body.password)) {
    return NextResponse.json({ error: "Invalid admin credentials" }, { status: 401 });
  }

  return NextResponse.json({ token: createAdminToken() });
}
