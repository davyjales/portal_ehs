import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession, sessionCookieOptions, type Role } from "@/lib/auth";

type SessionUserInput = {
  id: string;
  prontuario: string;
  name: string;
  role: Role;
};

export async function establishUserSession(user: SessionUserInput) {
  const token = await createSession({
    id: user.id,
    prontuario: user.prontuario,
    name: user.name,
    role: user.role,
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
}

export async function userHasBiometric(userId: string): Promise<boolean> {
  const credential = await prisma.biometricCredential.findUnique({
    where: { userId },
    select: { id: true },
  });
  return Boolean(credential);
}
