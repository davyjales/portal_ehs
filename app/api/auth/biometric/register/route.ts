import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { encryptBiometricTemplate } from "@/lib/biometric-crypto";
import { establishUserSession } from "@/lib/session-establish";
import type { Role } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { prontuario, password, templateBase64, fingerLabel } = await request.json();

    if (!prontuario?.trim()) {
      return NextResponse.json({ error: "Prontuário é obrigatório." }, { status: 400 });
    }

    if (!templateBase64?.trim()) {
      return NextResponse.json({ error: "Template biométrico é obrigatório." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { prontuario: String(prontuario).trim() },
      include: { biometricCredential: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Prontuário não encontrado." }, { status: 404 });
    }

    if (user.biometricCredential) {
      return NextResponse.json({ error: "Biometria já cadastrada para este usuário." }, { status: 409 });
    }

    if (user.role === "ADMIN") {
      if (!password) {
        return NextResponse.json(
          { error: "Senha é obrigatória para cadastrar biometria de administrador.", requiresPassword: true },
          { status: 401 }
        );
      }

      if (!user.passwordHash) {
        return NextResponse.json(
          { error: "Conta de administrador sem senha configurada." },
          { status: 401 }
        );
      }

      const valid = await bcrypt.compare(String(password), user.passwordHash);
      if (!valid) {
        return NextResponse.json(
          { error: "Senha incorreta.", requiresPassword: true },
          { status: 401 }
        );
      }
    }

    const templateEnc = encryptBiometricTemplate(String(templateBase64).trim());

    await prisma.biometricCredential.create({
      data: {
        userId: user.id,
        templateEnc,
        fingerLabel: fingerLabel?.trim() || null,
      },
    });

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
