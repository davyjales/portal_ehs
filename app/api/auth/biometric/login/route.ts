import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { establishUserSession } from "@/lib/session-establish";
import type { Role } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId?.trim()) {
      return NextResponse.json({ error: "Usuário não identificado." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: String(userId).trim() },
      include: { biometricCredential: { select: { id: true } } },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
    }

    if (user.role === "ADMIN") {
      return NextResponse.json(
        { error: "Administradores entram com prontuário e senha, sem biometria." },
        { status: 403 }
      );
    }

    if (!user.biometricCredential) {
      return NextResponse.json(
        { error: "Usuário não possui biometria cadastrada." },
        { status: 403 }
      );
    }

    return establishUserSession({
      id: user.id,
      prontuario: user.prontuario,
      name: user.name,
      role: user.role as Role,
    });
  } catch {
    return NextResponse.json({ error: "Erro interno do servidor." }, { status: 500 });
  }
}
