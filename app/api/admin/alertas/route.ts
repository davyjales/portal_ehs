import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, forbidden, badRequest } from "@/lib/api-helpers";

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return forbidden();

  const { prontuario, title, message, type, broadcast } = await request.json();

  if (!title?.trim() || !message?.trim()) {
    return badRequest("Título e mensagem são obrigatórios.");
  }

  let userId: string | null = null;

  if (!broadcast) {
    if (!prontuario?.trim()) {
      return badRequest("Informe o prontuário ou marque broadcast.");
    }
    const user = await prisma.user.findUnique({
      where: { prontuario: String(prontuario).trim() },
    });
    if (!user) return badRequest("Funcionário não encontrado.");
    userId = user.id;
  }

  const validTypes = ["INFO", "WARNING", "URGENT"];
  const alertType = validTypes.includes(type) ? type : "INFO";

  await prisma.alerta.create({
    data: {
      userId,
      title: title.trim(),
      message: message.trim(),
      type: alertType,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  return NextResponse.json({ message: "Alerta criado com sucesso!" });
}

export async function DELETE(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return forbidden();

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return badRequest("ID obrigatório.");

  await prisma.alerta.delete({ where: { id } });
  return NextResponse.json({ message: "Excluído." });
}
