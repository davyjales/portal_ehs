import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, unauthorized, badRequest } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  const user = await requireAuth(request);
  if (!user) return unauthorized();

  const items = await prisma.pendencia.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(items);
}

export async function PATCH(request: NextRequest) {
  const user = await requireAuth(request);
  if (!user) return unauthorized();

  const { id } = await request.json();
  if (!id) return badRequest("ID obrigatório.");

  const pendencia = await prisma.pendencia.findFirst({
    where: { id, userId: user.id },
  });

  if (!pendencia) {
    return NextResponse.json({ error: "Pendência não encontrada." }, { status: 404 });
  }

  const updated = await prisma.pendencia.update({
    where: { id },
    data: { status: "DONE", resolvedAt: new Date() },
  });

  return NextResponse.json(updated);
}
