import { NextRequest, NextResponse } from "next/server";
import { verifySession, COOKIE_NAME } from "@/lib/auth";

export async function requireAuth(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}

export async function requireAdmin(request: NextRequest) {
  const user = await requireAuth(request);
  if (!user || user.role !== "ADMIN") return null;
  return user;
}

export function unauthorized() {
  return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
}

export function forbidden() {
  return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function notFound(message = "Não encontrado.") {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function serverError(message = "Erro interno do servidor.") {
  return NextResponse.json({ error: message }, { status: 500 });
}
