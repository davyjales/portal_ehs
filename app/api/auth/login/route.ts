import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { establishUserSession, userHasBiometric } from "@/lib/session-establish";
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

    const hasBiometric = await userHasBiometric(user.id);

    if (user.role === "ADMIN" && !hasBiometric) {
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

    if (!hasBiometric) {
      return NextResponse.json(
        {
          error: "Cadastre sua biometria para continuar.",
          requiresBiometricRegistration: true,
          userId: user.id,
          name: user.name,
          role: user.role,
        },
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
