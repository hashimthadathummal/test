import { NextRequest, NextResponse } from "next/server";
import { Filter } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { CATEGORIES, isIssueCategory } from "@/lib/categories";
import { uploadIssueImage } from "@/lib/cloudinary";
import type { Issue, IssueStatus } from "@/types/issue";

export const runtime = "nodejs";

type IssueDocument = Omit<Issue, "_id">;
type IssueFilterValues = {
  category: string | null;
  status: string | null;
  q: string | undefined;
};

const MAX_IMAGES = 5;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function serializeIssue(issue: IssueDocument & { _id: object }): Issue {
  return {
    ...issue,
    _id: issue._id.toString()
  };
}

function applyIssueFilters(filter: Filter<IssueDocument>, values: IssueFilterValues) {
  const { category, status, q } = values;

  if (category && category !== "all" && isIssueCategory(category)) {
    filter.category = category;
  }

  if (status === "open" || status === "cleared") {
    filter.status = status;
  }

  if (q) {
    const regex = new RegExp(escapeRegex(q), "i");
    filter.$or = [{ title: regex }, { description: regex }, { createdBy: regex }];
  }

  return filter;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const owner = searchParams.get("owner")?.trim() || searchParams.get("createdBy")?.trim();
  const category = searchParams.get("category");
  const status = searchParams.get("status");
  const q = searchParams.get("q")?.trim();

  if (category && category !== "all" && !isIssueCategory(category)) {
    return NextResponse.json({ error: `Category must be one of: ${CATEGORIES.join(", ")}` }, { status: 400 });
  }

  if (status && status !== "all" && status !== "open" && status !== "cleared") {
    return NextResponse.json({ error: "Status must be open, cleared, or all" }, { status: 400 });
  }

  const sharedFilters = { category, status, q };
  const filter = applyIssueFilters({}, sharedFilters);

  if (owner) {
    filter.createdBy = new RegExp(`^${escapeRegex(owner)}$`, "i");
  }

  const db = await getDb();
  const collection = db.collection<IssueDocument>("issues");
  const issues = await db
    .collection<IssueDocument>("issues")
    .find(filter)
    .sort({ createdAt: -1 })
    .limit(200)
    .toArray();
  const creators = await collection.distinct("createdBy", applyIssueFilters({}, sharedFilters));

  return NextResponse.json({
    creators: creators.filter((creator): creator is string => typeof creator === "string" && Boolean(creator.trim())).sort((a, b) => a.localeCompare(b)),
    issues: issues.map(serializeIssue)
  });
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const category = String(formData.get("category") || "").trim();
  const createdBy = String(formData.get("createdBy") || "").trim();
  const imageFiles = formData.getAll("images").filter((value): value is File => value instanceof File && value.size > 0);

  if (!title || title.length > 140) {
    return NextResponse.json({ error: "Title is required and must be under 140 characters" }, { status: 400 });
  }

  if (!createdBy || createdBy.length > 80) {
    return NextResponse.json({ error: "Name is required and must be under 80 characters" }, { status: 400 });
  }

  if (!isIssueCategory(category)) {
    return NextResponse.json({ error: `Category must be one of: ${CATEGORIES.join(", ")}` }, { status: 400 });
  }

  if (description.length > 2000) {
    return NextResponse.json({ error: "Description must be under 2000 characters" }, { status: 400 });
  }

  if (imageFiles.length > MAX_IMAGES) {
    return NextResponse.json({ error: `Upload up to ${MAX_IMAGES} images` }, { status: 400 });
  }

  for (const file of imageFiles) {
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image uploads are allowed" }, { status: 400 });
    }

    if (file.size > MAX_IMAGE_SIZE) {
      return NextResponse.json({ error: "Each image must be 5 MB or smaller" }, { status: 400 });
    }
  }

  const images = await Promise.all(imageFiles.map(uploadIssueImage));
  const now = new Date().toISOString();
  const issue: IssueDocument = {
    title,
    description,
    category,
    createdBy,
    status: "open",
    images,
    createdAt: now,
    updatedAt: now
  };

  const db = await getDb();
  const result = await db.collection<IssueDocument>("issues").insertOne(issue);

  return NextResponse.json(
    {
      issue: serializeIssue({ ...issue, _id: result.insertedId })
    },
    { status: 201 }
  );
}
