import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { verifyAdminToken } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import type { Issue, IssueStatus } from "@/types/issue";

export const runtime = "nodejs";

type IssueDocument = Omit<Issue, "_id">;

function serializeIssue(issue: IssueDocument & { _id: object }): Issue {
  return {
    ...issue,
    _id: issue._id.toString()
  };
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || null;

  if (!verifyAdminToken(token)) {
    return NextResponse.json({ error: "Admin login required" }, { status: 401 });
  }

  const { id } = await params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid issue id" }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const status = body?.status as IssueStatus | undefined;

  if (status !== "open" && status !== "cleared") {
    return NextResponse.json({ error: "Status must be open or cleared" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const db = await getDb();
  const result = await db.collection<IssueDocument>("issues").findOneAndUpdate(
    { _id: new ObjectId(id) } as never,
    {
      $set: {
        status,
        updatedAt: now,
        ...(status === "cleared" ? { clearedAt: now } : { clearedAt: undefined })
      }
    },
    { returnDocument: "after" }
  );

  if (!result) {
    return NextResponse.json({ error: "Issue not found" }, { status: 404 });
  }

  return NextResponse.json({ issue: serializeIssue(result as IssueDocument & { _id: object }) });
}
