import type { IssueCategory } from "@/lib/categories";
import type { UploadedImage } from "@/lib/cloudinary";

export type IssueStatus = "open" | "cleared";

export type Issue = {
  _id: string;
  title: string;
  description: string;
  category: IssueCategory;
  createdBy: string;
  status: IssueStatus;
  images: UploadedImage[];
  createdAt: string;
  updatedAt: string;
  clearedAt?: string;
};
