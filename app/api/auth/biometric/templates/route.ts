import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decryptBiometricTemplate } from "@/lib/biometric-crypto";

export async function GET() {
  try {
    const credentials = await prisma.biometricCredential.findMany({
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
