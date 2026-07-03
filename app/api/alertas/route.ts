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
    include: {
      acknowledgments: {
        where: { userId: user.id },
        select: { acknowledgedAt: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    items.map((a) => {
      const userAck = a.acknowledgments[0];
      const acknowledgedAt =
        a.userId === user.id
          ? a.acknowledgedAt ?? userAck?.acknowledgedAt ?? null
          : userAck?.acknowledgedAt ?? null;

      const { acknowledgments: _, ...rest } = a;
      return { ...rest, acknowledgedAt };
    })
  );
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

  const now = new Date();

  if (alerta.userId === null) {
    await prisma.alertaAcknowledgment.upsert({
      where: { alertaId_userId: { alertaId: alerta.id, userId: user.id } },
      create: { alertaId: alerta.id, userId: user.id, acknowledgedAt: now },
      update: { acknowledgedAt: now },
    });

    return NextResponse.json({ ...alerta, acknowledgedAt: now });
  }

  const updated = await prisma.alerta.update({
    where: { id },
    data: { acknowledgedAt: now },
  });

  return NextResponse.json(updated);
}
