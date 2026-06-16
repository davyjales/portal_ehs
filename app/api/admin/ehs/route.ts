import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, forbidden, badRequest } from "@/lib/api-helpers";
import { pillarFromKey } from "@/lib/ehs";

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return forbidden();

  const { pillar, title, body, order, images, coverIndex } = await request.json();
  const validPillar = pillarFromKey(pillar);

  if (!validPillar || !title?.trim() || !body?.trim()) {
    return badRequest("Preencha todos os campos obrigatórios.");
  }

  const imageList = Array.isArray(images)
    ? images.filter((v): v is string => typeof v === "string")
    : [];

  await prisma.eHSContent.create({
    data: {
      pillar: validPillar,
      title: title.trim(),
      body: body.trim(),
      order: Number(order) || 0,
      isPublic: true,
      images: JSON.stringify(imageList),
      coverIndex: Math.max(0, Math.min(Number(coverIndex) || 0, Math.max(0, imageList.length - 1))),
    },
  });

  return NextResponse.json({ message: "Informativo criado com sucesso!" });
}

export async function DELETE(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return forbidden();

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return badRequest("ID obrigatório.");

  await prisma.eHSContent.delete({ where: { id } });
  return NextResponse.json({ message: "Excluído." });
}
