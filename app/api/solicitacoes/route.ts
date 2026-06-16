import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, unauthorized, badRequest } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  const user = await requireAuth(request);
  if (!user) return unauthorized();

  const items = await prisma.solicitacao.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(items);
}

export async function POST(request: NextRequest) {
  const user = await requireAuth(request);
  if (!user) return unauthorized();

  const { type, message } = await request.json();

  if (!type || !message?.trim()) {
    return badRequest("Tipo e mensagem são obrigatórios.");
  }

  const validTypes = ["CHAMADO", "RECLAMACAO", "SUGESTAO"];
  if (!validTypes.includes(type)) {
    return badRequest("Tipo inválido.");
  }

  const item = await prisma.solicitacao.create({
    data: {
      userId: user.id,
      type,
      message: message.trim(),
    },
  });

  return NextResponse.json(item, { status: 201 });
}
