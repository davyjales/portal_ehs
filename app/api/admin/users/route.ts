import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdmin, forbidden, badRequest } from "@/lib/api-helpers";

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return forbidden();

  const { prontuario, name, password } = await request.json();

  if (!prontuario?.trim() || !name?.trim() || !password) {
    return badRequest("Preencha todos os campos.");
  }

  const existing = await prisma.user.findUnique({
    where: { prontuario: String(prontuario).trim() },
  });

  if (existing) {
    return badRequest("Prontuário já cadastrado.");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: {
      prontuario: String(prontuario).trim(),
      name: name.trim(),
      passwordHash,
      role: "EMPLOYEE",
    },
  });

  return NextResponse.json({ message: "Usuário cadastrado com sucesso!" });
}
