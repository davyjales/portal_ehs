import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pillarFromKey } from "@/lib/ehs";

export async function GET(request: NextRequest) {
  const pillar = pillarFromKey(request.nextUrl.searchParams.get("pillar"));

  if (!pillar) {
    return NextResponse.json({ error: "Âmbito inválido." }, { status: 400 });
  }

  const items = await prisma.eHSContent.findMany({
    where: { pillar, isPublic: true },
    orderBy: { order: "asc" },
    select: { id: true, title: true, body: true, order: true, images: true, coverIndex: true },
  });

  return NextResponse.json(items);
}
