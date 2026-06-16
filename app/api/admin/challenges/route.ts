import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, forbidden, badRequest } from "@/lib/api-helpers";

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return forbidden();

  const { title, description, points } = await request.json();

  if (!title?.trim() || !description?.trim()) {
    return badRequest("Título e descrição são obrigatórios.");
  }

  await prisma.challenge.updateMany({ data: { active: false } });

  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());

  await prisma.challenge.create({
    data: {
      title: title.trim(),
      description: description.trim(),
      points: Number(points) || 10,
      weekStart,
      active: true,
    },
  });

  return NextResponse.json({ message: "Desafio 1UP criado e ativado!" });
}
