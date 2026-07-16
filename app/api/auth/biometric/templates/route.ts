import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decryptBiometricTemplate } from "@/lib/biometric-crypto";

export async function GET() {
  try {
    // Apenas colaboradores — admins entram só com senha.
    const credentials = await prisma.biometricCredential.findMany({
      where: { user: { role: "EMPLOYEE" } },
      select: {
        userId: true,
        templateEnc: true,
      },
    });

    const templates = credentials.map((credential) => ({
      userId: credential.userId,
      templateBase64: decryptBiometricTemplate(credential.templateEnc),
    }));

    return NextResponse.json({ templates });
  } catch {
    return NextResponse.json({ error: "Erro interno do servidor." }, { status: 500 });
  }
}
