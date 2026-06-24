import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, forbidden, badRequest, notFound } from "@/lib/api-helpers";
import { pillarFromKey } from "@/lib/ehs";
import { truncateSummary } from "@/lib/quiz";

function parseEhsPayload(body: Record<string, unknown>) {
  const { pillar, title, body: fullBody, order, images, coverIndex } = body;
  const validPillar = pillarFromKey(pillar as string);
  const trimmedBody = String(fullBody ?? "").trim();

  if (!validPillar || !String(title ?? "").trim() || !trimmedBody) {
    return { error: badRequest("Preencha todos os campos obrigatórios.") };
  }

  const imageList = Array.isArray(images)
    ? images.filter((v): v is string => typeof v === "string")
    : [];

  return {
    data: {
      pillar: validPillar,
      title: String(title).trim(),
      summary: truncateSummary(trimmedBody),
      body: trimmedBody,
      order: Number(order) || 0,
      images: JSON.stringify(imageList),
      coverIndex: Math.max(
        0,
        Math.min(Number(coverIndex) || 0, Math.max(0, imageList.length - 1))
      ),
    },
  };
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return forbidden();

  const parsed = parseEhsPayload(await request.json());
  if ("error" in parsed) return parsed.error;

  await prisma.eHSContent.create({
    data: { ...parsed.data, isPublic: true },
  });

  return NextResponse.json({ message: "Informativo criado com sucesso!" });
}

export async function PUT(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return forbidden();

  const { id, ...rest } = await request.json();
  if (!id) return badRequest("ID obrigatório.");

  const existing = await prisma.eHSContent.findUnique({ where: { id: String(id) } });
  if (!existing) return notFound("Informativo não encontrado.");

  const parsed = parseEhsPayload(rest);
  if ("error" in parsed) return parsed.error;

  await prisma.eHSContent.update({
    where: { id: String(id) },
    data: parsed.data,
  });

  return NextResponse.json({ message: "Informativo atualizado com sucesso!" });
}

export async function DELETE(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return forbidden();

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return badRequest("ID obrigatório.");

  await prisma.eHSContent.delete({ where: { id } });
  return NextResponse.json({ message: "Excluído." });
}
