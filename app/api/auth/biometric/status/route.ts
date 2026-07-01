import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const prontuario = request.nextUrl.searchParams.get("prontuario")?.trim();
  if (!prontuario) {
    return NextResponse.json({ error: "Prontuário é obrigatório." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { prontuario },
    select: {
      id: true,
      name: true,
      role: true,
      biometricCredential: { select: { id: true } },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Prontuário não encontrado." }, { status: 404 });
  }

  const hasBiometric = Boolean(user.biometricCredential);

  return NextResponse.json({
    userId: user.id,
    name: user.name,
    role: user.role,
    hasBiometric,
    requiresBiometricRegistration: !hasBiometric,
    requiresPassword: user.role === "ADMIN" && !hasBiometric,
  });
}
