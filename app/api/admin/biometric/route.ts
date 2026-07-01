import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, forbidden, badRequest, notFound } from "@/lib/api-helpers";

export async function DELETE(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return forbidden();

  const userId = request.nextUrl.searchParams.get("userId");
  if (!userId) return badRequest("ID do usuário é obrigatório.");

  const credential = await prisma.biometricCredential.findUnique({
    where: { userId },
  });

  if (!credential) {
    return notFound("Biometria não encontrada para este usuário.");
  }

  await prisma.biometricCredential.delete({ where: { userId } });

  return NextResponse.json({ message: "Biometria removida com sucesso." });
}
