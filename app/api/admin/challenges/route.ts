import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, forbidden, badRequest } from "@/lib/api-helpers";

function weekStart(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return forbidden();

  const { title, description, points } = await request.json();

  if (!title?.trim() || !description?.trim()) {
    return badRequest("Título e descrição são obrigatórios.");
  }

  await prisma.challenge.updateMany({ data: { active: false } });

  await prisma.challenge.create({
    data: {
      title: title.trim(),
      description: description.trim(),
      points: Number(points) || 10,
      weekStart: weekStart(),
      active: true,
    },
  });

  return NextResponse.json({ message: "Desafio 1UP criado e ativado!" });
}

export async function PUT(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return forbidden();

  const { id, title, description, points, active } = await request.json();
  if (!id) return badRequest("ID obrigatório.");

  const existing = await prisma.challenge.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Desafio não encontrado." }, { status: 404 });
  }

  if (active === true) {
    await prisma.challenge.updateMany({ data: { active: false } });
  }

  await prisma.challenge.update({
    where: { id },
    data: {
      ...(title?.trim() ? { title: title.trim() } : {}),
      ...(description?.trim() ? { description: description.trim() } : {}),
      ...(points !== undefined ? { points: Number(points) || 10 } : {}),
      ...(active !== undefined ? { active: !!active } : {}),
    },
  });

  return NextResponse.json({ message: "Desafio atualizado!" });
}

export async function DELETE(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return forbidden();

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return badRequest("ID obrigatório.");

  const challenge = await prisma.challenge.findUnique({ where: { id } });
  if (!challenge) {
    return NextResponse.json({ error: "Desafio não encontrado." }, { status: 404 });
  }

  if (challenge.active) {
    return badRequest("Desative o desafio antes de excluir, ou crie outro desafio ativo.");
  }

  await prisma.challenge.delete({ where: { id } });
  return NextResponse.json({ message: "Desafio excluído." });
}
