import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, unauthorized } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  const user = await requireAuth(request);
  if (!user) return unauthorized();

  const items = await prisma.certificado.findMany({
    where: { userId: user.id },
    orderBy: { issuedAt: "desc" },
  });

  return NextResponse.json(items);
}
