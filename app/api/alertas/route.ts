import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, unauthorized, badRequest } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  const user = await requireAuth(request);
  if (!user) return unauthorized();

  const items = await prisma.alerta.findMany({
    where: {
      OR: [{ userId: user.id }, { userId: null }],
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(items);
}

export async function PATCH(request: NextRequest) {
  const user = await requireAuth(request);
  if (!user) return unauthorized();

  const { id } = await request.json();
  if (!id) return badRequest("ID obrigatório.");

  const alerta = await prisma.alerta.findFirst({
    where: {
      id,
      OR: [{ userId: user.id }, { userId: null }],
    },
  });

  if (!alerta) {
    return NextResponse.json({ error: "Alerta não encontrado." }, { status: 404 });
  }

  const updated = await prisma.alerta.update({
    where: { id },
    data: { acknowledgedAt: new Date() },
  });

  return NextResponse.json(updated);
}
