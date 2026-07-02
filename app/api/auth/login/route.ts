import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { establishUserSession } from "@/lib/session-establish";
import type { Role } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { prontuario, password } = await request.json();

    if (!prontuario?.trim()) {
      return NextResponse.json({ error: "Prontuário é obrigatório." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { prontuario: String(prontuario).trim() },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Prontuário não encontrado." },
        { status: 401 }
      );
    }

    if (user.role === "ADMIN") {
      if (!password) {
        return NextResponse.json(
          { error: "Senha é obrigatória para administradores.", requiresPassword: true },
          { status: 401 }
        );
      }

      if (!user.passwordHash) {
        return NextResponse.json(
          { error: "Conta de administrador sem senha configurada. Contate outro administrador." },
          { status: 401 }
        );
      }

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        return NextResponse.json(
          { error: "Senha incorreta.", requiresPassword: true },
          { status: 401 }
        );
      }
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
