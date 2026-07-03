import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, forbidden, badRequest } from "@/lib/api-helpers";

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return forbidden();

  const { prontuario, title, description, dueDate, broadcast } = await request.json();

  if (!title?.trim() || !description?.trim()) {
    return badRequest("Preencha título e descrição.");
  }

  const due = dueDate ? new Date(dueDate) : null;

  if (broadcast) {
    const employees = await prisma.user.findMany({
      where: { role: "EMPLOYEE" },
      select: { id: true },
    });

    if (employees.length === 0) {
      return badRequest("Nenhum funcionário cadastrado.");
    }

    await prisma.pendencia.createMany({
      data: employees.map((u) => ({
        userId: u.id,
        title: title.trim(),
        description: description.trim(),
        dueDate: due,
      })),
    });

    return NextResponse.json({
      message: `Pendência enviada para ${employees.length} funcionário(s)!`,
    });
  }

  if (!prontuario?.trim()) {
    return badRequest("Informe o prontuário do funcionário.");
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
      dueDate: due,
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
