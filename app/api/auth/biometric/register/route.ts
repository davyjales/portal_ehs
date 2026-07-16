import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encryptBiometricTemplate } from "@/lib/biometric-crypto";
import { establishUserSession } from "@/lib/session-establish";
import type { Role } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { prontuario, templateBase64, fingerLabel } = await request.json();

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
      return NextResponse.json(
        { error: "Administradores entram com prontuário e senha, sem cadastro de biometria." },
        { status: 403 }
      );
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
