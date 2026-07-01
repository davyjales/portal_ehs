import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, forbidden } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return forbidden();

  const [ehs, pendencias, alertas, challenges, users] = await Promise.all([
    prisma.eHSContent.findMany({ orderBy: [{ pillar: "asc" }, { order: "asc" }] }),
    prisma.pendencia.findMany({
      include: { user: { select: { name: true, prontuario: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.alerta.findMany({
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.challenge.findMany({ orderBy: { weekStart: "desc" } }),
    prisma.user.findMany({
      select: {
        id: true,
        prontuario: true,
        name: true,
        role: true,
        biometricCredential: { select: { id: true } },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  return NextResponse.json({ ehs, pendencias, alertas, challenges, users });
}
