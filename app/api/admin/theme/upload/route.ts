import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { requireAdmin, forbidden, badRequest } from "@/lib/api-helpers";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_SIZE = 8 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return forbidden();

  const formData = await request.formData();
  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    return badRequest("Arquivo de imagem obrigatório.");
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return badRequest("Formato não suportado. Use JPG, PNG, WebP ou GIF.");
  }

  if (file.size > MAX_SIZE) {
    return badRequest("Imagem muito grande. Máximo 8 MB.");
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const safeExt = ["jpg", "jpeg", "png", "webp", "gif"].includes(ext) ? ext : "jpg";
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${safeExt}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", "backgrounds");

  await mkdir(uploadDir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploadDir, filename), buffer);

  return NextResponse.json({ path: `/uploads/backgrounds/${filename}` });
}
