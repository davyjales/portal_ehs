import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession, sessionCookieOptions, type Role } from "@/lib/auth";

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

    const token = await createSession({
      id: user.id,
      prontuario: user.prontuario,
      name: user.name,
      role: user.role as Role,
    });

    await prisma.$transaction([
      prisma.userQuizSession.deleteMany({ where: { userId: user.id } }),
      prisma.userQuizAssignment.deleteMany({ where: { userId: user.id } }),
    ]);

    const response = NextResponse.json({
      role: user.role,
      name: user.name,
    });

    const cookie = sessionCookieOptions(token);
    response.cookies.set(cookie.name, cookie.value, {
      httpOnly: cookie.httpOnly,
      secure: cookie.secure,
      sameSite: cookie.sameSite,
      path: cookie.path,
      maxAge: cookie.maxAge,
    });

    return response;
  } catch {
    return NextResponse.json({ error: "Erro interno do servidor." }, { status: 500 });
  }
}
