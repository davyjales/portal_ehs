import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, forbidden, badRequest } from "@/lib/api-helpers";

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return forbidden();

  const { prontuario, title, description, dueDate } = await request.json();

  if (!prontuario?.trim() || !title?.trim() || !description?.trim()) {
    return badRequest("Preencha todos os campos obrigatórios.");
  }

  const user = await prisma.user.findUnique({
    where: { prontuario: String(prontuario).trim() },
  });

  if (!user) {
    return badRequest("Funcionário não encontrado.");
  }

  await prisma.pendencia.create({
    data: {
      userId: user.id,
      title: title.trim(),
      description: description.trim(),
      dueDate: dueDate ? new Date(dueDate) : null,
    },
  });

  return NextResponse.json({ message: "Pendência criada com sucesso!" });
}

export async function DELETE(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return forbidden();

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return badRequest("ID obrigatório.");

  await prisma.pendencia.delete({ where: { id } });
  return NextResponse.json({ message: "Excluído." });
}
