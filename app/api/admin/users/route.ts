import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdmin, forbidden, badRequest, notFound } from "@/lib/api-helpers";

type Role = "EMPLOYEE" | "ADMIN";

function normalizeRole(role: unknown): Role | null {
  if (role === "EMPLOYEE" || role === "ADMIN") return role;
  return null;
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return forbidden();

  const { prontuario, name, role, password } = await request.json();

  if (!prontuario?.trim() || !name?.trim()) {
    return badRequest("Preencha prontuário e nome.");
  }

  const userRole = normalizeRole(role) ?? "EMPLOYEE";

  if (userRole === "ADMIN" && !password) {
    return badRequest("Senha é obrigatória para administradores.");
  }

  const existing = await prisma.user.findUnique({
    where: { prontuario: String(prontuario).trim() },
  });

  if (existing) {
    return badRequest("Prontuário já cadastrado.");
  }

  const passwordHash =
    userRole === "ADMIN" ? await bcrypt.hash(String(password), 10) : null;

  await prisma.user.create({
    data: {
      prontuario: String(prontuario).trim(),
      name: name.trim(),
      passwordHash,
      role: userRole,
    },
  });

  return NextResponse.json({ message: "Usuário cadastrado com sucesso!" });
}

export async function PUT(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return forbidden();

  const { id, prontuario, name, role, password } = await request.json();

  if (!id) {
    return badRequest("ID do usuário é obrigatório.");
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return notFound("Usuário não encontrado.");

  const nextRole = role !== undefined ? normalizeRole(role) : (target.role as Role);
  if (!nextRole) {
    return badRequest("Perfil inválido.");
  }

  if (prontuario?.trim()) {
    const duplicate = await prisma.user.findFirst({
      where: {
        prontuario: String(prontuario).trim(),
        NOT: { id },
      },
    });
    if (duplicate) {
      return badRequest("Prontuário já cadastrado para outro usuário.");
    }
  }

  if (nextRole === "ADMIN" && target.role !== "ADMIN" && !password) {
    return badRequest("Informe uma senha ao promover usuário para administrador.");
  }

  const data: {
    name?: string;
    prontuario?: string;
    role: Role;
    passwordHash?: string | null;
  } = { role: nextRole };

  if (name?.trim()) data.name = name.trim();
  if (prontuario?.trim()) data.prontuario = String(prontuario).trim();

  if (nextRole === "EMPLOYEE") {
    data.passwordHash = null;
  } else if (password) {
    data.passwordHash = await bcrypt.hash(String(password), 10);
  } else if (nextRole === "ADMIN" && !target.passwordHash) {
    return badRequest("Administrador precisa de senha configurada.");
  }

  await prisma.user.update({ where: { id }, data });

  return NextResponse.json({ message: "Usuário atualizado com sucesso!" });
}

export async function DELETE(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return forbidden();

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return badRequest("ID do usuário é obrigatório.");

  if (id === admin.id) {
    return badRequest("Você não pode excluir sua própria conta.");
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return notFound("Usuário não encontrado.");

  if (target.role === "ADMIN") {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    if (adminCount <= 1) {
      return badRequest("Não é possível excluir o último administrador.");
    }
  }

  await prisma.user.delete({ where: { id } });

  return NextResponse.json({ message: "Usuário excluído com sucesso!" });
}
