import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { requireAdmin, forbidden, badRequest } from "@/lib/api-helpers";

const ALLOWED_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);
const MAX_SIZE = 50 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return forbidden();

  const formData = await request.formData();
  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    return badRequest("Arquivo de vídeo obrigatório.");
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return badRequest("Formato não suportado. Use MP4, WebM ou MOV.");
  }

  if (file.size > MAX_SIZE) {
    return badRequest("Vídeo muito grande. Máximo 50 MB.");
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "mp4";
  const safeExt = ["mp4", "webm", "mov"].includes(ext) ? ext : "mp4";
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${safeExt}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", "ehs");

  await mkdir(uploadDir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploadDir, filename), buffer);

  return NextResponse.json({ path: `/uploads/ehs/${filename}` });
}
